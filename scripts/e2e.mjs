// Browser end-to-end tests against a DEMO-mode production build served by `vite preview`.
// Usage: VITE_DATA_MODE=demo npm run build && npm run preview &  then  node scripts/e2e.mjs
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173'
const exe = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const results = []
const png = await sharp({ create: { width: 900, height: 700, channels: 3, background: '#7a3b1d' } }).png().toBuffer()
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })

async function test(id, name, fn, { reducedMotion } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: reducedMotion ?? 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy|Refused to/.test(m.text())) errors.push('CSP: ' + m.text()) })
  const t0 = Date.now()
  try { await fn(page, ctx); if (errors.length) throw new Error('page errors: ' + errors.join('; ')); results.push({ id, name, ok: true, ms: Date.now() - t0 }); console.log('PASS', id, name) }
  catch (e) { results.push({ id, name, ok: false, error: String(e.message).split('\n')[0] }); console.log('FAIL', id, name, '\n   ', String(e.message).split('\n').slice(0, 3).join('\n    ')) }
  await ctx.close()
}
const expect = (c, m) => { if (!c) throw new Error(m) }
const go = async (page, p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }) }
const adminIn = async (page, p = '/admin') => { await go(page, p); const b = page.getByRole('button', { name: 'Enter demo dashboard' }); if (await b.count()) { await b.click(); await page.waitForSelector('.a-nav') } }
const card = (page, name) => page.locator('article.card', { has: page.getByRole('heading', { name }) })
async function addToCart(page, product, variant, qty) {
  const c = card(page, product)
  await c.getByRole('radio', { name: new RegExp('^' + variant) }).check({ force: true })
  const input = c.getByRole('textbox', { name: /Quantity of/ })
  await input.fill(String(qty))
  await c.getByRole('button', { name: 'Add to order' }).click()
  return c
}
const editProduct = async (page, name) => { await adminIn(page, '/admin/products'); await page.locator('li.a-item', { hasText: name }).getByRole('link', { name: 'Edit' }).click(); await page.waitForSelector('#pn') }
const setVariant = async (page, vname, patch) => {
  const row = page.locator('li.a-item.col', { has: page.locator(`input[value="${vname}"]`) })
  for (const [label, val] of Object.entries(patch)) await row.getByLabel(label, { exact: true }).fill(String(val))
}

