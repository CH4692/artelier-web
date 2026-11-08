import { spawnSync } from 'node:child_process';
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (build.status) process.exit(build.status);
const run = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, E2E_PROFILE: 'ui' },
});
process.exit(run.status ?? 1);
