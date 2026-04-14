<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Project } from '../projects'

const props = defineProps<{ project: Project }>()

const loading = ref(true)

function goHome() {
  window.history.pushState({}, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function openInNewTab() {
  window.open(props.project.path, '_blank')
}

function onIframeLoad() {
  loading.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') goHome()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="app-frame">
    <header class="top-bar">
      <div class="bar-left">
        <button class="icon-btn" title="返回首页 (ESC)" @click="goHome">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <nav class="breadcrumb">
          <button class="crumb-link" @click="goHome">WLPlay</button>
          <span class="sep">/</span>
          <span class="crumb-current" :style="{ color: project.color }">{{ project.name }}</span>
        </nav>
      </div>
      <div class="bar-right">
        <span class="hint">按 ESC 返回</span>
        <button class="icon-btn" title="在新窗口打开" @click="openInNewTab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>
    </header>

    <div v-if="loading" class="loader">
      <div class="loader-bar" />
    </div>

    <iframe
      class="content-frame"
      :src="project.path"
      :title="project.name"
      @load="onIframeLoad"
    />
  </div>
</template>

<style scoped>
.app-frame {
  position: fixed;
  inset: 0;
  background: #fafaf9;
  display: flex;
  flex-direction: column;
}

.top-bar {
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-family: 'Work Sans', -apple-system, sans-serif;
  z-index: 10;
}

.bar-left,
.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #57534E;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #1C1917;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
}

.crumb-link {
  background: none;
  border: none;
  color: #78716C;
  cursor: pointer;
  font: inherit;
  padding: 0;
  transition: color 0.15s;
}

.crumb-link:hover {
  color: #1C1917;
}

.sep {
  color: #D6D3D1;
}

.crumb-current {
  font-weight: 600;
}

.hint {
  font-size: 11px;
  color: #A8A29E;
  letter-spacing: 0.3px;
}

.loader {
  position: absolute;
  top: 44px;
  left: 0;
  right: 0;
  height: 2px;
  background: transparent;
  overflow: hidden;
  z-index: 5;
}

.loader-bar {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #7C3AED, transparent);
  animation: slide 1.2s ease-in-out infinite;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

.content-frame {
  flex: 1;
  width: 100%;
  border: none;
  display: block;
  background: #fff;
}

@media (max-width: 640px) {
  .hint { display: none; }
  .top-bar { padding: 0 12px; }
}
</style>
