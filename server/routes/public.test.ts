import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Hono } from 'hono'
import { openDb, runMigrations, type DB } from '../db'
import { mountPublic } from './public'

let db: DB
let app: Hono

const tmp = () => path.join(os.tmpdir(), `wlplay-pub-${process.pid}-${Date.now()}-${Math.random()}.db`)

beforeEach(() => {
  const file = tmp()
  try { fs.unlinkSync(file) } catch {}
  db = openDb(file)
  runMigrations(db, path.resolve(__dirname, '..', 'migrations'))
  app = new Hono()
  mountPublic(app, db)
})

describe('GET /api/public/posts', () => {
  it('returns empty list when no posts', async () => {
    const res = await app.fetch(new Request('http://x/api/public/posts'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns published posts only by default, with main tag', async () => {
    db.exec(`INSERT INTO tags (name, color, sort) VALUES ('密码学', '#7C3AED', 0), ('随笔', '#0E7490', 1)`)
    db.exec(`INSERT INTO posts (slug, title, summary, status, published_at) VALUES
      ('a', '已发布', '...', 'published', '2026-04-01'),
      ('b', '草稿',   '...', 'draft',     NULL)`)
    db.exec(`INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (1, 2)`)
    const res = await app.fetch(new Request('http://x/api/public/posts'))
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].slug).toBe('a')
    expect(body[0].tags[0]).toEqual({ name: '密码学', color: '#7C3AED' })
    expect(body[0]).not.toHaveProperty('body')
  })
})

describe('GET /api/public/posts/:slug', () => {
  it('returns body for published post', async () => {
    db.prepare(`INSERT INTO posts (slug, title, summary, body, status, published_at) VALUES (?,?,?,?,?,?)`)
      .run('hello', '你好', 'sum', '<p>正文</p>', 'published', '2026-04-01')
    const res = await app.fetch(new Request('http://x/api/public/posts/hello'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.body).toBe('<p>正文</p>')
  })

  it('404 for missing slug', async () => {
    const res = await app.fetch(new Request('http://x/api/public/posts/nope'))
    expect(res.status).toBe(404)
  })

  it('404 for draft post (publicly invisible)', async () => {
    db.prepare(`INSERT INTO posts (slug, title, summary, body, status) VALUES (?,?,?,?,?)`)
      .run('draft', 'D', 'S', 'B', 'draft')
    const res = await app.fetch(new Request('http://x/api/public/posts/draft'))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/public/tags', () => {
  it('returns tags with post_count of published posts only', async () => {
    db.exec(`INSERT INTO tags (name, color) VALUES ('密码学', '#7C3AED'), ('未用', '#000')`)
    db.exec(`INSERT INTO posts (slug, title, summary, status) VALUES ('a','A','s','published')`)
    db.exec(`INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1)`)
    const res = await app.fetch(new Request('http://x/api/public/tags'))
    const body = await res.json() as any[]
    const t1 = body.find(t => t.name === '密码学')
    const t2 = body.find(t => t.name === '未用')
    expect(t1.post_count).toBe(1)
    expect(t2.post_count).toBe(0)
  })
})

describe('GET /api/public/media', () => {
  it('returns active media in sort order', async () => {
    db.exec(`INSERT INTO media_items (type, title, author, sort, active) VALUES
      ('book','B','A1', 1, 1),
      ('music','M','A2', 0, 1),
      ('movie','X','A3', 0, 0)`)
    const res = await app.fetch(new Request('http://x/api/public/media'))
    const body = await res.json() as any[]
    expect(body.map(m => m.title)).toEqual(['M', 'B'])
  })
})

describe('GET /api/public/about', () => {
  it('returns null when not set', async () => {
    const res = await app.fetch(new Request('http://x/api/public/about'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns parsed links array', async () => {
    db.prepare(`INSERT INTO about (id, avatar, name, bio, links) VALUES (1, ?, ?, ?, ?)`)
      .run('W', 'Wan', 'bio', JSON.stringify([{ label: 'GitHub', url: 'https://x' }]))
    const res = await app.fetch(new Request('http://x/api/public/about'))
    const body = await res.json()
    expect(body.links).toEqual([{ label: 'GitHub', url: 'https://x' }])
  })
})

describe('GET /api/public/stats', () => {
  it('counts published posts and sums read_time minutes', async () => {
    db.exec(`INSERT INTO posts (slug, title, summary, status, read_time) VALUES
      ('a','A','s','published','12 分钟'),
      ('b','B','s','published','5 minutes'),
      ('c','C','s','draft','100 分钟')`)
    const res = await app.fetch(new Request('http://x/api/public/stats'))
    const body = await res.json()
    expect(body.posts_count).toBe(2)
    expect(body.total_read_minutes).toBe(17)
  })
})
