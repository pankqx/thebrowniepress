# Architecture decision records
| ID | Decision | Why / trade-off |
|---|---|---|
| ADR-001 | Vite + React + TS, static hosting, no SSR framework | Smallest runtime that meets perf targets; home prerendered by a 40-line script instead of Next.js. Other routes are CSR. |
| ADR-002 | No animation library; CSS + IntersectionObserver | Saves tens of kB; enough for the editorial feel; trivial to disable for reduced-motion. |
| ADR-003 | Public reads via plain `fetch` to PostgREST, supabase-js only in admin chunk | Keeps ~55 kB gz off every visitor's critical path. Trade-off: hand-written mapping, and Storage public URLs built manually. |
| ADR-004 | Checkout = WhatsApp deep link; never "order placed" | Matches the brief; honest. Trade-off: no order records, no confirmation. |
| ADR-005 | Integer paise for money; quantity rule min + k·step ≤ 1000 | Avoids float errors; the same rule is checked at add, in cart revalidation and at checkout. |
| ADR-006 | Admin session in `sessionStorage` (not localStorage) | Ends when tab closes; XSS risk mitigated by strict CSP. (Supabase client configured accordingly.) **Not live-tested.** |
| ADR-007 | Two storage buckets; publish = move private→public | An unreviewed screenshot is never at a public URL. Trade-off: move can fail midway → UI reports and keeps status draft. |
| ADR-008 | DB CHECK constraints for business rules (sample/privacy) | Rules hold even if someone calls the API directly. |
| ADR-009 | Three modes: supabase / demo / unconfigured | Lets the whole product be built and tested without credentials, while production can never silently run on fake data. Demo is explicitly insecure and bannered. |
| ADR-010 | Prerender home + `app.html` fallback | Fast LCP and crawlable home without SSR infra. Trade-off: hosts must route unknown paths to `/app.html` (done in `_redirects`/`vercel.json`). |
| ADR-011 | Client-side image re-encode to WebP | Strips EXIF/GPS, shrinks uploads; server-side validation is limited to bucket MIME/size limits. |
| ADR-012 | Strict CSP with `style-src 'unsafe-inline'` | Needed for React inline `style` attributes; scripts remain `'self'` only. |
| ADR-013 | `wouter` not adopted; react-router-dom v7 kept | Router size wasn't the bottleneck (initial JS within budget); avoids a rewrite. |
