import { open } from '../support/fixtures';
import { test, expect, unique } from '../support/fixtures';
test('customer search paginates real server results and preserves its query', async ({
  signedIn: page,
  records,
}) => {
  const group = unique('Pagination');
  for (let index = 0; index < 26; index++) await records.customer(group);
  await open(page, '/customers');
  await expect(page.getByRole('status').filter({ hasText: 'gefunden' })).toBeVisible();
  await page.getByLabel('Kunden suchen', { exact: true }).fill(group);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(group);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);
  await page
    .getByRole('navigation', { name: 'Kundenseiten' })
    .getByRole('button', { name: 'Weiter', exact: true })
    .click();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  await expect(page.getByLabel('Kunden suchen', { exact: true })).toHaveValue(group);
  await expect(page).toHaveURL(/offset=25/);
});
test('instrument search, type/ownership filters, sorting and pagination reuse server state', async ({
  signedIn: page,
  records,
}) => {
  const c = await records.customer();
  const group = unique('InstrumentPages');
  for (let index = 0; index < 26; index++) await records.instrument(c, group + '-' + index);
  await open(page, '/instruments');
  await expect(page.getByRole('status').filter({ hasText: 'gefunden' })).toBeVisible();
  await page.getByLabel('Nach Kennnummer suchen', { exact: true }).fill(group);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(group);
  await page.getByLabel('Typ', { exact: true }).selectOption('violin');
  await page.getByLabel('Eigentum', { exact: true }).selectOption('customer');
  await page.getByLabel('Sortieren nach', { exact: true }).selectOption('maker');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);
  await page
    .getByRole('navigation', { name: 'Instrumentenseiten' })
    .getByRole('button', { name: 'Weiter', exact: true })
    .click();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  await expect(page.getByLabel('Nach Kennnummer suchen', { exact: true })).toHaveValue(group);
});
test('repair status/customer filtering paginates only matching real records', async ({
  signedIn: page,
  records,
}) => {
  const c = await records.customer();
  const i = await records.instrument(c);
  for (let index = 0; index < 26; index++) await records.repair(c, i);
  await open(page, `/repairs?view=open&status=accepted&customer_id=${c.id}`);
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('accepted');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);
  await page
    .getByRole('navigation', { name: 'Angenommen: Seiten' })
    .getByRole('button', { name: 'Weiter', exact: true })
    .click();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  await expect(page.getByText('Seite 2', { exact: true })).toBeVisible();
});
