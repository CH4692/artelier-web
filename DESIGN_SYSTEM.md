# Artelier design system

The visual identity uses walnut, antique brass, ivory and forest green, with a typographic Artelier wordmark. The supplied workshop website could not be retrieved during implementation. No workshop logo, font assets or unverified brand claims are included.

## Tokens

`src/styles/_tokens.scss` is the single source for colors, typography, spacing, radii, shadows and layout dimensions. It is loaded by `src/styles.scss`. Components consume semantic CSS properties (`var(--color-text)`, `var(--space-4)`) rather than palette literals. Global custom properties also work in Angular's encapsulated styles.

Walnut is primary; forest green is secondary; ivory is the page background. Antique brass is decorative, never small text on ivory. Use the darker `--color-accent-text` for readable links and labels. `--color-control-border` provides a stronger boundary for inputs. Each status has a foreground and tinted surface. Status must always include meaningful text; urgent labels additionally include an exclamation mark.

System serif fonts serve the brand and large headings; locally available sans-serif fonts serve application content. No remote font requests are required. Font sizes, weights and line heights are centralized. Spacing follows a 4px base; controls have a 44px minimum height.

## Components and conventions

Reuse `.panel`, `.button`, semantic native buttons, labeled native form controls and native `dialog` elements. Form errors use `aria-invalid`, an associated `.field-error` message and `aria-describedby`. Loading buttons use `aria-busy`, a readable loading label and `disabled` when duplicate submission must be prevented. Disabled links require callers to suppress navigation; prefer native disabled buttons for actions.

Use standalone `StatusBadge` with `tone="success|warning|error|info"` and a projected visible label. It is presentation-only and does not announce live changes automatically; owners should provide an appropriate live region for asynchronous updates. Cards and tables remain native markup. Wrap wide tables in a labeled, keyboard-focusable `.table-scroll` container. Dialog callers must manage opening, focus return and a visible close control using the native dialog API.

The shell collapses to a keyboard-operable disclosure menu at 800px. Dashboard widgets use one, two or four columns. Navigation retains `aria-current`, a visible active bar and high-contrast focus. Reduced-motion preferences suppress animation and transitions.

## Data and verification

Dashboard metrics intentionally show an em dash and an explicit unavailable label until a backend contract exists. They are not fabricated counts. Existing routes, API service and session interceptor are unchanged.

Run `npm run lint`, `npm run test:ci` and `npm run build`, matching Frontend CI. Check keyboard navigation, skip link, mobile disclosure and focus at desktop and tablet widths in a browser. Automated tests do not establish full WCAG conformance.
