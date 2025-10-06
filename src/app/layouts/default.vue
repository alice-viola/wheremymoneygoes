<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader />
    
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
import { ref } from 'vue'
import AppHeader from '../components/common/AppHeader.vue'
import AppSidebar from '../components/common/AppSidebar.vue'
import ChatPanel from '../components/assistant/ChatPanel.vue'
import { useAssistantStore } from '../stores/assistant'

const sidebarOpen = ref(true)
const assistantStore = useAssistantStore()
</script>
