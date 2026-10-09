# Data model (`supabase/migrations/0001_init.sql`, `0002_storage.sql`)
| Table | Notes |
|---|---|
| `admin_users(user_id)` | RLS enabled, **no policies**; filled via SQL editor. `is_admin()` is `security definer`. |
| `categories` | name, unique slug, sort_order |
| `products` | slug, name, description, category, `status` draft/published/archived, `is_sample`, featured, available, label, ingredients, allergens, lead_time. CHECK `sample_never_published`. |
| `product_variants` | name, `price numeric(10,2)`, `min_qty`, `qty_step`, available; unique (product, name) |
| `product_images` | path (no `..`), alt, sort_order |
| `gallery_items` | path, bucket, caption, kind, featured, status draft/published, is_sample; CHECKs `gallery_published_is_public`, `gallery_sample_never_published` |
| `testimonials` | customer-feedback screenshots: path, bucket, caption, customer_label, `privacy_reviewed`, status; CHECK `testimonial_publish_rules` (published ⇒ public bucket ∧ privacy_reviewed) |
| `business_settings` | single row (`id boolean pk`): WhatsApp number (format-checked), instagram, ordering_paused, pickup/delivery flags+notes, delivery_areas (jsonb), bulk_min (default 20), announcement, hours, lead-time note, contact email, founder name/story, ingredients note, orders_milestone, `menu_confirmed` |
## RLS summary
- anon/authenticated SELECT: products/gallery/testimonials with `status='published'` only; variants/images only if their product is published; categories and business_settings are public (contain no secrets). Availability is a flag the storefront honours; it does not hide rows.
- Writes: only `is_admin()` (settings: insert/update only, no delete).
- Least-privilege `grant`s; anon has no write grants at all.
## Storage
`media-public` (published assets) and `media-private` (unreviewed feedback/gallery uploads); 5 MB, jpeg/png/webp; policies: public read on media-public only, everything else owner-only. Publishing moves the object private→public; unpublishing moves it back.
## Seed
`src/data/seed.json` → `npm run seed:sql` → `supabase/seed.sql`. Three **sample** products inserted as `draft` + `is_sample`.
## Money
Stored as rupees `numeric(10,2)`; the client converts to integer paise for all arithmetic.
