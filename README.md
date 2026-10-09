# The Brownie Press

Storefront + owner dashboard for a home-based brownie business in Mangalore, India.
Customers browse the menu, build a multi-item cart and send **one consolidated WhatsApp message**
(+91 90719 83473). Nothing is sent automatically and the site never claims an order is accepted.

Stack: Vite 8 · React 19 · TypeScript (strict) · plain CSS tokens · Supabase (Auth, Postgres+RLS, Storage).

## Quick start
```bash
npm install
npm run dev                # no backend configured -> demo mode (local fake DB, NO real security)
npm run typecheck && npm run lint && npm test && npm run test:rls
npm run build:demo && npm run preview   # http://localhost:4173
npm run e2e                # needs Chromium (see docs/TESTING.md)
npm run perf               # Lighthouse mobile+desktop -> reports/
```

## Data modes (`src/config/env.ts`)
| Mode | When | Notes |
|---|---|---|
| `supabase` | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set | Real backend. Production target. |
| `demo` | `VITE_DATA_MODE=demo`, or dev with no backend | localStorage DB; admin password is not secure. Sample products shown with banners. |
| `unconfigured` | Production build, no backend | Safe fallback page; admin disabled. |

## Live demo (GitHub Pages)
https://pankqx.github.io/thebrowniepress/ — demo build with sample data; the admin at `/admin` uses a local fake backend (no real security). Deployed by `.github/workflows/pages.yml`; build locally with `npm run build:pages`. Not the production deployment.

## Going live
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Supabase setup, owner account, hosting, domain) and
[docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) (owner manual). The dashboard's **Launch readiness** page blocks
go-live while sample data remains.

## Docs
PRD · DESIGN · UX_FLOWS · ARCHITECTURE · DATA_MODEL · ADMIN_GUIDE · MOTION · PERFORMANCE · ACCESSIBILITY · SEO ·
SECURITY · TESTING · DEPLOYMENT · DECISIONS · TASKS — all in `docs/`. Honest status: `docs/TASKS.md`.

## Honest caveats
Menu photos/prices/descriptions are **samples** (draft, never published to production). No testimonials are invented.
The real Supabase path has not been exercised live (no project exists yet) — see docs/TESTING.md.
