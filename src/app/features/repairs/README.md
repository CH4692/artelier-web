# Repair order management

Standalone routes `/repairs`, `/repairs/new`, `/repairs/:id` and `/repairs/:id/edit` require the existing authenticated admin/employee role. Safe login return URLs include the new deep links. FastAPI remains authoritative for authorization, references and status transitions.

## Existing API integration

`RepairsService` uses the shared typed `ApiService` transport:

- `GET /repairs` supports exact status, customer ID, archive visibility and offset/limit (25). The backend orders by ID; no unsupported free-text query or sort parameter is sent. `X-Total-Count` is authoritative; missing totals stay unknown.
- `GET /repairs/{id}` loads order details, including available document metadata. This task does not add document upload/download, estimates, line items or templates.
- `POST /repairs` supplies an existing customer ID, instrument ID, description and optional completion date/internal notes. The normal intake flow leaves accepted time and initial status to backend defaults; it does not fabricate work execution dates.
- `PATCH /repairs/{id}` submits only description, expected completion date and internal notes. Null explicitly clears the nullable fields. Intake customer/instrument references remain unchanged.
- `PATCH /repairs/{id}/status` submits only the requested status. The confirmed response supplies current state and its server timestamp.

Read types reuse the instrument history's existing repair schema. The checked backend schemas and local documentation are the contract source; no generated client or dependencies were added. No backend files or endpoints changed.

## Open and completed views

Open orders comprise accepted, awaiting approval, in progress, awaiting materials and ready for pickup. The completed view includes completed and cancelled orders. Each status has its own paginated server query, so filtering never hides records from an already paginated mixed-status response. The default open view makes five bounded queries, the completed view two; an exact-status filter makes one. Pages reset when section filters change. Customer filtering reuses the existing searchable customer selector. Query parameters preserve view, exact status, customer and archive filters through browser navigation. Invalid filters display a reset action.

Lists link customer and instrument IDs without issuing a lookup for every row. Detail pages independently resolve customer names and instrument information; failed related reads leave the repair accessible with an explicit retry. Unknown historical customer attribution remains unknown. Archived repairs retain detail access.

## Dependent forms and workflow

The shared create/edit Reactive Form requires a trimmed, nonblank description of at most 10,000 Unicode code points. Notes allow at most 10,000 code points. Optional dates validate real calendar dates in years 1–9999. IDs must be positive safe integers.

Creation reuses `CustomerSelect` and adds a searchable instrument selector using `GET /instruments?customer_id=...&q=...`. The instrument search covers identification numbers and includes clearly labeled archived records. Changing/removing the customer clears the instrument immediately. RxJS cancels superseded searches and old-customer requests; text queries debounce by 300ms. Selection is explicit and returns focus to the trigger. Failed lookups retain selected references. The backend also permits intake customers who are not current owners; the requested UI intentionally offers currently assigned instruments without changing ownership.

The API exposes status values but no per-order allowed-transition metadata. The UI therefore presents requested target states with an explanation that the server validates the transition. It does not maintain a second transition graph or claim all targets are permitted. Invalid transitions receive safe 409 feedback and a reload action. Writes are never optimistic: current status/timestamp and success messages change only after a successful response. The current-status link opens the corresponding open/completed view, which requests fresh server data. Terminal-state reopening remains enforced by FastAPI.

Pending writes disable forms and duplicate submission. Failures preserve unsaved values; known 422 locations map to fixed German field messages without rendering raw backend text or echoed data. Existing credentials/HttpOnly session cookies, CSRF interceptor and 401/403 handling are reused. Nothing is cached in browser storage. Filter URLs can contain customer IDs and should not be logged with operational data.

Signals hold local state, and RxJS handles read cancellation, related lookups and retries. Route changes cancel pending requests; a keyed status component prevents one order's write response from changing another order. Create/update confirmations are one-time navigation state. Native labels, fieldsets, headings, status messages, inherited focus styles and semantic tables support keyboard use. Tables wrap text and confine narrow-screen overflow to a labeled focusable region.

The instrument repair history now links to repair details, and the dashboard create action opens the intake form.

## Verification

Local `npm run lint`, `npm run test:ci` (229 tests across 30 files) and `npm run build` pass. Coverage includes filters/pagination, all open/closed groups, restored dropdown selection, required/Unicode/date validation, intake/edit payloads, retained inputs, safe errors, reference clearing, debouncing/cancellation, protected routes, unknown orders, independent related failures, confirmed/rejected status changes and refreshed completed views. A status test dispatches the actual form submit event to cover its Angular form binding.

Safari checks used the production bundle with separate temporary loopback endpoints and in-memory test records. Creation, changing customer/instrument selection, editing, ready-for-pickup to completed, rejected reopening and the completed list were exercised. Desktop and 768×1024 tablet list/form layouts were inspected. The preview tab and server were closed; no preview fixtures ship in production code and no operational data was changed.

Live FastAPI/database/CORS integration and GitHub Actions have not been verified. The existing CI runs the same lint/test/build commands on pull requests and main pushes; feature-branch changes need publication before remote CI can validate this version.
