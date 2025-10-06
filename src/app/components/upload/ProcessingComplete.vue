<template>
  <div class="space-y-6">
    <!-- Success Message -->
    <div class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-6">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <CheckCircleIcon class="w-8 h-8 text-success-600 dark:text-success-400" />
        </div>
        <div class="ml-4">
          <h3 class="text-lg font-semibold text-success-900 dark:text-success-100">
            Processing Complete!
          </h3>
          <p class="mt-1 text-sm text-success-700 dark:text-success-300">
            Your CSV file has been successfully processed and categorized.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Statistics -->
    <div v-if="statistics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
        <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {{ formatNumber(statistics.total_transactions || 0) }}
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
        <p class="mt-1 text-2xl font-bold text-error-600 dark:text-error-400">
          {{ formatCurrency(statistics.total_spent || 0) }}
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
        <p class="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">
          {{ formatCurrency(statistics.total_income || 0) }}
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <p class="text-sm text-gray-500 dark:text-gray-400">Categories Found</p>
        <p class="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
          {{ statistics.unique_categories || 0 }}
        </p>
      </div>
    </div>
    
    <!-- Top Categories -->
    <div v-if="statistics?.top_categories" class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Top Categories
      </h3>
      <div class="space-y-3">
        <div
          v-for="category in statistics.top_categories.slice(0, 5)"
          :key="category.name"
          class="flex items-center justify-between"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: getCategoryColor(category.name) }"
            ></div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ category.name }}
            </span>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ category.count }} transactions
            </span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ formatCurrency(category.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-4">
      <button
        @click="$emit('view-transactions')"
        class="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        View Transactions
      </button>
      
      <button
        @click="$emit('upload-another')"
        class="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
      >
        Upload Another File
      </button>
    </div>
  </div>
</template>

<script setup>
import { CheckCircleIcon } from '@heroicons/vue/24/solid'
import { formatCurrency, formatNumber } from '@/utils/formatters'
import { CHART_COLORS } from '@/utils/constants'

defineProps({
  statistics: {
    type: Object,
    default: null
  }
})

defineEmits(['view-transactions', 'upload-another'])

const getCategoryColor = (category) => {
  const colors = Object.values(CHART_COLORS)
  const index = category.charCodeAt(0) % colors.length
  return colors[index]
}
</script>
