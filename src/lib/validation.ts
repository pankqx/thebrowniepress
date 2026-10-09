import type { CheckoutDetails, Settings } from './types'

export type Errors<T extends string = string> = Partial<Record<T, string>>

export function validateCheckout(d: CheckoutDetails, s: Settings, today = new Date()): Errors<keyof CheckoutDetails> {
  const e: Errors<keyof CheckoutDetails> = {}
  const name = d.name.trim()
  if (name.length < 2) e.name = 'Please enter your name.'
  else if (name.length > 60) e.name = 'Name is too long.'
  if (d.fulfilment === 'delivery') {
    if (!s.delivery_enabled) e.fulfilment = 'Delivery is not available right now.'
    if (s.delivery_areas.length > 0 && !s.delivery_areas.some((a) => a.id === d.areaId)) e.areaId = 'Please choose your delivery area.'
    if (d.address.trim().length < 6) e.address = 'Please enter a delivery address.'
  } else if (!s.pickup_enabled) {
    e.fulfilment = 'Pickup is not available right now.'
  }
  if (d.when) {
    const t = new Date(d.when + 'T23:59:59')
    if (Number.isNaN(t.getTime())) e.when = 'Please choose a valid date.'
    else if (t < today) e.when = 'Please choose today or a future date.'
  }
  if (d.notes.length > 500) e.notes = 'Please keep notes under 500 characters.'
  return e
}

export function validateBulk(
  d: { name: string; occasion: string; pieces: number; when: string },
  bulkMin: number,
): Errors<'name' | 'occasion' | 'pieces' | 'when'> {
  const e: Errors<'name' | 'occasion' | 'pieces' | 'when'> = {}
  if (d.name.trim().length < 2) e.name = 'Please enter your name.'
  if (!d.occasion.trim()) e.occasion = 'Please tell us the occasion.'
  if (!Number.isInteger(d.pieces) || d.pieces < bulkMin) e.pieces = `Bulk orders start at ${bulkMin} pieces.`
  else if (d.pieces > 5000) e.pieces = 'For very large orders, please message us directly.'
  return e
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60)

/** Sniffs the real file type from its first bytes — never trusts file extensions or client MIME types. */
export function sniffImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp'
  return null
}
