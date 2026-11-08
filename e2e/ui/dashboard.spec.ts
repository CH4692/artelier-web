import { test, expect } from '../support/ui';
test('dashboard zero, unavailable capabilities and supported links @smoke', async ({ page }) => {
  await page.goto('/dashboard');
  const summary = page.getByRole('article', { name: 'Abholbereit', exact: true });
  await expect(summary.getByText('0', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Keine Aufträge abholbereit.', { exact: true })).toHaveCount(2);
  for (const name of ['Offene Reparaturen', 'Überfällige Aufträge', 'Bevorstehende Fristen'])
    await expect(page.getByRole('article', { name, exact: true })).toContainText(
      'Noch nicht verfügbar',
    );
  await expect(page.getByRole('main')).not.toContainText('NaN');
  await page.getByRole('link', { name: 'Abholliste öffnen', exact: true }).click();
  await expect(page).toHaveURL(/view=open&status=ready_for_pickup/);
});
test('dashboard loading is visible until a controlled response arrives', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/repairs?*', async (route) => {
    await gate;
    await route.fulfill({ json: [], headers: { 'X-Total-Count': '0' } });
  });
  await page.goto('/dashboard');
  await expect(
    page.getByText('Abholbereite Aufträge werden geladen…', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Abholbereit', exact: true })).toContainText(
    'Daten werden geladen.',
  );
  release();
  await expect(
    page.getByText('Abholbereite Aufträge werden geladen…', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Abholliste aktualisieren', exact: true }),
  ).toBeEnabled();
});
test('summary failure leaves the list usable and refresh recovers', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/repairs?*', async (route) => {
    const count = new URL(route.request().url()).searchParams.get('limit') === '1';
    await route.fulfill(
      fail && count
        ? { status: 500, json: { detail: 'private' } }
        : { json: [], headers: { 'X-Total-Count': '0' } },
    );
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('article', { name: 'Abholbereit', exact: true })).toContainText(
    'Daten konnten nicht geladen',
  );
  await expect(page.getByText('Keine Aufträge abholbereit.', { exact: true })).toHaveCount(1);
  fail = false;
  await page.getByRole('button', { name: 'Übersicht aktualisieren', exact: true }).click();
  await expect(page.getByText('Keine Aufträge abholbereit.', { exact: true })).toHaveCount(2);
});
test('failed list refresh never presents stale empty data as fresh', async ({ page }) => {
  let fail = false;
  await page.route('**/api/v1/repairs?*', async (route) => {
    const list = new URL(route.request().url()).searchParams.get('limit') === '5';
    await route.fulfill(
      fail && list
        ? { status: 500, json: { detail: 'private' } }
        : { json: [], headers: { 'X-Total-Count': '0' } },
    );
  });
  await page.goto('/dashboard');
  await expect(page.getByText('Keine Aufträge abholbereit.', { exact: true })).toHaveCount(2);
  fail = true;
  await page.getByRole('button', { name: 'Abholliste aktualisieren', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Abholliste nicht verfügbar', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Keine Aufträge abholbereit.', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('main')).not.toContainText('private');
});
