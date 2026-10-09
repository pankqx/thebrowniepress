import type { Product } from '../lib/types'

/** Normalises PostgREST rows (numeric strings, nested relations) into app types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProduct(r: any): Product {
  return {
    id: r.id, slug: r.slug, name: r.name, description: r.description ?? '', category_id: r.category_id,
    status: r.status, is_sample: !!r.is_sample, featured: !!r.featured, sort_order: r.sort_order ?? 0,
    available: !!r.available, label: r.label, ingredients: r.ingredients, allergens: r.allergens, lead_time: r.lead_time,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variants: (r.product_variants ?? r.variants ?? []).map((v: any) => ({
      id: v.id, product_id: v.product_id ?? r.id, name: v.name, price: Number(v.price), min_qty: v.min_qty,
      qty_step: v.qty_step, available: !!v.available, sort_order: v.sort_order ?? 0,
    })).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images: (r.product_images ?? r.images ?? []).map((i: any) => ({
      id: i.id, product_id: i.product_id ?? r.id, path: i.path, alt: i.alt ?? '', sort_order: i.sort_order ?? 0,
    })).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
  }
}
