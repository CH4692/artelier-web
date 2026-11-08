# Workshop dashboard refinement

## Behavior

The dashboard uses the existing walnut, ivory and brass tokens and shared standalone UI components. The compact German header and four KPI cards replace the promotional welcome area and redundant navigation cards. The KPI grid has one column on small screens, two from 560px and four from 1200px. Card typography, borders, spacing and surface treatments reuse the design system. Refresh and retry are native buttons with 44px minimum touch targets and inherited focus styling. Count updates use a polite live region; state labels remain visible without relying on color. A static loading skeleton respects reduced-motion preferences without requiring animation.

All dashboard copy and the workshop shell/navigation/account controls use `src/app/shared/i18n/ui.de.ts`. Existing login, access-denied and 404 content keeps its English language annotation. Routes keep their original paths, guards and role requirements. Placeholder feature headings are translated to match navigation.

The primary creation action is explicitly disabled with an associated explanation because no frontend creation route exists. KPI cards and urgent repair rows do not pretend to navigate to nonexistent filtered lists or detail pages. Existing sidebar routes remain available.

## Existing backend integration

`DashboardService` uses `ApiService.getResponse()` to call the existing `GET /api/v1/repairs?status=ready_for_pickup&limit=1`. The authoritative, archive-aware total comes from the server's `X-Total-Count`, not from the returned page length. FastAPI already exposes this header through CORS. The existing session interceptor handles trusted API credentials and 401/403 responses unchanged.

The request is bounded to one returned record. The count-only consumer deliberately treats the response body as opaque; it does not hydrate or retain unused repair records. No client-side workflow aggregation is introduced. Repeated refreshes are blocked while loading; leaving the dashboard cancels the request.

Zero is rendered as a real numeric value with the explicit empty message. Missing, malformed or unsafe count headers produce an unavailable state. Transport failures produce a safe error message and retry action; backend details are never rendered. A transient failure never becomes a zero.

## Missing dependencies

The checked backend contains a paginated repair list with a single-status filter and individual expected completion dates, but no workshop-wide dashboard aggregation or priority projection. Consequently:

- Open repairs remain unavailable pending a server-defined aggregate and definition of included statuses.
- Overdue repairs and upcoming deadlines remain unavailable pending backend definitions, time horizon and authoritative filters/counts.
- Urgent repairs remain unavailable pending backend urgency ordering and an appropriate projection of repair, instrument, customer, due date and status. No orders are fabricated or selected using client-invented urgency rules.
- The frontend still has placeholder repair routes. Creation, filtered repair views and repair detail navigation must be implemented before enabling the corresponding actions.

No backend endpoints, schemas or authorization policies were changed. This change does not invent a future endpoint contract. The unavailable urgent state explicitly avoids suggesting that the workshop has no urgent work.

## Changed files

- `src/app/features/dashboard/dashboard.ts` — signal state and bounded refresh lifecycle.
- `src/app/features/dashboard/dashboard.html` — compact operational layout.
- `src/app/features/dashboard/dashboard.scss` — responsive token-based layout.
- `src/app/features/dashboard/dashboard.service.ts` — existing filtered count integration.
- `src/app/features/dashboard/dashboard.service.spec.ts` — authoritative counts, zero and missing/invalid headers.
- `src/app/features/dashboard/dashboard.spec.ts` — dashboard states, retry/refresh, disabled creation and cancellation.
- `src/app/features/dashboard/metric-card.ts` — typed presentation component.
- `src/app/features/dashboard/metric-card.html` — accessible state-specific rendering.
- `src/app/features/dashboard/metric-card.scss` — consistent card treatment.
- `src/app/features/dashboard/metric-card.spec.ts` — loading, unavailable, zero, success and retry.
- `src/app/core/api/api.service.ts` — response-header access through shared transport.
- `src/app/shared/i18n/ui.de.ts` — centralized German interface copy.
- `src/app/shared/ui/page-header.ts` — reusable compact header option.
- `src/app/shared/ui/workspace-header.ts` — German workshop label.
- `src/app/shared/ui/account-controls.ts` — German logout labels and error copy.
- `src/app/shared/ui/account-controls.spec.ts` — translated error assertion.
- `src/app/shared/ui/feature-placeholder.ts` — German placeholder copy.
- `src/app/features/customers/customers.ts` — matching German heading/description.
- `src/app/features/instruments/instruments.ts` — matching German heading/description.
- `src/app/features/repairs/repairs.ts` — matching German heading/description.
- `src/app/app.ts` — German navigation labels and initial page title.
- `src/app/app.html` — German shell text and accessibility labels.
- `src/app/app.routes.ts` — translated titles; paths and access rules preserved.
- `src/app/app.spec.ts` — updated navigation/title assertions and isolated dashboard data.
- `src/app/app.routes.spec.ts` — translated headings; existing route protection regression tests retained.
- `src/app/features/auth/login.ts` — explicit English language annotation.
- `src/app/features/auth/access-denied.ts` — explicit English language annotation.
- `src/app/shared/ui/not-found.ts` — explicit English language annotation.
- `src/index.html` — German document language.
- `DASHBOARD.md` — implementation and dependency notes.

## Verification

Run `npm run lint`, `npm run test:ci` and `npm run build`. Dashboard tests mock HTTP only in test files. Production code contains no operational fixtures. Existing authentication, route protection, session expiration, CSRF and logout tests remain in the suite.

Verification passed: ESLint, all 87 tests and the production build. Safari visual checks used the production bundle on a desktop viewport and at 768×1024 and 1024×768. The temporary loopback-only preview server returned a test identity and a zero-count HTTP fixture; it is separate from production code and was stopped after verification. Menu expansion and responsive card layouts were inspected without visible horizontal overflow. Live FastAPI/CORS verification and GitHub Actions execution remain outstanding. The CSS defines explicit one/two/four-column layouts and no fixed minimum card width. The existing production bundle budgets remain unchanged.
