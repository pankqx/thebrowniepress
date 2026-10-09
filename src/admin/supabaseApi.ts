import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PRIVATE_BUCKET, PUBLIC_BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env'
import { mapProduct } from '../data/mapping'
import type { AdminApi, Bucket } from './api'
import type { AdminData, Category, GalleryItem, Product, Settings, Testimonial } from '../lib/types'

const bucketName = (b: Bucket) => (b === 'public' ? PUBLIC_BUCKET : PRIVATE_BUCKET)
const isStorage = (path: string) => !path.startsWith('static:') && !path.startsWith('data:') && !path.startsWith('http')

function fail(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`)
}

export function createSupabaseApi(): AdminApi {
  // Session lives in sessionStorage (cleared when the tab closes) rather than long-lived localStorage. See ADR-006.
  const db: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storage: window.sessionStorage, detectSessionInUrl: false },
  })

  async function ensureAdmin(email: string) {
    const { data, error } = await db.rpc('is_admin')
    if (error || data !== true) {
      await db.auth.signOut()
      throw new Error('This account is not authorised to manage the website.')
    }
    return { email }
  }

  const upsertRows = async (table: string, rows: object[]) => { if (rows.length) fail((await db.from(table).upsert(rows)).error, `Saving ${table}`) }

  return {
    kind: 'supabase',
    async getUser() {
      const { data } = await db.auth.getSession()
      const email = data.session?.user.email
      return email ? ensureAdmin(email) : null
    },
    async signIn(email, password) {
      const { data, error } = await db.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Email or password is incorrect.')
      return ensureAdmin(data.user.email ?? email)
    },
    async signOut() { await db.auth.signOut() },

    async loadAll(): Promise<AdminData> {
      const [s, c, p, g, t] = await Promise.all([
        db.from('business_settings').select('*').limit(1),
        db.from('categories').select('*').order('sort_order'),
        db.from('products').select('*, product_variants(*), product_images(*)').order('sort_order'),
        db.from('gallery_items').select('*').order('sort_order'),
        db.from('testimonials').select('*').order('sort_order'),
      ])
      for (const [r, w] of [[s, 'settings'], [c, 'categories'], [p, 'products'], [g, 'gallery'], [t, 'feedback']] as const) fail(r.error, `Loading ${w}`)
      if (!s.data?.[0]) throw new Error('Business settings row is missing. Run supabase/seed.sql (see docs/DEPLOYMENT.md).')
      return {
        settings: s.data[0] as Settings, categories: c.data as Category[], products: (p.data ?? []).map(mapProduct),
        gallery: g.data as GalleryItem[], testimonials: t.data as Testimonial[],
      }
    },

    async saveProduct(p: Product) {
      const { variants, images, ...row } = p
      fail((await db.from('products').upsert(row)).error, 'Saving product')
      const [ev, ei] = await Promise.all([
        db.from('product_variants').select('id').eq('product_id', p.id),
        db.from('product_images').select('id').eq('product_id', p.id),
      ])
      fail(ev.error, 'Reading variants'); fail(ei.error, 'Reading images')
      const goneV = (ev.data ?? []).map((x) => x.id as string).filter((id) => !variants.some((v) => v.id === id))
      const goneI = (ei.data ?? []).map((x) => x.id as string).filter((id) => !images.some((v) => v.id === id))
      if (goneV.length) fail((await db.from('product_variants').delete().in('id', goneV)).error, 'Removing variants')
      if (goneI.length) fail((await db.from('product_images').delete().in('id', goneI)).error, 'Removing images')
      await upsertRows('product_variants', variants.map((v) => ({ ...v, product_id: p.id })))
      await upsertRows('product_images', images.map((i) => ({ ...i, product_id: p.id })))
    },
    async deleteProduct(p) {
      const paths = p.images.map((i) => i.path).filter(isStorage)
      fail((await db.from('products').delete().eq('id', p.id)).error, 'Deleting product')
      if (paths.length) await db.storage.from(PUBLIC_BUCKET).remove(paths)
    },
    async setProductStatus(id, status) { fail((await db.from('products').update({ status }).eq('id', id)).error, 'Updating product') },
    async reorder(table, ids) {
      const results = await Promise.all(ids.map((id, i) => db.from(table).update({ sort_order: i + 1 }).eq('id', id)))
      for (const r of results) fail(r.error, 'Reordering')
    },
    async saveCategory(c) { fail((await db.from('categories').upsert(c)).error, 'Saving category') },
    async deleteCategory(id) { fail((await db.from('categories').delete().eq('id', id)).error, 'Deleting category') },
    async saveSettings(s) { fail((await db.from('business_settings').upsert({ ...s, id: true })).error, 'Saving settings') },

    async upload(blob, bucket) {
      const ext = blob.type === 'image/jpeg' ? 'jpg' : 'webp'
      const path = `${crypto.randomUUID()}.${ext}`
      fail((await db.storage.from(bucketName(bucket)).upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' })).error, 'Uploading image')
      return path
    },
    async moveMedia(path, from, to) {
      if (!isStorage(path) || from === to) return path
      const dl = await db.storage.from(bucketName(from)).download(path)
      fail(dl.error, 'Reading image')
      const up = await db.storage.from(bucketName(to)).upload(path, dl.data!, { contentType: dl.data!.type, upsert: true, cacheControl: '31536000' })
      fail(up.error, 'Copying image')
      fail((await db.storage.from(bucketName(from)).remove([path])).error, 'Cleaning up old image')
      return path
    },
    async deleteMedia(path, bucket) { if (isStorage(path)) await db.storage.from(bucketName(bucket)).remove([path]) },

    async saveGallery(g) { fail((await db.from('gallery_items').upsert(g)).error, 'Saving gallery item') },
    async deleteGallery(g) { fail((await db.from('gallery_items').delete().eq('id', g.id)).error, 'Deleting gallery item'); await this.deleteMedia(g.path, g.bucket) },
    async saveTestimonial(t) { fail((await db.from('testimonials').upsert(t)).error, 'Saving feedback') },
    async deleteTestimonial(t) { fail((await db.from('testimonials').delete().eq('id', t.id)).error, 'Deleting feedback'); await this.deleteMedia(t.path, t.bucket) },
    async removeSamples() {
      fail((await db.from('products').delete().eq('is_sample', true)).error, 'Removing sample products')
      fail((await db.from('gallery_items').delete().eq('is_sample', true)).error, 'Removing sample gallery items')
    },
    async previewUrl(path, bucket) {
      if (!isStorage(path)) return path
      if (bucket === 'public') return db.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl
      const { data, error } = await db.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 3600)
      fail(error, 'Preview')
      return data!.signedUrl
    },
  }
}
