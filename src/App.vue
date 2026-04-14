<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import BlogHome from './components/BlogStyleC.vue'
import AppFrame from './components/AppFrame.vue'
import { findProjectBySlug } from './projects'

const pathname = ref(window.location.pathname)

const currentProject = computed(() => {
  const match = pathname.value.match(/^\/app\/([\w-]+)\/?$/)
  if (!match) return null
  return findProjectBySlug(match[1]) ?? null
})

function onPop() {
  pathname.value = window.location.pathname
}

onMounted(() => {
  window.addEventListener('popstate', onPop)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPop)
})
</script>

<template>
  <AppFrame v-if="currentProject" :project="currentProject" />
  <BlogHome v-else />
</template>
