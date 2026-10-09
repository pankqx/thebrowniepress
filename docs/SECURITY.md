# Security
## Threat model
Public internet visitors (untrusted) → read published content only. One owner (trusted after auth) → writes. No payments, no customer accounts, no customer data stored server-side (orders live in the customer's WhatsApp).
## Controls
- **RLS on every table**; `admin_users` has no policies; `is_admin()` is security definer with fixed `search_path`; least-privilege grants (anon: select only).
- **DB constraints** enforce business rules even if the UI is bypassed: samples never published, gallery published ⇒ public bucket, feedback published ⇒ public bucket ∧ privacy_reviewed.
- **Storage**: two buckets, 5 MB, jpeg/png/webp only; unreviewed uploads stay in `media-private` (owner-only); paths reject `..`.
- **Client image pipeline**: magic-byte sniffing (not trusting extension/MIME), canvas re-encode to WebP (drops EXIF/GPS and embedded payloads), size caps.
- **CSP** (`public/_headers`, `vercel.json`): `script-src 'self'`, no inline scripts, `frame-ancestors 'none'`, `object-src 'none'`, `connect-src` limited to self + `*.supabase.co`; plus nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy. e2e fails on any CSP violation.
- **XSS**: React escaping, no `dangerouslySetInnerHTML` for user content; WhatsApp text is `encodeURIComponent`-encoded; WhatsApp number normalised to digits.
- **Secrets**: only the public anon key is in the client. `.env*` git-ignored. service_role must never be used in the frontend.
- **Auth**: Supabase Auth email+password; recommend disabling public sign-ups (even if someone signs up they're not in `admin_users`, so RLS denies writes). Admin session in `sessionStorage` (ADR-006): cleared when the tab closes, readable by same-origin JS — acceptable given strict CSP.
## Verified
14 RLS tests on PGlite with stub auth (anon can't read drafts/private/admin_users, can't write; non-admin authenticated can't write; constraints hold). A deliberately weakened policy made 3 tests fail (tests are meaningful).
## NOT verified
Live Supabase Auth, real storage policies through the Storage API, rate limiting/abuse of the public REST endpoint, security review by a third party. **Demo mode is not secure** — never deploy a demo build with real data.
