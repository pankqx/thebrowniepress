import { chromium } from 'playwright-core'
import { mkdirSync, existsSync, readdirSync } from 'node:fs'
const base = process.env.BASE ?? 'http://127.0.0.1:4173'
const pages = (process.env.PAGES ?? '/').split(',')
const widths = (process.env.WIDTHS ?? '390').split(',').map(Number)
const out = process.env.OUT ?? '/tmp/shots'
mkdirSync(out, { recursive: true })
const root = '/opt/pw-browsers'
const dir = readdirSync(root).find((d) => d.startsWith('chromium-'))
const exe = existsSync(`${root}/chromium/chrome-linux/chrome`) ? `${root}/chromium/chrome-linux/chrome` : `${root}/${dir}/chrome-linux/chrome`
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? exe, args: ['--no-sandbox'] })
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 800 : 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text()) })
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, 0) })
    await page.waitForTimeout(600)
    const name = `${out}/${p.replace(/\W+/g, '_') || 'home'}-${w}.png`
    await page.screenshot({ path: name, fullPage: true })
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    console.log(name, 'overflowX:', over)
  }
  await ctx.close()
}
await browser.close()
