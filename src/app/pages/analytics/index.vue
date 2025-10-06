<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-30"></div>
    
    <!-- Page Header with glass effect -->
    <div class="relative flex items-center justify-between card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Analytics Overview
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Comprehensive insights into your financial data
        </p>
      </div>
      
      <!-- Quick Period Filter -->
      <select
        v-model="selectedPeriod"
        @change="fetchData"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="quarter">Last 3 Months</option>
        <option value="year">This Year</option>
      </select>
    </div>
    
    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Balance</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {{ formatCurrency(summary?.netBalance || 0) }}
            </p>
          </div>
          <div class="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-full">
            <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="text-xs mt-2" :class="balanceTrendClass">
          {{ balanceTrendText }}
        </p>
      </div>
      
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Income</p>
            <p class="text-2xl font-semibold text-success-600 dark:text-success-400 mt-1">
              +{{ formatCurrency(summary?.totalIncome || 0) }}
            </p>
          </div>
          <div class="p-3 bg-success-100 dark:bg-success-900/20 rounded-full">
            <svg class="w-6 h-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        </div>
        <p class="text-xs mt-2 text-gray-500 dark:text-gray-400">
          {{ summary?.incomeCount || 0 }} transactions
        </p>
      </div>
      
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
            <p class="text-2xl font-semibold text-error-600 dark:text-error-400 mt-1">
              -{{ formatCurrency(summary?.totalSpent || 0) }}
            </p>
          </div>
          <div class="p-3 bg-error-100 dark:bg-error-900/20 rounded-full">
            <svg class="w-6 h-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        </div>
        <p class="text-xs mt-2 text-gray-500 dark:text-gray-400">
          {{ summary?.expenseCount || 0 }} transactions
        </p>
      </div>
      
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Avg Daily Spending</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {{ formatCurrency(avgDailySpending) }}
            </p>
          </div>
          <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <p class="text-xs mt-2 text-gray-500 dark:text-gray-400">
          Based on {{ daysInPeriod }} days
        </p>
      </div>
    </div>
    
    <!-- Interactive Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Category Distribution -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-medium text-gray-900 dark:text-white">
          Category Distribution
        </h2>
          <router-link
            to="/analytics/categories"
            class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            View details →
          </router-link>
        </div>
        
        <div v-if="categoryChartData" class="relative">
          <CategoryPieChart :data="categoryChartData" :height="300" />
          
          <!-- Category Legend -->
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div
              v-for="(cat, index) in topCategories"
              :key="cat.category"
              class="flex items-center space-x-2 text-sm"
            >
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: getCategoryColor(cat.category) }"
              ></div>
              <span class="text-gray-700 dark:text-gray-300 truncate">
                {{ cat.category }}
              </span>
              <span class="text-gray-500 dark:text-gray-400">
                ({{ cat.percentage }}%)
              </span>
            </div>
          </div>
        </div>
        <div v-else-if="loading" class="h-[300px] flex items-center justify-center">
          <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        </div>
        <div v-else class="h-[300px] flex items-center justify-center text-gray-400">
          <p>No data available</p>
        </div>
      </div>
      
      <!-- Monthly Trends -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-medium text-gray-900 dark:text-white">
            Spending Trends
        </h2>
          <router-link
            to="/analytics/trends"
            class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            View details →
          </router-link>
        </div>
        
        <div v-if="trendChartData" class="relative">
          <StepLineChart :data="trendChartData" :height="300" :fillArea="true" />
          
          <!-- Trend Summary -->
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div class="text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">Highest</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(maxMonthlySpending) }}
              </p>
            </div>
            <div class="text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">Lowest</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(minMonthlySpending) }}
              </p>
            </div>
          </div>
        </div>
        <div v-else-if="loading" class="h-[300px] flex items-center justify-center">
          <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        </div>
        <div v-else class="h-[300px] flex items-center justify-center text-gray-400">
          <p>No data available</p>
        </div>
      </div>
    </div>
    
    <!-- Top Spending Categories -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Top Categories -->
      <div class="card p-6">
        <h3 class="text-base font-medium text-gray-900 dark:text-white mb-4">
          Top Categories
        </h3>
        <div v-if="topCategories.length > 0" class="space-y-3">
          <div
            v-for="(cat, index) in topCategories.slice(0, 5)"
            :key="cat.category"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-3">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 w-4">
                {{ index + 1 }}
              </span>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ cat.category }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ cat.transactionCount }} transactions
                </p>
              </div>
            </div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(cat.totalAmount) }}
            </p>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          <p>No category data</p>
        </div>
      </div>
      
      <!-- Top Merchants -->
      <div class="card p-6">
        <h3 class="text-base font-medium text-gray-900 dark:text-white mb-4">
          Frequent Merchants
        </h3>
        <div v-if="topMerchants.length > 0" class="space-y-3">
          <div
            v-for="(merchant, index) in topMerchants.slice(0, 5)"
            :key="merchant.merchantName"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-3">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 w-4">
                {{ index + 1 }}
              </span>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ merchant.merchantName }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ merchant.visitCount }} visits
                </p>
              </div>
            </div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(merchant.totalSpent) }}
            </p>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          <p>No merchant data</p>
        </div>
      </div>
      
      <!-- Quick Stats -->
      <div class="card p-6">
        <h3 class="text-base font-medium text-gray-900 dark:text-white mb-4">
          Quick Stats
        </h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">Categories Used</span>
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ summary?.uniqueCategories || 0 }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">Unique Merchants</span>
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ uniqueMerchants }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">Avg Transaction</span>
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(summary?.avgExpense || 0) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">Data Period</span>
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ summary?.monthsWithData || 0 }} months
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">Total Transactions</span>
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ summary?.totalTransactions || 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAnalyticsStore } from '@/stores/analytics'
import { formatCurrency, getCategoryColor } from '@/utils/formatters'
import CategoryPieChart from '@/components/analytics/CategoryPieChart.vue'
import TrendLineChart from '@/components/analytics/TrendLineChart.vue'
import StepLineChart from '@/components/analytics/StepLineChart.vue'

