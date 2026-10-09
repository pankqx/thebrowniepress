# Performance
## Method
Lighthouse 13.5.0, Chrome 141, simulated mobile (412×823, 4× CPU slowdown, 150 ms RTT, 1638 kbps) and desktop; demo build with prerender, served by `scripts/serve.mjs` (gzip + the production `_headers`). Raw JSON in `reports/`. Re-run: `npm run build:demo && npm run perf`.
## Results (mobile, lab)
| Route | Perf | A11y | BP | SEO | FCP ms | LCP ms | TBT ms | CLS |
|---|---|---|---|---|---|---|---|---|
| / | 98 | 100 | 100 | 100 | 1583 | 2183 | 63 | 0 |
| /menu | 99 | – | – | – | – | 2013 | – | – |
| /bulk | 98 | – | – | – | – | 2157 | – | – |
| /about | 98 | – | – | – | – | 2214 | – | 0.031 |
| /cart | 97 | – | – | 63 (noindex) | – | 2446 | – | – |
Desktop: `/` and `/menu` perf 100. See the JSON for the full per-route numbers.
## Budgets
Initial JS ≤ 110 kB gz (97.4 kB demo build; 100.7 kB production build), CSS 5 kB gz, hero ≤ 50 kB (avif 30.7 kB @480w / 48.5 kB @624w). Admin (13.2 kB) and supabase-js (54.7 kB) are lazy and never loaded on public pages.
## Techniques
Self-hosted subsetted fonts + preloads; prerendered home; avif/webp with explicit dimensions; no animation/UI libs; fetch-based public reads; immutable caching for hashed assets; Gate skeleton reserves height (fixed CLS 0.326 on /about).
## Caveats (be honest)
- Lab data only. **INP and field LCP/CLS are unmeasured** until real traffic (CrUX) exists.
- Demo build has no network data fetch; with Supabase there is one extra parallel REST round-trip for the menu (the hero is prerendered and independent). Re-run Lighthouse against the real deployment.
- Menu placeholder photos are 338 px wide: fast but soft on retina.
