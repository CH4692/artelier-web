/** Chromium CDP supplies actual pen/touch browser events; other engines have no equivalent driver. */
import { test, expect } from '@playwright/test';
test('emulated stylus records pen pressure through Pointer Events', async ({ page, context }) => {
  await page.goto('/');
  const canvas = page.getByRole('img', { name: 'Unterschrift zeichnen', exact: true });
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await canvas.evaluate((element: HTMLCanvasElement) =>
    element.addEventListener('pointerdown', (event) =>
      element.setAttribute('data-last-pointer', event.pointerType),
    ),
  );
  const x = box.x + box.width * 0.2,
    y = box.y + box.height * 0.4;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen' });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    force: 0.7,
    pointerType: 'pen',
  });
  for (let index = 1; index <= 8; index++)
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: x + index * 10,
      y: y + index * 3,
      buttons: 1,
      force: 0.8,
      pointerType: 'pen',
    });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: x + 80,
    y: y + 24,
    button: 'left',
    buttons: 0,
    pointerType: 'pen',
  });
  await expect(canvas).toHaveAttribute('data-last-pointer', 'pen');
  await page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Entwurf lokal übernommen, nicht gespeichert.' }),
  ).toBeVisible();
  const draft = JSON.parse(await page.getByLabel('Testdaten').innerText()) as {
    strokes: { pressure: number }[][];
  };
  expect(draft.strokes[0].some((point) => point.pressure >= 0.7)).toBe(true);
  await cdp.detach();
});
test('touch drawing suppresses scrolling only inside the canvas', async ({ page, context }) => {
  await page.goto('/');
  const canvas = page.getByRole('img', { name: 'Unterschrift zeichnen', exact: true });
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const before = await page.evaluate(() => scrollY);
  const x = box.x + box.width * 0.3,
    y = box.y + box.height * 0.25;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1, force: 0.5 }],
  });
  for (let index = 1; index <= 8; index++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + index * 6, y: y + index * 5, id: 1, force: 0.5 }],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.getByRole('button', { name: 'Zeichnung übernehmen', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Entwurf lokal übernommen, nicht gespeichert.' }),
  ).toBeVisible();
  expect(
    JSON.parse(await page.getByLabel('Testdaten').innerText()).strokes[0].length,
  ).toBeGreaterThan(2);
  await page.evaluate(() => scrollTo(0, 0));
  const height = page.viewportSize()!.height;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 10, y: height * 0.8, id: 2 }],
  });
  for (let index = 1; index <= 8; index++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 10, y: height * (0.8 - index * 0.06), id: 2 }],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await cdp.detach();
});
