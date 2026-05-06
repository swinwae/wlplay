// server/seed.ts
import { getDb } from './db.js'

interface SeedPost {
  slug: string; title: string; summary: string; tag: string
  read_time: string; published_at: string; cover_color: string; is_featured?: boolean
}

const TAGS: { name: string; color: string; sort: number }[] = [
  { name: '密码学',   color: '#7C3AED', sort: 0 },
  { name: 'AI 工具',  color: '#2563EB', sort: 1 },
  { name: 'Web 开发', color: '#059669', sort: 2 },
  { name: '数学',     color: '#D97706', sort: 3 },
  { name: '随笔',     color: '#0E7490', sort: 4 },
]

const POSTS: SeedPost[] = [
  { slug: 'understanding-ecc', title: '理解椭圆曲线密码学',
    summary: '从有限域到点乘法，深入探索 ECC 背后的数学原理，以及它对现代安全的意义。',
    tag: '密码学', read_time: '12 分钟', published_at: '2026-04-01',
    cover_color: '#7C3AED', is_featured: true },
  { slug: 'claude-code-deep', title: 'Claude Code 深度探索',
    summary: '探索 Claude Code 作为开发伙伴的能力 — 从代码生成到架构推理。',
    tag: 'AI 工具', read_time: '8 分钟', published_at: '2026-03-28', cover_color: '#2563EB' },
  { slug: 'wlplay-portal', title: '用 Vue 3 构建门户应用',
    summary: '我如何构建 WLPlay — 一个基于 Vue 3、Vite 和 iframe 嵌入的多项目门户。',
    tag: 'Web 开发', read_time: '6 分钟', published_at: '2026-03-15', cover_color: '#059669' },
  { slug: 'beauty-of-finite-fields', title: '有限域之美',
    summary: '有限域的直觉入门，以及它在纠错编码和密码学中的精妙应用。',
    tag: '数学', read_time: '10 分钟', published_at: '2026-02-20', cover_color: '#D97706' },
  { slug: 'superpowers-overview', title: 'Claude Code 的超能力系统',
    summary: 'Superpowers 技能系统全览 — 让 AI 辅助开发更可靠的结构化工作流。',
    tag: 'AI 工具', read_time: '5 分钟', published_at: '2026-02-05', cover_color: '#DC2626' },
  { slug: 'why-i-blog', title: '为什么我开始写博客',
    summary: '关于公开学习、构建个人知识库以及把想法写下来的价值的思考。',
    tag: '随笔', read_time: '4 分钟', published_at: '2025-12-20', cover_color: '#0E7490' },
]

const MEDIA = [
  { type: 'music' as const, title: '月光', author: 'Debussy', sort: 0 },
  { type: 'book' as const, title: '数据密集型应用设计', author: 'Martin Kleppmann', sort: 1 },
  { type: 'movie' as const, title: '星际穿越', author: 'Christopher Nolan', sort: 2 },
]

const ABOUT = {
  avatar: 'W', name: 'Wan Li',
  bio: '开发者 & 探索者。构建有趣的东西，记录学习的过程。',
  links: [
    { label: 'GitHub',   url: 'https://github.com/swinwae' },
    { label: 'Terminal', url: 'https://term.wlplay.cn' },
    { label: 'Wiki',     url: 'https://wiki.wlplay.cn' },
  ],
}

function main() {
  const db = getDb()
  const tx = db.transaction(() => {
    // tags
    if (!(db.prepare('SELECT COUNT(*) AS n FROM tags').get() as any).n) {
      const ins = db.prepare('INSERT INTO tags (name, color, sort) VALUES (?, ?, ?)')
      for (const t of TAGS) ins.run(t.name, t.color, t.sort)
      console.log(`seed: tags ${TAGS.length} 条`)
    }
    // posts
    if (!(db.prepare('SELECT COUNT(*) AS n FROM posts').get() as any).n) {
      const insPost = db.prepare(`INSERT INTO posts
        (slug, title, summary, body, read_time, status, is_featured, cover_color, published_at)
        VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?)`)
      const insPT = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)')
      const tagId = (n: string) =>
        (db.prepare('SELECT id FROM tags WHERE name = ?').get(n) as any).id
      for (const p of POSTS) {
        const r = insPost.run(
          p.slug, p.title, p.summary, '',
          p.read_time, p.is_featured ? 1 : 0, p.cover_color, p.published_at
        )
        insPT.run(Number(r.lastInsertRowid), tagId(p.tag))
      }
      console.log(`seed: posts ${POSTS.length} 条`)
    }
    // media
    if (!(db.prepare('SELECT COUNT(*) AS n FROM media_items').get() as any).n) {
      const ins = db.prepare(`INSERT INTO media_items (type, title, author, sort, active) VALUES (?, ?, ?, ?, 1)`)
      for (const m of MEDIA) ins.run(m.type, m.title, m.author, m.sort)
      console.log(`seed: media ${MEDIA.length} 条`)
    }
    // about
    if (!(db.prepare('SELECT COUNT(*) AS n FROM about').get() as any).n) {
      db.prepare(`INSERT INTO about (id, avatar, name, bio, links) VALUES (1, ?, ?, ?, ?)`)
        .run(ABOUT.avatar, ABOUT.name, ABOUT.bio, JSON.stringify(ABOUT.links))
      console.log('seed: about 1 条')
    }
  })
  tx()
  db.close()
  console.log('seed done.')
}

main()
