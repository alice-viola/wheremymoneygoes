<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center">
      <div class="w-32 h-32 mx-auto mb-8 text-gray-300 dark:text-gray-600">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h1 class="text-5xl font-light text-gray-700 dark:text-gray-300 mb-4">404</h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Oops! Page not found
      </p>
      <p class="text-gray-500 dark:text-gray-400 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <router-link
        to="/"
        class="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Back to Dashboard
      </router-link>
    </div>
  </div>
</template>

<script setup>
// Set minimal layout for 404 page
import { useRoute } from 'vue-router'
const route = useRoute()
route.meta.layout = 'minimal'
</script>
