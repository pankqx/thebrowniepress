// Runs the REAL migrations + seed on an in-process Postgres (PGlite) with stand-in auth/storage schemas,
// then proves the Row Level Security rules by switching roles. (TC-013, TC-014, TC-018, TC-019)
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const OWNER = '11111111-1111-4111-8111-111111111111'
const STRANGER = '22222222-2222-4222-8222-222222222222'
let db: PGlite

const sql = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
async function as<T>(role: 'anon' | 'authenticated' | 'postgres', uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); ${role === 'postgres' ? '' : `set role ${role};`}`)
  try { return await fn() } finally { await db.exec('reset role') }
}
const rejects = async (p: Promise<unknown>) => { let err: unknown; try { await p } catch (e) { err = e } return err }

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync(new URL('./stubs.sql', import.meta.url), 'utf8'))
  await db.exec(sql('migrations/0001_init.sql'))
  await db.exec(sql('migrations/0002_storage.sql'))
  await db.exec(sql('seed.sql'))
  await db.exec(`insert into auth.users (id, email) values ('${OWNER}', 'owner@example.com'), ('${STRANGER}', 'stranger@example.com');
                 insert into public.admin_users (user_id) values ('${OWNER}');`)
  // One published (confirmed) product and unpublished media for the visibility tests.
  await db.exec(`
    insert into public.products (id, slug, name, status, is_sample) values ('aaaaaaaa-0000-4000-8000-000000000001', 'live-brownie', 'Live Brownie', 'published', false);
    insert into public.product_variants (product_id, name, price) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Regular', 50);
    insert into public.testimonials (id, path, bucket, status, privacy_reviewed, caption) values
      ('bbbbbbbb-0000-4000-8000-000000000001', 'p/secret.webp', 'private', 'draft', false, 'UNPUBLISHED'),
      ('bbbbbbbb-0000-4000-8000-000000000002', 'p/ok.webp', 'public', 'published', true, 'PUBLISHED');
    insert into storage.objects (bucket_id, name) values ('media-private', 'p/secret.webp'), ('media-public', 'p/ok.webp');`)
})

describe('public visitors (anon)', () => {
  it('see only published products with their variants; seeded samples stay hidden', async () => {
    const r = await as('anon', null, () => db.query<{ slug: string }>('select slug from public.products order by slug'))
    expect(r.rows.map((x) => x.slug)).toEqual(['live-brownie'])
    const v = await as('anon', null, () => db.query('select * from public.product_variants'))
    expect(v.rows).toHaveLength(1)
  })
  it('cannot read unpublished testimonials or gallery items (TC-018)', async () => {
    const t = await as('anon', null, () => db.query<{ caption: string }>('select caption from public.testimonials'))
    expect(t.rows.map((x) => x.caption)).toEqual(['PUBLISHED'])
    const g = await as('anon', null, () => db.query('select * from public.gallery_items'))
    expect(g.rows).toHaveLength(0) // seeded sample gallery rows are drafts
  })
  it('cannot read objects in the private bucket (TC-018)', async () => {
    const o = await as('anon', null, () => db.query('select name from storage.objects where bucket_id = $1', ['media-private']))
    expect(o.rows).toHaveLength(0)
  })
  it('can read business settings (public info only)', async () => {
    const s = await as('anon', null, () => db.query<{ whatsapp_number: string }>('select whatsapp_number from public.business_settings'))
    expect(s.rows[0].whatsapp_number).toBe('+919071983473')
  })
  it('cannot write anything (TC-014)', async () => {
    for (const q of [
      `insert into public.products (slug, name) values ('hack', 'Hack')`,
      `update public.product_variants set price = 1`,
      `delete from public.categories`,
      `update public.business_settings set whatsapp_number = '+911234567890'`,
      `insert into public.testimonials (path) values ('x')`,
      `select * from public.admin_users`,
    ]) expect(await rejects(as('anon', null, () => db.exec(q))), q).toBeTruthy()
  })
})

describe('signed-in user who is NOT an owner', () => {
  it('has the same read-only view and cannot write or self-promote (TC-013/014)', async () => {
    const r = await as('authenticated', STRANGER, () => db.query('select * from public.products'))
    expect(r.rows).toHaveLength(1)
    for (const q of [
      `insert into public.products (slug, name) values ('hack', 'Hack')`,
      `insert into public.admin_users (user_id) values ('${STRANGER}')`,
      `select * from public.admin_users`,
    ]) expect(await rejects(as('authenticated', STRANGER, () => db.exec(q))), q).toBeTruthy()
    // RLS-filtered updates/deletes change zero rows rather than erroring
    const u = await as('authenticated', STRANGER, () => db.query(`update public.product_variants set price = 1 returning id`))
    expect(u.rows).toHaveLength(0)
    const t = await as('authenticated', STRANGER, () => db.query('select * from public.testimonials where status = $1', ['draft']))
    expect(t.rows).toHaveLength(0)
    const o = await as('authenticated', STRANGER, () => db.query('select * from storage.objects'))
    expect(o.rows).toHaveLength(0)
    expect(await rejects(as('authenticated', STRANGER, () => db.exec(`insert into storage.objects (bucket_id, name) values ('media-public', 'x.webp')`)))).toBeTruthy()
  })
})

describe('owner (listed in admin_users)', () => {
  it('can read drafts and private media', async () => {
    const p = await as('authenticated', OWNER, () => db.query('select * from public.products'))
    expect(p.rows.length).toBe(4)
    const t = await as('authenticated', OWNER, () => db.query('select * from public.testimonials'))
    expect(t.rows).toHaveLength(2)
    const o = await as('authenticated', OWNER, () => db.query('select * from storage.objects'))
    expect(o.rows).toHaveLength(2)
  })
  it('can create, edit prices/minimums, and delete products (TC-015, TC-016)', async () => {
    await as('authenticated', OWNER, async () => {
      await db.exec(`insert into public.products (id, slug, name) values ('cccccccc-0000-4000-8000-000000000001', 'new-one', 'New One');
        insert into public.product_variants (product_id, name, price, min_qty, qty_step) values ('cccccccc-0000-4000-8000-000000000001', 'Box', 120.50, 6, 2);
        update public.product_variants set price = 130, min_qty = 8 where product_id = 'cccccccc-0000-4000-8000-000000000001';`)
    })
    const v = await as('authenticated', OWNER, () => db.query<{ price: string; min_qty: number }>(`select price, min_qty from public.product_variants where product_id = 'cccccccc-0000-4000-8000-000000000001'`))
    expect(Number(v.rows[0].price)).toBe(130)
    expect(v.rows[0].min_qty).toBe(8)
    await as('authenticated', OWNER, () => db.exec(`delete from public.products where id = 'cccccccc-0000-4000-8000-000000000001'`))
  })
  it('can persist business settings (TC-020)', async () => {
    await as('authenticated', OWNER, () => db.exec(`update public.business_settings set ordering_paused = true, bulk_min = 25, announcement = 'Closed Sunday'`))
    const s = await as('anon', null, () => db.query<{ ordering_paused: boolean; bulk_min: number }>('select ordering_paused, bulk_min from public.business_settings'))
    expect(s.rows[0]).toMatchObject({ ordering_paused: true, bulk_min: 25 })
    await as('authenticated', OWNER, () => db.exec(`update public.business_settings set ordering_paused = false, bulk_min = 20, announcement = null`))
  })
  it('can publish, unpublish and delete testimonials (TC-019)', async () => {
    const id = 'bbbbbbbb-0000-4000-8000-000000000001'
    // cannot publish before the privacy review + move to the public bucket
    expect(await rejects(as('authenticated', OWNER, () => db.exec(`update public.testimonials set status = 'published' where id = '${id}'`)))).toBeTruthy()
    await as('authenticated', OWNER, () => db.exec(`update public.testimonials set bucket = 'public', privacy_reviewed = true, status = 'published' where id = '${id}'`))
    expect((await as('anon', null, () => db.query('select * from public.testimonials'))).rows).toHaveLength(2)
    await as('authenticated', OWNER, () => db.exec(`update public.testimonials set status = 'draft', bucket = 'private' where id = '${id}'`))
    expect((await as('anon', null, () => db.query('select * from public.testimonials'))).rows).toHaveLength(1)
    await as('authenticated', OWNER, () => db.exec(`delete from public.testimonials where id = '${id}'`))
    expect((await as('authenticated', OWNER, () => db.query('select * from public.testimonials'))).rows).toHaveLength(1)
  })
  it('can upload to storage', async () => {
    await as('authenticated', OWNER, () => db.exec(`insert into storage.objects (bucket_id, name) values ('media-public', 'new.webp')`))
  })
})

describe('database constraints', () => {
  it('refuses to publish sample products or sample gallery items', async () => {
    expect(await rejects(db.exec(`update public.products set status = 'published' where is_sample`))).toBeTruthy()
    expect(await rejects(db.exec(`update public.gallery_items set status = 'published'`))).toBeTruthy()
  })
  it('rejects bad data: negative price, zero minimum, bad slug, non-https Instagram, bad number', async () => {
    for (const q of [
      `insert into public.product_variants (product_id, name, price) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Neg', -1)`,
      `insert into public.product_variants (product_id, name, price, min_qty) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Zero', 1, 0)`,
      `insert into public.products (slug, name) values ('Bad Slug!', 'x')`,
      `update public.business_settings set instagram_url = 'javascript:alert(1)'`,
      `update public.business_settings set whatsapp_number = 'abc'`,
      `insert into public.product_images (product_id, path) values ('aaaaaaaa-0000-4000-8000-000000000001', '../../etc/passwd')`,
    ]) expect(await rejects(db.exec(q)), q).toBeTruthy()
  })
  it('stores money with 2-decimal precision', async () => {
    await db.exec(`insert into public.product_variants (product_id, name, price) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Precise', 33.335)`)
    const r = await db.query<{ price: string }>(`select price from public.product_variants where name = 'Precise'`)
    expect(r.rows[0].price).toMatch(/^33\.3[34]$/)
  })
})
