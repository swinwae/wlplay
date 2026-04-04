<script setup lang="ts">
import BlogHome from './components/BlogStyleC.vue'

function navigateTab(tabId: string) {
  // TODO: 后续接入项目页面跳转
  console.log('navigate to', tabId)
}
</script>

<template>
  <BlogHome @navigate-tab="navigateTab" />
</template>
