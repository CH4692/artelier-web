import { open } from '../support/fixtures';
import { test, expect } from '../support/fixtures';
test('dashboard reads real pickup total and navigates to its order @smoke', async ({
  signedIn: page,
  records,
}) => {
  const c = await records.customer();
  const i = await records.instrument(c);
  const r = await records.repair(c, i);
  await records.status(r.id, 'in_progress');
  await records.status(r.id, 'ready_for_pickup');
  const response = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/repairs?') &&
      new URL(response.url()).searchParams.get('limit') === '1',
  );
  await open(page, '/dashboard');
  const total = (await response).headers()['x-total-count'];
  const card = page.getByRole('article', { name: 'Abholbereit', exact: true });
  await expect(card.getByText(total, { exact: false }).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Zur Abholung bereit', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: `Auftrag #${r.id}`, exact: true })).toBeVisible();
  await page.getByRole('link', { name: `Auftrag #${r.id}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Auftrag #${r.id}`, exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/repairs/${r.id}$`));
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Werkstattübersicht', exact: true }),
  ).toBeVisible();
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/repairs?') &&
      new URL(response.url()).searchParams.get('limit') === '1',
  );
  await page.getByRole('button', { name: 'Übersicht aktualisieren', exact: true }).click();
  expect((await refreshed).ok()).toBe(true);
});
