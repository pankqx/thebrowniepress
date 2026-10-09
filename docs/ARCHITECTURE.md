# Architecture
```
Browser ── static files (Vite build, prerendered home) ── CDN/host (Netlify/Vercel/Cloudflare Pages)
   │  public reads: fetch → Supabase PostgREST (anon key, RLS: published rows only)
   │  public images: Supabase Storage bucket media-public
   └─ /admin (lazy chunk): supabase-js → Auth, PostgREST (RLS is_admin()), Storage (media-private + media-public)
Checkout: pure client code → wa.me link → customer's WhatsApp. No server involved.
```
## Modules
- `src/lib/` pure, unit-tested logic: money (paise), quantity rules, cart + revalidation, WhatsApp builders, validation.
- `src/data/` `DataContext` selects a source by mode: `publicSource` (fetch) or `demoDb` (localStorage). `mapping.ts` converts rows → domain types.
- `src/admin/` dashboard, behind `React.lazy`; `api.ts` interface with `supabaseApi.ts` and `demoApi.ts` implementations.
- `scripts/prerender.mjs` SSR-renders the home shell at build time (`src/entry-server.tsx`) into `dist/index.html`; the pristine SPA shell is kept as `dist/app.html` and all other routes fall back to it (`_redirects`, `vercel.json`).
## Why no server
Orders go through WhatsApp, so there is no payment or order backend to secure. Supabase (managed) holds catalogue + media; RLS is the security boundary.
## Build modes
`npm run build` (production; `supabase` or `unconfigured`), `npm run build:demo` (demo; used for tests and Lighthouse).
## Bundle (gzip)
Initial JS 97.4 kB, CSS 5 kB; lazy: AdminApp 13.2 kB, supabaseApi 54.7 kB (public visitors never download them — verified by mocked-backend e2e).
