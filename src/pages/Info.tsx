import { Link } from 'react-router-dom'
import { Gate } from '../components/Gate'
import { useSeo } from '../components/Seo'
import { WaButton } from '../components/WaButton'
import { FeedbackWall, GalleryGrid } from './Home'
import { formatINR } from '../lib/money'
import { buildGeneralMessage, normalizeWhatsAppNumber } from '../lib/whatsapp'

function Page({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <p className="kicker" style={{ color: 'var(--red)' }}>{kicker}</p>
        <h1 className="display page-title">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function About() {
  useSeo({ title: 'Our story', description: 'The story of The Brownie Press: a home-baked brownie business in Mangalore, with a cafe as the long-term dream.', path: '/about' })
  return (
    <Page kicker="Our story" title="Baked at home">
      <Gate>{({ settings: s }) => (
        <div className="story">
          <div className="prose">
            {s.founder_name && <p className="script" style={{ fontSize: '1.8rem' }}>Hi, I’m {s.founder_name}.</p>}
            {(s.founder_story ?? s.brand_description).split(/\n\n+/).map((t, i) => <p key={i}>{t}</p>)}
            <h2>The care behind each bake</h2>
            <p>{s.ingredients_note ?? 'We haven’t published a full ingredient list yet. If you’d like to know what goes into a bake, or you have allergies, please ask us on WhatsApp before ordering.'}</p>
            <h2>What’s next</h2>
            <p>A Brownie Press cafe in Mangalore is the long-term ambition. It does not exist yet: today every order is baked in a home kitchen and handled personally over WhatsApp.</p>
          </div>
          <div>
            {s.orders_milestone ? <p><span className="num-big">{s.orders_milestone}+</span><br /><span className="kicker">orders completed · reported by the owner</span></p> : null}
            <p style={{ marginTop: 28 }}><WaButton number={s.whatsapp_number} message={buildGeneralMessage()}>Say hello on WhatsApp</WaButton></p>
          </div>
        </div>
      )}</Gate>
    </Page>
  )
}

export function GalleryPage() {
  useSeo({ title: 'Gallery', description: 'Photos of fudgy brownies, fresh batches and orders from The Brownie Press, Mangalore.', path: '/gallery' })
  return (
    <Page kicker="Up close" title="Gallery">
      <Gate>{(d) => (
        <>
          {d.gallery.length ? <GalleryGrid items={d.gallery} /> : <div className="empty"><h2>Photos coming soon</h2></div>}
          {d.testimonials.length > 0 && (
            <section style={{ marginTop: 72 }} aria-labelledby="fb"><h2 id="fb" className="display" style={{ fontSize: '2.6rem', marginBottom: 20 }}>Customer messages</h2><FeedbackWall items={d.testimonials} /></section>
          )}
        </>
      )}</Gate>
    </Page>
  )
}

export function Contact() {
  useSeo({ title: 'Contact', description: 'Contact The Brownie Press in Mangalore on WhatsApp to order brownies or ask about bulk orders.', path: '/contact' })
  return (
    <Page kicker="Say hello" title="Contact">
      <Gate>{({ settings: s }) => (
        <div className="prose">
          <p>The quickest way to reach us is WhatsApp. Order requests are confirmed there.</p>
          <p style={{ margin: '18px 0' }}><WaButton number={s.whatsapp_number} message={buildGeneralMessage()}>Message on WhatsApp</WaButton></p>
          <dl className="facts">
            <div><dt>WhatsApp</dt><dd>{normalizeWhatsAppNumber(s.whatsapp_number) ? `+${normalizeWhatsAppNumber(s.whatsapp_number)!.replace(/^91/, '91 ')}` : 'Not configured'}</dd></div>
            <div><dt>Location</dt><dd>{s.location_text}. Baked at home; there is no shop to visit yet.</dd></div>
            {s.business_hours && <div><dt>Hours</dt><dd style={{ whiteSpace: 'pre-line' }}>{s.business_hours}</dd></div>}
            {s.lead_time_note && <div><dt>Lead time</dt><dd>{s.lead_time_note}</dd></div>}
            {s.contact_email && <div><dt>Email</dt><dd><a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></dd></div>}
            {s.instagram_url && <div><dt>Instagram</dt><dd><a href={s.instagram_url} target="_blank" rel="noopener noreferrer">{s.instagram_url.replace(/^https?:\/\/(www\.)?/, '')}</a></dd></div>}
          </dl>
        </div>
      )}</Gate>
    </Page>
  )
}

export function Policies() {
  useSeo({ title: 'Orders, pickup & delivery', description: 'How ordering, pickup and delivery work at The Brownie Press, Mangalore.', path: '/policies' })
  return (
    <Page kicker="Good to know" title="Orders & delivery">
      <Gate>{({ settings: s }) => (
        <div className="prose">
          <h2>How ordering works</h2>
          <ul>
            <li>Build your order on this website and tap “Open WhatsApp”. Your message is prefilled, and you send it yourself.</li>
            <li>An order is a <strong>request</strong> until the owner confirms availability and the final amount on WhatsApp.</li>
            <li>This website doesn’t take payments. Payment details are agreed on WhatsApp.</li>
            <li>Bulk orders start at {s.bulk_min} pieces. Some options may have a higher minimum, shown on the menu.</li>
          </ul>
          <h2>Pickup</h2>
          <p>{s.pickup_enabled ? (s.pickup_note ?? 'Pickup is available. We’ll share the pickup details on WhatsApp when we confirm your order.') : 'Pickup isn’t available right now.'}</p>
          <h2>Delivery</h2>
          {s.delivery_enabled ? (
            <>
              <p>{s.delivery_note ?? 'Delivery can be requested when ordering. Charges and areas are confirmed on WhatsApp.'}</p>
              {s.delivery_areas.length > 0 && <ul>{s.delivery_areas.map((a) => <li key={a.id}>{a.name}: {a.charge !== null ? formatINR(a.charge) : 'charge to be confirmed'}</li>)}</ul>}
            </>
          ) : <p>Delivery isn’t available right now.</p>}
          {s.lead_time_note && <><h2>Lead time</h2><p>{s.lead_time_note}</p></>}
          <h2>Allergies</h2>
          <p>We haven’t published full allergen information. If you have an allergy, please ask on WhatsApp before ordering.</p>
        </div>
      )}</Gate>
    </Page>
  )
}

export function Privacy() {
  useSeo({ title: 'Privacy policy', description: 'What information The Brownie Press website collects and how WhatsApp checkout works.', path: '/privacy' })
  return (
    <Page kicker="Privacy" title="Privacy policy">
      <div className="prose">
        <p>This is a plain-language summary of what this website does with information. It was written for the website as built; the owner should review it before launch.</p>
        <h2>What you type when ordering</h2>
        <p>The name, address, date and notes you enter at checkout are used only to write the WhatsApp message you choose to send. We don’t save them on our servers, and we don’t store your address in your browser.</p>
        <h2>WhatsApp</h2>
        <p>When you tap “Open WhatsApp”, your device opens WhatsApp with a prefilled message. Nothing is sent until you press Send. Once you do, the conversation is handled by WhatsApp (Meta) under its own privacy policy, and by the owner, who reads your message to confirm your order.</p>
        <h2>On your device</h2>
        <p>To keep your order between visits, the site saves product choices and quantities (no personal details) in your browser’s local storage. Clearing your browser data removes them. We don’t use advertising or analytics cookies.</p>
        <h2>Our hosting and database</h2>
        <p>The menu is loaded from our database provider and the site is served by our hosting provider. Like any website, they may see technical details such as your IP address when your browser requests pages.</p>
        <h2>Customer messages we publish</h2>
        <p>If we show a screenshot of a customer message, the owner reviews it and checks for private details before publishing. If you spot yourself and want it removed, message us on WhatsApp and we’ll take it down.</p>
        <h2>Contact</h2>
        <p>Questions about privacy? Message us on WhatsApp via the <Link to="/contact">contact page</Link>.</p>
      </div>
    </Page>
  )
}

export function NotFound() {
  useSeo({ title: 'Page not found', description: 'This page could not be found.', path: '/404', noindex: true })
  return (
    <Page kicker="404" title="Not on the menu">
      <p className="prose">We couldn’t find that page. <Link to="/menu" className="link">Browse the menu →</Link></p>
    </Page>
  )
}
