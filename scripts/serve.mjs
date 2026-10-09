// Tiny static server that behaves like the real hosts: exact file if present, otherwise /app.html (SPA fallback).
// Compresses text assets (gzip) like a CDN would. Usage: node scripts/serve.mjs [dir] [port]
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = process.argv[2] ?? 'dist'
const port = Number(process.argv[3] ?? 4173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' }
const cache = new Map()
// Apply the same security headers the real hosts get from public/_headers (the `/*` block).
const sec = {}
try { const blk = readFileSync(join(dir, '_headers'), 'utf8').split(/\n(?=\S)/).find((b) => b.startsWith('/*\n')); for (const l of blk.split('\n').slice(1)) { const m = l.trim().match(/^([\w-]+): (.*)$/); if (m) sec[m[1].toLowerCase()] = m[2] } } catch { /* none */ }
createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(dir, path === '/' ? 'index.html' : path)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'app.html')
  const ext = extname(file)
  const key = file + ':' + statSync(file).mtimeMs
  if (!cache.has(key)) {
    const raw = readFileSync(file)
    cache.set(key, { raw, gz: ['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml'].includes(ext) ? gzipSync(raw) : null })
  }
  const { raw, gz } = cache.get(key)
  const immutable = /\/(assets|img|fonts)\//.test(file.replace(/\\/g, '/'))
  const headers = { ...sec, 'content-type': types[ext] ?? 'application/octet-stream', 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' }
  if (gz && /gzip/.test(req.headers['accept-encoding'] ?? '')) { res.writeHead(200, { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding' }); res.end(gz) }
  else { res.writeHead(200, headers); res.end(raw) }
}).listen(port, '127.0.0.1', () => console.log(`serving ${dir} on http://127.0.0.1:${port}`))
