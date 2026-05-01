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
