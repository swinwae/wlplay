<!-- src/pages/admin/PostsList.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { adminApi, type AdminPost } from '../../api/admin'

const posts = ref<AdminPost[]>([])
const filter = ref<'all'|'draft'|'published'>('all')
const loading = ref(true)

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
