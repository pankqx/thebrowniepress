import { toMinor, fromMinor } from './money'
import { checkQty, snapQty } from './quantity'
import type { CartLine, CheckoutDetails, Product, Settings, Variant } from './types'

export type LineIssue =
  | { kind: 'missing'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'qty'; message: string; suggested: number }
  | { kind: 'price'; message: string; from: number; to: number }

export interface ResolvedLine {
  line: CartLine
  product: Product | null
  variant: Variant | null
  qty: number
  unit: number
  total: number
  issues: LineIssue[]
  /** blocking issues prevent checkout */
  blocking: boolean
}

export interface ResolvedCart {
  lines: ResolvedLine[]
  pieces: number
  subtotal: number
  /** Known delivery charge in rupees, or null when not applicable / unknown */
  delivery: number | null
  deliveryPending: boolean
  estimatedTotal: number
  blocking: boolean
  empty: boolean
}

export function lineKey(l: Pick<CartLine, 'productId' | 'variantId'>): string {
  return `${l.productId}:${l.variantId}`
}

/** Adds (or merges) a line. Quantity must already be valid for the variant. */
export function addLine(lines: CartLine[], add: CartLine): CartLine[] {
  const k = lineKey(add)
  const i = lines.findIndex((l) => lineKey(l) === k)
  if (i === -1) return [...lines, add]
  const next = [...lines]
  next[i] = { ...next[i], qty: next[i].qty + add.qty, priceSeen: add.priceSeen }
  return next
}

export function setLineQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  return lines.map((l) => (lineKey(l) === key ? { ...l, qty } : l))
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((l) => lineKey(l) !== key)
}

/**
 * Re-validates every line against the CURRENT catalogue: prices, availability, quantity rules.
 * Lines whose product/variant disappeared are kept (so the customer can see and remove them) but block checkout.
 */
export function resolveCart(
  lines: CartLine[],
  products: Product[],
  settings: Settings,
  details?: Pick<CheckoutDetails, 'fulfilment' | 'areaId'>,
): ResolvedCart {
  const resolved: ResolvedLine[] = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId) ?? null
    const variant = product?.variants.find((v) => v.id === line.variantId) ?? null
    const issues: LineIssue[] = []
    if (!product || !variant) {
      issues.push({ kind: 'missing', message: 'This item is no longer on the menu. Please remove it.' })
      return { line, product, variant, qty: line.qty, unit: 0, total: 0, issues, blocking: true }
    }
    if (!product.available || !variant.available || product.status !== 'published') {
      issues.push({ kind: 'unavailable', message: 'Currently unavailable. Please remove it or choose another option.' })
    }
    const q = checkQty(variant, line.qty)
    if (!q.ok) issues.push({ kind: 'qty', message: q.reason, suggested: snapQty(variant, line.qty) })
    if (toMinor(variant.price) !== toMinor(line.priceSeen)) {
      issues.push({
        kind: 'price',
        message: `Price changed from ₹${line.priceSeen} to ₹${variant.price}.`,
        from: line.priceSeen,
        to: variant.price,
      })
    }
    const total = fromMinor(toMinor(variant.price) * line.qty)
    return {
      line,
      product,
      variant,
      qty: line.qty,
      unit: variant.price,
      total,
      issues,
      blocking: issues.some((i) => i.kind !== 'price'),
    }
  })

  const valid = resolved.filter((r) => r.variant && r.product)
  const subtotalMinor = valid.reduce((s, r) => s + toMinor(r.unit) * r.qty, 0)
  const pieces = valid.reduce((s, r) => s + r.qty, 0)

  let delivery: number | null = null
  let deliveryPending = false
  if (details?.fulfilment === 'delivery') {
    const area = settings.delivery_areas.find((a) => a.id === details.areaId)
    if (area && area.charge !== null && area.charge !== undefined) delivery = area.charge
    else deliveryPending = true
  }
  const estimatedMinor = subtotalMinor + (delivery !== null ? toMinor(delivery) : 0)

  return {
    lines: resolved,
    pieces,
    subtotal: fromMinor(subtotalMinor),
    delivery,
    deliveryPending,
    estimatedTotal: fromMinor(estimatedMinor),
    blocking: resolved.some((r) => r.blocking),
    empty: resolved.length === 0,
  }
}

/** Replace lines with the quantity the rules allow and accept current prices. */
export function acceptChanges(lines: CartLine[], products: Product[]): CartLine[] {
  return lines.map((l) => {
    const v = products.find((p) => p.id === l.productId)?.variants.find((x) => x.id === l.variantId)
    if (!v) return l
    return { ...l, qty: snapQty(v, l.qty), priceSeen: v.price }
  })
}
