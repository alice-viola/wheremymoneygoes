<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-20"></div>
    
    <!-- Page Header -->
    <div class="relative flex items-center justify-between card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Transactions
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          AI-enhanced view of all your financial activities
        </p>
      </div>
      
      <div class="flex items-center space-x-3">
        
        <!-- Export Button -->
        <button
          @click="handleExport"
          class="btn btn-secondary flex items-center space-x-2"
        >
          <ArrowDownTrayIcon class="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>
    </div>
    
    <!-- Active Filter Alert -->
    <div v-if="route.query.merchant" class="card p-4 bg-gradient-to-r from-primary-500/5 to-accent-500/5">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <FunnelIcon class="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Showing transactions for merchant: <strong class="gradient-text">{{ route.query.merchant }}</strong>
          </span>
        </div>
        <button
          @click="clearFilters"
          class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          Clear filter ×
        </button>
      </div>
    </div>
    
    <!-- Summary Section -->
    <div class="flex flex-wrap gap-3 mb-4">
      <!-- Total Income -->
      <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
        <ArrowTrendingUpIcon class="w-4 h-4 text-success-600 dark:text-success-400" />
        <span class="text-sm font-medium text-success-700 dark:text-success-300">Income:</span>
        <span class="text-sm font-bold text-success-900 dark:text-success-200">
          +{{ formatCurrency(totalIncome) }}
        </span>
      </div>
      
      <!-- Total Expenses -->
      <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800">
        <ArrowTrendingDownIcon class="w-4 h-4 text-error-600 dark:text-error-400" />
        <span class="text-sm font-medium text-error-700 dark:text-error-300">Expenses:</span>
        <span class="text-sm font-bold text-error-900 dark:text-error-200">
          -{{ formatCurrency(totalExpenses) }}
        </span>
      </div>
      
      <!-- Net Balance -->
      <div class="flex items-center gap-2 px-4 py-2 rounded-lg" 
           :class="netBalance >= 0 
             ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' 
             : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'">
        <BanknotesIcon class="w-4 h-4" :class="netBalance >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-warning-600 dark:text-warning-400'" />
        <span class="text-sm font-medium" :class="netBalance >= 0 ? 'text-primary-700 dark:text-primary-300' : 'text-warning-700 dark:text-warning-300'">Balance:</span>
        <span class="text-sm font-bold" :class="netBalance >= 0 ? 'text-primary-900 dark:text-primary-200' : 'text-warning-900 dark:text-warning-200'">
          {{ netBalance >= 0 ? '+' : '' }}{{ formatCurrency(netBalance) }}
        </span>
      </div>
      
      <!-- Transaction Count -->
      <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <DocumentTextIcon class="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ filteredTransactions.length }} {{ filteredTransactions.length === 1 ? 'transaction' : 'transactions' }}
        </span>
      </div>
    </div>
    
    <!-- Filters Section -->
    <div class="card p-4 overflow-visible">
      <!-- Compact Single Row Filter Bar -->
      <div class="flex flex-col lg:flex-row gap-3 items-stretch">
        <!-- Search Input -->
        <div class="relative group flex-1 min-w-[200px]">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search transactions..."
            class="input pl-10 w-full text-sm"
            @keyup.enter="applyFilters"
          >
          <MagnifyingGlassIcon class="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
        </div>
        
        <!-- Category and Merchant Selectors -->
        <div class="flex flex-col sm:flex-row gap-3 lg:flex-none">
          <!-- Category Selector -->
          <div class="relative min-w-[160px]">
            <select
              v-model="categoryFilter"
              class="input text-sm pr-8 appearance-none"
              @change="handleFilterChange"
            >
              <option value="">All Categories</option>
              <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">
                {{ cat.icon }} {{ cat.label }}
              </option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          
        <!-- Merchant Selector -->
        <div class="relative min-w-[160px]" ref="merchantInputRef">
          <Combobox v-model="merchantFilter">
            <div class="relative">
              <ComboboxInput
                class="input text-sm pr-8"
                :displayValue="(merchant) => merchant?.name || merchant || ''"
                @change="merchantQuery = $event.target.value"
                @focus="handleMerchantFocus"
                @blur="handleMerchantBlur"
                placeholder="All Merchants"
              />
              <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDownIcon class="w-4 h-4 text-gray-400" />
              </ComboboxButton>
            </div>
              <Teleport to="body">
                <TransitionRoot
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <ComboboxOptions
                    v-if="showMerchantDropdown"
                    class="fixed max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    :style="merchantDropdownStyle"
                  >
                    <ComboboxOption
                      v-if="filteredMerchants.length === 0 && merchantQuery !== ''"
                      :value="null"
                      disabled
                      class="px-4 py-2 text-gray-500 dark:text-gray-400"
                    >
                      No merchants found
                    </ComboboxOption>
                    <ComboboxOption
                      v-for="merchant in filteredMerchants"
                      :key="merchant.name"
                      :value="merchant"
                      v-slot="{ selected, active }"
                      as="template"
                    >
                      <li
                        class="relative cursor-pointer select-none py-2 px-4"
                        :class="active ? 'bg-primary-50 dark:bg-primary-900/20' : ''"
                      >
                        <span :class="selected ? 'font-semibold' : 'font-normal'">
                          {{ merchant.name }}
                        </span>
                      </li>
                    </ComboboxOption>
                  </ComboboxOptions>
                </TransitionRoot>
              </Teleport>
            </Combobox>
          </div>
        </div>
        
        <!-- Date Range Picker -->
        <div class="lg:flex-none min-w-[200px]">
          <DatePicker
            v-model="dateRange"
            mode="range"
            placeholder="Select dates"
            :show-quick-selections="true"
            @change="handleDateChange"
          />
        </div>
        
        <!-- Clear Filters -->
        <div class="flex items-center">
          <button
            v-if="hasActiveFilters"
            @click="clearAllFilters"
            class="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-error-600 dark:hover:text-error-400 transition-colors flex items-center gap-1"
            title="Clear all filters"
          >
            <XMarkIcon class="w-4 h-4" />
            <span class="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Transactions Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            <!-- Loading State -->
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="relative">
                    <div class="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                    <div class="absolute top-0 left-0 w-16 h-16 border-4 border-primary-500 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Loading transactions...</p>
                </div>
              </td>
            </tr>
            
            <!-- Empty State -->
            <tr v-else-if="filteredTransactions.length === 0">
              <td colspan="5" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <BanknotesIcon class="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">No transactions found</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Try adjusting your filters or upload new data</p>
                  </div>
                </div>
              </td>
            </tr>
            
            <!-- Transaction Rows -->
            <tr
              v-else
              v-for="transaction in paginatedTransactions"
              :key="transaction.id"
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDate(transaction.date) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(transaction.date) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200/50 dark:from-gray-700 dark:to-gray-600/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BuildingStorefrontIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ transaction.merchantName || 'Unknown Merchant' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {{ transaction.description }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                  :style="{ 
                    backgroundColor: getCategoryColor(transaction.category) + '15', 
                    color: getCategoryColor(transaction.category),
                    borderColor: getCategoryColor(transaction.category) + '30',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }"
                >
                  <TagIcon class="w-3 h-3 mr-1.5" />
                  {{ transaction.category }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end space-x-1">
                  <span 
                    class="text-sm font-semibold transition-all duration-200 group-hover:scale-105"
                    :class="transaction.kind === '+' ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'"
                  >
                    {{ transaction.kind }}{{ formatCurrency(Math.abs(transaction.amount), transaction.currency) }}
                  </span>
                  <ArrowTrendingUpIcon v-if="transaction.kind === '+'" class="w-4 h-4 text-success-500 animate-float" />
                  <ArrowTrendingDownIcon v-else class="w-4 h-4 text-error-500" />
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    @click="viewTransaction(transaction.id)"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
                    title="View details"
                  >
                    <EyeIcon class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
                    title="Edit"
                  >
                    <PencilIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredTransactions.length) }} of {{ filteredTransactions.length }} transactions
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon class="w-5 h-5" />
            </button>
            
            <div class="flex items-center space-x-1">
              <button
                v-for="page in visiblePageNumbers"
                :key="page"
                @click="currentPage = page"
                class="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200"
                :class="currentPage === page 
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'"
              >
                {{ page }}
              </button>
            </div>
            
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionsStore } from '@/stores/transactions'
import { useUserStore } from '@/stores/user'
import { useAnalyticsStore } from '@/stores/analytics'
import { formatCurrency, formatDate, formatTime, truncateText } from '@/utils/formatters'
import { CATEGORIES, getCategoryColor, getCategoryIcon } from '@/utils/constants'
import DatePicker from '@/components/filters/DatePicker.vue'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  TransitionRoot,
} from '@headlessui/vue'
import { 
  ArrowDownTrayIcon,
  SparklesIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  TagIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const transactionsStore = useTransactionsStore()
const userStore = useUserStore()
const analyticsStore = useAnalyticsStore()

const loading = ref(false)
const searchQuery = ref('')
const categoryFilter = ref('')
const merchantFilter = ref(null)
const dateRange = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Merchant dropdown state
const merchantQuery = ref('')
const merchants = ref([])
const showMerchantDropdown = ref(false)
const merchantDropdownStyle = ref({})
const merchantInputRef = ref(null)

// Storage key for filters
const FILTER_STORAGE_KEY = 'transaction_filters'

const transactions = computed(() => transactionsStore.transactions)

// Filtered merchants for dropdown
const filteredMerchants = computed(() => {
  if (!merchantQuery.value) {
    return merchants.value
  }
  
  const query = merchantQuery.value.toLowerCase()
  return merchants.value.filter(merchant => 
    merchant.name.toLowerCase().includes(query)
  )
})

const filteredTransactions = computed(() => {
  let filtered = [...transactions.value]
  
  // Apply merchant filter from query or selector
  const merchantToFilter = route.query.merchant || merchantFilter.value?.name || merchantFilter.value
  if (merchantToFilter) {
    filtered = filtered.filter(t => t.merchantName === merchantToFilter)
  }
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(t => 
      t.description?.toLowerCase().includes(query) ||
      t.merchantName?.toLowerCase().includes(query) ||
      t.category?.toLowerCase().includes(query)
    )
  }
  
  // Apply category filter
  if (categoryFilter.value) {
    filtered = filtered.filter(t => t.category === categoryFilter.value)
  }
  
  // Apply date range filter
  if (dateRange.value?.start) {
    filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.value.start))
  }
  if (dateRange.value?.end) {
    filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.value.end))
  }
  
  return filtered
})

