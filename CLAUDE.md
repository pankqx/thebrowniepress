# CLAUDE.md — The Brownie Press
Project rules for any agent working here.

## Never
- Invent facts: prices, testimonials, ingredients, domain, address, hours. Unknown => draft/sample + owner TODO.
- Claim an order is placed/accepted. Checkout only opens a prefilled WhatsApp link the customer sends.
- Put a service_role key in the client. Publish sample rows (DB CHECK `sample_never_published`).
- Buy domains, create accounts or paid services without the owner.
- Add animation/UI libraries; initial JS budget is 110 kB gz (currently ~97 kB), hero image ≤ 50 kB.

## Conventions
- Money = integer paise (`src/lib/money.ts`). Quantity valid iff min + k·step, ≤ 1000 (`quantity.ts`).
- Cart stores ids/qty/priceSeen only; `resolveCart` revalidates against the live catalogue.
- Public reads use plain `fetch` to PostgREST; supabase-js only in the lazy admin chunk.
- Admin and storage rules live in `supabase/migrations`; any policy change must come with an RLS test.
- Respect `prefers-reduced-motion`; keep CSP (`public/_headers`) clean — e2e fails on CSP errors.

## Commands
`npm run typecheck | lint | test | test:rls | build | build:demo | e2e | perf | seed:sql | images`
After changing `src/data/seed.json` run `npm run seed:sql`.

## Git
Commit as the repo owner only; no Co-Authored-By or tool-name trailers. Commit often.

## Status tracking
IDs FR-/NFR-/TC-/ADR- in docs/. Update status (Planned/Implemented/Tested/Blocked) in docs/TASKS.md with evidence.
