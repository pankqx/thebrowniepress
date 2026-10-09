import type { Variant } from './types'

export const MAX_QTY = 1000

export type QtyCheck = { ok: true } | { ok: false; reason: string; suggested: number }

/** Valid quantities are min, min+step, min+2*step ... up to MAX_QTY. */
export function checkQty(variant: Pick<Variant, 'min_qty' | 'qty_step'>, qty: number): QtyCheck {
  const min = Math.max(1, variant.min_qty)
  const step = Math.max(1, variant.qty_step)
  if (!Number.isInteger(qty) || qty < 1) {
    return { ok: false, reason: 'Please enter a whole number of pieces.', suggested: min }
  }
  if (qty < min) {
    return {
      ok: false,
      reason: `Minimum order for this option is ${min} ${min === 1 ? 'piece' : 'pieces'}.`,
      suggested: min,
    }
  }
  if (qty > MAX_QTY) {
    return { ok: false, reason: `For more than ${MAX_QTY} pieces, please message us directly.`, suggested: MAX_QTY }
  }
  if ((qty - min) % step !== 0) {
    const down = qty - ((qty - min) % step)
    const up = down + step
    return {
      ok: false,
      reason: `This option sells from ${min} in steps of ${step} (${min}, ${min + step}, ${min + 2 * step}…).`,
      suggested: down >= min ? (qty - down <= up - qty ? down : up) : min,
    }
  }
  return { ok: true }
}

export function stepQty(variant: Pick<Variant, 'min_qty' | 'qty_step'>, current: number, dir: 1 | -1): number {
  const min = Math.max(1, variant.min_qty)
  const step = Math.max(1, variant.qty_step)
  const base = checkQty(variant, current).ok ? current : snapQty(variant, current)
  return Math.min(MAX_QTY, Math.max(min, base + dir * step))
}

/** Nearest valid quantity. */
export function snapQty(variant: Pick<Variant, 'min_qty' | 'qty_step'>, qty: number): number {
  const c = checkQty(variant, Math.round(qty) || 0)
  return c.ok ? Math.round(qty) : c.suggested
}
