<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import DefaultLayout from './layouts/default.vue'
import MinimalLayout from './layouts/minimal.vue'
import AuthLayout from './layouts/auth.vue'

const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()

// Initialize theme on app mount
onMounted(() => {
  appStore.initTheme()
})

const layout = computed(() => {
  // Use auth layout for login/signup pages
  if (route.meta.layout === 'auth') {
    return AuthLayout
  }
  
  // Use minimal layout if specified
  if (route.meta.layout === 'minimal') {
    return MinimalLayout
  }
  
  // Default layout for authenticated pages
  return DefaultLayout
})
</script>
