import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const ROUTES = ['/', '/menu', '/bulk', '/gallery', '/about', '/contact', '/policies', '/privacy']

/** Emits robots.txt always, and sitemap.xml only once VITE_SITE_URL (the real domain / deployment URL) is set. */
function seoFiles(siteUrl: string): Plugin {
  return {
    name: 'bp-seo-files',
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /cart']
      if (siteUrl) robots.push(`Sitemap: ${siteUrl}/sitemap.xml`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })
      if (siteUrl) {
        const urls = ROUTES.map((r) => `  <url><loc>${siteUrl}${r === '/' ? '' : r}</loc></url>`).join('\n')
        this.emitFile({
          type: 'asset', fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')
  return {
    plugins: [react(), seoFiles(siteUrl)],
    build: { target: 'es2020', sourcemap: false, cssCodeSplit: true },
    server: { host: '127.0.0.1', port: 5173 },
  }
})
