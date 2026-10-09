// Post-build step: injects the server-rendered home page shell into dist/index.html and keeps the untouched
// SPA shell as dist/app.html (the fallback for every other URL — see public/_redirects and vercel.json).
import { createServer } from 'vite'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

process.env.NODE_ENV = 'production'
const vite = await createServer({ mode: 'production', appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' })
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const shell = existsSync('dist/app.html') ? readFileSync('dist/app.html', 'utf8') : readFileSync('dist/index.html', 'utf8')
  writeFileSync('dist/app.html', shell)
  const html = render('/')
  const out = shell.replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  if (out === shell) throw new Error('root element not found in dist/index.html')
  writeFileSync('dist/index.html', out)
  console.log(`prerendered home (${html.length} bytes of HTML)`)
} finally {
  await vite.close()
}
