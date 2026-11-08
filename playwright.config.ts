import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
const integration = process.env['E2E_PROFILE'] !== 'ui';
if (integration && !process.env['E2E_RUNTIME'])
  throw new Error('Use npm run e2e:integration to create an isolated backend.');
const runtime = integration
  ? (JSON.parse(readFileSync(process.env['E2E_RUNTIME']!, 'utf8')) as { baseURL: string })
  : null;
const baseURL = runtime?.baseURL ?? process.env['E2E_UI_BASE_URL'] ?? 'http://127.0.0.1:4173';
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname))
  throw new Error('Browser tests only target explicit local test previews.');
export default defineConfig({
  testDir: integration ? './e2e/integration' : './e2e/ui',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : 4,
  timeout: 45000,
  expect: { timeout: 10000 },
  outputDir: `test-results/${integration ? 'integration' : 'ui'}`,
  reporter: [
    ['list'],
    [
      'html',
      { outputFolder: `playwright-report/${integration ? 'integration' : 'ui'}`, open: 'never' },
    ],
    ['json', { outputFile: `test-results/${integration ? 'integration' : 'ui'}-results.json` }],
  ],
  use: {
    baseURL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10000,
  },
  projects: ['chromium', 'firefox', 'webkit'].flatMap((browser) => [
    {
      name: browser,
      use: {
        browserName: browser as 'chromium' | 'firefox' | 'webkit',
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: `${browser}-tablet`,
      use: {
        browserName: browser as 'chromium' | 'firefox' | 'webkit',
        viewport: { width: 768, height: 1024 },
        hasTouch: browser !== 'firefox',
      },
    },
  ]),
  webServer:
    process.env['E2E_UI_BASE_URL'] && !integration
      ? undefined
      : {
          command: 'node e2e/serve.mjs',
          url: `${baseURL}/login`,
          reuseExistingServer: false,
          timeout: 30000,
        },
});
