<!-- src/pages/ProjectFrame.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppFrame from '../components/AppFrame.vue'
import { findProjectBySlug } from '../projects'

const route = useRoute()
const router = useRouter()

const project = computed(() => {
  const slug = String(route.params.slug)
  return findProjectBySlug(slug)
})

if (!project.value) router.replace('/')
</script>

<template>
  <AppFrame v-if="project" :project="project" />
</template>
