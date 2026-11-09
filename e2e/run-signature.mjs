import { spawnSync } from 'node:child_process';
const build = spawnSync('npm', ['run', 'build:signature'], { stdio: 'inherit' });
if (build.status) process.exit(build.status);
const run = spawnSync(
  'npx',
  ['playwright', 'test', '--config=playwright.signature.config.ts', ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, E2E_RUNTIME: '' } },
);
process.exit(run.status ?? 1);
