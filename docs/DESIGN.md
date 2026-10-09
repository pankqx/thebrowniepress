# Design
Editorial-luxury, warm and tactile.

## Tokens (`src/styles/tokens.css`)
Ivory (background), espresso (text/dark surfaces), brand red (CTAs, stamp), caramel (accents). Contrast pairs were chosen for ≥ 4.5:1 body text; verified by Lighthouse a11y 100 on audited pages.

## Type
- Display: **Anton** (condensed, uppercase headlines) — self-hosted woff2, preloaded.
- Body: **Inter** 400/700 — self-hosted.
- Accent: **Caveat 700** handwritten, ASCII subset (18 kB), used sparingly.
`font-display: swap`; only critical faces preloaded.

## Layout
Mobile-first, single column up to ~720px, then 2–3 column grids; 16px gutters; sticky cart bar on mobile once the cart is non-empty. Announce bars: sample-data notice (demo/sample only), orders-paused, custom announcement.

## Components
Header/mobile nav, ProductCard + BuyBox (variant radios, qty stepper honouring min/step), Stamp (circular badge), Media (responsive avif/webp with explicit dimensions), Reveal (IntersectionObserver), Gate (loading skeleton reserving 85vh to prevent CLS).

## Imagery
Placeholders derived from the supplied reference posters; **not** the owner's photography. Menu placeholders are 338 px wide and will look soft on retina — replace via the dashboard.
