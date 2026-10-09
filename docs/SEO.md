# SEO
## Implemented
- Unique `<title>` + meta description per route (`useSeo`), `robots` meta (`/cart` and `/admin` are `noindex`), canonical + `og:url` + OG/Twitter tags **only when `VITE_SITE_URL` is set** (the domain isn't bought; no placeholder domain is ever emitted).
- `robots.txt` always; `sitemap.xml` only once `VITE_SITE_URL` is set (static routes; products not listed — see limitations).
- Home HTML is prerendered (real content, headings, hero preload) so crawlers see content without JS. Other routes rely on client-side rendering and Google's JS rendering.
- Descriptive alt text, semantic headings, readable URLs (`/menu/<slug>`), `lang="en-IN"`.
- Lighthouse SEO 100 on `/`, `/menu`, `/bulk`, `/about`; `/cart` scores 63 deliberately because it is `noindex`.
## Not done / limitations
- No JSON-LD (LocalBusiness/Product) — would need confirmed address/hours/prices; add after the owner confirms them.
- Product pages and sitemap entries for them are not prerendered (data lives in Supabase). Possible later: build-time fetch of published products.
- No Google Business Profile / Search Console submission (needs owner accounts and the domain).
- OG image: set `VITE_OG_IMAGE` to a real brand image; none is invented.
