<template>
  <div class="relative">
    <!-- Selector Button -->
    <button
      @click="handleDropdownToggle"
      class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div
        v-if="selectedAccount"
        class="w-2 h-2 rounded-full"
        :style="{ backgroundColor: selectedAccount.color || '#6b7280' }"
      ></div>
      
      <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
        {{ selectedAccount ? selectedAccount.accountName : 'Select Account' }}
      </span>
      
      <ChevronDownIcon
        class="w-4 h-4 text-gray-500 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-2 w-72 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <!-- All Accounts Option -->
        <button
          @click="selectAccount('all')"
          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="{
            'bg-blue-50 dark:bg-blue-900/20': accountsStore.selectedAccountId === 'all'
          }"
        >
          <ViewColumnsIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div class="flex-1 text-left">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              All Accounts
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              View combined data
            </div>
          </div>
          <CheckIcon
            v-if="accountsStore.selectedAccountId === 'all'"
            class="w-4 h-4 text-blue-600 dark:text-blue-400"
          />
        </button>

        <div class="border-t border-gray-200 dark:border-gray-700"></div>

        <!-- Individual Accounts -->
        <div v-if="isLoadingAccounts" class="p-4 text-center">
          <div class="inline-flex items-center">
            <svg class="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="ml-2 text-sm text-gray-500">Loading accounts...</span>
          </div>
        </div>
        <div v-else-if="availableAccounts.length === 0" class="p-4 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">No accounts found</p>
          <router-link
            to="/settings/accounts"
            @click="isOpen = false"
            class="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <PlusIcon class="w-4 h-4" />
            Create your first account
          </router-link>
        </div>
        <div v-else class="max-h-96 overflow-y-auto">
          <button
            v-for="account in availableAccounts"
            :key="account.id"
            @click="selectAccount(account.id)"
            class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            :class="{
              'bg-blue-50 dark:bg-blue-900/20': accountsStore.selectedAccountId === account.id
            }"
          >
            <!-- Account Color Indicator -->
            <div
              class="w-5 h-5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: account.color }"
            ></div>
            
            <!-- Account Info -->
            <div class="flex-1 text-left">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ account.accountName }}
                </span>
                <span
                  v-if="account.isDefault"
                  class="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
                >
                  Default
                </span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ account.bankName || account.accountType }}
                <span v-if="account.currency">· {{ account.currency }}</span>
                <span v-if="account.transactionCount">
                  · {{ account.transactionCount }} transactions
                </span>
              </div>
            </div>
            
            <!-- Selection Indicator -->
            <CheckIcon
              v-if="accountsStore.selectedAccountId === account.id"
              class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
            />
          </button>
        </div>

        <!-- Footer Actions -->
        <div class="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50">
          <router-link
            to="/settings/accounts"
            @click="isOpen = false"
            class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <CogIcon class="w-4 h-4" />
            Manage Accounts
          </router-link>
        </div>
      </div>
    </Transition>

    <!-- Click outside to close -->
    <div
      v-if="isOpen"
      @click="isOpen = false"
      class="fixed inset-0 z-40"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAccountsStore } from '@/stores/accounts'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { 
  ChevronDownIcon, 
  CheckIcon, 
  ViewColumnsIcon,
  CogIcon,
  PlusIcon 
} from '@heroicons/vue/24/outline'

const emit = defineEmits(['account-changed'])

const accountsStore = useAccountsStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const toast = useToast()

const isOpen = ref(false)
const hasLoadedAccounts = ref(false)
const isLoadingAccounts = ref(false)

const selectedAccount = computed(() => accountsStore.selectedAccount)

// Use all accounts if no active accounts are available
const availableAccounts = computed(() => {
  const active = accountsStore.activeAccounts
  if (active && active.length > 0) {
    return active
  }
  // Fall back to all accounts if no active accounts
  return accountsStore.accounts
})

const selectAccount = async (accountId) => {
  isOpen.value = false
  // Show loading state while data refreshes
  const loadingToast = toast?.info?.('Switching account...', { 
    timeout: false,
    closeOnClick: false 
  })
  
  try {
    await accountsStore.selectAccount(accountId)
    emit('account-changed', accountId)
    if (loadingToast) {
      toast.dismiss(loadingToast)
      // Success notification removed - switching happens silently
    }
  } catch (error) {
    console.error('Failed to switch account:', error)
    if (loadingToast) {
      toast.dismiss(loadingToast)
      toast.error('Failed to switch account')
    }
  }
}

// Load accounts when dropdown opens if not loaded
const handleDropdownToggle = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && !hasLoadedAccounts.value) {
    await loadAccounts()
  }
}

const loadAccounts = async (force = false) => {
  if ((!hasLoadedAccounts.value || force) && authStore.isAuthenticated && authStore.user?.id) {
    isLoadingAccounts.value = true
    try {
      await accountsStore.fetchAccounts()
      accountsStore.initFromStorage()
      hasLoadedAccounts.value = true
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      // Retry once after a short delay if it fails
      if (error.response?.status !== 401) {
        setTimeout(async () => {
          try {
            await accountsStore.fetchAccounts()
            accountsStore.initFromStorage()
            hasLoadedAccounts.value = true
          } catch (retryError) {
            console.error('Retry failed to fetch accounts:', retryError)
          }
        }, 1000)
      }
    } finally {
      isLoadingAccounts.value = false
    }
  }
}

// Watch for authentication changes
watch(() => authStore.isAuthenticated, async (isAuthenticated) => {
  if (isAuthenticated && !hasLoadedAccounts.value) {
    await loadAccounts()
  } else if (!isAuthenticated) {
    hasLoadedAccounts.value = false
    accountsStore.clearStore()
  }
})

// Load accounts on mount if already authenticated
onMounted(async () => {
  await loadAccounts()
})

// Close dropdown on escape key
const handleEscape = (e) => {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>
