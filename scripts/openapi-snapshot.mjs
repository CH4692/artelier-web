// Export schema metadata only. Never starts the API, connects a database or runs migrations.
import { sameOpenApiContract } from './openapi-contract.mjs';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const index = args.indexOf('--backend');
if (index < 0 || !args[index + 1])
  throw new Error('Pass --backend PATH to an explicit backend checkout.');
const backend = resolve(args[index + 1]);
const result = spawnSync(
  resolve(backend, '.venv/bin/python'),
  [
    '-c',
    'import json; from atelier_api.main import app; print(json.dumps(app.openapi(), sort_keys=True, indent=2))',
  ],
  {
    cwd: backend,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'sqlite://',
      ENVIRONMENT: 'development',
      PYTHONDONTWRITEBYTECODE: '1',
    },
  },
);
if (result.error || result.status !== 0)
  throw new Error('Backend OpenAPI export failed. Check the checkout and its installed .venv.');
const schema = JSON.parse(result.stdout);
if (!String(schema.openapi).startsWith('3.')) throw new Error('Expected OpenAPI 3.');
const output = new URL('../openapi/atelier-api.json', import.meta.url);
if (args.includes('--check')) {
  if (!sameOpenApiContract(JSON.parse(await readFile(output, 'utf8')), schema))
    throw new Error(
      'Backend OpenAPI differs from the committed snapshot. Review the contract change and regenerate types.',
    );
} else await writeFile(output, result.stdout);
