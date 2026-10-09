import { useEffect } from 'react'
import { OG_IMAGE, SITE_URL } from '../config/env'

const BRAND = 'The Brownie Press'

function setMeta(sel: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(sel)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

export function useSeo(opts: { title?: string; description: string; path: string; noindex?: boolean }) {
  const { title, description, path, noindex } = opts
  useEffect(() => {
    const full = title ? `${title} | ${BRAND}, Mangalore` : `${BRAND} — Fudgy home-baked brownies in Mangalore`
    document.title = full
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', full)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow')
    const url = SITE_URL ? SITE_URL + path : ''
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (url) {
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
      link.href = url
      setMeta('meta[property="og:url"]', 'property', 'og:url', url)
      setMeta('meta[property="og:image"]', 'property', 'og:image', SITE_URL + OG_IMAGE)
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', SITE_URL + OG_IMAGE)
    } else link?.remove()
  }, [title, description, path, noindex])
}
