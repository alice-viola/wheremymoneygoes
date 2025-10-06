import { defineStore } from 'pinia'
import { uploadsApi } from '@/services/api/uploads'
import { UPLOAD_STATUS } from '@/utils/constants'
import { useAccountsStore } from './accounts'

export const useUploadsStore = defineStore('uploads', {
  state: () => ({
    uploads: [],
    currentUpload: null,
    uploadProgress: {
      phase: null,
      processed: 0,
      total: 0,
      percentage: 0,
      message: ''
    },
    isUploading: false,
    isProcessing: false
  }),
  
  getters: {
    recentUploads: (state) => state.uploads.slice(0, 5),
    completedUploads: (state) => state.uploads.filter(u => u.status === UPLOAD_STATUS.COMPLETED),
    failedUploads: (state) => state.uploads.filter(u => u.status === UPLOAD_STATUS.FAILED),
    processingUploads: (state) => state.uploads.filter(u => u.status === UPLOAD_STATUS.PROCESSING)
  },
  
  actions: {
    async fetchUploads() {
      try {
        const response = await uploadsApi.getUserUploads()
        this.uploads = response.data || []  // response is already unwrapped
        return this.uploads
      } catch (error) {
        console.error('Failed to fetch uploads:', error)
        throw error
      }
    },
    
    async uploadFile(file, userId) {
      this.isUploading = true
      this.uploadProgress = {
        phase: 'uploading',
        processed: 0,
        total: 100,
        percentage: 0,
        message: 'Uploading file...'
      }
      
      // Get selected account from accounts store
      const accountsStore = useAccountsStore()
      const accountId = accountsStore.selectedAccountId === 'all' 
        ? accountsStore.defaultAccountId 
        : accountsStore.selectedAccountId
      
      try {
        const response = await uploadsApi.uploadFile(file, userId, accountId)
        this.currentUpload = response.data  // response is already unwrapped
        this.uploads.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Upload failed:', error)
        throw error
      } finally {
        this.isUploading = false
      }
    },
    
    updateUploadProgress(data) {
      if (data.uploadId === this.currentUpload?.id) {
        this.uploadProgress = {
          ...this.uploadProgress,
          ...data
        }
        
        if (data.percentage) {
          this.uploadProgress.percentage = data.percentage
        } else if (data.processed && data.total) {
          this.uploadProgress.percentage = Math.round((data.processed / data.total) * 100)
        }
      }
    },
    
    updateUploadStatus(uploadId, status) {
      const upload = this.uploads.find(u => u.id === uploadId)
      if (upload) {
        upload.status = status
      }
      
      if (this.currentUpload?.id === uploadId) {
        this.currentUpload.status = status
      }
      
      if (status === UPLOAD_STATUS.COMPLETED || status === UPLOAD_STATUS.FAILED) {
        this.isProcessing = false
      }
    },
    
    async resumeUpload(uploadId, userId) {
      try {
        await uploadsApi.resumeProcessing(uploadId, userId)
        this.updateUploadStatus(uploadId, UPLOAD_STATUS.PROCESSING)
        return true
      } catch (error) {
        console.error('Failed to resume upload:', error)
        throw error
      }
    },
    
    async deleteUpload(uploadId) {
      try {
        await uploadsApi.deleteUpload(uploadId)
        this.uploads = this.uploads.filter(u => u.id !== uploadId)
        if (this.currentUpload?.id === uploadId) {
          this.currentUpload = null
        }
        return true
      } catch (error) {
        console.error('Failed to delete upload:', error)
        throw error
      }
    },
    
    clearCurrentUpload() {
      this.currentUpload = null
      this.uploadProgress = {
        phase: null,
        processed: 0,
        total: 0,
        percentage: 0,
        message: ''
      }
      this.isProcessing = false
    }
  }
})
