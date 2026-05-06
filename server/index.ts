// server/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { getDb } from './db.js'
import { mountPublic } from './routes/public.js'
import { mountAdmin } from './routes/admin.js'
import { mountUpload } from './routes/upload.js'

const app = new Hono()
const db = getDb()

app.get('/api/health', (c) => c.json({ ok: true }))
mountPublic(app, db)
mountAdmin(app, db)
mountUpload(app)

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3010)
  serve({ fetch: app.fetch, port })
  console.log(`wlplay-blog listening on http://127.0.0.1:${port}`)
}

export default app
