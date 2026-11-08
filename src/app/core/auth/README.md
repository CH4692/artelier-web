# Server-side session authentication

`AuthService` uses the existing FastAPI contracts, without backend changes:

- `POST /api/v1/auth/login` accepts `{ email, password }` and returns `UserRead`.
- `GET /api/v1/auth/me` validates the current session and returns `UserRead`.
- `POST /api/v1/auth/logout` revokes the session and returns 204, including when already absent.

`SessionState` holds only account metadata in memory, with loading, authenticated and unauthenticated signal states. On initial guarded navigation, concurrent guards share one `/me` request. A 401 means signed out; connectivity and server errors fail closed with a separate session-check error message. Responses from an older state revision cannot overwrite a newer login or logout. Reloading the application always requires a fresh server validation. No cookie inspection, JWT, localStorage or sessionStorage is used.

## Routing and permissions

The login page is public and validates email/password with Reactive Forms. Passwords are masked, cleared after each request and on component destruction, and never logged or persisted. A pending submission disables duplicate login requests. Failures use fixed messages and preserve the email.

`authGuard` waits for restoration, returns a login UrlTree for unauthenticated users, and checks optional `data.roles`. Workshop routes allow `admin` and `employee`; `customer` accounts can view access denied and sign out. `loginGuard` redirects authenticated users away from login. The return URL helper allowlists known internal workshop routes, preserving query parameters and fragments while preventing external redirects or login loops. Add future resumable routes to this allowlist.

Guards are navigation conveniences. FastAPI remains the authorization authority and revalidates account state, session expiration and roles on protected API requests. No client-side role mapping replaces backend enforcement.

## HTTP and deployment

The functional `apiSessionInterceptor` adds `withCredentials: true` only inside the exact configured API origin and path boundary. Writes include `X-CSRF-Protection: 1`; safe reads do not. Browser-generated Origin headers are not synthesized or overridden. Keep `API_BASE_URL` a trusted deployment setting. Outside-boundary requests are left unchanged; callers must never manually attach credentials to arbitrary external URLs.

Production must serve the frontend and API over HTTPS. Preserve FastAPI's HttpOnly, Secure, SameSite=Lax and `__Host-` cookie configuration. Cross-origin deployments require an exact backend `frontend_origins`/CORS allowlist with credentials enabled and a compatible same-site deployment; arbitrary cross-site cookie support is not implied. The development proxy keeps the frontend Origin (`changeOrigin: false`); configure that Origin in FastAPI. Angular never reads or renames the cookie. Deployments must route frontend deep links to `index.html`.

The interceptor clears authenticated state on protected API 401 responses and redirects once to login with a session-expired message. A 403 keeps the session and redirects to access denied. Concurrent redirects are coalesced. Old request failures cannot invalidate a newer session. Auth endpoints handle their own failures and never trigger redirects; explicitly public API requests may set `SKIP_AUTH_REDIRECT`. Other failures propagate for safe feature-level handling without global notifications or retries.

Sign out is available in the workshop header and access-denied view. State is cleared and login shown only after the server confirms logout. Failed logout displays an explicit warning that the server session may still be active and permits retry.

## Verification

Run `npm run lint`, `npm run test:ci` and `npm run build`, matching the existing GitHub Actions workflow. Tests cover Reactive Forms, loading and errors, session restoration, roles, safe redirects, concurrent and stale responses, logout failures, credential/CSRF boundaries and protected routing. Verify an HTTPS deployment with a test account for browser cookie flags, configured Origin/CORS, page reload, keyboard use, idle/absolute expiry and logout followed by browser Back. Unit HTTP tests do not prove live deployment cookie or CORS configuration.
