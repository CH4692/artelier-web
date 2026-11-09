import { test, expect, type Page } from '@playwright/test';
import type { SignatureDraft } from '../../src/app/shared/ui/signature-capture/signature.models';
const surface = (page: Page) =>
  page.getByRole('img', { name: 'Unterschrift zeichnen', exact: true });
async function draw(page: Page) {
  const box = (await surface(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.7, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Entwurf lokal übernommen, nicht gespeichert.' }),
  ).toBeVisible();
}
async function draft(page: Page) {
  return JSON.parse(
    await page.getByLabel('Testdaten', { exact: true }).innerText(),
  ) as SignatureDraft | null;
}
async function ink(page: Page) {
  return surface(page).evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] > 0) total++;
    return total;
  });
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(surface(page)).toBeVisible();
  await expect
    .poll(() => surface(page).evaluate((canvas: HTMLCanvasElement) => canvas.width))
    .toBeGreaterThan(300);
});
test('empty input is rejected and keyboard users can request an alternative', async ({ page }) => {
  await page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Bitte zeichnen');
  expect(await draft(page)).toBeNull();
  await page.getByRole('button', { name: 'Andere Möglichkeit anfragen', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Alternative angefragt.' }),
  ).toBeVisible();
  expect(await ink(page)).toBe(0);
});
test('mouse drawing, clearing and redraw only emit an in-memory draft', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await draw(page);
  await expect(page.getByRole('status').filter({ hasText: 'Zeichnung vorhanden.' })).toBeVisible();
  expect(await ink(page)).toBeGreaterThan(50);
  await confirm(page);
  expect((await draft(page))!.strokes[0].length).toBeGreaterThan(2);
  await expect(
    page.getByText('Entwurf lokal übernommen, nicht gespeichert.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zeichnung löschen', exact: true }).click();
  await expect(page.getByLabel('Testdaten')).toHaveText('null');
  expect(await draft(page)).toBeNull();
  expect(await ink(page)).toBe(0);
  await draw(page);
  await confirm(page);
  expect((await draft(page))!.strokes).toHaveLength(1);
  expect(apiRequests).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
});
test('high-density backing pixels and normalized strokes survive viewport resizing', async ({
  page,
}) => {
  await draw(page);
  await confirm(page);
  const before = await draft(page);
  await page.setViewportSize({ width: 1024, height: 700 });
  await expect
    .poll(() =>
      surface(page).evaluate((canvas: HTMLCanvasElement) =>
        Math.abs(canvas.width - canvas.getBoundingClientRect().width * devicePixelRatio),
      ),
    )
    .toBeLessThanOrEqual(0.5);
  await expect.poll(() => ink(page)).toBeGreaterThan(50);
  await confirm(page);
  expect(await draft(page)).toEqual(before);
  const point = before!.strokes[0][0];
  const aligned = await surface(page).evaluate((canvas: HTMLCanvasElement, point) => {
    const x = Math.round(point.x * canvas.width);
    const y = Math.round(point.y * canvas.height);
    return [
      ...canvas.getContext('2d')!.getImageData(Math.max(0, x - 4), Math.max(0, y - 4), 9, 9).data,
    ].some((value, index) => index % 4 === 3 && value > 0);
  }, point);
  expect(aligned).toBe(true);
  await draw(page);
  await confirm(page);
  expect((await draft(page))!.strokes).toHaveLength(2);
});
test('pointer capture retains a bounded stroke outside the drawing area', async ({ page }) => {
  const box = (await surface(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x - 30, box.y - 30, { steps: 5 });
  await page.mouse.up();
  await confirm(page);
  const points = (await draft(page))!.strokes[0];
  expect(points.length).toBeGreaterThan(1);
  expect(points.at(-1)).toMatchObject({ x: 0, y: 0 });
});
test('disabled capture preserves the draft and guards all editing actions', async ({ page }) => {
  await draw(page);
  await confirm(page);
  const before = await draft(page);
  await page.getByLabel('Zeichenfläche deaktivieren', { exact: true }).check();
  await expect(page.getByRole('button', { name: 'Zeichnung löschen', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }),
  ).toBeDisabled();
  await draw(page);
  expect(await draft(page)).toEqual(before);
  await page.getByLabel('Zeichenfläche deaktivieren', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Zeichnung löschen', exact: true }).click();
  await expect(page.getByLabel('Testdaten')).toHaveText('null');
  expect(await draft(page)).toBeNull();
});