// Calculate totals for summary section
const totalIncome = computed(() => {
  return filteredTransactions.value
    .filter(t => t.kind === '+')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
})

const totalExpenses = computed(() => {
  return filteredTransactions.value
    .filter(t => t.kind === '-')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
})

const netBalance = computed(() => {
  return totalIncome.value - totalExpenses.value
})

const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / itemsPerPage.value))

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTransactions.value.slice(start, end)
})

const visiblePageNumbers = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const viewTransaction = (id) => {
  router.push(`/transactions/${id}`)
}

const handleExport = () => {
  // Implement export functionality
  console.log('Export transactions')
}

const clearFilters = () => {
  searchQuery.value = ''
  categoryFilter.value = ''
  merchantFilter.value = null
  dateRange.value = null
  router.push('/transactions')
  saveFiltersToStorage()
}

const clearAllFilters = () => {
  clearFilters()
}

const handleFilterChange = (filters) => {
  // Handle filter changes if needed
  currentPage.value = 1
  saveFiltersToStorage()
}

const handleDateChange = (range) => {
  // Handle date range changes if needed
  currentPage.value = 1
  saveFiltersToStorage()
}

const applyFilters = () => {
  currentPage.value = 1
  saveFiltersToStorage()
}

const hasActiveFilters = computed(() => {
  return searchQuery.value || categoryFilter.value || merchantFilter.value || dateRange.value
})

