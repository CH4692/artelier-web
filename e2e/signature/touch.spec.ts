/** Runs only in the touch-capable Chromium/WebKit tablet contexts. */
import { test, expect } from '@playwright/test';
test('a finger can draw, clear and redraw without mouse-only controls', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByRole('img', { name: 'Unterschrift zeichnen', exact: true });
  await expect(canvas).toBeVisible();
  await canvas.tap();
  await expect(page.getByRole('status').filter({ hasText: 'Zeichnung vorhanden.' })).toBeVisible();
  await page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }).tap();
  await expect(
    page.getByRole('status').filter({ hasText: 'Entwurf lokal übernommen, nicht gespeichert.' }),
  ).toBeVisible();
  expect(JSON.parse(await page.getByLabel('Testdaten').innerText()).strokes).toHaveLength(1);
  await page.getByRole('button', { name: 'Zeichnung löschen', exact: true }).tap();
  await expect(page.getByLabel('Testdaten')).toHaveText('null');
  expect(await page.getByLabel('Testdaten').innerText()).toBe('null');
  await canvas.tap();
  await page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }).tap();
  await expect(
    page.getByRole('status').filter({ hasText: 'Entwurf lokal übernommen, nicht gespeichert.' }),
  ).toBeVisible();
  expect(JSON.parse(await page.getByLabel('Testdaten').innerText()).strokes).toHaveLength(1);
});
