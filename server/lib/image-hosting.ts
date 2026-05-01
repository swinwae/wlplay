// server/lib/image-hosting.ts
export async function uploadToImageHosting(
  bytes: Uint8Array, filename: string, contentType: string
): Promise<{ url: string }> {
  const uploadUrl = process.env.IMAGE_HOSTING_UPLOAD_URL
  const baseUrl = process.env.IMAGE_HOSTING_BASE_URL
  if (!uploadUrl || !baseUrl) {
    throw new Error('IMAGE_HOSTING_UPLOAD_URL / IMAGE_HOSTING_BASE_URL 未配置')
  }
  const form = new FormData()
  const blob = new Blob([bytes], { type: contentType })
  form.append('file', blob, filename)
  const res = await fetch(uploadUrl, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`image-hosting ${res.status}: ${await res.text()}`)
  const json = await res.json() as { id: number }
  return { url: `${baseUrl.replace(/\/$/, '')}/proxy/${json.id}` }
}
