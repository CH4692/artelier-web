# Workshop dashboard

The existing standalone `/dashboard` route remains protected for authenticated employees and administrators. It uses the existing workshop design tokens, reusable metric cards, a dedicated pickup widget and reusable capability-unavailable panels. No backend files, dependencies, routes or workflow states were added.

## Supported business data

`DashboardService` centralizes typed reads through `ApiService`:

- The pickup summary uses `GET /repairs?status=ready_for_pickup&limit=1`. Its value comes exclusively from `X-Total-Count`, never from the page length. A confirmed zero is empty; a missing, invalid or unsafe total is unknown.
- The independent pickup list uses `GET /repairs?status=ready_for_pickup&offset=0&limit=5&include_archived=false`. It preserves the server's ID ordering and explicitly describes itself as a five-record preview, with navigation to the full filtered repair list.
- Optional customer and instrument names use the existing read endpoints, deduplicated by ID within this bounded preview. Orders render before related lookups complete. Individual lookup failures preserve order/customer/instrument links with ID fallbacks and clear unavailable messages. Unknown historical customer attribution stays unknown. Internal repair notes are not displayed on the dashboard.

Status labels reuse the repair feature's backend enum vocabulary. Repair links open `/repairs/:id`; related links open existing customer/instrument detail routes. Summary links preserve `view=open` and the pickup status where appropriate. The create action opens repair intake. Dates consistently use `dd.MM.yyyy` and local timestamp formatting `dd.MM.yyyy HH:mm`.

## Missing backend capabilities

The checked repair API supports one exact status, customer ID, archive visibility and offset pagination ordered by ID. It does not expose an open-order aggregate, an overdue flag/filter/aggregate, a deadline window/filter, or deadline/urgency sorting. There is no dedicated dashboard response. The task explicitly leaves aggregation and business rules in FastAPI, so Angular does not sum independently selected statuses, download the full dataset, sort one partial page as if globally urgent, or invent a timezone/deadline cutoff.

Consequently, the open count, overdue count/list and upcoming deadline count/list are explicitly unavailable. Their UI does not display zero or suggest that no urgent work exists. Dedicated overdue and upcoming panels explain the gap and link to manual review in open orders. No fabricated due dates, overdue badges, urgency ranking or unsupported query parameters are introduced.

To fully enable these panels, the backend needs authoritative definitions and queries for open totals, overdue classification and deadline ordering/window, including archive policy, date timezone/cutoff, pagination/totals and stable ties. Existing per-order expected completion dates can be shown as dates but do not provide a complete globally ordered deadline overview. These capabilities are documented rather than new endpoints being assumed.

## State, refresh and security

Summary and list have independent loading/error/empty states. A summary failure does not hide a successful list, and a list failure does not remove a confirmed summary. Previously confirmed summary values remain labeled “Letzter Stand” during refresh/failure or an unreliable total response. Failed list refreshes clear the old list and display an error, without presenting stale entries or a stale empty result as newly loaded.

Opening/re-entering the dashboard requests fresh data, including after edits elsewhere. Each widget has a stable manual refresh button; the page refresh action reloads both. A pending summary read ignores duplicates. The list cancels superseded refreshes and related reads with RxJS switchMap, and all component requests cancel on destruction. Signals hold only local UI state; there is no persisted customer cache or global state library. Separate count/list requests may observe different concurrent commits and do not claim to be an atomic snapshot.

Existing HttpOnly-cookie credentials, trusted API interception, session expiry and role protection are preserved. The dashboard only performs GET requests and introduces no mutation or new CSRF behavior. Safe fixed error copy handles HTTP failures without rendering raw server details. Unauthorized routes never mount data widgets.

Headings, native buttons, links, description lists and status messages provide semantic navigation. Unavailable warnings have text and icons in addition to color. Cards and actions wrap across desktop/laptop/tablet widths; related names and descriptions wrap without forcing page overflow. The full list remains available beyond the bounded preview.

## Verification

`npm run lint`, `npm run test:ci` (243 tests across 31 files) and `npm run build` pass locally. Tests cover authoritative pickup totals, invalid/missing totals, display/navigation/date formatting, real empty states, safe HTTP errors, independent failures, retained stale summary labels, deduplicated name reads, missing related data, refresh/cancellation/focus, and signed-out/customer-role dashboard access. Existing application, repair, customer and instrument tests remain included. Missing overdue/open/deadline aggregates are tested as unavailable states rather than invented business data or urgency calculations.

Safari checks used the production bundle with a separate temporary loopback server containing only in-memory test records. Desktop and 768×1024 tablet layouts, pickup metadata, manual page refresh, repair-detail navigation and returning to the dashboard were checked. The temporary preview tab and server were closed; test records are not shipped in application code and no production data was changed.

Live FastAPI/database/CORS integration and GitHub Actions were not run. The current frontend CI uses the same lint/test/build checks on pull requests and main pushes; remote verification requires publishing this version.
