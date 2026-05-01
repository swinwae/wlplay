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
