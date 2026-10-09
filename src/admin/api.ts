import { MODE } from '../config/env'
import type { AdminData, Category, GalleryItem, Product, PublishStatus, Settings, Testimonial } from '../lib/types'

export type Bucket = 'public' | 'private'
export interface AdminUser { email: string }

export interface AdminApi {
  kind: 'supabase' | 'demo'
  /** Resolves the signed-in owner, or null when signed out. Throws if signed in but NOT authorised. */
  getUser(): Promise<AdminUser | null>
  signIn(email: string, password: string): Promise<AdminUser>
  signOut(): Promise<void>
  loadAll(): Promise<AdminData>
  saveProduct(p: Product): Promise<void>
  deleteProduct(p: Product): Promise<void>
  setProductStatus(id: string, status: PublishStatus): Promise<void>
  reorder(table: 'products' | 'categories' | 'gallery_items' | 'testimonials', ids: string[]): Promise<void>
  saveCategory(c: Category): Promise<void>
  deleteCategory(id: string): Promise<void>
  saveSettings(s: Settings): Promise<void>
  /** Uploads an already-validated, compressed image. Returns its storage path. */
  upload(blob: Blob, bucket: Bucket): Promise<string>
  moveMedia(path: string, from: Bucket, to: Bucket): Promise<string>
  deleteMedia(path: string, bucket: Bucket): Promise<void>
  saveGallery(g: GalleryItem): Promise<void>
  deleteGallery(g: GalleryItem): Promise<void>
  saveTestimonial(t: Testimonial): Promise<void>
  deleteTestimonial(t: Testimonial): Promise<void>
  removeSamples(): Promise<void>
  previewUrl(path: string, bucket: Bucket): Promise<string>
}

export async function getAdminApi(): Promise<AdminApi | null> {
  if (MODE === 'demo') return (await import('./demoApi')).demoApi
  if (MODE === 'supabase') return (await import('./supabaseApi')).createSupabaseApi()
  return null
}

export const newId = (): string => crypto.randomUUID()
