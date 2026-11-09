# Signature capture

`SignatureCapture` is a standalone shared UI component. It captures a temporary drawing using Pointer Events and Canvas, without HTTP requests, browser storage, files or dependencies. It is not currently placed in a production workflow.

## Consumer interface

- `inputId`: required unique ID prefix for accessible descriptions.
- `label`: visible legend and canvas accessible name.
- `alternativeInstructions`: required text describing the consumer's actual alternative process.
- `disabled`: prevents editing and actions; cancels an unfinished stroke.
- `confirmed`: emits a copied `SignatureDraft`, containing normalized x/y coordinates in [0,1] and pressure per stroke. This is an internal UI draft, **not an API payload or an electronic-signature standard**.
- `invalidated`: emitted on clear or a new stroke. Consumers must discard previously confirmed drafts.
- `alternativeRequested`: keyboard-accessible handoff to the consumer. The consumer must implement the approved alternative, provide appropriate focus management and explain its availability.

Confirmation rejects an empty drawing and waits for pointer release. Clear supports redraw. Cancelled pointers discard only the incomplete stroke. Pointer capture allows drawing to the boundary; coordinates are clamped. Resize/DPR redraw preserves normalized positions. `touch-action: none` applies only to the canvas; the rest of the page scrolls normally. Native action buttons and explanatory text provide keyboard access to confirmation, clearing and requesting an alternative; freehand drawing itself requires a pointing device.

Consumers own business validation, authentication, CSRF, authorization, retention and submission errors. Keep a draft in memory only and discard it on cancellation/navigation. A drawn mark is not evidence of identity or a legally compliant signature on its own.

## Missing backend dependency

The checked backend exposes `EstimateApproval` in `atelier-api/src/atelier_api/estimates/schemas.py` with only `approved_at`, `approval_method` and `approval_reference`. `atelier-api/docs/repair-estimates.md` and the approval router explicitly describe staff attestation, not capture of an electronic signature. No signature payload/storage contract exists.

Consequently no adapter, endpoint, upload workaround or separate storage is invented. `SignatureDraft` must not be passed to estimate approval or document uploads. Before production integration, the backend must define an authorized signing workflow, accepted representation, validation/limits, evidence/retention rules and a supported non-drawing alternative. Then a feature-level adapter can use the existing authenticated, CSRF-protected API client and map server errors while preserving the draft. This shared component must remain independent of those business rules.

## Verification

Six unit tests cover empty validation, pointer coordinates, cancellation, clear/invalidation, resize and disabling. `npm run e2e:signature` builds a separate test host and checks real canvas pixels, mouse/touch/pen input, pressure, capture, DPR, resizing, keyboard alternatives and absence of network/storage writes. See `e2e/README.md` for browser capability limits.
