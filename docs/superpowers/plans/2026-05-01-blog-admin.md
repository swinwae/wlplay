# 博客管理后台 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wlplay 仓库中实现一个博客管理后台 — Hono+SQLite 后端、Tiptap WYSIWYG 编辑器、Vue Router 多视图前端，并把现有静态主页改造为消费 API 的动态站。

**Architecture:** 单仓库、单 Vue SPA（hostname 区分前台/admin）、单 Hono 进程同时挂公开和管理 API、SQLite 单文件存储；nginx 在 `admin.wlplay.cn` 子域前置 `auth_request` 复用 wiki 的统一登录。

**Tech Stack:** Vue 3 + vue-router 4 + Vite, Tiptap, DOMPurify, Hono + @hono/node-server, better-sqlite3, zod, Vitest, lowlight + highlight.js.

**Spec 引用:** `docs/superpowers/specs/2026-05-01-blog-admin-design.md`

---

## 阶段路线图

| Phase | 主题 | 输出 |
|-------|------|------|
| 0 | 项目脚手架 | 依赖、目录、tsconfig、vitest 配置 |
| 1 | 后端核心 | DB 模块 + migration + Hono 启动 |
| 2 | 公开 API | `/api/public/*` 全部端点 + 单测 |
| 3 | 管理 API | `/api/admin/*` 全部端点 + 单测 |
| 4 | 上传桥 | `/api/admin/upload` 转发到 image-uploader |
| 5 | Seed 脚本 | 把硬编码内容写入空 DB |
| 6 | 前端基础设施 | vue-router、API 客户端、host 路由分发 |
| 7 | 公开站改造 | Home.vue API 化 + 新增 PostDetail.vue |
| 8 | Admin 壳 | AdminApp.vue 侧栏 + 路由 |
| 9 | 实体管理页 | PostsList / TagsManager / MediaManager / AboutEditor |
| 10 | Tiptap 编辑器组件 | TiptapEditor.vue + 工具栏 + 图片上传 |
| 11 | PostEditor | 整合 Tiptap，新建/编辑/发布/置顶交互 |
| 12 | 构建与本地联调 | npm scripts、并行 dev、生产 build |
| 13 | 部署 | pm2 + nginx + DNS + deploy.md |

---

## Phase 0: 项目脚手架

### Task 0.1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加运行时依赖**

```bash
npm install vue-router@4 \
  @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image \
  @tiptap/extension-placeholder @tiptap/extension-code-block-lowlight \
  lowlight highlight.js \
  isomorphic-dompurify marked \
  hono @hono/node-server better-sqlite3 zod
```

- [ ] **Step 2: 添加开发依赖**

```bash
npm install -D vitest @vitest/coverage-v8 \
  @types/better-sqlite3 \
  tsx concurrently supertest @types/supertest
```

- [ ] **Step 3: 验证安装**

```bash
npm ls vue-router hono better-sqlite3 @tiptap/vue-3
```
Expected: 所有包都列出版本号无 `UNMET DEPENDENCY`

- [ ] **Step 4: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: 安装博客后台所需依赖"
```

### Task 0.2: 创建目录骨架

**Files:**
- Create: `server/` 目录树
- Create: `src/api/`, `src/pages/`, `src/pages/admin/`, `src/components/editor/`

- [ ] **Step 1: 建目录**

```bash
mkdir -p server/migrations server/routes server/lib \
         src/api src/pages src/pages/admin src/components/editor
touch server/.gitkeep src/api/.gitkeep
```

- [ ] **Step 2: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": ".",
    "allowImportingTsExtensions": false,
    "noEmit": false,
    "declaration": false,
    "isolatedModules": true,
    "verbatimModuleSyntax": false
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: 提交**

```bash
git add server/tsconfig.json server/.gitkeep src/api/.gitkeep
git commit -m "chore: 创建博客后台目录骨架"
```

### Task 0.3: 配置 Vitest

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: 写配置**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
  },
})
```

- [ ] **Step 2: 在 package.json 加 scripts**

把 `"scripts"` 节修改为：

```json
"scripts": {
  "dev": "concurrently -n web,api -c blue,green \"vite\" \"npm run dev:server\"",
  "dev:server": "tsx watch server/index.ts",
  "dev:web": "vite",
  "build": "vue-tsc -b && vite build && tsc -p server/tsconfig.json",
  "preview": "vite preview",
  "seed": "tsx server/seed.ts",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: 验证 vitest 能跑（即使没用例）**

```bash
npm run test
```
Expected: `No test files found` 退出码 0 或 1，无配置错误。

- [ ] **Step 4: 提交**

```bash
git add vitest.config.ts package.json
git commit -m "chore: 添加 vitest 配置和 npm scripts"
```

### Task 0.4: 更新 .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 追加忽略项**

在 `.gitignore` 末尾追加：

```
# 博客后台
server/dist/
*.db
*.db-journal
data/
```

- [ ] **Step 2: 提交**

```bash
git add .gitignore
git commit -m "chore: gitignore 忽略 server 构建产物和本地 SQLite"
```

---

## Phase 1: 后端核心

### Task 1.1: DB 模块（连接 + migration runner）

**Files:**
- Create: `server/db.ts`
- Create: `server/db.test.ts`

- [ ] **Step 1: 写测试 server/db.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { openDb, runMigrations } from './db'

const tmp = path.join(os.tmpdir(), `wlplay-blog-test-${process.pid}-${Date.now()}.db`)

describe('db', () => {
  beforeEach(() => { try { fs.unlinkSync(tmp) } catch {} })

  it('opens a fresh sqlite file', () => {
    const db = openDb(tmp)
    expect(db.open).toBe(true)
    db.close()
  })

  it('runs migrations and is idempotent', () => {
    const db = openDb(tmp)
    runMigrations(db, path.join(__dirname, 'migrations'))
    runMigrations(db, path.join(__dirname, 'migrations'))
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name:string}[]
    const names = tables.map(t => t.name)
    expect(names).toContain('posts')
    expect(names).toContain('tags')
    expect(names).toContain('post_tags')
    expect(names).toContain('media_items')
    expect(names).toContain('about')
    expect(names).toContain('_migrations')
    db.close()
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/db.test.ts
```
Expected: FAIL — `Cannot find module './db'`

- [ ] **Step 3: 实现 server/db.ts**

```ts
// server/db.ts
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export type DB = Database.Database

export function openDb(filePath: string): DB {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function runMigrations(db: DB, migrationsDir: string): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as {name:string}[]).map(r => r.name)
  )
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const tx = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    })
    tx()
  }
}

let _singleton: DB | null = null
export function getDb(): DB {
  if (_singleton) return _singleton
  const filePath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'blog.db')
  _singleton = openDb(filePath)
  runMigrations(_singleton, path.resolve(__dirname, 'migrations'))
  return _singleton
}
```

- [ ] **Step 4: 创建初始 migration**

文件 `server/migrations/001_init.sql`：

```sql
CREATE TABLE posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  read_time     TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  is_featured   INTEGER NOT NULL DEFAULT 0,
  cover_color   TEXT,
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE RESTRICT,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE media_items (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  type   TEXT NOT NULL CHECK (type IN ('music','book','movie')),
  title  TEXT NOT NULL,
  author TEXT NOT NULL,
  sort   INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE about (
  id     INTEGER PRIMARY KEY CHECK (id = 1),
  avatar TEXT NOT NULL,
  name   TEXT NOT NULL,
  bio    TEXT NOT NULL,
  links  TEXT NOT NULL
);

CREATE INDEX idx_posts_status_published_at ON posts(status, published_at DESC);
CREATE INDEX idx_posts_featured            ON posts(is_featured) WHERE is_featured = 1;
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
npm run test -- server/db.test.ts
```
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add server/db.ts server/db.test.ts server/migrations/001_init.sql
git commit -m "feat: 实现 SQLite 连接和 migration runner"
```

### Task 1.2: Hono 启动入口

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: 写最小 server**

```ts
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
```

注：`import.meta.url === \`file://${process.argv[1]}\`` 这条件让此文件既能 `tsx` 直接跑、也能被测试 `import` 不自动启动 socket。

- [ ] **Step 2: 启动 server 验证**

终端 A：
```bash
DB_PATH=./data/blog.db npm run dev:server
```

终端 B：
```bash
curl -s http://127.0.0.1:3010/api/health
```
Expected: `{"ok":true}`

按 Ctrl+C 停掉终端 A。

- [ ] **Step 3: 提交**

```bash
git add server/index.ts
git commit -m "feat: 添加 Hono 后端入口和 /api/health"
```

---

## Phase 2: 公开 API

### Task 2.1: 公开 API 路由模块

**Files:**
- Create: `server/routes/public.ts`
- Create: `server/routes/public.test.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 写测试 server/routes/public.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Hono } from 'hono'
import { openDb, runMigrations, type DB } from '../db'
import { mountPublic } from './public'

let db: DB
let app: Hono

const tmp = () => path.join(os.tmpdir(), `wlplay-pub-${process.pid}-${Date.now()}-${Math.random()}.db`)

beforeEach(() => {
  const file = tmp()
  try { fs.unlinkSync(file) } catch {}
  db = openDb(file)
  runMigrations(db, path.resolve(__dirname, '..', 'migrations'))
  app = new Hono()
  mountPublic(app, db)
})

describe('GET /api/public/posts', () => {
  it('returns empty list when no posts', async () => {
    const res = await app.fetch(new Request('http://x/api/public/posts'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns published posts only by default, with main tag', async () => {
    db.exec(`INSERT INTO tags (name, color, sort) VALUES ('密码学', '#7C3AED', 0), ('随笔', '#0E7490', 1)`)
    db.exec(`INSERT INTO posts (slug, title, summary, status, published_at) VALUES
      ('a', '已发布', '...', 'published', '2026-04-01'),
      ('b', '草稿',   '...', 'draft',     NULL)`)
    db.exec(`INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (1, 2)`)
    const res = await app.fetch(new Request('http://x/api/public/posts'))
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].slug).toBe('a')
    expect(body[0].tags[0]).toEqual({ name: '密码学', color: '#7C3AED' })
    expect(body[0]).not.toHaveProperty('body')
  })
})

describe('GET /api/public/posts/:slug', () => {
  it('returns body for published post', async () => {
    db.prepare(`INSERT INTO posts (slug, title, summary, body, status, published_at) VALUES (?,?,?,?,?,?)`)
      .run('hello', '你好', 'sum', '<p>正文</p>', 'published', '2026-04-01')
    const res = await app.fetch(new Request('http://x/api/public/posts/hello'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.body).toBe('<p>正文</p>')
  })

  it('404 for missing slug', async () => {
    const res = await app.fetch(new Request('http://x/api/public/posts/nope'))
    expect(res.status).toBe(404)
  })

  it('404 for draft post (publicly invisible)', async () => {
    db.prepare(`INSERT INTO posts (slug, title, summary, body, status) VALUES (?,?,?,?,?)`)
      .run('draft', 'D', 'S', 'B', 'draft')
    const res = await app.fetch(new Request('http://x/api/public/posts/draft'))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/public/tags', () => {
  it('returns tags with post_count of published posts only', async () => {
    db.exec(`INSERT INTO tags (name, color) VALUES ('密码学', '#7C3AED'), ('未用', '#000')`)
    db.exec(`INSERT INTO posts (slug, title, summary, status) VALUES ('a','A','s','published')`)
    db.exec(`INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1)`)
    const res = await app.fetch(new Request('http://x/api/public/tags'))
    const body = await res.json() as any[]
    const t1 = body.find(t => t.name === '密码学')
    const t2 = body.find(t => t.name === '未用')
    expect(t1.post_count).toBe(1)
    expect(t2.post_count).toBe(0)
  })
})

describe('GET /api/public/media', () => {
  it('returns active media in sort order', async () => {
    db.exec(`INSERT INTO media_items (type, title, author, sort, active) VALUES
      ('book','B','A1', 1, 1),
      ('music','M','A2', 0, 1),
      ('movie','X','A3', 0, 0)`)
    const res = await app.fetch(new Request('http://x/api/public/media'))
    const body = await res.json() as any[]
    expect(body.map(m => m.title)).toEqual(['M', 'B'])
  })
})

describe('GET /api/public/about', () => {
  it('returns null when not set', async () => {
    const res = await app.fetch(new Request('http://x/api/public/about'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns parsed links array', async () => {
    db.prepare(`INSERT INTO about (id, avatar, name, bio, links) VALUES (1, ?, ?, ?, ?)`)
      .run('W', 'Wan', 'bio', JSON.stringify([{ label: 'GitHub', url: 'https://x' }]))
    const res = await app.fetch(new Request('http://x/api/public/about'))
    const body = await res.json()
    expect(body.links).toEqual([{ label: 'GitHub', url: 'https://x' }])
  })
})

describe('GET /api/public/stats', () => {
  it('counts published posts and sums read_time minutes', async () => {
    db.exec(`INSERT INTO posts (slug, title, summary, status, read_time) VALUES
      ('a','A','s','published','12 分钟'),
      ('b','B','s','published','5 minutes'),
      ('c','C','s','draft','100 分钟')`)
    const res = await app.fetch(new Request('http://x/api/public/stats'))
    const body = await res.json()
    expect(body.posts_count).toBe(2)
    expect(body.total_read_minutes).toBe(17)
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/routes/public.test.ts
```
Expected: FAIL — `Cannot find module './public'`

