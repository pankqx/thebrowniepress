# AGENTS.md

Instructions for AI coding agents working in this repo. **CLAUDE.md holds the full project rules; read it too.**
Humans: read [GUIDE.md](GUIDE.md) for a from-zero explanation of the backend (Supabase, Postgres, RLS, storage, admin API).

## What this project is

The Brownie Press is a home bakery website. Frontend: React 19 + Vite + TypeScript, prerendered home page.
**Backend: Supabase only** (managed Postgres + PostgREST + Auth + Storage). There is no custom server.
Security is enforced in the database with Row Level Security (RLS). Orders are not stored: checkout builds a
prefilled WhatsApp (`wa.me`) message that the customer sends.

## Backend map

```
supabase/migrations/0001_init.sql     tables, CHECK constraints, indexes, updated_at triggers, grants, RLS policies, is_admin()
supabase/migrations/0002_storage.sql  buckets media-public / media-private (5 MB, jpeg/png/webp) + owner-only storage policies
supabase/seed.sql                     generated from src/data/seed.json by `npm run seed:sql` (never hand-edit)
supabase/tests/stubs.sql              test-only stand-ins for Supabase auth/storage schemas and roles
supabase/tests/rls.test.ts            runs the real migrations in PGlite and proves the RLS rules per role
src/config/env.ts                     VITE_* env, MODE = supabase | demo | unconfigured
src/data/publicSource.ts              public reads via plain fetch to PostgREST (no supabase-js for visitors)
src/data/mapping.ts                   DB rows -> domain types
src/data/demoDb.ts, src/admin/demoApi.ts   localStorage fake backend for demo mode (no real security)
src/admin/api.ts                      AdminApi interface + lazy loader
src/admin/supabaseApi.ts              AdminApi via supabase-js: auth, CRUD, storage moves, signed URLs
src/admin/image.ts                    byte-sniff, resize, re-encode to WebP (strips EXIF) before upload
src/lib/                              pure logic: money (paise), quantity, cart, whatsapp, validation (+ lib.test.ts)
```

## Commands

```bash
npm install
npm run test          # unit tests (src/lib)
npm run test:rls      # RLS tests on PGlite; run after ANY migration or policy change
npm run typecheck && npm run lint
npm run build:demo    # build without a backend
npm run seed:sql      # after editing src/data/seed.json
```

## Backend rules

- Every schema or policy change goes in a NEW numbered migration (`0003_*.sql`), never by editing an applied one, and must come with an RLS test.
- Anon may only SELECT published rows. Writes require `public.is_admin()`. Keep grants least-privilege.
- Never put a `service_role` key in any `VITE_*` variable or client code. The anon key is public by design.
- Keep DB CHECKs as the last line of defence (lengths, enums, `sample_never_published`, publish rules).
- Public visitors must never download supabase-js; it lives only in the lazy admin chunk.
- Money is `numeric(10,2)` rupees in the DB and integer paise in client maths.

## Rules for agents

- Commit as `pankqx <pankqx@gmail.com>`. No `Co-Authored-By` or tool trailers.
- Do not invent business facts (prices, reviews, address). Use drafts and owner TODOs.
- If you change backend behaviour, update GUIDE.md and docs/DATA_MODEL.md in the same PR.
