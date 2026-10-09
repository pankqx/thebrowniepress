import { Link } from 'react-router-dom'
import { useAdmin } from './AdminContext'
import { Badge } from './ui'
import { MODE, SITE_URL } from '../config/env'
import { normalizeWhatsAppNumber } from '../lib/whatsapp'
import type { AdminData } from '../lib/types'

export interface Check { id: string; label: string; ok: boolean; required: boolean; detail: string; fix?: { to: string; label: string } }

export function launchChecks(d: AdminData): Check[] {
  const live = d.products.filter((p) => p.status === 'published')
  const samples = d.products.filter((p) => p.is_sample).length + d.gallery.filter((g) => g.is_sample).length
  const priced = live.filter((p) => p.variants.some((v) => v.available && v.price > 0))
  const realPhotos = live.filter((p) => p.images.some((i) => !i.path.startsWith('static:')))
  const wa = normalizeWhatsAppNumber(d.settings.whatsapp_number)
  return [
    { id: 'backend', label: 'Real database connected', ok: MODE === 'supabase', required: true,
      detail: MODE === 'supabase' ? 'Connected to Supabase.' : 'Demo mode: data is saved only in this browser and is not secure.', fix: { to: '', label: '' } },
    { id: 'whatsapp', label: 'WhatsApp number is valid', ok: !!wa, required: true, detail: wa ? `Orders go to +${wa}.` : 'Enter a valid number in Settings.', fix: { to: '/admin/settings', label: 'Open Settings' } },
    { id: 'samples', label: 'No sample products or sample photos left', ok: samples === 0, required: true,
      detail: samples ? `${samples} sample item${samples > 1 ? 's' : ''} still here. Sample items can never go live.` : 'All content is yours.', fix: { to: '/admin/products', label: 'Replace samples' } },
    { id: 'live', label: 'At least one confirmed product is published with a price', ok: priced.length > 0, required: true,
      detail: `${priced.length} published product${priced.length === 1 ? '' : 's'} with prices.`, fix: { to: '/admin/products', label: 'Open Products' } },
    { id: 'photos', label: 'Published products use your own photos', ok: live.length > 0 && realPhotos.length === live.length, required: false,
      detail: live.length ? `${realPhotos.length} of ${live.length} have your own photo.` : 'Nothing published yet.', fix: { to: '/admin/products', label: 'Add photos' } },
    { id: 'confirmed', label: 'You have confirmed the live menu and prices', ok: d.settings.menu_confirmed, required: true,
      detail: d.settings.menu_confirmed ? 'Confirmed by you.' : 'Tick the confirmation below once the menu and prices are right.' },
    { id: 'site', label: 'Website address is configured', ok: !!SITE_URL, required: false,
      detail: SITE_URL ? SITE_URL : 'VITE_SITE_URL isn’t set. Search engines get no sitemap or canonical links until you set it (docs/DEPLOYMENT.md).' },
    { id: 'insta', label: 'Instagram link added', ok: !!d.settings.instagram_url, required: false, detail: d.settings.instagram_url ?? 'Optional.', fix: { to: '/admin/settings', label: 'Open Settings' } },
    { id: 'delivery', label: 'Delivery areas and charges confirmed', ok: !d.settings.delivery_enabled || (d.settings.delivery_areas.length > 0 && d.settings.delivery_areas.every((a) => a.charge !== null)), required: false,
      detail: 'Until confirmed, customers are told the delivery charge will be confirmed on WhatsApp.', fix: { to: '/admin/settings', label: 'Open Settings' } },
  ]
}

