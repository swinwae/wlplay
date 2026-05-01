// src/api/admin.ts
import { http } from './client'
import type { PublicTag, PublicAbout } from './public'

export interface AdminPost {
  id: number; slug: string; title: string; summary: string; body: string
  read_time: string | null; status: 'draft' | 'published'; is_featured: boolean
  cover_color: string | null; published_at: string | null
  created_at: string; updated_at: string
  tags: { id: number; name: string; color: string; sort: number }[]
}

export interface AdminMedia {
  id: number; type: 'music' | 'book' | 'movie'
  title: string; author: string; sort: number; active: boolean
}

export const adminApi = {
  // posts
  listPosts:    (status: 'all'|'draft'|'published' = 'all') =>
                  http<AdminPost[]>(`/api/admin/posts?status=${status}`),
  getPost:      (id: number) => http<AdminPost>(`/api/admin/posts/${id}`),
  createPost:   (b: Partial<AdminPost> & { tag_ids?: number[] }) =>
                  http<AdminPost>('/api/admin/posts', { method: 'POST', body: JSON.stringify(b) }),
  patchPost:    (id: number, b: Partial<AdminPost> & { tag_ids?: number[] }) =>
                  http<AdminPost>(`/api/admin/posts/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  deletePost:   (id: number) => http<void>(`/api/admin/posts/${id}`, { method: 'DELETE' }),
  publishPost:  (id: number) => http<AdminPost>(`/api/admin/posts/${id}/publish`, { method: 'POST' }),
  unpublishPost:(id: number) => http<AdminPost>(`/api/admin/posts/${id}/unpublish`, { method: 'POST' }),
  featurePost:  (id: number) => http<AdminPost>(`/api/admin/posts/${id}/feature`, { method: 'POST' }),
  unfeaturePost:(id: number) => http<AdminPost>(`/api/admin/posts/${id}/unfeature`, { method: 'POST' }),

  // tags
  listTags:     () => http<PublicTag[]>('/api/admin/tags'),
  createTag:    (b: { name: string; color: string; sort?: number }) =>
                  http<PublicTag>('/api/admin/tags', { method: 'POST', body: JSON.stringify(b) }),
  patchTag:     (id: number, b: Partial<{ name: string; color: string; sort: number }>) =>
                  http<PublicTag>(`/api/admin/tags/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  deleteTag:    (id: number) => http<void>(`/api/admin/tags/${id}`, { method: 'DELETE' }),

  // media
  listMedia:    () => http<AdminMedia[]>('/api/admin/media'),
  createMedia:  (b: Omit<AdminMedia,'id'>) =>
                  http<AdminMedia>('/api/admin/media', { method: 'POST', body: JSON.stringify(b) }),
  patchMedia:   (id: number, b: Partial<Omit<AdminMedia,'id'>>) =>
                  http<AdminMedia>(`/api/admin/media/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  deleteMedia:  (id: number) => http<void>(`/api/admin/media/${id}`, { method: 'DELETE' }),

  // about
  getAbout:     () => http<PublicAbout | null>('/api/admin/about'),
  patchAbout:   (b: Partial<PublicAbout>) =>
                  http<PublicAbout>('/api/admin/about', { method: 'PATCH', body: JSON.stringify(b) }),

  // upload
  upload:       async (file: File): Promise<{ url: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
    if (!res.ok) throw new Error(`upload failed ${res.status}`)
    return res.json()
  },
}
