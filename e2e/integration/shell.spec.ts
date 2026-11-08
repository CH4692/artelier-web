import { open } from '../support/fixtures';
import { test, expect } from '../support/fixtures';
test('navigation, active route, history and unknown routes @smoke', async ({ signedIn: page }) => {
  await open(page, '/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Werkstattübersicht', exact: true }),
  ).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  for (const [name, path] of [
    ['Kunden', 'customers'],
    ['Instrumente', 'instruments'],
    ['Reparaturen', 'repairs'],
  ]) {
    const menu = page.getByRole('button', { name: 'Menü', exact: true });
    if ((await menu.isVisible()) && (await menu.getAttribute('aria-expanded')) === 'false')
      await menu.click();
    const link = nav.getByRole('link', { name: new RegExp(name) });
    await link.click();
    await expect(page).toHaveURL(new RegExp('/' + path + '$'));
    if (await menu.isVisible()) {
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await menu.click();
    }
    await expect(link).toHaveAttribute('aria-current', 'page');
  }
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Instrumente', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Reparaturen', exact: true })).toBeVisible();
  await open(page, '/not-implemented');
  await expect(page.getByRole('heading', { name: 'A little off-key.' })).toBeVisible();
});
test('desktop/tablet content fits and keyboard skip navigation reaches main', async ({
  signedIn: page,
}) => {
  for (const path of ['/dashboard', '/customers', '/instruments', '/repairs']) {
    await open(page, path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await open(page, '/dashboard');
  // Establish the focus precondition explicitly: macOS WebKit's Tab policy differs from other engines.
  await page.getByRole('link', { name: 'Zum Inhalt springen' }).focus();
  await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});
