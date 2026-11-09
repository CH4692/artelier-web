import { test, expect, prepareForm } from '../support/ui';
import { testUser } from '../../src/testing/auth';
import { testCustomer } from '../../src/testing/customers';
import { testInstrument } from '../../src/testing/instruments';
import { testManagedRepair } from '../../src/testing/repairs';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
]) {
  test(`all workspaces wrap long content at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        json: { ...testUser, email: 'long-workshop-account-'.repeat(7) + '@example.com' },
      }),
    );
    await page.route('**/api/v1/customers?*', (route) =>
      route.fulfill({
        json: [
          {
            ...testCustomer,
            first_name: 'L'.repeat(90),
            last_name: 'N'.repeat(90),
            email: 'long-contact-'.repeat(10) + '@example.com',
          },
        ],
        headers: { 'X-Total-Count': '1' },
      }),
    );
    await page.route('**/api/v1/instruments?*', (route) =>
      route.fulfill({
        json: [
          {
            ...testInstrument,
            identification_number: 'Kennnummer'.repeat(25),
            maker: 'Hersteller'.repeat(25),
          },
        ],
        headers: { 'X-Total-Count': '1' },
      }),
    );
    await page.route('**/api/v1/repairs?*', (route) =>
      route.fulfill({
        json: [{ ...testManagedRepair, work_description: 'Arbeit'.repeat(100) }],
        headers: { 'X-Total-Count': '1' },
      }),
    );
    for (const path of ['/dashboard', '/customers', '/instruments', '/repairs?status=accepted']) {
      await page.goto(path);
      await expect(page.getByRole('main')).toBeFocused();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('main')).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    if (viewport.width < 1100) {
      const toggle = page.getByRole('button', { name: 'Menü', exact: true });
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page
        .getByRole('navigation', { name: 'Hauptnavigation' })
        .getByRole('link', { name: /Kunden/ })
        .focus();
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  });
}
test('form controls have readable 44-pixel targets and portrait/landscape layouts', async ({
  page,
}, info) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    for (const feature of ['customers', 'instruments', 'repairs']) {
      await prepareForm(page, feature);
      const fields = page
        .getByRole('main')
        .locator('input:not([type=checkbox]),select,textarea,button,a');
      for (const element of await fields.all()) {
        if (!(await element.isVisible())) continue;
        const box = await element.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(43.5);
        expect(box!.height, await element.evaluate((el) => el.outerHTML)).toBeGreaterThanOrEqual(
          43.5,
        );
      }
      const save = page.getByRole('button', { name: 'Speichern', exact: true });
      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport();
      if (feature === 'customers') {
        const first = (await page.getByLabel('Vorname *', { exact: true }).boundingBox())!;
        const last = (await page.getByLabel('Nachname *', { exact: true }).boundingBox())!;
        expect(viewport.width === 768 ? last.y > first.y : Math.abs(last.y - first.y) < 2).toBe(
          true,
        );
      }
    }
  }
  // A reduced visual viewport approximates the space available above an on-screen keyboard.
  await page.setViewportSize({ width: 768, height: 430 });
  await prepareForm(page, 'repairs');
  const notes = page.getByLabel('Interne Notizen (optional)', { exact: true });
  await notes.fill('Eingabe bleibt zugänglich');
  await notes.scrollIntoViewIfNeeded();
  await expect(notes).toBeInViewport();
  const save = page.getByRole('button', { name: 'Speichern', exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await page.route('**/api/v1/repairs', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({ status: 500, json: { detail: 'Test failure' } });
    else await route.fallback();
  });
  if (info.project.use.hasTouch) await save.tap();
  else await save.click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(notes).toHaveValue('Eingabe bleibt zugänglich');
  await expect(
    page.getByRole('heading', { name: 'Neuer Reparaturauftrag', exact: true }),
  ).toBeVisible();
});
test('archive dialog keeps actions reachable in a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 360 });
  const customer = {
    ...testCustomer,
    first_name: 'Vorname'.repeat(13),
    last_name: 'Nachname'.repeat(12),
  };
  await page.route('**/api/v1/customers/12/overview?*', (route) =>
    route.fulfill({ json: { customer, instruments: [] } }),
  );
  await page.goto('/customers/12');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('button', { name: 'Kunde archivieren', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const cancel = dialog.getByRole('button', { name: 'Abbrechen', exact: true });
  await expect(cancel).toBeFocused();
  for (const button of await dialog.getByRole('button').all()) {
    await expect(button).toBeInViewport();
    const box = (await button.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(360);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect((await dialog.boundingBox())!.height).toBeLessThanOrEqual(328);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Kunde archivieren', exact: true })).toBeFocused();
});
test('table overflow is confined to labeled keyboard-scrollable regions', async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 800 });
  for (const [path, label] of [
    ['/customers', 'Kundenliste'],
    ['/instruments', 'Instrumentenliste'],
    ['/repairs?status=accepted', 'Angenommen: Auftragsliste'],
  ]) {
    await page.route('**/api/v1/repairs?*', (route) =>
      route.fulfill({ json: [testManagedRepair], headers: { 'X-Total-Count': '1' } }),
    );
    await page.goto(path);
    await expect(page.getByRole('main')).toBeFocused();
    const region = page.getByRole('region', { name: label, exact: true });
    await expect(region).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await region.focus();
    await expect(region).toBeFocused();
    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(region.getByRole('columnheader').first()).toBeAttached();
  }
});
