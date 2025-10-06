<template>
  <div class="min-h-screen p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Account Management</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">Manage your bank accounts and financial profiles</p>
      </div>

      <!-- Add Account Button -->
      <div class="mb-6">
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2"
        >
          <PlusIcon class="w-5 h-5" />
          Add New Account
        </button>
      </div>

      <!-- Accounts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="account in accounts"
          :key="account.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
        >
          <!-- Account Header -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center"
                  :style="{ backgroundColor: account.color }"
                >
                  <BuildingLibraryIcon class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ account.accountName }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ account.bankName || 'No bank specified' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="account.isDefault"
                  class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
                >
                  Default
                </span>
                <span
                  v-if="!account.isActive"
                  class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  Inactive
                </span>
              </div>
            </div>

            <!-- Account Details -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Type:</span>
                <span class="text-gray-900 dark:text-gray-100 capitalize">{{ account.accountType }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Currency:</span>
                <span class="text-gray-900 dark:text-gray-100">{{ account.currency }}</span>
              </div>
              <div v-if="account.accountNumberLast4" class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Account:</span>
                <span class="text-gray-900 dark:text-gray-100">•••• {{ account.accountNumberLast4 }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Transactions:</span>
                <span class="text-gray-900 dark:text-gray-100">{{ account.transactionCount || 0 }}</span>
              </div>
              <div v-if="account.balance !== null" class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Balance:</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">
                  {{ formatCurrency(account.balance, account.currency) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Account Actions -->
          <div class="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-center">
              <div class="flex gap-2">
                <button
                  @click="editAccount(account)"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  v-if="!account.isDefault"
                  @click="setAsDefault(account)"
                  class="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  Set Default
                </button>
              </div>
              <button
                v-if="accounts.length > 1"
                @click="confirmDelete(account)"
                class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="accounts.length === 0" class="text-center py-12">
        <BuildingLibraryIcon class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No accounts yet</h3>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Create your first account to start tracking expenses</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <TransitionRoot :show="showCreateModal || showEditModal" as="template">
      <Dialog @close="closeModal" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <DialogTitle class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {{ showEditModal ? 'Edit Account' : 'Create New Account' }}
                </DialogTitle>

                <form @submit.prevent="saveAccount" class="space-y-4">
                  <!-- Account Name -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Name *
                    </label>
                    <input
                      v-model="formData.accountName"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., Main Checking"
                    />
                  </div>

                  <!-- Bank Name -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      v-model="formData.bankName"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., Chase Bank"
                    />
                  </div>

                  <!-- Account Type -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Type
                    </label>
                    <select
                      v-model="formData.accountType"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="credit">Credit Card</option>
                      <option value="investment">Investment</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <!-- Currency -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Currency
                    </label>
                    <select
                      v-model="formData.currency"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="CHF">CHF - Swiss Franc</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                    </select>
                  </div>

                  <!-- Last 4 Digits -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last 4 Digits (Optional)
                    </label>
                    <input
                      v-model="formData.accountNumberLast4"
                      type="text"
                      maxlength="4"
                      pattern="[0-9]{4}"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="1234"
                    />
                  </div>

                  <!-- Color -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <div class="flex gap-2">
                      <button
                        v-for="color in colorOptions"
                        :key="color"
                        type="button"
                        @click="formData.color = color"
                        class="w-10 h-10 rounded-lg border-2 transition-all"
                        :style="{ backgroundColor: color }"
                        :class="formData.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'"
                      />
                    </div>
                  </div>

                  <!-- Set as Default -->
                  <div class="flex items-center">
                    <input
                      v-model="formData.isDefault"
                      type="checkbox"
                      id="setDefault"
                      class="mr-2"
                    />
                    <label for="setDefault" class="text-sm text-gray-700 dark:text-gray-300">
                      Set as default account
                    </label>
                  </div>

                  <!-- Actions -->
                  <div class="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      @click="closeModal"
                      class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      :disabled="isSaving"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {{ isSaving ? 'Saving...' : (showEditModal ? 'Update' : 'Create') }}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Delete Confirmation Modal -->
    <TransitionRoot :show="showDeleteModal" as="template">
      <Dialog @close="showDeleteModal = false" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <DialogTitle class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Delete Account
                </DialogTitle>

                <p class="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete "{{ accountToDelete?.accountName }}"?
                  <span v-if="accountToDelete?.transactionCount > 0" class="block mt-2 text-red-600 dark:text-red-400">
                    This account has {{ accountToDelete.transactionCount }} transactions.
                  </span>
                </p>

                <div v-if="accountToDelete?.transactionCount > 0" class="mb-4">
                  <label class="flex items-center">
                    <input
                      v-model="deleteTransactions"
                      type="checkbox"
                      class="mr-2"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      Also delete all transactions in this account
                    </span>
                  </label>
                </div>

                <div class="flex justify-end gap-3">
                  <button
                    @click="showDeleteModal = false"
                    class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    @click="deleteAccount"
                    :disabled="isDeleting"
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {{ isDeleting ? 'Deleting...' : 'Delete' }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAccountsStore } from '@/stores/accounts'
import { useUserStore } from '@/stores/user'
import { useToast } from 'vue-toastification'
import { 
  Dialog, 
  DialogPanel, 
  DialogTitle,
  TransitionChild,
  TransitionRoot 
} from '@headlessui/vue'
import { 
  PlusIcon, 
  BuildingLibraryIcon 
} from '@heroicons/vue/24/outline'

const accountsStore = useAccountsStore()
const userStore = useUserStore()
const toast = useToast()

// State
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const accountToDelete = ref(null)
const deleteTransactions = ref(false)
const editingAccount = ref(null)

// Form data
const formData = ref({
  accountName: '',
  bankName: '',
  accountType: 'checking',
  currency: 'EUR',
  accountNumberLast4: '',
  color: '#3b82f6',
  isDefault: false,
  isActive: true
})

// Color options
const colorOptions = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
]

// Computed
const accounts = computed(() => accountsStore.accounts)

// Methods
const formatCurrency = (amount, currency) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR'
  }).format(amount)
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  resetForm()
}

