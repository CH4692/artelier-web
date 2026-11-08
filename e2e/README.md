# Playwright tests

Playwright Test 1.65.0 is pinned in package-lock.json. This directory contains two explicitly separate profiles. Neither changes production application code.

## Real backend integration

Run `npm run e2e:integration`. For the fast Chromium PR subset, run `npm run e2e:smoke`. Arguments pass through, for example `npm run e2e:integration -- --project=firefox-tablet`.

Prerequisites: the frontend Node/npm versions in `.nvmrc`/package.json; installed Playwright browsers (`npx playwright install chromium firefox webkit`); PostgreSQL server binaries (`initdb`, `pg_ctl`, `createdb`, `pg_config`); and a backend checkout with its Python 3.14 `.venv` installed using `uv sync --frozen`. By default the backend is `../atelier-api`. Override its directory with `E2E_BACKEND_DIR` or PostgreSQL binaries with `E2E_PG_BINDIR`. `initdb` must run as a normal user, not root.

The runner creates its own SCRAM-authenticated PostgreSQL cluster under a unique temporary directory, with a generated database password and a unique database name ending `_test`. It does not accept DATABASE_URL, TEST_DATABASE_URL or a deployed API URL as test targets. It migrates only that fresh cluster, provisions generated accounts through the backend's existing bootstrap/administrator services, and starts the actual FastAPI application on random loopback ports. The production Angular bundle is built and served on `127.0.0.1:4173`, proxying only to the owned loopback API. An existing server on that port is not reused. Do not run both profiles concurrently on the same machine.

A second real API instance creates two-second absolute sessions for the expiration test. Polling waits for actual expiry rather than sleeping for an arbitrary duration. CSRF, Origin checks, password verification, cookie handling and role enforcement remain enabled. The dedicated test environment enables the existing customer portal login flag for negative workshop-role checks. Its existing login budgets are sized for the browser matrix (1000/account, 10000/IP per window); throttling code remains active. Testing default production throttling thresholds is not part of this suite.

Generated credentials and runtime metadata have owner-only temporary files, are not committed or uploaded, and are deleted with the cluster. Each test logs in with its own session; contexts/storage state are not shared across tests. Factories create uniquely named data. Factory-created records are archived through authenticated CSRF-protected API calls at fixture teardown; the entire database is removed at run teardown, including records created through the UI and failed-test leftovers. Cleanup targets only the run-owned processes and directory, never the backend checkout's configured database.

The integration specs do not intercept API requests or override FastAPI dependencies. Fixtures use HTTP APIs for data creation and session establishment; login/logout/invalid-credential/role workflows also exercise the browser forms. A small typed helper removes repeated selection actions; there is no elaborate page-object hierarchy.

## Explicitly isolated UI scenarios

Run `npm run e2e:ui`. This also builds/serves the production bundle but starts no database or backend. `e2e/support/ui.ts` intercepts API traffic with synthetic test records solely for controlled loading, empty/error/unknown states and failed-form preservation. These tests are UI browser tests, not full-stack E2E tests. Integration specs never import these mocks.

`E2E_UI_BASE_URL` can target an explicitly started local preview for this UI-only profile; automatic startup is disabled in that case. Do not point the mocked profile at a production service. The real integration profile deliberately derives URLs only from its generated runtime metadata.

## Configuration and artifacts

One TypeScript configuration defines Chromium, Firefox and WebKit on desktop (1440×1000) and tablet (768×1024). Chromium/WebKit tablet profiles enable touch; Firefox uses tablet viewport emulation because its mobile support differs. These are browser-engine tests, not physical-device tests. Locale is de-DE and timezone Europe/Berlin.

Tests use accessible role/label locators, web-first assertions and response predicates. They contain no arbitrary waitForTimeout calls, order dependencies, unjustified skips or production credentials. CI has one retry and fails if required assertions still fail. Screenshots are failure-only, traces are captured on first retry, and HTML/JSON reports are written separately under `playwright-report/{integration,ui}` and `test-results/`. Use `npx playwright show-report playwright-report/integration` or `npx playwright show-trace PATH` to inspect artifacts. Traces can contain generated test credentials/cookies; handle them as temporary diagnostic data. CI uploads failure artifacts for seven days, never runtime files.

Run `npm run e2e:typecheck` and `npm run e2e:lint` for the test sources. Existing `npm run lint`, `npm run test:ci` and `npm run build` retain their meanings. Angular's unit test discovery remains restricted to application tests.

## CI and coverage

`.github/workflows/e2e.yml` runs real Chromium smoke plus the Chromium UI-error suite on pull requests. Main pushes, the weekly schedule and manual dispatch run both full six-profile matrices. It installs browsers/OS dependencies, PostgreSQL and the pinned backend contract checkout; every integration invocation owns its fresh database. The existing frontend CI continues to run lint/unit/build independently.

The backend commit is pinned to the locally verified contract version; update that pin deliberately with API changes. If the backend repository is private, provision a read-only `BACKEND_READ_TOKEN` with access to that repository. Public checkouts use github.token. No production database or deployment secrets are required. A missing prerequisite fails the job rather than skipping real-backend checks.

The implemented-feature inventory and tested/untested matrix are in [docs/e2e-coverage.csv](../docs/e2e-coverage.csv). Missing dashboard aggregates and frontend workflows are documented as gaps, not fabricated features.

Configuration references: [Playwright configuration](https://playwright.dev/docs/test-configuration), [browser projects](https://playwright.dev/docs/test-projects), and [managed web servers](https://playwright.dev/docs/test-webserver). The implementation uses these documented mechanisms; no browser security flags are disabled.
