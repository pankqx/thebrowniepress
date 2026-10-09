import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { useCart } from '../state/CartContext'
import { MODE } from '../config/env'
import { buildWhatsAppUrl, buildGeneralMessage, normalizeWhatsAppNumber } from '../lib/whatsapp'
import { formatINR } from '../lib/money'

const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/bulk', label: 'Bulk orders' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'Story' },
  { to: '/contact', label: 'Contact' },
]

export function Layout() {
  const { state } = useData()
  const { pieces, bumps, resolve } = useCart()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const settings = state.data?.settings
  const showBar = pieces > 0 && loc.pathname !== '/cart'

  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => { document.body.classList.toggle('has-cartbar', showBar) }, [showBar])

  const cart = showBar ? resolve() : null

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {MODE === 'demo' && (
        <div className="announce sample" role="note">
          Demo mode: the sample menu, prices and photos are provisional placeholders, saved only in this browser.
        </div>
      )}
      {settings?.ordering_paused && (
        <div className="announce" role="status">Orders are paused right now. You can still browse the menu.</div>
      )}
      {settings?.announcement && !settings.ordering_paused && <div className="announce" role="status">{settings.announcement}</div>}
      <header className="site-header">
        <div className="wrap">
          <Link to="/" className="wordmark" aria-label="The Brownie Press">
            <span>The</span> <span>Brownie</span> <span>Press</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
          </nav>
          <div className="head-actions">
            <Link key={bumps} to="/cart" className={`cart-link ${bumps ? 'bump' : ''}`}>
              Order <span className="count">{pieces}</span><span className="sr-only">{pieces === 1 ? ' piece' : ' pieces'}</span>
            </Link>
            <button className="menu-btn" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
              {open ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="mobile-nav" aria-label="Main mobile" onClick={() => setOpen(false)}>
            {NAV.map((n) => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}><Outlet /></main>
      <Footer />
      {showBar && cart && (
        <div className="cartbar" role="region" aria-label="Order summary">
          <div>
            <strong>{formatINR(cart.subtotal)}</strong>
            <small>{pieces} {pieces === 1 ? 'piece' : 'pieces'} · {cart.lines.length} {cart.lines.length === 1 ? 'item' : 'items'}</small>
          </div>
          <Link className="btn btn-primary" to="/cart">Review order</Link>
        </div>
      )}
    </>
  )
}

function Footer() {
  const { state } = useData()
  const s = state.data?.settings
  const wa = s ? buildWhatsAppUrl(s.whatsapp_number, buildGeneralMessage()) : null
  return (
    <footer className="site-footer on-dark">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <p className="foot-brand">The<br />Brownie<br />Press</p>
            <p className="muted" style={{ marginTop: 14, maxWidth: '34ch' }}>
              {s?.brand_description ?? 'Home-baked brownies from Mangalore.'}
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <ul>
              <li><Link to="/menu">Menu</Link></li>
              <li><Link to="/bulk">Bulk orders</Link></li>
              <li><Link to="/gallery">Gallery</Link></li>
              <li><Link to="/about">Our story</Link></li>
            </ul>
          </div>
          <div>
            <h2>Order</h2>
            <ul>
              {wa?.ok && <li><a href={wa.url!} target="_blank" rel="noopener noreferrer">WhatsApp {s && `+${normalizeWhatsAppNumber(s.whatsapp_number)}`.replace('+91', '+91 ')}</a></li>}
              {s?.instagram_url && <li><a href={s.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a></li>}
              {s?.contact_email && <li><a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}
              <li><Link to="/contact">Contact &amp; hours</Link></li>
            </ul>
          </div>
          <div>
            <h2>Good to know</h2>
            <ul>
              <li><Link to="/policies">Orders, pickup &amp; delivery</Link></li>
              <li><Link to="/privacy">Privacy policy</Link></li>
              {s?.location_text && <li>{s.location_text}</li>}
            </ul>
          </div>
        </div>
        <p className="fine">
          Orders are requests sent through WhatsApp and are confirmed by the owner there. © {new Date().getFullYear()} The Brownie Press.
          Baked at home in Mangalore.
        </p>
      </div>
    </footer>
  )
}
