// Lighthouse (lab) measurements against a production build served by `vite preview`.
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173'
const pages = (process.env.PAGES ?? '/,/menu,/bulk,/about,/cart').split(',')
const form = process.env.FORM ?? 'mobile'
const chrome = await launch({ chromePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', chromeFlags: ['--headless=new', '--no-sandbox'] })
const out = []
for (const p of pages) {
  const config = form === 'desktop' ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } } : undefined
  const r = await lighthouse(BASE + p, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, config)
  const l = r.lhr, a = l.audits
  out.push({
    page: p, perf: Math.round(l.categories.performance.score * 100), a11y: Math.round(l.categories.accessibility.score * 100),
    bp: Math.round(l.categories['best-practices'].score * 100), seo: Math.round(l.categories.seo.score * 100),
    fcp_ms: Math.round(a['first-contentful-paint'].numericValue), lcp_ms: Math.round(a['largest-contentful-paint'].numericValue),
    tbt_ms: Math.round(a['total-blocking-time'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
    si_ms: Math.round(a['speed-index'].numericValue), transfer_kB: Math.round(a['total-byte-weight'].numericValue / 1024),
    lcp_el: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet?.slice(0, 90) ?? null,
    env: { lighthouse: l.lighthouseVersion, chrome: l.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0], form, throttling: l.configSettings.throttlingMethod, cpuSlowdown: l.configSettings.throttling.cpuSlowdownMultiplier, rtt: l.configSettings.throttling.rttMs, kbps: l.configSettings.throttling.throughputKbps, emulated: l.configSettings.screenEmulation.width + 'x' + l.configSettings.screenEmulation.height },
    failed: Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === 'binary').map((x) => x.id).slice(0, 8),
  })
  console.log(JSON.stringify(out.at(-1)))
}
await chrome.kill()
// bundle budget
const dir = 'dist/assets'
const files = readdirSync(dir).map((f) => ({ f, gz: gzipSync(readFileSync(`${dir}/${f}`)).length, raw: statSync(`${dir}/${f}`).size }))
const html = readFileSync('dist/index.html', 'utf8')
const initial = files.filter((x) => html.includes(x.f))
const sum = (xs, k) => Math.round(xs.reduce((s, x) => s + x[k], 0) / 1024 * 10) / 10
const bundle = { initial: initial.map((x) => ({ file: x.f, gz_kB: +(x.gz / 1024).toFixed(1) })), initial_js_gz_kB: sum(initial.filter((x) => x.f.endsWith('.js')), 'gz'), initial_css_gz_kB: sum(initial.filter((x) => x.f.endsWith('.css')), 'gz'), lazy: files.filter((x) => !html.includes(x.f)).map((x) => ({ file: x.f, gz_kB: +(x.gz / 1024).toFixed(1) })) }
console.log(JSON.stringify(bundle))
writeFileSync(process.env.OUT ?? '/tmp/perf.json', JSON.stringify({ ranAt: new Date().toISOString(), results: out, bundle }, null, 2))
