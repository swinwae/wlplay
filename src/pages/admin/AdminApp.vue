<!-- src/pages/admin/AdminApp.vue -->
<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">WLPlay 后台</div>
      <nav>
        <RouterLink to="/posts" class="nav-link" active-class="active">文章</RouterLink>
        <RouterLink to="/tags" class="nav-link" active-class="active">标签</RouterLink>
        <RouterLink to="/media" class="nav-link" active-class="active">在听在看</RouterLink>
        <RouterLink to="/about" class="nav-link" active-class="active">关于</RouterLink>
      </nav>
      <div class="footer">
        <a href="https://wlplay.cn" target="_blank">↗ 回主页</a>
      </div>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #FAFAF9;
  color: #1C1917;
  font-family: 'Work Sans', -apple-system, sans-serif;
}
.sidebar {
  width: 220px;
  border-right: 1px solid #E7E5E4;
  background: #FFFFFF;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}
.brand {
  font-family: 'Outfit', sans-serif;
  font-size: 16px; font-weight: 600;
  margin-bottom: 24px;
  padding: 0 8px;
}
nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-link {
  text-decoration: none;
  color: #57534E;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
}
.nav-link:hover { background: #F5F5F4; color: #1C1917; }
.nav-link.active { background: #1C1917; color: #fff; }
.footer { padding: 0 8px; font-size: 12px; }
.footer a { color: #78716C; text-decoration: none; }
.footer a:hover { color: #1C1917; }
.content { flex: 1; padding: 32px 40px; overflow-y: auto; }
</style>
