// src/api/public.ts
import { http } from './client'

export interface PublicPost {
  id: number; slug: string; title: string; summary: string
  read_time: string | null; status: string; is_featured: boolean
  cover_color: string | null; published_at: string | null
  tags: { name: string; color: string }[]
  body?: string
}

export interface PublicTag {
  id: number; name: string; color: string; sort: number; post_count: number
}

export interface PublicMedia {
  id: number; type: 'music' | 'book' | 'movie'; title: string; author: string
}

export interface PublicAbout {
  avatar: string; name: string; bio: string
  links: { label: string; url: string }[]
}

export const publicApi = {
  posts:    () => http<PublicPost[]>('/api/public/posts'),
  post:     (slug: string) => http<PublicPost>(`/api/public/posts/${encodeURIComponent(slug)}`),
  tags:     () => http<PublicTag[]>('/api/public/tags'),
  media:    () => http<PublicMedia[]>('/api/public/media'),
  about:    () => http<PublicAbout | null>('/api/public/about'),
  stats:    () => http<{ posts_count: number; total_read_minutes: number }>('/api/public/stats'),
}
