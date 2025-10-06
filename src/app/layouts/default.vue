<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
    
    <!-- Sidebar -->
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" @toggle="sidebarOpen = !sidebarOpen" />
    
    <!-- Main Content -->
    <main 
      class="transition-all duration-300"
      :class="sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'"
    >
      <div class="pt-24 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 pb-8">
        <div class="max-w-[1600px] mx-auto">
          <slot />
        </div>
      </div>
    </main>
    
    <!-- AI Assistant Chat Panel -->
    <ChatPanel 
      :is-open="assistantStore.isOpen" 
      @close="assistantStore.closeChat()" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from '../components/common/AppHeader.vue'
import AppSidebar from '../components/common/AppSidebar.vue'
import ChatPanel from '../components/assistant/ChatPanel.vue'
import { useAssistantStore } from '../stores/assistant'

// Check if we're on mobile and set sidebar state accordingly
const sidebarOpen = ref(true)
const assistantStore = useAssistantStore()

onMounted(() => {
  // Close sidebar by default on mobile
  if (window.innerWidth < 1024) {
    sidebarOpen.value = false
  }
  
  // Listen for window resize to handle responsive behavior
  const handleResize = () => {
    if (window.innerWidth < 1024) {
      sidebarOpen.value = false
    }
  }
  
  window.addEventListener('resize', handleResize)
  
  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize)
  }
})
</script>
