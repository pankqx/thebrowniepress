-- The Brownie Press: schema, constraints and Row Level Security.
-- Public visitors can read ONLY published content. Only users listed in admin_users can write.

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ───────────────────────── authorization ─────────────────────────
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
-- Deliberately NO policies: nobody can read or write this table through the API.
-- Owners are added once, from the SQL editor (see docs/ADMIN_GUIDE.md / docs/DEPLOYMENT.md).

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────────────────────── tables ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  category_id uuid references public.categories (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_sample boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  available boolean not null default true,
  label text check (label is null or char_length(label) <= 30),
  ingredients text check (ingredients is null or char_length(ingredients) <= 1000),
  allergens text check (allergens is null or char_length(allergens) <= 500),
  lead_time text check (lead_time is null or char_length(lead_time) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Provisional sample data can never go live; the owner must confirm (is_sample := false) first.
  constraint sample_never_published check (not (is_sample and status = 'published'))
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  price numeric(10, 2) not null check (price >= 0 and price <= 100000),
  min_qty integer not null default 1 check (min_qty between 1 and 1000),
  qty_step integer not null default 1 check (qty_step between 1 and 100),
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null check (char_length(path) between 1 and 300 and path !~ '\.\.'),
  alt text not null default '' check (char_length(alt) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  path text not null check (char_length(path) between 1 and 300 and path !~ '\.\.'),
  bucket text not null default 'private' check (bucket in ('public', 'private')),
  caption text not null default '' check (char_length(caption) <= 200),
  kind text not null default 'product' check (kind in ('product', 'batch', 'texture', 'packaging', 'order', 'seasonal')),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_sample boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_published_is_public check (status = 'draft' or bucket = 'public'),
  constraint gallery_sample_never_published check (not (is_sample and status = 'published'))
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  path text not null check (char_length(path) between 1 and 300 and path !~ '\.\.'),
  bucket text not null default 'private' check (bucket in ('public', 'private')),
  caption text not null default '' check (char_length(caption) <= 300),
  customer_label text not null default '' check (char_length(customer_label) <= 60),
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- The owner must tick the privacy review before a screenshot can be published.
  privacy_reviewed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonial_publish_rules check (status = 'draft' or (bucket = 'public' and privacy_reviewed))
);

create table public.business_settings (
  id boolean primary key default true check (id), -- single row
  whatsapp_number text not null check (whatsapp_number ~ '^\+?[0-9 ()-]{8,20}$'),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  location_text text not null default 'Mangalore, Karnataka' check (char_length(location_text) <= 120),
  brand_description text not null default '' check (char_length(brand_description) <= 500),
  announcement text check (announcement is null or char_length(announcement) <= 200),
  ordering_paused boolean not null default false,
  pickup_enabled boolean not null default true,
  pickup_note text check (pickup_note is null or char_length(pickup_note) <= 500),
  delivery_enabled boolean not null default true,
  delivery_areas jsonb not null default '[]'::jsonb check (jsonb_typeof(delivery_areas) = 'array'),
  delivery_note text check (delivery_note is null or char_length(delivery_note) <= 500),
  bulk_min integer not null default 20 check (bulk_min between 1 and 1000),
  business_hours text check (business_hours is null or char_length(business_hours) <= 500),
  lead_time_note text check (lead_time_note is null or char_length(lead_time_note) <= 500),
  contact_email text check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  founder_name text check (founder_name is null or char_length(founder_name) <= 80),
  founder_story text check (founder_story is null or char_length(founder_story) <= 3000),
  ingredients_note text check (ingredients_note is null or char_length(ingredients_note) <= 1000),
  orders_milestone integer check (orders_milestone is null or orders_milestone >= 0),
  menu_confirmed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── indexes & triggers ─────────────────────────
create index products_status_sort_idx on public.products (status, sort_order);
create index products_category_idx on public.products (category_id);
create index variants_product_idx on public.product_variants (product_id, sort_order);
create index images_product_idx on public.product_images (product_id, sort_order);
create index gallery_status_sort_idx on public.gallery_items (status, sort_order);
create index testimonials_status_sort_idx on public.testimonials (status, sort_order);

create trigger trg_categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger trg_variants_updated before update on public.product_variants for each row execute function public.set_updated_at();
create trigger trg_gallery_updated before update on public.gallery_items for each row execute function public.set_updated_at();
create trigger trg_testimonials_updated before update on public.testimonials for each row execute function public.set_updated_at();
create trigger trg_settings_updated before update on public.business_settings for each row execute function public.set_updated_at();

-- ───────────────────────── privileges (least privilege) ─────────────────────────
revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.products, public.product_variants, public.product_images,
  public.gallery_items, public.testimonials, public.business_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants, public.product_images,
  public.gallery_items, public.testimonials to authenticated;
grant insert, update on public.business_settings to authenticated;

-- ───────────────────────── row level security ─────────────────────────
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.gallery_items enable row level security;
alter table public.testimonials enable row level security;
alter table public.business_settings enable row level security;

-- Public (anonymous and signed-in non-owners): approved content only.
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "public read published products" on public.products for select to anon, authenticated using (status = 'published');
create policy "public read variants of published products" on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "public read images of published products" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "public read published gallery" on public.gallery_items for select to anon, authenticated using (status = 'published');
create policy "public read published testimonials" on public.testimonials for select to anon, authenticated using (status = 'published');
create policy "public read settings" on public.business_settings for select to anon, authenticated using (true);

-- Owner: full access, enforced in the database (not by hiding buttons).
create policy "owner all categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner all products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner all variants" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner all images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner all gallery" on public.gallery_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner all testimonials" on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner insert settings" on public.business_settings for insert to authenticated with check (public.is_admin());
create policy "owner update settings" on public.business_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
