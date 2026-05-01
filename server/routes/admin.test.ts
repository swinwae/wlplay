import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Hono } from 'hono'
import { openDb, runMigrations, type DB } from '../db'
import { mountAdmin } from './admin'

let db: DB
let app: Hono

beforeEach(() => {
  const file = path.join(os.tmpdir(), `wlplay-admin-${process.pid}-${Date.now()}-${Math.random()}.db`)
  try { fs.unlinkSync(file) } catch {}
  db = openDb(file)
  runMigrations(db, path.resolve(__dirname, '..', 'migrations'))
  app = new Hono()
  mountAdmin(app, db)
})

const post = (url: string, body: any) =>
  app.fetch(new Request(`http://x${url}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }))

const patch = (url: string, body: any) =>
  app.fetch(new Request(`http://x${url}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }))

const del = (url: string) =>
  app.fetch(new Request(`http://x${url}`, { method: 'DELETE' }))

describe('admin posts', () => {
  it('creates a post', async () => {
    const r = await post('/api/admin/posts', {
      slug: 'hello', title: '你好', summary: 's', body: '<p>正文</p>'
    })
    expect(r.status).toBe(201)
    const b = await r.json()
    expect(b.id).toBeGreaterThan(0)
    expect(b.status).toBe('draft')
  })

  it('rejects duplicate slug', async () => {
    await post('/api/admin/posts', { slug: 'x', title: 't', summary: 's' })
    const r = await post('/api/admin/posts', { slug: 'x', title: 't2', summary: 's' })
    expect(r.status).toBe(409)
  })

  it('rejects bad payload (zod)', async () => {
    const r = await post('/api/admin/posts', { slug: 'ok' })  // 缺 title/summary
    expect(r.status).toBe(400)
  })

  it('sanitizes body on create', async () => {
    const r = await post('/api/admin/posts', {
      slug: 's', title: 't', summary: 'x', body: '<p>ok</p><script>alert(1)</script>'
    })
    const b = await r.json()
    expect(b.body).not.toContain('<script>')
  })

  it('updates with PATCH', async () => {
    const c = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's' })
    const id = (await c.json()).id
    const r = await patch(`/api/admin/posts/${id}`, { title: '新标题' })
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b.title).toBe('新标题')
  })

  it('deletes a post', async () => {
    const c = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's' })
    const id = (await c.json()).id
    const r = await del(`/api/admin/posts/${id}`)
    expect(r.status).toBe(204)
  })

  it('publish sets status and published_at', async () => {
    const c = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's' })
    const id = (await c.json()).id
    const r = await post(`/api/admin/posts/${id}/publish`, {})
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b.status).toBe('published')
    expect(b.published_at).toBeTruthy()
  })

  it('feature enforces single featured', async () => {
    const a = await (await post('/api/admin/posts', { slug: 'a', title: 'A', summary: 's' })).json()
    const b = await (await post('/api/admin/posts', { slug: 'b', title: 'B', summary: 's' })).json()
    await post(`/api/admin/posts/${a.id}/feature`, {})
    await post(`/api/admin/posts/${b.id}/feature`, {})
    const rows = db.prepare('SELECT id, is_featured FROM posts ORDER BY id').all() as any[]
    expect(rows.find(r => r.id === a.id).is_featured).toBe(0)
    expect(rows.find(r => r.id === b.id).is_featured).toBe(1)
  })

  it('attaches tag_ids on create', async () => {
    db.exec(`INSERT INTO tags (name, color) VALUES ('密码学','#7C3AED')`)
    const r = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's', tag_ids: [1] })
    expect(r.status).toBe(201)
    const tagRows = db.prepare('SELECT * FROM post_tags').all() as any[]
    expect(tagRows).toHaveLength(1)
  })
})

const get = (url: string) => app.fetch(new Request(`http://x${url}`))

describe('admin tags', () => {
  it('creates a tag', async () => {
    const r = await post('/api/admin/tags', { name: '随笔', color: '#0E7490' })
    expect(r.status).toBe(201)
    const b = await r.json()
    expect(b.id).toBeGreaterThan(0)
  })

  it('lists tags', async () => {
    db.exec(`INSERT INTO tags (name, color) VALUES ('a','#000'), ('b','#111')`)
    const r = await get('/api/admin/tags')
    const b = await r.json() as any[]
    expect(b).toHaveLength(2)
  })

  it('updates a tag', async () => {
    const c = await (await post('/api/admin/tags', { name: 'a', color: '#000' })).json()
    const r = await patch(`/api/admin/tags/${c.id}`, { name: 'A!' })
    const b = await r.json()
    expect(b.name).toBe('A!')
  })

  it('rejects deletion when referenced (409)', async () => {
    const t = await (await post('/api/admin/tags', { name: 't', color: '#000' })).json()
    await post('/api/admin/posts', { slug: 's', title: 't', summary: 's', tag_ids: [t.id] })
    const r = await del(`/api/admin/tags/${t.id}`)
    expect(r.status).toBe(409)
  })

  it('deletes an unused tag', async () => {
    const t = await (await post('/api/admin/tags', { name: 't', color: '#000' })).json()
    const r = await del(`/api/admin/tags/${t.id}`)
    expect(r.status).toBe(204)
  })
})
