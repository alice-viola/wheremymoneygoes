<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 group"
    >
      <div class="relative">
        <div class="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-105">
          {{ userInitials }}
        </div>
        <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
      </div>
      <span class="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ userName }}
      </span>
      <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" 
           :class="isOpen ? 'rotate-180' : ''"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <!-- Dropdown menu with glass effect -->
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        @click.outside="isOpen = false"
        class="absolute right-0 mt-2 w-64 glass glass-border rounded-2xl shadow-xl overflow-hidden"
      >
        <!-- User info header -->
        <div class="px-5 py-4 bg-gradient-to-r from-primary-500/5 to-accent-500/5">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
              {{ userInitials }}
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ userName }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ authStore.userEmail || 'user@example.com' }}</p>
            </div>
          </div>
        </div>
        
        <div class="p-2">
          <!-- Profile link -->
          <router-link
            to="/profile"
            @click="isOpen = false"
            class="flex items-center px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 group"
          >
            <UserIcon class="w-4 h-4 mr-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
            <span>My Profile</span>
          </router-link>
          
          <!-- Settings link -->
          <router-link
            to="/settings"
            @click="isOpen = false"
            class="flex items-center px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 group"
          >
            <CogIcon class="w-4 h-4 mr-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
            <span>Settings</span>
          </router-link>
          
          <div class="my-2 border-t border-gray-200/50 dark:border-gray-700/50"></div>
          
          <!-- Sign out -->
          <button
            @click="handleLogout"
            class="w-full flex items-center px-3 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50/50 dark:hover:bg-error-900/20 rounded-xl transition-all duration-200 group"
          >
            <ArrowRightOnRectangleIcon class="w-4 h-4 mr-3 transition-transform group-hover:translate-x-0.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { 
  CogIcon, 
  ArrowRightOnRectangleIcon,
  UserIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const isOpen = ref(false)

const userName = computed(() => {
  // Try to get username from auth store first
  if (authStore.username) {
    return authStore.username
  }
  // Fall back to email
  if (authStore.userEmail) {
    return authStore.userEmail.split('@')[0]
  }
  // Fall back to user store
  return userStore.currentUser?.name || 'User'
})

const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const handleLogout = async () => {
  isOpen.value = false
  await authStore.logout()
  router.push('/login')
}
</script>