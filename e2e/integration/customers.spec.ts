import { open } from '../support/fixtures';
import { test, expect, unique } from '../support/fixtures';
test('create, search, detail, edit and archive customer @smoke', async ({ signedIn: page }) => {
  const name = unique('Kunde');
  await open(page, '/customers/new');
  await page.getByLabel('Vorname *', { exact: true }).fill(name);
  await page.getByLabel('Nachname *', { exact: true }).fill('E2E');
  await page.getByLabel('E-Mail (optional)', { exact: true }).fill('customer@example.com');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page).toHaveURL(/\/customers\/\d+$/);
  await expect(page.getByText('Der Kunde wurde angelegt.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Bearbeiten', exact: true }).click();
  await page.getByLabel('Nachname *', { exact: true }).fill('Geändert');
  await page.getByLabel('Nachname *', { exact: true }).press('Tab');
  await expect(page.getByLabel('Nachname *', { exact: true })).toHaveValue('Geändert');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Geändert');
  await page.getByRole('link', { name: 'Zur Kundenliste' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'gefunden' })).toBeVisible();
  await page.getByLabel('Kunden suchen', { exact: true }).fill(name);
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: 'Kunde archivieren', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Abbrechen', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Kunde archivieren', exact: true }).click();
  await dialog.getByRole('button', { name: 'Archivieren bestätigen', exact: true }).click();
  await expect(
    page.getByText('Der Kunde wurde archiviert. Die Daten bleiben erhalten.', { exact: true }),
  ).toBeVisible();
  await open(page, '/customers');
  await expect(page.getByRole('status').filter({ hasText: 'gefunden' })).toBeVisible();
  await page.getByLabel('Kunden suchen', { exact: true }).fill(name);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(name);
  await expect(
    page.getByRole('heading', { name: 'Keine passenden Kunden gefunden.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
  await page.getByLabel('Archivierte Kunden einschließen').check();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
});
test('customer validation blocks incomplete and malformed contacts', async ({ signedIn: page }) => {
  await open(page, '/customers/new');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('Vorname *', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Vorname *', { exact: true }).fill('Valid');
  await page.getByLabel('Nachname *', { exact: true }).fill('Name');
  await page.getByLabel('E-Mail (optional)', { exact: true }).fill('invalid-email');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('E-Mail (optional)', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page).toHaveURL(/\/customers\/new$/);
});
test('customer overview links its assigned instrument', async ({ signedIn: page, records }) => {
  const customer = await records.customer();
  const instrument = await records.instrument(customer);
  await open(page, `/customers/${customer.id}`);
  await page.getByRole('link', { name: new RegExp(instrument.identification_number!) }).click();
  await expect(page).toHaveURL(new RegExp(`/instruments/${instrument.id}$`));
});
