<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-30"></div>
    
    <!-- Page Header with glass effect -->
    <div class="relative flex items-center justify-between card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Category Analysis
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Detailed breakdown of your spending by category
        </p>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- Date Range Picker -->
        <DatePicker
          v-model="dateRange"
          mode="range"
          placeholder="Select date range"
          :show-quick-selections="true"
          @change="handleDateChange"
        />
        
        <!-- Transaction Type Toggle -->
        <div class="flex rounded-lg border border-gray-300 dark:border-gray-600">
          <button
            @click="transactionKind = '-'; saveFiltersToStorage(); fetchData()"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors',
              transactionKind === '-'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            ]"
            class="rounded-l-lg"
          >
            Expenses
          </button>
          <button
            @click="transactionKind = '+'; saveFiltersToStorage(); fetchData()"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors',
              transactionKind === '+'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            ]"
            class="rounded-r-lg"
          >
            Income
          </button>
        </div>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Categories</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ categories.length }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Total {{ transactionKind === '+' ? 'Income' : 'Spent' }}
        </p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(totalAmount) }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Top Category</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ topCategory?.category || 'N/A' }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ topCategory ? formatCurrency(topCategory.totalAmount) : '' }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Avg per Category</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(avgPerCategory) }}
        </p>
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Pie Chart -->
      <div class="card p-6">
        <h2 class="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">
          Distribution
        </h2>
        <CategoryPieChart
          v-if="categoryChartData"
          :data="categoryChartData"
          :height="350"
        />
        <div v-else-if="loading" class="h-[350px] flex items-center justify-center">
          <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        </div>
        <div v-else class="h-[350px] flex items-center justify-center text-gray-400">
          <p>No data available</p>
        </div>
      </div>
      
      <!-- Bar Chart -->
    <div class="card p-6">
        <h2 class="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">
          Top Categories
        </h2>
        <div v-if="categories.length > 0" class="space-y-3">
          <div
            v-for="(category, index) in categories.slice(0, 8)"
            :key="category.category"
            class="relative"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ category.category }}
              </span>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatCurrency(category.totalAmount) }}
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-500"
                :style="{
                  width: `${(category.totalAmount / maxAmount) * 100}%`,
                  backgroundColor: getCategoryColor(category.category)
                }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ category.transactionCount }} transactions • {{ category.percentage }}%
            </p>
          </div>
        </div>
        <div v-else-if="loading" class="h-[350px] flex items-center justify-center">
          <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        </div>
        <div v-else class="h-[350px] flex items-center justify-center text-gray-400">
          <p>No data available</p>
        </div>
      </div>
    </div>
    
    <!-- Detailed Table -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-base font-medium text-gray-700 dark:text-gray-300">
          Detailed Breakdown
        </h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Transactions
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Total Amount
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Average
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Min
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Max
              </th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            <tr v-if="loading">
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="relative">
                    <div class="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                    <div class="absolute top-0 left-0 w-16 h-16 border-4 border-primary-500 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Loading categories...</p>
                </div>
              </td>
            </tr>
            
            <tr v-else-if="categories.length === 0">
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">No categories found</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Try adjusting your filters or upload new data</p>
                  </div>
                </div>
              </td>
            </tr>
            
            <tr
              v-else
              v-for="category in categories"
              :key="category.category"
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
              @click="viewCategoryDetails(category)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div
                    class="w-3 h-3 rounded-full mr-3"
                    :style="{ backgroundColor: getCategoryColor(category.category) }"
                  ></div>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ category.category }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ category.transactionCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(category.totalAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ formatCurrency(category.avgAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ formatCurrency(category.minAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ formatCurrency(category.maxAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ category.percentage }}%
                  </span>
                  <div class="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      class="h-2 rounded-full"
                      :style="{
                        width: `${category.percentage}%`,
                        backgroundColor: getCategoryColor(category.category)
                      }"
                    ></div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAnalyticsStore } from '@/stores/analytics'
import { formatCurrency, getCategoryColor } from '@/utils/formatters'
import CategoryPieChart from '@/components/analytics/CategoryPieChart.vue'
import DatePicker from '@/components/filters/DatePicker.vue'
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const analyticsStore = useAnalyticsStore()

const loading = ref(false)
const dateRange = ref(null)
const transactionKind = ref('-') // '-' for expenses, '+' for income
const categories = ref([])

// Storage key for filters
const FILTER_STORAGE_KEY = 'analytics_categories_filters'

// Computed properties
const totalAmount = computed(() => {
  return categories.value.reduce((sum, cat) => sum + cat.totalAmount, 0)
})

const topCategory = computed(() => {
  return categories.value.length > 0 ? categories.value[0] : null
})

const avgPerCategory = computed(() => {
  if (categories.value.length === 0) return 0
  return totalAmount.value / categories.value.length
})

const maxAmount = computed(() => {
  return Math.max(...categories.value.map(c => c.totalAmount), 0)
})

const categoryChartData = computed(() => {
  if (!categories.value.length) return null
  
  // Take top 10 categories for the pie chart
  const topCategories = categories.value.slice(0, 10)
  
  return {
    labels: topCategories.map(c => c.category),
    datasets: [{
      label: transactionKind.value === '+' ? 'Income' : 'Expenses',
      data: topCategories.map(c => c.totalAmount),
      backgroundColor: topCategories.map(c => getCategoryColor(c.category)),
      borderWidth: 0
    }]
  }
})

// Methods
const handleDateChange = (range) => {
  if (range?.start && range?.end) {
    saveFiltersToStorage()
    fetchData()
  }
}

// Save filters to sessionStorage
const saveFiltersToStorage = () => {
  const filters = {
    dateRange: dateRange.value,
    transactionKind: transactionKind.value
  }
  sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

// Load filters from sessionStorage
const loadFiltersFromStorage = () => {
  const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
  if (stored) {
    try {
      const filters = JSON.parse(stored)
      dateRange.value = filters.dateRange || null
      transactionKind.value = filters.transactionKind || '-'
      
      // Convert date strings back to Date objects if needed
      if (dateRange.value?.start) {
        dateRange.value.start = new Date(dateRange.value.start)
      }
      if (dateRange.value?.end) {
        dateRange.value.end = new Date(dateRange.value.end)
      }
    } catch (error) {
      console.error('Error loading filters from storage:', error)
    }
  }
}

const fetchData = async () => {
  loading.value = true
  
  try {
    const params = {
      kind: transactionKind.value
    }
    
    // Use custom date range if selected
    if (dateRange.value?.start && dateRange.value?.end) {
      params.startDate = new Date(dateRange.value.start).toISOString().split('T')[0]
      params.endDate = new Date(dateRange.value.end).toISOString().split('T')[0]
    } else {
      // Default to last month
      const now = new Date()
      params.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      params.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    }
    
    const response = await analyticsStore.fetchCategories( params, true)
    categories.value = response || []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    toast.error('Failed to load category data')
  } finally {
    loading.value = false
  }
}

const viewCategoryDetails = (category) => {
  // Navigate to transactions page with category filter
  router.push({
    path: '/transactions',
    query: {
      category: category.category,
      kind: transactionKind.value
    }
  })
}

onMounted(() => {
  // Load saved filters first
  loadFiltersFromStorage()
  fetchData()
})
</script>
