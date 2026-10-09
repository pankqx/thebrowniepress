import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Gate } from '../components/Gate'
import { Media } from '../components/Media'
import { BuyBox, ProductCard } from '../components/ProductCard'
import { useSeo } from '../components/Seo'
import { WaButton } from '../components/WaButton'
import { NotFound } from './Info'
import type { PublicData } from '../lib/types'

export function Menu() {
  useSeo({ title: 'Brownie menu', description: 'Browse The Brownie Press brownie menu: choose variants and quantities, then send one consolidated order on WhatsApp.', path: '/menu' })
  return (
    <div className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <p className="kicker" style={{ color: 'var(--red)' }}>The menu</p>
        <h1 className="display page-title">Pick your brownies</h1>
      </div>
      <Gate minHeight={600}>{(d) => <MenuBody d={d} />}</Gate>
    </div>
  )
}

function MenuBody({ d }: { d: PublicData }) {
  const [sp, setSp] = useSearchParams()
  const cat = sp.get('c') ?? ''
  const cats = d.categories.filter((c) => d.products.some((p) => p.category_id === c.id))
  const list = d.products.filter((p) => !cat || d.categories.find((c) => c.slug === cat)?.id === p.category_id)
  return (
    <div className="wrap">
      {cats.length > 1 && (
        <div className="filters" role="group" aria-label="Filter by category">
          <button aria-pressed={!cat} onClick={() => setSp({})}>All</button>
          {cats.map((c) => <button key={c.id} aria-pressed={cat === c.slug} onClick={() => setSp({ c: c.slug })}>{c.name}</button>)}
        </div>
      )}
      {d.settings.ordering_paused && <p className="notice warn" role="status" style={{ marginBottom: 20 }}>Orders are paused right now. Browse the menu and come back soon.</p>}
      {list.length ? (
        <div className="grid-products">{list.map((p, i) => <ProductCard key={p.id} product={p} settings={d.settings} index={i} />)}</div>
      ) : (
        <div className="empty">
          <h2>Nothing on the menu yet</h2>
          <p className="muted">We’re updating the menu. Message us to ask what’s baking.</p>
          <p style={{ marginTop: 16 }}><WaButton number={d.settings.whatsapp_number} message="Hello, The Brownie Press! What brownies are available?">Ask on WhatsApp</WaButton></p>
        </div>
      )}
      <p className="hint" style={{ marginTop: 28 }}>
        Need {d.settings.bulk_min}+ pieces? <Link to="/bulk">See bulk orders</Link>. All orders are requests confirmed by the owner on WhatsApp.
      </p>
    </div>
  )
}

export function ProductPage() {
  const { slug } = useParams()
  return <Gate minHeight={500}>{(d) => <Detail d={d} slug={slug ?? ''} />}</Gate>
}

function Detail({ d, slug }: { d: PublicData; slug: string }) {
  const p = d.products.find((x) => x.slug === slug)
  useSeo({
    title: p?.name ?? 'Not found', path: `/menu/${slug}`, noindex: !p,
    description: p ? `${p.name} from The Brownie Press, Mangalore. ${p.description}`.slice(0, 158) : 'This item is not on the menu.',
  })
  if (!p) return <NotFound />
  const cat = d.categories.find((c) => c.id === p.category_id)
  return (
    <div className="section" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <p className="crumbs"><Link to="/menu">Menu</Link> / {cat?.name ?? 'Brownies'}</p>
        <div className="detail">
          <div className="pimg">
            {p.images[0] ? <Media path={p.images[0].path} alt={p.images[0].alt || p.name} priority sizes="(min-width: 880px) 55vw, 100vw" /> : <div className="img-fallback">Photo coming soon</div>}
          </div>
          <div>
            <div className="tags">
              {p.is_sample && <span className="tag sample">Sample item</span>}
              {p.label && <span className="tag red">{p.label}</span>}
            </div>
            <h1 className="display">{p.name}</h1>
            <p style={{ fontSize: '1.0625rem' }}>{p.description}</p>
            <BuyBox product={p} settings={d.settings} />
            <dl className="facts" style={{ marginTop: 32 }}>
              {p.ingredients && <div><dt>Ingredients</dt><dd>{p.ingredients}</dd></div>}
              {p.allergens && <div><dt>Allergens</dt><dd>{p.allergens}</dd></div>}
              {(p.lead_time || d.settings.lead_time_note) && <div><dt>Lead time</dt><dd>{p.lead_time ?? d.settings.lead_time_note}</dd></div>}
              {!p.ingredients && !p.allergens && <div><dt>Ingredients &amp; allergens</dt><dd>Please ask on WhatsApp before ordering if you have allergies. We haven’t published a full list yet.</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
