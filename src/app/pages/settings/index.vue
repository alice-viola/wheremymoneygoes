<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-20"></div>
    
    <!-- Page Header -->
    <div class="relative card p-6">
      <div>
        <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Customize your experience and manage your data
        </p>
      </div>
    </div>
    
    <!-- Settings Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Appearance Section -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <div class="p-2 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200/50 dark:from-primary-900/30 dark:to-primary-800/20">
            <PaintBrushIcon class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
            Appearance
          </h2>
        </div>
        
        <div class="space-y-6">
          <!-- Theme Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                @click="setTheme('light')"
                :class="[
                  'relative p-4 rounded-xl border-2 transition-all duration-200 group',
                  theme === 'light'
                    ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <SunIcon class="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Light</span>
                <div v-if="theme === 'light'" class="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"></div>
              </button>
              
              <button
                @click="setTheme('dark')"
                :class="[
                  'relative p-4 rounded-xl border-2 transition-all duration-200 group',
                  theme === 'dark'
                    ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <MoonIcon class="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Dark</span>
                <div v-if="theme === 'dark'" class="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"></div>
              </button>
              
              <button
                @click="setTheme('auto')"
                :class="[
                  'relative p-4 rounded-xl border-2 transition-all duration-200 group',
                  theme === 'auto'
                    ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <ComputerDesktopIcon class="w-6 h-6 mx-auto mb-2 text-gray-500" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Auto</span>
                <div v-if="theme === 'auto'" class="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"></div>
              </button>
            </div>
          </div>
          
          <!-- Accent Color -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Accent Color
            </label>
            <div class="flex space-x-2">
              <button
                v-for="color in accentColors"
                :key="color.name"
                @click="preferences.accentColor = color.name"
                class="w-10 h-10 rounded-xl transition-all duration-200 hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                :class="[
                  preferences.accentColor === color.name ? 'ring-gray-400' : 'ring-transparent',
                  color.class
                ]"
                :title="color.label"
              >
                <CheckIcon v-if="preferences.accentColor === color.name" class="w-5 h-5 mx-auto text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Preferences Section -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <div class="p-2 rounded-xl bg-gradient-to-br from-accent-100 to-accent-200/50 dark:from-accent-900/30 dark:to-accent-800/20">
            <CogIcon class="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </div>
          <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Currency
            </label>
            <select
              v-model="preferences.currency"
              @change="savePreferences"
              class="input"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CHF">CHF (Fr.)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Format
            </label>
            <select
              v-model="preferences.dateFormat"
              @change="savePreferences"
              class="input"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              v-model="preferences.language"
              @change="savePreferences"
              class="input"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    
    <!-- AI Settings -->
    <div class="card p-6">
      <div class="flex items-center space-x-3 mb-6">
        <div class="p-2 rounded-xl bg-gradient-to-br from-primary-100 via-accent-100 to-primary-100 dark:from-primary-900/30 dark:via-accent-900/30 dark:to-primary-900/30">
          <SparklesIcon class="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
          AI Assistant
        </h2>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
        </div>
        
        <div>
          <label class="flex items-center space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              v-model="preferences.autoCategorie"
              @change="savePreferences"
              class="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 focus:ring-2"
            />
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                Auto-categorization
              </span>
              <p class="text-xs text-gray-500 dark:text-gray-400">Let AI categorize transactions automatically</p>
            </div>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Data Management Section -->
    <div class="card p-6 border-2 border-error-200 dark:border-error-800/50">
      <div class="flex items-center space-x-3 mb-6">
        <div class="p-2 rounded-xl bg-gradient-to-br from-error-100 to-error-200/50 dark:from-error-900/30 dark:to-error-800/20">
          <ExclamationTriangleIcon class="w-5 h-5 text-error-600 dark:text-error-400" />
        </div>
        <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
          Data Management
        </h2>
      </div>
      
      <div class="p-4 bg-error-50/50 dark:bg-error-900/10 rounded-xl border border-error-200 dark:border-error-800/50">
        <h3 class="text-sm font-semibold text-error-800 dark:text-error-200 mb-2 flex items-center">
          <ShieldExclamationIcon class="w-4 h-4 mr-2" />
          Danger Zone
        </h3>
        <p class="text-sm text-error-600 dark:text-error-300 mb-4">
          These actions cannot be undone. Please proceed with caution.
        </p>
        
        <div class="flex flex-wrap gap-3">
          <button
            @click="showDeleteConfirmation = true"
            class="btn bg-gradient-to-r from-error-600 to-error-700 text-white hover:from-error-700 hover:to-error-800 shadow-lg shadow-error-500/25"
          >
            <TrashIcon class="w-4 h-4 mr-2" />
            Delete All Transactions
          </button>
          
          <button
            class="btn btn-secondary"
          >
            <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
            Export All Data
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteConfirmation"
          class="fixed inset-0 z-50 overflow-y-auto"
        >
          <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div
              @click="showDeleteConfirmation = false"
              class="fixed inset-0 transition-opacity bg-gray-900/50 backdrop-blur-sm"
            ></div>

            <!-- Modal panel -->
            <div class="inline-block align-bottom glass glass-border rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div class="p-6">
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-error-100 to-error-200/50 dark:from-error-900/30 dark:to-error-800/20 flex items-center justify-center">
                    <ExclamationTriangleIcon class="w-6 h-6 text-error-600 dark:text-error-400" />
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
                      Delete All Transactions
                    </h3>
                    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Are you sure you want to delete all transactions? This action cannot be undone.
                    </p>
                    
                    <div class="mt-4 space-y-3">
                      <label class="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          v-model="includeRawData"
                          class="w-4 h-4 rounded text-error-600 focus:ring-error-500"
                        />
                        <span class="text-sm text-gray-700 dark:text-gray-300">
                          Also delete raw CSV data and uploads
                        </span>
                      </label>
                    </div>
                    
                    <div v-if="deleteStats" class="mt-4 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                      <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        This will delete:
                      </p>
                      <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>• {{ deleteStats.transactions }} transactions</li>
                        <li v-if="includeRawData">• {{ deleteStats.uploads }} upload records</li>
                        <li v-if="includeRawData">• {{ deleteStats.rawLines }} raw CSV lines</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="px-6 pb-6 flex justify-end space-x-3">
                <button
                  @click="showDeleteConfirmation = false"
                  class="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  @click="confirmDelete"
                  :disabled="isDeleting"
                  class="btn bg-gradient-to-r from-error-600 to-error-700 text-white hover:from-error-700 hover:to-error-800 disabled:opacity-50"
                >
                  <span v-if="!isDeleting">Delete Everything</span>
                  <span v-else class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Deleting...
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import {
  PaintBrushIcon,
  CogIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const appStore = useAppStore()
const toast = useToast()

const theme = computed(() => appStore.theme)
const showDeleteConfirmation = ref(false)
const includeRawData = ref(false)
const isDeleting = ref(false)
const deleteStats = ref(null)

const preferences = ref({
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
  language: 'en',
  accentColor: 'primary',
  autoCategorie: true
})

const accentColors = [
  { name: 'primary', label: 'Violet', class: 'bg-gradient-to-br from-primary-500 to-primary-600' },
  { name: 'accent', label: 'Cyan', class: 'bg-gradient-to-br from-accent-500 to-accent-600' },
  { name: 'success', label: 'Green', class: 'bg-gradient-to-br from-success-500 to-success-600' },
  { name: 'warning', label: 'Amber', class: 'bg-gradient-to-br from-warning-500 to-warning-600' },
  { name: 'error', label: 'Red', class: 'bg-gradient-to-br from-error-500 to-error-600' }
]

const setTheme = (newTheme) => {
  appStore.setTheme(newTheme)
  toast.success(`Theme changed to ${newTheme}`)
}

const savePreferences = () => {
  localStorage.setItem('userPreferences', JSON.stringify(preferences.value))
  toast.success('Preferences saved')
}

const loadPreferences = () => {
  const saved = localStorage.getItem('userPreferences')
  if (saved) {
    preferences.value = { ...preferences.value, ...JSON.parse(saved) }
  }
}

const fetchDeleteStats = async () => {
  try {
    const response = await axios.get('/api/transactions/stats')
    deleteStats.value = response.data
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

const confirmDelete = async () => {
  isDeleting.value = true
  try {
    await axios.delete('/api/transactions/all', {
      params: { includeRawData: includeRawData.value }
    })
    toast.success('All data has been deleted')
    showDeleteConfirmation.value = false
    // Optionally refresh the page or redirect
    setTimeout(() => {
      window.location.href = '/'
    }, 1500)
  } catch (error) {
    console.error('Delete failed:', error)
    toast.error('Failed to delete data')
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  loadPreferences()
  if (showDeleteConfirmation.value) {
    fetchDeleteStats()
  }
})
</script>