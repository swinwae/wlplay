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

const SLUG_RE = /^[a-z0-9-]+$/
const validation = computed(() => {
  if (!form.value.title.trim()) return '标题不能为空'
  if (!form.value.slug.trim()) return 'slug 不能为空'
  if (!SLUG_RE.test(form.value.slug)) return 'slug 只能包含小写字母、数字、连字符'
  if (!form.value.summary.trim()) return '摘要不能为空'
  return ''
})
const canSave = computed(() => validation.value === '')

async function save(): Promise<AdminPost | null> {
  if (!canSave.value) {
    error.value = validation.value
    return null
  }
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
          <button class="btn-primary" :disabled="saving || !canSave" @click="save">保存草稿</button>
          <button v-if="status === 'draft'" :disabled="saving || !canSave" @click="publish">保存并发布</button>
          <button v-else :disabled="saving" @click="unpublish">撤回为草稿</button>
          <button :disabled="saving || !canSave" @click="feature">{{ isFeatured ? '取消置顶' : '设为置顶' }}</button>
          <button v-if="isEdit" class="danger" @click="remove">删除文章</button>
        </div>
        <div v-if="!canSave" class="hint">{{ validation }}</div>
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
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.hint { color: #92400E; font-size: 12px; padding: 8px 12px; background: #FEF3C7; border-radius: 8px; }
.error { color: #B91C1C; font-size: 13px; padding: 12px; background: #FEE2E2; border-radius: 8px; }
</style>
