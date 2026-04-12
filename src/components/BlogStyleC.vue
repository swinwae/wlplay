<script setup lang="ts">
import { ref, computed } from 'vue'

type View = 'home' | 'articles' | 'projects'

interface Post {
  title: string
  summary: string
  date: string
  tag: string
  readTime: string
  color: string
}

interface Project {
  name: string
  desc: string
  tags: string[]
  color: string
  url: string
}

interface MediaItem {
  title: string
  author: string
  type: 'music' | 'book' | 'movie'
}

const currentView = ref<View>('home')
const activeTag = ref('全部')

const posts: Post[] = [
  {
    title: '理解椭圆曲线密码学',
    summary: '从有限域到点乘法，深入探索 ECC 背后的数学原理，以及它对现代安全的意义。',
    date: '2026-04-01',
    tag: '密码学',
    readTime: '12 分钟',
    color: '#7C3AED',
  },
  {
    title: 'Claude Code 深度探索',
    summary: '探索 Claude Code 作为开发伙伴的能力 — 从代码生成到架构推理。',
    date: '2026-03-28',
    tag: 'AI 工具',
    readTime: '8 分钟',
    color: '#2563EB',
  },
  {
    title: '用 Vue 3 构建门户应用',
    summary: '我如何构建 WLPlay — 一个基于 Vue 3、Vite 和 iframe 嵌入的多项目门户。',
    date: '2026-03-15',
    tag: 'Web 开发',
    readTime: '6 分钟',
    color: '#059669',
  },
  {
    title: '有限域之美',
    summary: '有限域的直觉入门，以及它在纠错编码和密码学中的精妙应用。',
    date: '2026-02-20',
    tag: '数学',
    readTime: '10 分钟',
    color: '#D97706',
  },
  {
    title: 'Claude Code 的超能力系统',
    summary: 'Superpowers 技能系统全览 — 让 AI 辅助开发更可靠的结构化工作流。',
    date: '2026-02-05',
    tag: 'AI 工具',
    readTime: '5 分钟',
    color: '#DC2626',
  },
  {
    title: '为什么我开始写博客',
    summary: '关于公开学习、构建个人知识库以及把想法写下来的价值的思考。',
    date: '2025-12-20',
    tag: '随笔',
    readTime: '4 分钟',
    color: '#0E7490',
  },
]

const projects: Project[] = [
  { name: 'ECC Explorer', desc: 'ECC 可视化学习器 — 通过交互式图表理解椭圆曲线密码学的核心概念', tags: ['Vue', 'TypeScript', 'D3'], color: '#7C3AED', url: '/ecc-explorer/' },
  { name: 'Claude Learn', desc: 'Claude Code 学习站 — 系统学习 Claude Code 的使用技巧和最佳实践', tags: ['Vue', 'Markdown'], color: '#2563EB', url: '/claude-learn/' },
  { name: 'Superpowers', desc: 'Superpowers 探索器 — 浏览和理解 Claude Code 的 Superpowers 技能系统', tags: ['Vue', 'TypeScript'], color: '#059669', url: '/superpowers-explorer/' },
]

function openProject(proj: Project) {
  window.open(proj.url, '_blank')
}

const mediaItems: MediaItem[] = [
  { title: '月光', author: 'Debussy', type: 'music' },
  { title: '数据密集型应用设计', author: 'Martin Kleppmann', type: 'book' },
  { title: '星际穿越', author: 'Christopher Nolan', type: 'movie' },
]

const mediaIcons: Record<MediaItem['type'], string> = {
  music: '♫',
  book: '◈',
  movie: '▶',
}

const allTags = computed(() => {
  const tags = new Set(posts.map((p) => p.tag))
  return ['全部', ...tags]
})

const filteredPosts = computed(() => {
  if (activeTag.value === '全部') return posts
  return posts.filter((p) => p.tag === activeTag.value)
})

const latestPost = posts[0]
const recentPosts = posts.slice(1, 5)

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function goTo(view: View) {
  currentView.value = view
  activeTag.value = '全部'
}
</script>

