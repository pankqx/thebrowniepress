import { describe, it, expect } from 'vitest'
import { checkQty, stepQty, snapQty } from './quantity'
import { addLine, removeLine, resolveCart, setLineQty, lineKey, acceptChanges } from './cart'
import { buildBulkMessage, buildOrderMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from './whatsapp'
import { validateBulk, validateCheckout, sniffImageType } from './validation'
import { formatINR, toMinor } from './money'
import type { CartLine, CheckoutDetails, Product, Settings } from './types'

const settings: Settings = {
  whatsapp_number: '+919071983473', instagram_url: null, location_text: 'Mangalore', brand_description: '',
  announcement: null, ordering_paused: false, pickup_enabled: true, pickup_note: null, delivery_enabled: true,
  delivery_areas: [{ id: 'a1', name: 'Kadri', charge: 40 }, { id: 'a2', name: 'Surathkal', charge: null }],
  delivery_note: null, bulk_min: 20, business_hours: null, lead_time_note: null, contact_email: null,
  founder_name: null, founder_story: null, ingredients_note: null, orders_milestone: 300, menu_confirmed: true,
}
const mk = (id: string, name: string, variants: Array<[string, number, number, number, boolean?]>): Product => ({
  id, slug: id, name, description: '', category_id: null, status: 'published', is_sample: false, featured: false,
  sort_order: 1, available: true, label: null, ingredients: null, allergens: null, lead_time: null, images: [],
  variants: variants.map(([vid, price, min, step, av], i) => ({
    id: vid, product_id: id, name: vid, price, min_qty: min, qty_step: step, available: av ?? true, sort_order: i,
  })),
})
const products = [
  mk('p1', 'Triple "Choc" & Co', [['mini', 30, 6, 1], ['reg', 40.5, 1, 1]]),
  mk('p2', 'Cheesecake', [['box', 120, 4, 2]]),
]
const details: CheckoutDetails = { name: 'Asha', fulfilment: 'pickup', areaId: '', address: '', when: '', notes: '' }

describe('quantity rules (TC-003, TC-004)', () => {
  it('rejects quantities below the minimum', () => {
    for (const q of [1, 2, 3, 4, 5]) expect(checkQty(products[0].variants[0], q).ok).toBe(false)
    expect(checkQty(products[0].variants[0], 6).ok).toBe(true)
  })
  it('enforces increments from the minimum', () => {
    const v = products[1].variants[0] // min 4 step 2
    expect([4, 6, 8, 10].every((q) => checkQty(v, q).ok)).toBe(true)
    expect([5, 7, 9].every((q) => !checkQty(v, q).ok)).toBe(true)
  })
  it('rejects non-integers, zero, negatives and huge values', () => {
    const v = products[0].variants[1]
    for (const q of [0, -3, 1.5, NaN, 5000]) expect(checkQty(v, q).ok).toBe(false)
  })
  it('steps and snaps to valid values', () => {
    const v = products[1].variants[0]
    expect(stepQty(v, 4, 1)).toBe(6)
    expect(stepQty(v, 4, -1)).toBe(4)
    expect(stepQty(v, 7, 1)).toBeGreaterThanOrEqual(6)
    expect(snapQty(v, 5)).toBe(4)
    expect(snapQty(v, 1)).toBe(4)
  })
})

describe('cart (TC-005..008)', () => {
  const lines: CartLine[] = [
    { productId: 'p1', variantId: 'mini', qty: 6, priceSeen: 30 },
    { productId: 'p1', variantId: 'reg', qty: 3, priceSeen: 40.5 },
    { productId: 'p2', variantId: 'box', qty: 4, priceSeen: 120 },
  ]
  it('holds different variants and products in one cart; merges same variant', () => {
    let l: CartLine[] = []
    for (const x of lines) l = addLine(l, x)
    expect(l).toHaveLength(3)
    l = addLine(l, { productId: 'p1', variantId: 'mini', qty: 2, priceSeen: 30 })
    expect(l).toHaveLength(3)
    expect(l[0].qty).toBe(8)
  })
  it('computes exact totals without float drift', () => {
    const c = resolveCart(lines, products, settings)
    expect(c.subtotal).toBe(6 * 30 + 3 * 40.5 + 4 * 120)
    expect(c.pieces).toBe(13)
    expect(c.blocking).toBe(false)
    expect(c.delivery).toBeNull()
    expect(toMinor(0.1 + 0.2)).toBe(30)
  })
  it('updates when a line is changed or removed', () => {
    let l = setLineQty(lines, lineKey(lines[1]), 10)
    expect(resolveCart(l, products, settings).subtotal).toBe(180 + 405 + 480)
    l = removeLine(l, lineKey(lines[0]))
    expect(resolveCart(l, products, settings).lines).toHaveLength(2)
  })
  it('flags removed, unavailable, below-minimum and price-changed lines', () => {
    const changed = [
      { ...products[0], variants: [{ ...products[0].variants[0], price: 35 }, { ...products[0].variants[1], available: false }] },
      { ...products[1], variants: [{ ...products[1].variants[0], min_qty: 8 }] },
    ]
    const c = resolveCart([...lines, { productId: 'gone', variantId: 'x', qty: 1, priceSeen: 1 }], changed, settings)
    expect(c.blocking).toBe(true)
    expect(c.lines[0].issues.map((i) => i.kind)).toEqual(['price'])
    expect(c.lines[0].blocking).toBe(false)
    expect(c.lines[1].issues.map((i) => i.kind)).toContain('unavailable')
    expect(c.lines[2].issues.map((i) => i.kind)).toContain('qty')
    expect(c.lines[3].issues[0].kind).toBe('missing')
    const fixed = acceptChanges(lines, changed)
    expect(fixed[0].priceSeen).toBe(35)
    expect(fixed[2].qty).toBe(8)
  })
  it('treats unpublished products as unavailable', () => {
    const c = resolveCart(lines, [{ ...products[0], status: 'draft' }, products[1]], settings)
    expect(c.blocking).toBe(true)
  })
  it('delivery charge: known, pending, or none', () => {
    expect(resolveCart(lines, products, settings, { fulfilment: 'delivery', areaId: 'a1' }).estimatedTotal).toBe(781.5 + 40)
    const pend = resolveCart(lines, products, settings, { fulfilment: 'delivery', areaId: 'a2' })
    expect(pend.deliveryPending).toBe(true)
    expect(pend.estimatedTotal).toBe(781.5)
    expect(resolveCart(lines, products, settings, { fulfilment: 'pickup', areaId: '' }).deliveryPending).toBe(false)
  })
})

describe('WhatsApp (TC-009..012)', () => {
  it('normalises numbers', () => {
    expect(normalizeWhatsAppNumber('+919071983473')).toBe('919071983473')
    expect(normalizeWhatsAppNumber('+91 90719 83473')).toBe('919071983473')
    expect(normalizeWhatsAppNumber('9071983473')).toBe('919071983473')
    expect(normalizeWhatsAppNumber('00919071983473')).toBe('919071983473')
    expect(normalizeWhatsAppNumber('abc')).toBeNull()
    expect(normalizeWhatsAppNumber('')).toBeNull()
    expect(normalizeWhatsAppNumber(null)).toBeNull()
    expect(normalizeWhatsAppNumber('123')).toBeNull()
  })
  const lines: CartLine[] = [
    { productId: 'p1', variantId: 'mini', qty: 6, priceSeen: 30 },
    { productId: 'p2', variantId: 'box', qty: 4, priceSeen: 120 },
  ]
  it('message contains every item, totals and disclaimers', () => {
    const cart = resolveCart(lines, products, settings)
    const msg = buildOrderMessage(cart, { ...details, when: '2026-11-01', notes: 'Less sweet\nplease & thanks' }, settings)
    expect(msg).toContain('Triple "Choc" & Co — mini')
    expect(msg).toContain('Quantity: 6')
    expect(msg).toContain('Line total: ₹180')
    expect(msg).toContain('Cheesecake — box')
    expect(msg).toContain('Subtotal: ₹660')
    expect(msg).toContain('Estimated total: ₹660, subject to confirmation')
    expect(msg).toContain('Fulfilment: Pickup')
    expect(msg).toContain('This is an order request, not a confirmed booking.')
    expect(msg).not.toContain('Delivery charge')
  })
  it('delivery with unconfirmed charge says pending', () => {
    const cart = resolveCart(lines, products, settings, { fulfilment: 'delivery', areaId: 'a2' })
    const msg = buildOrderMessage(cart, { ...details, fulfilment: 'delivery', areaId: 'a2', address: '12 MG Road' }, settings)
    expect(msg).toContain('Delivery charge: Pending confirmation')
    expect(msg).toContain('Delivery area: Surathkal')
    expect(msg).toContain('Delivery address: 12 MG Road')
  })
  it('encodes special characters, emoji, rupee sign and line breaks', () => {
    const msg = 'Line1\nLine2 & 100% ₹ 😀 "q" #1'
    const link = buildWhatsAppUrl('+919071983473', msg)
    expect(link.url!.startsWith('https://wa.me/919071983473?text=')).toBe(true)
    const q = link.url!.split('?text=')[1]
    expect(q).toContain('%0A')
    expect(q).not.toMatch(/[ \n&#"]/)
    expect(decodeURIComponent(q)).toBe(msg)
  })
  it('fails safely when the number is missing/invalid and flags very long messages', () => {
    expect(buildWhatsAppUrl('', 'hi')).toMatchObject({ ok: false, url: null })
    expect(buildWhatsAppUrl('12', 'hi').ok).toBe(false)
    expect(buildWhatsAppUrl('+919071983473', 'x'.repeat(5000)).tooLong).toBe(true)
  })
  it('handles large carts', () => {
    const many: CartLine[] = Array.from({ length: 40 }, (_, i) => ({ productId: 'p2', variantId: 'box', qty: 4 + 2 * i, priceSeen: 120 }))
    const cart = resolveCart(many, products, settings)
    const msg = buildOrderMessage(cart, details, settings)
    expect(msg.split('Quantity:').length - 1).toBe(40)
  })
  it('bulk message', () => {
    const m = buildBulkMessage({ name: 'Ravi', occasion: 'Office party', pieces: 50, when: '', products: ['Cheesecake'], notes: '' })
    expect(m).toContain('50 pieces')
    expect(m).toContain('Office party')
    expect(m).toContain('enquiry, not a confirmed booking')
  })
})

describe('validation', () => {
  it('checkout: name, delivery details, date', () => {
    expect(validateCheckout(details, settings).name).toBeUndefined()
    expect(validateCheckout({ ...details, name: '' }, settings).name).toBeTruthy()
    expect(validateCheckout({ ...details, fulfilment: 'delivery' }, settings)).toMatchObject({ areaId: expect.any(String), address: expect.any(String) })
    expect(validateCheckout({ ...details, when: '2000-01-01' }, settings).when).toBeTruthy()
    expect(validateCheckout({ ...details, fulfilment: 'delivery' }, { ...settings, delivery_enabled: false }).fulfilment).toBeTruthy()
    expect(validateCheckout({ ...details, fulfilment: 'delivery', address: '12 MG Road', areaId: 'a1' }, settings)).toEqual({})
  })
  it('bulk minimum is configurable', () => {
    const d = { name: 'A B', occasion: 'x', pieces: 19, when: '' }
    expect(validateBulk(d, 20).pieces).toBeTruthy()
    expect(validateBulk({ ...d, pieces: 20 }, 20).pieces).toBeUndefined()
    expect(validateBulk({ ...d, pieces: 25 }, 30).pieces).toBeTruthy()
  })
  it('sniffs image types from bytes, not names', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg')
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0]))).toBe('image/png')
    expect(sniffImageType(new TextEncoder().encode('<svg onload=alert(1)></svg>'))).toBeNull()
    expect(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
  })
  it('formats rupees', () => {
    expect(formatINR(40)).toBe('₹40')
    expect(formatINR(1234.5)).toBe('₹1,234.50')
  })
})
