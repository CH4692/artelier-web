# Instrument management

Standalone Angular routes `/instruments`, `/instruments/new`, `/instruments/:id` and `/instruments/:id/edit` use the existing session guard for workshop admins and employees. Safe return URLs preserve protected deep links through login. FastAPI remains authoritative for permissions and validation.

## API and ownership

`InstrumentsService` centralizes existing list, read, create, patch, history and QR requests through `ApiService`. Request/response interfaces mirror the checked FastAPI schemas; the instrument read type reuses the customer feature's existing schema. No backend endpoints, dependencies or generated-client tooling were added.

The list uses server filtering, sorting and offset pagination (25 records). Search is debounced by 300ms and searches identification numbers only, matching the backend. Type, ownership and archive filters are separate. URL state supports history navigation; searches are therefore visible in browser history. `X-Total-Count` supplies totals; absent totals stay unknown, with a full page allowing the next page. Superseded reads are canceled.

Only instrument type is required. Optional year must be an integer from 1 to 9999; measurements must be finite and positive. Bows have bow weight, other types have body length. Switching type explicitly clears the incompatible measurement. Workshop and unassigned ownership explicitly clear customer ID in PATCH requests. Customer ownership may have no known customer, as permitted by the backend. Identification numbers are not assumed unique, and no unsupported model field is invented.

The reusable customer selector searches and paginates existing customers, labels archived records, resolves a selected customer independently and changes association only on explicit selection. Failed reads preserve the existing association. Selection returns focus to the search button.

## Details, history and QR

Details display instrument metadata and independently resolve the customer name and link. A customer lookup failure does not hide the instrument. The list links customer IDs without issuing a request for every row.

History uses `GET /instruments/{id}/history` with 25-record pagination and preserves backend ordering by execution date and ID. Status, description, available dates and archived state are rendered. Missing dates are explicit. Repair detail routes do not yet exist, so links are not invented.

QR download uses the authenticated existing `GET /instruments/{id}/qr-code.svg` endpoint as a Blob, without injecting SVG markup into the page. Temporary object URLs are revoked. The existing stable public UUID and `/i/{uuid}` scan flow remain unchanged. The backend must configure `PUBLIC_QR_BASE_URL`; unavailable QR generation displays a safe retry/configuration message.

## Security and asynchronous states

The existing trusted-API interceptor supplies HttpOnly-cookie credentials and CSRF headers for writes. No customer, instrument or token cache is persisted in browser storage. Duplicate writes are blocked, pending forms are disabled, and failed writes retain inputs. Known 422 field locations map to fixed German messages; raw backend messages and echoed values are never rendered. Existing authentication handling covers session expiry and forbidden access, with safe messages for 404, 409 and server failures.

Signals hold local state, RxJS cancels stale and dependent reads, and route changes cancel pending component requests. Loading, empty, retry, not-found and one-time success states are explicit. Native labels, fieldsets, headings, tables, status messages and shared focus/control styles support keyboard access. Responsive grids wrap content; narrow-screen table scrolling stays inside a labeled focusable region.

## Verification

`npm run lint`, `npm run test:ci` (183 tests across 25 files) and `npm run build` passed locally. Tests cover transport/CSRF, errors, search/debounce/cancellation/pagination, validation, create/edit, explicit ownership and measurement clearing, retained inputs, customer selection, details/history, unknown IDs and protected deep links.

Safari checks used the production bundle and a separate temporary loopback server with in-memory test records. Creation, customer assignment, selection focus, editing, ownership changes, detail/history rendering and unavailable QR handling were checked. List and detail layouts were visually checked at desktop width 1440 and tablet 768×1024. The temporary tab and server were closed; fixtures are not shipped in application code.

Live FastAPI/database/CORS integration and GitHub Actions remain unverified by these local checks. No production data or backend files were changed.
