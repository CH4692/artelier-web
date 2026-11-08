# Customer management

This standalone Angular feature reuses FastAPI's customer contracts without backend changes. Interface copy is German; API models and implementation identifiers remain English.

## Routes and permissions

- `/customers`: searchable, paginated customer list.
- `/customers/new`: create a customer.
- `/customers/:id`: customer overview and assigned instruments.
- `/customers/:id/edit`: edit an existing customer, including archived records.

Each route uses the existing session guard and allows workshop `admin` and `employee` roles. FastAPI remains the permission authority. The internal return-URL allowlist includes the new routes so login can resume a protected deep link. Invalid or unsafe IDs produce a not-found state rather than an unbounded API path.

## Existing API contracts

`CustomersService` uses shared `ApiService` transport:

- `GET /customers?q=&offset=&limit=&include_archived=` reuses server substring search, pagination and archive filtering. Page size is 25, within the backend maximum of 200. `X-Total-Count` is authoritative; an absent/invalid header remains unknown rather than being inferred from one page. Without a total, a full page permits trying the next page.
- `POST /customers` accepts names plus optional email and phone.
- `GET /customers/{id}` loads the edit form.
- `PATCH /customers/{id}` submits the customer contact fields; blank contacts become null.
- `GET /customers/{id}/overview?include_archived=true` returns the customer and currently assigned instruments, including archived instruments with explicit labels.
- `PATCH /customers/{id}/archive` sends `{ is_archived: true }` after confirmation. No DELETE request or permanent deletion action is implemented.

Paths are relative to the existing configured API base. The existing interceptor supplies credentials and CSRF protection for mutations only inside its trusted API boundary. No credentials, customer cache or session tokens are persisted in browser storage. Customer search/filter state uses query parameters and is consequently visible in browser history; do not log these URLs or use real customer data in screenshots.

The TypeScript interfaces mirror the checked FastAPI `CustomerRead`, `CustomerCreate`, partial `CustomerUpdate`, `CustomerOverview` and `InstrumentRead` schemas. The repository currently has no generated client; no generated artifacts or new generator dependency were introduced.

## Behavior and asynchronous state

List, editor and detail components own local signal state. Search is debounced by 300ms. URL changes and retry use RxJS switchMap to cancel superseded reads. Duplicate query navigation is suppressed by comparing the current URL term, so restored history does not suppress re-entering a prior search. Archive filtering and paging preserve the search term. Active lists exclude archived customers by default.

The same Reactive Form serves creation and editing. Names are trimmed and required, with a 100-code-point limit matching Pydantic. Email is optional, trimmed and limited to 254 characters; Angular checks its basic syntax while FastAPI remains authoritative for email normalization and validation. Phone is optional, accepts the existing formatting characters, enforces the raw 64-character limit and validates 3–15 digits with the existing optional international prefix rules. The backend performs final phone normalization. No address, consent or other unsupported fields are invented.

Submissions preserve entered data on errors and disable duplicates while pending. Field-specific 422 locations are mapped to fixed German messages; raw backend messages and submitted values in validation responses are never displayed. Other 401/403/404/409/server errors receive safe messages, with session expiry/permission navigation remaining the existing interceptor's responsibility. Reads distinguish loading, empty, not found and failure.

After successful create/update, navigation opens the detail route with a one-time confirmation and a fresh overview request. Re-entering the list always loads its current server state. Edit requests are canceled when the route ID changes; confirmations are cleared when the detail component is reused for another customer. There is no speculative global cache or optimistic mutation.

## Archive confirmation and accessibility

`ArchiveCustomer` is a reusable presentation/action component. Its native modal dialog explains that data and associations remain intact. Cancel receives initial focus; escape and cancellation are blocked only while the confirmed request is pending. Failed archive attempts keep the dialog open, retain the record state and permit retry. Only the successful response updates the parent; the archived view removes the redundant archive action and focuses the success message. The endpoint supports restoring archive state, but a restore workflow is outside this task.

Labels, associated form errors, live status/error messages, semantic tables/headings, native buttons and inherited visible focus styles support keyboard and screen-reader access. Primary controls use the existing 44px minimum control height. The checkbox has a clickable label. Tables wrap long contacts; on small screens any horizontal scrolling is confined to a labeled keyboard-focusable region. Forms and contact/instrument metadata use responsive grids and existing semantic design tokens. Instrument detail links are not invented because that frontend route does not exist yet.

## Verification

Commands: `npm run lint`, `npm run test:ci`, `npm run build`.

Tests cover service contracts and CSRF/credentials, list search/debounce/history/pagination/cancellation, loading/empty/error states, required and normalized fields, Unicode name lengths, create/edit submission, safe 422 mapping, failed-input preservation, archive confirmation/cancellation/failure/success, detail/instrument rendering, not-found behavior and role-protected deep links. Existing shell/authentication tests are retained with feature requests explicitly accounted for.

Safari visual checks used the production bundle on desktop and at 768×1024 and 1024×768. A separate temporary loopback server held only in-memory test records. Creating, editing, confirming archive, checking the active list and including archived customers were verified there. The native dialog visibly focused Cancel; the archived detail retained its data. That preview was closed and stopped; no operational fixtures are shipped in production code.

Live FastAPI/database/CORS verification and GitHub Actions have not been run as part of this local implementation. No backend files were changed and no production customer mutations were performed.
