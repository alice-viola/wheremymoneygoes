<template>
  <div class="space-y-6">
    <!-- Gradient mesh background decoration -->
    <div class="fixed top-0 left-0 right-0 h-96 gradient-mesh-subtle pointer-events-none opacity-20"></div>
    
    <!-- Page Header with AI emphasis -->
    <div class="relative card p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-display font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <span>Upload CSV File</span>
            <div class="inline-flex items-center px-2 py-0.5 rounded-lg bg-gradient-to-r from-primary-500/10 to-accent-500/10">
              <SparklesIcon class="w-4 h-4 text-primary-500 mr-1" />
              <span class="text-xs font-medium gradient-text">AI-Powered</span>
            </div>
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Upload your bank statement and let our AI categorize your transactions automatically
          </p>
        </div>
        
        <!-- Info Button -->
        <button class="p-2 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200">
          <InformationCircleIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
    
    <!-- Upload Section -->
    <div v-if="!isProcessing && !processingComplete">
      <!-- Enhanced File Uploader -->
      <FileUploader
        ref="fileUploader"
        @file-selected="handleFileSelected"
        @upload-start="handleUploadStart"
      />
      
      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="card p-4 group hover:scale-105 transition-transform">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200/50 dark:from-primary-900/30 dark:to-primary-800/20 group-hover:scale-110 transition-transform">
              <ShieldCheckIcon class="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Secure & Private</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">End-to-end encryption</p>
            </div>
          </div>
        </div>
        
        <div class="card p-4 group hover:scale-105 transition-transform">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-xl bg-gradient-to-br from-accent-100 to-accent-200/50 dark:from-accent-900/30 dark:to-accent-800/20 group-hover:scale-110 transition-transform">
              <BoltIcon class="w-5 h-5 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Lightning Fast</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Process thousands instantly</p>
            </div>
          </div>
        </div>
        
        <div class="card p-4 group hover:scale-105 transition-transform">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-xl bg-gradient-to-br from-success-100 to-success-200/50 dark:from-success-900/30 dark:to-success-800/20 group-hover:scale-110 transition-transform">
              <ChartBarIcon class="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Smart Analytics</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI-powered categorization</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Uploads -->
      <div v-if="recentUploads.length > 0" class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-display font-semibold text-gray-900 dark:text-white">
            Recent Uploads
          </h2>
          <button class="text-sm font-medium gradient-text hover:opacity-80 transition-opacity">
            View all history →
          </button>
        </div>
        <UploadHistory :uploads="recentUploads" @resume="handleResume" @delete="handleDelete" />
      </div>
    </div>
    
    <!-- Processing Section with enhanced UI -->
    <div v-else-if="isProcessing">
      <UploadProgress
        ref="uploadProgress"
        :progress="uploadProgressData"
        :show-log="true"
      />
      
      <div class="mt-6 flex justify-center">
        <button
          @click="handleCancel"
          class="btn btn-secondary flex items-center space-x-2"
        >
          <XMarkIcon class="w-5 h-5" />
          <span>Cancel Processing</span>
        </button>
      </div>
    </div>
    
    <!-- Completion Section with celebration -->
    <div v-else-if="processingComplete">
      <ProcessingComplete
        :statistics="completionStats"
        @view-transactions="handleViewTransactions"
        @upload-another="handleUploadAnother"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'
