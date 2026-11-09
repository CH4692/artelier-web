# Responsive workshop UI and signature capture

## Layout and interaction

The shell uses a mobile-first grid. Below 1100px, existing accessible menu controls reveal navigation; desktop keeps the sidebar visible. Shared page/panel gutter tokens scale with available width. Headers, actions and navigation wrap long values. Customer/instrument forms use intrinsic grid columns and collapse when each field can no longer fit. Main content stays in document flow so forms can scroll when a viewport becomes shorter.

Buttons, links and text/select/date controls have at least 44px targets; native checkboxes retain their browser appearance inside labelled controls. Hover decoration is restricted to hover-capable devices, with active and visible keyboard-focus feedback. Inputs use 16px text to avoid tablet input zoom. Touch manipulation preserves normal panning and pinch zoom.

Customer, instrument and repair tables preserve semantic headers in named, focusable horizontal scroll regions. Scrolling is contained to the table, without hiding page overflow. Archive dialogs keep actions outside the scrollable content body, including short viewports. No API, role, reactive-form validation or routing rules changed.

The reusable signature component and its explicit missing-backend dependency are documented in [its README](../src/app/shared/ui/signature-capture/README.md). It is available to future authorized workflows; no production signature screen or submission is advertised before the backend contract exists.

## Validation and limits

Responsive tests cover desktop 1440×1000, laptop 1280×800, portrait 768×1024, landscape 1024×768, short forms/dialogs, long content, target sizes and keyboard table scrolling. Signature tests cover three engines and three orientations, DPR 1/2, real canvas pixels, resize, empty/clear/redraw, pointer capture, actual browser-dispatched pen pressure and supported touchscreen emulation. Existing real-backend tests continue checking authentication, CSRF and customer/instrument/repair operations.

Viewport reduction approximates on-screen keyboard obstruction; it is not a physical keyboard test. Browser-dispatched touch/pen input is not certification of iPadOS, Android or hardware stylus behavior. Focus/semantic tests support accessibility, but no formal WCAG certification or complete assistive-technology audit is claimed. An approved alternative signing process remains a feature/backend dependency. GitHub Actions now includes signature coverage; its remote status can only be established after pushing.

## Verified local run — 2026-11-08

- `npm run lint`, `npm run e2e:typecheck`, `npm run e2e:lint`: passed.
- `npm run test:ci`: 249 tests passed across 32 files.
- Production Angular build: passed through the UI and real-backend runners.
- `npm run e2e:ui`: 186 passed across six browser/viewport projects.
- `npm run e2e:integration`: 126 passed against the real backend and a fresh disposable PostgreSQL cluster; backend contract commit `3495621f880b666c0e716bf00b63995c1a44e0aa`.
- `npm run e2e:signature`: 55 passed across nine browser/orientation projects, including its separate production-mode host build.

All three browser reports recorded zero skips, failures or flaky tests. The backend checkout remains unchanged. GitHub Actions configuration was extended; no remote CI run is claimed for these unpushed changes.
