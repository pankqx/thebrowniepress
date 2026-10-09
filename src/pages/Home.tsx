import { Link } from 'react-router-dom'
import { Gate, SectionHead } from '../components/Gate'
import { Media } from '../components/Media'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { Stamp } from '../components/Stamp'
import { WaButton } from '../components/WaButton'
import { useSeo } from '../components/Seo'
import { SITE_URL } from '../config/env'
import { normalizeWhatsAppNumber } from '../lib/whatsapp'
import type { PublicData } from '../lib/types'
import { useEffect } from 'react'

export function Home() {
  useSeo({
    description: 'The Brownie Press bakes rich, fudgy brownies at home in Mangalore. Order on WhatsApp, with bulk orders for birthdays, offices and celebrations.',
    path: '/',
  })
  return (
    <>
      <Hero />
      <div className="ticker" aria-hidden="true"><div className="wrap"><span>Richer.</span><span>Fudgier.</span><span>Addictive.</span></div></div>
      <Gate minHeight={520}>{(d) => <HomeBody d={d} />}</Gate>
    </>
  )
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-h">
      <div className="wrap">
        <div>
          <p className="kicker hero-in"><span style={{ color: 'var(--red)' }}>●</span> Home-baked in Mangalore</p>
          <h1 id="hero-h" className="display">Seriously fudgy. <em>Impossible to ignore.</em></h1>
          <p className="hero-copy hero-in d1">Rich, dense brownies baked at home in Mangalore. Pick your box, send one WhatsApp message, and we’ll confirm the rest.</p>
          <div className="hero-cta hero-in d2">
            <Link className="btn btn-primary" to="/menu">Explore the menu</Link>
            <Link className="btn" to="/bulk">Bulk orders</Link>
          </div>
          <p className="hero-loc kicker hero-in d2"><span aria-hidden="true">⌖</span> Mangalore, with love</p>
        </div>
        <div className="hero-art">
          <Media path="static:hero" alt="Placeholder image: two stacked fudgy brownies with melted chocolate dripping down" priority sizes="(min-width: 880px) 40vw, 100vw" />
          <Stamp className="stamp" />
        </div>
      </div>
    </section>
  )
}