await test('TC-001', 'Menu loads with available products', async (page) => {
  await go(page, '/menu')
  expect((await page.locator('article.card').count()) === 3, 'expected 3 products')
  for (const n of ['Triple Chocolate Brownies', 'Cheesecake Brownies', 'Choco Ganache Brownies']) expect(await page.getByRole('heading', { name: n }).count() === 1, n)
})
await test('TC-002', 'Sample products are visibly marked provisional', async (page) => {
  await go(page, '/menu')
  expect(await page.locator('.tag.sample').count() === 3, 'sample tags')
  expect(await page.getByText('sample price').count() >= 3, 'sample price note')
  expect(await page.getByText(/Demo mode/).count() >= 1, 'demo banner')
  await adminIn(page, '/admin/products'); expect(await page.getByText(/sample product/).count() >= 1, 'admin sample warning')
  await go(page, '/admin/launch'); expect(await page.getByText('Not ready yet').count() === 1, 'launch gate not ready')
})
await test('TC-003/004/015/016', 'Owner sets minimum 6 / step 2; customer cannot order below minimum or off-step', async (page) => {
  await editProduct(page, 'Cheesecake Brownies')
  await setVariant(page, 'Minis', { 'Minimum quantity': 6, 'Quantity step': 2, 'Price in rupees': 37.5 })
  await page.getByLabel(/I’ve confirmed these details/).check()
  await page.getByRole('button', { name: 'Save & publish' }).click()
  await page.waitForURL('**/admin/products')
  await go(page, '/menu')
  const c = card(page, 'Cheesecake Brownies')
  await c.getByRole('radio', { name: /^Minis/ }).check({ force: true })
  expect(await c.getByRole('textbox', { name: /Quantity of/ }).inputValue() === '6', 'default qty is minimum')
  expect(await c.getByText(/Minimum 6 pieces, in steps of 2/).count() === 1, 'rule hint')
  for (const [q, msg] of [[3, /Minimum order for this option is 6/], [7, /steps of 2/]]) {
    await c.getByRole('textbox', { name: /Quantity of/ }).fill(String(q))
    await c.getByRole('button', { name: 'Add to order' }).click()
    expect(await c.locator('.err').filter({ hasText: msg }).count() === 1, `error for ${q}`)
  }
  expect(await page.locator('.cartbar').count() === 0, 'nothing added')
  await c.getByRole('textbox', { name: /Quantity of/ }).fill('8')
  await c.getByRole('button', { name: 'Add to order' }).click()
  expect(await c.getByText(/Added 8/).count() === 1, 'valid add')
  const inc = c.getByRole('button', { name: 'Increase quantity' }); await c.getByRole('textbox', { name: /Quantity of/ }).fill('6'); await inc.click()
  expect(await c.getByRole('textbox', { name: /Quantity of/ }).inputValue() === '8', 'stepper steps by 2')
})
await test('TC-005/006/007', 'Multi-product cart, totals update, removal', async (page) => {
  await go(page, '/menu')
  await addToCart(page, 'Triple Chocolate Brownies', 'Regular', 3)
  await addToCart(page, 'Triple Chocolate Brownies', 'Minis', 2)
  await addToCart(page, 'Choco Ganache Brownies', 'Minis', 2)
  await go(page, '/cart') // also proves persistence across navigation/reload
  expect(await page.locator('li.line').count() === 3, '3 lines (two variants of same product + another product)')
  const total = () => page.locator('.summary .total dd').innerText()
  expect((await total()).replace(/\s/g, '') === '₹250', 'total ₹250, got ' + await total()) // 3*40 + 2*30 + 2*35
  await page.locator('li.line', { hasText: 'Choco Ganache' }).getByRole('button', { name: 'Increase quantity' }).click()
  expect((await total()).replace(/\s/g, '') === '₹285', 'after + : ' + await total())
  await page.locator('li.line', { hasText: 'Choco Ganache' }).getByRole('button', { name: /^Remove/ }).click()
  expect((await total()).replace(/\s/g, '') === '₹180', 'after remove: ' + await total())
  expect(await page.locator('li.line').count() === 2, '2 lines')
})
await test('TC-008', 'Changed price and unavailable variant handled safely', async (page) => {
  await go(page, '/menu')
  await addToCart(page, 'Triple Chocolate Brownies', 'Regular', 2)
  await addToCart(page, 'Choco Ganache Brownies', 'Minis', 1)
  await editProduct(page, 'Triple Chocolate Brownies')
  await setVariant(page, 'Regular', { 'Price in rupees': 55 })
  await page.getByLabel(/I’ve confirmed/).check(); await page.getByRole('button', { name: 'Save & publish' }).click(); await page.waitForURL('**/admin/products')
  await editProduct(page, 'Choco Ganache Brownies')
  await page.locator('li.a-item.col', { has: page.locator('input[value="Minis"]') }).getByLabel('Available').uncheck()
  await page.getByLabel(/I’ve confirmed/).check(); await page.getByRole('button', { name: 'Save & publish' }).click(); await page.waitForURL('**/admin/products')
  await go(page, '/cart')
  expect(await page.getByText('Price changed from ₹40 to ₹55.').count() === 1, 'price change notice')
  expect(await page.getByText(/Currently unavailable/).count() === 1, 'unavailable notice')
  expect(await page.getByRole('button', { name: 'Review my order' }).isDisabled(), 'review blocked')
  await page.getByRole('button', { name: 'Accept updated prices' }).click()
  expect(await page.getByText('Price changed').count() === 0, 'price notice cleared')
  expect(await page.getByRole('button', { name: 'Review my order' }).isDisabled(), 'still blocked by unavailable line')
  await page.locator('li.line', { hasText: 'Choco Ganache' }).getByRole('button', { name: /^Remove/ }).click()
  expect(await page.getByRole('button', { name: 'Review my order' }).isEnabled(), 'enabled after removing unavailable')
  expect((await page.locator('.summary .total dd').innerText()).replace(/\s/g, '') === '₹110', 'new price used')
})
await test('TC-009/010/011', 'WhatsApp URL: number, items, totals, encoding', async (page) => {
  await go(page, '/menu')
  await addToCart(page, 'Triple Chocolate Brownies', 'Regular', 3)
  await addToCart(page, 'Cheesecake Brownies', 'Regular', 1)
  await go(page, '/cart')
  await page.getByRole('button', { name: 'Review my order' }).click()
  expect(await page.getByText('Please enter your name.').count() === 1, 'name validation')
  await page.getByLabel('Your name').fill('Asha & "Co" 😀')
  await page.getByLabel('Notes (optional)').fill('Less sweet\nplease #1 100%')
  await page.getByRole('button', { name: 'Review my order' }).click()
  const a = page.getByRole('link', { name: 'Open WhatsApp' })
  const href = await a.getAttribute('href')
  expect(href.startsWith('https://wa.me/919071983473?text='), 'href base ' + href.slice(0, 40))
  const text = decodeURIComponent(href.split('?text=')[1])
  expect(text.includes('Triple Chocolate Brownies — Regular') && text.includes('Quantity: 3') && text.includes('Line total: ₹120'), 'item 1')
  expect(text.includes('Cheesecake Brownies — Regular') && text.includes('Line total: ₹45'), 'item 2')
  expect(text.includes('Subtotal: ₹165') && text.includes('Estimated total: ₹165, subject to confirmation'), 'totals')
  expect(text.includes('Asha & "Co" 😀') && text.includes('Notes: Less sweet\nplease #1 100%'), 'special chars survive')
  expect(!/[ \n&#"]/.test(href.split('?text=')[1]), 'query is encoded')
  expect(await a.getAttribute('rel') === 'noopener noreferrer' && await a.getAttribute('target') === '_blank', 'link safety')
  expect(await page.getByText(/not a confirmed booking/).count() >= 1, 'disclaimer visible in preview')
  expect(await page.getByText(/I’ve sent it/).count() === 0, 'no "sent" claim before click')
  await a.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()))
  await a.click()
  expect(await page.getByText(/Nothing is sent from this website/).count() === 1, 'honest post-click copy')
  // delivery without a configured area charge => pending
  await page.getByRole('button', { name: 'Edit details' }).click()
  await page.getByLabel('Delivery', { exact: true }).check()
  await page.getByLabel('Delivery address').fill('12 MG Road, Mangalore')
  await page.getByRole('button', { name: 'Review my order' }).click()
  const t2 = decodeURIComponent((await page.getByRole('link', { name: 'Open WhatsApp' }).getAttribute('href')).split('?text=')[1])
  expect(t2.includes('Delivery charge: Pending confirmation') && t2.includes('Delivery address: 12 MG Road, Mangalore'), 'delivery pending')
})
await test('TC-012', 'Missing WhatsApp configuration disables checkout', async (page) => {
  await go(page, '/menu')
  await addToCart(page, 'Triple Chocolate Brownies', 'Regular', 1)
  // the demo db is created on first admin visit; then simulate a missing number
  await adminIn(page, '/admin/settings')
  await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText(/Settings saved/).waitFor() // persists the demo db
  await page.evaluate(() => { const db = JSON.parse(localStorage.getItem('bp-demo-db-v1')); db.settings.whatsapp_number = ''; localStorage.setItem('bp-demo-db-v1', JSON.stringify(db)) })
  await go(page, '/cart')
  expect(await page.getByText(/WhatsApp number isn’t configured/).count() === 1, 'warning')
  expect(await page.getByRole('button', { name: 'Review my order' }).isDisabled(), 'disabled')
  expect(await page.getByRole('link', { name: 'Open WhatsApp' }).count() === 0, 'no broken link')
  // and the owner cannot save an invalid number
  await adminIn(page, '/admin/settings')
  await page.getByLabel('WhatsApp number').fill('abc')
  await page.getByRole('button', { name: 'Save settings' }).click()
  expect(await page.getByText(/Enter a valid number/).count() === 1, 'settings validation')
})
await test('TC-020/021', 'Settings persist after reload; ordering can be paused', async (page) => {
  await adminIn(page, '/admin/settings')
  await page.getByLabel('Announcement banner (optional)').fill('Closed on Sunday')
  await page.getByLabel('Bulk order minimum (pieces)').fill('30')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await page.getByText(/Settings saved/).waitFor()
  await page.reload({ waitUntil: 'networkidle' })
  expect(await page.getByLabel('Announcement banner (optional)').inputValue() === 'Closed on Sunday', 'announcement persisted')
  await go(page, '/')
  expect(await page.getByText('Closed on Sunday').count() === 1, 'announcement on site')
  await go(page, '/bulk'); expect(await page.getByText(/start at 30 pieces/).count() >= 1, 'bulk min from settings')
  await adminIn(page, '/admin')
  await page.getByRole('button', { name: 'Pause orders' }).click(); await page.getByText('Orders paused.').waitFor()
  await go(page, '/menu')
  const c = card(page, 'Triple Chocolate Brownies')
  expect(await c.getByRole('button', { name: 'Orders paused' }).isDisabled(), 'add disabled while paused')
  expect(await page.getByText(/Orders are paused right now/).count() >= 1, 'pause banner')
})
await test('TC-015/017', 'Owner creates a product with a photo and publishes it', async (page) => {
  await adminIn(page, '/admin/products/new')
  await page.getByLabel('Name', { exact: true }).fill('Walnut Brownies')
  await page.getByLabel('Description').fill('Test product')
  await page.getByRole('button', { name: 'Save & publish' }).click()
  expect(await page.getByText(/at least one available option|fix the highlighted/).count() >= 1, 'cannot publish without options')
  await page.getByRole('button', { name: '+ Add option' }).click()
  await page.getByLabel('Option name').fill('Box of 6')
  await page.getByLabel('Price in rupees').fill('199.5')
  await page.getByLabel('Minimum quantity').fill('1')
  await page.setInputFiles('#pf', { name: 'brownie.png', mimeType: 'image/png', buffer: png })
  await page.locator('.a-thumb img').first().waitFor()
  // a non-image renamed to .png is rejected by content sniffing
  await page.setInputFiles('#pf', { name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload=alert(1)>') })
  await page.getByText(/isn’t a JPEG, PNG or WebP/).waitFor()
  await page.getByRole('button', { name: 'Save & publish' }).click(); await page.waitForURL('**/admin/products')
  await go(page, '/menu/walnut-brownies')
  expect(await page.getByRole('heading', { name: 'Walnut Brownies' }).count() === 1, 'product page')
  expect(await page.getByText('₹199.50').count() >= 1, 'price formatting')
  expect(await page.locator('.pimg img[src^="data:"]').count() === 1, 'uploaded photo shown')
})
await test('TC-017/018/019', 'Gallery & feedback: private drafts, privacy gate, publish/unpublish/delete', async (page) => {
  await adminIn(page, '/admin/feedback')
  await page.setInputFiles('#up-file', { name: 'chat.png', mimeType: 'image/png', buffer: png })
  await page.locator('.a-badge', { hasText: 'Private draft' }).waitFor()
  const li = page.locator('li.a-item').first()
  const pub = li.getByRole('button', { name: 'Publish' })
  expect(await pub.isDisabled(), 'publish blocked before privacy review')
  await go(page, '/'); expect(await page.getByText('Customer messages').count() === 0, 'draft not public (home)')
  await go(page, '/gallery'); expect(await page.locator('.wall').count() === 0, 'draft not public (gallery)')
  await adminIn(page, '/admin/feedback')
  await li.getByLabel('Customer label (optional)').fill('Customer, Kadri')
  await li.getByLabel(/I’ve checked this screenshot/).check()
  expect(await li.getByRole('button', { name: 'Publish' }).isDisabled(), 'still blocked until saved')
  await li.getByRole('button', { name: 'Save details' }).click(); await page.getByText('Saved.').waitFor()
  await page.locator('li.a-item').first().getByRole('button', { name: 'Publish' }).click(); await page.getByText(/Published\. It’s on the website/).waitFor()
  await go(page, '/'); expect(await page.locator('.wall figure').count() === 1 && await page.getByText('Customer, Kadri').count() === 1, 'published shows')
  await adminIn(page, '/admin/feedback')
  await page.locator('li.a-item').first().getByRole('button', { name: 'Unpublish' }).click(); await page.getByText('Unpublished.').waitFor()
  await go(page, '/'); expect(await page.locator('.wall').count() === 0, 'unpublished hidden')
  await adminIn(page, '/admin/feedback')
  await page.locator('li.a-item').first().getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click(); await page.getByText('Deleted.').waitFor()
  expect(await page.locator('li.a-item').count() === 0, 'deleted')
  // gallery upload + publish
  await go(page, '/admin/gallery')
  await page.setInputFiles('#up-file', { name: 'g.png', mimeType: 'image/png', buffer: png })
  await page.locator('li.a-item', { hasText: 'draft' }).first().waitFor()
  const g = page.locator('li.a-item').filter({ hasNotText: 'Sample' }).first()
  await g.getByLabel('Caption').fill('Fresh batch'); await g.getByRole('button', { name: 'Save details' }).click(); await page.getByText('Saved.').waitFor()
  await page.locator('li.a-item').filter({ hasNotText: 'Sample' }).first().getByRole('button', { name: 'Publish' }).click(); await page.getByText(/Published\./).waitFor()
  await go(page, '/gallery'); expect(await page.getByText('Fresh batch').count() === 1, 'gallery publish')
})
await test('TC-013', 'Admin area requires sign-in; no dashboard without session', async (page) => {
  await go(page, '/admin/products')
  expect(await page.getByRole('heading', { name: 'Owner sign in' }).count() === 1, 'login gate')
  expect(await page.locator('.a-nav').count() === 0, 'no admin nav before sign in')
})
await test('Launch', 'Removing sample data and confirming the menu makes the launch check pass (demo backend aside)', async (page) => {
  await adminIn(page, '/admin/launch')
  await page.getByRole('button', { name: 'Remove all sample data' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove samples' }).click(); await page.getByText('Sample data removed.').waitFor()
  await page.getByText(/I have checked that every published product/).click(); await page.getByText('Saved.').waitFor()
  expect(await page.getByText('All content is yours.').count() === 1, 'no samples remain')
  await go(page, '/menu'); expect(await page.locator('.tag.sample').count() === 0, 'no sample tags')
})
const widths = [360, 390, 768, 1440]
await test('TC-022', 'No horizontal overflow at 360/390/768/1440 on key pages', async (page) => {
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 })
    for (const p of ['/', '/menu', '/cart', '/bulk', '/about', '/contact', '/policies', '/privacy', '/admin']) {
      await go(page, p)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(over <= 0, `overflow ${over}px at ${w}px on ${p}`)
    }
  }
})
await test('TC-023', 'Reduced motion: content visible, animations/transitions disabled', async (page) => {
  await go(page, '/')
  const s = await page.evaluate(() => {
    const r = document.querySelector('.reveal'); const h = document.querySelector('.hero-in')
    return { op: r ? getComputedStyle(r).opacity : '1', dur: h ? getComputedStyle(h).animationDuration : '0s', tr: r ? getComputedStyle(r).transitionDuration : '0s' }
  })
  expect(s.op === '1', 'reveal elements visible'); expect(parseFloat(s.dur) < 0.01, 'animation disabled: ' + s.dur); expect(parseFloat(s.tr) < 0.01, 'transition disabled: ' + s.tr)
}, { reducedMotion: 'reduce' })
await test('TC-024', 'Image failures show a fallback and the page stays usable', async (page, ctx) => {
  await ctx.route('**/img/p-*', (r) => r.abort())
  await go(page, '/menu')
  await page.getByText('Image unavailable').first().waitFor()
  await addToCart(page, 'Triple Chocolate Brownies', 'Regular', 1).catch(() => { throw new Error('ordering broke when images failed') })
})
await test('A11y', 'Keyboard: skip link, nav, quantity controls reachable; labelled form fields', async (page) => {
  await go(page, '/menu')
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement?.textContent) === 'Skip to content', 'skip link first')
  const unlabeled = await page.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((e) => !(e.labels?.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))).length)
  expect(unlabeled === 0, unlabeled + ' unlabeled controls')
  const noAlt = await page.evaluate(() => [...document.images].filter((i) => !i.hasAttribute('alt')).length)
  expect(noAlt === 0, noAlt + ' images without alt')
})

await browser.close()
writeFileSync(process.env.OUT ?? '/tmp/e2e-results.json', JSON.stringify({ base: BASE, ranAt: new Date().toISOString(), results }, null, 2))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
