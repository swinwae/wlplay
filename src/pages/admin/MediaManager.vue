<!-- src/pages/admin/MediaManager.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi, type AdminMedia } from '../../api/admin'

const items = ref<AdminMedia[]>([])
const editing = ref<Partial<AdminMedia> & { id?: number }>({})
const showForm = ref(false)
const error = ref('')

const canSave = computed(() =>
  Boolean(editing.value.title?.trim()) && Boolean(editing.value.author?.trim())
)

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
  if (!canSave.value) {
    error.value = '标题和作者不能为空'
    return
  }
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
        <button class="btn-primary" :disabled="!canSave" @click="save">保存</button>
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
.form-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
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