const resetForm = () => {
  formData.value = {
    accountName: '',
    bankName: '',
    accountType: 'checking',
    currency: 'EUR',
    accountNumberLast4: '',
    color: '#3b82f6',
    isDefault: false,
    isActive: true
  }
  editingAccount.value = null
}

const editAccount = (account) => {
  editingAccount.value = account
  formData.value = {
    accountName: account.accountName,
    bankName: account.bankName || '',
    accountType: account.accountType,
    currency: account.currency,
    accountNumberLast4: account.accountNumberLast4 || '',
    color: account.color,
    isDefault: account.isDefault,
    isActive: account.isActive
  }
  showEditModal.value = true
}

const saveAccount = async () => {
  isSaving.value = true
  
  try {
    if (showEditModal.value && editingAccount.value) {
      // Update existing account
      await accountsStore.updateAccount(editingAccount.value.id, {
        userId: userStore.userId,
        ...formData.value
      })
      toast.success('Account updated successfully')
    } else {
      // Create new account
      await accountsStore.createAccount(formData.value)
      toast.success('Account created successfully')
    }
    
    closeModal()
  } catch (error) {
    toast.error(error.message || 'Failed to save account')
  } finally {
    isSaving.value = false
  }
}

const setAsDefault = async (account) => {
  try {
    await accountsStore.setDefaultAccount(userStore.userId, account.id)
    toast.success(`${account.accountName} is now the default account`)
  } catch (error) {
    toast.error('Failed to set default account')
  }
}

const confirmDelete = (account) => {
  accountToDelete.value = account
  deleteTransactions.value = false
  showDeleteModal.value = true
}

const deleteAccount = async () => {
  if (!accountToDelete.value) return
  
  isDeleting.value = true
  
  try {
    await accountsStore.deleteAccount(
      userStore.userId,
      accountToDelete.value.id,
      deleteTransactions.value
    )
    toast.success('Account deleted successfully')
    showDeleteModal.value = false
    accountToDelete.value = null
  } catch (error) {
    toast.error(error.message || 'Failed to delete account')
  } finally {
    isDeleting.value = false
  }
}

// Load accounts on mount
onMounted(async () => {
  await accountsStore.fetchAccounts()
})
</script>
