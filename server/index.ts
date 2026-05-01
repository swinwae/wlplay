// server/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { getDb } from './db'

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

if (import.meta.url === `file://${process.argv[1]}`) {
  getDb()
  const port = Number(process.env.PORT || 3010)
  serve({ fetch: app.fetch, port })
  console.log(`wlplay-blog listening on http://127.0.0.1:${port}`)
}

export default app
