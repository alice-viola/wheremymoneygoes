<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <router-link
      to="/transactions"
      class="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    >
      <ChevronLeftIcon class="w-4 h-4 mr-1" />
      Back to Transactions
    </router-link>
    
    <!-- Transaction Details -->
    <div v-if="loading" class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    </div>
    
    <div v-else-if="transaction" class="space-y-6">
      <!-- Main Info -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h1 class="text-xl font-medium text-gray-900 dark:text-white mb-4">
          Transaction Details
        </h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="text-sm text-gray-500 dark:text-gray-400">Date</label>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ formatDate(transaction.date, 'MMMM d, yyyy') }}
            </p>
          </div>
          
          <div>
            <label class="text-sm text-gray-500 dark:text-gray-400">Amount</label>
            <p class="text-lg font-medium"
               :class="transaction.kind === '+' ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'">
              {{ transaction.kind }}{{ formatCurrency(Math.abs(transaction.amount), transaction.currency) }}
            </p>
          </div>
          
          <div>
            <label class="text-sm text-gray-500 dark:text-gray-400">Category</label>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ transaction.category }}
              <span v-if="transaction.subcategory" class="text-sm text-gray-500">
                / {{ transaction.subcategory }}
              </span>
            </p>
          </div>
          
          <div>
            <label class="text-sm text-gray-500 dark:text-gray-400">Merchant</label>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ transaction.merchantName || 'Unknown' }}
            </p>
          </div>
          
          <div class="md:col-span-2">
            <label class="text-sm text-gray-500 dark:text-gray-400">Description</label>
            <p class="text-base text-gray-700 dark:text-gray-300">
              {{ transaction.description }}
            </p>
          </div>
          
          <div>
            <label class="text-sm text-gray-500 dark:text-gray-400">Confidence Score</label>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ formatConfidence(transaction.confidence) }}
              <span class="text-sm text-gray-500 ml-1">
                ({{ (transaction.confidence * 100).toFixed(0) }}%)
              </span>
            </p>
          </div>
          
          <div>
            <label class="text-sm text-gray-500 dark:text-gray-400">Transaction Code</label>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ transaction.code || 'N/A' }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 class="text-base font-medium text-gray-900 dark:text-white mb-4">
          Actions
        </h2>
        
        <div class="flex space-x-4">
          <button
            @click="editTransaction"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Edit Category
          </button>
          
          <button
            @click="deleteTransaction"
            class="px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
          >
            Delete Transaction
          </button>
        </div>
      </div>
    </div>
    
    <div v-else class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm text-center">
      <p class="text-gray-500 dark:text-gray-400">Transaction not found</p>
    </div>
    
    <!-- Edit Transaction Modal -->
    <Teleport to="body">
      <div
        v-if="showEditModal"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div
            @click="showEditModal = false"
            class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          ></div>

          <!-- Modal panel -->
          <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Edit Transaction
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    v-model="editForm.category"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a category</option>
                    <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">
                      {{ cat.label }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subcategory (Optional)
                  </label>
                  <input
                    v-model="editForm.subcategory"
                    type="text"
                    placeholder="e.g., Groceries, Restaurant, etc."
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Merchant Name
                  </label>
                  <input
                    v-model="editForm.merchantName"
                    type="text"
                    placeholder="Enter merchant name"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                @click="saveTransaction"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Save Changes
              </button>
              <button
                @click="showEditModal = false"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'
import { useUserStore } from '@/stores/user'
import { useTransactionsStore } from '@/stores/transactions'
import { formatDate, formatCurrency, formatConfidence } from '@/utils/formatters'
import { CATEGORIES } from '@/utils/constants'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const transactionsStore = useTransactionsStore()

const loading = ref(false)
const transaction = ref(null)
const showEditModal = ref(false)
const editForm = ref({
  category: '',
  subcategory: '',
  merchantName: ''
})

onMounted(async () => {
  loading.value = true
  try {
    transaction.value = await transactionsStore.fetchTransaction(
      route.params.id
    )
  } catch (error) {
    toast.error('Failed to load transaction')
  } finally {
    loading.value = false
  }
})

const editTransaction = () => {
  if (transaction.value) {
    editForm.value = {
      category: transaction.value.category || '',
      subcategory: transaction.value.subcategory || '',
      merchantName: transaction.value.merchantName || ''
    }
  }
  showEditModal.value = true
}

const saveTransaction = async () => {
  try {
    await transactionsStore.updateTransaction(
      userStore.userId,
      route.params.id,
      editForm.value
    )
    
    // Update local transaction data
    if (transaction.value) {
      transaction.value = {
        ...transaction.value,
        ...editForm.value
      }
    }
    
    showEditModal.value = false
    toast.success('Transaction updated successfully')
  } catch (error) {
    toast.error('Failed to update transaction')
  }
}

const deleteTransaction = async () => {
  if (confirm('Are you sure you want to delete this transaction?')) {
    try {
      await transactionsStore.deleteTransaction(route.params.id)
      toast.success('Transaction deleted')
      router.push('/transactions')
    } catch (error) {
      toast.error('Failed to delete transaction')
    }
  }
}
</script>
