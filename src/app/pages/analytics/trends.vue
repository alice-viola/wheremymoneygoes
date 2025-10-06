<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-30"></div>
    
    <!-- Page Header with glass effect -->
    <div class="relative flex items-center justify-between card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Spending Trends
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Analyze your financial patterns over time
        </p>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- Period Granularity -->
        <select
          v-model="periodType"
          @change="fetchData"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
        
        <!-- Time Range -->
        <select
          v-model="selectedRange"
          @change="fetchData"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 3 Months</option>
          <option value="180d">Last 6 Months</option>
          <option value="1y">Last Year</option>
          <option value="all">All Time</option>
        </select>
      </div>
    </div>
    
    <!-- Filter Controls -->
    <div class="card p-4 overflow-visible">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Merchant and Category Selector -->
        <div class="lg:col-span-2">
          <MerchantCategorySelector
            v-model:model-category="selectedCategory"
            v-model:model-merchant="selectedMerchant"
            category-placeholder="All Categories"
            merchant-placeholder="All Merchants"
            :show-quick-actions="true"
            @change="handleFilterChange"
          />
        </div>
        
        <!-- Date Range Picker -->
        <div>
          <DatePicker
            v-model="customDateRange"
            mode="range"
            label="Custom Date Range"
            placeholder="Select dates"
            :show-quick-selections="true"
            @change="handleDateRangeChange"
          />
        </div>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Current Period</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(currentPeriodTotal) }}
        </p>
        <p class="text-xs mt-1" :class="periodChangeClass">
          {{ periodChangeText }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Average Spending</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(avgSpending) }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          per {{ periodType }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Highest Spending</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(maxSpending) }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ maxSpendingPeriod }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Net Cash Flow</p>
        <p class="text-2xl font-semibold mt-1" :class="netFlowClass">
          {{ formatCurrency(totalNetFlow) }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ selectedRange === 'all' ? 'All time' : 'Selected period' }}
        </p>
      </div>
    </div>
    
    <!-- Main Trend Chart -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-medium text-gray-700 dark:text-gray-300">
          Income vs Expenses
        </h2>
        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="showIncome"
              @change="updateChart"
              class="rounded border-gray-300 text-success-600 focus:ring-success-500"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Income</span>
          </label>
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="showExpenses"
              @change="updateChart"
              class="rounded border-gray-300 text-error-600 focus:ring-error-500"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Expenses</span>
          </label>
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="showNetFlow"
              @change="updateChart"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Net Flow</span>
          </label>
        </div>
      </div>
      
      <TrendLineChart
        v-if="chartData"
        :key="`chart-${selectedCategory}-${selectedMerchant}-${trends.length}`"
        :data="chartData"
        :height="400"
      />
      <div v-else-if="loading" class="h-[400px] flex items-center justify-center">
        <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
      <div v-else class="h-[400px] flex items-center justify-center text-gray-400">
        <p>No data available</p>
      </div>
    </div>
    
    <!-- Category Trends -->
    <div class="card p-6">
      <h2 class="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">
        Category Trends
      </h2>
      
      <div v-if="categoryTrends.length > 0" class="space-y-4">
        <div
          v-for="category in topCategoryTrends"
          :key="category.name"
          class="border-l-4 pl-4 py-2"
          :style="{ borderColor: getCategoryColor(category.name) }"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">
              {{ category.name }}
            </h3>
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(category.total) }}
              </p>
              <p class="text-xs" :class="category.trend > 0 ? 'text-error-600' : 'text-success-600'">
                {{ category.trend > 0 ? '+' : '' }}{{ category.trend.toFixed(1) }}%
              </p>
            </div>
          </div>
          
          <!-- Mini sparkline -->
          <div class="h-12 flex items-end space-x-1">
            <div
              v-for="(value, index) in category.sparkline"
              :key="index"
              class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t"
              :style="{
                height: `${(value / category.maxValue) * 100}%`,
                backgroundColor: getCategoryColor(category.name) + '40'
              }"
            ></div>
          </div>
        </div>
      </div>
      <div v-else-if="loading" class="flex justify-center py-8">
        <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
      <div v-else class="text-center py-8 text-gray-400">
        <p>No category trend data available</p>
      </div>
    </div>
    
    <!-- Detailed Data Table -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-base font-medium text-gray-700 dark:text-gray-300">
          Period Breakdown
        </h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Period
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Income
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Expenses
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Net Flow
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Transactions
              </th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Change
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="relative">
                    <div class="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                    <div class="absolute top-0 left-0 w-16 h-16 border-4 border-primary-500 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Loading trends...</p>
                </div>
              </td>
            </tr>
            
            <tr v-else-if="trends.length === 0">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">No trend data available</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Try adjusting your filters or upload new data</p>
                  </div>
                </div>
              </td>
            </tr>
            
            <tr
              v-else
              v-for="(trend, index) in trends"
              :key="trend.period"
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {{ formatPeriod(trend.period) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-success-600 dark:text-success-400">
                {{ formatCurrency(trend.income) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-error-600 dark:text-error-400">
                {{ formatCurrency(trend.expenses) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                  :class="trend.netFlow >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'">
                {{ formatCurrency(trend.netFlow) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ trend.totalTransactions }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  v-if="index > 0"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="getChangeClass(trend, trends[index - 1])"
                >
                  {{ getChangeText(trend, trends[index - 1]) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAnalyticsStore } from '@/stores/analytics'
import { formatCurrency, formatDate, getCategoryColor } from '@/utils/formatters'
import TrendLineChart from '@/components/analytics/TrendLineChart.vue'
import MerchantCategorySelector from '@/components/filters/MerchantCategorySelector.vue'
import DatePicker from '@/components/filters/DatePicker.vue'
import { useToast } from 'vue-toastification'

const toast = useToast()
const userStore = useUserStore()
const analyticsStore = useAnalyticsStore()

const loading = ref(false)
const periodType = ref('month')
const selectedRange = ref('90d')
const showIncome = ref(true)
const showExpenses = ref(true)
const showNetFlow = ref(false)
const trends = ref([])
const categoryTrends = ref([])
const selectedCategory = ref('')
const selectedMerchant = ref(null)
const customDateRange = ref(null)
const categories = ref([])
const merchants = ref([])

// Storage key for filters
const FILTER_STORAGE_KEY = 'analytics_trends_filters'

// Computed properties
const currentPeriodTotal = computed(() => {
  if (trends.value.length === 0) return 0
  return trends.value[trends.value.length - 1].expenses
})

const periodChange = computed(() => {
  if (trends.value.length < 2) return 0
  const current = trends.value[trends.value.length - 1].expenses
  const previous = trends.value[trends.value.length - 2].expenses
  return ((current - previous) / previous) * 100
})

const periodChangeText = computed(() => {
  if (periodChange.value === 0) return 'No change'
  const sign = periodChange.value > 0 ? '+' : ''
  return `${sign}${periodChange.value.toFixed(1)}% vs last ${periodType.value}`
})

const periodChangeClass = computed(() => {
  if (periodChange.value > 0) return 'text-error-600 dark:text-error-400'
  if (periodChange.value < 0) return 'text-success-600 dark:text-success-400'
  return 'text-gray-500 dark:text-gray-400'
})

const avgSpending = computed(() => {
  if (trends.value.length === 0) return 0
  const total = trends.value.reduce((sum, t) => sum + t.expenses, 0)
  return total / trends.value.length
})

const maxSpending = computed(() => {
  if (trends.value.length === 0) return 0
  return Math.max(...trends.value.map(t => t.expenses))
})

const maxSpendingPeriod = computed(() => {
  if (trends.value.length === 0) return ''
  const maxTrend = trends.value.find(t => t.expenses === maxSpending.value)
  return maxTrend ? formatPeriod(maxTrend.period) : ''
})

const totalNetFlow = computed(() => {
  return trends.value.reduce((sum, t) => sum + t.netFlow, 0)
})

const netFlowClass = computed(() => {
  if (totalNetFlow.value > 0) return 'text-success-600 dark:text-success-400'
  if (totalNetFlow.value < 0) return 'text-error-600 dark:text-error-400'
  return 'text-gray-900 dark:text-white'
})

const chartData = computed(() => {
  if (!trends.value.length) return null
  
  const datasets = []
  
  if (showIncome.value) {
    datasets.push({
      label: 'Income',
      data: trends.value.map(t => t.income),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4
    })
  }
  
  if (showExpenses.value) {
    datasets.push({
      label: 'Expenses',
      data: trends.value.map(t => t.expenses),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4
    })
  }
  
  if (showNetFlow.value) {
    datasets.push({
      label: 'Net Flow',
      data: trends.value.map(t => t.netFlow),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    })
  }
  
  return {
    labels: trends.value.map(t => formatPeriod(t.period)),
    datasets
  }
})

const topCategoryTrends = computed(() => {
  return categoryTrends.value.slice(0, 5)
})

// Methods
const fetchData = async () => {
  loading.value = true
  
  try {
    // Calculate date range
    const now = new Date()
    let startDate = null
    let endDate = now
    
    // Check if custom date range is selected
    if (customDateRange.value?.start && customDateRange.value?.end) {
      startDate = customDateRange.value.start
      endDate = customDateRange.value.end
    } else {
      switch (selectedRange.value) {
        case '30d':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 90)
          break
        case '180d':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 180)
          break
        case '1y':
          startDate = new Date()
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
        case 'all':
          startDate = null
          endDate = null
          break
      }
    }
    
    const params = {
      period: periodType.value
    }
    
    if (startDate) {
      params.startDate = startDate.toISOString().split('T')[0]
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split('T')[0]
    }
    
    // Add category and merchant filters
    if (selectedCategory.value) {
      params.category = selectedCategory.value
    }
    const merchantName = selectedMerchant.value?.name || selectedMerchant.value
    if (merchantName) {
      params.merchant = merchantName
    }
    
    const response = await analyticsStore.fetchTrends( params, true)
    trends.value = response || []
    
    // Log for debugging
    console.log('Fetched trends with params:', params)
    console.log('Received trends:', trends.value)
    
    // Generate mock category trends (would come from API)
    generateCategoryTrends()
  } catch (error) {
    console.error('Failed to fetch trends:', error)
    toast.error('Failed to load trend data')
  } finally {
    loading.value = false
  }
}

const generateCategoryTrends = () => {
  // This would normally come from the API
  const categories = ['Food & Dining', 'Shopping', 'Transportation', 'Utilities', 'Entertainment']
  
  categoryTrends.value = categories.map(cat => {
    const sparkline = trends.value.slice(-10).map(() => Math.random() * 100)
    const total = sparkline.reduce((sum, val) => sum + val, 0)
    const trend = (Math.random() - 0.5) * 20
    
    return {
      name: cat,
      total: total * 10,
      trend,
      sparkline,
      maxValue: Math.max(...sparkline)
    }
  })
}

const updateChart = () => {
  // Chart will reactively update via computed property
}

const formatPeriod = (period) => {
  if (periodType.value === 'day') {
    return formatDate(period, 'MMM d')
  } else if (periodType.value === 'week') {
    return `Week of ${formatDate(period, 'MMM d')}`
  } else if (periodType.value === 'month') {
    return formatDate(period, 'MMM yyyy')
  } else if (periodType.value === 'year') {
    return period.substring(0, 4)
  }
  return period
}

const getChangeClass = (current, previous) => {
  const change = ((current.expenses - previous.expenses) / previous.expenses) * 100
  if (change > 5) return 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
  if (change < -5) return 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

const getChangeText = (current, previous) => {
  const change = ((current.expenses - previous.expenses) / previous.expenses) * 100
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

// Watch for changes
watch([periodType, selectedRange], () => {
  fetchData()
})

const clearFilters = () => {
  selectedCategory.value = ''
  selectedMerchant.value = null
  customDateRange.value = null
  saveFiltersToStorage()
  fetchData()
}

const handleFilterChange = (filters) => {
  saveFiltersToStorage()
  fetchData()
}

const handleDateRangeChange = (range) => {
  if (range?.start && range?.end) {
    // Override the selected range with custom dates
    saveFiltersToStorage()
    fetchData()
  }
}

// Save filters to sessionStorage
const saveFiltersToStorage = () => {
  const filters = {
    selectedCategory: selectedCategory.value,
    selectedMerchant: selectedMerchant.value,
    customDateRange: customDateRange.value,
    periodType: periodType.value,
    selectedRange: selectedRange.value
  }
  sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

// Load filters from sessionStorage
const loadFiltersFromStorage = () => {
  const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
  if (stored) {
    try {
      const filters = JSON.parse(stored)
      selectedCategory.value = filters.selectedCategory || ''
      selectedMerchant.value = filters.selectedMerchant || null
      customDateRange.value = filters.customDateRange || null
      periodType.value = filters.periodType || 'month'
      selectedRange.value = filters.selectedRange || '90d'
      
      // Convert date strings back to Date objects if needed
      if (customDateRange.value?.start) {
        customDateRange.value.start = new Date(customDateRange.value.start)
      }
      if (customDateRange.value?.end) {
        customDateRange.value.end = new Date(customDateRange.value.end)
      }
    } catch (error) {
      console.error('Error loading filters from storage:', error)
    }
  }
}

const fetchCategories = async () => {
  try {
    const response = await analyticsStore.fetchCategories( { kind: '-' })
    if (response && Array.isArray(response)) {
      // The response is the categories array directly from the store
      categories.value = response.map(cat => cat.category)
    }
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const fetchMerchants = async () => {
  try {
    const response = await analyticsStore.fetchMerchants( { limit: 50 })
    if (response && Array.isArray(response)) {
      // The response is the merchants array directly
      merchants.value = response.map(m => ({
        name: m.merchantName || 'Unknown',
        ...m
      }))
    }
  } catch (error) {
    console.error('Failed to fetch merchants:', error)
  }
}

// Handle account changes
const handleAccountChange = async (event) => {
  console.log('Account changed in trends page to:', event.detail.accountId)
  await fetchData()
}

onMounted(async () => {
  // Load saved filters first
  loadFiltersFromStorage()
  
  await Promise.all([
    fetchData(),
    fetchCategories(),
    fetchMerchants()
  ])
  
  // Listen for account changes
  window.addEventListener('account-changed', handleAccountChange)
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('account-changed', handleAccountChange)
})
</script>