function HomeBody({ d }: { d: PublicData }) {
  const { settings: s } = d
  const featured = d.products.filter((p) => p.featured).slice(0, 6)
  const shown = featured.length ? featured : d.products.slice(0, 3)
  const gallery = [...d.gallery].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order).slice(0, 5)

  useEffect(() => {
    if (!SITE_URL) return
    const ld = {
      '@context': 'https://schema.org', '@type': 'Bakery', name: 'The Brownie Press', url: SITE_URL,
      telephone: `+${normalizeWhatsAppNumber(s.whatsapp_number) ?? ''}`,
      address: { '@type': 'PostalAddress', addressLocality: 'Mangalore', addressRegion: 'Karnataka', addressCountry: 'IN' },
    }
    const el = document.createElement('script'); el.type = 'application/ld+json'; el.text = JSON.stringify(ld)
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [s.whatsapp_number])

  return (
    <>
      <section className="section" aria-labelledby="menu-h">
        <div className="wrap">
          <SectionHead kicker="01 — From the oven" title="The menu">
            <Link className="link" to="/menu">See the full menu →</Link>
          </SectionHead>
          {shown.length ? (
            <div className="grid-products" id="menu-h">
              {shown.map((p, i) => <Reveal key={p.id} delay={i * 70}><ProductCard product={p} settings={s} index={i} /></Reveal>)}
            </div>
          ) : (
            <div className="empty"><h2>Menu coming together</h2><p className="muted">Message us on WhatsApp to ask what’s baking.</p>
              <p style={{ marginTop: 16 }}><WaButton number={s.whatsapp_number} message="Hello, The Brownie Press! What brownies are available?">Ask on WhatsApp</WaButton></p></div>
          )}
        </div>
      </section>

      <section className="section red" aria-labelledby="bulk-h">
        <div className="wrap bulk">
          <div>
            <span className="kicker">02 — Made to share</span>
            <h2 id="bulk-h" className="display">Bulk orders accepted.</h2>
            <p className="script">Made to impress. Made to share.</p>
            <p className="occasions"><span>Birthdays</span><span>Events</span><span>Offices</span><span>Celebrations</span><span>Gifting</span></p>
            <div className="hero-cta">
              <Link className="btn btn-solid-light" to="/bulk">Plan a bulk order</Link>
              <WaButton className="btn btn-light" number={s.whatsapp_number} message="Hello, The Brownie Press! I would like to enquire about a bulk order.">Ask on WhatsApp</WaButton>
            </div>
          </div>
          <div aria-label={`Bulk orders start at ${s.bulk_min} pieces`}>
            <p className="kicker">Minimum</p>
            <p className="bulk-stat">{s.bulk_min}+</p>
            <p>pieces for a bulk order</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="story-h">
        <div className="wrap story">
          <div>
            <span className="kicker" style={{ color: 'var(--red)' }}>03 — The story</span>
            <h2 id="story-h" className="display" style={{ marginTop: 10 }}>Baked at home. Shared widely.</h2>
            {s.orders_milestone ? (
              <p style={{ marginTop: 28 }}>
                <span className="num-big">{s.orders_milestone}+</span><br />
                <span className="kicker">orders completed in our first year</span>
                <span className="hint" style={{ display: 'block', marginTop: 4 }}>Reported by the owner.</span>
              </p>
            ) : null}
          </div>
          <div>
            <div className="prose">
              {s.founder_story ? s.founder_story.split(/\n\n+/).map((t, i) => <p key={i}>{t}</p>) : <p>{s.brand_description}</p>}
            </div>
            <dl className="facts" style={{ marginTop: 28 }}>
              <div><dt>Where</dt><dd>A home kitchen in Mangalore, Karnataka. No shop front yet.</dd></div>
              <div><dt>Ingredients</dt><dd>{s.ingredients_note ?? 'Want to know what goes into a bake? Just ask us on WhatsApp.'}</dd></div>
              <div><dt>Next</dt><dd>A Brownie Press cafe in Mangalore is the dream. It isn’t open yet; today it’s home baking.</dd></div>
            </dl>
            <p style={{ marginTop: 24 }}><Link className="link" to="/about">Read the full story →</Link></p>
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="section choc" aria-labelledby="gal-h">
          <div className="wrap">
            <SectionHead kicker="04 — Up close" title="Gallery"><Link className="link" to="/gallery">All photos →</Link></SectionHead>
            <h2 id="gal-h" className="sr-only">Gallery</h2>
            <GalleryGrid items={gallery} />
          </div>
        </section>
      )}

      {d.testimonials.length > 0 && (
        <section className="section" aria-labelledby="fb-h">
          <div className="wrap">
            <SectionHead kicker="05 — Kind words" title="Customer messages" />
            <h2 id="fb-h" className="sr-only">Customer messages</h2>
            <FeedbackWall items={d.testimonials} />
          </div>
        </section>
      )}

      <section className="section dark">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 className="display" style={{ fontSize: 'clamp(2.6rem,9vw,6rem)' }}>Hungry yet?</h2>
          <p className="muted" style={{ margin: '12px auto 26px', maxWidth: '40ch' }}>Build your order, then send it on WhatsApp. We confirm availability and the final amount there.</p>
          <Link className="btn btn-primary" to="/menu">Start your order</Link>
        </div>
      </section>
    </>
  )
}

export function GalleryGrid({ items }: { items: PublicData['gallery'] }) {
  return (
    <div className={`gallery ${items.length >= 5 ? 'rich' : ''}`}>
      {items.map((g, i) => (
        <Reveal as="figure" key={g.id} className={items.length >= 5 && i === 0 && g.featured ? 'feature' : ''}>
          <Media path={g.path} alt={g.caption || 'The Brownie Press brownies'} sizes="(min-width: 720px) 33vw, 50vw" />
          {g.caption && <figcaption>{g.caption}{g.is_sample ? ' (sample image)' : ''}</figcaption>}
        </Reveal>
      ))}
    </div>
  )
}

export function FeedbackWall({ items }: { items: PublicData['testimonials'] }) {
  return (
    <div className="wall">
      {items.map((t) => (
        <figure key={t.id}>
          <Media path={t.path} alt={t.caption ? `Customer message: ${t.caption}` : 'Screenshot of a customer message'} sizes="(min-width: 880px) 25vw, 50vw" />
          {(t.caption || t.customer_label) && <figcaption>{t.customer_label && <b>{t.customer_label}</b>}{t.caption}</figcaption>}
        </figure>
      ))}
    </div>
  )
}
