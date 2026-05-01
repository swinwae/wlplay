// server/routes/admin.ts
import type { Hono } from 'hono'
import { z } from 'zod'
import type { DB } from '../db'
import { sanitizeHtml } from '../lib/sanitize'

const PostCreate = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  body: z.string().default(''),
  read_time: z.string().nullable().optional(),
  cover_color: z.string().nullable().optional(),
  tag_ids: z.array(z.number().int().positive()).default([]),
})
const PostPatch = PostCreate.partial()

function postWithTags(db: DB, id: number) {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any
  if (!row) return null
  const tags = db.prepare(`
    SELECT t.id, t.name, t.color, t.sort
    FROM tags t JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = ? ORDER BY t.sort ASC, t.id ASC
  `).all(id)
  return { ...row, is_featured: row.is_featured === 1, tags }
}

function setTags(db: DB, postId: number, tagIds: number[]) {
  db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId)
  const ins = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)')
  for (const tid of tagIds) ins.run(postId, tid)
}

export function mountAdmin(app: Hono, db: DB) {
  // ── POSTS ──
  app.get('/api/admin/posts', (c) => {
    const status = c.req.query('status') ?? 'all'
    const where = status === 'all' ? '' : `WHERE status = '${status === 'draft' ? 'draft' : 'published'}'`
    const rows = db.prepare(`SELECT * FROM posts ${where} ORDER BY id DESC`).all() as any[]
    const tagStmt = db.prepare(`
      SELECT t.id, t.name, t.color, t.sort
      FROM tags t JOIN post_tags pt ON pt.tag_id = t.id
      WHERE pt.post_id = ? ORDER BY t.sort ASC, t.id ASC
    `)
    return c.json(rows.map(r => ({
      ...r,
      is_featured: r.is_featured === 1,
      tags: tagStmt.all(r.id),
    })))
  })

  app.get('/api/admin/posts/:id', (c) => {
    const id = Number(c.req.param('id'))
    const post = postWithTags(db, id)
    if (!post) return c.json({ error: 'not found' }, 404)
    return c.json(post)
  })

  app.post('/api/admin/posts', async (c) => {
    const json = await c.req.json().catch(() => null)
    const parsed = PostCreate.safeParse(json)
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    const cleanBody = sanitizeHtml(d.body)
    try {
      const tx = db.transaction(() => {
        const r = db.prepare(`INSERT INTO posts
          (slug, title, summary, body, read_time, cover_color)
          VALUES (?, ?, ?, ?, ?, ?)`).run(
            d.slug, d.title, d.summary, cleanBody,
            d.read_time ?? null, d.cover_color ?? null
          )
        if (d.tag_ids.length) setTags(db, Number(r.lastInsertRowid), d.tag_ids)
        return Number(r.lastInsertRowid)
      })
      const id = tx()
      return c.json(postWithTags(db, id), 201)
    } catch (e: any) {
      if (String(e.message).includes('UNIQUE')) return c.json({ error: 'slug exists' }, 409)
      return c.json({ error: e.message }, 500)
    }
  })

  app.patch('/api/admin/posts/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const exists = db.prepare('SELECT id FROM posts WHERE id = ?').get(id)
    if (!exists) return c.json({ error: 'not found' }, 404)
    const json = await c.req.json().catch(() => null)
    const parsed = PostPatch.safeParse(json)
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    const fields: string[] = []
    const values: unknown[] = []
    const setField = (col: string, v: unknown) => { fields.push(`${col} = ?`); values.push(v) }
    if (d.slug !== undefined) setField('slug', d.slug)
    if (d.title !== undefined) setField('title', d.title)
    if (d.summary !== undefined) setField('summary', d.summary)
    if (d.body !== undefined) setField('body', sanitizeHtml(d.body))
    if (d.read_time !== undefined) setField('read_time', d.read_time)
    if (d.cover_color !== undefined) setField('cover_color', d.cover_color)
    fields.push(`updated_at = datetime('now')`)
    try {
      const tx = db.transaction(() => {
        if (fields.length > 1) {
          db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values, id)
        }
        if (d.tag_ids !== undefined) setTags(db, id, d.tag_ids)
      })
      tx()
      return c.json(postWithTags(db, id))
    } catch (e: any) {
      if (String(e.message).includes('UNIQUE')) return c.json({ error: 'slug exists' }, 409)
      return c.json({ error: e.message }, 500)
    }
  })

  app.delete('/api/admin/posts/:id', (c) => {
    const id = Number(c.req.param('id'))
    const r = db.prepare('DELETE FROM posts WHERE id = ?').run(id)
    if (r.changes === 0) return c.json({ error: 'not found' }, 404)
    return new Response(null, { status: 204 })
  })

  app.post('/api/admin/posts/:id/publish', (c) => {
    const id = Number(c.req.param('id'))
    const exists = db.prepare('SELECT published_at FROM posts WHERE id = ?').get(id) as any
    if (!exists) return c.json({ error: 'not found' }, 404)
    const setPub = exists.published_at ? '' : `, published_at = datetime('now')`
    db.prepare(`UPDATE posts SET status = 'published', updated_at = datetime('now') ${setPub} WHERE id = ?`).run(id)
    return c.json(postWithTags(db, id))
  })

  app.post('/api/admin/posts/:id/unpublish', (c) => {
    const id = Number(c.req.param('id'))
    const r = db.prepare(`UPDATE posts SET status = 'draft', updated_at = datetime('now') WHERE id = ?`).run(id)
    if (r.changes === 0) return c.json({ error: 'not found' }, 404)
    return c.json(postWithTags(db, id))
  })

  app.post('/api/admin/posts/:id/feature', (c) => {
    const id = Number(c.req.param('id'))
    const exists = db.prepare('SELECT id FROM posts WHERE id = ?').get(id)
    if (!exists) return c.json({ error: 'not found' }, 404)
    const tx = db.transaction(() => {
      db.prepare('UPDATE posts SET is_featured = 0').run()
      db.prepare('UPDATE posts SET is_featured = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    })
    tx()
    return c.json(postWithTags(db, id))
  })

  app.post('/api/admin/posts/:id/unfeature', (c) => {
    const id = Number(c.req.param('id'))
    const r = db.prepare(`UPDATE posts SET is_featured = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
    if (r.changes === 0) return c.json({ error: 'not found' }, 404)
    return c.json(postWithTags(db, id))
  })

  // ── TAGS ──
  const TagCreate = z.object({
    name: z.string().min(1).max(40),
    color: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/),
    sort: z.number().int().default(0),
  })
  const TagPatch = TagCreate.partial()

  app.get('/api/admin/tags', (c) => {
    const rows = db.prepare('SELECT * FROM tags ORDER BY sort ASC, id ASC').all()
    return c.json(rows)
  })

  app.post('/api/admin/tags', async (c) => {
    const json = await c.req.json().catch(() => null)
    const parsed = TagCreate.safeParse(json)
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    try {
      const r = db.prepare('INSERT INTO tags (name, color, sort) VALUES (?, ?, ?)')
        .run(d.name, d.color, d.sort)
      return c.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(Number(r.lastInsertRowid)), 201)
    } catch (e: any) {
      if (String(e.message).includes('UNIQUE')) return c.json({ error: 'tag exists' }, 409)
      throw e
    }
  })

  app.patch('/api/admin/tags/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const exists = db.prepare('SELECT id FROM tags WHERE id = ?').get(id)
    if (!exists) return c.json({ error: 'not found' }, 404)
    const parsed = TagPatch.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    const fields: string[] = []
    const values: unknown[] = []
    if (d.name !== undefined) { fields.push('name = ?'); values.push(d.name) }
    if (d.color !== undefined) { fields.push('color = ?'); values.push(d.color) }
    if (d.sort !== undefined) { fields.push('sort = ?'); values.push(d.sort) }
    if (fields.length === 0) return c.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(id))
    try {
      db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...values, id)
      return c.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(id))
    } catch (e: any) {
      if (String(e.message).includes('UNIQUE')) return c.json({ error: 'tag exists' }, 409)
      throw e
    }
  })

  app.delete('/api/admin/tags/:id', (c) => {
    const id = Number(c.req.param('id'))
    const refCount = db.prepare('SELECT COUNT(*) AS n FROM post_tags WHERE tag_id = ?').get(id) as any
    if (refCount.n > 0) return c.json({ error: 'tag in use' }, 409)
    const r = db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    if (r.changes === 0) return c.json({ error: 'not found' }, 404)
    return new Response(null, { status: 204 })
  })
}
