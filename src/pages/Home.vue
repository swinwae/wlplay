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

<template>
  <div class="style-c">
    <div v-if="!loaded" class="loading">加载中...</div>

    <template v-else>
      <!-- ═══ HOME ═══ -->
      <div v-if="currentView === 'home'" class="bento-grid">
        <!-- Row 1: Featured (2col×2row) + About + Stats -->
        <article
          v-if="featuredPost"
          class="bento-card card-latest"
          @click="openPost(featuredPost)"
        >
          <span class="card-tag" :style="{ background: postTagColor(featuredPost) + '18', color: postTagColor(featuredPost) }">{{ postTagName(featuredPost) }}</span>
          <h2 class="card-title">{{ featuredPost.title }}</h2>
          <p class="card-summary">{{ featuredPost.summary }}</p>
          <div class="card-meta">
            <span>{{ formatDate(featuredPost.published_at) }}</span>
            <span class="dot" />
            <span>{{ featuredPost.read_time ?? '' }}</span>
          </div>
        </article>

        <div class="bento-card card-about" v-if="about">
          <div class="about-avatar">{{ about.avatar }}</div>
          <h3 class="about-name">{{ about.name }}</h3>
          <p class="about-bio">{{ about.bio }}</p>
          <div class="about-links">
            <a v-for="link in about.links" :key="link.label" :href="link.url" target="_blank">{{ link.label }}</a>
          </div>
        </div>

        <div class="bento-card card-stats">
          <div class="stat">
            <span class="stat-num">{{ stats.posts_count }}</span>
            <span class="stat-label">篇文章</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ projects.length }}</span>
            <span class="stat-label">个项目</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ stats.total_read_minutes }}</span>
            <span class="stat-label">分钟阅读</span>
          </div>
        </div>

        <!-- Row 2: Recent Articles + Recent Projects + Now -->
        <div class="bento-card card-list">
          <button class="list-header" @click="goTo('articles')">
            <h3 class="list-label">最近文章</h3>
            <span class="view-all">查看全部 →</span>
          </button>
          <button v-for="post in recentPosts" :key="post.id" class="list-row" @click="openPost(post)">
            <span class="list-title">{{ post.title }}</span>
            <span class="list-date">{{ formatDate(post.published_at) }}</span>
          </button>
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
          <div v-for="item in mediaItems" :key="item.id" class="media-row">
            <span class="media-icon">{{ mediaIcons[item.type] }}</span>
            <div class="media-info">
              <span class="media-title">{{ item.title }}</span>
              <span class="media-author">{{ item.author }}</span>
            </div>
          </div>
        </div>

        <!-- Row 3: Wide post card -->
        <article
          v-if="secondaryPost"
          class="bento-card card-post-wide"
          :style="{ '--c': postTagColor(secondaryPost) }"
          @click="openPost(secondaryPost)"
        >
          <div>
            <span class="card-tag" :style="{ background: postTagColor(secondaryPost) + '18', color: postTagColor(secondaryPost) }">{{ postTagName(secondaryPost) }}</span>
            <h3 class="card-title-sm">{{ secondaryPost.title }}</h3>
          </div>
          <div class="card-meta">
            <span>{{ formatDate(secondaryPost.published_at) }}</span>
            <span class="dot" />
            <span>{{ secondaryPost.read_time ?? '' }}</span>
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
          <button v-for="post in filteredPosts" :key="post.id" class="article-row" @click="openPost(post)">
            <div class="article-color" :style="{ background: postTagColor(post) }" />
            <div class="article-body">
              <div class="article-top">
                <h3 class="article-title">{{ post.title }}</h3>
                <span class="card-tag" :style="{ background: postTagColor(post) + '18', color: postTagColor(post) }">{{ postTagName(post) }}</span>
              </div>
              <p class="article-summary">{{ post.summary }}</p>
              <div class="card-meta">
                <span>{{ formatDateFull(post.published_at) }}</span>
                <span class="dot" />
                <span>{{ post.read_time }}阅读</span>
              </div>
            </div>
          </button>
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

      <footer class="site-footer">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026019804号</a>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 80px 0;
  color: var(--text-dim);
  font-size: 14px;
}

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
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  width: 100%;
  text-align: left;
  padding: 0;
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
/* Footer                              */
/* ═══════════════════════════════════ */

.site-footer {
  max-width: 960px;
  margin: 48px auto 0;
  padding: 24px 0 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
}

.site-footer a {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}

.site-footer a:hover {
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