- [ ] **Step 3: 实现 server/routes/public.ts**

```ts
// server/routes/public.ts
import type { Hono } from 'hono'
import type { DB } from '../db'

interface PostRow {
  id: number; slug: string; title: string; summary: string; body: string
  read_time: string | null; status: string; is_featured: number
  cover_color: string | null; published_at: string | null
  created_at: string; updated_at: string
}

function loadTags(db: DB, postId: number) {
  return db.prepare(`
    SELECT t.id, t.name, t.color, t.sort
    FROM tags t JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = ? ORDER BY t.sort ASC, t.id ASC
  `).all(postId) as { id:number; name:string; color:string; sort:number }[]
}

function shapePost(db: DB, row: PostRow, includeBody: boolean) {
  const tags = loadTags(db, row.id).map(t => ({ name: t.name, color: t.color }))
  const out: Record<string, unknown> = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    read_time: row.read_time,
    status: row.status,
    is_featured: row.is_featured === 1,
    cover_color: row.cover_color,
    published_at: row.published_at,
    tags,
  }
  if (includeBody) out.body = row.body
  return out
}

function parseMinutes(s: string | null): number {
  if (!s) return 0
  const m = s.match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

export function mountPublic(app: Hono, db: DB) {
  app.get('/api/public/posts', (c) => {
    const rows = db.prepare(
      `SELECT * FROM posts WHERE status = 'published'
       ORDER BY is_featured DESC, published_at DESC, id DESC`
    ).all() as PostRow[]
    return c.json(rows.map(r => shapePost(db, r, false)))
  })

  app.get('/api/public/posts/:slug', (c) => {
    const slug = c.req.param('slug')
    const row = db.prepare(
      `SELECT * FROM posts WHERE slug = ? AND status = 'published'`
    ).get(slug) as PostRow | undefined
    if (!row) return c.json({ error: 'not found' }, 404)
    return c.json(shapePost(db, row, true))
  })

  app.get('/api/public/tags', (c) => {
    const rows = db.prepare(`
      SELECT t.id, t.name, t.color, t.sort,
        (SELECT COUNT(*) FROM post_tags pt JOIN posts p ON p.id = pt.post_id
         WHERE pt.tag_id = t.id AND p.status = 'published') AS post_count
      FROM tags t
      ORDER BY t.sort ASC, t.id ASC
    `).all()
    return c.json(rows)
  })

  app.get('/api/public/media', (c) => {
    const rows = db.prepare(
      `SELECT id, type, title, author FROM media_items
       WHERE active = 1 ORDER BY sort ASC, id ASC`
    ).all()
    return c.json(rows)
  })

  app.get('/api/public/about', (c) => {
    const row = db.prepare(`SELECT avatar, name, bio, links FROM about WHERE id = 1`).get() as any
    if (!row) return c.json(null)
    let links: unknown = []
    try { links = JSON.parse(row.links) } catch { links = [] }
    return c.json({ avatar: row.avatar, name: row.name, bio: row.bio, links })
  })

  app.get('/api/public/stats', (c) => {
    const rows = db.prepare(
      `SELECT read_time FROM posts WHERE status = 'published'`
    ).all() as { read_time: string | null }[]
    const total_read_minutes = rows.reduce((s, r) => s + parseMinutes(r.read_time), 0)
    return c.json({ posts_count: rows.length, total_read_minutes })
  })
}
```

- [ ] **Step 4: 在 index.ts 挂载**

修改 `server/index.ts`，在 `app.get('/api/health', ...)` 后插入：

```ts
import { mountPublic } from './routes/public'

mountPublic(app, getDb())
```

并在文件顶部把 `getDb()` 调用上提到模块顶层（替换原来仅在 `if (import.meta.url ...)` 里调）：

```ts
// server/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { getDb } from './db'
import { mountPublic } from './routes/public'

const app = new Hono()
const db = getDb()

app.get('/api/health', (c) => c.json({ ok: true }))
mountPublic(app, db)

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3010)
  serve({ fetch: app.fetch, port })
  console.log(`wlplay-blog listening on http://127.0.0.1:${port}`)
}

