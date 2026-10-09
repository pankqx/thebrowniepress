# Tasks & status
Legend: ✅ Tested · 🟡 Implemented, partly verified · ⛔ Blocked (needs owner/external)

| Area | Status | Evidence / blocker |
|---|---|---|
| Storefront (FR-001) | ✅ | e2e 16/16 |
| Menu data model & variants (FR-002/003) | ✅ | RLS 14/14, e2e |
| Cart + validation (FR-004) | ✅ | unit 21/21, e2e |
| WhatsApp checkout/bulk (FR-005/006) | ✅ | unit + e2e; **real phone test ⛔** |
| Supabase schema + RLS (FR-007) | 🟡 | PGlite with stub auth/storage; **live project ⛔** |
| Owner dashboard (FR-008..011) | 🟡 | e2e on demo backend; real Auth/Storage path only via mocked REST (4/4) |
| Prod build (TC-025) | ✅ | `npm run build` OK; `unconfigured` fallback when no backend |
| Performance (NFR-001..003) | ✅ lab | mobile 98/100/100/100 on `/`; INP/field ⛔ |
| Accessibility (NFR-004) | 🟡 | automated + keyboard e2e; manual screen reader ⛔ |
| SEO (FR-013) | 🟡 | canonical/sitemap need domain ⛔; no JSON-LD; products not in sitemap |
| Documentation | ✅ | this docs set |
| Real content (menu, prices, photos, testimonials, address) | ⛔ | owner |
| Supabase project, host, domain, Search Console | ⛔ | owner (see DEPLOYMENT.md) |

## Known limitations / backlog
1. Placeholder menu photos are only 338 px wide.
2. Cart total is an estimate; delivery charge confirmed on WhatsApp.
3. supabase-js stays in the admin chunk (~55 kB gz) — loaded only for `/admin`.
4. Sitemap lists static routes only; add JSON-LD after confirmed facts.
5. Demo mode has zero security by design.
6. Consider server-side image validation (Edge Function) and rate limiting.
