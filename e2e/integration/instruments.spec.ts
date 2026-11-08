import { open } from '../support/fixtures';
import { test, expect, unique, selectCustomer } from '../support/fixtures';
test('create instrument with customer, search and clear owner on edit @smoke', async ({
  signedIn: page,
  records,
}) => {
  const customer = await records.customer();
  const identifier = unique('Geige');
  await open(page, '/instruments/new');
  await page.getByLabel('Instrumententyp *', { exact: true }).selectOption('violin');
  await page.getByLabel('Kennnummer (optional)', { exact: true }).fill(identifier);
  await page.getByLabel('Korpuslänge (mm) (optional)', { exact: true }).fill('356');
  await page.getByLabel('Eigentum', { exact: true }).selectOption('customer');
  await selectCustomer(page, customer.first_name);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(identifier);
  const id = page.url().split('/').at(-1)!;
  await expect(page.getByRole('link', { name: new RegExp(customer.first_name) })).toBeVisible();
  await page.getByRole('link', { name: 'Bearbeiten', exact: true }).click();
  await page.getByLabel('Eigentum', { exact: true }).selectOption('workshop');
  await expect(page.getByRole('button', { name: 'Kunden suchen', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByText('Keine Kundenzuordnung', { exact: true })).toBeVisible();
  await open(page, '/instruments');
  await page.getByLabel('Nach Kennnummer suchen', { exact: true }).fill(identifier);
  await page.getByRole('link', { name: new RegExp(identifier) }).click();
  await expect(page).toHaveURL(new RegExp(`/instruments/${id}$`));
});
test('instrument validation and type-dependent measure clearing', async ({ signedIn: page }) => {
  await open(page, '/instruments/new');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('Instrumententyp *', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Instrumententyp *', { exact: true }).selectOption('violin');
  await page.getByLabel('Korpuslänge (mm) (optional)', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('Korpuslänge (mm) (optional)', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Instrumententyp *', { exact: true }).selectOption('bow');
  await expect(page.getByLabel('Korpuslänge (mm) (optional)', { exact: true })).toHaveCount(0);
  await page.getByLabel('Bogengewicht (g) (optional)', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bogen');
});
test('QR download and repair history use existing authenticated endpoints', async ({
  signedIn: page,
  records,
}) => {
  const c = await records.customer();
  const i = await records.instrument(c);
  const repair = await records.repair(c, i);
  await open(page, `/instruments/${i.id}`);
  await expect(
    page.getByRole('link', { name: `Auftrag #${repair.id}`, exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'QR-Code herunterladen', exact: true }).click();
  expect((await download).suggestedFilename()).toBe(`instrument-${i.id}.svg`);
  await page.getByRole('link', { name: `Auftrag #${repair.id}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/repairs/${repair.id}$`));
});
