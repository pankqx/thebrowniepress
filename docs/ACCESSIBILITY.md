# Accessibility
Target: WCAG 2.2 AA.
## Implemented
Semantic landmarks and one `h1` per page; skip link; visible focus rings; all controls are real buttons/links/inputs with labels; variant choice uses radio groups; quantity is a labelled text input with inputmode numeric plus +/- buttons with accessible names; inline errors tied with `aria-describedby`/live regions; cart changes announced via `aria-live`; images have alt text (owner-editable per product photo; gallery items use their caption); colour contrast checked; touch targets ≥ 44px; reduced-motion honoured; admin confirm dialog traps focus.
## Evidence
Lighthouse a11y 100 (/, /menu, /bulk, /about, /cart); e2e a11y checks; 360–1440 px overflow check passes.
## Not done
No manual screen-reader (NVDA/VoiceOver) session, no automated axe full-site crawl of admin pages. Blocked on human testing.
