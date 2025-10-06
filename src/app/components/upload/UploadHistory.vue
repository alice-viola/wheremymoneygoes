<template>
  <div class="space-y-4">
    <div
      v-for="upload in uploads"
      :key="upload.id"
      class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center space-x-3">
            <div :class="getStatusIcon(upload.status)">
              <component :is="getStatusIconComponent(upload.status)" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ upload.filename }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(upload.created_at) }} • {{ upload.total_lines }} lines
              </p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="getStatusBadgeClass(upload.status)"
          >
            {{ formatUploadStatus(upload.status) }}
          </span>
          
          <div class="flex items-center space-x-1">
            <button
              v-if="upload.status === 'failed' || upload.status === 'partial'"
              @click="$emit('resume', upload.id)"
              class="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="Resume processing"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              @click="$emit('delete', upload.id)"
              class="p-1.5 text-gray-500 hover:text-error-600 dark:hover:text-error-400 transition-colors"
              title="Delete upload"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="upload.processed_lines > 0" class="mt-3">
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Processed: {{ upload.processed_lines }}/{{ upload.total_lines }}</span>
          <span>{{ Math.round((upload.processed_lines / upload.total_lines) * 100) }}%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            class="h-full rounded-full"
            :class="upload.status === 'completed' ? 'bg-success-500' : 'bg-primary-500'"
            :style="{ width: `${(upload.processed_lines / upload.total_lines) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/solid'
import { formatDate, formatUploadStatus } from '@/utils/formatters'

defineProps({
  uploads: {
    type: Array,
    default: () => []
  }
})

defineEmits(['resume', 'delete'])

const getStatusIcon = (status) => {
  const classes = {
    completed: 'text-success-500',
    failed: 'text-error-500',
    processing: 'text-primary-500',
    pending: 'text-gray-400',
    partial: 'text-warning-500'
  }
  return classes[status] || 'text-gray-400'
}

const getStatusIconComponent = (status) => {
  const icons = {
    completed: CheckCircleIcon,
    failed: XCircleIcon,
    processing: ArrowPathIcon,
    pending: ClockIcon,
    partial: ExclamationTriangleIcon
  }
  return icons[status] || ClockIcon
}

const getStatusBadgeClass = (status) => {
  const classes = {
    completed: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    failed: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
    processing: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  }
  return classes[status] || classes.pending
}
</script>