export default app
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
npm run test -- server/routes/public.test.ts
```
Expected: PASS（6+ 用例全绿）

- [ ] **Step 6: 提交**

```bash
git add server/routes/public.ts server/routes/public.test.ts server/index.ts
git commit -m "feat: 实现公开 API（posts/tags/media/about/stats）"
```

---

## Phase 3: 管理 API

### Task 3.1: 内容清洗工具

**Files:**
- Create: `server/lib/sanitize.ts`
- Create: `server/lib/sanitize.test.ts`

- [ ] **Step 1: 写测试**

```ts
// server/lib/sanitize.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('strips <script> tags', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })
  it('strips event handlers', () => {
    expect(sanitizeHtml('<a href="x" onclick="evil()">x</a>')).not.toContain('onclick')
  })
  it('keeps standard formatting', () => {
    const html = '<h1>标题</h1><p><strong>粗</strong></p><ul><li>a</li></ul>'
    expect(sanitizeHtml(html)).toBe(html)
  })
  it('keeps img and pre/code', () => {
    const html = '<p><img src="https://x/y.jpg" alt=""></p><pre><code class="language-ts">x</code></pre>'
    expect(sanitizeHtml(html)).toContain('<img')
    expect(sanitizeHtml(html)).toContain('<code')
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/lib/sanitize.test.ts
```
Expected: FAIL — `Cannot find module './sanitize'`

- [ ] **Step 3: 实现**

```ts
// server/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p','br','hr','strong','em','del','code','pre','blockquote',
  'ul','ol','li','h1','h2','h3','h4','h5','h6',
  'a','img','span','div','table','thead','tbody','tr','th','td'
]
const ALLOWED_ATTR = ['href','src','alt','title','class','id','target','rel','colspan','rowspan']

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
npm run test -- server/lib/sanitize.test.ts
```
Expected: PASS

- [ ] **Step 5: 让公开 API 在读取时也清洗（spec §6.2 双向清洗）**

修改 `server/routes/public.ts`，顶部加 import：

```ts
import { sanitizeHtml } from '../lib/sanitize'
```

把 `app.get('/api/public/posts/:slug', ...)` handler 改成：

```ts
app.get('/api/public/posts/:slug', (c) => {
  const slug = c.req.param('slug')
  const row = db.prepare(
    `SELECT * FROM posts WHERE slug = ? AND status = 'published'`
  ).get(slug) as PostRow | undefined
  if (!row) return c.json({ error: 'not found' }, 404)
  const shaped = shapePost(db, row, true) as Record<string, unknown>
  shaped.body = sanitizeHtml(String(shaped.body ?? ''))
  return c.json(shaped)
})
```

跑公开 API 测试确保仍通过：
```bash
npm run test -- server/routes/public.test.ts
```
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add server/lib/sanitize.ts server/lib/sanitize.test.ts server/routes/public.ts
git commit -m "feat: 服务端 HTML 清洗 + 公开 API 读取时双向防御"
```

### Task 3.2: 管理 API — Posts CRUD

**Files:**
- Create: `server/routes/admin.ts`
- Create: `server/routes/admin.test.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 写测试 server/routes/admin.test.ts（Posts 部分）**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Hono } from 'hono'
import { openDb, runMigrations, type DB } from '../db'
import { mountAdmin } from './admin'

let db: DB
let app: Hono

beforeEach(() => {
  const file = path.join(os.tmpdir(), `wlplay-admin-${process.pid}-${Date.now()}-${Math.random()}.db`)
  try { fs.unlinkSync(file) } catch {}
  db = openDb(file)
  runMigrations(db, path.resolve(__dirname, '..', 'migrations'))
  app = new Hono()
  mountAdmin(app, db)
})

const post = (url: string, body: any) =>
  app.fetch(new Request(`http://x${url}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }))

const patch = (url: string, body: any) =>
  app.fetch(new Request(`http://x${url}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }))

const del = (url: string) =>
  app.fetch(new Request(`http://x${url}`, { method: 'DELETE' }))

describe('admin posts', () => {
  it('creates a post', async () => {
    const r = await post('/api/admin/posts', {
      slug: 'hello', title: '你好', summary: 's', body: '<p>正文</p>'
    })
    expect(r.status).toBe(201)
    const b = await r.json()
    expect(b.id).toBeGreaterThan(0)
    expect(b.status).toBe('draft')
  })

  it('rejects duplicate slug', async () => {
    await post('/api/admin/posts', { slug: 'x', title: 't', summary: 's' })
    const r = await post('/api/admin/posts', { slug: 'x', title: 't2', summary: 's' })
    expect(r.status).toBe(409)
  })

  it('rejects bad payload (zod)', async () => {
    const r = await post('/api/admin/posts', { slug: 'ok' })  // 缺 title/summary
    expect(r.status).toBe(400)
  })

  it('sanitizes body on create', async () => {
    const r = await post('/api/admin/posts', {
      slug: 's', title: 't', summary: 'x', body: '<p>ok</p><script>alert(1)</script>'
    })
    const b = await r.json()
    expect(b.body).not.toContain('<script>')
  })

  it('updates with PATCH', async () => {
    const c = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's' })
    const id = (await c.json()).id
    const r = await patch(`/api/admin/posts/${id}`, { title: '新标题' })
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b.title).toBe('新标题')
  })

  it('deletes a post', async () => {
    const c = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's' })
    const id = (await c.json()).id
    const r = await del(`/api/admin/posts/${id}`)
    expect(r.status).toBe(204)
  })

  it('publish sets status and published_at', async () => {
    const c = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's' })
    const id = (await c.json()).id
    const r = await post(`/api/admin/posts/${id}/publish`, {})
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b.status).toBe('published')
    expect(b.published_at).toBeTruthy()
  })

  it('feature enforces single featured', async () => {
    const a = await (await post('/api/admin/posts', { slug: 'a', title: 'A', summary: 's' })).json()
    const b = await (await post('/api/admin/posts', { slug: 'b', title: 'B', summary: 's' })).json()
    await post(`/api/admin/posts/${a.id}/feature`, {})
    await post(`/api/admin/posts/${b.id}/feature`, {})
    const rows = db.prepare('SELECT id, is_featured FROM posts ORDER BY id').all() as any[]
    expect(rows.find(r => r.id === a.id).is_featured).toBe(0)
    expect(rows.find(r => r.id === b.id).is_featured).toBe(1)
  })

  it('attaches tag_ids on create', async () => {
    db.exec(`INSERT INTO tags (name, color) VALUES ('密码学','#7C3AED')`)
    const r = await post('/api/admin/posts', { slug: 's', title: 't', summary: 's', tag_ids: [1] })
    expect(r.status).toBe(201)
    const tagRows = db.prepare('SELECT * FROM post_tags').all() as any[]
    expect(tagRows).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: FAIL — `Cannot find module './admin'`

- [ ] **Step 3: 实现 server/routes/admin.ts (Posts 部分)**

```ts
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
}
```

- [ ] **Step 4: 在 index.ts 挂载**

修改 `server/index.ts`：

```ts
import { mountAdmin } from './routes/admin'
// ... 在 mountPublic(app, db) 后加：
mountAdmin(app, db)
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: PASS（9 个 posts 用例全绿）

- [ ] **Step 6: 提交**

```bash
git add server/routes/admin.ts server/routes/admin.test.ts server/index.ts
git commit -m "feat: 实现管理 API Posts CRUD + publish/feature"
```

### Task 3.3: 管理 API — Tags CRUD

**Files:**
- Modify: `server/routes/admin.ts`
- Modify: `server/routes/admin.test.ts`

- [ ] **Step 1: 在 admin.test.ts 末尾追加测试**

```ts
const get = (url: string) => app.fetch(new Request(`http://x${url}`))

describe('admin tags', () => {
  it('creates a tag', async () => {
    const r = await post('/api/admin/tags', { name: '随笔', color: '#0E7490' })
    expect(r.status).toBe(201)
    const b = await r.json()
    expect(b.id).toBeGreaterThan(0)
  })

  it('lists tags', async () => {
    db.exec(`INSERT INTO tags (name, color) VALUES ('a','#000'), ('b','#111')`)
    const r = await get('/api/admin/tags')
    const b = await r.json() as any[]
    expect(b).toHaveLength(2)
  })

  it('updates a tag', async () => {
    const c = await (await post('/api/admin/tags', { name: 'a', color: '#000' })).json()
    const r = await patch(`/api/admin/tags/${c.id}`, { name: 'A!' })
    const b = await r.json()
    expect(b.name).toBe('A!')
  })

  it('rejects deletion when referenced (409)', async () => {
    const t = await (await post('/api/admin/tags', { name: 't', color: '#000' })).json()
    await post('/api/admin/posts', { slug: 's', title: 't', summary: 's', tag_ids: [t.id] })
    const r = await del(`/api/admin/tags/${t.id}`)
    expect(r.status).toBe(409)
  })

  it('deletes an unused tag', async () => {
    const t = await (await post('/api/admin/tags', { name: 't', color: '#000' })).json()
    const r = await del(`/api/admin/tags/${t.id}`)
    expect(r.status).toBe(204)
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: FAIL — tags 端点 404

- [ ] **Step 3: 在 admin.ts 内追加 Tags 路由**

在 `mountAdmin` 函数末尾（最后一个 `app.post` 之后）插入：

```ts
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
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add server/routes/admin.ts server/routes/admin.test.ts
git commit -m "feat: 实现管理 API Tags CRUD"
```

### Task 3.4: 管理 API — Media CRUD

**Files:**
- Modify: `server/routes/admin.ts`
- Modify: `server/routes/admin.test.ts`

- [ ] **Step 1: 追加测试**

```ts
describe('admin media', () => {
  it('creates a media item', async () => {
    const r = await post('/api/admin/media', { type: 'book', title: 'B', author: 'A' })
    expect(r.status).toBe(201)
  })
  it('rejects bad type', async () => {
    const r = await post('/api/admin/media', { type: 'tv', title: 'B', author: 'A' })
    expect(r.status).toBe(400)
  })
  it('updates and deletes', async () => {
    const c = await (await post('/api/admin/media', { type: 'movie', title: 'X', author: 'Y' })).json()
    const u = await patch(`/api/admin/media/${c.id}`, { title: 'XX' })
    expect((await u.json()).title).toBe('XX')
    const d = await del(`/api/admin/media/${c.id}`)
    expect(d.status).toBe(204)
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: FAIL

- [ ] **Step 3: 实现，admin.ts 追加**

```ts
  // ── MEDIA ──
  const MediaCreate = z.object({
    type: z.enum(['music','book','movie']),
    title: z.string().min(1).max(120),
    author: z.string().min(1).max(120),
    sort: z.number().int().default(0),
    active: z.boolean().default(true),
  })
  const MediaPatch = MediaCreate.partial()

  app.get('/api/admin/media', (c) => {
    const rows = db.prepare('SELECT * FROM media_items ORDER BY sort ASC, id ASC').all()
    return c.json((rows as any[]).map(r => ({ ...r, active: r.active === 1 })))
  })

  app.post('/api/admin/media', async (c) => {
    const parsed = MediaCreate.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    const r = db.prepare(`INSERT INTO media_items (type, title, author, sort, active)
      VALUES (?, ?, ?, ?, ?)`).run(d.type, d.title, d.author, d.sort, d.active ? 1 : 0)
    const row = db.prepare('SELECT * FROM media_items WHERE id = ?').get(Number(r.lastInsertRowid)) as any
    return c.json({ ...row, active: row.active === 1 }, 201)
  })

  app.patch('/api/admin/media/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const exists = db.prepare('SELECT id FROM media_items WHERE id = ?').get(id)
    if (!exists) return c.json({ error: 'not found' }, 404)
    const parsed = MediaPatch.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    const fields: string[] = []
    const values: unknown[] = []
    for (const k of ['type','title','author','sort'] as const) {
      if (d[k] !== undefined) { fields.push(`${k} = ?`); values.push(d[k]) }
    }
    if (d.active !== undefined) { fields.push('active = ?'); values.push(d.active ? 1 : 0) }
    if (fields.length) db.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`).run(...values, id)
    const row = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id) as any
    return c.json({ ...row, active: row.active === 1 })
  })

  app.delete('/api/admin/media/:id', (c) => {
    const id = Number(c.req.param('id'))
    const r = db.prepare('DELETE FROM media_items WHERE id = ?').run(id)
    if (r.changes === 0) return c.json({ error: 'not found' }, 404)
    return new Response(null, { status: 204 })
  })
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add server/routes/admin.ts server/routes/admin.test.ts
git commit -m "feat: 实现管理 API Media CRUD"
```

### Task 3.5: 管理 API — About PATCH

**Files:**
- Modify: `server/routes/admin.ts`
- Modify: `server/routes/admin.test.ts`

- [ ] **Step 1: 追加测试**

```ts
describe('admin about', () => {
  it('upserts about (first call inserts)', async () => {
    const r = await patch('/api/admin/about', {
      avatar: 'W', name: 'Wan', bio: 'b',
      links: [{ label: 'GitHub', url: 'https://x' }]
    })
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b.name).toBe('Wan')
  })

  it('partial update preserves other fields', async () => {
    await patch('/api/admin/about', {
      avatar: 'W', name: 'Wan', bio: 'b', links: []
    })
    const r = await patch('/api/admin/about', { bio: '新简介' })
    const b = await r.json()
    expect(b.bio).toBe('新简介')
    expect(b.name).toBe('Wan')
  })

  it('GET admin about returns current', async () => {
    await patch('/api/admin/about', { avatar: 'W', name: 'Wan', bio: 'b', links: [] })
    const r = await get('/api/admin/about')
    const b = await r.json()
    expect(b.name).toBe('Wan')
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: FAIL

- [ ] **Step 3: 实现，admin.ts 追加**

```ts
  // ── ABOUT ──
  const AboutPatch = z.object({
    avatar: z.string().min(1).max(8).optional(),
    name: z.string().min(1).max(60).optional(),
    bio: z.string().min(1).max(280).optional(),
    links: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).optional(),
  })

  app.get('/api/admin/about', (c) => {
    const row = db.prepare('SELECT avatar, name, bio, links FROM about WHERE id = 1').get() as any
    if (!row) return c.json(null)
    let links = []
    try { links = JSON.parse(row.links) } catch {}
    return c.json({ avatar: row.avatar, name: row.name, bio: row.bio, links })
  })

  app.patch('/api/admin/about', async (c) => {
    const parsed = AboutPatch.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400)
    const d = parsed.data
    const exists = db.prepare('SELECT id FROM about WHERE id = 1').get()
    if (!exists) {
      db.prepare(`INSERT INTO about (id, avatar, name, bio, links) VALUES (1, ?, ?, ?, ?)`)
        .run(
          d.avatar ?? 'W',
          d.name ?? 'Anonymous',
          d.bio ?? '',
          JSON.stringify(d.links ?? [])
        )
    } else {
      const fields: string[] = []
      const values: unknown[] = []
      if (d.avatar !== undefined) { fields.push('avatar = ?'); values.push(d.avatar) }
      if (d.name !== undefined) { fields.push('name = ?'); values.push(d.name) }
      if (d.bio !== undefined) { fields.push('bio = ?'); values.push(d.bio) }
      if (d.links !== undefined) { fields.push('links = ?'); values.push(JSON.stringify(d.links)) }
      if (fields.length) db.prepare(`UPDATE about SET ${fields.join(', ')} WHERE id = 1`).run(...values)
    }
    const row = db.prepare('SELECT avatar, name, bio, links FROM about WHERE id = 1').get() as any
    return c.json({ avatar: row.avatar, name: row.name, bio: row.bio, links: JSON.parse(row.links) })
  })
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
npm run test -- server/routes/admin.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add server/routes/admin.ts server/routes/admin.test.ts
git commit -m "feat: 实现管理 API About PATCH"
```

---

## Phase 4: 上传桥（image-hosting 转发）

### Task 4.1: image-hosting 客户端

**Files:**
- Create: `server/lib/image-hosting.ts`
- Create: `server/lib/image-hosting.test.ts`

- [ ] **Step 1: 写测试（用 fetch mock）**

```ts
// server/lib/image-hosting.test.ts
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
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
npm run test -- server/lib/image-hosting.test.ts
```
Expected: FAIL — `Cannot find module './image-hosting'`

- [ ] **Step 3: 实现**

```ts
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
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
npm run test -- server/lib/image-hosting.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add server/lib/image-hosting.ts server/lib/image-hosting.test.ts
git commit -m "feat: 添加 image-hosting 客户端封装"
```

### Task 4.2: /api/admin/upload 路由

**Files:**
- Create: `server/routes/upload.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 实现路由**

```ts
// server/routes/upload.ts
import type { Hono } from 'hono'
import { uploadToImageHosting } from '../lib/image-hosting'

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
```

- [ ] **Step 2: 在 server/index.ts 挂载**

```ts
import { mountUpload } from './routes/upload'
// ... 在 mountAdmin(app, db) 后加：
mountUpload(app)
```

- [ ] **Step 3: 手动验证（可选，需图床本地跑着）**

```bash
DB_PATH=./data/blog.db \
  IMAGE_HOSTING_UPLOAD_URL=http://127.0.0.1:5000/upload \
  IMAGE_HOSTING_BASE_URL=http://127.0.0.1:5000 \
  npm run dev:server
# 另一个终端
curl -F file=@/some/img.png http://127.0.0.1:3010/api/admin/upload
```
Expected: `{"url":"http://127.0.0.1:5000/proxy/<id>"}` 或图床未跑时 502 错误。

- [ ] **Step 4: 跑全部测试确保没破坏**

```bash
npm run test
```
Expected: 全 PASS

- [ ] **Step 5: 提交**

```bash
git add server/routes/upload.ts server/index.ts
git commit -m "feat: 添加 /api/admin/upload 转发到 image-hosting"
```

---

## Phase 5: Seed 脚本

### Task 5.1: 写 seed.ts

**Files:**
- Create: `server/seed.ts`

- [ ] **Step 1: 实现**

```ts
// server/seed.ts
import { getDb } from './db'

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
    { label: 'admin',    url: 'https://admin.wlplay.cn' },
  ],
}

function main() {
  const db = getDb()
  const tx = db.transaction(() => {
    // tags
    if (!db.prepare('SELECT COUNT(*) AS n FROM tags').get<any>().n) {
      const ins = db.prepare('INSERT INTO tags (name, color, sort) VALUES (?, ?, ?)')
      for (const t of TAGS) ins.run(t.name, t.color, t.sort)
      console.log(`seed: tags ${TAGS.length} 条`)
    }
    // posts
    if (!db.prepare('SELECT COUNT(*) AS n FROM posts').get<any>().n) {
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
    if (!db.prepare('SELECT COUNT(*) AS n FROM media_items').get<any>().n) {
      const ins = db.prepare(`INSERT INTO media_items (type, title, author, sort, active) VALUES (?, ?, ?, ?, 1)`)
      for (const m of MEDIA) ins.run(m.type, m.title, m.author, m.sort)
      console.log(`seed: media ${MEDIA.length} 条`)
    }
    // about
    if (!db.prepare('SELECT COUNT(*) AS n FROM about').get<any>().n) {
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
```

注：`get<any>()` 这个 `<any>` 是 better-sqlite3 类型参数；如类型推断不便，可改成 `(... as any).n`。

- [ ] **Step 2: 在干净 DB 上跑一次**

```bash
rm -f data/blog.db
DB_PATH=./data/blog.db npm run seed
```
Expected: `seed: tags 5 条 / seed: posts 6 条 / seed: media 3 条 / seed: about 1 条 / seed done.`

- [ ] **Step 3: 再跑一次（幂等校验）**

```bash
DB_PATH=./data/blog.db npm run seed
```
Expected: 直接 `seed done.`，无插入日志。

- [ ] **Step 4: 起 server 验证公开 API**

```bash
DB_PATH=./data/blog.db npm run dev:server
# 另一终端
curl -s http://127.0.0.1:3010/api/public/posts | head
curl -s http://127.0.0.1:3010/api/public/about
curl -s http://127.0.0.1:3010/api/public/stats
```
Expected: 6 条文章、about 字段齐、stats 含 posts_count=6 totals.

- [ ] **Step 5: 提交**

```bash
git add server/seed.ts
git commit -m "feat: 添加 seed 脚本，初始化默认内容到 SQLite"
```

---

## Phase 6: 前端基础设施

### Task 6.1: 安装 vue-router 并整理 main.ts

**Files:**
- Modify: `src/main.ts`
- Create: `src/router.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建 src/router.ts**

```ts
// src/router.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from './pages/Home.vue'
import PostDetail from './pages/PostDetail.vue'
import ProjectFrame from './pages/ProjectFrame.vue'
import AdminApp from './pages/admin/AdminApp.vue'
import PostsList from './pages/admin/PostsList.vue'
import PostEditor from './pages/admin/PostEditor.vue'
import TagsManager from './pages/admin/TagsManager.vue'
import MediaManager from './pages/admin/MediaManager.vue'
import AboutEditor from './pages/admin/AboutEditor.vue'

const isAdminHost = typeof window !== 'undefined' && window.location.hostname === 'admin.wlplay.cn'

const publicRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/post/:slug', name: 'post-detail', component: PostDetail, props: true },
  { path: '/app/:slug', name: 'project', component: ProjectFrame, props: true },
]

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/', component: AdminApp,
    children: [
      { path: '', redirect: '/posts' },
      { path: 'posts', name: 'posts', component: PostsList },
      { path: 'posts/new', name: 'post-new', component: PostEditor },
      { path: 'posts/:id', name: 'post-edit', component: PostEditor, props: true },
      { path: 'tags', name: 'tags', component: TagsManager },
      { path: 'media', name: 'media', component: MediaManager },
      { path: 'about', name: 'about', component: AboutEditor },
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes: isAdminHost ? adminRoutes : publicRoutes,
})
```

- [ ] **Step 2: 修改 src/main.ts**

```ts
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 3: 修改 src/App.vue（精简成 router 出口）**

```vue
<template>
  <router-view />
</template>
```

- [ ] **Step 4: 暂时创建空白页面占位（让 import 不报错）**

为下面 7 个文件先各自写一个最小占位（每个文件就是单行 template）：
- `src/pages/Home.vue`
- `src/pages/PostDetail.vue`
- `src/pages/ProjectFrame.vue`
- `src/pages/admin/AdminApp.vue`
- `src/pages/admin/PostsList.vue`
- `src/pages/admin/PostEditor.vue`
- `src/pages/admin/TagsManager.vue`
- `src/pages/admin/MediaManager.vue`
- `src/pages/admin/AboutEditor.vue`

每个文件内容（替换组件名）：

```vue
<template><div>占位：Home</div></template>
```

注：占位文字写成对应组件名（"占位：Home" / "占位：PostDetail" 等）。

- [ ] **Step 5: 验证 vite 启动正常**

```bash
npm run dev:web
```
打开 `http://localhost:5173/` 看到"占位：Home"；`http://localhost:5173/post/abc` 看到"占位：PostDetail"。Ctrl+C 停。

- [ ] **Step 6: 提交**

```bash
git add src/router.ts src/main.ts src/App.vue src/pages/
git commit -m "feat: 引入 vue-router 和页面骨架"
```

### Task 6.2: API 客户端

**Files:**
- Create: `src/api/client.ts`
- Create: `src/api/public.ts`
- Create: `src/api/admin.ts`

- [ ] **Step 1: 写 client.ts**

```ts
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
```

- [ ] **Step 2: 写 src/api/public.ts**

```ts
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
```

- [ ] **Step 3: 写 src/api/admin.ts**

```ts
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
```

- [ ] **Step 4: 提交**

```bash
git add src/api/
git commit -m "feat: 添加前端 API 客户端（public + admin）"
```

### Task 6.3: vite dev 代理 + admin 域模拟

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 修改 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3010',
    },
  },
})
```

- [ ] **Step 2: 验证 dev 模式可走通公开 API**

启动两个终端：
```bash
DB_PATH=./data/blog.db npm run dev:server   # 终端 A
npm run dev:web                              # 终端 B
```
浏览器访问 `http://localhost:5173`，开 DevTools → Console 跑：
```js
fetch('/api/public/posts').then(r => r.json()).then(console.log)
```
Expected: 打印 6 篇 seed 文章数组。

