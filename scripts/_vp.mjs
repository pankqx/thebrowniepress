import { chromium } from 'playwright-core'
const [,, path, w, h, out, scroll] = process.argv
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })).newPage()
p.on('pageerror', (e) => console.log('pageerror', e.message))
await p.goto('http://127.0.0.1:4173' + path, { waitUntil: 'networkidle' })
if (scroll) { await p.evaluate((s) => scrollTo(0, +s), scroll); await p.waitForTimeout(1200) } else await p.waitForTimeout(1000)
await p.screenshot({ path: out })
await b.close()
