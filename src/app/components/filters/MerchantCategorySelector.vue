<template>
  <div class="space-y-4">
    <!-- Category Selector -->
    <div>
      <label :for="`category-${uid}`" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {{ categoryLabel }}
      </label>
      <div class="relative">
        <select
          :id="`category-${uid}`"
          v-model="localCategory"
          @change="handleCategoryChange"
          class="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 appearance-none"
          :disabled="disabled"
        >
          <option value="">{{ categoryPlaceholder }}</option>
          <option 
            v-for="cat in categories" 
            :key="cat.value" 
            :value="cat.value"
          >
            {{ cat.emoji }} {{ cat.label }}
          </option>
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDownIcon class="w-5 h-5 text-gray-400" />
        </div>
      </div>
      <p v-if="categoryHint" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {{ categoryHint }}
      </p>
    </div>

    <!-- Merchant Selector -->
    <div>
      <label :for="`merchant-${uid}`" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {{ merchantLabel }}
      </label>
      <div class="relative">
        <!-- Combobox for merchants with search -->
        <Combobox v-model="localMerchant" :disabled="disabled" v-slot="{ open }">
          <div class="relative" ref="merchantInputRef" :data-open="open">
            <ComboboxInput
              :id="`merchant-${uid}`"
              class="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              :displayValue="(merchant) => merchant?.name || merchant || ''"
              @change="merchantQuery = $event.target.value"
              :placeholder="merchantPlaceholder"
            />
            <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDownIcon class="w-5 h-5 text-gray-400" />
            </ComboboxButton>
          </div>
          
          <Teleport to="body">
            <TransitionRoot
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              @after-leave="merchantQuery = ''"
            >
              <ComboboxOptions 
                class="fixed max-h-60 w-[var(--button-width)] overflow-auto rounded-lg bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                :style="dropdownStyle"
              >
              <!-- Loading state -->
              <div v-if="loadingMerchants" class="px-4 py-3 text-center">
                <div class="inline-flex items-center space-x-2">
                  <div class="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                  <span class="text-sm text-gray-500 dark:text-gray-400">Loading merchants...</span>
                </div>
              </div>
              
              <!-- No results -->
              <div
                v-else-if="filteredMerchants.length === 0 && merchantQuery !== ''"
                class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
              >
                No merchants found matching "{{ merchantQuery }}"
              </div>
              
              <!-- Clear selection option -->
              <ComboboxOption
                v-if="localMerchant && !merchantQuery"
                :value="null"
                v-slot="{ active }"
                as="template"
              >
                <li
                  class="relative cursor-pointer select-none py-2.5 px-4 transition-colors duration-150"
                  :class="active ? 'bg-primary-50 dark:bg-primary-900/20' : ''"
                >
                  <span class="block truncate text-gray-500 dark:text-gray-400">
                    Clear selection
                  </span>
                </li>
              </ComboboxOption>
              
              <!-- Merchant options -->
              <ComboboxOption
                v-for="merchant in filteredMerchants"
                :key="merchant.id || merchant.name"
                :value="merchant"
                v-slot="{ selected, active }"
                as="template"
              >
                <li
                  class="relative cursor-pointer select-none py-2.5 px-4 transition-colors duration-150"
                  :class="active ? 'bg-primary-50 dark:bg-primary-900/20' : ''"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span 
                        class="block truncate"
                        :class="selected ? 'font-semibold text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'"
                      >
                        {{ merchant.name }}
                      </span>
                      <span v-if="merchant.category" class="text-xs text-gray-500 dark:text-gray-400">
                        {{ merchant.category }} • {{ merchant.visitCount || 0 }} visits
                      </span>
                    </div>
                    <span v-if="merchant.totalSpent" class="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      {{ formatCurrency(merchant.totalSpent) }}
                    </span>
                  </div>
                  <span
                    v-if="selected"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600 dark:text-primary-400"
                  >
                    <CheckIcon class="h-5 w-5" />
                  </span>
                </li>
              </ComboboxOption>
              </ComboboxOptions>
            </TransitionRoot>
          </Teleport>
        </Combobox>
      </div>
      <p v-if="merchantHint" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {{ merchantHint }}
      </p>
    </div>

    <!-- Quick Actions -->
    <div v-if="showQuickActions" class="flex items-center space-x-2 pt-2">
      <button
        @click="handleClearAll"
        class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        :disabled="!localCategory && !localMerchant"
      >
        Clear all
      </button>
      <span class="text-gray-300 dark:text-gray-600">•</span>
      <button
        @click="handleRecentSelection"
        class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        Recent selections
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useUserStore } from '@/stores/user'
import { formatCurrency } from '@/utils/formatters'
import { CATEGORIES } from '@/utils/constants'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  TransitionRoot,
} from '@headlessui/vue'
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
  modelCategory: {
    type: String,
    default: ''
  },
  modelMerchant: {
    type: [String, Object],
    default: null
  },
  categoryLabel: {
    type: String,
    default: 'Category'
  },
  merchantLabel: {
    type: String,
    default: 'Merchant'
  },
  categoryPlaceholder: {
    type: String,
    default: 'All Categories'
  },
  merchantPlaceholder: {
    type: String,
    default: 'All Merchants'
  },
  categoryHint: {
    type: String,
    default: ''
  },
  merchantHint: {
    type: String,
    default: ''
  },
  showQuickActions: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  autoLoadMerchants: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['update:modelCategory', 'update:modelMerchant', 'change'])

