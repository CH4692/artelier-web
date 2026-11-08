import { open } from '../support/fixtures';
import { test, expect, selectCustomer, selectInstrument, unique } from '../support/fixtures';
test('dependent intake, editing, valid and rejected status transitions @smoke', async ({
  signedIn: page,
  records,
}) => {
  const first = await records.customer();
  const oldInstrument = await records.instrument(first);
  const second = await records.customer();
  const instrument = await records.instrument(second);
  const work = unique('Reparatur');
  await open(page, '/repairs/new');
  await selectCustomer(page, first.first_name);
  await selectInstrument(page, oldInstrument.identification_number!);
  await selectCustomer(page, second.first_name);
  await expect(
    page.getByText('Bitte wählen Sie ein Instrument dieses Kunden.', { exact: true }),
  ).toBeVisible();
  await selectInstrument(page, instrument.identification_number!);
  await page.getByLabel('Arbeitsbeschreibung *', { exact: true }).fill(work);
  await page.getByLabel('Geplanter Abschluss (optional)', { exact: true }).fill('2030-04-12');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page).toHaveURL(/\/repairs\/\d+$/);
  const id = page.url().split('/').at(-1)!;
  await page.getByRole('link', { name: 'Auftrag bearbeiten', exact: true }).click();
  await page.getByLabel('Interne Notizen (optional)', { exact: true }).fill('Testnotiz');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByText('Testnotiz', { exact: true })).toBeVisible();
  await page.getByLabel('Gewünschter Status', { exact: true }).selectOption('completed');
  await page.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nicht erlaubt');
  for (const status of ['in_progress', 'ready_for_pickup', 'completed']) {
    await page.getByLabel('Gewünschter Status', { exact: true }).selectOption(status);
    await page.getByRole('button', { name: 'Status speichern', exact: true }).click();
    const labels: Record<string, string> = {
      in_progress: 'In Bearbeitung',
      ready_for_pickup: 'Abholbereit',
      completed: 'Abgeschlossen',
    };
    await expect(
      page.getByText('Status gespeichert: ' + labels[status] + '.', { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('link', { name: 'Im aktuellen Status anzeigen', exact: true }).click();
  await expect(page).toHaveURL(/view=closed&status=completed/);
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('completed');
  await expect(page.getByRole('link', { name: `Auftrag #${id}`, exact: true })).toBeVisible();
});
test('required intake references and description are validated', async ({ signedIn: page }) => {
  await open(page, '/repairs/new');
  await expect(
    page.getByRole('button', { name: 'Instrumente suchen', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('Arbeitsbeschreibung *', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page).toHaveURL(/\/repairs\/new$/);
});
test('real unknown repair and instrument IDs render not found', async ({ signedIn: page }) => {
  await open(page, '/repairs/2147483647');
  await expect(
    page.getByRole('heading', { name: 'Auftrag nicht gefunden', exact: true }),
  ).toBeVisible();
  await open(page, '/instruments/2147483647');
  await expect(
    page.getByRole('heading', { name: 'Instrument nicht gefunden', exact: true }),
  ).toBeVisible();
});
