import { test, expect, prepareForm } from '../support/ui';
for (const feature of ['customers', 'instruments', 'repairs']) {
  for (const status of [400, 409, 422, 500])
    test(`${feature} creation preserves input after HTTP ${status}`, async ({ page }) => {
      const input = await prepareForm(page, feature);
      await page.route(`**/api/v1/${feature}`, async (route) => {
        if (route.request().method() === 'POST')
          await route.fulfill({
            status,
            json: {
              detail: [
                {
                  loc: [
                    'body',
                    feature === 'customers'
                      ? 'first_name'
                      : feature === 'instruments'
                        ? 'maker'
                        : 'work_description',
                  ],
                  msg: 'private backend internals',
                },
              ],
            },
          });
        else await route.fallback();
      });
      await page.getByRole('button', { name: 'Speichern', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(input).toHaveValue('Ungespeichert');
      await expect(page.getByRole('main')).not.toContainText('private backend internals');
      await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`/${feature}/new$`));
    });
  test(`${feature} editing preserves input after a network failure`, async ({ page }) => {
    const input = await prepareForm(page, feature, true);
    await page.route(`**/api/v1/${feature}/*`, async (route) => {
      if (route.request().method() === 'PATCH') await route.abort('failed');
      else await route.fallback();
    });
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(input).toHaveValue('Ungespeichert');
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeEnabled();
  });
  test(`${feature} detail shows an unknown record safely`, async ({ page }) => {
    await page.goto(`/${feature}/999`);
    await expect(page.getByRole('heading', { name: /nicht gefunden/ })).toBeVisible();
    await expect(page.getByRole('main')).not.toContainText('Unknown UI fixture');
  });
}
for (const status of [401, 403])
  test(`protected API HTTP ${status} redirects the UI`, async ({ page }) => {
    await page.route('**/api/v1/customers?*', (route) =>
      route.fulfill({ status, json: { detail: 'private' } }),
    );
    await page.goto('/customers');
    await expect(page).toHaveURL(status === 401 ? /\/login/ : /\/access-denied/);
    await expect(page.getByRole('main')).not.toContainText('private');
  });
