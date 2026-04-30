# 博客管理后台设计

- **日期**：2026-05-01
- **分支**：`feat/blog-admin`
- **目标**：在 wlplay 仓库中新增一个博客内容管理后台（admin），把目前主页里硬编码的文章 / 标签 / 媒体 / 关于卡数据迁到 SQLite，并为前台主页提供 API 化的数据来源 + 文章详情页

---

## 1. 范围

### 1.1 In scope

| 实体 | 管理内容 |
|------|---------|
| 文章 (Post) | 标题、URL slug、摘要、正文（WYSIWYG）、阅读时长、状态（draft/published）、置顶、配色、标签、发布时间 |
| 标签 (Tag) | 名称、颜色、排序 |
| 媒体 (Media) | 在听 / 在看 / 在读，类型 + 标题 + 作者 + 排序 + 是否激活 |
| 关于 (About) | 头像字符、姓名、个签、社交链接列表 |

主页 `BlogStyleC.vue` 改造范围：**视觉不动，仅把数据源从硬编码切到 API**；新增文章详情页 `/post/:slug`；关于卡片在 Wiki 链接后追加 `admin` 链接。

### 1.2 Out of scope

- 项目（Project）管理：仍由 `src/projects.ts` 代码维护
- 多用户 / 评论 / 订阅 / 全文搜索 / 草稿协作
- 主页视觉调整、暗色模式等其他改造（留待后续单独立项）
- Stats 卡的"45 分钟阅读"将从文章 `read_time` 自动累加，不进后台

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│ wlplay.cn  (主域，公开)                                        │
│   GET  /              → 首页 (BlogStyleC，从 API 拉数据)        │
│   GET  /post/:slug    → 文章详情页 (新增)                       │
│   GET  /app/:slug     → 子项目 iframe（保留现有）                │
│   GET  /api/public/*  → 只读公开 API                           │
└──────────────────────────────────────────────────────────────┘
                           ↑↓ 同进程
┌──────────────────────────────────────────────────────────────┐
│ admin.wlplay.com  (子域，nginx auth_request 保护)              │
│   GET  /              → Admin SPA                             │
│   *    /api/admin/*  → 写权限 API                              │
└──────────────────────────────────────────────────────────────┘
                           ↓
              ┌──────────────────────────────────┐
              │ Hono on 127.0.0.1:3010           │
              │ better-sqlite3 + SQLite          │
              │ /var/lib/wlplay-blog/blog.db     │
              └──────────────────────────────────┘
```

### 2.1 认证

复用 wiki.wlplay.cn 已部署的统一认证方案：
- 应用层不写认证代码
- nginx 在 `admin.wlplay.com` 前置 `auth_request /_auth/check` 调用 `127.0.0.1:3003/auth/check`
- 未登录 401 → 重定向到 `https://wlplay.cn/auth/login?redirect=...`
- 主域 `wlplay.cn/api/public/*` 不挂 auth_request，对所有人开放只读

### 2.2 主进程

单个 Hono 服务监听 `127.0.0.1:3010`，同时挂载：
- `/api/public/*` 只读路由
- `/api/admin/*` 写路由（应用层信任 nginx 已认证，不再校验）
- `/admin/*` 服务 admin SPA 静态产物（即 `vite build` 出的 admin index.html + assets）

主域 `wlplay.cn` 的主页静态产物由 nginx 直接服务（保持现状），通过 `/api/public/*` 反代到 :3010 拉数据；`admin.wlplay.com` 整域反代到 :3010。

---

## 3. 数据模型 (SQLite DDL)

```sql
CREATE TABLE posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',     -- HTML（Tiptap 输出，渲染前 DOMPurify 清洗）
  read_time     TEXT,                          -- 例 '12 分钟'，可空
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  is_featured   INTEGER NOT NULL DEFAULT 0,    -- 0/1，全表至多一行为 1
  cover_color   TEXT,                          -- 例 '#7C3AED'，覆盖标签默认色
  published_at  TEXT,                          -- ISO datetime
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
  id     INTEGER PRIMARY KEY CHECK (id = 1),  -- 单行表
  avatar TEXT NOT NULL,
  name   TEXT NOT NULL,
  bio    TEXT NOT NULL,
  links  TEXT NOT NULL                         -- JSON: [{label, url}]
);

CREATE INDEX idx_posts_status_published_at ON posts(status, published_at DESC);
CREATE INDEX idx_posts_featured            ON posts(is_featured) WHERE is_featured = 1;
```

### 3.1 关键约束

- `posts.is_featured`：业务层保证全表至多一行为 1。`POST /api/admin/posts/:id/feature` 时在事务里先 `UPDATE posts SET is_featured = 0`，再设当前行为 1
- `tags.color`：CSS 颜色串（如 `#7C3AED`）。文章卡片优先用 `posts.cover_color`，缺省回退到主标签的 `tags.color`
- 文章可挂多个标签。API `GET /api/public/posts` 返回完整 `tags` 数组；首页/详情页 UI **只渲染主标签**（数组首元素，由后端按 `tags.sort` 升序输出），用于卡片配色和"标签"小徽章。多对多 schema 是为未来扩展预留，当前 admin UI 只允许单选一个主标签

---

## 4. API 设计

所有响应 `Content-Type: application/json`。错误统一格式：`{"error": "<message>"}` + 合适的 HTTP 状态码。

### 4.1 公开 API (`/api/public/*`，无认证)

```
GET  /api/public/posts
       ?status=published     默认 published；admin 域可传 'all' 或 'draft'
       响应：[{id, slug, title, summary, read_time, status, is_featured,
              cover_color, published_at, tags: [{name, color}]}]
       不含 body

GET  /api/public/posts/:slug
       响应：{...上同..., body}     含正文 HTML

GET  /api/public/tags
       响应：[{id, name, color, sort, post_count}]

GET  /api/public/media
       响应：[{id, type, title, author}]   仅 active=1，按 sort 升序

GET  /api/public/about
       响应：{avatar, name, bio, links: [{label, url}]}

GET  /api/public/stats
       响应：{posts_count, total_read_minutes}
       total_read_minutes 解析每篇 read_time 中的数字累加（容错）
```

### 4.2 管理 API (`/api/admin/*`，nginx 已前置认证)

```
POST   /api/admin/posts                {slug, title, summary, body, read_time, cover_color, tag_ids: number[]}
GET    /api/admin/posts                ?status=all|draft|published
GET    /api/admin/posts/:id            含 body
PATCH  /api/admin/posts/:id            部分更新；同上字段任选
DELETE /api/admin/posts/:id

POST   /api/admin/posts/:id/publish    切到 published；若 published_at 为空则填 now()
POST   /api/admin/posts/:id/unpublish  切回 draft
POST   /api/admin/posts/:id/feature    在事务里清除其他 featured，把当前置为 featured
POST   /api/admin/posts/:id/unfeature  取消当前 featured

GET    /api/admin/tags
POST   /api/admin/tags                 {name, color, sort?}
PATCH  /api/admin/tags/:id
DELETE /api/admin/tags/:id             若有引用则 409 Conflict（DB 已 RESTRICT）

GET    /api/admin/media
POST   /api/admin/media                {type, title, author, sort?, active?}
PATCH  /api/admin/media/:id
DELETE /api/admin/media/:id

GET    /api/admin/about
PATCH  /api/admin/about                {avatar?, name?, bio?, links?}

POST   /api/admin/upload               multipart/form-data; field=file
       行为：转发到 image-hosting 上传接口，返回 {url}
       前端编辑器调用此接口插入图片
```

---

## 5. 前端代码组织

```
src/
├── main.ts
├── App.vue                       # 路由分发：根据 host/path 决定渲染壳
├── router.ts                     # vue-router 4 配置（hash 不用，用 history mode）
├── pages/
│   ├── Home.vue                  # 原 BlogStyleC 改造：onMounted 拉 API
│   ├── PostDetail.vue            # 新：详情页，DOMPurify 清洗 + v-html
│   ├── ProjectFrame.vue          # 原 /app/:slug 渲染，复用 AppFrame
│   └── admin/
│       ├── AdminApp.vue          # 后台壳：左侧导航 + 顶栏 + <router-view/>
│       ├── PostsList.vue         # 文章列表（草稿/已发布过滤、置顶标记、搜索）
│       ├── PostEditor.vue        # 新建/编辑文章（Tiptap WYSIWYG）
│       ├── TagsManager.vue
│       ├── MediaManager.vue
│       └── AboutEditor.vue
├── components/
│   ├── AppFrame.vue              # 现有，不动
│   ├── editor/
│   │   ├── TiptapEditor.vue      # 封装 Tiptap，含工具栏 + 图片上传桥
│   │   └── editor-extensions.ts  # 启用的 Tiptap 扩展集合
│   └── ui/                       # 通用按钮、输入框、对话框等
├── api/
│   ├── client.ts                 # fetch 封装，统一错误处理
│   ├── public.ts
│   └── admin.ts
├── projects.ts                   # 不动
├── style.css
└── assets/

server/
├── index.ts                      # Hono entry，挂载路由 + 静态文件 + DB 初始化
├── db.ts                         # better-sqlite3 单例 + migration runner
├── migrations/
│   └── 001_init.sql              # 第 3 节 DDL
├── seed.ts                       # 一次性脚本：把当前硬编码内容写入空 DB
├── routes/
│   ├── public.ts
│   ├── admin.ts
│   └── upload.ts
└── lib/
    ├── sanitize.ts               # 服务端再做一次 DOMPurify（jsdom）
    └── image-hosting.ts          # 转发到 image-hosting 的客户端
```

### 5.1 路由分发逻辑

```ts
// App.vue / router 守卫
if (window.location.hostname === 'admin.wlplay.com') {
  // → AdminApp 路由组：/, /posts, /posts/new, /posts/:id, /tags, /media, /about
} else {
  // → Public 路由组：/, /post/:slug, /app/:slug
}
```

本地开发用 vite dev server + 一个 `?admin=1` 查询参数或 `localhost:5174` 第二端口模拟两域，避免开发态非要配 hosts。

### 5.2 编辑器 (TiptapEditor.vue)

**启用的 Tiptap 扩展**：
- StarterKit（含 Heading, Bold, Italic, Strike, BulletList, OrderedList, Blockquote, CodeBlock, HorizontalRule, History, Paragraph, Text）
- Link（自动 linkify）
- Image（自定义 setImage 命令调上传）
- Placeholder（"开始写..."）
- CodeBlockLowlight + lowlight + highlight.js 主题

**工具栏按钮**：H1/H2/H3、粗体、斜体、删除线、引用、代码块、行内代码、链接、图片、有序/无序列表、分隔线、撤销/重做。

**图片上传交互**：
- 点工具栏图片图标 → 隐藏 `<input type="file">` 触发选择
- 直接 ⌘V 粘贴截图 → ProseMirror `handlePaste` 拦截
- 拖拽文件进编辑区 → `handleDrop` 拦截
- 三种入口都走 `POST /api/admin/upload` → 拿到 URL → `editor.commands.setImage({src})`

**输出**：`editor.getHTML()` 存到 `posts.body`。

### 5.3 详情页 (PostDetail.vue)

```html
<article>
  <h1>{{ post.title }}</h1>
  <div class="meta">…</div>
  <div class="post-body" v-html="cleanBody"></div>
</article>
```

`cleanBody = computed(() => DOMPurify.sanitize(post.body))`。CSS 写一份 `.post-body` 内嵌的排版样式（标题、段落、引用、代码块、图片自适应等）。

---

## 6. 后端实现要点

### 6.1 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| Web 框架 | Hono | 轻量、TS 原生、API 友好；node-server 适配器跑在 Node 上 |
| 数据库驱动 | better-sqlite3 | 同步 API、无连接池、零依赖、性能足够 |
| Migration | 手写 SQL 文件 + 启动时按文件名升序执行未应用的 | 不引入 ORM 和 migration 框架，YAGNI |
| 校验 | zod | 路由入参校验，类型推导直通 TS |
| 日志 | console + pino（可选） | 简单 |
| 启动 | tsx（开发）/ tsc 编译后 node（生产） | 跟 vue-tsc 一致 |

不引入 ORM。SQL 直写，封装一个 `db.ts` 暴露 prepared statements。

### 6.2 服务端清洗

虽然 Tiptap 的输出已经相对干净，仍在服务端用 `isomorphic-dompurify`（或 `jsdom + dompurify`）二次清洗：
- 写入：`POST/PATCH posts.body` 时清洗
- 读取：`GET /api/public/posts/:slug` 时**再**清洗一次（防御已存的脏数据）

### 6.3 image-hosting 转发

`POST /api/admin/upload` 服务端接收 multipart → 转发到 image-hosting 的上传接口（上游地址走环境变量 `IMAGE_HOSTING_UPLOAD_URL`）→ 提取 URL 返回前端。失败返回 502。

具体上游协议在实现阶段查 image-hosting 项目代码，实现计划里会落实。

---

## 7. 部署

### 7.1 进程

新建 `ecosystem.config.cjs`（或扩展现有的）：
```js
{
  name: 'wlplay-blog',
  script: './server/dist/index.js',
  cwd: '/srv/wlplay',
  env: {
    PORT: 3010,
    DB_PATH: '/var/lib/wlplay-blog/blog.db',
    IMAGE_HOSTING_UPLOAD_URL: 'http://127.0.0.1:<port>/upload',
    ADMIN_DIST: '/srv/wlplay/admin-dist'
  }
}
```

### 7.2 nginx

新增 `admin-wlplay.conf`，参照 `wiki-wlplay.conf` 改：
- `server_name admin.wlplay.com`
- `proxy_pass http://127.0.0.1:3010`
- `auth_request` 段保持
- 错误 401 跳 `https://wlplay.cn/auth/login?redirect=https://admin.wlplay.com$request_uri`

修改主域 nginx 配置：新增 `location /api/public/ { proxy_pass http://127.0.0.1:3010; }`。

### 7.3 SSL

`admin.wlplay.com` 申请 Let's Encrypt 证书（同 wiki 模式）。DNS 加 A 记录指向 ECS。

### 7.4 数据初始化

首次部署：
1. `mkdir -p /var/lib/wlplay-blog && chown www-data ...`
2. 启动服务，自动跑 migrations 建表
3. `node server/dist/seed.js` 把现有硬编码内容写入

### 7.5 备份

简单 cron：每天 `cp blog.db blog.db.YYYYMMDD.bak`，保留最近 14 天。先不上对象存储，YAGNI。

---

## 8. 数据迁移 / Seed

`server/seed.ts` 行为（幂等）：
- 若 `posts` 表为空 → 写入 `BlogStyleC.vue` 现有的 6 篇假文章
- 若 `tags` 表为空 → 推导出 6 个标签（密码学/AI 工具/Web 开发/数学/随笔），颜色取自原文章 `color`
- 若 `media_items` 表为空 → 写入 3 条媒体
- 若 `about` 表为空 → 写入"Wan Li / 开发者 & 探索者..."

每个块独立判断，运行多次安全。

---

## 9. 主页 / 详情页改造细节

### 9.1 Home.vue (原 BlogStyleC.vue)

- 删除文件内 `posts` / `mediaItems` 常量
- `onMounted` 并发拉 `/api/public/posts`、`/api/public/media`、`/api/public/about`、`/api/public/stats`
- 加 `loading` 状态（骨架屏或简单的 "加载中"）
- `latestPost` 改为 `posts.find(p => p.is_featured) ?? posts[0]`
- 文章卡片点击 → `router.push(/post/${post.slug})`（替代当前 `href="#"`）
- 关于卡片 `about-links` 在 Wiki 后追加外链 `<a href="https://admin.wlplay.com" target="_blank">admin</a>`

### 9.2 PostDetail.vue (新增)

- 路由：`/post/:slug`
- `onMounted` 拉 `/api/public/posts/:slug`，404 → 404 页
- 标题、tag、日期、阅读时长 + 正文（DOMPurify 清洗后 v-html）
- 顶部"返回首页"按钮
- 排版样式集中在 `.post-body { ... }` 作用域内（标题、段落、`<pre>`、`<img>` 等）

### 9.3 admin 入口链接

`Home.vue` 的关于卡片：
```html
<a href="https://github.com/swinwae" target="_blank">GitHub</a>
<a href="https://term.wlplay.cn" target="_blank">Terminal</a>
<a href="https://wiki.wlplay.cn" target="_blank">Wiki</a>
<a href="https://admin.wlplay.com" target="_blank">admin</a>
```

---

## 10. 风险与权衡

| 风险 | 处理 |
|------|------|
| 主页从纯静态变动态，首屏多一个 API 请求 | 本机 SQLite + Hono，本地数据库延迟 < 5ms；加骨架屏不会肉眼可感 |
| Tiptap + 依赖体积膨胀 admin bundle | admin bundle 单独打包；主页不引入 |
| `v-html` XSS | 写入和读取都过 DOMPurify；正文只来自被认证的 admin 自己 |
| SQLite 单文件丢失 | 日 cron 备份；DB 目录独立挂载点 |
| image-hosting 上行协议变更 | 转发逻辑封装在 `lib/image-hosting.ts`，单点修改 |
| `is_featured` 数据竞态（两次同时 feature） | 在事务里做 `UPDATE … SET is_featured = 0; UPDATE … SET is_featured = 1` |
| nginx auth_request 配置错误把后端裸暴露 | 部署时 curl `admin.wlplay.com/api/admin/posts` 必须返回 302 → 登录页验证 |

---

## 11. 验收清单

- [ ] 主页视觉跟改造前像素一致（关于卡 admin 链接除外）
- [ ] 主页所有数据来自 `/api/public/*`，无硬编码
- [ ] 文章卡片点击进入 `/post/:slug` 详情页正常显示
- [ ] `admin.wlplay.com` 未登录访问被 302 跳到 wlplay.cn/auth/login
- [ ] 登录后能在 admin 完成：新建草稿 → 编辑正文 → 上传图片 → 发布 → 设置置顶 → 主页刷新看到变化
- [ ] 标签管理：新建、改色、改名生效；引用中的标签删除返回 409
- [ ] 媒体 / 关于卡的修改在主页刷新后立即生效
- [ ] 跑 `seed.ts` 一次得到与改造前等价的内容；二次跑无副作用
- [ ] 清空 DB 后重新跑 migrations + seed，应用恢复正常
- [ ] DOMPurify 在写入和读取两侧都生效（构造一段含 `<script>` 的 body 测试）
- [ ] 服务重启后数据保留（验证 `/var/lib/wlplay-blog/blog.db` 持久化）
