import { formatINR } from './money'
import type { ResolvedCart } from './cart'
import type { CheckoutDetails, Settings } from './types'

/**
 * Normalises a phone number to the digits-only international form wa.me expects.
 * "+919071983473" -> "919071983473"; a bare 10-digit Indian mobile gets "91" prefixed.
 * Returns null when the number is not plausible (E.164 allows 8-15 digits).
 */
export function normalizeWhatsAppNumber(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  digits = digits.replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) digits = '91' + digits
  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) return null
  return digits
}

export const MAX_URL_MESSAGE = 4000

export interface WaLink {
  ok: boolean
  url: string | null
  /** true if the encoded message is long enough that some devices may truncate it */
  tooLong: boolean
  error?: string
}

export function buildWhatsAppUrl(number: string | null | undefined, message: string): WaLink {
  const n = normalizeWhatsAppNumber(number)
  if (!n) return { ok: false, url: null, tooLong: false, error: 'WhatsApp number is not configured.' }
  const encoded = encodeURIComponent(message)
  return { ok: true, url: `https://wa.me/${n}?text=${encoded}`, tooLong: encoded.length > MAX_URL_MESSAGE }
}

// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()

export function buildOrderMessage(cart: ResolvedCart, d: CheckoutDetails, settings: Settings): string {
  const out: string[] = []
  out.push('Hello, The Brownie Press!', '', 'I would like to place an order.', '', 'Order items:')
  for (const r of cart.lines) {
    if (!r.product || !r.variant) continue
    out.push(`- ${r.product.name} — ${r.variant.name}`)
    out.push(`  Quantity: ${r.qty}`)
    out.push(`  Unit price: ${formatINR(r.unit)}`)
    out.push(`  Line total: ${formatINR(r.total)}`)
  }
  out.push('', `Subtotal: ${formatINR(cart.subtotal)}`)
  if (d.fulfilment === 'delivery') {
    out.push(`Delivery charge: ${cart.delivery !== null ? formatINR(cart.delivery) : 'Pending confirmation'}`)
  }
  out.push(
    cart.deliveryPending
      ? `Estimated total: ${formatINR(cart.estimatedTotal)} + delivery (to be confirmed)`
      : `Estimated total: ${formatINR(cart.estimatedTotal)}, subject to confirmation`,
  )
  out.push('', `Customer name: ${clean(d.name)}`)
  out.push(`Fulfilment: ${d.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}`)
  if (clean(d.when)) out.push(`Requested date/time: ${clean(d.when)}`)
  if (d.fulfilment === 'delivery') {
    const area = settings.delivery_areas.find((a) => a.id === d.areaId)
    if (area) out.push(`Delivery area: ${area.name}`)
    if (clean(d.address)) out.push(`Delivery address: ${clean(d.address)}`)
  }
  if (clean(d.notes)) out.push(`Notes: ${clean(d.notes)}`)
  out.push('', 'Please confirm availability and the final order details.', 'This is an order request, not a confirmed booking.')
  return out.join('\n')
}

export interface BulkDetails {
  name: string
  occasion: string
  pieces: number
  when: string
  products: string[]
  notes: string
}

export function buildBulkMessage(d: BulkDetails): string {
  const out = ['Hello, The Brownie Press!', '', 'I would like to enquire about a bulk order.', '']
  out.push(`Name: ${clean(d.name)}`)
  out.push(`Occasion: ${clean(d.occasion)}`)
  out.push(`Approx. quantity: ${d.pieces} pieces`)
  if (clean(d.when)) out.push(`Needed by: ${clean(d.when)}`)
  if (d.products.length) out.push(`Interested in: ${d.products.join(', ')}`)
  if (clean(d.notes)) out.push(`Notes: ${clean(d.notes)}`)
  out.push('', 'Please share availability and a final quote.', 'This is an enquiry, not a confirmed booking.')
  return out.join('\n')
}

export function buildGeneralMessage(): string {
  return 'Hello, The Brownie Press! I have a question about your brownies.'
}