// Save filters to sessionStorage
const saveFiltersToStorage = () => {
  const filters = {
    searchQuery: searchQuery.value,
    categoryFilter: categoryFilter.value,
    merchantFilter: merchantFilter.value,
    dateRange: dateRange.value,
    currentPage: currentPage.value
  }
  sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

// Load filters from sessionStorage
const loadFiltersFromStorage = () => {
  const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
  if (stored) {
    try {
      const filters = JSON.parse(stored)
      searchQuery.value = filters.searchQuery || ''
      categoryFilter.value = filters.categoryFilter || ''
      merchantFilter.value = filters.merchantFilter || null
      dateRange.value = filters.dateRange || null
      currentPage.value = filters.currentPage || 1
      
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

// Reset page when filters change and save to storage
watch([searchQuery, categoryFilter, merchantFilter, dateRange], () => {
  currentPage.value = 1
  saveFiltersToStorage()
})

// Merchant dropdown handlers
const handleMerchantFocus = () => {
  showMerchantDropdown.value = true
  updateMerchantDropdownPosition()
}

const handleMerchantBlur = () => {
  // Delay to allow click on dropdown items
  setTimeout(() => {
    showMerchantDropdown.value = false
  }, 200)
}

const updateMerchantDropdownPosition = () => {
  if (!merchantInputRef.value) return
  
  const inputRect = merchantInputRef.value.getBoundingClientRect()
  const dropdownWidth = inputRect.width
  const dropdownMaxHeight = 240 // max-h-60 = 15rem = 240px
  
  let top = inputRect.bottom + 4
  let left = inputRect.left
  
  // Check if dropdown would go off the bottom
  if (top + dropdownMaxHeight > window.innerHeight - 20) {
    // Position above the input if there's more space
    const spaceAbove = inputRect.top
    const spaceBelow = window.innerHeight - inputRect.bottom
    
    if (spaceAbove > spaceBelow && spaceAbove > dropdownMaxHeight + 20) {
      top = inputRect.top - dropdownMaxHeight - 4
    }
  }
  
  // Check if dropdown would go off the right edge
  if (left + dropdownWidth > window.innerWidth - 20) {
    left = window.innerWidth - dropdownWidth - 20
  }
  
  // Ensure minimum distance from edges
  left = Math.max(10, left)
  top = Math.max(10, top)
  
  merchantDropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${dropdownWidth}px`,
    maxHeight: `${dropdownMaxHeight}px`
  }
}

// Load merchants for dropdown
const loadMerchants = async () => {
  try {
    const response = await analyticsStore.fetchMerchants( { limit: 100 })
    if (response && Array.isArray(response)) {
      merchants.value = response.map(m => ({
        name: m.merchantName || 'Unknown',
        visitCount: m.visitCount,
        totalSpent: m.totalSpent
      }))
    }
  } catch (error) {
    console.error('Failed to load merchants:', error)
    merchants.value = []
  }
}

onMounted(async () => {
  // Load saved filters first
  loadFiltersFromStorage()
  
  loading.value = true
  const userId = userStore.userId || 'default-user'
  await Promise.all([
    transactionsStore.fetchTransactions(),
    loadMerchants()
  ])
  loading.value = false
})
</script>