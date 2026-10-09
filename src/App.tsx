import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { DataProvider } from './data/DataContext'
import { CartProvider } from './state/CartContext'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Menu, ProductPage } from './pages/Menu'
import { CartPage } from './pages/Cart'
import { BulkPage } from './pages/Bulk'
import { About, Contact, GalleryPage, NotFound, Policies, Privacy } from './pages/Info'

// The dashboard (and the Supabase client it needs) is a separate chunk that public visitors never download.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={<Suspense fallback={<p style={{ padding: 24 }}>Loading dashboard…</p>}><AdminApp /></Suspense>}
      />
      <Route
        element={
          <DataProvider>
            <CartProvider>
              <Layout />
            </CartProvider>
          </DataProvider>
        }
      >
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="menu/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="bulk" element={<BulkPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="policies" element={<Policies />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