<template>
  <div class="style-c">
    <!-- ═══ HOME ═══ -->
    <div v-if="currentView === 'home'" class="bento-grid">
      <!-- Row 1: Featured (2col×2row) + About + Stats -->
      <article class="bento-card card-latest">
        <span class="card-tag" :style="{ background: latestPost.color + '18', color: latestPost.color }">{{ latestPost.tag }}</span>
        <h2 class="card-title">{{ latestPost.title }}</h2>
        <p class="card-summary">{{ latestPost.summary }}</p>
        <div class="card-meta">
          <span>{{ formatDate(latestPost.date) }}</span>
          <span class="dot" />
          <span>{{ latestPost.readTime }}</span>
        </div>
      </article>

      <div class="bento-card card-about">
        <div class="about-avatar">W</div>
        <h3 class="about-name">Wan Li</h3>
        <p class="about-bio">开发者 & 探索者。构建有趣的东西，记录学习的过程。</p>
        <div class="about-links">
          <a href="https://github.com/swinwae" target="_blank">GitHub</a>
          <a href="https://term.wlplay.cn" target="_blank">Terminal</a>
        </div>
      </div>

      <div class="bento-card card-stats">
        <div class="stat">
          <span class="stat-num">{{ posts.length }}</span>
          <span class="stat-label">篇文章</span>
        </div>
        <div class="stat">
          <span class="stat-num">{{ projects.length }}</span>
          <span class="stat-label">个项目</span>
        </div>
        <div class="stat">
          <span class="stat-num">45</span>
          <span class="stat-label">分钟阅读</span>
        </div>
      </div>

      <!-- Row 2: Recent Articles + Recent Projects + Now -->
      <div class="bento-card card-list">
        <button class="list-header" @click="goTo('articles')">
          <h3 class="list-label">最近文章</h3>
          <span class="view-all">查看全部 →</span>
        </button>
        <a v-for="post in recentPosts" :key="post.title" href="#" class="list-row">
          <span class="list-title">{{ post.title }}</span>
          <span class="list-date">{{ formatDate(post.date) }}</span>
        </a>
      </div>

      <div class="bento-card card-list">
        <button class="list-header" @click="goTo('projects')">
          <h3 class="list-label">最近项目</h3>
          <span class="view-all">查看全部 →</span>
        </button>
        <button v-for="proj in projects" :key="proj.name" class="list-row" @click="openProject(proj)">
          <div class="proj-info">
            <span class="list-title">{{ proj.name }}</span>
            <span class="proj-desc">{{ proj.desc }}</span>
          </div>
          <svg class="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
        </button>
      </div>

      <div class="bento-card card-media">
        <h3 class="list-label">在听在看</h3>
        <div v-for="item in mediaItems" :key="item.title" class="media-row">
          <span class="media-icon">{{ mediaIcons[item.type] }}</span>
          <div class="media-info">
            <span class="media-title">{{ item.title }}</span>
            <span class="media-author">{{ item.author }}</span>
          </div>
        </div>
      </div>

      <!-- Row 3: Wide post card -->
      <article class="bento-card card-post-wide" :style="{ '--c': posts[1].color }">
        <div>
          <span class="card-tag" :style="{ background: posts[1].color + '18', color: posts[1].color }">{{ posts[1].tag }}</span>
          <h3 class="card-title-sm">{{ posts[1].title }}</h3>
        </div>
        <div class="card-meta">
          <span>{{ formatDate(posts[1].date) }}</span>
          <span class="dot" />
          <span>{{ posts[1].readTime }}</span>
        </div>
      </article>
    </div>

    <!-- ═══ ARTICLES LIST ═══ -->
    <div v-else-if="currentView === 'articles'" class="subpage">
      <div class="subpage-header">
        <button class="back-btn" @click="goTo('home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          返回
        </button>
        <h1 class="subpage-title">全部文章</h1>
        <span class="subpage-count">{{ filteredPosts.length }} 篇</span>
      </div>

      <div class="tag-filter">
        <button
          v-for="tag in allTags"
          :key="tag"
          :class="['tag-btn', { active: activeTag === tag }]"
          @click="activeTag = tag"
        >
          {{ tag }}
        </button>
      </div>

      <div class="article-list">
        <a v-for="post in filteredPosts" :key="post.title" href="#" class="article-row">
          <div class="article-color" :style="{ background: post.color }" />
          <div class="article-body">
            <div class="article-top">
              <h3 class="article-title">{{ post.title }}</h3>
              <span class="card-tag" :style="{ background: post.color + '18', color: post.color }">{{ post.tag }}</span>
            </div>
            <p class="article-summary">{{ post.summary }}</p>
            <div class="card-meta">
              <span>{{ formatDateFull(post.date) }}</span>
              <span class="dot" />
              <span>{{ post.readTime }}阅读</span>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- ═══ PROJECTS LIST ═══ -->
    <div v-else-if="currentView === 'projects'" class="subpage">
      <div class="subpage-header">
        <button class="back-btn" @click="goTo('home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          返回
        </button>
        <h1 class="subpage-title">全部项目</h1>
        <span class="subpage-count">{{ projects.length }} 个</span>
      </div>

      <div class="project-grid">
        <button v-for="proj in projects" :key="proj.name" class="project-card" @click="openProject(proj)">
          <div class="project-color-bar" :style="{ background: proj.color }" />
          <div class="project-body">
            <h3 class="project-name">{{ proj.name }}</h3>
            <p class="project-desc">{{ proj.desc }}</p>
            <div class="project-tags">
              <span v-for="t in proj.tags" :key="t" class="project-tag-pill">{{ t }}</span>
            </div>
          </div>
          <div class="project-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-c {
  --bg: #F5F5F4;
  --card-bg: #FFFFFF;
  --text: #1C1917;
  --text-dim: #78716C;
  --border: #D6D3D1;
  --radius: 16px;

  font-family: 'Work Sans', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100%;
  padding: 40px;
  overflow-y: auto;
}

/* ═══════════════════════════════════ */
/* HOME: Bento Grid                    */
/* ═══════════════════════════════════ */

