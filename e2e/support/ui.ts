/** Explicitly mocked UI scenarios only; never imported by integration tests. */
import { test as base, expect, type Page } from '@playwright/test';
import { testUser } from '../../src/testing/auth';
import { testCustomer } from '../../src/testing/customers';
import { testInstrument } from '../../src/testing/instruments';
import { testManagedRepair } from '../../src/testing/repairs';
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      let data: unknown;
      let total: string | undefined;
      if (path === '/api/v1/auth/me') data = testUser;
      else if (path === '/api/v1/customers') {
        data = [testCustomer];
        total = '1';
      } else if (path === '/api/v1/customers/12') data = testCustomer;
      else if (path === '/api/v1/customers/12/overview')
        data = { customer: testCustomer, instruments: [testInstrument] };
      else if (path === '/api/v1/instruments') {
        data = [testInstrument];
        total = '1';
      } else if (path === '/api/v1/instruments/8') data = testInstrument;
      else if (path === '/api/v1/repairs/20') data = testManagedRepair;
      else if (path === '/api/v1/repairs') {
        data = [];
        total = '0';
      } else {
        await route.fulfill({ status: 404, json: { detail: 'Unknown UI fixture request' } });
        return;
      }
      await route.fulfill({ json: data, headers: total ? { 'X-Total-Count': total } : {} });
    });
    await use(page);
  },
});
export { expect };
export async function prepareForm(page: Page, feature: string, edit = false) {
  await page.goto(
    edit
      ? `/${feature}/${feature === 'customers' ? 12 : feature === 'instruments' ? 8 : 20}/edit`
      : `/${feature}/new`,
  );
  await expect(page.getByRole('main')).toBeFocused();
  if (feature === 'customers') {
    await page.getByLabel('Vorname *', { exact: true }).fill('Ungespeichert');
    await page.getByLabel('Nachname *', { exact: true }).fill('Test');
    return page.getByLabel('Vorname *', { exact: true });
  }
  if (feature === 'instruments') {
    await page.getByLabel('Instrumententyp *', { exact: true }).selectOption('violin');
    await page.getByLabel('Hersteller (optional)', { exact: true }).fill('Ungespeichert');
    return page.getByLabel('Hersteller (optional)', { exact: true });
  }
  if (!edit) {
    await page.getByRole('button', { name: 'Kunden suchen', exact: true }).click();
    await page.getByRole('button', { name: /Maria Beispiel/ }).click();
    await page.getByRole('button', { name: 'Instrumente suchen', exact: true }).click();
    await page.getByRole('button', { name: /TEST-8/ }).click();
  }
  await page.getByLabel('Arbeitsbeschreibung *', { exact: true }).fill('Ungespeichert');
  return page.getByLabel('Arbeitsbeschreibung *', { exact: true });
}