- [ ] **Step 3: 本地模拟 admin 域**

修改 `/etc/hosts` 临时加：
```
127.0.0.1 admin.wlplay.cn
```
（注：这条仅用于本地开发，部署不依赖 hosts 文件。如果不愿改 hosts，可临时把 `router.ts` 里的 `isAdminHost` 改成 `?admin=1` 查询参数判断作为 fallback；推荐用 hosts 走真实场景）

访问 `http://admin.wlplay.cn:5173/posts`，Expected: 看到"占位：PostsList"或"占位：AdminApp"。

- [ ] **Step 4: 提交**

```bash
git add vite.config.ts
git commit -m "chore: vite dev 代理 /api 到本地 server"
```

---

## Phase 7: 公开站改造

### Task 7.1: Home.vue 改造（API 数据源）

**Files:**
- Modify: `src/pages/Home.vue` (其实是把现有 `src/components/BlogStyleC.vue` 移过来 + 改造)
- Modify: `src/components/BlogStyleC.vue` 删除（被替换）

- [ ] **Step 1: 把 BlogStyleC.vue 全文复制到 src/pages/Home.vue 作为起点**

```bash
cp src/components/BlogStyleC.vue src/pages/Home.vue
```

- [ ] **Step 2: 改造 src/pages/Home.vue 的 `<script setup>`**

替换原来 `posts` / `mediaItems` / `latestPost` / `recentPosts` 等硬编码：

```ts
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { projects, type Project } from '../projects'
import { publicApi, type PublicPost, type PublicMedia, type PublicAbout } from '../api/public'

type View = 'home' | 'articles' | 'projects'

const currentView = ref<View>('home')
const activeTag = ref('全部')
const router = useRouter()

const posts = ref<PublicPost[]>([])
const mediaItems = ref<PublicMedia[]>([])
const about = ref<PublicAbout | null>(null)
const stats = ref({ posts_count: 0, total_read_minutes: 0 })
const loaded = ref(false)

onMounted(async () => {
  const [p, m, a, s] = await Promise.all([
    publicApi.posts(), publicApi.media(), publicApi.about(), publicApi.stats()
  ])
  posts.value = p
  mediaItems.value = m
  about.value = a
  stats.value = s
  loaded.value = true
})

function openProject(proj: Project) {
  router.push(`/app/${proj.slug}`)
}

function openPost(post: PublicPost) {
  router.push(`/post/${post.slug}`)
}

const mediaIcons: Record<PublicMedia['type'], string> = {
  music: '♫', book: '◈', movie: '▶',
}

function postTagName(p: PublicPost) { return p.tags[0]?.name ?? '' }
function postTagColor(p: PublicPost) { return p.cover_color ?? p.tags[0]?.color ?? '#7C3AED' }

const allTags = computed(() => {
  const tags = new Set(posts.value.map(p => postTagName(p)).filter(Boolean))
  return ['全部', ...tags]
})

const filteredPosts = computed(() => {
  if (activeTag.value === '全部') return posts.value
  return posts.value.filter(p => postTagName(p) === activeTag.value)
})

const featuredPost = computed(() =>
  posts.value.find(p => p.is_featured) ?? posts.value[0]
)
const recentPosts = computed(() => {
  const list = posts.value.slice()
  if (featuredPost.value) {
    const idx = list.indexOf(featuredPost.value)
    if (idx >= 0) list.splice(idx, 1)
  }
  return list.slice(0, 4)
})
const secondaryPost = computed(() =>
  posts.value.find(p => p !== featuredPost.value) ?? null
)

function formatDate(s: string | null) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
function formatDateFull(s: string | null) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function goTo(view: View) {
  currentView.value = view
  activeTag.value = '全部'
}
</script>
```

- [ ] **Step 3: 改造 template — 替换文章卡片绑定**

把原 template 中：
- `latestPost.color` / `latestPost.tag` → `postTagColor(featuredPost)` / `postTagName(featuredPost)`
- `latestPost.title` → `featuredPost.title`
- `latestPost.summary` → `featuredPost.summary`
- `latestPost.date` → `featuredPost.published_at`
- `latestPost.readTime` → `featuredPost.read_time`
- 同理处理 `posts[1]` → `secondaryPost`

把"最近文章"列表里：
```html
<a v-for="post in recentPosts" :key="post.title" href="#" class="list-row">
```
改成：
```html
<button v-for="post in recentPosts" :key="post.id" class="list-row" @click="openPost(post)">
```

把 hero 卡片整体加 `@click="featuredPost && openPost(featuredPost)"`。

把"在听在看"循环里 `:key="item.title"` 改成 `:key="item.id"`。

把 stats 三个数字：
- `{{ posts.length }}` → `{{ stats.posts_count }}`
- `{{ projects.length }}` → 不变
- `{{ 45 }}` → `{{ stats.total_read_minutes }}`

把"全部文章"列表 `<a href="#" class="article-row">` 改成 `<button class="article-row" @click="openPost(post)">`。

把"关于"卡片 `about-links` 改成由 `about.value.links` 渲染，并末尾追加 admin 链接：

```html
<div class="about-links" v-if="about">
  <a v-for="link in about.links" :key="link.label" :href="link.url" target="_blank">{{ link.label }}</a>
</div>
```

> 注：admin 链接已经在 seed 里写进 about.links，不需要额外硬编码。

把 about 卡的姓名/简介/avatar 也改成绑定：
```html
<div class="about-avatar">{{ about?.avatar ?? '' }}</div>
<h3 class="about-name">{{ about?.name ?? '' }}</h3>
<p class="about-bio">{{ about?.bio ?? '' }}</p>
```

加一个加载态保护（顶层 `<div v-if="loaded">原内容</div><div v-else class="loading">加载中…</div>`），CSS 加：

```css
.loading {
  text-align: center;
  padding: 80px 0;
  color: var(--text-dim);
  font-size: 14px;
}
```

- [ ] **Step 4: 删除旧组件 `src/components/BlogStyleC.vue`**

```bash
rm src/components/BlogStyleC.vue
```

- [ ] **Step 5: 启动联调验证**

终端 A: `DB_PATH=./data/blog.db npm run dev:server`  
终端 B: `npm run dev:web`  
浏览器: `http://localhost:5173`

肉眼 / DevTools 检查清单：
- 视觉与改造前一致（除 admin 链接已通过 seed 数据进入 about.links）
- 6 篇文章卡片显示
- 在听在看 3 项
- stats 显示 6 / 8 / 总分钟数
- 文章卡点击会跳到 `/post/<slug>`（页面占位）
- 项目卡点击跳 `/app/<slug>` 占位
- 完全无 console 报错

- [ ] **Step 6: 提交**

```bash
git add src/pages/Home.vue
git rm src/components/BlogStyleC.vue
git commit -m "refactor: Home 页面改造为消费 API（保持视觉不变）"
```

### Task 7.2: PostDetail.vue

**Files:**
- Modify: `src/pages/PostDetail.vue`

- [ ] **Step 1: 安装 dompurify 客户端**

```bash
npm install dompurify
npm install -D @types/dompurify
```

- [ ] **Step 2: 实现详情页**

