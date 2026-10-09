# Deployment (what the owner/developer must do)
Nothing here has been done for you: no Supabase project, host account or domain exists.

## 1. Supabase (free tier is enough to start)
1. Create a project at supabase.com.
2. SQL editor: run `supabase/migrations/0001_init.sql`, then `0002_storage.sql`, then (optional, sample data) `supabase/seed.sql`.
3. Authentication → Providers: keep Email; **disable "Allow new users to sign up"**; set Site URL to your site and add `https://<domain>/admin` to Redirect URLs.
4. Authentication → Users → *Add user* (your email + strong password, auto-confirm).
5. SQL editor, once: `insert into admin_users (user_id) select id from auth.users where email = 'YOUR_EMAIL';`
6. Project Settings → API: copy **Project URL** and **anon public key** (never service_role).
7. Storage: confirm buckets `media-public` (public) and `media-private` (private) exist (created by 0002).

## 2. Build + host (Netlify, Vercel or Cloudflare Pages)
Build command `npm run build`, output `dist`. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and later `VITE_SITE_URL`. Do **not** set `VITE_DATA_MODE=demo`. `public/_redirects` (Netlify/Cloudflare) and `vercel.json` already provide the SPA fallback to `/app.html` and the security headers. Without Supabase variables the production build shows the safe "unconfigured" page.

## 3. First login and content
`/admin` → replace all sample items → upload real photos → set WhatsApp number (919071983473 is pre-filled from the brief — verify) → tick *menu confirmed* → open **Launch readiness** until all required checks pass.

## 4. Domain & HTTPS (when you buy one)
Add the domain in the host (HTTPS is automatic), set `VITE_SITE_URL=https://yourdomain`, redeploy (enables canonical, OG URLs, sitemap), add the domain to Supabase Site URL/redirects, and submit the sitemap in Search Console.

## 5. Verify
Run the manual checklist in TESTING.md, test the WhatsApp link on a real phone (a WhatsApp Business account is recommended), and run Lighthouse against the live URL.

## Rollback
Hosts keep previous deploys; DB changes are additive SQL — back up via Supabase before editing policies.
