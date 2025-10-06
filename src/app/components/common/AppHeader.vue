<template>
  <header class="fixed top-0 left-0 right-0 z-40 glass glass-border">
    <div class="flex items-center justify-between h-16">
      <!-- Left side -->
      <div class="flex items-center">
        <!-- Mobile Menu Toggle -->
        <button
          @click="$emit('toggle-sidebar')"
          class="lg:hidden ml-4 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200"
          aria-label="Toggle sidebar"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <!-- Logo -->
        <div class="flex items-center ml-2 lg:ml-6">
          <!-- Animated gradient logo -->
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 rounded-xl blur-lg opacity-50 animate-pulse"></div>
            <div class="relative bg-gradient-to-r from-primary-600 to-accent-600 p-2 rounded-xl">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.81.45 1.61 1.67 1.61 1.16 0 1.6-.64 1.6-1.46 0-.84-.68-1.22-1.88-1.54-1.76-.43-3.08-1.11-3.08-3.08 0-1.86 1.43-2.98 3.16-3.29V5h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.63-1.63-1.63-1.01 0-1.46.54-1.46 1.34 0 .79.61 1.09 1.88 1.45 1.79.46 3.08 1.05 3.08 3.24 0 1.87-1.4 3.09-3.16 3.35z"/>
              </svg>
            </div>
          </div>
          <!-- Title and subtitle - hidden on mobile -->
          <div class="ml-3 hidden sm:block">
            <h1 class="text-lg font-display font-medium gradient-text">
              WhereMyMoneyGoes
            </h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">AI-Powered Finance Tracker</p>
          </div>
        </div>
      </div>
      
      <!-- Right side -->
      <div class="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4 md:px-6 lg:px-8">
        <!-- Quick Actions -->
        <div class="flex items-center space-x-1 sm:space-x-2">
          <!-- Account Selector -->
          <AccountSelector />
          
          <div class="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          
          <!-- AI Assistant Button -->
          <button
            @click="toggleAssistant"
            class="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 group"
            title="AI Assistant"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <svg class="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
            </svg>
            <span class="absolute top-0 right-0 w-2 h-2 bg-gradient-to-r from-primary-600 to-accent-600 rounded-full animate-pulse"></span>
          </button>
          
          <div class="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          
          <!-- Notifications -->
          <NotificationBell />
          
          <!-- User Menu -->
          <UserMenu />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import NotificationBell from './NotificationBell.vue'
import UserMenu from './UserMenu.vue'
import AccountSelector from './AccountSelector.vue'
import { useAssistantStore } from '../../stores/assistant'

defineEmits(['toggle-sidebar'])

const assistantStore = useAssistantStore()

function toggleAssistant() {
  assistantStore.toggleChat()
}
</script>