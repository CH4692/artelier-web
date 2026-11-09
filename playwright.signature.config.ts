import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e/signature',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  workers: process.env['CI'] ? 2 : 4,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 10000 },
  outputDir: 'test-results/signature',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/signature', open: 'never' }],
    ['json', { outputFile: 'test-results/signature-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'de-DE',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: ['chromium', 'firefox', 'webkit'].flatMap((browser) =>
    ['desktop', 'portrait', 'landscape'].map((view) => ({
      name: `${browser}-${view}`,
      testIgnore: [
        ...(browser === 'chromium' ? [] : ['**/pen.spec.ts']),
        ...(browser === 'firefox' || view === 'desktop' ? ['**/touch.spec.ts'] : []),
      ],
      use: {
        browserName: browser as 'chromium' | 'firefox' | 'webkit',
        viewport:
          view === 'desktop'
            ? { width: 1440, height: 1000 }
            : view === 'portrait'
              ? { width: 768, height: 1024 }
              : { width: 1024, height: 768 },
        deviceScaleFactor: view === 'desktop' ? 1 : 2,
        hasTouch: browser !== 'firefox' && view !== 'desktop',
      },
    })),
  ),
  webServer: {
    command: 'node e2e/serve.mjs',
    env: { E2E_APP_DIST: 'dist/signature-e2e/browser' },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