export function Overview() {
  const { data: d, api, run, busy } = useAdmin()
  const checks = launchChecks(d)
  const ready = checks.filter((c) => c.required).every((c) => c.ok)
  const count = (s: string) => d.products.filter((p) => p.status === s).length
  return (
    <div className="a-stack">
      <h1>Welcome back</h1>
      <section className={`a-card ${ready ? 'good' : 'warn'}`} aria-labelledby="st">
        <h2 id="st">{ready ? 'Ready to launch' : 'Not ready to launch yet'}</h2>
        <p>{ready ? 'All required checks pass.' : `${checks.filter((c) => c.required && !c.ok).length} required item(s) still need attention.`} <Link to="/admin/launch">See the launch check</Link></p>
      </section>
      <div className="a-grid">
        <Stat label="Published products" value={count('published')} to="/admin/products" />
        <Stat label="Draft products" value={count('draft')} to="/admin/products" />
        <Stat label="Published photos" value={d.gallery.filter((g) => g.status === 'published').length} to="/admin/gallery" />
        <Stat label="Feedback shown" value={d.testimonials.filter((t) => t.status === 'published').length} to="/admin/feedback" />
      </div>
      <section className="a-card" aria-labelledby="ord">
        <h2 id="ord">Taking orders</h2>
        <p>{d.settings.ordering_paused ? 'Orders are PAUSED. Customers can browse but not order.' : 'Orders are open. Customers can send you requests on WhatsApp.'}</p>
        <button className={`a-btn ${d.settings.ordering_paused ? 'primary' : ''}`} disabled={busy}
          onClick={() => run(() => api.saveSettings({ ...d.settings, ordering_paused: !d.settings.ordering_paused }), d.settings.ordering_paused ? 'Orders are open.' : 'Orders paused.')}>
          {d.settings.ordering_paused ? 'Resume orders' : 'Pause orders'}
        </button>
      </section>
      <p className="a-hint">Orders arrive on your WhatsApp, not in this dashboard, so there are no order statistics here.</p>
    </div>
  )
}

const Stat = ({ label, value, to }: { label: string; value: number; to: string }) => (
  <Link to={to} className="a-stat"><span className="n">{value}</span><span>{label}</span></Link>
)

export function Launch() {
  const { data: d, api, run, busy, confirm } = useAdmin()
  const checks = launchChecks(d)
  const ready = checks.filter((c) => c.required).every((c) => c.ok)
  const hasSamples = d.products.some((p) => p.is_sample) || d.gallery.some((g) => g.is_sample)
  return (
    <div className="a-stack">
      <h1>Launch check</h1>
      <p>Nothing here changes the live website by itself. It tells you whether the content is safe to show customers. Changes you publish elsewhere in the dashboard appear on the website straight away, with no redeploy.</p>
      <section className={`a-card ${ready ? 'good' : 'warn'}`}><h2>{ready ? 'Ready to launch' : 'Not ready yet'}</h2></section>
      <ul className="a-checks">
        {checks.map((c) => (
          <li key={c.id}>
            <Badge kind={c.ok ? 'ok' : c.required ? 'warn' : 'off'}>{c.ok ? 'Done' : c.required ? 'Required' : 'Optional'}</Badge>
            <div><strong>{c.label}</strong><p className="a-hint">{c.detail}</p></div>
            {!c.ok && c.fix?.to && <Link className="a-btn" to={c.fix.to}>{c.fix.label}</Link>}
          </li>
        ))}
      </ul>
      <section className="a-card">
        <h2>Confirm your menu</h2>
        <label className="a-check"><input type="checkbox" checked={d.settings.menu_confirmed} disabled={busy}
          onChange={(e) => run(() => api.saveSettings({ ...d.settings, menu_confirmed: e.target.checked }), 'Saved.')} />
          I have checked that every published product, description, price and minimum quantity is correct.</label>
      </section>
      {hasSamples && (
        <section className="a-card warn">
          <h2>Sample data</h2>
          <p>The starter menu and photos are examples based on your reference menu. Remove them in one step, then add your real products.</p>
          <button className="a-btn danger" disabled={busy} onClick={async () => {
            if (await confirm({ title: 'Remove all sample data?', body: 'This deletes every sample product and sample gallery photo. Your own products are not touched.', confirmLabel: 'Remove samples', danger: true }))
              await run(() => api.removeSamples(), 'Sample data removed.')
          }}>Remove all sample data</button>
        </section>
      )}
    </div>
  )
}
