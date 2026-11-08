# Artelier

Artelier is the independent Angular frontend for the Atelier Management System.
It provides a responsive workshop workspace for customers, instruments, and repairs,
and will integrate with the sibling FastAPI project, `atelier-api`.

This initial application contains navigation and placeholder screens only. It does
not load business records or implement login, authorization, or editing workflows.

## Technology stack

- Angular 22.2.5 (CLI 22.2.6), standalone components, lazy routes, and Signals for local UI state
- Strict TypeScript and Angular template checking
- SCSS, semantic HTML, and responsive layouts without a component library
- Angular HttpClient and RxJS for asynchronous API requests
- Angular Reactive Forms (`@angular/forms`) available for future feature forms
- Angular ESLint and Angular CLI's supported Vitest/jsdom unit test runner
- npm lockfile and GitHub Actions CI

## Prerequisites

Use Node.js **24.15.0** (pinned in `.nvmrc`) and its bundled npm 11.
Angular also supports Node `^22.22.3 || ^24.15.0 || >=26.0.0`.
Node 22.18 and earlier do not satisfy this Angular release's requirements.
With nvm installed, run `nvm install` and `nvm use` from this directory.

Keep the repositories side by side, with separate Git histories:

```text
projects/
├── atelier-api/
└── artelier-web/
```

## Installation

```bash
git clone git@github.com:CH4692/artelier-web.git
cd artelier-web
nvm install
nvm use
npm ci
```

If already cloned, use the existing checkout instead. The Angular workspace is at
the repository root; there is no nested application directory.

## Local development

```bash
npm start
```

Open **http://localhost:3000**. Source changes reload automatically. The development
server proxies `/api/**` to `http://localhost:8000`; start the backend separately
using its own README. The shell works without a running backend.

Use `localhost` for both services. Port 3000 matches the backend's documented
allowed development origins. The proxy preserves the original Origin header so
backend CSRF validation remains effective. If you use another hostname or port,
the backend's operator must explicitly allow that exact frontend origin using its
existing `FRONTEND_ORIGINS` setting. The frontend does not alter backend settings.

## Testing and quality checks

```bash
npm run lint
npm test                 # interactive watch mode
npm run test:ci          # one run, no browser installation required
npm run build            # production configuration
```

Tests cover root redirection, all workspace routes, the wildcard 404, mobile menu
state, and API credentials/CSRF boundaries. CI runs `npm ci`, lint, non-watch tests,
and the production build for pull requests and pushes to `main`.

The initial dependency audit reports 15 moderate findings propagated from a
`minimatch` denial-of-service advisory in ESLint/TypeScript ESLint development
tooling. No compatible automatic fix is offered by npm for this toolchain;
`npm audit --omit=dev` is clean. Recheck upstream lint-tool updates before release.
Avoid force-downgrading the Angular ESLint stack to resolve the audit count.

## Production build and hosting

`npm run build` writes the static application to `dist/artelier-web/browser/`.
Serve these files over HTTPS. Configure the web server to return `index.html` for
frontend paths such as `/customers` and unknown frontend routes; otherwise direct
navigation will return a server 404 before Angular can render its own 404 page.
Route `/api/` to FastAPI **before** applying the SPA fallback. The Angular development
proxy is not part of the production bundle.

The default API URL is `/api/v1`, intended for a same-origin reverse proxy. Preserve
Origin headers, session cookies, and backend response headers through that proxy.
Alternatively configure an explicit HTTPS API origin in the production environment
file before building; configure backend CORS for the exact frontend origin and
credentials. Cross-origin cookie deployments must follow the backend's documented
same-site domain requirements. No live backend integration is claimed by this scaffold.

## FastAPI integration

- `src/environments/environment.ts` is the production build configuration.
- `environment.development.ts` replaces it in development builds.
- `API_BASE_URL` exposes the environment URL as an injectable token.
- `core/api/api.service.ts` is a small shared read transport. Feature services will
  own endpoint methods and return typed RxJS Observables. Add write operations only
  when their feature contracts are implemented.
- `core/api/generated/` reserves a home for types generated from a reviewed FastAPI
  OpenAPI schema. Development exposes `/openapi.json`; production disables that URL.
  Obtain/export the schema through the backend's supported tooling, then select and
  pin a generator when feature integration begins. No fabricated types are included.
- `core/auth/` is the boundary for future session services. No authentication
  mechanism is introduced.

The backend owns HttpOnly session cookies and CSRF protection. The scoped HTTP
interceptor sets `withCredentials: true` for the configured API and adds
`X-CSRF-Protection: 1` to unsafe methods. This is the backend's custom-header
strategy, not Angular's default token-cookie XSRF scheme. Do not read session
cookies from JavaScript or store authentication tokens in localStorage/sessionStorage.
Other origins and paths outside the configured API prefix are left untouched.

Future forms should import `ReactiveFormsModule` within their standalone feature
components. Keep local UI state in Signals; use RxJS for asynchronous request streams.
Do not add global state libraries until a concrete requirement warrants them.

## Project structure

```text
.github/workflows/ci.yml
src/
├── app/
│   ├── core/
│   │   ├── api/generated/       # Future OpenAPI types
│   │   ├── auth/               # Future session services
│   │   └── interceptors/       # Scoped session and CSRF handling
│   ├── shared/ui/              # Reusable placeholder and 404
│   ├── features/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── instruments/
│   │   └── repairs/
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.ts                  # Responsive application shell
├── environments/
└── styles.scss
proxy.conf.json
```

The backend is a separate repository and is not modified by frontend tooling.
