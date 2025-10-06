<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-30"></div>
    
    <!-- Page Header with glass effect -->
    <div class="relative flex items-center justify-between card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Welcome back! Here's your AI-powered financial overview
        </p>
      </div>
      
      <router-link
        to="/upload"
        class="btn btn-primary flex items-center space-x-2 group"
      >
        <CloudArrowUpIcon class="w-5 h-5 transition-transform group-hover:scale-110" />
        <span>Upload CSV</span>
        <SparklesIcon class="w-4 h-4 opacity-75" />
      </router-link>
    </div>
    
    <!-- Summary Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Balance"
        :value="formatCurrency(summary?.netBalance || 0)"
        :trend="balanceTrend"
        icon="wallet"
        color="primary"
        :progress="65"
      />
      
      <SummaryCard
        title="Total Income"
        :value="formatCurrency(summary?.totalIncome || 0)"
        :trend="{ ...incomeTrend, showInline: true }"
        icon="arrow-down"
        color="success"
      />
      
      <SummaryCard
        title="Total Expenses"
        :value="formatCurrency(summary?.totalSpent || 0)"
        :trend="{ ...expenseTrend, showInline: true }"
        icon="arrow-up"
        color="error"
      />
      
      <SummaryCard
        title="Transactions"
        :value="formatNumber(summary?.totalTransactions || 0)"
        subtitle="This month"
        icon="bolt"
        color="accent"
        action="View all"
        @action="$router.push('/transactions')"
      />
    </div>
    
    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Spending by Category -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
              Spending by Category
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              AI-categorized transactions
            </p>
          </div>
          <router-link
            to="/analytics/categories"
            class="text-sm font-medium gradient-text hover:opacity-80 transition-opacity"
          >
            View all →
          </router-link>
        </div>
        <CategoryPieChart
          v-if="categoryChartData"
          :data="categoryChartData"
          :height="320"
        />
        <div v-else class="h-[320px] flex flex-col items-center justify-center text-gray-400">
          <ChartBarIcon class="w-12 h-12 mb-3 opacity-20" />
          <p>No data available</p>
        </div>
      </div>
      
      <!-- Monthly Trend -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
              Monthly Trend
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Income vs Expenses over time
            </p>
          </div>
          <router-link
            to="/analytics/trends"
            class="text-sm font-medium gradient-text hover:opacity-80 transition-opacity"
          >
            View details →
          </router-link>
        </div>
        <StepLineChart
          v-if="trendChartData"
          :data="trendChartData"
          :height="320"
          :fillArea="true"
        />
        <div v-else class="h-[320px] flex flex-col items-center justify-center text-gray-400">
          <ArrowTrendingUpIcon class="w-12 h-12 mb-3 opacity-20" />
          <p>No trend data available</p>
        </div>
      </div>
    </div>
    
    <!-- Bottom Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Transactions -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Latest financial activities
            </p>
          </div>
          <router-link
            to="/transactions"
            class="text-sm font-medium gradient-text hover:opacity-80 transition-opacity"
          >
            View all →
          </router-link>
        </div>
        <RecentTransactions :transactions="recentTransactions" :loading="isLoadingTransactions" />
      </div>
      
      <!-- Top Merchants -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
              Top Merchants
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Where you spend the most
            </p>
          </div>
          <router-link
            to="/analytics/merchants"
            class="text-sm font-medium gradient-text hover:opacity-80 transition-opacity"
          >
            View all →
          </router-link>
        </div>
        <TopMerchantsList :merchants="topMerchants" :loading="isLoadingMerchants" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useTransactionsStore } from '@/stores/transactions'
import { useUserStore } from '@/stores/user'
import { formatCurrency, formatNumber } from '@/utils/formatters'
import SummaryCard from '@/components/analytics/SummaryCard.vue'
import CategoryPieChart from '@/components/analytics/CategoryPieChart.vue'
import TrendLineChart from '@/components/analytics/TrendLineChart.vue'
import StepLineChart from '@/components/analytics/StepLineChart.vue'
import RecentTransactions from '@/components/transactions/RecentTransactions.vue'
import TopMerchantsList from '@/components/analytics/TopMerchantsList.vue'
import { 
  CloudArrowUpIcon, 
  SparklesIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon 
} from '@heroicons/vue/24/outline'

const analyticsStore = useAnalyticsStore()
const transactionsStore = useTransactionsStore()
const userStore = useUserStore()

const summary = computed(() => analyticsStore.summary)
const categoryChartData = computed(() => analyticsStore.categoryChartData)
const trendChartData = computed(() => analyticsStore.trendChartData)
const recentTransactions = computed(() => transactionsStore.recentTransactions)
const topMerchants = computed(() => analyticsStore.topMerchants)
const isLoadingTransactions = computed(() => transactionsStore.isLoading)
const isLoadingMerchants = computed(() => analyticsStore.isLoading)

// Mock trend data for demo
const balanceTrend = ref({
  value: 12.5,
  isPositive: true,
  label: 'vs last month'
})

const incomeTrend = ref({
  value: 8.2,
  isPositive: true,
  label: 'vs last month'
})

const expenseTrend = ref({
  value: 3.4,
  isPositive: false,
  label: 'vs last month'
})

const fetchDashboardData = async () => {
  await Promise.all([
    analyticsStore.fetchSummary(),
    analyticsStore.fetchCategories(),
    analyticsStore.fetchTrends(),
    analyticsStore.fetchMerchants({ limit: 5 }),
    transactionsStore.fetchTransactions({ limit: 10 })
  ])
}

// Handle account changes
const handleAccountChange = async (event) => {
  // Data will be automatically refreshed by the accounts store
  // But we can add additional logic here if needed
  console.log('Account changed to:', event.detail.accountId)
}

onMounted(async () => {
  await fetchDashboardData()
  
  // Listen for account changes
  window.addEventListener('account-changed', handleAccountChange)
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('account-changed', handleAccountChange)
})
</script>