```vue
<!-- src/pages/PostDetail.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DOMPurify from 'dompurify'
import { publicApi, type PublicPost } from '../api/public'

const route = useRoute()
const router = useRouter()
const post = ref<PublicPost | null>(null)
const notFound = ref(false)
const loaded = ref(false)

async function load(slug: string) {
  loaded.value = false
  notFound.value = false
  post.value = null
  try {
    post.value = await publicApi.post(slug)
  } catch (e: any) {
    if (String(e.message).includes('404')) notFound.value = true
    else throw e
  } finally {
    loaded.value = true
  }
}

onMounted(() => load(String(route.params.slug)))
watch(() => route.params.slug, (s) => load(String(s)))

const cleanBody = computed(() => post.value ? DOMPurify.sanitize(post.value.body ?? '') : '')

function formatDate(s: string | null) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function goHome() { router.push('/') }
</script>

<template>
  <div class="post-page">
    <header class="post-header">
      <button class="back-btn" @click="goHome">← 返回</button>
    </header>
    <div v-if="!loaded" class="loading">加载中…</div>
    <div v-else-if="notFound" class="empty">
      <h2>文章未找到</h2>
      <button @click="goHome">回首页</button>
    </div>
    <article v-else-if="post" class="post-article">
      <span class="tag-pill"
        :style="{ background: (post.cover_color ?? post.tags[0]?.color ?? '#7C3AED') + '18',
                  color:      (post.cover_color ?? post.tags[0]?.color ?? '#7C3AED') }">
        {{ post.tags[0]?.name ?? '未分类' }}
      </span>
      <h1 class="post-title">{{ post.title }}</h1>
      <div class="post-meta">
        <span>{{ formatDate(post.published_at) }}</span>
        <span class="dot"></span>
        <span>{{ post.read_time }}</span>
      </div>
      <p class="post-summary">{{ post.summary }}</p>
      <div class="post-body" v-html="cleanBody"></div>
    </article>
  </div>
</template>

<style scoped>
.post-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  font-family: 'Work Sans', -apple-system, sans-serif;
  background: #F5F5F4;
  color: #1C1917;
  min-height: 100vh;
}
.post-header { margin-bottom: 32px; }
.back-btn {
  background: none; border: 1px solid #D6D3D1;
  padding: 8px 14px; border-radius: 10px;
  color: #78716C; cursor: pointer;
  font-family: inherit; font-size: 13px;
}
.back-btn:hover { border-color: #A8A29E; color: #1C1917; }
.tag-pill {
  display: inline-block; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.8px;
  padding: 3px 10px; border-radius: 8px; margin-bottom: 16px;
}
.post-title {
  font-family: 'Outfit', sans-serif;
  font-size: 36px; font-weight: 700; line-height: 1.2; margin-bottom: 12px;
}
.post-meta {
  display: flex; align-items: center; gap: 8px;
  color: #78716C; font-size: 14px; margin-bottom: 24px;
}
.dot { width: 3px; height: 3px; border-radius: 50%; background: #78716C; opacity: 0.5; }
.post-summary { font-size: 17px; color: #57534E; line-height: 1.6; margin-bottom: 32px; }
.post-body { font-size: 16px; line-height: 1.75; }
.post-body :deep(h1),
.post-body :deep(h2),
.post-body :deep(h3) { font-family: 'Outfit', sans-serif; font-weight: 600; margin: 32px 0 12px; }
.post-body :deep(h1) { font-size: 28px; }
.post-body :deep(h2) { font-size: 22px; }
.post-body :deep(h3) { font-size: 18px; }
.post-body :deep(p) { margin: 16px 0; }
.post-body :deep(ul),
.post-body :deep(ol) { padding-left: 24px; }
.post-body :deep(li) { margin: 6px 0; }
.post-body :deep(blockquote) {
  border-left: 3px solid #A8A29E; padding-left: 16px;
  margin: 24px 0; color: #57534E; font-style: italic;
}
.post-body :deep(pre) {
  background: #292524; color: #FAFAF9;
  padding: 16px; border-radius: 12px; overflow-x: auto;
  font-family: 'JetBrains Mono', monospace; font-size: 14px;
  margin: 24px 0;
}
.post-body :deep(code:not(pre code)) {
  background: #E7E5E4; padding: 2px 6px;
  border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em;
}
.post-body :deep(img) { max-width: 100%; border-radius: 12px; margin: 16px 0; }
.post-body :deep(a) { color: #2563EB; text-decoration: underline; }
.loading, .empty { text-align: center; padding: 80px 0; color: #78716C; }
.empty button {
  margin-top: 16px; padding: 8px 16px; border-radius: 8px;
  border: 1px solid #D6D3D1; background: white; cursor: pointer;
}
</style>
```

- [ ] **Step 3: 联调验证**

确保 server + web dev 都跑着。访问 `http://localhost:5173/post/understanding-ecc`：
- 应看到标题、tag、日期、summary、空白正文（seed 没写正文）
- 访问 `/post/不存在` 看到"文章未找到"
- 访问 `/post/why-i-blog` 等其他 slug 都正常

- [ ] **Step 4: 提交**

```bash
git add src/pages/PostDetail.vue package.json package-lock.json
git commit -m "feat: 添加文章详情页 /post/:slug，支持 DOMPurify 清洗"
```

### Task 7.3: ProjectFrame.vue（沿用 AppFrame）

**Files:**
- Modify: `src/pages/ProjectFrame.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/ProjectFrame.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppFrame from '../components/AppFrame.vue'
import { findProjectBySlug } from '../projects'

const route = useRoute()
const router = useRouter()

const project = computed(() => {
  const slug = String(route.params.slug)
  return findProjectBySlug(slug)
})

if (!project.value) router.replace('/')
</script>

<template>
  <AppFrame v-if="project" :project="project" />
</template>
```

- [ ] **Step 2: 验证**

`http://localhost:5173/app/sub-web` → 子项目 iframe 加载（如同之前）。

- [ ] **Step 3: 提交**

```bash
git add src/pages/ProjectFrame.vue
git commit -m "feat: ProjectFrame 包装 AppFrame，接 router 参数"
```

---

## Phase 8: Admin 壳

### Task 8.1: AdminApp.vue（侧栏导航 + 顶栏）

**Files:**
- Modify: `src/pages/admin/AdminApp.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/admin/AdminApp.vue -->
<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">WLPlay 后台</div>
      <nav>
        <RouterLink to="/posts" class="nav-link" active-class="active">文章</RouterLink>
        <RouterLink to="/tags" class="nav-link" active-class="active">标签</RouterLink>
        <RouterLink to="/media" class="nav-link" active-class="active">在听在看</RouterLink>
        <RouterLink to="/about" class="nav-link" active-class="active">关于</RouterLink>
      </nav>
      <div class="footer">
        <a href="https://wlplay.cn" target="_blank">↗ 回主页</a>
      </div>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #FAFAF9;
  color: #1C1917;
  font-family: 'Work Sans', -apple-system, sans-serif;
}
.sidebar {
  width: 220px;
  border-right: 1px solid #E7E5E4;
  background: #FFFFFF;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}
.brand {
  font-family: 'Outfit', sans-serif;
  font-size: 16px; font-weight: 600;
  margin-bottom: 24px;
  padding: 0 8px;
}
nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-link {
  text-decoration: none;
  color: #57534E;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
}
.nav-link:hover { background: #F5F5F4; color: #1C1917; }
.nav-link.active { background: #1C1917; color: #fff; }
.footer { padding: 0 8px; font-size: 12px; }
.footer a { color: #78716C; text-decoration: none; }
.footer a:hover { color: #1C1917; }
.content { flex: 1; padding: 32px 40px; overflow-y: auto; }
</style>
```

- [ ] **Step 2: 验证**

`http://admin.wlplay.cn:5173/` 应跳到 `/posts` 并看到侧栏 + "占位：PostsList"。

- [ ] **Step 3: 提交**

```bash
git add src/pages/admin/AdminApp.vue
git commit -m "feat: AdminApp 后台壳（侧栏导航 + 路由出口）"
```

---

## Phase 9: 实体管理页

### Task 9.1: PostsList.vue

**Files:**
- Modify: `src/pages/admin/PostsList.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/admin/PostsList.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { adminApi, type AdminPost } from '../../api/admin'

const posts = ref<AdminPost[]>([])
const filter = ref<'all'|'draft'|'published'>('all')
const loading = ref(true)
const router = useRouter()

async function load() {
  loading.value = true
  posts.value = await adminApi.listPosts(filter.value)
  loading.value = false
}
onMounted(load)

async function publish(p: AdminPost) {
  await adminApi.publishPost(p.id); await load()
}
async function unpublish(p: AdminPost) {
  await adminApi.unpublishPost(p.id); await load()
}
async function feature(p: AdminPost) {
  await adminApi.featurePost(p.id); await load()
}
async function unfeature(p: AdminPost) {
  await adminApi.unfeaturePost(p.id); await load()
}
async function remove(p: AdminPost) {
  if (!confirm(`删除文章「${p.title}」？此操作不可撤销。`)) return
  await adminApi.deletePost(p.id); await load()
}

const counts = computed(() => ({
  all: posts.value.length,
  published: posts.value.filter(p => p.status === 'published').length,
  draft: posts.value.filter(p => p.status === 'draft').length,
}))
</script>

<template>
  <div class="posts-list">
    <header>
      <h1>文章</h1>
      <RouterLink to="/posts/new" class="btn-primary">+ 新建文章</RouterLink>
    </header>

    <div class="filter-bar">
      <button :class="{active: filter === 'all'}" @click="filter='all';load()">全部</button>
      <button :class="{active: filter === 'published'}" @click="filter='published';load()">已发布</button>
      <button :class="{active: filter === 'draft'}" @click="filter='draft';load()">草稿</button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
    <div v-else-if="!posts.length" class="empty">暂无文章</div>
    <table v-else class="post-table">
      <thead>
        <tr><th>标题</th><th>标签</th><th>状态</th><th>发布时间</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in posts" :key="p.id" :class="{ featured: p.is_featured }">
          <td>
            <RouterLink :to="`/posts/${p.id}`" class="title-link">
              <span v-if="p.is_featured" class="star">★</span>
              {{ p.title }}
            </RouterLink>
            <span class="slug">/{{ p.slug }}</span>
          </td>
          <td>
            <span v-for="t in p.tags" :key="t.id" class="tag-chip"
              :style="{ background: t.color + '20', color: t.color }">{{ t.name }}</span>
          </td>
          <td>
            <span class="status" :class="p.status">{{ p.status === 'published' ? '已发布' : '草稿' }}</span>
          </td>
          <td class="date">{{ p.published_at?.slice(0, 10) ?? '—' }}</td>
          <td class="actions">
            <button v-if="p.status === 'draft'" @click="publish(p)">发布</button>
            <button v-else @click="unpublish(p)">取消发布</button>
            <button v-if="!p.is_featured" @click="feature(p)">置顶</button>
            <button v-else @click="unfeature(p)">取消置顶</button>
            <button class="danger" @click="remove(p)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
header h1 { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 600; }
.btn-primary {
  background: #1C1917; color: #fff; padding: 8px 16px; border-radius: 8px;
  text-decoration: none; font-size: 14px; font-weight: 500;
}
.btn-primary:hover { background: #292524; }
.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; }
.filter-bar button {
  padding: 6px 14px; border: 1px solid #D6D3D1; border-radius: 20px;
  background: white; color: #78716C; font-size: 13px; cursor: pointer;
}
.filter-bar button.active { background: #1C1917; color: white; border-color: #1C1917; }
.post-table {
  width: 100%; border-collapse: collapse; background: white;
  border-radius: 12px; overflow: hidden; border: 1px solid #E7E5E4;
}
.post-table th { text-align: left; padding: 12px 16px; background: #FAFAF9; font-size: 13px; color: #78716C; font-weight: 500; }
.post-table td { padding: 12px 16px; border-top: 1px solid #F0EFED; vertical-align: middle; }
tr.featured { background: #FFFBEB; }
.title-link { color: #1C1917; text-decoration: none; font-weight: 500; }
.title-link:hover { color: #2563EB; }
.star { color: #D97706; margin-right: 4px; }
.slug { font-size: 12px; color: #A8A29E; margin-left: 6px; font-family: 'JetBrains Mono', monospace; }
.tag-chip { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px; }
.status { padding: 2px 8px; border-radius: 6px; font-size: 12px; }
.status.published { background: #D1FAE5; color: #065F46; }
.status.draft { background: #F5F5F4; color: #57534E; }
.date { font-size: 13px; color: #78716C; }
.actions { display: flex; gap: 4px; }
.actions button {
  padding: 4px 10px; border: 1px solid #E7E5E4; background: white;
  border-radius: 6px; font-size: 12px; cursor: pointer; color: #57534E;
}
.actions button:hover { border-color: #1C1917; color: #1C1917; }
.actions button.danger { color: #B91C1C; }
.actions button.danger:hover { background: #FEE2E2; border-color: #B91C1C; }
.loading, .empty { text-align: center; padding: 60px 0; color: #78716C; }
</style>
```

- [ ] **Step 2: 验证**

`http://admin.wlplay.cn:5173/posts` → 看到 6 篇 seed 文章；能切过滤、点发布/置顶/删除生效（确认 seed 那篇 ECC 是 featured）。

- [ ] **Step 3: 提交**

```bash
git add src/pages/admin/PostsList.vue
git commit -m "feat: PostsList 文章列表（过滤、发布、置顶、删除）"
```

### Task 9.2: TagsManager.vue

