// Exercises the REAL-BACKEND code path (PostgREST fetch, numeric strings, nested relations, error states)
// against a mocked Supabase REST endpoint. This does NOT replace a test against a real Supabase project.
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4174'
const SB = 'https://mock-project.supabase.co'
const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8'))
const exe = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const results = []
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const expect = (c, m) => { if (!c) throw new Error(m) }

const live = { id: 'aaaaaaaa-0000-4000-8000-000000000001', slug: 'live-brownie', name: 'Live Brownie', description: 'A confirmed product.', category_id: seed.categories[0].id,
  status: 'published', is_sample: false, featured: true, sort_order: 1, available: true, label: null, ingredients: null, allergens: null, lead_time: null,
  product_variants: [{ id: 'bbbbbbbb-0000-4000-8000-000000000001', product_id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Box of 6', price: '199.50', min_qty: 1, qty_step: 1, available: true, sort_order: 1 }],
  product_images: [] }

async function mock(ctx, { products = [live], fail = false } = {}) {
  const seen = []
  await ctx.route(SB + '/**', async (route) => {
    const url = new URL(route.request().url()); seen.push({ path: url.pathname, headers: route.request().headers() })
    const table = url.pathname.split('/').pop()
    if (fail && table === 'products') return route.fulfill({ status: 500, body: '{"message":"boom"}' })
    const body = { business_settings: [seed.settings], categories: seed.categories, products, gallery_items: [], testimonials: [] }[table] ?? []
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  })
  return seen
}
async function test(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  try { await fn(page, ctx); results.push({ name, ok: true }); console.log('PASS', name) }
  catch (e) { results.push({ name, ok: false, error: String(e.message).split('\n')[0] }); console.log('FAIL', name, e.message.split('\n')[0]) }
  await ctx.close()
}

await test('Public menu loads published rows from PostgREST (numeric strings, nested variants); no sample content', async (page, ctx) => {
  const seen = await mock(ctx)
  const js = []; page.on('response', (r) => { if (r.url().endsWith('.js')) js.push(r.url()) })
  await page.goto(BASE + '/menu', { waitUntil: 'networkidle' })
  expect(await page.locator('article.card').count() === 1, 'one product')
  expect(await page.getByText('₹199.50').count() >= 1, 'price parsed from "199.50"')
  expect(await page.locator('.tag.sample').count() === 0 && await page.getByText(/Demo mode/).count() === 0, 'no sample/demo markers')
  expect(seen.length >= 5 && seen.every((s) => s.headers.apikey === 'anon-key-for-tests'), 'anon key only')
  expect(seen.some((s) => s.path.endsWith('/products')), 'products requested')
  expect(!js.some((u) => /supabaseApi|demoApi|AdminApp/.test(u)), 'admin/supabase client chunks are NOT downloaded by public visitors: ' + js.map((u) => u.split('/').pop()).join(','))
})
await test('Backend error shows a recoverable message; retry works', async (page, ctx) => {
  await mock(ctx, { fail: true })
  await page.goto(BASE + '/menu', { waitUntil: 'networkidle' })
  expect(await page.getByRole('alert').getByText('Can’t load right now').count() === 1, 'error panel')
  await ctx.unroute(SB + '/**'); await mock(ctx)
  await page.getByRole('button', { name: 'Try again' }).click()
  await page.locator('article.card').waitFor()
})
await test('Empty menu offers WhatsApp instead of a broken page', async (page, ctx) => {
  await mock(ctx, { products: [] })
  await page.goto(BASE + '/menu', { waitUntil: 'networkidle' })
  expect(await page.getByText('Nothing on the menu yet').count() === 1, 'empty state')
  const href = await page.getByRole('link', { name: 'Ask on WhatsApp' }).getAttribute('href')
  expect(href.startsWith('https://wa.me/919071983473'), 'wa link')
})
await test('Admin in real-backend mode requires email + password (no demo entry)', async (page, ctx) => {
  await mock(ctx)
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  expect(await page.getByLabel('Email').count() === 1 && await page.getByLabel('Password').count() === 1, 'credential form')
  expect(await page.getByRole('button', { name: /demo/i }).count() === 0, 'no demo bypass')
  expect(await page.locator('.a-nav').count() === 0, 'no dashboard')
})
await browser.close()
writeFileSync(process.env.OUT ?? '/tmp/e2e-sb-results.json', JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2))
const failed = results.filter((r) => !r.ok); console.log(`${results.length - failed.length}/${results.length} passed`); process.exit(failed.length ? 1 : 0)