import { useUploadsStore } from '@/stores/uploads'
import { useAppStore } from '@/stores/app'
import wsService from '@/services/websocket'
import { WS_EVENTS, TEST_USER_ID } from '@/utils/constants'
import {
  SparklesIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

import FileUploader from '@/components/upload/FileUploader.vue'
import UploadProgress from '@/components/upload/UploadProgress.vue'
import UploadHistory from '@/components/upload/UploadHistory.vue'
import ProcessingComplete from '@/components/upload/ProcessingComplete.vue'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const uploadsStore = useUploadsStore()
const appStore = useAppStore()

const fileUploader = ref(null)
const uploadProgress = ref(null)
const selectedFile = ref(null)
const isProcessing = ref(false)
const processingComplete = ref(false)
const completionStats = ref(null)

const recentUploads = computed(() => uploadsStore.recentUploads)
const uploadProgressData = computed(() => uploadsStore.uploadProgress)

// WebSocket event handlers
const wsHandlers = {
  [WS_EVENTS.UPLOAD_STARTED]: (data) => {
    uploadProgress.value?.addLog('Upload started', 'info')
    uploadProgress.value?.updateStepStatus('upload', 'processing')
  },
  
  [WS_EVENTS.LINES_STORED]: (data) => {
    uploadProgress.value?.addLog(`Stored ${data.totalLines} CSV lines`, 'success')
    uploadProgress.value?.updateStepStatus('upload', 'completed')
    uploadProgress.value?.updateStepStatus('store', 'completed', `${data.totalLines} lines`)
  },
  
  [WS_EVENTS.SEPARATOR_DETECTED]: (data) => {
    uploadProgress.value?.addLog(`Detected separator: "${data.separator}" (confidence: ${data.confidence})`, 'success')
    uploadProgress.value?.updateStepStatus('detect', 'completed', `Separator: ${data.separator}`)
  },
  
  [WS_EVENTS.MAPPING_DETECTED]: (data) => {
    uploadProgress.value?.addLog(`Detected ${data.fieldCount} field mappings`, 'success')
    uploadProgress.value?.updateStepStatus('mapping', 'completed', `${data.fieldCount} fields`)
  },
  
  [WS_EVENTS.UPLOAD_PROGRESS]: (data) => {
    uploadsStore.updateUploadProgress(data)
    
    if (data.phase === 'categorizing') {
      uploadProgress.value?.updateStepStatus('transform', 'completed')
      uploadProgress.value?.updateStepStatus('categorize', 'processing', 
        `${data.processed}/${data.total} transactions`)
    }
  },
  
  [WS_EVENTS.CATEGORIZE_PROGRESS]: (data) => {
    uploadProgress.value?.addLog(
      `Categorized batch: ${data.processed}/${data.total} (${data.percentage}%)`,
      'info'
    )
  },
  
  [WS_EVENTS.UPLOAD_COMPLETED]: (data) => {
    uploadProgress.value?.updateStepStatus('categorize', 'completed')
    uploadProgress.value?.updateStepStatus('save', 'completed')
    uploadProgress.value?.addLog('Processing completed successfully!', 'success')
    
    completionStats.value = data.statistics
    isProcessing.value = false
    processingComplete.value = true
    
    toast.success('CSV file processed successfully!')
    appStore.addNotification({
      type: 'ai',
      title: 'Upload Complete',
      message: `Successfully processed ${data.statistics?.total_transactions || 0} transactions with AI categorization`
    })
    
    uploadsStore.updateUploadStatus(data.uploadId, 'completed')
  },
  
  [WS_EVENTS.UPLOAD_FAILED]: (data) => {
    const failedStep = uploadsStore.uploadProgress.phase || 'upload'
    uploadProgress.value?.updateStepStatus(failedStep, 'error')
    uploadProgress.value?.addLog(`Error: ${data.error}`, 'error')
    
    isProcessing.value = false
    toast.error(data.error || 'Upload failed')
    appStore.addNotification({
      type: 'error',
      title: 'Upload Failed',
      message: data.error || 'An error occurred during processing'
    })
    
    if (data.uploadId) {
      uploadsStore.updateUploadStatus(data.uploadId, 'failed')
    }
  }
}

const handleFileSelected = (file) => {
  selectedFile.value = file
}

const handleUploadStart = async () => {
  if (!selectedFile.value) return
  
  isProcessing.value = true
  processingComplete.value = false
  completionStats.value = null
  
  try {
    const userId = userStore.userId || TEST_USER_ID
    await uploadsStore.uploadFile(selectedFile.value, userId)
  } catch (error) {
    console.error('Upload error:', error)
    isProcessing.value = false
    toast.error(error.message || 'Failed to upload file')
  }
}

const handleCancel = async () => {
  try {
    await uploadsStore.cancelUpload()
    isProcessing.value = false
    selectedFile.value = null
    toast.info('Upload cancelled')
  } catch (error) {
    console.error('Cancel error:', error)
    toast.error('Failed to cancel upload')
  }
}

const handleViewTransactions = () => {
  router.push('/transactions')
}

const handleUploadAnother = () => {
  processingComplete.value = false
  completionStats.value = null
  selectedFile.value = null
  fileUploader.value?.reset()
}

const handleResume = async (uploadId) => {
  try {
    const userId = userStore.userId || TEST_USER_ID
    await uploadsStore.resumeUpload(uploadId, userId)
    isProcessing.value = true
  } catch (error) {
    console.error('Resume error:', error)
    toast.error('Failed to resume upload')
  }
}

const handleDelete = async (uploadId) => {
  try {
    const userId = userStore.userId || TEST_USER_ID
    await uploadsStore.deleteUpload(uploadId)
    toast.success('Upload deleted')
  } catch (error) {
    console.error('Delete error:', error)
    toast.error('Failed to delete upload')
  }
}

onMounted(() => {
  // Register WebSocket handlers
  Object.entries(wsHandlers).forEach(([event, handler]) => {
    wsService.on(event, handler)
  })
  
  // Load recent uploads
  const userId = userStore.userId || 'default-user'
  uploadsStore.fetchUploads()
  
  // Connect WebSocket if not connected
  if (!wsService.isConnected.value) {
    wsService.connect(userStore.userId)
  }
})

onUnmounted(() => {
  // Unregister WebSocket handlers
  Object.entries(wsHandlers).forEach(([event, handler]) => {
    wsService.off(event, handler)
  })
})
</script>