<template>
  <div class="w-full space-y-6">
    <!-- Overall Progress -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Processing Progress
        </h3>
        <span class="text-sm font-medium text-primary-600 dark:text-primary-400">
          {{ progress.percentage }}%
        </span>
      </div>
      
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
          :style="{ width: `${progress.percentage}%` }"
        >
          <div class="h-full bg-white/20 animate-pulse"></div>
        </div>
      </div>
      
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {{ progress.message || 'Processing...' }}
      </p>
    </div>
    
    <!-- Processing Steps -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Processing Steps
      </h3>
      
      <div class="space-y-3">
        <div
          v-for="step in processingSteps"
          :key="step.id"
          class="flex items-center space-x-3"
        >
          <div class="flex-shrink-0">
            <div
              v-if="step.status === 'completed'"
              class="w-8 h-8 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center"
            >
              <svg class="w-5 h-5 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div
              v-else-if="step.status === 'processing'"
              class="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center"
            >
              <svg class="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div
              v-else-if="step.status === 'failed'"
              class="w-8 h-8 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center"
            >
              <svg class="w-5 h-5 text-error-600 dark:text-error-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
            <div
              v-else
              class="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
            >
              <div class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
          </div>
          
          <div class="flex-1">
            <p
              class="text-sm font-medium"
              :class="{
                'text-gray-900 dark:text-white': step.status === 'completed' || step.status === 'processing',
                'text-gray-500 dark:text-gray-400': step.status === 'pending',
                'text-error-600 dark:text-error-400': step.status === 'failed'
              }"
            >
              {{ step.label }}
            </p>
            <p
              v-if="step.detail"
              class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
            >
              {{ step.detail }}
            </p>
          </div>
          
          <div
            v-if="step.time"
            class="text-xs text-gray-400 dark:text-gray-500"
          >
            {{ step.time }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Live Log -->
    <div
      v-if="showLog && logs.length > 0"
      class="bg-gray-900 rounded-lg p-4 shadow-sm"
    >
      <h3 class="text-sm font-semibold text-gray-300 mb-3">
        Processing Log
      </h3>
      <div class="space-y-1 font-mono text-xs text-gray-400 max-h-40 overflow-y-auto scrollbar-thin">
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="flex items-start space-x-2"
        >
          <span class="text-gray-600">{{ formatLogTime(log.timestamp) }}</span>
          <span :class="getLogClass(log.level)">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { format } from 'date-fns'

const props = defineProps({
  progress: {
    type: Object,
    default: () => ({
      phase: null,
      processed: 0,
      total: 0,
      percentage: 0,
      message: ''
    })
  },
  showLog: {
    type: Boolean,
    default: false
  }
})

const logs = ref([])

const processingSteps = ref([
  { id: 'upload', label: 'File Upload', status: 'pending', detail: null, time: null },
  { id: 'store', label: 'Store CSV Lines', status: 'pending', detail: null, time: null },
  { id: 'detect', label: 'Detect Separator', status: 'pending', detail: null, time: null },
  { id: 'mapping', label: 'Detect Field Mappings', status: 'pending', detail: null, time: null },
  { id: 'transform', label: 'Transform Data', status: 'pending', detail: null, time: null },
  { id: 'categorize', label: 'AI Categorization', status: 'pending', detail: null, time: null },
  { id: 'save', label: 'Save to Database', status: 'pending', detail: null, time: null }
])

// Update steps based on progress phase
watch(() => props.progress?.phase, (newPhase) => {
  if (!newPhase) return;
  
  const phaseToStep = {
    'uploading': 'upload',
    'storing': 'store',
    'detecting': 'detect',
    'mapping': 'mapping',
    'transforming': 'transform',
    'categorizing': 'categorize',
    'saving': 'save'
  }
  
  const currentStepId = phaseToStep[newPhase]
  if (currentStepId) {
    updateStepStatus(currentStepId, 'processing')
    
    // Mark previous steps as completed
    const stepIndex = processingSteps.value.findIndex(s => s.id === currentStepId)
    processingSteps.value.forEach((step, index) => {
      if (index < stepIndex && step.status !== 'failed') {
        step.status = 'completed'
        if (!step.time) {
          step.time = format(new Date(), 'HH:mm:ss')
        }
      }
    })
  }
})

const updateStepStatus = (stepId, status, detail = null) => {
  const step = processingSteps.value.find(s => s.id === stepId)
  if (step) {
    step.status = status
    if (detail) step.detail = detail
    if (status === 'completed' || status === 'failed') {
      step.time = format(new Date(), 'HH:mm:ss')
    }
  }
}

const addLog = (message, level = 'info') => {
  logs.value.push({
    timestamp: new Date(),
    message,
    level
  })
  
  // Keep only last 100 logs
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(-100)
  }
}

const formatLogTime = (timestamp) => {
  return format(timestamp, 'HH:mm:ss.SSS')
}

const getLogClass = (level) => {
  const classes = {
    info: 'text-gray-400',
    success: 'text-success-400',
    warning: 'text-yellow-400',
    error: 'text-error-400'
  }
  return classes[level] || 'text-gray-400'
}

// Expose methods for parent component
defineExpose({
  updateStepStatus,
  addLog,
  reset: () => {
    processingSteps.value.forEach(step => {
      step.status = 'pending'
      step.detail = null
      step.time = null
    })
    logs.value = []
  }
})
</script>
