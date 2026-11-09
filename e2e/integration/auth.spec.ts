import { open } from '../support/fixtures';
import { test, expect, loginUI, loginAPI, runtime } from '../support/fixtures';
test('login, real HttpOnly session persistence and logout @smoke', async ({
  page,
  credentials,
}) => {
  await open(page, '/login');
  await loginUI(page, credentials);
  await expect(page).toHaveURL(/\/dashboard$/);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'dev-session')?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('dev-session');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Werkstattübersicht', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await open(page, '/repairs');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
});
test('invalid credentials preserve email and clear password', async ({ page, credentials }) => {
  await open(page, '/login');
  await loginUI(page, { ...credentials, password: 'invalid-test-password' });
  await expect(page.getByRole('alert')).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(credentials.email);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
});
test('signed-out direct links are guarded', async ({ page }) => {
  for (const path of ['/dashboard', '/customers/new', '/instruments/1/edit', '/repairs/1']) {
    await open(page, path);
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  }
});
test('customer role cannot enter workshop routes or read the API @smoke', async ({ page }) => {
  await open(page, '/login');
  await loginUI(page, runtime().portal);
  await expect(page).toHaveURL(/\/access-denied$/);
  await open(page, '/dashboard');
  await expect(page).toHaveURL(/\/access-denied$/);
  expect((await page.request.get('/api/v1/customers')).status()).toBe(403);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
});
test('real backend enforces both Origin and custom-header CSRF', async ({ page, credentials }) => {
  expect((await page.request.post('/api/v1/auth/login', { data: credentials })).status()).toBe(403);
  expect(
    (
      await page.request.post('/api/v1/auth/login', {
        data: credentials,
        headers: { Origin: 'https://untrusted.example', 'X-CSRF-Protection': '1' },
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
  await loginAPI(page, credentials);
  expect(
    (
      await page.request.post('/api/v1/customers', {
        data: { first_name: 'Forbidden', last_name: 'Test' },
      })
    ).status(),
  ).toBe(403);
});
test('actual absolute session expiration returns the mounted UI to login', async ({
  page,
  credentials,
}) => {
  await loginAPI(page, credentials);
  await open(page, '/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Werkstattübersicht', exact: true }),
  ).toBeVisible();
  await loginAPI(page, credentials, runtime().expiryURL + '/api/v1/auth/login');
  await expect
    .poll(async () => (await page.request.get('/api/v1/auth/me')).status(), {
      timeout: 10000,
      intervals: [200, 400, 800],
    })
    .toBe(401);
  await page.getByRole('button', { name: 'Übersicht aktualisieren', exact: true }).click();
  await expect(page).toHaveURL(/reason=session-expired/);
  await expect(page.getByRole('status')).toContainText('Your session has expired');
});
