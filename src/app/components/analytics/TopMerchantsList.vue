<template>
  <div>
    <div v-if="loading" class="p-6 space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="flex items-center justify-between">
          <div>
            <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
          </div>
          <div class="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
    
    <div v-else-if="merchants.length === 0" class="p-6 text-center">
      <div class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p class="text-gray-500 dark:text-gray-400">No merchants found</p>
    </div>
    
    <div v-else class="p-6 space-y-4">
      <div
        v-for="(merchant, index) in merchants"
        :key="merchant.merchantName"
        class="flex items-center justify-between"
      >
        <div class="flex items-center space-x-3">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            :class="getIndexClass(index)"
          >
            {{ index + 1 }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ merchant.merchantName }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ merchant.visitCount }} visits
            </p>
          </div>
        </div>
        
        <div class="text-right">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ formatCurrency(merchant.totalSpent) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            avg {{ formatCurrency(merchant.avgAmount) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatCurrency } from '@/utils/formatters'

defineProps({
  merchants: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const getIndexClass = (index) => {
  const classes = [
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500'
  ]
  return classes[index] || classes[4]
}
</script>
