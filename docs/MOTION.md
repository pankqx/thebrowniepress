# Motion
- No animation library (ADR-002). CSS transitions (≤ 250 ms, ease-out) for hover/focus, drawers and the reveal-on-scroll (`Reveal.tsx`, IntersectionObserver, one-shot).
- Only `opacity` and `transform` are animated; no layout-affecting animation ⇒ CLS 0.
- `prefers-reduced-motion: reduce` disables reveals and transitions (content is shown immediately). Covered by an e2e run with reduced motion enabled.
- Nothing auto-plays; no parallax; no motion carries essential information.
