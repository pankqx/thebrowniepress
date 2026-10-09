import { useRef, useState } from 'react'
import { useAdmin } from './AdminContext'
import { AdminImage, Badge, Field, moved } from './ui'
import { newId, type AdminApi, type Bucket } from './api'
import { prepareImage } from './image'
import type { GalleryItem, Testimonial } from '../lib/types'

function Uploader({ label, onFiles, busy }: { label: string; onFiles: (f: FileList) => Promise<void>; busy: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [up, setUp] = useState(false)
  return (
    <div>
      <label className="a-btn primary" htmlFor="up-file" aria-disabled={up || busy}>{up ? 'Uploading…' : label}</label>
      <input id="up-file" ref={ref} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={up || busy}
        onChange={async (e) => { if (!e.target.files?.length) return; setUp(true); try { await onFiles(e.target.files) } finally { setUp(false); if (ref.current) ref.current.value = '' } }} />
    </div>
  )
}

/** Move a file between buckets without ever leaving the website pointing at a missing/private file. */
async function publishMedia<T extends { path: string; bucket: Bucket }>(api: AdminApi, item: T, save: (x: T) => Promise<void>, next: T) {
  const moved = await api.moveMedia(item.path, 'private', 'public')
  try { await save({ ...next, path: moved, bucket: 'public' }) }
  catch (e) { try { await api.moveMedia(moved, 'public', 'private') } catch { /* leave as is; error below tells the owner */ } throw e }
}
async function unpublishMedia<T extends { path: string; bucket: Bucket }>(api: AdminApi, item: T, save: (x: T) => Promise<void>, next: T) {
  await save({ ...next, bucket: 'private' }) // hide from the website first
  try { await api.moveMedia(item.path, 'public', 'private') }
  catch { throw new Error('Hidden from the website, but the file could not be moved to private storage. Press Unpublish again to retry.') }
}

const KINDS: Array<[GalleryItem['kind'], string]> = [['product', 'Brownie close-up'], ['batch', 'Fresh batch'], ['texture', 'Chocolate texture'], ['packaging', 'Packaging'], ['order', 'Completed order'], ['seasonal', 'Seasonal']]

export function GalleryAdmin() {
  const { data, api, run, busy, confirm, toast } = useAdmin()
  const items = [...data.gallery].sort((a, b) => a.sort_order - b.sort_order)
  const add = async (files: FileList) => {
    let n = Math.max(0, ...items.map((i) => i.sort_order))
    for (const f of Array.from(files)) {
      try {
        const path = await api.upload(await prepareImage(f, 1600), 'private')
        await api.saveGallery({ id: newId(), path, bucket: 'private', caption: '', kind: 'product', featured: false, status: 'draft', is_sample: false, sort_order: ++n })
      } catch (e) { toast('err', (e as Error).message) }
    }
    await run(async () => {}, 'Upload finished. New photos are saved as drafts.')
  }
  return (
    <div className="a-stack">
      <h1>Gallery</h1>
      <p>Add photos of your brownies, fresh batches, packaging and completed orders. New photos start as <strong>drafts</strong> and are kept private until you publish them.</p>
      <Uploader label="+ Upload photos" onFiles={add} busy={busy} />
      <ul className="a-list">
        {items.map((g, i) => <GalleryCard key={g.id + g.status + g.caption + g.kind + g.featured} g={g} first={i === 0} last={i === items.length - 1} busy={busy}
          onSave={(x) => run(() => api.saveGallery(x), 'Saved.')}
          onPublish={(x) => run(() => (x.status === 'published' ? unpublishMedia(api, g, api.saveGallery, { ...x, status: 'draft' }) : publishMedia(api, g, api.saveGallery, { ...x, status: 'published' })), x.status === 'published' ? 'Unpublished.' : 'Published. It’s on the website now.')}
          onMove={(d) => run(() => api.reorder('gallery_items', moved(items, g.id, d)))}
          onDelete={async () => { if (await confirm({ title: 'Delete this photo?', body: 'It is removed from the website and from storage permanently.', confirmLabel: 'Delete photo', danger: true })) await run(() => api.deleteGallery(g), 'Deleted.') }}
          api={api} />)}
      </ul>
      {items.length === 0 && <p className="a-card">No photos yet.</p>}
    </div>
  )
}

function GalleryCard({ g, first, last, busy, onSave, onPublish, onMove, onDelete, api }: {
  g: GalleryItem; first: boolean; last: boolean; busy: boolean; api: AdminApi
  onSave: (g: GalleryItem) => void; onPublish: (g: GalleryItem) => void; onMove: (d: -1 | 1) => void; onDelete: () => void
}) {
  const [caption, setCaption] = useState(g.caption)
  const [kind, setKind] = useState(g.kind)
  const [featured, setFeatured] = useState(g.featured)
  const edited = { ...g, caption, kind, featured }
  const dirty = caption !== g.caption || kind !== g.kind || featured !== g.featured
  return (
    <li className="a-item">
      <div className="a-thumb big"><AdminImage api={api} path={g.path} bucket={g.bucket} alt={caption || 'Gallery photo'} /></div>
      <div className="grow a-stack tight">
        <div className="a-row tight"><Badge kind={g.status === 'published' ? 'ok' : 'off'}>{g.status}</Badge>{g.is_sample && <Badge kind="sample">Sample, not your photo</Badge>}</div>
        <Field label="Caption" htmlFor={`gc-${g.id}`}><input id={`gc-${g.id}`} className="a-input" maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
        <Field label="Type" htmlFor={`gk-${g.id}`}><select id={`gk-${g.id}`} className="a-input" value={kind} onChange={(e) => setKind(e.target.value as GalleryItem['kind'])}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <label className="a-check"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Feature this photo (shown first and larger)</label>
        <div className="a-row wrap">
          <button className="a-btn primary" disabled={busy || !dirty} onClick={() => onSave(edited)}>Save details</button>
          <button className="a-btn" disabled={busy || (g.status === 'draft' && g.is_sample)} onClick={() => onPublish(edited)}>{g.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          <button className="a-btn" disabled={busy || first} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
          <button className="a-btn" disabled={busy || last} onClick={() => onMove(1)} aria-label="Move down">↓</button>
          <button className="a-btn danger" disabled={busy} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </li>
  )
}

export function FeedbackPage() {
  const { data, api, run, busy, confirm, toast } = useAdmin()
  const items = [...data.testimonials].sort((a, b) => a.sort_order - b.sort_order)
  const add = async (files: FileList) => {
    let n = Math.max(0, ...items.map((i) => i.sort_order))
    for (const f of Array.from(files)) {
      try {
        const path = await api.upload(await prepareImage(f, 1200), 'private')
        await api.saveTestimonial({ id: newId(), path, bucket: 'private', caption: '', customer_label: '', status: 'draft', privacy_reviewed: false, sort_order: ++n })
      } catch (e) { toast('err', (e as Error).message) }
    }
    await run(async () => {}, 'Uploaded as private drafts. Review each one before publishing.')
  }
  return (
    <div className="a-stack">
      <h1>Customer feedback</h1>
      <section className="a-card warn" aria-labelledby="priv">
        <h2 id="priv">Protect your customers’ privacy</h2>
        <p>Before publishing a screenshot, look closely for anything that identifies someone:</p>
        <ul className="a-bullets">
          <li>Names, nicknames or profile photos</li><li>Phone numbers or email addresses</li><li>Home or delivery addresses</li><li>Order, payment or UPI details</li><li>Other people in the chat</li>
        </ul>
        <p>If you see any of these, ask the customer’s permission or crop/blur the image on your phone and upload the edited version. Only real messages from real customers belong here: never write or edit reviews.</p>
      </section>
      <Uploader label="+ Upload screenshots" onFiles={add} busy={busy} />
      <ul className="a-list">
        {items.map((t, i) => <FeedbackCard key={t.id + t.status + t.caption + t.customer_label + t.privacy_reviewed} t={t} api={api} busy={busy} first={i === 0} last={i === items.length - 1}
          onSave={(x) => run(() => api.saveTestimonial(x), 'Saved.')}
          onPublish={(x) => run(() => (x.status === 'published' ? unpublishMedia(api, t, api.saveTestimonial, { ...x, status: 'draft' }) : publishMedia(api, t, api.saveTestimonial, { ...x, status: 'published' })), x.status === 'published' ? 'Unpublished.' : 'Published. It’s on the website now.')}
          onMove={(d) => run(() => api.reorder('testimonials', moved(items, t.id, d)))}
          onDelete={async () => { if (await confirm({ title: 'Delete this screenshot?', body: 'It is removed from the website and from storage permanently.', confirmLabel: 'Delete', danger: true })) await run(() => api.deleteTestimonial(t), 'Deleted.') }} />)}
      </ul>
      {items.length === 0 && <p className="a-card">No screenshots yet. Nothing is shown on the website until you publish at least one.</p>}
    </div>
  )
}

function FeedbackCard({ t, api, busy, first, last, onSave, onPublish, onMove, onDelete }: {
  t: Testimonial; api: AdminApi; busy: boolean; first: boolean; last: boolean
  onSave: (t: Testimonial) => void; onPublish: (t: Testimonial) => void; onMove: (d: -1 | 1) => void; onDelete: () => void
}) {
  const [caption, setCaption] = useState(t.caption)
  const [label, setLabel] = useState(t.customer_label)
  const [reviewed, setReviewed] = useState(t.privacy_reviewed)
  const edited = { ...t, caption, customer_label: label, privacy_reviewed: reviewed }
  const dirty = caption !== t.caption || label !== t.customer_label || reviewed !== t.privacy_reviewed
  return (
    <li className="a-item">
      <div className="a-thumb tall"><AdminImage api={api} path={t.path} bucket={t.bucket} alt="Customer message screenshot" /></div>
      <div className="grow a-stack tight">
        <Badge kind={t.status === 'published' ? 'ok' : 'off'}>{t.status === 'published' ? 'Published' : 'Private draft'}</Badge>
        <Field label="Customer label (optional)" htmlFor={`fl-${t.id}`} hint="Keep it anonymous, for example “Customer, Kadri” or “Office order”."><input id={`fl-${t.id}`} className="a-input" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field label="Caption (optional)" htmlFor={`fc-${t.id}`}><input id={`fc-${t.id}`} className="a-input" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
        <label className="a-check"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I’ve checked this screenshot for names, phone numbers, profile photos, addresses and other private details.</label>
        <div className="a-row wrap">
          <button className="a-btn primary" disabled={busy || !dirty} onClick={() => onSave(edited)}>Save details</button>
          <button className="a-btn" disabled={busy || dirty || (t.status === 'draft' && !t.privacy_reviewed)} onClick={() => onPublish(edited)}
            title={dirty ? 'Save your changes first' : !t.privacy_reviewed ? 'Tick the privacy check and save first' : undefined}>{t.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          <button className="a-btn" disabled={busy || first} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
          <button className="a-btn" disabled={busy || last} onClick={() => onMove(1)} aria-label="Move down">↓</button>
          <button className="a-btn danger" disabled={busy} onClick={onDelete}>Delete</button>
        </div>
        {dirty && <p className="a-hint">Save your changes to enable publishing.</p>}
      </div>
    </li>
  )
}
