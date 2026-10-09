import { useState } from 'react'
import { Gate } from '../components/Gate'
import { useSeo } from '../components/Seo'
import { validateBulk } from '../lib/validation'
import { buildBulkMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from '../lib/whatsapp'
import type { PublicData } from '../lib/types'

const OCCASIONS = ['Birthday', 'Office celebration', 'Party', 'Event', 'Gifting', 'Other']

export function BulkPage() {
  useSeo({ title: 'Bulk brownie orders in Mangalore', description: 'Order brownies in bulk in Mangalore for birthdays, office celebrations, parties, events and gifting. Request a quote on WhatsApp.', path: '/bulk' })
  return (
    <div className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <p className="kicker" style={{ color: 'var(--red)' }}>Made to share</p>
        <h1 className="display page-title">Bulk orders</h1>
      </div>
      <Gate minHeight={500}>{(d) => <BulkBody d={d} />}</Gate>
    </div>
  )
}

function BulkBody({ d }: { d: PublicData }) {
  const s = d.settings
  const [f, setF] = useState({ name: '', occasion: '', pieces: String(s.bulk_min), when: '', notes: '' })
  const [prods, setProds] = useState<string[]>([])
  const [errs, setErrs] = useState<Record<string, string | undefined>>({})
  const [show, setShow] = useState(false)
  const higher = d.products.flatMap((p) => p.variants.filter((v) => v.min_qty > s.bulk_min).map((v) => `${p.name} (${v.name}): minimum ${v.min_qty}`))
  const msg = buildBulkMessage({ name: f.name, occasion: f.occasion, pieces: Number(f.pieces), when: f.when, products: prods, notes: f.notes })
  const link = buildWhatsAppUrl(s.whatsapp_number, msg)
  const ready = !!normalizeWhatsAppNumber(s.whatsapp_number)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er = validateBulk({ name: f.name, occasion: f.occasion, pieces: Number(f.pieces), when: f.when }, s.bulk_min)
    setErrs(er); setShow(Object.keys(er).length === 0)
  }
  const up = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setShow(false) }

  return (
    <div className="wrap" style={{ display: 'grid', gap: 48 }}>
      <div className="prose">
        <p style={{ fontSize: '1.125rem' }}>Birthdays, office celebrations, parties, events and gifting: bulk orders start at <strong>{s.bulk_min} pieces</strong>. Tell us what you’re planning and we’ll reply on WhatsApp with availability and a final quote.</p>
        {higher.length > 0 && <><h2>Higher minimums</h2><ul>{higher.map((h) => <li key={h}>{h}</li>)}</ul></>}
        {s.lead_time_note && <p><strong>Lead time:</strong> {s.lead_time_note}</p>}
      </div>
      <form className="form" noValidate onSubmit={submit} style={{ maxWidth: 640 }} aria-label="Bulk order enquiry">
        <div className="field">
          <label htmlFor="b-name">Your name</label>
          <input id="b-name" className="input" value={f.name} onChange={(e) => up('name', e.target.value)} aria-invalid={!!errs.name} autoComplete="name" />
          {errs.name && <p className="err">{errs.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="b-occ">Occasion</label>
          <select id="b-occ" className="select" value={f.occasion} onChange={(e) => up('occasion', e.target.value)} aria-invalid={!!errs.occasion}>
            <option value="">Choose one</option>{OCCASIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          {errs.occasion && <p className="err">{errs.occasion}</p>}
        </div>
        <div className="field">
          <label htmlFor="b-pcs">Approximate pieces (minimum {s.bulk_min})</label>
          <input id="b-pcs" className="input" inputMode="numeric" value={f.pieces} onChange={(e) => up('pieces', e.target.value.replace(/\D/g, ''))} aria-invalid={!!errs.pieces} />
          {errs.pieces && <p className="err">{errs.pieces}</p>}
        </div>
        {d.products.length > 0 && (
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Interested in (optional)</legend>
            <div className="radios">
              {d.products.map((p) => (
                <label key={p.id}><input type="checkbox" checked={prods.includes(p.name)} onChange={(e) => { setProds((x) => (e.target.checked ? [...x, p.name] : x.filter((n) => n !== p.name))); setShow(false) }} /> {p.name}</label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="field">
          <label htmlFor="b-when">Needed by (optional)</label>
          <input id="b-when" type="date" className="input" value={f.when} min={new Date().toISOString().slice(0, 10)} onChange={(e) => up('when', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="b-notes">Notes (optional)</label>
          <textarea id="b-notes" className="textarea" value={f.notes} onChange={(e) => up('notes', e.target.value)} maxLength={500} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={!ready}>Preview enquiry</button>
        {!ready && <p className="err">The WhatsApp number isn’t configured, so bulk enquiries are unavailable.</p>}
        {show && link.ok && (
          <div>
            <pre className="preview" tabIndex={0} aria-label="Enquiry message preview">{msg}</pre>
            <p className="hero-cta"><a className="btn btn-primary" href={link.url!} target="_blank" rel="noopener noreferrer">Open WhatsApp</a></p>
            <p className="hint" style={{ marginTop: 8 }}>You’ll send the message yourself in WhatsApp. This is an enquiry, not a confirmed booking.</p>
          </div>
        )}
      </form>
    </div>
  )
}
