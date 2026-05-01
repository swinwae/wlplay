// server/routes/public.ts
import type { Hono } from 'hono'
import type { DB } from '../db'

interface PostRow {
  id: number; slug: string; title: string; summary: string; body: string
  read_time: string | null; status: string; is_featured: number
  cover_color: string | null; published_at: string | null
  created_at: string; updated_at: string
}

function loadTags(db: DB, postId: number) {
  return db.prepare(`
    SELECT t.id, t.name, t.color, t.sort
    FROM tags t JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = ? ORDER BY t.sort ASC, t.id ASC
  `).all(postId) as { id:number; name:string; color:string; sort:number }[]
}

function shapePost(db: DB, row: PostRow, includeBody: boolean) {
  const tags = loadTags(db, row.id).map(t => ({ name: t.name, color: t.color }))
  const out: Record<string, unknown> = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    read_time: row.read_time,
    status: row.status,
    is_featured: row.is_featured === 1,
    cover_color: row.cover_color,
    published_at: row.published_at,
    tags,
  }
  if (includeBody) out.body = row.body
  return out
}

function parseMinutes(s: string | null): number {
  if (!s) return 0
  const m = s.match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

export function mountPublic(app: Hono, db: DB) {
  app.get('/api/public/posts', (c) => {
    const rows = db.prepare(
      `SELECT * FROM posts WHERE status = 'published'
       ORDER BY is_featured DESC, published_at DESC, id DESC`
    ).all() as PostRow[]
    return c.json(rows.map(r => shapePost(db, r, false)))
  })

  app.get('/api/public/posts/:slug', (c) => {
    const slug = c.req.param('slug')
    const row = db.prepare(
      `SELECT * FROM posts WHERE slug = ? AND status = 'published'`
    ).get(slug) as PostRow | undefined
    if (!row) return c.json({ error: 'not found' }, 404)
    return c.json(shapePost(db, row, true))
  })

  app.get('/api/public/tags', (c) => {
    const rows = db.prepare(`
      SELECT t.id, t.name, t.color, t.sort,
        (SELECT COUNT(*) FROM post_tags pt JOIN posts p ON p.id = pt.post_id
         WHERE pt.tag_id = t.id AND p.status = 'published') AS post_count
      FROM tags t
      ORDER BY t.sort ASC, t.id ASC
    `).all()
    return c.json(rows)
  })

  app.get('/api/public/media', (c) => {
    const rows = db.prepare(
      `SELECT id, type, title, author FROM media_items
       WHERE active = 1 ORDER BY sort ASC, id ASC`
    ).all()
    return c.json(rows)
  })

  app.get('/api/public/about', (c) => {
    const row = db.prepare(`SELECT avatar, name, bio, links FROM about WHERE id = 1`).get() as any
    if (!row) return c.json(null)
    let links: unknown = []
    try { links = JSON.parse(row.links) } catch { links = [] }
    return c.json({ avatar: row.avatar, name: row.name, bio: row.bio, links })
  })

  app.get('/api/public/stats', (c) => {
    const rows = db.prepare(
      `SELECT read_time FROM posts WHERE status = 'published'`
    ).all() as { read_time: string | null }[]
    const total_read_minutes = rows.reduce((s, r) => s + parseMinutes(r.read_time), 0)
    return c.json({ posts_count: rows.length, total_read_minutes })
  })
}
