# Workshop dashboard refinement

## Behavior

The dashboard uses the existing walnut, ivory and brass tokens and shared standalone UI components. The compact German header and four KPI cards replace the promotional welcome area and redundant navigation cards. The KPI grid has one column on small screens, two from 560px and four from 1200px. Card typography, borders, spacing and surface treatments reuse the design system. Refresh and retry are native buttons with 44px minimum touch targets and inherited focus styling. Count updates use a polite live region; state labels remain visible without relying on color. A static loading skeleton respects reduced-motion preferences without requiring animation.

All dashboard copy and the workshop shell/navigation/account controls use `src/app/shared/i18n/ui.de.ts`. Existing login, access-denied and 404 content keeps its English language annotation. Routes keep their original paths, guards and role requirements. Placeholder feature headings are translated to match navigation.

The primary creation action is explicitly disabled with an associated explanation because no frontend creation route exists. KPI cards and urgent repair rows do not pretend to navigate to nonexistent filtered lists or detail pages. Existing sidebar routes remain available.

## Existing backend integration

`DashboardService` uses `ApiService.getResponse()` to call the existing `GET /api/v1/repairs?status=ready_for_pickup&limit=1`. The authoritative, archive-aware total comes from the server's `X-Total-Count`, not from the returned page length. FastAPI already exposes this header through CORS. The existing session interceptor handles trusted API credentials and 401/403 responses unchanged.

The request is bounded to one returned record. The count-only consumer deliberately treats the response body as opaque; it does not hydrate or retain unused repair records. No client-side workflow aggregation is introduced. Repeated refreshes are blocked while loading; leaving the dashboard cancels the request.

Zero is rendered as a real numeric value with the explicit empty message. Missing, malformed or unsafe count headers produce an unavailable state. Transport failures produce a safe error message and retry action; backend details are never rendered. During refresh, errors or invalid count headers, the last confirmed value is retained and explicitly labeled “Letzter Stand”. A stale zero never uses the current-empty message. The first failed request shows no numeric value. A transient failure never becomes a zero.

## Missing dependencies

The checked backend contains a paginated repair list with a single-status filter and individual expected completion dates, but no workshop-wide dashboard aggregation or priority projection. Consequently:

- Open repairs remain unavailable pending a server-defined aggregate and definition of included statuses.
- Overdue repairs and upcoming deadlines remain unavailable pending backend definitions, time horizon and authoritative filters/counts.
- Urgent repairs remain unavailable pending backend urgency ordering and an appropriate projection of repair, instrument, customer, due date and status. No orders are fabricated or selected using client-invented urgency rules.
- The frontend still has placeholder repair routes. Creation, filtered repair views and repair detail navigation must be implemented before enabling the corresponding actions.

No backend endpoints, schemas or authorization policies were changed. This change does not invent a future endpoint contract. The unavailable urgent state explicitly avoids suggesting that the workshop has no urgent work.

## Initial implementation files

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

## Focused UI/UX polish

KPI cards now have smaller padding and shorter state copy, inline number/unit/status treatment and equal responsive grid rows. A zero uses its accurate empty message without a pickup badge. The refresh button lives inside the pickup card, has the accessible name “Abholzahl aktualisieren”, announces busy state and is disabled while loading. Error states offer one scoped retry action. Projected action content keeps the presentation component independent of the transport and leaves room for a future unified refresh without introducing polling.

The unavailable creation button uses a subdued outline and the associated “In Vorbereitung” label. It remains natively disabled and has no invented route. The urgent section drops decorative numbering, reduces padding and explicitly states that urgency cannot currently be determined. The sidebar section label increases from 10px to the existing 12px typography token. Existing navigation, branding, authentication, routes and API behavior remain intact.

Files changed in this polish:

- `src/app/features/dashboard/dashboard.html`, `dashboard.scss`, `dashboard.ts` — compact layout, scoped refresh and preservation of previous values.
- `src/app/features/dashboard/dashboard.service.ts` — typed last-known value support; existing endpoint unchanged.
- `src/app/features/dashboard/dashboard.spec.ts` — refresh errors, retained zeros, invalid responses and unavailable actions.
- `src/app/features/dashboard/metric-card.html`, `metric-card.scss`, `metric-card.ts`, `metric-card.spec.ts` — concise accessible rendering and previous-value states.
- `src/app/shared/i18n/ui.de.ts` — concise German copy and singular count unit.
- `src/app/app.scss` — readable sidebar section label.
- `DASHBOARD.md` — behavior, missing capabilities and verification evidence.

Missing backend capabilities remain those documented above: authoritative open totals, overdue/upcoming aggregates and server-ranked urgent repair projections. The current frontend creation/detail/filter routes remain unavailable. No backend contract, fake repair records or client urgency rules were introduced.

## Verification

Run `npm run lint`, `npm run test:ci` and `npm run build`. Dashboard tests mock HTTP only in test files. Production code contains no operational fixtures. Existing authentication, route protection, session expiration, CSRF and logout tests remain in the suite.

Verification passed: ESLint, all 95 tests and the production build. Safari visual checks used the production bundle on a desktop viewport and at 768×1024 and 1024×768. The temporary loopback-only preview server returned a test identity and a zero-count HTTP fixture; it is separate from production code and was stopped after verification. Menu expansion and responsive card layouts were inspected without visible horizontal overflow. Live FastAPI/CORS verification and GitHub Actions execution remain outstanding. The CSS defines explicit one/two/four-column layouts and no fixed minimum card width. The existing production bundle budgets remain unchanged.

The polish was checked in Safari on desktop, at 1366×768 (laptop), 1024×768 and 768×1024 (tablet). The separate temporary HTTP preview verified a successful count, a failed refresh retaining that count, and a successful retry. It was stopped afterward. No operational fixtures are shipped in the production app. The final tests passed (95 tests across 14 files); ESLint and the production build also passed.

Calculated contrast checks: primary text/surface 14.14:1, muted text/surface 5.72:1, muted text/background 5.12:1, muted text/muted surface 4.70:1, sidebar text/primary 8.52:1, sidebar text/active surface 6.41:1, control border/surface 4.02:1, focus/surface 6.43:1 and sidebar accent/active surface 3.47:1. Native refresh/retry controls retain the existing 44px minimum height and visible focus styles. Live-region and keyboard-navigation regressions remain covered by the tests; this is not a complete WCAG conformance audit. GitHub Actions execution has not been verified for these uncommitted changes.

## Follow-up accessibility verification

The existing polish was reused rather than reimplemented. The pickup refresh action now remains the same native button through loading, failure, retry and recovery. Updating its text and accessible name instead of destroying/recreating it preserves keyboard focus. The presentation card exposes `showRetry` so a parent-owned persistent action does not duplicate its fallback retry button. A regression test asserts DOM identity, accessible names, duplicate-action prevention and focus preservation across the full sequence.

New changes in this follow-up are limited to `dashboard.html`, `dashboard.spec.ts`, `metric-card.html`, `metric-card.ts` and this document. Production requests, session handling, routes and backend rules are unchanged. The urgent list remains unavailable until the previously documented server priority projection and frontend detail routes exist; no mock records or speculative API contract were added.

The current production build was visually checked in Safari at the requested 1440px, 1280px, 1024px and 768px viewport widths. Cards and controls remained readable without visible horizontal page overflow. The tablet disclosure menu expanded correctly. A separate local HTTP fixture verified refresh failure retaining the last real count and successful retry on the same control; that preview was stopped and is not shipped. ESLint, all 95 tests and the production build passed. Live backend verification and a full WCAG conformance audit are not implied by these checks.