.bento-grid {
  display: grid;
  grid-template-columns: 1fr 0.7fr 1.3fr;
  grid-auto-rows: auto;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;
}

.bento-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid var(--border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bento-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

/* Featured */
.card-latest {
  grid-column: span 2;
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 32px;
  background: linear-gradient(160deg, #FAFAF9 0%, #F5F0EB 100%);
  cursor: pointer;
}

.card-latest .card-title {
  font-family: 'Outfit', sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.25;
  margin: 12px 0;
  color: var(--text);
}

.card-latest .card-summary {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-dim);
  margin-bottom: 16px;
}

/* About */
.card-about {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.about-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #7C3AED, #06B6D4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: #fff;
  margin-bottom: 4px;
}

.about-name {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.about-bio {
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.5;
}

.about-links {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.about-links a {
  font-size: 12px;
  color: #7C3AED;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.15s;
}

.about-links a:hover {
  opacity: 0.7;
}

/* Stats */
.card-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  background: linear-gradient(160deg, #7C3AED, #06B6D4);
  color: #fff;
  border-color: transparent;
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-num {
  font-family: 'Outfit', sans-serif;
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  opacity: 0.8;
}

/* List cards */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  background: none;
  padding: 0;
  margin-bottom: 12px;
  cursor: pointer;
  font-family: inherit;
}

.list-header:hover .view-all {
  color: var(--text);
}

.list-label {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.view-all {
  font-size: 12px;
  color: var(--text-dim);
  transition: color 0.15s;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin: 0 -12px;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  width: calc(100% + 24px);
  text-align: left;
}

.list-row:hover {
  background: var(--bg);
}

.list-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-date {
  font-size: 12px;
  color: var(--text-dim);
  flex-shrink: 0;
  white-space: nowrap;
}

.proj-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.proj-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  color: var(--text-dim);
  flex-shrink: 0;
}

/* Now (media) */
.card-media {
  display: flex;
  flex-direction: column;
}

.card-media .list-label {
  margin-bottom: 12px;
}

.media-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.media-row + .media-row {
  border-top: 1px solid #F0EFED;
}

.media-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  color: var(--text-dim);
}

.media-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.media-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-author {
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.3;
}

/* Wide post */
.card-post-wide {
  grid-column: span 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  cursor: pointer;
}

.card-title-sm {
  font-family: 'Outfit', sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
  margin: 8px 0 0;
}

/* Common */
.card-tag {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 3px 10px;
  border-radius: 8px;
  display: inline-block;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dim);
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-dim);
  opacity: 0.5;
}

/* ═══════════════════════════════════ */
/* SUBPAGES: Articles & Projects       */
/* ═══════════════════════════════════ */

.subpage {
  max-width: 760px;
  margin: 0 auto;
}

.subpage-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  color: var(--text);
  border-color: #A8A29E;
}

.subpage-title {
  font-family: 'Outfit', sans-serif;
  font-size: 24px;
  font-weight: 600;
}

.subpage-count {
  font-size: 13px;
  color: var(--text-dim);
  margin-left: auto;
}

/* Tag filter */
.tag-filter {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tag-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-btn:hover {
  border-color: #A8A29E;
  color: var(--text);
}

.tag-btn.active {
  background: var(--text);
  color: var(--card-bg);
  border-color: var(--text);
}

/* Article list */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-row {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.article-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.article-color {
  width: 4px;
  flex-shrink: 0;
}

.article-body {
  padding: 20px 24px;
  flex: 1;
  min-width: 0;
}

.article-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.article-title {
  font-family: 'Outfit', sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
}

.article-summary {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-dim);
  margin-bottom: 12px;
}

/* Project grid */
.project-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  width: 100%;
  text-align: left;
  padding: 0;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.project-color-bar {
  width: 4px;
  flex-shrink: 0;
}

.project-body {
  padding: 24px;
  flex: 1;
  min-width: 0;
}

.project-name {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.project-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-dim);
  margin-bottom: 14px;
}

.project-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.project-tag-pill {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  background: var(--bg);
  padding: 3px 10px;
  border-radius: 8px;
}

.project-arrow {
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: var(--text-dim);
  transition: color 0.15s;
}

.project-card:hover .project-arrow {
  color: var(--text);
}

/* ═══════════════════════════════════ */
/* Responsive                          */
/* ═══════════════════════════════════ */

@media (max-width: 768px) {
  .style-c {
    padding: 20px 16px;
  }

  .bento-grid {
    grid-template-columns: 1fr;
  }

  .card-latest,
  .card-post-wide {
    grid-column: span 1;
  }

  .card-latest {
    grid-row: span 1;
  }

  .card-post-wide {
    flex-direction: column;
    align-items: flex-start;
  }

  .subpage-header {
    flex-wrap: wrap;
  }

  .article-top {
    flex-direction: column;
    gap: 6px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-latest {
    grid-column: span 2;
    grid-row: span 1;
  }

  .card-post-wide {
    grid-column: span 2;
  }
}
</style>
