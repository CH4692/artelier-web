"""Own a disposable PostgreSQL cluster and real API processes for one Playwright run.

Never consume DATABASE_URL, TEST_DATABASE_URL or a deployed backend URL. Cleanup
stops only child processes and the cluster created under this run's temp directory.
"""

import json
import os
import secrets
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from contextlib import ExitStack
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = Path(os.environ.get("E2E_BACKEND_DIR", ROOT.parent / "atelier-api")).resolve()


def port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def main():
    python = BACKEND / ".venv/bin/python"
    if not python.exists():
        raise SystemExit(
            "Backend .venv missing: run uv sync --frozen in the backend checkout first."
        )
    bindir = os.environ.get("E2E_PG_BINDIR")
    if not bindir:
        bindir = subprocess.check_output(["pg_config", "--bindir"], text=True).strip()
    pg = lambda name: str(Path(bindir) / name)
    children = []
    with (
        tempfile.TemporaryDirectory(prefix="artelier-e2e-") as directory,
        ExitStack() as logs,
    ):
        work = Path(directory)
        password = secrets.token_urlsafe(32)
        pwfile = work / "pg-password"
        pwfile.write_text(password)
        pwfile.chmod(0o600)
        dbport, apiport, expiryport = port(), port(), port()
        name = "artelier_e2e_" + secrets.token_hex(6) + "_test"
        pg_env = {
            **os.environ,
            "PGPASSWORD": password,
            "PGHOST": "127.0.0.1",
            "PGPORT": str(dbport),
            "PGUSER": "artelier_e2e",
        }
        started = False
        try:
            run(
                [
                    pg("initdb"),
                    "-D",
                    str(work / "pg"),
                    "-U",
                    "artelier_e2e",
                    "--auth=scram-sha-256",
                    "--pwfile",
                    str(pwfile),
                ],
                stdout=subprocess.DEVNULL,
            )
            run(
                [
                    pg("pg_ctl"),
                    "-D",
                    str(work / "pg"),
                    "-l",
                    str(work / "postgres.log"),
                    "-o",
                    f"-p {dbport} -h 127.0.0.1 -k {work}",
                    "-w",
                    "start",
                ],
                stdout=subprocess.DEVNULL,
            )
            started = True
            run([pg("createdb"), name], env=pg_env)
            origin = "http://127.0.0.1:4173"
            dburl = f"postgresql+psycopg://artelier_e2e:{password}@127.0.0.1:{dbport}/{name}"
            accounts = work / "accounts.json"
            accounts.touch(mode=0o600)
            env = {
                **os.environ,
                "DATABASE_URL": dburl,
                "TEST_DATABASE_URL": dburl,
                "ENVIRONMENT": "development",
                "FRONTEND_ORIGINS": json.dumps([origin]),
                "PUBLIC_QR_BASE_URL": origin,
                "CUSTOMER_PORTAL_AUTH_ENABLED": "true",
                "TRUSTED_PROXY_IPS": "[]",
                "SESSION_IDLE_SECONDS": "1800",
                "SESSION_ABSOLUTE_SECONDS": "28800",
                "LOGIN_ACCOUNT_LIMIT": "1000",
                "LOGIN_IP_LIMIT": "10000",
                "E2E_ACCOUNTS": str(accounts),
                "PYTHONPATH": str(BACKEND / "src"),
            }
            # Explicitly prevent the backend checkout's optional storage configuration from being used.
            for key in [
                "R2_ENDPOINT_URL",
                "R2_ACCESS_KEY_ID",
                "R2_SECRET_ACCESS_KEY",
                "R2_BUCKET_NAME",
            ]:
                env[key] = ""
            run(
                [
                    str(python),
                    "-m",
                    "alembic",
                    "-c",
                    str(BACKEND / "alembic.ini"),
                    "upgrade",
                    "head",
                ],
                cwd=BACKEND,
                env=env,
                stdout=subprocess.DEVNULL,
            )
            run([str(python), str(ROOT / "e2e/seed.py")], cwd=work, env=env)
            for api_port, extra in [
                (apiport, {}),
                (
                    expiryport,
                    {"SESSION_IDLE_SECONDS": "1", "SESSION_ABSOLUTE_SECONDS": "2"},
                ),
            ]:
                log = logs.enter_context(open(work / f"api-{api_port}.log", "w"))
                child = subprocess.Popen(
                    [
                        str(python),
                        "-m",
                        "uvicorn",
                        "atelier_api.main:app",
                        "--host",
                        "127.0.0.1",
                        "--port",
                        str(api_port),
                    ],
                    cwd=work,
                    env={**env, **extra},
                    stdout=log,
                    stderr=log,
                )
                children.append(child)
                deadline = time.monotonic() + 30
                while True:
                    try:
                        with urllib.request.urlopen(
                            f"http://127.0.0.1:{api_port}/openapi.json", timeout=1
                        ):
                            break
                    except OSError:
                        if child.poll() is not None or time.monotonic() > deadline:
                            raise RuntimeError(
                                "Isolated API failed to start; see test infrastructure setup."
                            )
                        time.sleep(0.1)
            metadata = work / "runtime.json"
            metadata.write_text(
                json.dumps(
                    {
                        **json.loads(accounts.read_text()),
                        "apiURL": f"http://127.0.0.1:{apiport}",
                        "expiryURL": f"http://127.0.0.1:{expiryport}",
                        "baseURL": origin,
                    }
                )
            )
            metadata.chmod(0o600)
            run(["npm", "run", "build"], cwd=ROOT)
            result = subprocess.run(
                ["npx", "playwright", "test", *sys.argv[1:]],
                cwd=ROOT,
                env={
                    **os.environ,
                    "E2E_RUNTIME": str(metadata),
                    "E2E_PROFILE": "integration",
                },
                check=False,
            )
            return result.returncode
        finally:
            for child in reversed(children):
                child.terminate()
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()
            if started:
                subprocess.run(
                    [
                        pg("pg_ctl"),
                        "-D",
                        str(work / "pg"),
                        "-m",
                        "immediate",
                        "-w",
                        "stop",
                    ],
                    stdout=subprocess.DEVNULL,
                    check=False,
                )


if __name__ == "__main__":

    def interrupted(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupted)
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