**Files:**
- Modify: `src/pages/admin/TagsManager.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/admin/TagsManager.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import type { PublicTag } from '../../api/public'

const tags = ref<PublicTag[]>([])
const editing = ref<Partial<PublicTag> & { id?: number }>({})
const showForm = ref(false)
const error = ref('')

async function load() { tags.value = await adminApi.listTags() }
onMounted(load)

function startCreate() {
  editing.value = { name: '', color: '#7C3AED', sort: tags.value.length }
  showForm.value = true
  error.value = ''
}
function startEdit(t: PublicTag) {
  editing.value = { ...t }
  showForm.value = true
  error.value = ''
}
async function save() {
  error.value = ''
  try {
    if (editing.value.id) {
      await adminApi.patchTag(editing.value.id, {
        name: editing.value.name, color: editing.value.color, sort: editing.value.sort,
      })
    } else {
      await adminApi.createTag({
        name: editing.value.name!, color: editing.value.color!, sort: editing.value.sort,
      })
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e.message
  }
}
async function remove(t: PublicTag) {
  if (!confirm(`删除标签「${t.name}」？`)) return
  try { await adminApi.deleteTag(t.id); await load() }
  catch (e: any) { alert(e.message) }
}
</script>

<template>
  <div class="tags-manager">
    <header>
      <h1>标签</h1>
      <button class="btn-primary" @click="startCreate">+ 新建标签</button>
    </header>

    <div v-if="showForm" class="form-card">
      <div class="row">
        <label>名称
          <input v-model="editing.name" placeholder="例如：密码学" />
        </label>
        <label>颜色
          <input type="color" v-model="editing.color" />
        </label>
        <label>排序
          <input type="number" v-model.number="editing.sort" />
        </label>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div class="form-actions">
        <button class="btn-primary" @click="save">保存</button>
        <button @click="showForm = false">取消</button>
      </div>
    </div>

    <table class="tag-table">
      <thead><tr><th></th><th>名称</th><th>引用数</th><th>排序</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="t in tags" :key="t.id">
          <td><span class="dot" :style="{ background: t.color }"></span></td>
          <td>{{ t.name }}</td>
          <td>{{ t.post_count }}</td>
          <td>{{ t.sort }}</td>
          <td class="actions">
            <button @click="startEdit(t)">编辑</button>
            <button class="danger" @click="remove(t)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
header h1 { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 600; }
.btn-primary {
  background: #1C1917; color: #fff; padding: 8px 16px; border-radius: 8px;
  border: none; font-size: 14px; cursor: pointer;
}
.form-card { background: white; border: 1px solid #E7E5E4; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.row { display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-end; }
label { display: flex; flex-direction: column; font-size: 13px; color: #57534E; gap: 4px; flex: 1; }
input[type=text], input[type=number], input:not([type]) {
  border: 1px solid #D6D3D1; border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 14px;
}
input[type=color] { width: 48px; height: 36px; border: 1px solid #D6D3D1; border-radius: 8px; padding: 2px; }
.form-actions { display: flex; gap: 8px; }
.form-actions button {
  padding: 8px 16px; border-radius: 8px; border: 1px solid #D6D3D1; background: white;
  cursor: pointer; font-size: 14px;
}
.error { color: #B91C1C; margin-bottom: 12px; font-size: 13px; }
.tag-table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #E7E5E4; border-radius: 12px; overflow: hidden; }
.tag-table th { background: #FAFAF9; padding: 12px 16px; text-align: left; font-size: 13px; color: #78716C; font-weight: 500; }
.tag-table td { padding: 12px 16px; border-top: 1px solid #F0EFED; }
.dot { display: inline-block; width: 16px; height: 16px; border-radius: 50%; }
.actions button {
  padding: 4px 10px; border: 1px solid #E7E5E4; background: white;
  border-radius: 6px; font-size: 12px; cursor: pointer; color: #57534E; margin-right: 4px;
}
.actions button.danger { color: #B91C1C; }
</style>
```

- [ ] **Step 2: 验证**

`/tags` → 看到 5 个 seed 标签，能新建、改名、改色；删除"未用"标签 OK，删除被引用的标签会 alert "tag in use"。

- [ ] **Step 3: 提交**

```bash
git add src/pages/admin/TagsManager.vue
git commit -m "feat: TagsManager 标签 CRUD"
```

### Task 9.3: MediaManager.vue

**Files:**
- Modify: `src/pages/admin/MediaManager.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/admin/MediaManager.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type AdminMedia } from '../../api/admin'

const items = ref<AdminMedia[]>([])
const editing = ref<Partial<AdminMedia> & { id?: number }>({})
const showForm = ref(false)
const error = ref('')

async function load() { items.value = await adminApi.listMedia() }
onMounted(load)

function startCreate() {
  editing.value = { type: 'book', title: '', author: '', sort: items.value.length, active: true }
  showForm.value = true; error.value = ''
}
function startEdit(m: AdminMedia) {
  editing.value = { ...m }
  showForm.value = true; error.value = ''
}
async function save() {
  error.value = ''
  try {
    if (editing.value.id) {
      await adminApi.patchMedia(editing.value.id, {
        type: editing.value.type, title: editing.value.title, author: editing.value.author,
        sort: editing.value.sort, active: editing.value.active,
      })
    } else {
      await adminApi.createMedia({
        type: editing.value.type!, title: editing.value.title!, author: editing.value.author!,
        sort: editing.value.sort ?? 0, active: editing.value.active ?? true,
      })
    }
    showForm.value = false; await load()
  } catch (e: any) { error.value = e.message }
}
async function remove(m: AdminMedia) {
  if (!confirm(`删除「${m.title}」？`)) return
  await adminApi.deleteMedia(m.id); await load()
}

const ICONS: Record<AdminMedia['type'], string> = { music: '♫', book: '◈', movie: '▶' }
const LABELS: Record<AdminMedia['type'], string> = { music: '音乐', book: '书', movie: '电影' }
</script>

<template>
  <div class="media-manager">
    <header>
      <h1>在听在看</h1>
      <button class="btn-primary" @click="startCreate">+ 新建</button>
    </header>

    <div v-if="showForm" class="form-card">
      <div class="row">
        <label>类型
          <select v-model="editing.type">
            <option value="music">音乐</option>
            <option value="book">书</option>
            <option value="movie">电影</option>
          </select>
        </label>
        <label>标题
          <input v-model="editing.title" />
        </label>
        <label>作者
          <input v-model="editing.author" />
        </label>
        <label>排序
          <input type="number" v-model.number="editing.sort" />
        </label>
        <label class="checkbox">
          <input type="checkbox" v-model="editing.active" /> 显示
        </label>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div class="form-actions">
        <button class="btn-primary" @click="save">保存</button>
        <button @click="showForm = false">取消</button>
      </div>
    </div>

    <table class="media-table">
      <thead><tr><th></th><th>类型</th><th>标题</th><th>作者</th><th>排序</th><th>显示</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="m in items" :key="m.id">
          <td class="icon">{{ ICONS[m.type] }}</td>
          <td>{{ LABELS[m.type] }}</td>
          <td>{{ m.title }}</td>
          <td>{{ m.author }}</td>
          <td>{{ m.sort }}</td>
          <td>{{ m.active ? '✓' : '×' }}</td>
          <td class="actions">
            <button @click="startEdit(m)">编辑</button>
            <button class="danger" @click="remove(m)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
header h1 { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 600; }
.btn-primary {
  background: #1C1917; color: #fff; padding: 8px 16px; border-radius: 8px;
  border: none; font-size: 14px; cursor: pointer;
}
.form-card { background: white; border: 1px solid #E7E5E4; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.row { display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-end; flex-wrap: wrap; }
label { display: flex; flex-direction: column; font-size: 13px; color: #57534E; gap: 4px; }
label.checkbox { flex-direction: row; align-items: center; gap: 6px; }
input, select { border: 1px solid #D6D3D1; border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 14px; }
.form-actions { display: flex; gap: 8px; }
.form-actions button {
  padding: 8px 16px; border-radius: 8px; border: 1px solid #D6D3D1; background: white;
  cursor: pointer; font-size: 14px;
}
.error { color: #B91C1C; margin-bottom: 12px; font-size: 13px; }
.media-table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #E7E5E4; border-radius: 12px; overflow: hidden; }
.media-table th { background: #FAFAF9; padding: 12px 16px; text-align: left; font-size: 13px; color: #78716C; font-weight: 500; }
.media-table td { padding: 12px 16px; border-top: 1px solid #F0EFED; }
.icon { font-size: 20px; }
.actions button {
  padding: 4px 10px; border: 1px solid #E7E5E4; background: white;
  border-radius: 6px; font-size: 12px; cursor: pointer; color: #57534E; margin-right: 4px;
}
.actions button.danger { color: #B91C1C; }
</style>
```

- [ ] **Step 2: 验证**

`/media` → 看到 3 条 seed media；能新建、编辑、删除。

- [ ] **Step 3: 提交**

```bash
git add src/pages/admin/MediaManager.vue
git commit -m "feat: MediaManager 媒体 CRUD"
```

### Task 9.4: AboutEditor.vue

**Files:**
- Modify: `src/pages/admin/AboutEditor.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/admin/AboutEditor.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import type { PublicAbout } from '../../api/public'

const form = ref<PublicAbout>({
  avatar: 'W', name: '', bio: '', links: []
})
const saving = ref(false)
const message = ref('')

async function load() {
  const a = await adminApi.getAbout()
  if (a) form.value = a
}
onMounted(load)

function addLink() { form.value.links.push({ label: '', url: '' }) }
function removeLink(i: number) { form.value.links.splice(i, 1) }

async function save() {
  saving.value = true; message.value = ''
  try {
    await adminApi.patchAbout(form.value)
    message.value = '已保存。'
    setTimeout(() => { message.value = '' }, 2000)
  } catch (e: any) { message.value = '错误：' + e.message }
  finally { saving.value = false }
}
</script>

<template>
  <div class="about-editor">
    <header><h1>关于</h1></header>

    <div class="form-card">
      <label>头像字符（单个）
        <input v-model="form.avatar" maxlength="2" />
      </label>
      <label>姓名
        <input v-model="form.name" />
      </label>
      <label>个签
        <textarea v-model="form.bio" rows="3"></textarea>
      </label>

      <div class="links-section">
        <div class="links-header">
          <span>社交链接</span>
          <button @click="addLink">+ 添加</button>
        </div>
        <div v-for="(link, i) in form.links" :key="i" class="link-row">
          <input v-model="link.label" placeholder="名称" class="label-input" />
          <input v-model="link.url" placeholder="https://..." class="url-input" />
          <button @click="removeLink(i)" class="danger">删除</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        <span v-if="message" class="message">{{ message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
header h1 { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 600; margin-bottom: 24px; }
.form-card {
  background: white; border: 1px solid #E7E5E4; border-radius: 12px;
  padding: 24px; max-width: 640px;
}
label {
  display: block; font-size: 13px; color: #57534E; margin-bottom: 16px;
}
input, textarea {
  display: block; width: 100%; border: 1px solid #D6D3D1; border-radius: 8px;
  padding: 8px 12px; font: inherit; font-size: 14px; margin-top: 4px;
}
textarea { resize: vertical; }
.links-section { margin: 24px 0; }
.links-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: #57534E; margin-bottom: 12px;
}
.links-header button {
  padding: 4px 10px; border: 1px solid #D6D3D1; background: white;
  border-radius: 6px; font-size: 12px; cursor: pointer;
}
.link-row { display: flex; gap: 8px; margin-bottom: 8px; }
.label-input { flex: 0 0 120px; }
.url-input { flex: 1; }
.link-row .danger {
  padding: 0 12px; border: 1px solid #FCA5A5; background: white;
  border-radius: 6px; font-size: 12px; cursor: pointer; color: #B91C1C;
}
.actions { display: flex; align-items: center; gap: 12px; }
.btn-primary {
  background: #1C1917; color: #fff; padding: 8px 16px; border-radius: 8px;
  border: none; font-size: 14px; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: wait; }
.message { font-size: 13px; color: #059669; }
</style>
```

- [ ] **Step 2: 验证**

`/about` → 看到 seed 数据；改 bio 保存，刷新主页 `localhost:5173` 看到新的 bio 字段；links 增删都生效。

- [ ] **Step 3: 提交**

```bash
git add src/pages/admin/AboutEditor.vue
git commit -m "feat: AboutEditor 关于卡编辑器"
```

---

## Phase 10: Tiptap 编辑器组件

### Task 10.1: TiptapEditor.vue

