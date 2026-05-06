import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadToImageHosting } from './image-hosting'

describe('uploadToImageHosting', () => {
  const ENV = { ...process.env }
  beforeEach(() => { process.env.IMAGE_HOSTING_UPLOAD_URL = 'http://hosting/upload'
                     process.env.IMAGE_HOSTING_BASE_URL = 'http://hosting' })
  afterEach(() => { process.env = { ...ENV }; vi.restoreAllMocks() })

  it('forwards multipart and returns proxy url', async () => {
    const mockFetch = vi.fn(async () => new Response(
      JSON.stringify({ id: 42, filename: 'x.png' }),
      { status: 201, headers: { 'content-type': 'application/json' } }
    ))
    vi.stubGlobal('fetch', mockFetch)
    const buf = new Uint8Array([1,2,3])
    const out = await uploadToImageHosting(buf, 'x.png', 'image/png')
    expect(out).toEqual({ url: 'http://hosting/proxy/42' })
    expect(mockFetch).toHaveBeenCalledWith('http://hosting/upload', expect.objectContaining({ method: 'POST' }))
  })

  it('throws when hosting returns non-2xx', async () => {
    vi.stubGlobal('fetch', async () => new Response('boom', { status: 500 }))
    await expect(uploadToImageHosting(new Uint8Array([1]), 'x.png', 'image/png'))
      .rejects.toThrow()
  })
})
