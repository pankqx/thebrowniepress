import { MODE, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env'
import { getDemo } from './demoDb'
import { mapProduct } from './mapping'
import type { Category, GalleryItem, PublicData, Settings, Testimonial } from '../lib/types'

/**
 * Public reads use plain fetch against PostgREST (anon key, RLS-protected) so visitors
 * never download the Supabase client. Admin code lazy-loads it separately.
 */
async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Could not load menu (${res.status})`)
  return res.json() as Promise<T>
}

export async function loadPublic(): Promise<PublicData> {
  if (MODE === 'demo') {
    const db = getDemo()
    return {
      settings: db.settings,
      categories: [...db.categories].sort((a, b) => a.sort_order - b.sort_order),
      products: db.products.filter((p) => p.status === 'published').sort((a, b) => a.sort_order - b.sort_order),
      gallery: db.gallery.filter((g) => g.status === 'published').sort((a, b) => a.sort_order - b.sort_order),
      testimonials: db.testimonials.filter((t) => t.status === 'published').sort((a, b) => a.sort_order - b.sort_order),
    }
  }
  if (MODE === 'unconfigured') throw new Error('The menu is not available right now.')
  const [settings, categories, products, gallery, testimonials] = await Promise.all([
    rest<Settings[]>('business_settings?select=*&limit=1'),
    rest<Category[]>('categories?select=*&order=sort_order'),
    rest<unknown[]>('products?select=*,product_variants(*),product_images(*)&status=eq.published&order=sort_order'),
    rest<GalleryItem[]>('gallery_items?select=*&status=eq.published&order=sort_order'),
    rest<Testimonial[]>('testimonials?select=*&status=eq.published&order=sort_order'),
  ])
  if (!settings[0]) throw new Error('Business settings are missing.')
  return {
    settings: settings[0],
    categories,
    products: products.map(mapProduct),
    gallery,
    testimonials,
  }
}