**Files:**
- Create: `src/components/editor/TiptapEditor.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/components/editor/TiptapEditor.vue -->
<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { adminApi } from '../../api/admin'

import 'highlight.js/styles/github-dark.css'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', html: string): void }>()

const lowlight = createLowlight(common)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: '开始写...' }),
    CodeBlockLowlight.configure({ lowlight }),
  ],
  editorProps: {
    attributes: { class: 'tiptap-content' },
    handlePaste(_view, event) {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile()
          if (f) { uploadAndInsert(f); event.preventDefault(); return true }
        }
      }
      return false
    },
    handleDrop(_view, event) {
      const dt = (event as DragEvent).dataTransfer
      if (!dt?.files?.length) return false
      const f = dt.files[0]
      if (f.type.startsWith('image/')) {
        uploadAndInsert(f); event.preventDefault(); return true
      }
      return false
    },
  },
  onUpdate({ editor }) { emit('update:modelValue', editor.getHTML()) },
})

watch(() => props.modelValue, (v) => {
  if (editor.value && v !== editor.value.getHTML()) editor.value.commands.setContent(v, false)
})

onBeforeUnmount(() => editor.value?.destroy())

async function uploadAndInsert(file: File) {
  try {
    const { url } = await adminApi.upload(file)
    editor.value?.chain().focus().setImage({ src: url }).run()
  } catch (e: any) { alert('上传失败：' + e.message) }
}

function pickImage() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'
  input.onchange = () => { if (input.files?.[0]) uploadAndInsert(input.files[0]) }
  input.click()
}

function setLink() {
  const url = prompt('输入链接 URL', editor.value?.getAttributes('link').href ?? 'https://')
  if (url === null) return
  if (url === '') editor.value?.chain().focus().unsetLink().run()
  else editor.value?.chain().focus().setLink({ href: url }).run()
}

function isActive(name: string, attrs?: Record<string, unknown>): boolean {
  return !!editor.value?.isActive(name, attrs)
}
</script>

<template>
  <div class="tiptap-editor">
    <div class="toolbar" v-if="editor">
      <button :class="{active: isActive('heading', {level:1})}"
        @click="editor.chain().focus().toggleHeading({level:1}).run()">H1</button>
      <button :class="{active: isActive('heading', {level:2})}"
        @click="editor.chain().focus().toggleHeading({level:2}).run()">H2</button>
      <button :class="{active: isActive('heading', {level:3})}"
        @click="editor.chain().focus().toggleHeading({level:3}).run()">H3</button>
      <span class="sep" />
      <button :class="{active: isActive('bold')}"
        @click="editor.chain().focus().toggleBold().run()"><b>B</b></button>
      <button :class="{active: isActive('italic')}"
        @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button :class="{active: isActive('strike')}"
        @click="editor.chain().focus().toggleStrike().run()"><s>S</s></button>
      <button :class="{active: isActive('code')}"
        @click="editor.chain().focus().toggleCode().run()">‹›</button>
      <span class="sep" />
      <button :class="{active: isActive('bulletList')}"
        @click="editor.chain().focus().toggleBulletList().run()">• 列</button>
      <button :class="{active: isActive('orderedList')}"
        @click="editor.chain().focus().toggleOrderedList().run()">1. 列</button>
      <button :class="{active: isActive('blockquote')}"
        @click="editor.chain().focus().toggleBlockquote().run()">""</button>
      <button :class="{active: isActive('codeBlock')}"
        @click="editor.chain().focus().toggleCodeBlock().run()">{ }</button>
      <button @click="editor.chain().focus().setHorizontalRule().run()">—</button>
      <span class="sep" />
      <button :class="{active: isActive('link')}" @click="setLink">🔗</button>
      <button @click="pickImage">📷</button>
      <span class="sep" />
      <button @click="editor.chain().focus().undo().run()">↶</button>
      <button @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" class="editor-area" />
  </div>
</template>

<style scoped>
.tiptap-editor {
  border: 1px solid #D6D3D1; border-radius: 12px; background: white; overflow: hidden;
}
.toolbar {
  display: flex; align-items: center; gap: 4px; padding: 8px 12px;
  border-bottom: 1px solid #E7E5E4; background: #FAFAF9; flex-wrap: wrap;
}
.toolbar button {
  padding: 4px 8px; border: 1px solid transparent; background: transparent;
  border-radius: 6px; cursor: pointer; font-size: 13px; min-width: 28px;
  color: #57534E;
}
.toolbar button:hover { background: #E7E5E4; }
.toolbar button.active { background: #1C1917; color: #fff; }
.sep { width: 1px; height: 18px; background: #D6D3D1; margin: 0 4px; }
.editor-area { padding: 16px 20px; min-height: 360px; }
.editor-area :deep(.tiptap-content) { outline: none; min-height: 320px; font-size: 15px; line-height: 1.7; }
.editor-area :deep(.tiptap-content p.is-editor-empty:first-child::before) {
  color: #A8A29E; content: attr(data-placeholder); float: left; height: 0; pointer-events: none;
}
.editor-area :deep(h1) { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 600; margin: 24px 0 12px; }
.editor-area :deep(h2) { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 600; margin: 20px 0 10px; }
.editor-area :deep(h3) { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 600; margin: 16px 0 8px; }
.editor-area :deep(blockquote) {
  border-left: 3px solid #A8A29E; padding-left: 12px; color: #57534E; margin: 12px 0;
}
.editor-area :deep(pre) {
  background: #292524; color: #FAFAF9; padding: 12px; border-radius: 8px;
  overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 14px;
}
.editor-area :deep(code:not(pre code)) {
  background: #E7E5E4; padding: 2px 6px; border-radius: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 0.9em;
}
.editor-area :deep(img) { max-width: 100%; border-radius: 8px; }
.editor-area :deep(ul), .editor-area :deep(ol) { padding-left: 20px; }
.editor-area :deep(a) { color: #2563EB; text-decoration: underline; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/editor/TiptapEditor.vue
git commit -m "feat: TiptapEditor 组件（WYSIWYG + 工具栏 + 图片上传）"
```

---

## Phase 11: PostEditor

### Task 11.1: PostEditor.vue

**Files:**
- Modify: `src/pages/admin/PostEditor.vue`

- [ ] **Step 1: 实现**

```vue
<!-- src/pages/admin/PostEditor.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi, type AdminPost } from '../../api/admin'
import type { PublicTag } from '../../api/public'
import TiptapEditor from '../../components/editor/TiptapEditor.vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => Boolean(route.params.id))
const id = computed(() => Number(route.params.id))

const form = ref({
  slug: '', title: '', summary: '', body: '',
  read_time: '' as string | null, cover_color: null as string | null,
  tag_ids: [] as number[],
})
const status = ref<'draft' | 'published'>('draft')
const isFeatured = ref(false)
const tags = ref<PublicTag[]>([])
const error = ref('')
const saving = ref(false)
const loaded = ref(false)
const message = ref('')

onMounted(async () => {
  tags.value = await adminApi.listTags()
  if (isEdit.value) {
    const p = await adminApi.getPost(id.value)
    form.value = {
      slug: p.slug, title: p.title, summary: p.summary, body: p.body,
      read_time: p.read_time, cover_color: p.cover_color,
      tag_ids: p.tags.map(t => t.id),
    }
    status.value = p.status
    isFeatured.value = p.is_featured
  }
  loaded.value = true
})

function flash(msg: string) {
  message.value = msg
  setTimeout(() => { message.value = '' }, 2000)
}

async function save(): Promise<AdminPost | null> {
  error.value = ''; saving.value = true
  try {
    if (isEdit.value) {
      const p = await adminApi.patchPost(id.value, form.value)
      flash('已保存')
      return p
    } else {
      const p = await adminApi.createPost(form.value)
      router.replace(`/posts/${p.id}`)
      flash('已创建')
      return p
    }
  } catch (e: any) {
    error.value = e.message; return null
  } finally { saving.value = false }
}

async function publish() {
  const p = await save(); if (!p) return
  await adminApi.publishPost(p.id)
  status.value = 'published'
  flash('已发布')
}
async function unpublish() {
  if (!isEdit.value) return
  await adminApi.unpublishPost(id.value)
  status.value = 'draft'
  flash('已撤回')
}
async function feature() {
  const p = await save(); if (!p) return
  if (isFeatured.value) {
    await adminApi.unfeaturePost(p.id); isFeatured.value = false; flash('已取消置顶')
  } else {
    await adminApi.featurePost(p.id); isFeatured.value = true; flash('已置顶（其他文章已自动取消）')
  }
}
async function remove() {
  if (!isEdit.value) return
  if (!confirm('删除此文章？')) return
  await adminApi.deletePost(id.value)
  router.replace('/posts')
}
</script>

<template>
  <div class="post-editor" v-if="loaded">
    <header>
      <button class="back" @click="router.push('/posts')">← 返回</button>
      <h1>{{ isEdit ? '编辑文章' : '新建文章' }}</h1>
      <div class="status-pill" :class="status">{{ status === 'published' ? '已发布' : '草稿' }}</div>
      <div v-if="isFeatured" class="featured-pill">★ 置顶</div>
      <div class="spacer"></div>
      <span v-if="message" class="message">{{ message }}</span>
    </header>

    <div class="layout">
      <div class="main">
        <input v-model="form.title" placeholder="标题" class="title-input" />
        <input v-model="form.slug" placeholder="slug（URL 标识，例 understanding-ecc）" class="slug-input" />
        <textarea v-model="form.summary" placeholder="摘要（卡片显示）" rows="2" class="summary-input"></textarea>
        <TiptapEditor v-model="form.body" />
      </div>

      <aside class="side">
        <div class="card">
          <h3>标签</h3>
          <label v-for="t in tags" :key="t.id" class="tag-check">
            <input type="checkbox" :value="t.id" v-model="form.tag_ids" />
            <span class="tag-name" :style="{ color: t.color }">{{ t.name }}</span>
          </label>
        </div>
        <div class="card">
          <h3>显示</h3>
          <label class="row">阅读时长
            <input v-model="form.read_time" placeholder="例：8 分钟" />
          </label>
          <label class="row">配色
            <input type="color" :value="form.cover_color ?? '#7C3AED'"
              @input="form.cover_color = ($event.target as HTMLInputElement).value" />
            <button @click="form.cover_color = null" class="link-btn">用标签色</button>
          </label>
        </div>
        <div class="card actions">
          <button class="btn-primary" :disabled="saving" @click="save">保存草稿</button>
          <button v-if="status === 'draft'" :disabled="saving" @click="publish">保存并发布</button>
          <button v-else :disabled="saving" @click="unpublish">撤回为草稿</button>
          <button @click="feature">{{ isFeatured ? '取消置顶' : '设为置顶' }}</button>
          <button v-if="isEdit" class="danger" @click="remove">删除文章</button>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
}
.back {
  background: none; border: 1px solid #D6D3D1; padding: 6px 12px;
  border-radius: 8px; color: #78716C; cursor: pointer; font-size: 13px;
}
header h1 { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 600; }
.status-pill { padding: 2px 10px; border-radius: 6px; font-size: 12px; }
.status-pill.published { background: #D1FAE5; color: #065F46; }
.status-pill.draft { background: #F5F5F4; color: #57534E; }
.featured-pill { background: #FEF3C7; color: #92400E; padding: 2px 10px; border-radius: 6px; font-size: 12px; }
.spacer { flex: 1; }
.message { font-size: 13px; color: #059669; }
.layout { display: grid; grid-template-columns: 1fr 280px; gap: 20px; }
.main { display: flex; flex-direction: column; gap: 12px; }
.title-input {
  border: none; padding: 8px 0; font-size: 28px; font-weight: 600;
  font-family: 'Outfit', sans-serif; outline: none; background: transparent;
}
.slug-input {
  border: 1px solid #E7E5E4; border-radius: 8px; padding: 6px 12px;
  font-size: 13px; font-family: 'JetBrains Mono', monospace; color: #57534E;
}
.summary-input {
  border: 1px solid #D6D3D1; border-radius: 8px; padding: 8px 12px;
  font: inherit; font-size: 14px; resize: vertical;
}
.side { display: flex; flex-direction: column; gap: 16px; }
.card { background: white; border: 1px solid #E7E5E4; border-radius: 12px; padding: 16px; }
.card h3 { font-size: 13px; font-weight: 600; color: #78716C; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.tag-check { display: flex; align-items: center; gap: 6px; padding: 4px 0; cursor: pointer; }
.tag-name { font-size: 14px; font-weight: 500; }
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #57534E; }
.row input[type=text], .row input:not([type]) {
  flex: 1; border: 1px solid #D6D3D1; border-radius: 6px; padding: 6px 10px; font: inherit; font-size: 14px;
}
.row input[type=color] { width: 36px; height: 28px; border: 1px solid #D6D3D1; border-radius: 6px; padding: 2px; }
.link-btn { background: none; border: none; color: #2563EB; cursor: pointer; font-size: 12px; }
.actions { gap: 8px; display: flex; flex-direction: column; }
.actions button {
  padding: 8px 14px; border-radius: 8px; border: 1px solid #D6D3D1; background: white;
  cursor: pointer; font-size: 14px; text-align: left;
}
.btn-primary { background: #1C1917 !important; color: #fff !important; border: none !important; }
.actions button.danger { color: #B91C1C; border-color: #FCA5A5; }
.actions button:disabled { opacity: 0.6; cursor: wait; }
.error { color: #B91C1C; font-size: 13px; padding: 12px; background: #FEE2E2; border-radius: 8px; }
</style>
```

- [ ] **Step 2: 端到端验证**

确保 server + web dev 都跑着。在 `http://admin.wlplay.cn:5173/`：
1. 文章列表 → 点开"理解椭圆曲线密码学"
2. 看到表单填上了 slug/title/summary，body 是空（seed 没写正文）
3. 在编辑器里输入文字、加标题、列表
4. 点 **保存草稿** → 看到"已保存"
5. 刷新页面 → 内容仍在
6. 切到 `http://localhost:5173/post/understanding-ecc` → 看到正文
7. 点 **设为置顶** → 应该把 ECC 取消置顶后置回（因为 ECC 已经是 featured，逻辑是先取消再置回）。换 `claude-code-deep` 测置顶切换：旧 featured 应被自动撤
8. 在编辑器粘贴一张图片（截图后 ⌘V）→ 看到上传后图片插入。注：要求图床本地可达；若没启动会 alert 上传失败，可暂时跳过此步

