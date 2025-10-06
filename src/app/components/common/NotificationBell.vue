<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="relative p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 group"
    >
      <BellIcon class="w-5 h-5 transition-transform group-hover:rotate-12" />
      <span
        v-if="unreadCount > 0"
        class="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-error-500 to-error-600 text-white text-[10px] font-bold rounded-full animate-pulse"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>
    
    <!-- Notifications dropdown with glass effect -->
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
        class="absolute right-0 mt-2 w-96 glass glass-border rounded-2xl shadow-xl overflow-hidden max-h-[500px] flex flex-col"
      >
        <!-- Header -->
        <div class="px-5 py-4 bg-gradient-to-r from-primary-500/5 to-accent-500/5 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-display font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!' }}
            </p>
          </div>
          <div v-if="notifications.length > 0" class="flex items-center space-x-2">
            <button
              @click="markAllAsRead"
              class="p-1.5 text-gray-400 hover:text-primary-500 transition-colors"
              title="Mark all as read"
            >
              <CheckIcon class="w-4 h-4" />
            </button>
            <button
              @click="clearAll"
              class="p-1.5 text-gray-400 hover:text-error-500 transition-colors"
              title="Clear all"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <!-- Notifications list -->
        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <!-- Empty state -->
          <div v-if="notifications.length === 0" class="p-12 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
              <BellSlashIcon class="w-8 h-8 text-gray-400" />
            </div>
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">No notifications yet</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">We'll notify you when something important happens</p>
          </div>
          
          <!-- Notifications -->
          <div v-else class="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors relative group"
              @click="handleNotificationClick(notification)"
            >
              <!-- Unread indicator -->
              <div v-if="!notification.read" class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-accent-500"></div>
              
              <div class="flex items-start" :class="!notification.read ? 'ml-2' : ''">
                <!-- Icon -->
                <div
                  class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  :class="getNotificationStyle(notification.type).background"
                >
                  <component :is="getNotificationIcon(notification.type)" 
                    class="w-5 h-5" 
                    :class="getNotificationStyle(notification.type).icon" />
                </div>
                
                <!-- Content -->
                <div class="ml-3 flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ notification.title }}
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center">
                    <ClockIcon class="w-3 h-3 mr-1" />
                    {{ formatTime(notification.timestamp) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div v-if="notifications.length > 3" class="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            class="text-sm font-medium gradient-text hover:opacity-80 transition-opacity"
          >
            View all notifications →
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import {
  BellIcon,
  BellSlashIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  SparklesIcon,
  CurrencyDollarIcon
} from '@heroicons/vue/24/solid'
import { formatDistanceToNow } from 'date-fns'

const appStore = useAppStore()
const isOpen = ref(false)

const notifications = computed(() => appStore.notifications)
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const getNotificationStyle = (type) => {
  const styles = {
    success: {
      background: 'bg-gradient-to-br from-success-100 to-success-200/50 dark:from-success-900/30 dark:to-success-800/20',
      icon: 'text-success-600 dark:text-success-400'
    },
    error: {
      background: 'bg-gradient-to-br from-error-100 to-error-200/50 dark:from-error-900/30 dark:to-error-800/20',
      icon: 'text-error-600 dark:text-error-400'
    },
    warning: {
      background: 'bg-gradient-to-br from-warning-100 to-warning-200/50 dark:from-warning-900/30 dark:to-warning-800/20',
      icon: 'text-warning-600 dark:text-warning-400'
    },
    info: {
      background: 'bg-gradient-to-br from-primary-100 to-primary-200/50 dark:from-primary-900/30 dark:to-primary-800/20',
      icon: 'text-primary-600 dark:text-primary-400'
    },
    ai: {
      background: 'bg-gradient-to-br from-primary-100 via-accent-100 to-primary-100 dark:from-primary-900/30 dark:via-accent-900/30 dark:to-primary-900/30',
      icon: 'text-primary-600 dark:text-primary-400'
    },
    transaction: {
      background: 'bg-gradient-to-br from-accent-100 to-accent-200/50 dark:from-accent-900/30 dark:to-accent-800/20',
      icon: 'text-accent-600 dark:text-accent-400'
    }
  }
  return styles[type] || styles.info
}

const getNotificationIcon = (type) => {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationCircleIcon,
    info: InformationCircleIcon,
    ai: SparklesIcon,
    transaction: CurrencyDollarIcon
  }
  return icons[type] || icons.info
}

const formatTime = (timestamp) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

const handleNotificationClick = (notification) => {
  if (!notification.read) {
    appStore.markNotificationAsRead(notification.id)
  }
  // Handle navigation if notification has a link
  if (notification.link) {
    // Navigate to link
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(n => {
    if (!n.read) {
      appStore.markNotificationAsRead(n.id)
    }
  })
}

const clearAll = () => {
  appStore.clearNotifications()
  isOpen.value = false
}
</script>