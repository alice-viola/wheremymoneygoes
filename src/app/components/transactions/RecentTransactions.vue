<template>
  <div>
    <div v-if="loading" class="p-6 space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div>
              <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div class="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
            </div>
          </div>
          <div class="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
    
    <div v-else-if="transactions.length === 0" class="p-6 text-center">
      <div class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-gray-500 dark:text-gray-400">No transactions yet</p>
      <router-link
        to="/upload"
        class="mt-4 inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >
        Upload your first CSV file →
      </router-link>
    </div>
    
    <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
      <div
        v-for="transaction in transactions"
        :key="transaction.id"
        class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
              :style="{ backgroundColor: getCategoryColor(transaction.category) }"
            >
              {{ getCategoryIcon(transaction.category) }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ transaction.merchantName || transaction.description }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ transaction.category }} • {{ formatDate(transaction.date) }}
              </p>
            </div>
          </div>
          
          <div class="text-right">
            <p
              class="text-sm font-semibold"
              :class="transaction.kind === '+' ? 'amount-positive' : 'amount-negative'"
            >
              {{ transaction.kind }}{{ formatCurrency(Math.abs(transaction.amount), transaction.currency) }}
            </p>
            <p
              v-if="transaction.confidence"
              class="text-xs text-gray-400 dark:text-gray-500"
            >
              {{ formatConfidence(transaction.confidence) }} confidence
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDate, formatCurrency, formatConfidence, getCategoryColor, truncateText } from '@/utils/formatters'
import { CATEGORIES } from '@/utils/constants'

defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const getCategoryIcon = (category) => {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat?.icon || '📦'
}
</script>
