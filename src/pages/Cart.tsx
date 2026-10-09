import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gate } from '../components/Gate'
import { Media } from '../components/Media'
import { useSeo } from '../components/Seo'
import { useCart } from '../state/CartContext'
import { lineKey } from '../lib/cart'
import { formatINR } from '../lib/money'
import { checkQty, stepQty } from '../lib/quantity'
import { validateCheckout } from '../lib/validation'
import { buildOrderMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from '../lib/whatsapp'
import type { CheckoutDetails, PublicData } from '../lib/types'

export function CartPage() {
  useSeo({ title: 'Your order', description: 'Review your brownie order and send it to The Brownie Press on WhatsApp.', path: '/cart', noindex: true })
  return (
    <div className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <p className="kicker" style={{ color: 'var(--red)' }}>Your order</p>
        <h1 className="display page-title">Review &amp; send</h1>
      </div>
      <Gate minHeight={400}>{(d) => <CartBody d={d} />}</Gate>
    </div>
  )
}

const blank: CheckoutDetails = { name: '', fulfilment: 'pickup', areaId: '', address: '', when: '', notes: '' }

function CartBody({ d }: { d: PublicData }) {
  const s = d.settings
  const cart = useCart()
  const [det, setDet] = useState<CheckoutDetails>(blank)
  const [errs, setErrs] = useState<ReturnType<typeof validateCheckout>>({})
  const [stage, setStage] = useState<'edit' | 'review'>('edit')
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('')

  const resolved = cart.resolve(det)
  const waReady = !!normalizeWhatsAppNumber(s.whatsapp_number)

  if (!resolved || resolved.empty) {
    return (
      <div className="wrap"><div className="empty">
        <h2>Your order is empty</h2>
        <p className="muted">Add a few brownies and they’ll show up here.</p>
        <p style={{ marginTop: 16 }}><Link className="btn btn-primary" to="/menu">Browse the menu</Link></p>
      </div></div>
    )
  }

  const priceChanged = resolved.lines.some((l) => l.issues.some((i) => i.kind === 'price'))
  const set = <K extends keyof CheckoutDetails>(k: K, v: CheckoutDetails[K]) => { setDet((x) => ({ ...x, [k]: v })); setStage('edit'); setOpened(false) }
  const blocked = resolved.blocking || priceChanged || s.ordering_paused || !waReady

  const review = () => {
    const e = validateCheckout(det, s)
    setErrs(e)
    if (Object.keys(e).length) { document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth' }); return }
    setStage('review'); setOpened(false)
  }

  // Message is always generated from the freshly resolved cart (current prices / availability / rules).
  const message = buildOrderMessage(resolved, det, s)
  const link = buildWhatsAppUrl(s.whatsapp_number, message)

  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied('ok') } catch { setCopied('fail') }
  }

  return (
    <div className="wrap cart-grid">
      <div>
        {s.ordering_paused && <p className="notice warn" role="alert" style={{ marginBottom: 16 }}>Orders are paused right now, so checkout is unavailable. You can keep your order here and come back.</p>}
        {!waReady && <p className="notice warn" role="alert" style={{ marginBottom: 16 }}>Checkout is unavailable because the WhatsApp number isn’t configured.</p>}
        {priceChanged && (
          <div className="notice warn" role="alert" style={{ marginBottom: 16 }}>
            Some prices have changed since you added them. Please check the updated prices below.
            <p style={{ marginTop: 10 }}><button className="btn btn-sm" onClick={cart.acceptAll}>Accept updated prices</button></p>
          </div>
        )}

        <ul aria-label="Items in your order">
          {resolved.lines.map((r) => {
            const key = lineKey(r.line)
            const img = r.product?.images[0]
            return (
              <li className="line" key={key}>
                <div className="thumb">{img ? <Media path={img.path} alt="" sizes="72px" /> : null}</div>
                <div>
                  <h3>{r.product?.name ?? 'Unavailable item'}</h3>
                  <p className="hint">{r.variant ? `${r.variant.name} · ${formatINR(r.unit)} each` : ''}</p>
                </div>
                <p className="lt">{r.variant ? formatINR(r.total) : '—'}</p>
                <div className="ctrl">
                  {r.variant && (
                    <div className="stepper" role="group" aria-label={`Quantity for ${r.product?.name}, ${r.variant.name}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={r.qty <= r.variant.min_qty} onClick={() => cart.setQty(key, stepQty(r.variant!, r.qty, -1))}>−</button>
                      <input
                        inputMode="numeric" value={r.qty} aria-label="Quantity"
                        onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); cart.setQty(key, n > 0 ? n : r.variant!.min_qty) }}
                        aria-invalid={r.issues.some((i) => i.kind === 'qty')}
                      />
                      <button type="button" aria-label="Increase quantity" onClick={() => cart.setQty(key, stepQty(r.variant!, r.qty, 1))}>+</button>
                    </div>
                  )}
                  <button className="linkbtn" onClick={() => cart.remove(key)} aria-label={`Remove ${r.product?.name ?? 'item'} ${r.variant?.name ?? ''}`}>Remove</button>
                  {r.variant && !checkQty(r.variant, r.qty).ok && (
                    <button className="linkbtn" onClick={() => cart.setQty(key, stepQty(r.variant!, r.qty, 1))}>Fix quantity</button>
                  )}
                </div>
                {r.issues.map((i, n) => <p key={n} role="alert" className={`issue ${i.kind === 'price' ? 'note' : ''}`}>{i.message}</p>)}
              </li>
            )
          })}
        </ul>

        <form id="checkout-form" className="form" style={{ marginTop: 36 }} noValidate onSubmit={(e) => { e.preventDefault(); review() }}>
          <h2 className="display" style={{ fontSize: '2.2rem' }}>Your details</h2>
          <div className="field">
            <label htmlFor="c-name">Your name</label>
            <input id="c-name" className="input" autoComplete="name" value={det.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errs.name} aria-describedby="e-name" maxLength={60} />
            {errs.name && <p id="e-name" className="err">{errs.name}</p>}
          </div>
          <fieldset className="field radios-wrap" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Pickup or delivery</legend>
            <div className="radios">
              {s.pickup_enabled && <label><input type="radio" name="ful" checked={det.fulfilment === 'pickup'} onChange={() => set('fulfilment', 'pickup')} /> Pickup</label>}
              {s.delivery_enabled && <label><input type="radio" name="ful" checked={det.fulfilment === 'delivery'} onChange={() => set('fulfilment', 'delivery')} /> Delivery</label>}
            </div>
            {errs.fulfilment && <p className="err">{errs.fulfilment}</p>}
            {det.fulfilment === 'pickup' && s.pickup_note && <p className="hint">{s.pickup_note}</p>}
            {det.fulfilment === 'delivery' && s.delivery_note && <p className="hint">{s.delivery_note}</p>}
          </fieldset>
          {det.fulfilment === 'delivery' && (
            <>
              {s.delivery_areas.length > 0 && (
                <div className="field">
                  <label htmlFor="c-area">Delivery area</label>
                  <select id="c-area" className="select" value={det.areaId} onChange={(e) => set('areaId', e.target.value)} aria-invalid={!!errs.areaId}>
                    <option value="">Choose your area</option>
                    {s.delivery_areas.map((a) => <option key={a.id} value={a.id}>{a.name}{a.charge !== null ? ` (+${formatINR(a.charge)})` : ''}</option>)}
                  </select>
                  {errs.areaId && <p className="err">{errs.areaId}</p>}
                </div>
              )}
              <div className="field">
                <label htmlFor="c-addr">Delivery address</label>
                <textarea id="c-addr" className="textarea" autoComplete="street-address" value={det.address} onChange={(e) => set('address', e.target.value)} aria-invalid={!!errs.address} maxLength={300} />
                <p className="hint">Included only in your WhatsApp message. It isn’t saved on this website.</p>
                {errs.address && <p className="err">{errs.address}</p>}
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="c-when">Preferred date (optional)</label>
            <input id="c-when" type="date" className="input" value={det.when} onChange={(e) => set('when', e.target.value)} min={new Date().toISOString().slice(0, 10)} aria-invalid={!!errs.when} />
            {s.lead_time_note && <p className="hint">{s.lead_time_note}</p>}
            {errs.when && <p className="err">{errs.when}</p>}
          </div>
          <div className="field">
            <label htmlFor="c-notes">Notes (optional)</label>
            <textarea id="c-notes" className="textarea" value={det.notes} onChange={(e) => set('notes', e.target.value)} maxLength={500} aria-invalid={!!errs.notes} />
            {errs.notes && <p className="err">{errs.notes}</p>}
          </div>
          <button className="btn btn-primary" type="submit" disabled={blocked}>Review my order</button>
          {blocked && !s.ordering_paused && waReady && <p className="hint">Please fix the items marked above to continue.</p>}
        </form>

        {stage === 'review' && !blocked && (
          <section aria-labelledby="rev-h" style={{ marginTop: 36 }}>
            <h2 id="rev-h" className="display" style={{ fontSize: '2.2rem', marginBottom: 12 }}>Final check</h2>
            <p className="hint" style={{ marginBottom: 10 }}>This is the message that will be prefilled in WhatsApp. You send it yourself.</p>
            <pre className="preview" tabIndex={0} aria-label="Order message preview">{message}</pre>
            <div className="hero-cta">
              {link.ok ? (
                <a className="btn btn-primary" href={link.url!} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>Open WhatsApp</a>
              ) : <p className="err" role="alert">{link.error}</p>}
              <button className="btn" onClick={copy} type="button">Copy message</button>
              <button className="btn" onClick={() => setStage('edit')} type="button">Edit details</button>
            </div>
            {link.tooLong && <p className="notice warn" style={{ marginTop: 12 }}>Your order is long, so WhatsApp may cut the prefilled text. If so, use “Copy message” and paste it into the chat.</p>}
            <p aria-live="polite" className="hint" style={{ marginTop: 8 }}>{copied === 'ok' ? 'Message copied.' : copied === 'fail' ? 'Couldn’t copy automatically. Select the text above and copy it.' : ''}</p>
            {opened && (
              <div className="notice" role="status" style={{ marginTop: 14 }}>
                <strong>WhatsApp should now open with your message ready.</strong> Tap Send there. Nothing is sent from this website, and your order is only a request until we confirm availability and the final amount on WhatsApp.
                <p style={{ marginTop: 10 }}><button className="btn btn-sm" onClick={() => { cart.clear(); setDet(blank); setStage('edit'); setOpened(false) }}>I’ve sent it: clear my order</button></p>
              </div>
            )}
          </section>
        )}
      </div>

      <aside className="summary" aria-labelledby="sum-h">
        <h2 id="sum-h">Summary</h2>
        <dl>
          <div><dt>Pieces</dt><dd>{resolved.pieces}</dd></div>
          <div><dt>Subtotal</dt><dd>{formatINR(resolved.subtotal)}</dd></div>
          {det.fulfilment === 'delivery' && (
            <div><dt>Delivery</dt><dd>{resolved.delivery !== null ? formatINR(resolved.delivery) : 'To be confirmed'}</dd></div>
          )}
          <div className="total"><dt>Estimated total</dt><dd>{formatINR(resolved.estimatedTotal)}{resolved.deliveryPending ? ' +' : ''}</dd></div>
        </dl>
        <p className="hint" style={{ marginTop: 12 }}>
          {resolved.deliveryPending ? 'Delivery charge will be confirmed on WhatsApp. ' : ''}
          This is an estimate, not a final bill. No payment is taken on this website; the owner confirms your order and amount on WhatsApp.
        </p>
        {resolved.lines.some((l) => l.product?.is_sample) && <p className="hint" style={{ marginTop: 8 }}>Your order includes sample items with provisional prices.</p>}
      </aside>
    </div>
  )
}
