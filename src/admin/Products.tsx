import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdmin } from './AdminContext'
import { AdminImage, Badge, Field, moved } from './ui'
import { newId } from './api'
import { prepareImage } from './image'
import { slugify } from '../lib/validation'
import { formatINR } from '../lib/money'
import type { AdminData, Product, PublishStatus, Variant } from '../lib/types'

const priceRange = (p: Product) => {
  const v = p.variants.map((x) => x.price)
  return v.length ? (Math.min(...v) === Math.max(...v) ? formatINR(v[0]) : `${formatINR(Math.min(...v))} – ${formatINR(Math.max(...v))}`) : 'No prices yet'
}

export function ProductsPage() {
  const { data, api, run, busy, confirm, toast } = useAdmin()
  const [filter, setFilter] = useState<'all' | PublishStatus>('all')
  const all = [...data.products].sort((a, b) => a.sort_order - b.sort_order)
  const list = all.filter((p) => filter === 'all' || p.status === filter)
  const samples = all.filter((p) => p.is_sample).length

  const toggle = async (p: Product) => {
    if (p.status !== 'published') {
      if (p.is_sample) { toast('err', 'This is a sample item. Open it, check the details and tick “confirmed” before publishing.'); return }
      if (!p.variants.some((v) => v.available)) { toast('err', 'Add at least one available option with a price before publishing.'); return }
    }
    await run(() => api.setProductStatus(p.id, p.status === 'published' ? 'draft' : 'published'), p.status === 'published' ? 'Unpublished. Customers can no longer see it.' : 'Published. It’s live now.')
  }

  return (
    <div className="a-stack">
      <div className="a-row between"><h1>Products</h1><Link className="a-btn primary" to="/admin/products/new">+ New product</Link></div>
      {samples > 0 && (
        <p className="a-banner warn" role="note">{samples} sample product{samples > 1 ? 's' : ''} below. Open each one, replace the details, tick “confirmed”, then publish. Or remove all samples on the <Link to="/admin/launch">Launch check</Link> page.</p>
      )}
      <div className="a-chips" role="group" aria-label="Filter">
        {(['all', 'published', 'draft', 'archived'] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
      </div>
      {list.length === 0 && <p className="a-card">Nothing here yet.</p>}
      <ul className="a-list">
        {list.map((p) => (
          <li key={p.id} className="a-item">
            <div className="a-thumb">{p.images[0] ? <AdminImage api={api} path={p.images[0].path} bucket="public" alt="" /> : <div className="img-fallback">No photo</div>}</div>
            <div className="grow">
              <strong>{p.name}</strong>
              <p className="a-hint">{priceRange(p)} · {p.variants.length} option{p.variants.length === 1 ? '' : 's'}{p.featured ? ' · Featured' : ''}</p>
              <div className="a-row tight">
                <Badge kind={p.status === 'published' ? 'ok' : 'off'}>{p.status}</Badge>
                {p.is_sample && <Badge kind="sample">Sample</Badge>}
                {!p.available && <Badge kind="warn">Unavailable</Badge>}
              </div>
            </div>
            <div className="a-row wrap">
              <Link className="a-btn" to={`/admin/products/${p.id}`}>Edit</Link>
              <button className="a-btn" disabled={busy} onClick={() => toggle(p)}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button className="a-btn" disabled={busy || filter !== 'all'} aria-label={`Move ${p.name} up`} onClick={() => run(() => api.reorder('products', moved(all, p.id, -1)))}>↑</button>
              <button className="a-btn" disabled={busy || filter !== 'all'} aria-label={`Move ${p.name} down`} onClick={() => run(() => api.reorder('products', moved(all, p.id, 1)))}>↓</button>
              {p.status !== 'archived' && <button className="a-btn" disabled={busy} onClick={async () => { if (await confirm({ title: `Archive “${p.name}”?`, body: 'It disappears from the website but you can bring it back later.', confirmLabel: 'Archive' })) await run(() => api.setProductStatus(p.id, 'archived'), 'Archived.') }}>Archive</button>}
              <button className="a-btn danger" disabled={busy} onClick={async () => { if (await confirm({ title: `Delete “${p.name}” forever?`, body: 'Its options and photos are removed permanently. To just hide it, use Unpublish or Archive instead.', confirmLabel: 'Delete forever', danger: true })) await run(() => api.deleteProduct(p), 'Deleted.') }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function blank(d: AdminData): Product {
  return {
    id: newId(), slug: '', name: '', description: '', category_id: d.categories[0]?.id ?? null, status: 'draft', is_sample: false, featured: false,
    sort_order: Math.max(0, ...d.products.map((p) => p.sort_order)) + 1, available: true, label: null, ingredients: null, allergens: null, lead_time: null,
    variants: [], images: [],
  }
}
const newVariant = (productId: string, n: number): Variant => ({ id: newId(), product_id: productId, name: '', price: 0, min_qty: 1, qty_step: 1, available: true, sort_order: n })

type Errs = { fields: Record<string, string>; variants: Record<string, string> }
export function validateProduct(p: Product, d: AdminData): Errs {
  const fields: Errs['fields'] = {}, variants: Errs['variants'] = {}
  if (!p.name.trim()) fields.name = 'Please give the product a name.'
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) fields.slug = 'Use lowercase letters, numbers and dashes only.'
  else if (d.products.some((x) => x.slug === p.slug && x.id !== p.id)) fields.slug = 'Another product already uses this web address.'
  if (p.description.length > 1000) fields.description = 'Please keep the description under 1000 characters.'
  const seen = new Set<string>()
  for (const v of p.variants) {
    const n = v.name.trim().toLowerCase()
    if (!n) variants[v.id] = 'Give this option a name (for example “Regular”).'
    else if (seen.has(n)) variants[v.id] = 'Two options have the same name.'
    else if (!Number.isFinite(v.price) || v.price < 0 || v.price > 100000) variants[v.id] = 'Enter a price between 0 and 1,00,000.'
    else if (!Number.isInteger(v.min_qty) || v.min_qty < 1 || v.min_qty > 1000) variants[v.id] = 'Minimum quantity must be a whole number from 1.'
    else if (!Number.isInteger(v.qty_step) || v.qty_step < 1 || v.qty_step > 100) variants[v.id] = 'Quantity step must be a whole number from 1.'
    seen.add(n)
  }
  return { fields, variants }
}

function NumInput({ id, value, onChange, label, step }: { id: string; value: number; onChange: (n: number) => void; label: string; step?: string }) {
  return <input id={id} aria-label={label} className="a-input" inputMode="decimal" step={step} defaultValue={Number.isFinite(value) ? String(value) : ''} onChange={(e) => onChange(e.target.value.trim() === '' ? NaN : Number(e.target.value))} />
}

export function ProductEditor() {
  const { id } = useParams()
  const { data } = useAdmin()
  const existing = id ? data.products.find((p) => p.id === id) : undefined
  if (id && !existing) return <div className="a-card"><p>That product no longer exists.</p><Link className="a-btn" to="/admin/products">Back to products</Link></div>
  return <Editor key={id ?? 'new'} initial={existing ?? blank(data)} isNew={!existing} />
}

function Editor({ initial, isNew }: { initial: Product; isNew: boolean }) {
  const { data, api, run, busy, toast } = useAdmin()
  const nav = useNavigate()
  const [p, setP] = useState<Product>(() => structuredClone(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [confirmed, setConfirmed] = useState(!initial.is_sample)
  const [errs, setErrs] = useState<Errs>({ fields: {}, variants: {} })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }))
  const setVar = (vid: string, patch: Partial<Variant>) => setP((x) => ({ ...x, variants: x.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)) }))
  const nullable = (s: string) => (s.trim() ? s : null)

  const save = async (status: PublishStatus) => {
    const next: Product = { ...p, name: p.name.trim(), status, is_sample: confirmed ? false : p.is_sample,
      variants: p.variants.map((v, i) => ({ ...v, name: v.name.trim(), sort_order: i + 1 })), images: p.images.map((x, i) => ({ ...x, sort_order: i + 1 })) }
    const e = validateProduct(next, data)
    setErrs(e)
    if (Object.keys(e.fields).length || Object.keys(e.variants).length) { toast('err', 'Please fix the highlighted fields.'); return }
    if (status === 'published') {
      if (next.is_sample) { toast('err', 'Tick “I’ve confirmed these details” before publishing a sample item.'); return }
      if (!next.variants.some((v) => v.available)) { toast('err', 'Add at least one available option with a price before publishing.'); return }
    }
    if (await run(() => api.saveProduct(next), status === 'published' ? 'Saved and published. It’s live now.' : 'Draft saved.')) nav('/admin/products')
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    for (const f of Array.from(files)) {
      try {
        const blob = await prepareImage(f, 1600)
        const path = await api.upload(blob, 'public')
        setP((x) => ({ ...x, images: [...x.images, { id: newId(), product_id: x.id, path, alt: x.name ? `${x.name}` : '', sort_order: x.images.length + 1 }] }))
      } catch (e) { toast('err', (e as Error).message) }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }
  const moveImg = (i: number, d: -1 | 1) => setP((x) => { const a = [...x.images]; const j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, images: a } })
  const moveVar = (i: number, d: -1 | 1) => setP((x) => { const a = [...x.variants]; const j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, variants: a } })

  return (
    <form className="a-stack" noValidate onSubmit={(e) => { e.preventDefault(); void save(p.status === 'published' ? 'published' : 'draft') }}>
      <div className="a-row between"><h1>{isNew ? 'New product' : `Edit: ${initial.name}`}</h1><Link to="/admin/products" className="a-btn">← Back</Link></div>

      {initial.is_sample && (
        <section className="a-card warn">
          <h2>Sample item</h2>
          <p>This is a starter example with provisional details. Replace anything that isn’t right, then confirm it.</p>
          <label className="a-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I’ve confirmed these details (name, description, photo and prices) are correct.</label>
        </section>
      )}

      <section className="a-card a-stack" aria-labelledby="basics">
        <h2 id="basics">The basics</h2>
        <Field label="Name" htmlFor="pn" error={errs.fields.name}>
          <input id="pn" className="a-input" value={p.name} maxLength={80} aria-invalid={!!errs.fields.name}
            onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} />
        </Field>
        <Field label="Web address part" htmlFor="ps" hint={`Shows as /menu/${p.slug || '…'}`} error={errs.fields.slug}>
          <input id="ps" className="a-input" value={p.slug} aria-invalid={!!errs.fields.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()) }} />
        </Field>
        <Field label="Description" htmlFor="pd" error={errs.fields.description}>
          <textarea id="pd" className="a-input" rows={3} maxLength={1000} value={p.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="a-row wrap">
          <Field label="Category" htmlFor="pc">
            <select id="pc" className="a-input" value={p.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)}>
              <option value="">No category</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Label (optional)" htmlFor="pl" hint="A short tag like “New”. Only add labels that are true.">
            <input id="pl" className="a-input" maxLength={30} value={p.label ?? ''} onChange={(e) => set('label', nullable(e.target.value))} />
          </Field>
        </div>
        <label className="a-check"><input type="checkbox" checked={p.available} onChange={(e) => set('available', e.target.checked)} /> Available to order right now</label>
        <label className="a-check"><input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} /> Show on the home page</label>
      </section>

      <section className="a-card a-stack" aria-labelledby="vars">
        <h2 id="vars">Options &amp; prices</h2>
        <p className="a-hint">Each option (for example Minis, Regular, Box of 6) has its own price and ordering rules. “Minimum” is the smallest order; “steps of” makes customers order in multiples (minimum 6, steps of 2 allows 6, 8, 10…).</p>
        {p.variants.length === 0 && <p className="a-banner warn">Add at least one option so customers can order.</p>}
        <ul className="a-list">
          {p.variants.map((v, i) => (
            <li key={v.id} className="a-item col">
              <div className="a-vgrid">
                <Field label="Option name" htmlFor={`vn-${v.id}`}><input id={`vn-${v.id}`} className="a-input" value={v.name} maxLength={40} onChange={(e) => setVar(v.id, { name: e.target.value })} /></Field>
                <Field label="Price (₹)" htmlFor={`vp-${v.id}`}><NumInput id={`vp-${v.id}`} label="Price in rupees" value={v.price} onChange={(n) => setVar(v.id, { price: n })} /></Field>
                <Field label="Minimum" htmlFor={`vm-${v.id}`}><NumInput id={`vm-${v.id}`} label="Minimum quantity" value={v.min_qty} onChange={(n) => setVar(v.id, { min_qty: n })} /></Field>
                <Field label="In steps of" htmlFor={`vs-${v.id}`}><NumInput id={`vs-${v.id}`} label="Quantity step" value={v.qty_step} onChange={(n) => setVar(v.id, { qty_step: n })} /></Field>
              </div>
              {errs.variants[v.id] && <p className="a-err" role="alert">{errs.variants[v.id]}</p>}
              <div className="a-row wrap">
                <label className="a-check"><input type="checkbox" checked={v.available} onChange={(e) => setVar(v.id, { available: e.target.checked })} /> Available</label>
                <span className="grow" />
                <button type="button" className="a-btn" onClick={() => moveVar(i, -1)} disabled={i === 0} aria-label="Move option up">↑</button>
                <button type="button" className="a-btn" onClick={() => moveVar(i, 1)} disabled={i === p.variants.length - 1} aria-label="Move option down">↓</button>
                <button type="button" className="a-btn danger" onClick={() => set('variants', p.variants.filter((x) => x.id !== v.id))}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="a-btn" onClick={() => set('variants', [...p.variants, newVariant(p.id, p.variants.length + 1)])}>+ Add option</button>
      </section>

      <section className="a-card a-stack" aria-labelledby="imgs">
        <h2 id="imgs">Photos</h2>
        <p className="a-hint">The first photo is the main one. Photos are resized and compressed automatically (JPEG, PNG or WebP, up to 15 MB each).</p>
        <ul className="a-list">
          {p.images.map((im, i) => (
            <li key={im.id} className="a-item">
              <div className="a-thumb"><AdminImage api={api} path={im.path} bucket="public" alt={im.alt} /></div>
              <div className="grow">
                {im.path.startsWith('static:') && <Badge kind="sample">Placeholder, not your photo</Badge>}
                <Field label="Describe the photo (for screen readers)" htmlFor={`ia-${im.id}`}>
                  <input id={`ia-${im.id}`} className="a-input" maxLength={200} value={im.alt} onChange={(e) => set('images', p.images.map((x) => (x.id === im.id ? { ...x, alt: e.target.value } : x)))} />
                </Field>
              </div>
              <div className="a-row wrap">
                <button type="button" className="a-btn" onClick={() => moveImg(i, -1)} disabled={i === 0} aria-label="Move photo up">↑</button>
                <button type="button" className="a-btn" onClick={() => moveImg(i, 1)} disabled={i === p.images.length - 1} aria-label="Move photo down">↓</button>
                <button type="button" className="a-btn danger" onClick={() => set('images', p.images.filter((x) => x.id !== im.id))}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <label className="a-btn" htmlFor="pf" aria-disabled={uploading}>{uploading ? 'Uploading…' : '+ Upload photos'}</label>
          <input id="pf" ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(e) => void upload(e.target.files)} />
        </div>
      </section>

      <details className="a-card">
        <summary><strong>More details (optional)</strong></summary>
        <div className="a-stack" style={{ marginTop: 12 }}>
          <Field label="Ingredients" htmlFor="pi" hint="Only add what you’re sure about. Customers see this on the product page."><textarea id="pi" className="a-input" rows={2} value={p.ingredients ?? ''} onChange={(e) => set('ingredients', nullable(e.target.value))} /></Field>
          <Field label="Allergen information" htmlFor="pa" hint="Leave blank if you haven’t verified it. The site then tells customers to ask you."><textarea id="pa" className="a-input" rows={2} value={p.allergens ?? ''} onChange={(e) => set('allergens', nullable(e.target.value))} /></Field>
          <Field label="Lead time" htmlFor="pt" hint="For example “Order 2 days ahead”."><input id="pt" className="a-input" maxLength={200} value={p.lead_time ?? ''} onChange={(e) => set('lead_time', nullable(e.target.value))} /></Field>
        </div>
      </details>

      <section className="a-card" aria-labelledby="prev">
        <h2 id="prev">Preview</h2>
        <div className="a-preview">
          <div className="a-thumb big">{p.images[0] ? <AdminImage api={api} path={p.images[0].path} bucket="public" alt="" /> : <div className="img-fallback">No photo</div>}</div>
          <div>
            <h3 className="display" style={{ fontSize: '1.6rem' }}>{p.name || 'Product name'}</h3>
            <p className="muted">{p.description || 'Description appears here.'}</p>
            <p>{p.variants.map((v) => `${v.name || 'Option'} ${Number.isFinite(v.price) ? formatINR(v.price) : '—'}${v.min_qty > 1 ? ` (min ${v.min_qty})` : ''}`).join(' · ') || 'No options yet'}</p>
            {!p.available && <p className="a-err">Shown as unavailable.</p>}
          </div>
        </div>
      </section>

      <div className="a-sticky">
        <button type="button" className="a-btn" disabled={busy || uploading} onClick={() => void save('draft')}>Save as draft</button>
        <button type="button" className="a-btn primary" disabled={busy || uploading} onClick={() => void save('published')}>Save &amp; publish</button>
        {!isNew && p.status !== 'archived' && <span className="a-hint">Currently: {p.status}</span>}
      </div>
    </form>
  )
}
