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
  if (editor.value && v !== editor.value.getHTML()) editor.value.commands.setContent(v, { emitUpdate: false })
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