const userStore = useUserStore()
const analyticsStore = useAnalyticsStore()

const loading = ref(false)
const selectedPeriod = ref('month')

// Direct store getters
const summary = computed(() => analyticsStore.summary)
const categoryChartData = computed(() => analyticsStore.categoryChartData)
const trendChartData = computed(() => analyticsStore.trendChartData)
const topCategories = computed(() => analyticsStore.categories.slice(0, 5))
const topMerchants = computed(() => analyticsStore.merchants.slice(0, 5))

// Calculated metrics
const avgDailySpending = computed(() => {
  if (!summary.value || daysInPeriod.value === 0) return 0
  return summary.value.totalSpent / daysInPeriod.value
})

const daysInPeriod = computed(() => {
  switch (selectedPeriod.value) {
    case 'week': return 7
    case 'month': return 30
    case 'quarter': return 90
    case 'year': return 365
    default: return 30
  }
})

const balanceTrendText = computed(() => {
  const trend = summary.value?.balanceTrend || 0
  if (trend > 0) return `+${trend.toFixed(1)}% vs last period`
  if (trend < 0) return `${trend.toFixed(1)}% vs last period`
  return 'No change'
})

const balanceTrendClass = computed(() => {
  const trend = summary.value?.balanceTrend || 0
  if (trend > 0) return 'text-success-600 dark:text-success-400'
  if (trend < 0) return 'text-error-600 dark:text-error-400'
  return 'text-gray-500 dark:text-gray-400'
})

const maxMonthlySpending = computed(() => {
  if (!analyticsStore.trends.length) return 0
  return Math.max(...analyticsStore.trends.map(t => t.expenses))
})

const minMonthlySpending = computed(() => {
  if (!analyticsStore.trends.length) return 0
  return Math.min(...analyticsStore.trends.map(t => t.expenses))
})

const uniqueMerchants = computed(() => {
  return analyticsStore.merchants.length
})

// Methods
const fetchData = async () => {
  loading.value = true
  
  try {
    // Calculate date range based on selected period
    const now = new Date()
    let startDate, endDate = now
    
    switch (selectedPeriod.value) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
    }
    
    const params = {}
    if (startDate) {
      params.startDate = startDate.toISOString().split('T')[0]
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split('T')[0]
    }
    
    // Fetch all data in parallel
  await Promise.all([
      analyticsStore.fetchSummary(params, true),
      analyticsStore.fetchCategories({ ...params, kind: '-' }, true),
      analyticsStore.fetchTrends({ ...params, period: 'month' }, true),
      analyticsStore.fetchMerchants({ ...params, limit: 10 }, true)
    ])
  } catch (error) {
    console.error('Failed to fetch analytics data:', error)
  } finally {
    loading.value = false
  }
}

// Handle account changes
const handleAccountChange = async (event) => {
  console.log('Account changed in analytics page to:', event.detail.accountId)
  await fetchData()
}

onMounted(() => {
  fetchData()
  
  // Listen for account changes
  window.addEventListener('account-changed', handleAccountChange)
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('account-changed', handleAccountChange)
})
</script>
