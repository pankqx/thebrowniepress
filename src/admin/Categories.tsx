import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { moved } from './ui'
import { newId } from './api'
import { slugify } from '../lib/validation'
import type { Category } from '../lib/types'

export function CategoriesPage() {
  const { data, api, run, busy, confirm } = useAdmin()
  const cats = [...data.categories].sort((a, b) => a.sort_order - b.sort_order)
  const [name, setName] = useState('')
  return (
    <div className="a-stack">
      <h1>Categories</h1>
      <p>Categories let customers filter the menu. The filter only appears when more than one category has products.</p>
      <ul className="a-list">
        {cats.map((c, i) => <CatRow key={c.id + c.name + c.slug} c={c} first={i === 0} last={i === cats.length - 1}
          onSave={(x) => run(() => api.saveCategory(x), 'Saved.')}
          onMove={(d) => run(() => api.reorder('categories', moved(cats, c.id, d)))}
          onDelete={async () => { if (await confirm({ title: `Delete “${c.name}”?`, body: 'Products in this category stay on the menu but become uncategorised.', confirmLabel: 'Delete', danger: true })) await run(() => api.deleteCategory(c.id), 'Deleted.') }} busy={busy} />)}
      </ul>
      <form className="a-card a-row" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return
        void run(() => api.saveCategory({ id: newId(), name: n, slug: slugify(n) || 'category-' + Date.now(), sort_order: cats.length + 1 }), 'Category added.').then((ok) => ok && setName('')) }}>
        <label className="sr-only" htmlFor="nc">New category name</label>
        <input id="nc" className="a-input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="a-btn primary" disabled={busy || !name.trim()}>Add category</button>
      </form>
    </div>
  )
}

function CatRow({ c, first, last, onSave, onMove, onDelete, busy }: { c: Category; first: boolean; last: boolean; onSave: (c: Category) => void; onMove: (d: -1 | 1) => void; onDelete: () => void; busy: boolean }) {
  const [name, setName] = useState(c.name)
  const [slug, setSlug] = useState(c.slug)
  const bad = !name.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
  return (
    <li className="a-item">
      <div className="a-row grow">
        <div className="a-field"><label htmlFor={`n-${c.id}`}>Name</label><input id={`n-${c.id}`} className="a-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
        <div className="a-field"><label htmlFor={`s-${c.id}`}>Web address part</label><input id={`s-${c.id}`} className="a-input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} aria-invalid={bad} /></div>
      </div>
      <div className="a-row">
        <button className="a-btn" onClick={() => onMove(-1)} disabled={busy || first} aria-label={`Move ${c.name} up`}>↑</button>
        <button className="a-btn" onClick={() => onMove(1)} disabled={busy || last} aria-label={`Move ${c.name} down`}>↓</button>
        <button className="a-btn primary" onClick={() => onSave({ ...c, name: name.trim(), slug })} disabled={busy || bad || (name === c.name && slug === c.slug)}>Save</button>
        <button className="a-btn danger" onClick={onDelete} disabled={busy}>Delete</button>
      </div>
    </li>
  )
}
