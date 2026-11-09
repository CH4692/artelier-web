import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sameOpenApiContract } from './openapi-contract.mjs';
const snapshot = JSON.parse(
  await readFile(new URL('../openapi/atelier-api.json', import.meta.url), 'utf8'),
);

test('accepts the CI shallow-checkout software version without changing either schema', () => {
  const ci = structuredClone(snapshot);
  ci.info.version = '0.1.dev1+g3495621f8';
  assert.equal(sameOpenApiContract(snapshot, ci), true);
  assert.equal(snapshot.info.version, '0.20.0');
  assert.equal(ci.info.version, '0.1.dev1+g3495621f8');
});
test('ignores JSON object key ordering', () => {
  assert.equal(
    sameOpenApiContract(snapshot, Object.fromEntries(Object.entries(snapshot).reverse())),
    true,
  );
});
for (const [name, change] of [
  [
    'response property type',
    (schema) => (schema.components.schemas.CustomerRead.properties.first_name.type = 'number'),
  ],
  [
    'required request field',
    (schema) => schema.components.schemas.CustomerCreate.required.push('email'),
  ],
  ['route removal', (schema) => delete schema.paths['/api/v1/customers']],
  [
    'operation response',
    (schema) =>
      (schema.paths['/api/v1/customers'].get.responses['200'] = { description: 'changed' }),
  ],
  ['authentication contract', (schema) => (schema.components.securitySchemes = {})],
  ['OpenAPI version', (schema) => (schema.openapi = '3.0.0')],
]) {
  test(`rejects a changed ${name} even with different software metadata`, () => {
    const changed = structuredClone(snapshot);
    changed.info.version = '0.1.dev1+g3495621f8';
    change(changed);
    assert.equal(sameOpenApiContract(snapshot, changed), false);
  });
}