- [ ] **Step 3: 提交**

```bash
git add src/pages/admin/PostEditor.vue
git commit -m "feat: PostEditor 文章编辑器（Tiptap + 标签 + 发布/置顶）"
```

---

## Phase 12: 构建与本地联调

### Task 12.1: 完整构建脚本验证

**Files:**
- Verify only

- [ ] **Step 1: 类型检查 + 前后端构建**

```bash
npm run build
```
Expected: 成功；产出 `dist/`（前端）和 `server/dist/`（后端）。

- [ ] **Step 2: 用构建产物启动 server**

```bash
DB_PATH=./data/blog.db node server/dist/index.js &
SERVER_PID=$!
sleep 1
curl -s http://127.0.0.1:3010/api/health
kill $SERVER_PID
```
Expected: `{"ok":true}`

- [ ] **Step 3: 修 build 有问题的话**

如果遇到 ESM import 路径问题（如 `Cannot find module './db'`），在 `server/tsconfig.json` 加 `"moduleResolution": "Bundler"` 已经覆盖；若 Node 跑 `dist/*.js` 报 "ERR_MODULE_NOT_FOUND" 提示缺少 `.js` 后缀，把 `tsconfig.json` 的 `module` 改为 `Node16` 并在 import 路径手动加 `.js`，或在 package.json 的 `type: "module"` 配合 `import` 路径用 `.js`。

具体做法：在 `server/tsconfig.json` 中改：
```json
"module": "NodeNext",
"moduleResolution": "NodeNext"
```
并在所有 `from './xxx'` import 改为 `from './xxx.js'`（运行时是 .js，TS 接受这种写法）。

注：本仓库 `package.json` 已有 `"type": "module"`，所以 ESM 模式默认。

- [ ] **Step 4: 提交（如有改动）**

```bash
git add -A
git commit -m "chore: 修正 build 输出的 ESM 模块解析"
```

如无改动跳过。

### Task 12.2: 写本地联调小抄

**Files:**
- Modify: `CLAUDE.md`（追加一节）

- [ ] **Step 1: 在 CLAUDE.md 末尾追加**

```markdown

## 博客后台开发

- 启动后端：`DB_PATH=./data/blog.db npm run dev:server`
- 启动前端：`npm run dev:web`
- 一键并行：`npm run dev`
- 初始化 seed：`DB_PATH=./data/blog.db npm run seed`
- 跑测试：`npm run test`
- 本地访问 admin：把 `127.0.0.1 admin.wlplay.cn` 加进 `/etc/hosts`，再访问 `http://admin.wlplay.cn:5173/`

子项目结构：

- `server/` — Hono 后端，SQLite 存储
- `src/pages/` — 路由页面（公开 + admin）
- `src/components/editor/TiptapEditor.vue` — WYSIWYG 编辑器
- `src/api/` — 前端 API 客户端
```

- [ ] **Step 2: 提交**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 补充博客后台开发指引"
```

---

## Phase 13: 部署

### Task 13.1: pm2 ecosystem 配置

**Files:**
- Create: `ecosystem.config.cjs`

- [ ] **Step 1: 写配置**

```js
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'wlplay-blog',
      script: './server/dist/index.js',
      cwd: '/srv/wlplay',
      env: {
        PORT: 3010,
        DB_PATH: '/var/lib/wlplay-blog/blog.db',
        IMAGE_HOSTING_UPLOAD_URL: 'http://127.0.0.1:5000/upload',
        IMAGE_HOSTING_BASE_URL: 'https://image.wlplay.cn',
      },
      autorestart: true,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true,
    },
  ],
}
```

注：`IMAGE_HOSTING_BASE_URL` 应填 image-hosting 实际公开访问的域；若图床部署在 `127.0.0.1:5000` 仅做内网，则前端拿到 URL 不可访问。要求：image-hosting 在公网可访问。**部署时务必确认这个值**。

- [ ] **Step 2: 提交**

```bash
git add ecosystem.config.cjs
git commit -m "chore: 添加 pm2 ecosystem 配置"
```

### Task 13.2: nginx 配置（admin 子域）

**Files:**
- 新增（在 ECS 上）：`/etc/nginx/conf.d/admin-wlplay.conf`
- 修改（在 ECS 上）：主域 `wlplay.cn` 配置文件

**注**：以下命令在 ECS 上执行（`ssh ecs`），不在本地仓库提交。先 ssh 上去再改。

- [ ] **Step 1: 复制 wiki 配置作为模板**

```bash
ssh ecs
sudo cp /etc/nginx/conf.d/wiki-wlplay.conf /etc/nginx/conf.d/admin-wlplay.conf
```

- [ ] **Step 2: 编辑 admin-wlplay.conf**

把里面的：
- `wiki.wlplay.cn` 全部替换为 `admin.wlplay.cn`
- `proxy_pass http://127.0.0.1:3002;` 改为 `proxy_pass http://127.0.0.1:3010;`

确认后内容应为：

```nginx
# 博客管理后台 - admin.wlplay.cn（需登录）
server {
    listen 443 ssl;
    server_name admin.wlplay.cn;
    ssl_certificate /etc/letsencrypt/live/wlynb.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wlynb.cn/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location = /_auth/check {
        internal;
        proxy_pass http://127.0.0.1:3003/auth/check;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Cookie $http_cookie;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    error_page 401 = @login_redirect;
    location @login_redirect {
        return 302 https://wlplay.cn/auth/login?redirect=https://admin.wlplay.cn$request_uri;
    }

    location / {
        auth_request /_auth/check;
        proxy_pass http://127.0.0.1:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }
}

server {
    if ($host = admin.wlplay.cn) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name admin.wlplay.cn;
    return 301 https://$host$request_uri;
}
```

⚠️ SSL 证书路径上面用的是 `wlynb.cn`，沿用 wiki 现有配置；但 admin.wlplay.cn 不在该证书的 SAN 里，nginx 会报错。**需扩展证书覆盖 admin.wlplay.cn**：

```bash
sudo certbot --nginx -d admin.wlplay.cn
```

或如果 wlplay.cn 已有独立证书覆盖了多个子域，把上面 `ssl_certificate` 路径改到那个证书。**部署前确认这一步**。

- [ ] **Step 3: 修改主域配置加 /api/public 反代**

ssh 上去查找主域配置：

```bash
sudo grep -lR "wlplay.cn" /etc/nginx/conf.d/ | head
```

找到主域配置文件，在 `server { server_name wlplay.cn; ... }` 块里加：

```nginx
location /api/public/ {
    proxy_pass http://127.0.0.1:3010;
    proxy_set_header Host $host;
    proxy_http_version 1.1;
}
```

- [ ] **Step 4: 测试和重载**

```bash
sudo nginx -t
sudo systemctl reload nginx
```
Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### Task 13.3: DNS

- [ ] **Step 1: 在 DNS 控制台加 A 记录**

`admin.wlplay.cn` → ECS 公网 IP（与 wiki/term 同 IP）

等 DNS 生效（通常 5 分钟内）。

### Task 13.4: 部署应用

- [ ] **Step 1: 本地推送 main 分支**

完成所有 Phase 0–12 后，把 `feat/blog-admin` 合到 main 推 GitHub：

```bash
git checkout main
git merge --no-ff feat/blog-admin
git push origin main
```

- [ ] **Step 2: 在 ECS 上拉取**

```bash
ssh ecs
cd /srv/wlplay
git pull
npm install
npm run build
```

- [ ] **Step 3: 准备数据目录**

```bash
sudo mkdir -p /var/lib/wlplay-blog
sudo chown $USER /var/lib/wlplay-blog
```

- [ ] **Step 4: 跑 seed（首次）**

```bash
DB_PATH=/var/lib/wlplay-blog/blog.db npm run seed
```
Expected: 5 tags / 6 posts / 3 media / 1 about 全部插入。

- [ ] **Step 5: 启动 pm2**

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

- [ ] **Step 6: 烟雾测试**

```bash
# 同 ECS 上
curl -s http://127.0.0.1:3010/api/health
curl -s http://127.0.0.1:3010/api/public/posts | head

# 从本机
curl -s https://wlplay.cn/api/public/posts | head
curl -s -I https://admin.wlplay.cn/         # 应 302 → wlplay.cn/auth/login
```

浏览器：
1. `https://wlplay.cn` → 显示博客首页（数据来自 API）
2. 关于卡片底部有 admin 链接
3. 点 admin 链接 → 跳到 `https://admin.wlplay.cn` → 跳到 `wlplay.cn/auth/login` → 输入 123456 → 回到 admin
4. 创建一篇测试文章 → 发布 → 主页刷新看到

### Task 13.5: 备份脚本

**Files:**
- Create（在 ECS 上）：`/srv/wlplay/backup-blog-db.sh`

- [ ] **Step 1: 写脚本**

```bash
ssh ecs
sudo tee /srv/wlplay/backup-blog-db.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SRC=/var/lib/wlplay-blog/blog.db
DST_DIR=/var/lib/wlplay-blog/backups
mkdir -p "$DST_DIR"
ts=$(date +%Y%m%d-%H%M%S)
cp "$SRC" "$DST_DIR/blog.db.$ts"
# 保留最近 14 天
find "$DST_DIR" -name 'blog.db.*' -mtime +14 -delete
EOF
sudo chmod +x /srv/wlplay/backup-blog-db.sh
```

- [ ] **Step 2: 加 cron**

```bash
( crontab -l 2>/dev/null; echo "0 3 * * * /srv/wlplay/backup-blog-db.sh" ) | crontab -
crontab -l   # 验证
```

### Task 13.6: 更新 deploy.md

**Files:**
- Modify: `deploy.md`（不进 git，但要在本地维护，按 deploy-rules）

- [ ] **Step 1: 在本地仓库的 deploy.md 末尾追加**

```markdown
## 博客后台

- **后端服务**：pm2 进程 `wlplay-blog`，监听 `127.0.0.1:3010`
- **数据库**：`/var/lib/wlplay-blog/blog.db`
- **图床依赖**：`IMAGE_HOSTING_UPLOAD_URL` / `IMAGE_HOSTING_BASE_URL` 在 `ecosystem.config.cjs` 配置
- **入口域名**：
  - 前台：`https://wlplay.cn`（公开）
  - 详情页：`https://wlplay.cn/post/<slug>`
  - 后台：`https://admin.wlplay.cn`（受 nginx auth_request 保护）
- **部署流程**：
  1. `cd /srv/wlplay && git pull && npm install && npm run build`
  2. `pm2 restart wlplay-blog`
  3. （首次）`DB_PATH=/var/lib/wlplay-blog/blog.db npm run seed`
- **nginx 配置**：`/etc/nginx/conf.d/admin-wlplay.conf` + 主域 `/api/public/` 反代
- **备份**：`/srv/wlplay/backup-blog-db.sh`，cron 每天 03:00
- **常见故障**：
  - 502：pm2 进程挂了 → `pm2 logs wlplay-blog`
  - 401 死循环：`127.0.0.1:3003` 认证服务挂了 → `pm2 logs <auth-service>`
  - 图片上传失败：image-hosting 进程或 `IMAGE_HOSTING_*` 配置 → `pm2 logs image-hosting`
```

注：`deploy.md` 在 `.gitignore` 中，**不要 commit**。

- [ ] **Step 2: 验收清单走一遍**

走一次 spec §11 所有项，逐条勾选：

- [ ] 主页视觉跟改造前一致（除 admin 链接已通过 about.links 接入）
- [ ] 主页所有数据来自 `/api/public/*`
- [ ] 文章卡片点击进入 `/post/:slug` 显示正常
- [ ] `admin.wlplay.cn` 未登录被 302 跳 `wlplay.cn/auth/login`
- [ ] 登录后能新建草稿 → 编辑 → 上传图片 → 发布 → 设置置顶 → 主页刷新看到变化
- [ ] 标签管理：新建/改色/改名生效；引用中的 tag 删除返回 409
- [ ] 媒体 / 关于卡的修改在主页刷新后立即生效
- [ ] seed 二次跑无副作用
- [ ] 清空 DB 重启服务 + seed 后应用恢复
- [ ] DOMPurify 写入和读取两侧都生效（试 `<script>` 在 body 里）
- [ ] 服务重启后数据保留

---

## 完成后

- 提一个 PR `feat/blog-admin → main`，标题：`feat: 博客内容管理后台`
- 描述里贴 spec 链接和验收清单截图
- 部署后过 24h 检查 pm2 日志、nginx access log，确认无异常
