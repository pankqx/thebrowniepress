# Testing
| Command | What | Latest result |
|---|---|---|
| `npm run typecheck` / `lint` | tsc strict, eslint | clean |
| `npm test` | vitest unit (`src/lib/lib.test.ts`): money, quantity, cart, WhatsApp, validation | 21/21 |
| `npm run test:rls` | PGlite executes the real migrations with stub `auth`/`storage` schemas | 14/14 |
| `npm run e2e` | Playwright-core + Chromium, demo build under real CSP | 16/16 groups |
| `node scripts/e2e-supabase-mock.mjs` | supabase mode against a mocked PostgREST | 4/4 |
| `npm run perf` | Lighthouse | see PERFORMANCE.md |
e2e needs a browser: `CHROME=/path/to/chrome npm run e2e` (the dev box used Playwright's Chromium).
## Test-case matrix (spec IDs)
| TC | Covered by | Status |
|---|---|---|
| 001 menu loads | e2e | Tested |
| 002 samples marked provisional | e2e | Tested |
| 003/004 minimum & step enforced | e2e + unit (quantity) | Tested |
| 005/006/007 multi-product cart, totals, removal | e2e + unit (cart) | Tested |
| 008 changed price / unavailable variant | e2e + unit | Tested |
| 009 number normalisation | unit + e2e | Tested |
| 010/011 message contents, totals, encoding (emoji, &, quotes, newlines) | unit + e2e | Tested |
| 012 missing WhatsApp config | e2e | Tested |
| 013 only owners reach admin | e2e (UI gate, demo) + RLS tests | Tested; live Auth Blocked |
| 014 unauthorised DB writes rejected | RLS tests (PGlite, real migrations) | Tested; not against live Supabase |
| 015/016 owner create/edit product, prices, min qty | e2e (demo backend) | Tested |
| 017 upload & publish images | e2e (demo); live Storage Blocked | Tested (demo) |
| 018 unpublished images/feedback not public | RLS tests + e2e | Tested; live Storage policies Blocked |
| 019 publish/unpublish/delete feedback | e2e (demo) | Tested (demo) |
| 020/021 settings persist; pause ordering | e2e | Tested |
| 022 responsive 360/390/768/1440 | e2e overflow check | Tested |
| 023 reduced motion | e2e | Tested |
| 024 image/backend failure fallbacks | e2e (image error), mocked-REST run | Tested |
| 025 production build | `npm run build` (see TASKS.md for latest run) | Tested |
## Manual checklist after deployment
1) Sign in, create/edit/publish a product with a real photo. 2) Anonymous window: draft not visible, direct REST call for drafts returns `[]`. 3) Upload a feedback image, confirm it is unreachable until published. 4) Place a test order and verify WhatsApp opens with the right number and text on a phone. 5) Re-run Lighthouse on the live URL. 6) Screen-reader pass.
