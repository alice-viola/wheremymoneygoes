<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-30"></div>
    
    <!-- Page Header with glass effect -->
    <div class="relative flex items-center justify-between card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Merchant Analysis
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Track your spending patterns by merchant
        </p>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- Time Period Filter -->
        <select
          v-model="selectedPeriod"
          @change="fetchData"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">Last 3 Months</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
        
        <!-- Search -->
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search merchants..."
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          @input="filterMerchants"
        />
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Merchants</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ merchants.length }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(totalSpent) }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Most Visited</p>
        <p class="text-lg font-semibold text-gray-900 dark:text-white mt-1">
          {{ topMerchant?.merchantName || 'N/A' }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ topMerchant ? `${topMerchant.visitCount} visits` : '' }}
        </p>
      </div>
      
      <div class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Avg per Merchant</p>
        <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(avgPerMerchant) }}
        </p>
      </div>
    </div>
    
    <!-- Top Merchants Grid -->
    <div class="card p-6">
      <h2 class="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">
        Top Merchants by Spending
      </h2>
      
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
      
      <div v-else-if="filteredMerchants.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        No merchants found
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="merchant in filteredMerchants.slice(0, 12)"
          :key="merchant.merchantName"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
          @click="viewMerchantDetails(merchant)"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">
                {{ merchant.merchantName }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ merchant.merchantType || 'Unknown Type' }}
              </p>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :style="{ 
                backgroundColor: getCategoryColor(merchant.categories?.[0] || 'Other') + '20',
                color: getCategoryColor(merchant.categories?.[0] || 'Other')
              }"
            >
              {{ merchant.categories?.[0] || 'Other' }}
            </span>
          </div>
          
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Total Spent</span>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(merchant.totalSpent) }}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Visits</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ merchant.visitCount }}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Avg per Visit</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(merchant.avgAmount) }}
              </span>
            </div>
            
            <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-500 dark:text-gray-400">Last Visit</span>
                <span class="text-xs text-gray-600 dark:text-gray-300">
                  {{ formatDate(merchant.lastVisit) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Detailed Table -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-base font-medium text-gray-700 dark:text-gray-300">
          All Merchants
        </h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50">
            <tr>
              <th 
                class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
                @click="sortBy('merchantName')"
              >
                <div class="flex items-center">
                  Merchant
                  <ChevronUpDownIcon class="ml-1 w-4 h-4" />
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th 
                class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
                @click="sortBy('visitCount')"
              >
                <div class="flex items-center justify-end">
                  Visits
                  <ChevronUpDownIcon class="ml-1 w-4 h-4" />
                </div>
              </th>
              <th 
                class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
                @click="sortBy('totalSpent')"
              >
                <div class="flex items-center justify-end">
                  Total Spent
                  <ChevronUpDownIcon class="ml-1 w-4 h-4" />
                </div>
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Average
              </th>
              <th 
                class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
                @click="sortBy('lastVisit')"
              >
                <div class="flex items-center justify-end">
                  Last Visit
                  <ChevronUpDownIcon class="ml-1 w-4 h-4" />
                </div>
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
                  <p class="text-sm text-gray-500 dark:text-gray-400">Loading merchants...</p>
                </div>
              </td>
            </tr>
            
            <tr v-else-if="paginatedMerchants.length === 0">
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">No merchants found</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Try adjusting your filters or upload new data</p>
                  </div>
                </div>
              </td>
            </tr>
            
            <tr
              v-else
              v-for="merchant in paginatedMerchants"
              :key="merchant.merchantName"
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
              @click="viewMerchantDetails(merchant)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ merchant.merchantName }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {{ merchant.merchantType || 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :style="{ 
                    backgroundColor: getCategoryColor(merchant.categories?.[0] || 'Other') + '20',
                    color: getCategoryColor(merchant.categories?.[0] || 'Other')
                  }"
                >
                  {{ merchant.categories?.[0] || 'Other' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ merchant.visitCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(merchant.totalSpent) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                {{ formatCurrency(merchant.avgAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                {{ formatDate(merchant.lastVisit) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredMerchants.length) }} of {{ filteredMerchants.length }} results
        </div>
        <div class="flex space-x-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Previous
          </button>
          <button
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline'
import { useUserStore } from '@/stores/user'
import { useAnalyticsStore } from '@/stores/analytics'
import { formatCurrency, formatDate, getCategoryColor } from '@/utils/formatters'
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const analyticsStore = useAnalyticsStore()

const loading = ref(false)
const selectedPeriod = ref('month')
const searchQuery = ref('')
const merchants = ref([])
const filteredMerchants = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const sortField = ref('totalSpent')
const sortOrder = ref('desc')

// Computed properties
const totalSpent = computed(() => {
  return filteredMerchants.value.reduce((sum, m) => sum + m.totalSpent, 0)
})

const topMerchant = computed(() => {
  if (filteredMerchants.value.length === 0) return null
  return [...filteredMerchants.value].sort((a, b) => b.visitCount - a.visitCount)[0]
})

const avgPerMerchant = computed(() => {
  if (filteredMerchants.value.length === 0) return 0
  return totalSpent.value / filteredMerchants.value.length
})

const totalPages = computed(() => {
  return Math.ceil(filteredMerchants.value.length / pageSize.value)
})

const paginatedMerchants = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredMerchants.value.slice(start, end)
})

// Methods
const fetchData = async () => {
  loading.value = true
  
  try {
    // Calculate date range based on selected period
    const now = new Date()
    let startDate, endDate
    
    switch (selectedPeriod.value) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        endDate = new Date()
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3))
        endDate = new Date()
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      case 'all':
        startDate = null
        endDate = null
        break
    }
    
    const params = {
      limit: 100 // Get more merchants
    }
    
    if (startDate) {
      params.startDate = startDate.toISOString().split('T')[0]
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split('T')[0]
    }
    
    const response = await analyticsStore.fetchMerchants( params, true)
    merchants.value = response || []
    filterMerchants()
    sortMerchants()
  } catch (error) {
    console.error('Failed to fetch merchants:', error)
    toast.error('Failed to load merchant data')
  } finally {
    loading.value = false
  }
}

const filterMerchants = () => {
  if (!searchQuery.value) {
    filteredMerchants.value = merchants.value
  } else {
    const query = searchQuery.value.toLowerCase()
    filteredMerchants.value = merchants.value.filter(m =>
      m.merchantName.toLowerCase().includes(query) ||
      m.merchantType?.toLowerCase().includes(query) ||
      m.categories?.some(c => c.toLowerCase().includes(query))
    )
  }
  currentPage.value = 1 // Reset to first page when filtering
  sortMerchants()
}

const sortBy = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  sortMerchants()
}

const sortMerchants = () => {
  filteredMerchants.value.sort((a, b) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]
    
    if (sortField.value === 'merchantName') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }
    
    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
}

const viewMerchantDetails = (merchant) => {
  // Navigate to transactions page filtered by merchant
  router.push({
    path: '/transactions',
    query: {
      merchant: merchant.merchantName
    }
  })
}

// Handle account changes
const handleAccountChange = async (event) => {
  console.log('Account changed in merchants page to:', event.detail.accountId)
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
