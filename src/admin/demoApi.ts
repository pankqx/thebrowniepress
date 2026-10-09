import { getDemo, resetDemo, saveDemo } from '../data/demoDb'
import type { AdminApi, Bucket } from './api'
import type { AdminData } from '../lib/types'

const FLAG = 'bp-demo-admin'
const read = (): AdminData => structuredClone(getDemo())
const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b) })

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  return i === -1 ? [...list, item] : list.map((x) => (x.id === item.id ? item : x))
}

/** Browser-local stand-in for the dashboard API. NO real authentication or security. */
export const demoApi: AdminApi = {
  kind: 'demo',
  async getUser() { try { return sessionStorage.getItem(FLAG) ? { email: 'demo (no real login)' } : null } catch { return null } },
  async signIn() { try { sessionStorage.setItem(FLAG, '1') } catch { /* ignore */ } return { email: 'demo (no real login)' } },
  async signOut() { try { sessionStorage.removeItem(FLAG) } catch { /* ignore */ } },
  async loadAll() { return read() },
  async saveProduct(p) { const d = read(); d.products = upsert(d.products, p); saveDemo(d) },
  async deleteProduct(p) { const d = read(); d.products = d.products.filter((x) => x.id !== p.id); saveDemo(d) },
  async setProductStatus(id, status) { const d = read(); d.products = d.products.map((p) => (p.id === id ? { ...p, status } : p)); saveDemo(d) },
  async reorder(table, ids) {
    const d = read()
    const key = table === 'gallery_items' ? 'gallery' : table
    const list = d[key] as Array<{ id: string; sort_order: number }>
    ids.forEach((id, i) => { const x = list.find((y) => y.id === id); if (x) x.sort_order = i + 1 })
    saveDemo(d)
  },
  async saveCategory(c) { const d = read(); d.categories = upsert(d.categories, c); saveDemo(d) },
  async deleteCategory(id) { const d = read(); d.categories = d.categories.filter((c) => c.id !== id); d.products = d.products.map((p) => (p.category_id === id ? { ...p, category_id: null } : p)); saveDemo(d) },
  async saveSettings(s) { const d = read(); d.settings = s; saveDemo(d) },
  async upload(blob: Blob) { return toDataUrl(blob) },
  async moveMedia(path: string) { return path },
  async deleteMedia() { /* data URLs live inside the row */ },
  async saveGallery(g) { const d = read(); d.gallery = upsert(d.gallery, g); saveDemo(d) },
  async deleteGallery(g) { const d = read(); d.gallery = d.gallery.filter((x) => x.id !== g.id); saveDemo(d) },
  async saveTestimonial(t) { const d = read(); d.testimonials = upsert(d.testimonials, t); saveDemo(d) },
  async deleteTestimonial(t) { const d = read(); d.testimonials = d.testimonials.filter((x) => x.id !== t.id); saveDemo(d) },
  async removeSamples() {
    const d = read()
    d.products = d.products.filter((p) => !p.is_sample)
    d.gallery = d.gallery.filter((g) => !g.is_sample)
    saveDemo(d)
  },
  async previewUrl(path: string, _bucket: Bucket) { void _bucket; return path },
}
export { resetDemo }
