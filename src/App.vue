<script setup lang="ts">
import { ref, computed } from 'vue'

interface Tab {
  id: string
  label: string
  icon: string
  path: string
  desc: string
}

const tabs: Tab[] = [
  {
    id: 'claude-learn',
    label: 'Claude Learn',
    icon: '&#xe002;',
    path: '/claude-learn/',
    desc: 'Claude Code 学习站',
  },
  {
    id: 'ecc-explorer',
    label: 'ECC Explorer',
    icon: '&#xe003;',
    path: '/ecc-explorer/',
    desc: 'ECC 可视化学习器',
  },
  {
    id: 'superpowers',
    label: 'Superpowers',
    icon: '&#xe004;',
    path: '/superpowers-explorer/',
    desc: 'Superpowers 探索器',
  },
]

const activeId = ref(tabs[0].id)

const activeTab = computed(() => tabs.find((t) => t.id === activeId.value)!)

function selectTab(id: string) {
  activeId.value = id
}
</script>

<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">W</span>
          <span class="logo-text">WLPlay</span>
        </div>
        <span class="logo-tag">Lab</span>
      </div>

      <nav class="nav">
        <div class="nav-label">Projects</div>
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['nav-item', { active: activeId === tab.id }]"
          @click="selectTab(tab.id)"
        >
          <span class="nav-dot" />
          <div class="nav-content">
            <span class="nav-title">{{ tab.label }}</span>
            <span class="nav-desc">{{ tab.desc }}</span>
          </div>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="status-dot" />
        <span class="status-text">All systems online</span>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main">
      <div class="topbar">
        <span class="breadcrumb">
          <span class="bc-root">~</span>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ activeTab.label }}</span>
        </span>
        <span class="topbar-desc">{{ activeTab.desc }}</span>
      </div>

      <div class="iframe-wrap">
        <iframe
          v-for="tab in tabs"
          :key="tab.id"
          :src="tab.path"
          :class="['content-frame', { visible: activeId === tab.id }]"
          :title="tab.label"
          frameborder="0"
          allow="clipboard-write"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background: var(--bg);
}

/* ─── Sidebar ─── */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}

.logo-text {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-bright);
  letter-spacing: -0.3px;
}

.logo-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  color: var(--green);
  background: rgba(63, 185, 80, 0.1);
  border: 1px solid rgba(63, 185, 80, 0.2);
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* ─── Nav ─── */
.nav {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
}

.nav-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding: 4px 10px 10px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
  font-family: inherit;
}

.nav-item:hover {
  background: var(--bg3);
}

.nav-item.active {
  background: var(--accent-glow);
  color: var(--text-bright);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 8px var(--accent);
}

.nav-dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  margin-top: 5px;
  transition: all 0.2s ease;
}

.nav-item.active .nav-dot {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.nav-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nav-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
}

.nav-desc {
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item.active .nav-desc {
  color: rgba(88, 166, 255, 0.6);
}

/* ─── Sidebar Footer ─── */
.sidebar-footer {
  padding: 14px 18px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 11px;
  color: var(--text-dim);
  font-family: 'JetBrains Mono', monospace;
}

/* ─── Main ─── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  height: var(--topbar-h);
  min-height: var(--topbar-h);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}

.breadcrumb {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bc-root {
  color: var(--text-dim);
}

.bc-sep {
  color: var(--border);
}

.bc-current {
  color: var(--accent);
  font-weight: 500;
}

.topbar-desc {
  font-size: 12px;
  color: var(--text-dim);
}

/* ─── Iframe ─── */
.iframe-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.content-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: var(--bg);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.content-frame.visible {
  opacity: 1;
  pointer-events: auto;
}
</style>
