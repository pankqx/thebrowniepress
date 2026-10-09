import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { Field } from './ui'
import { newId } from './api'
import { normalizeWhatsAppNumber } from '../lib/whatsapp'
import type { Settings } from '../lib/types'

interface AreaDraft { id: string; name: string; charge: string }

export function SettingsPage() {
  const { data, api, run, busy, toast } = useAdmin()
  const s0 = data.settings
  const [s, setS] = useState<Settings>(() => structuredClone(s0))
  const [areas, setAreas] = useState<AreaDraft[]>(() => s0.delivery_areas.map((a) => ({ id: a.id, name: a.name, charge: a.charge === null ? '' : String(a.charge) })))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }))
  const txt = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, (e.target.value.trim() ? e.target.value : null) as never)
  const wa = normalizeWhatsAppNumber(s.whatsapp_number)

  const save = async () => {
    const e: Record<string, string> = {}
    if (!wa) e.whatsapp_number = 'Enter a valid number, for example +91 90719 83473.'
    if (s.instagram_url && !/^https:\/\/\S+$/.test(s.instagram_url)) e.instagram_url = 'Use the full link starting with https://'
    if (s.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.contact_email)) e.contact_email = 'That email doesn’t look right.'
    if (!Number.isInteger(s.bulk_min) || s.bulk_min < 1 || s.bulk_min > 1000) e.bulk_min = 'Enter a whole number from 1 to 1000.'
    if (s.orders_milestone !== null && (!Number.isInteger(s.orders_milestone) || s.orders_milestone < 0)) e.orders_milestone = 'Enter a whole number, or leave it empty.'
    const delivery_areas = areas.filter((a) => a.name.trim()).map((a) => ({ id: a.id, name: a.name.trim(), charge: a.charge.trim() === '' ? null : Number(a.charge) }))
    if (delivery_areas.some((a) => a.charge !== null && (!Number.isFinite(a.charge) || a.charge < 0))) e.areas = 'Delivery charges must be numbers (or empty if not confirmed yet).'
    setErrs(e)
    if (Object.keys(e).length) { toast('err', 'Please fix the highlighted fields.'); return }
    await run(() => api.saveSettings({ ...s, whatsapp_number: s.whatsapp_number.trim(), delivery_areas }), 'Settings saved. They’re live on the website now.')
  }

  return (
    <form className="a-stack" noValidate onSubmit={(e) => { e.preventDefault(); void save() }}>
      <h1>Business settings</h1>
      <section className="a-card a-stack"><h2>Orders</h2>
        <Field label="WhatsApp number" htmlFor="s-wa" error={errs.whatsapp_number} hint={wa ? `Customers’ messages go to wa.me/${wa}` : undefined}>
          <input id="s-wa" className="a-input" inputMode="tel" value={s.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} aria-invalid={!!errs.whatsapp_number} />
        </Field>
        {wa && <p><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">Test this number in WhatsApp ↗</a></p>}
        <label className="a-check"><input type="checkbox" checked={s.ordering_paused} onChange={(e) => set('ordering_paused', e.target.checked)} /> Pause orders (customers can browse but not order)</label>
        <Field label="Announcement banner (optional)" htmlFor="s-an" hint="Shown at the top of every page, for example “Closed 24–26 Dec”."><input id="s-an" className="a-input" maxLength={200} value={s.announcement ?? ''} onChange={txt('announcement')} /></Field>
        <Field label="Bulk order minimum (pieces)" htmlFor="s-bm" error={errs.bulk_min}><input id="s-bm" className="a-input" inputMode="numeric" value={Number.isFinite(s.bulk_min) ? s.bulk_min : ''} onChange={(e) => set('bulk_min', e.target.value === '' ? NaN : Number(e.target.value))} /></Field>
        <Field label="Lead time guidance (optional)" htmlFor="s-lt" hint="For example “Please order 2 days ahead for bulk orders”."><textarea id="s-lt" className="a-input" rows={2} maxLength={500} value={s.lead_time_note ?? ''} onChange={txt('lead_time_note')} /></Field>
        <p className="a-hint">Currency: Indian rupees (₹). This is fixed.</p>
      </section>

      <section className="a-card a-stack"><h2>Pickup &amp; delivery</h2>
        <label className="a-check"><input type="checkbox" checked={s.pickup_enabled} onChange={(e) => set('pickup_enabled', e.target.checked)} /> Offer pickup</label>
        <Field label="Pickup note (optional)" htmlFor="s-pn"><input id="s-pn" className="a-input" maxLength={500} value={s.pickup_note ?? ''} onChange={txt('pickup_note')} /></Field>
        <label className="a-check"><input type="checkbox" checked={s.delivery_enabled} onChange={(e) => set('delivery_enabled', e.target.checked)} /> Offer delivery</label>
        <Field label="Delivery note (optional)" htmlFor="s-dn"><input id="s-dn" className="a-input" maxLength={500} value={s.delivery_note ?? ''} onChange={txt('delivery_note')} /></Field>
        <fieldset className="a-fieldset"><legend>Delivery areas &amp; charges</legend>
          <p className="a-hint">Leave the list empty if you haven’t decided. Customers are then asked for an address and told the charge is confirmed on WhatsApp. Leave a charge empty to say “to be confirmed”.</p>
          <ul className="a-list">
            {areas.map((a) => (
              <li key={a.id} className="a-item">
                <Field label="Area name" htmlFor={`an-${a.id}`}><input id={`an-${a.id}`} className="a-input" value={a.name} maxLength={60} onChange={(e) => setAreas((x) => x.map((y) => (y.id === a.id ? { ...y, name: e.target.value } : y)))} /></Field>
                <Field label="Charge (₹)" htmlFor={`ac-${a.id}`}><input id={`ac-${a.id}`} className="a-input" inputMode="decimal" value={a.charge} onChange={(e) => setAreas((x) => x.map((y) => (y.id === a.id ? { ...y, charge: e.target.value } : y)))} /></Field>
                <button type="button" className="a-btn danger" onClick={() => setAreas((x) => x.filter((y) => y.id !== a.id))}>Remove</button>
              </li>
            ))}
          </ul>
          {errs.areas && <p className="a-err" role="alert">{errs.areas}</p>}
          <button type="button" className="a-btn" onClick={() => setAreas((x) => [...x, { id: newId(), name: '', charge: '' }])}>+ Add area</button>
        </fieldset>
      </section>

      <section className="a-card a-stack"><h2>About &amp; contact</h2>
        <Field label="Short description of the brand" htmlFor="s-bd"><textarea id="s-bd" className="a-input" rows={2} maxLength={500} value={s.brand_description} onChange={(e) => set('brand_description', e.target.value)} /></Field>
        <Field label="Founder’s name (optional)" htmlFor="s-fn"><input id="s-fn" className="a-input" maxLength={80} value={s.founder_name ?? ''} onChange={txt('founder_name')} /></Field>
        <Field label="Your story" htmlFor="s-fs" hint="Separate paragraphs with a blank line."><textarea id="s-fs" className="a-input" rows={6} maxLength={3000} value={s.founder_story ?? ''} onChange={txt('founder_story')} /></Field>
        <Field label="Ingredients &amp; sourcing note (optional)" htmlFor="s-in" hint="Only write what is true. If empty, the site invites customers to ask you."><textarea id="s-in" className="a-input" rows={3} maxLength={1000} value={s.ingredients_note ?? ''} onChange={txt('ingredients_note')} /></Field>
        <Field label="Orders completed (optional)" htmlFor="s-om" error={errs.orders_milestone} hint="Shown as “300+ orders completed”. Leave empty to hide."><input id="s-om" className="a-input" inputMode="numeric" value={s.orders_milestone ?? ''} onChange={(e) => set('orders_milestone', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Location" htmlFor="s-lo"><input id="s-lo" className="a-input" maxLength={120} value={s.location_text} onChange={(e) => set('location_text', e.target.value)} /></Field>
        <Field label="Business hours (optional)" htmlFor="s-bh"><textarea id="s-bh" className="a-input" rows={2} maxLength={500} value={s.business_hours ?? ''} onChange={txt('business_hours')} /></Field>
        <Field label="Instagram link (optional)" htmlFor="s-ig" error={errs.instagram_url}><input id="s-ig" className="a-input" inputMode="url" placeholder="https://instagram.com/…" value={s.instagram_url ?? ''} onChange={txt('instagram_url')} /></Field>
        <Field label="Contact email (optional)" htmlFor="s-em" error={errs.contact_email}><input id="s-em" className="a-input" inputMode="email" value={s.contact_email ?? ''} onChange={txt('contact_email')} /></Field>
      </section>
      <div className="a-sticky"><button className="a-btn primary" disabled={busy}>Save settings</button></div>
    </form>
  )
}
