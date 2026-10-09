# PRD — The Brownie Press
Status legend: Planned · Implemented · Tested · Blocked.

## Goal
A fast, trustworthy storefront for a home brownie business in Mangalore with WhatsApp-based ordering and an owner dashboard so the owner (non-technical) manages everything without developer help.

## Non-goals
Online payment, delivery tracking, accounts for customers, automatic order acceptance. No order is ever "placed" by the site.

## Functional requirements
| ID | Requirement | Status |
|---|---|---|
| FR-001 | Public pages: Home, Menu, Product, Cart, Bulk, About, Gallery, Contact, Policies, Privacy, 404 | Tested (e2e) |
| FR-002 | Data-driven menu: categories, products, variants, per-variant price/min qty/step/availability | Tested |
| FR-003 | Product status draft/published/archived + `is_sample`; samples can never be published (DB CHECK) | Tested (RLS) |
| FR-004 | Multi-product cart with live revalidation, price-change acknowledgement, blocked unavailable lines | Tested |
| FR-005 | Single consolidated WhatsApp message, prefilled link + copy fallback, honest post-click copy | Tested |
| FR-006 | Bulk enquiry (minimum 20 pcs) via WhatsApp | Tested |
| FR-007 | Owner auth (Supabase Auth), admin allow-list, RLS on every table | Tested on PGlite; live Auth Blocked |
| FR-008 | Admin CRUD: categories, products, variants, images (client WebP re-encode) | Tested (demo backend) |
| FR-009 | Gallery + customer-feedback wall with privacy review workflow; private→public file move on publish | Tested (demo) / live storage Blocked |
| FR-010 | Business settings: WhatsApp number, pause ordering, bulk minimum, announcement | Tested |
| FR-011 | Launch-readiness gate listing sample data/missing settings | Tested |
| FR-012 | Safe `unconfigured` fallback in production without backend | Tested |
| FR-013 | SEO: titles, descriptions, canonical + OG (when domain set), robots, sitemap (static routes), prerendered home; no JSON-LD yet | Tested (Lighthouse SEO 100) |

## Non-functional requirements
| ID | Requirement | Status / evidence |
|---|---|---|
| NFR-001 | Lighthouse mobile ≥ 90 perf / 95 a11y / 95 bp+SEO | Tested: 98/100/100/100 on `/` (simulated) |
| NFR-002 | LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms | LCP 2.18 s, CLS 0 (lab). INP: no field data — Blocked until live |
| NFR-003 | Initial JS ≤ 110 kB gz | 97.4 kB |
| NFR-004 | WCAG 2.2 AA intent, keyboard operable, reduced-motion | axe-style checks in e2e + Lighthouse a11y 100; no manual screen-reader pass |
| NFR-005 | Strict CSP, no inline scripts, security headers | Tested (e2e fails on CSP errors) |
| NFR-006 | No invented facts | Reviewed; samples flagged |

## Open items for the owner
Real menu, prices, photos, ingredients/allergens, lead time, address policy, domain, Supabase project, WhatsApp verification, privacy approval for each customer screenshot.
