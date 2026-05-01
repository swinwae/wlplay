// src/router.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from './pages/Home.vue'
import PostDetail from './pages/PostDetail.vue'
import ProjectFrame from './pages/ProjectFrame.vue'
import AdminApp from './pages/admin/AdminApp.vue'
import PostsList from './pages/admin/PostsList.vue'
import PostEditor from './pages/admin/PostEditor.vue'
import TagsManager from './pages/admin/TagsManager.vue'
import MediaManager from './pages/admin/MediaManager.vue'
import AboutEditor from './pages/admin/AboutEditor.vue'

const isAdminHost = typeof window !== 'undefined' && window.location.hostname === 'admin.wlplay.cn'

const publicRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/post/:slug', name: 'post-detail', component: PostDetail, props: true },
  { path: '/app/:slug', name: 'project', component: ProjectFrame, props: true },
]

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/', component: AdminApp,
    children: [
      { path: '', redirect: '/posts' },
      { path: 'posts', name: 'posts', component: PostsList },
      { path: 'posts/new', name: 'post-new', component: PostEditor },
      { path: 'posts/:id', name: 'post-edit', component: PostEditor, props: true },
      { path: 'tags', name: 'tags', component: TagsManager },
      { path: 'media', name: 'media', component: MediaManager },
      { path: 'about', name: 'about', component: AboutEditor },
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes: isAdminHost ? adminRoutes : publicRoutes,
})
