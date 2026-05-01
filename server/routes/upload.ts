// server/routes/upload.ts
import type { Hono } from 'hono'
import { uploadToImageHosting } from '../lib/image-hosting.js'

const ALLOWED = new Set(['image/jpeg','image/png','image/gif','image/webp'])

export function mountUpload(app: Hono) {
  app.post('/api/admin/upload', async (c) => {
    const ct = c.req.header('content-type') ?? ''
    if (!ct.includes('multipart/form-data')) {
      return c.json({ error: 'expected multipart/form-data' }, 400)
    }
    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return c.json({ error: 'missing file' }, 400)
    if (!ALLOWED.has(file.type)) return c.json({ error: `unsupported type ${file.type}` }, 400)
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'too large (max 10MB)' }, 400)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const out = await uploadToImageHosting(buf, file.name, file.type)
      return c.json(out, 201)
    } catch (e: any) {
      return c.json({ error: e.message }, 502)
    }
  })
}
