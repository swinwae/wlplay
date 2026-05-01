// src/api/client.ts

// 跨子域调用：Admin SPA 在 admin.wlplay.cn，但 API 同域；公开页在 wlplay.cn，API 走主域代理
const API_BASE = ''  // 同域；nginx 把 /api/* 反代到后端

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  })
  const text = await res.text()
  let body: any = null
  if (text) { try { body = JSON.parse(text) } catch { body = text } }
  if (!res.ok) {
    const msg = (body && typeof body === 'object' && body.error) || res.statusText
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }
  return body as T
}