// Stores
const analyticsStore = useAnalyticsStore()
const userStore = useUserStore()

// Local state
const localCategory = ref(props.modelCategory)
const localMerchant = ref(props.modelMerchant)
const merchantQuery = ref('')
const loadingMerchants = ref(false)
const merchants = ref([])
const uid = ref(Math.random().toString(36).substr(2, 9))
const merchantInputRef = ref(null)
const dropdownStyle = ref({})

// Add emoji to categories
const categories = computed(() => {
  return CATEGORIES.map(cat => ({
    ...cat,
    emoji: getCategoryEmoji(cat.value)
  }))
})

// Filtered merchants based on search query
const filteredMerchants = computed(() => {
  if (!merchantQuery.value) {
    return merchants.value
  }
  
  const query = merchantQuery.value.toLowerCase()
  return merchants.value.filter(merchant => 
    merchant.name.toLowerCase().includes(query) ||
    (merchant.category && merchant.category.toLowerCase().includes(query))
  )
})

// Watch for prop changes
watch(() => props.modelCategory, (newVal) => {
  localCategory.value = newVal
})

watch(() => props.modelMerchant, (newVal) => {
  localMerchant.value = newVal
})

// Watch for local changes and emit
watch(localCategory, (newVal) => {
  emit('update:modelCategory', newVal)
  emitChange()
})

watch(localMerchant, (newVal) => {
  emit('update:modelMerchant', newVal)
  emitChange()
})

// Methods
const handleCategoryChange = () => {
  // Filter merchants by category if needed
  if (localCategory.value && merchants.value.length > 0) {
    // You could filter merchants here if they have categories
  }
}


const updateDropdownPosition = (isOpen) => {
  if (!isOpen || !merchantInputRef.value) return
  
  nextTick(() => {
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
    
    dropdownStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      width: `${dropdownWidth}px`,
      maxHeight: `${dropdownMaxHeight}px`,
      zIndex: 9999
    }
  })
}

const handleClearAll = () => {
  localCategory.value = ''
  localMerchant.value = null
  emit('update:modelCategory', '')
  emit('update:modelMerchant', null)
  emitChange()
}

const handleRecentSelection = () => {
  // This could open a modal with recent selections
  // For now, just a placeholder
  console.log('Show recent selections')
}

const emitChange = () => {
  emit('change', {
    category: localCategory.value,
    merchant: localMerchant.value
  })
}

const loadMerchants = async () => {
  if (!props.autoLoadMerchants) return
  
  loadingMerchants.value = true
  try {
    const response = await analyticsStore.fetchMerchants( { limit: 100 })
    if (response && Array.isArray(response)) {
      merchants.value = response.map(m => ({
        id: m.merchantName,
        name: m.merchantName || 'Unknown',
        category: m.category,
        visitCount: m.visitCount,
        totalSpent: m.totalSpent
      }))
    }
  } catch (error) {
    console.error('Failed to load merchants:', error)
    merchants.value = []
  } finally {
    loadingMerchants.value = false
  }
}

const getCategoryEmoji = (category) => {
  const emojiMap = {
    'Food & Dining': '🍽️',
    'Shopping': '🛍️',
    'Transportation': '🚗',
    'Utilities': '💡',
    'Entertainment': '🎬',
    'Health & Wellness': '💊',
    'Travel': '✈️',
    'Housing': '🏠',
    'Financial': '💰',
    'Education': '📚',
    'Personal Care': '💅',
    'Insurance': '🛡️',
    'Pets': '🐾',
    'Subscriptions & Memberships': '📱',
    'Gifts & Donations': '🎁',
    'Government & Taxes': '🏛️',
    'Children & Family': '👨‍👩‍👧‍👦',
    'Business & Professional': '💼',
    'Cash & ATM': '💵',
    'Income': '💸',
    'Other': '📌'
  }
  return emojiMap[category] || '📌'
}

// Watch for dropdown open state changes
const observeDropdown = () => {
  if (!merchantInputRef.value) return
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-open') {
        const isOpen = merchantInputRef.value.getAttribute('data-open') === 'true'
        if (isOpen) {
          updateDropdownPosition(true)
        }
      }
    })
  })
  
  observer.observe(merchantInputRef.value, {
    attributes: true,
    attributeFilter: ['data-open']
  })
  
  return observer
}

let dropdownObserver = null

// Handle window resize and scroll
const handleResize = () => {
  if (merchantInputRef.value?.getAttribute('data-open') === 'true') {
    updateDropdownPosition(true)
  }
}

// Lifecycle
onMounted(() => {
  loadMerchants()
  nextTick(() => {
    dropdownObserver = observeDropdown()
  })
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleResize, true)
})

onUnmounted(() => {
  if (dropdownObserver) {
    dropdownObserver.disconnect()
  }
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleResize, true)
})
</script>
