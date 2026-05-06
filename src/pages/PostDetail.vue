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
