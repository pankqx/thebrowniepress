import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { checkQty, stepQty } from '../lib/quantity'
import { formatINR } from '../lib/money'
import { Media } from './Media'
import type { Product, Settings } from '../lib/types'

export function BuyBox({ product, settings }: { product: Product; settings: Settings }) {
  const { add } = useCart()
  const id = useId()
  const variants = [...product.variants].sort((a, b) => a.sort_order - b.sort_order)
  const firstAvail = variants.find((v) => v.available) ?? variants[0]
  const [vid, setVid] = useState(firstAvail?.id)
  const v = variants.find((x) => x.id === vid) ?? firstAvail
  const [qty, setQty] = useState(String(v?.min_qty ?? 1))
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!v) return <p className="hint">No options available yet.</p>
  const paused = settings.ordering_paused
  const off = paused || !product.available || !v.available
  const n = Number(qty)

  const pick = (nv: typeof v) => { setVid(nv.id); setQty(String(nv.min_qty)); setMsg(null) }
  const bump = (dir: 1 | -1) => { setQty(String(stepQty(v, Number.isFinite(n) ? n : v.min_qty, dir))); setMsg(null) }

  const submit = () => {
    const c = checkQty(v, n)
    if (!c.ok) { setMsg({ kind: 'err', text: c.reason }); return }
    const r = add(product, v, n)
    if (!r.ok) { setMsg({ kind: 'err', text: r.message }); return }
    setMsg({ kind: 'ok', text: `Added ${n} × ${v.name} to your order.` })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 3500)
  }

  return (
    <div className="card-buy">
      <fieldset className="seg" aria-label={`${product.name} options`}>
        <legend className="sr-only">Choose an option</legend>
        {variants.map((x) => (
          <label key={x.id}>
            <input type="radio" name={`v-${id}`} checked={x.id === v.id} disabled={!x.available} onChange={() => pick(x)} />
            <span className="chip"><b>{x.name}</b><span>{formatINR(x.price)}</span></span>
          </label>
        ))}
      </fieldset>
      {(v.min_qty > 1 || v.qty_step > 1) && (
        <p className="hint">Minimum {v.min_qty} {v.min_qty === 1 ? 'piece' : 'pieces'}{v.qty_step > 1 ? `, in steps of ${v.qty_step}` : ''}.</p>
      )}
      <div className="buy-row">
        <div className="stepper" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" onClick={() => bump(-1)} disabled={off || n <= v.min_qty}>−</button>
          <input
            inputMode="numeric" pattern="[0-9]*" aria-label={`Quantity of ${product.name}, ${v.name}`} value={qty}
            onChange={(e) => { setQty(e.target.value.replace(/[^\d]/g, '')); setMsg(null) }}
            onBlur={() => { const c = checkQty(v, n); if (!c.ok) setMsg({ kind: 'err', text: c.reason }) }}
            aria-invalid={msg?.kind === 'err'} aria-describedby={`${id}-m`} disabled={off}
          />
          <button type="button" aria-label="Increase quantity" onClick={() => bump(1)} disabled={off}>+</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={off}>
          {paused ? 'Orders paused' : !product.available || !v.available ? 'Unavailable' : 'Add to order'}
        </button>
      </div>
      <div id={`${id}-m`} aria-live="polite" role="status">
        {msg?.kind === 'err' && <p className="err">{msg.text}</p>}
        {msg?.kind === 'ok' && <p className="ok-note">{msg.text} <Link to="/cart" style={{ fontWeight: 700 }}>View order</Link></p>}
      </div>
    </div>
  )
}

export function ProductCard({ product, settings, index, sizes }: { product: Product; settings: Settings; index: number; sizes?: string }) {
  const img = product.images[0]
  const prices = product.variants.filter((v) => v.available).map((v) => v.price)
  return (
    <article className={`card ${!product.available ? 'off' : ''}`}>
      <Link to={`/menu/${product.slug}`} className="card-img" aria-hidden="true" tabIndex={-1}>
        {img ? <Media path={img.path} alt="" sizes={sizes ?? '(min-width: 1040px) 380px, (min-width: 720px) 50vw, 112px'} /> : <div className="img-fallback">Photo coming soon</div>}
      </Link>
      <div className="card-body">
        <span className="num">{String(index + 1).padStart(2, '0')}</span>
        <div className="tags">
          {product.is_sample && <span className="tag sample">Sample</span>}
          {product.label && <span className="tag red">{product.label}</span>}
          {!product.available && <span className="tag">Unavailable</span>}
        </div>
        <h3><Link to={`/menu/${product.slug}`}>{product.name}</Link></h3>
        <p className="desc">{product.description}</p>
        {prices.length > 0 && <p className="hint" style={{ marginTop: 6 }}>From {formatINR(Math.min(...prices))}{product.is_sample ? ' (sample price)' : ''}</p>}
      </div>
      <BuyBox product={product} settings={settings} />
    </article>
  )
}
