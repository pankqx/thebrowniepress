export type PublishStatus = 'draft' | 'published' | 'archived'
export type Visibility = 'draft' | 'published'

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface Variant {
  id: string
  product_id: string
  name: string
  /** Rupees, up to 2 decimals. */
  price: number
  min_qty: number
  qty_step: number
  available: boolean
  sort_order: number
}

/** `path` is either `static:<name>` (bundled placeholder) or a storage object path. */
export interface ProductImage {
  id: string
  product_id: string
  path: string
  alt: string
  sort_order: number
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  category_id: string | null
  status: PublishStatus
  /** Provisional sample record. Sample products can never be published in the database. */
  is_sample: boolean
  featured: boolean
  sort_order: number
  available: boolean
  label: string | null
  ingredients: string | null
  allergens: string | null
  lead_time: string | null
  variants: Variant[]
  images: ProductImage[]
}

export interface GalleryItem {
  id: string
  path: string
  bucket: 'public' | 'private'
  caption: string
  kind: 'product' | 'batch' | 'texture' | 'packaging' | 'order' | 'seasonal'
  featured: boolean
  status: Visibility
  is_sample: boolean
  sort_order: number
}

export interface Testimonial {
  id: string
  path: string
  bucket: 'public' | 'private'
  caption: string
  customer_label: string
  status: Visibility
  privacy_reviewed: boolean
  sort_order: number
}

export interface DeliveryArea {
  id: string
  name: string
  /** null = charge not confirmed yet */
  charge: number | null
}

export interface Settings {
  whatsapp_number: string
  instagram_url: string | null
  location_text: string
  brand_description: string
  announcement: string | null
  ordering_paused: boolean
  pickup_enabled: boolean
  pickup_note: string | null
  delivery_enabled: boolean
  delivery_areas: DeliveryArea[]
  delivery_note: string | null
  bulk_min: number
  business_hours: string | null
  lead_time_note: string | null
  contact_email: string | null
  founder_name: string | null
  founder_story: string | null
  ingredients_note: string | null
  orders_milestone: number | null
  menu_confirmed: boolean
}

export interface PublicData {
  settings: Settings
  categories: Category[]
  products: Product[]
  gallery: GalleryItem[]
  testimonials: Testimonial[]
}

export interface AdminData extends PublicData {
  /** All products including drafts/archived. */
  products: Product[]
}

export interface CartLine {
  productId: string
  variantId: string
  qty: number
  /** Unit price the customer saw when adding. Used only to detect price changes. */
  priceSeen: number
}

export type Fulfilment = 'pickup' | 'delivery'

export interface CheckoutDetails {
  name: string
  fulfilment: Fulfilment
  areaId: string
  address: string
  when: string
  notes: string
}
