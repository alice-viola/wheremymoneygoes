<template>
  <div class="w-full">
    <div
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      @dragleave="isDragging = false"
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center transition-all',
        isDragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
      ]"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        @change="handleFileSelect"
        class="hidden"
      >
      
      <div v-if="!selectedFile" class="space-y-4">
        <div class="mx-auto w-16 h-16 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <div>
          <p class="text-lg font-medium text-gray-900 dark:text-white">
            Drop your CSV file here
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            or click to browse
          </p>
        </div>
        
        <button
          @click="$refs.fileInput.click()"
          class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Select File
        </button>
        
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Maximum file size: 10MB
        </p>
      </div>
      
      <div v-else class="space-y-4">
        <div class="mx-auto w-16 h-16 text-success-500">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        
        <div>
          <p class="text-lg font-medium text-gray-900 dark:text-white">
            {{ selectedFile.name }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ formatFileSize(selectedFile.size) }} • Ready to upload
          </p>
        </div>
        
        <div class="flex justify-center space-x-4">
          <button
            @click="handleUpload"
            :disabled="isUploading"
            class="px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isUploading">Start Upload</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          </button>
          
          <button
            @click="clearFile"
            :disabled="isUploading"
            class="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Choose Another
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { formatFileSize } from '@/utils/formatters'
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/utils/constants'

const emit = defineEmits(['file-selected', 'upload-start'])

const toast = useToast()
const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)
const isUploading = ref(false)

const validateFile = (file) => {
  if (!file) return false
  
  // Check file type
  const fileType = file.type || ''
  const fileName = file.name || ''
  const isCSV = ALLOWED_FILE_TYPES.some(type => 
    fileType === type || fileName.endsWith('.csv')
  )
  
  if (!isCSV) {
    toast.error('Please select a CSV file')
    return false
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`)
    return false
  }
  
  return true
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (validateFile(file)) {
      selectedFile.value = file
      emit('file-selected', file)
    }
  }
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    const file = files[0]
    if (validateFile(file)) {
      selectedFile.value = file
      emit('file-selected', file)
    }
  }
}

const handleUpload = () => {
  if (selectedFile.value && !isUploading.value) {
    isUploading.value = true
    emit('upload-start', selectedFile.value)
  }
}

const clearFile = () => {
  selectedFile.value = null
  isUploading.value = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Expose methods for parent component
defineExpose({
  clearFile,
  setUploading: (value) => { isUploading.value = value }
})
</script>
