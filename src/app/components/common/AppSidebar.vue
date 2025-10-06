<template>
  <div>
    <!-- Mobile backdrop with blur -->
    <div
      v-if="open"
      @click="$emit('close')"
      class="fixed inset-0 z-30 bg-gray-900/20 backdrop-blur-sm lg:hidden"
    ></div>
    
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] glass glass-border transition-all duration-300',
        open ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-20 lg:translate-x-0'
      ]"
    >
      <div class="h-full py-6 overflow-y-auto scrollbar-thin" :class="open ? 'px-4' : 'px-2'">
        <!-- Navigation -->
        <nav class="space-y-1.5">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center py-3 rounded-xl transition-all duration-200 group relative"
            :class="[
              open ? 'px-3.5' : 'px-3 justify-center',
              isActive(item.path)
                ? 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 text-primary-700 dark:text-primary-300 shadow-inner-glow'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
            ]"
            :title="!open ? item.label : ''"
          >
            <!-- Icon with gradient on active -->
            <div class="relative flex-shrink-0">
              <component 
                :is="item.icon" 
                :class="[
                  'w-5 h-5 transition-all duration-200',
                  open ? 'mr-3' : '',
                  isActive(item.path) ? 'text-primary-600 dark:text-primary-400' : ''
                ]"
              />
              <!-- Active indicator dot -->
              <div 
                v-if="isActive(item.path)"
                class="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full animate-pulse"
              ></div>
            </div>
            
            <!-- Label and badge -->
            <div v-if="open" class="flex-1 flex items-center justify-between">
              <span class="font-medium text-sm">{{ item.label }}</span>
              <span
                v-if="item.badge"
                :class="[
                  'px-2 py-0.5 text-xs font-semibold rounded-full',
                  item.badgeClass || 'badge-primary'
                ]"
              >
                {{ item.badge }}
              </span>
            </div>
            
            <!-- Tooltip for collapsed sidebar -->
            <div
              v-if="!open"
              class="absolute left-16 px-3 py-2 ml-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl"
            >
              {{ item.label }}
              <span v-if="item.badge" class="ml-2 text-xs opacity-75">({{ item.badge }})</span>
              <!-- Tooltip arrow -->
              <div class="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
            </div>
          </router-link>
        </nav>
        
        <!-- Divider -->
        <div class="my-6 border-t border-gray-200/50 dark:border-gray-700/50"></div>
        
        <!-- Bottom section -->
        <div class="space-y-1.5">
          <!-- Settings link -->
          <router-link
            to="/settings"
            class="flex items-center py-3 rounded-xl transition-all duration-200 group"
            :class="[
              open ? 'px-3.5' : 'px-3 justify-center',
              $route.path === '/settings'
                ? 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            ]"
          >
            <CogIcon :class="['w-5 h-5', open ? 'mr-3' : '']" />
            <span v-if="open" class="font-medium text-sm">Settings</span>
          </router-link>
          
          <!-- Toggle Button (Desktop only) -->
          <button
            @click="$emit('toggle')"
            class="hidden lg:flex items-center py-3 rounded-xl transition-all duration-200 w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            :class="[
              open ? 'px-3.5 justify-start' : 'px-3 justify-center'
            ]"
            :title="open ? 'Collapse sidebar' : 'Expand sidebar'"
          >
            <svg 
              class="w-5 h-5 transition-transform duration-200"
              :class="[
                open ? 'mr-3' : '',
                open ? '' : 'rotate-180'
              ]"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            <span v-if="open" class="font-medium text-sm">Collapse</span>
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import {
  HomeIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  ChartBarIcon,
  CogIcon,
  TagIcon,
  BuildingStorefrontIcon,
  ArrowTrendingUpIcon,
  BuildingLibraryIcon
} from '@heroicons/vue/24/outline'

defineProps({
  open: Boolean
})

defineEmits(['close', 'toggle'])

const route = useRoute()

const menuItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: HomeIcon 
  },
  { 
    path: '/upload', 
    label: 'Upload CSV', 
    icon: CloudArrowUpIcon, 
    badge: 'AI', 
    badgeClass: 'bg-gradient-to-r from-primary-500 to-accent-500 text-white text-[10px]' 
  },
  { 
    path: '/settings/accounts', 
    label: 'Accounts', 
    icon: BuildingLibraryIcon,
    badge: 'New',
    badgeClass: 'bg-green-500 text-white text-[10px]'
  },
  { 
    path: '/transactions', 
    label: 'Transactions', 
    icon: CreditCardIcon 
  },
  { 
    path: '/analytics', 
    label: 'Analytics', 
    icon: ChartBarIcon 
  },
  { 
    path: '/analytics/categories', 
    label: 'Categories', 
    icon: TagIcon 
  },
  { 
    path: '/analytics/merchants', 
    label: 'Merchants', 
    icon: BuildingStorefrontIcon 
  },
  { 
    path: '/analytics/trends', 
    label: 'Trends', 
    icon: ArrowTrendingUpIcon 
  }
]

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path === path || route.path.startsWith(path + '/')
}
</script>