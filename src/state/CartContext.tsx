import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { acceptChanges, addLine, lineKey, removeLine, resolveCart, setLineQty, type ResolvedCart } from '../lib/cart'
import { checkQty } from '../lib/quantity'
import type { CartLine, CheckoutDetails, Product, Variant } from '../lib/types'
import { useData } from '../data/DataContext'

const KEY = 'bp-cart-v1'

/** Only product/variant ids, quantity and the price the customer saw are stored — nothing personal. */
function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((l): l is CartLine =>
        !!l && typeof l.productId === 'string' && typeof l.variantId === 'string' && Number.isInteger(l.qty) && l.qty > 0 && typeof l.priceSeen === 'number')
      .slice(0, 100)
  } catch {
    return []
  }
}

interface Ctx {
  lines: CartLine[]
  pieces: number
  bumps: number
  add: (p: Product, v: Variant, qty: number) => { ok: true } | { ok: false; message: string }
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  acceptAll: () => void
  resolve: (d?: Pick<CheckoutDetails, 'fulfilment' | 'areaId'>) => ResolvedCart | null
}
const C = createContext<Ctx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { state } = useData()
  const [lines, setLines] = useState<CartLine[]>(readStored)
  const [bumps, setBumps] = useState(0)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch { /* private mode: cart lives in memory */ }
  }, [lines])

  const add: Ctx['add'] = useCallback((p, v, qty) => {
    const q = checkQty(v, qty)
    if (!q.ok) return { ok: false, message: q.reason }
    if (!p.available || !v.available) return { ok: false, message: 'This option is currently unavailable.' }
    setLines((l) => addLine(l, { productId: p.id, variantId: v.id, qty, priceSeen: v.price }))
    setBumps((n) => n + 1)
    return { ok: true }
  }, [])

  const value = useMemo<Ctx>(() => ({
    lines,
    pieces: lines.reduce((s, l) => s + l.qty, 0),
    bumps,
    add,
    setQty: (key, qty) => setLines((l) => setLineQty(l, key, qty)),
    remove: (key) => setLines((l) => removeLine(l, key)),
    clear: () => setLines([]),
    acceptAll: () => state.data && setLines((l) => acceptChanges(l, state.data.products)),
    resolve: (d) => (state.data ? resolveCart(lines, state.data.products, state.data.settings, d) : null),
  }), [lines, bumps, add, state.data])

  return <C.Provider value={value}>{children}</C.Provider>
}

export function useCart(): Ctx {
  const v = useContext(C)
  if (!v) throw new Error('CartProvider missing')
  return v
}
export { lineKey }
