import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './admin.css'
import { getAdminApi, type AdminApi, type AdminUser } from './api'
import { AdminProvider } from './AdminContext'
import { useSeo } from '../components/Seo'
import { Overview, Launch } from './Status'
import { ProductEditor, ProductsPage } from './Products'
import { CategoriesPage } from './Categories'
import { FeedbackPage, GalleryAdmin } from './MediaPages'
import { SettingsPage } from './Settings'

export default function AdminApp() {
  useSeo({ title: 'Dashboard', description: 'Owner dashboard', path: '/admin', noindex: true })
  const [api, setApi] = useState<AdminApi | null | undefined>(undefined)
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    getAdminApi().then(async (a) => {
      if (!live) return
      setApi(a)
      if (!a) return
      try { setUser(await a.getUser()) } catch (e) { setErr((e as Error).message); setUser(null) }
    })
    return () => { live = false }
  }, [])

  if (api === undefined || (api && user === undefined)) return <div className="a-center" aria-busy="true">Loading…</div>
  if (api === null) return (
    <div className="a-center"><div className="a-card"><h1>Dashboard not available</h1>
      <p>This site isn’t connected to a database yet, so the dashboard is switched off. See <code>docs/DEPLOYMENT.md</code> to connect Supabase.</p></div></div>
  )
  if (!user) return <Login api={api} initialError={err} onDone={(u) => { setErr(''); setUser(u) }} />

  return (
    <AdminProvider api={api}>
      <div className="admin">
        <header className="a-top">
          <strong>The Brownie Press · Dashboard</strong>
          <span className="a-who">{user.email}</span>
          <button className="a-btn" onClick={async () => { await api.signOut(); setUser(null) }}>Sign out</button>
        </header>
        {api.kind === 'demo' && <p className="a-banner" role="note">Demo mode: this dashboard has no real login and saves only in this browser. Connect Supabase for real, secure, shared data.</p>}
        <nav className="a-nav" aria-label="Dashboard">
          {[['', 'Overview'], ['products', 'Products'], ['categories', 'Categories'], ['gallery', 'Gallery'], ['feedback', 'Feedback'], ['settings', 'Settings'], ['launch', 'Launch check']].map(([to, label]) => (
            <NavLink key={to} to={`/admin/${to}`} end={to === ''}>{label}</NavLink>
          ))}
          <a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer">View website ↗</a>
        </nav>
        <main className="a-main">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="gallery" element={<GalleryAdmin />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="launch" element={<Launch />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </AdminProvider>
  )
}

function Login({ api, onDone, initialError }: { api: AdminApi; onDone: (u: AdminUser) => void; initialError: string }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(initialError)
  const [busy, setBusy] = useState(false)
  const demo = api.kind === 'demo'
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await api.signIn(email.trim(), pw)) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="a-center">
      <form className="a-card" onSubmit={submit} aria-labelledby="lg">
        <h1 id="lg">Owner sign in</h1>
        {demo ? (
          <p className="a-banner">Demo mode: there is no real login. Anyone opening this site in demo mode can enter. Never use demo mode for the live website.</p>
        ) : (
          <>
            <div className="a-field"><label htmlFor="em">Email</label><input id="em" className="a-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="a-field"><label htmlFor="pw">Password</label><input id="pw" className="a-input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          </>
        )}
        {err && <p className="a-err" role="alert">{err}</p>}
        <button className="a-btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : demo ? 'Enter demo dashboard' : 'Sign in'}</button>
      </form>
    </div>
  )
}
