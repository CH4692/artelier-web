# E2E implementation report

Verified locally on 2026-11-08, on branch `codex/playwright-e2e-coverage`. Playwright Test 1.65.0 is installed and locked. No production application or backend code was changed.

## Inventory and coverage

The implemented frontend comprises session authentication, the workshop shell, the pickup dashboard, customer management, instrument management and repair management. The dashboard remains partial: open totals, overdue business classification and globally urgency-sorted deadlines are not supplied by the current API. Advanced backend capabilities without frontend workflows are not represented as implemented UI.

The [feature-to-test coverage matrix](e2e-coverage.csv) records supported behavior, real-backend coverage, explicitly mocked coverage, test files and remaining gaps for seven feature groups. The [test guide](../e2e/README.md) explains commands, architecture, prerequisites and isolation.

## Executed results

45 distinct browser scenarios were created:

- 21 real integration scenarios × six profiles: **126 passed**. The final complete run took approximately 51 seconds after infrastructure startup/build. No skips, unexpected failures, flaky classifications or retries.
- 24 isolated UI scenarios × six profiles: **144 passed**. The complete run took approximately 34 seconds. No skips, unexpected failures, flaky classifications or retries.
- Existing Angular suite: **243 tests passed** across 31 files.
- Application ESLint, E2E ESLint and E2E TypeScript checking passed.
- Angular production build passed, with existing budgets unchanged.
- Python infrastructure Ruff checks/format checks, Prettier checks, workflow YAML parsing and Git whitespace checks passed.

Browser profiles are Chromium, Firefox and WebKit, each at desktop 1440×1000 and tablet 768×1024. Chromium/WebKit tablet contexts enable touch. Firefox tablet coverage uses the viewport without claiming mobile/touch-device support. Responsive checks assert that all implemented workspaces fit the viewport; functional forms/dialogs/navigation run in each profile.

Generated local HTML reports are under `playwright-report/integration/` and `playwright-report/ui/`; JSON results are under `test-results/`. These diagnostic outputs are ignored by Git and can be regenerated with the documented commands.

## Real backend versus mocked coverage

Integration tests run the production Angular bundle, actual FastAPI application, real PostgreSQL migrations and real password/session/CSRF/role mechanisms. Each run creates a new SCRAM-authenticated PostgreSQL cluster with generated credentials and removes it afterwards. Fixture records are unique per test and API-created records are archived on fixture teardown; final cluster removal also cleans UI-created records and failure leftovers. Tests neither read production connection settings as targets nor use deployed APIs.

Real tests exercise login, invalid credentials, logout, HttpOnly session persistence, actual absolute expiration, unauthorized direct links, customer-role denial, Origin/header CSRF rejection, navigation/history/focus, available dashboard data, customer CRUD/archive/search, instrument ownership/measure validation/QR/history, dependent repair intake/edit/status changes, rejected transitions and server pagination/filtering/sorting.

Mocked UI tests are isolated from this profile. They control zero/unavailable/loading states, independent widget failures/recovery, unknown records, HTTP 400/401/403/404/409/422/500 and network failures. Create and edit failures assert that user input remains. They are not described as full-stack E2E tests.

Failures found while building the suite were investigated using screenshots, request traces and repeated isolated runs. The resulting tests wait for concrete application navigation/list states and specific confirmed status messages. Tablet menus are reopened before inspecting hidden active links. A shared navigation helper waits for the shell's existing completion/focus behavior; no product feature was faked, no test was skipped and assertions were not weakened to hide failures.

## GitHub Actions status

The new [browser workflow](../.github/workflows/e2e.yml) runs seven real Chromium smoke scenarios plus all 24 Chromium UI scenarios on pull requests. Main pushes, weekly scheduled runs and manual dispatch run both full browser matrices. It installs the required browser/OS/PostgreSQL/Python dependencies and checks out the backend at the locally verified contract commit `3495621f880b666c0e716bf00b63995c1a44e0aa`. The existing frontend workflow independently retains lint/unit/build checks. Failure HTML reports, screenshots and traces are uploaded with seven-day retention.

The workflow is implemented and its YAML parsed locally. GitHub-hosted execution has **not** run for these uncommitted/unpublished changes. A private backend checkout requires the documented read-only `BACKEND_READ_TOKEN`; public checkout uses the workflow token. No production secrets or production database service are required.

## Remaining gaps

- Missing open/overdue/deadline aggregates remain explicit unavailable-dashboard states; there are no invented counts or urgency algorithms to test.
- Frontend workflows for photos, repair documents, line items, estimates, templates, permanent deletion and restore actions do not exist and are not fabricated for test coverage.
- Real backend failures 400/500 and dropped networks are not induced in production-like infrastructure; UI resilience for these conditions is verified with explicit interception.
- Production HTTPS cookie transport, deployments/CDN configuration, third-party storage, default login-throttling thresholds, physical devices, visual baselines and a full automated accessibility audit are outside this local suite. Test-only login budgets support the matrix while retaining the actual throttle implementation.
- A successful hosted GitHub Actions run remains to be verified after publication.

## Modified files

- `.gitignore`, `README.md`, `package.json`, `package-lock.json`: dependencies, commands, documentation and artifact exclusions.
- `playwright.config.ts`, `e2e/tsconfig.json`: typed six-profile configuration, reporting, timeouts/retries and safe local targets.
- `e2e/run-integration.py`, `e2e/seed.py`, `e2e/serve.mjs`, `e2e/run-ui.mjs`: owned infrastructure, generated accounts, production-bundle serving/proxy and isolated profile entry points.
- `e2e/support/fixtures.ts`, `e2e/support/ui.ts`: real authenticated fixtures/factories/navigation versus explicit synthetic UI scenarios.
- `e2e/integration/{auth,shell,dashboard,customers,instruments,repairs,pagination}.spec.ts`: real backend feature coverage.
- `e2e/ui/{dashboard,errors}.spec.ts`: controlled UI loading/error behavior.
- `.github/workflows/e2e.yml`: PR smoke and full regression jobs.
- `e2e/README.md`, `docs/e2e-coverage.csv`, `docs/e2e-report.md`: reproducible setup, inventory/matrix and verified results.
