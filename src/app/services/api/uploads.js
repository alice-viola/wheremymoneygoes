import apiClient from './client'

export const uploadsApi = {
  // Upload CSV file
  async uploadFile(file, accountId) {
    const formData = new FormData()
    formData.append('file', file)
    if (accountId && accountId !== 'all') {
      formData.append('accountId', accountId)
    }
    
    return apiClient.post('/api/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  // Get user uploads
  async getUserUploads(params = {}) {
    return apiClient.get('/api/uploads', { params })
  },
  
  // Get upload details
  async getUploadDetails(uploadId) {
    return apiClient.get(`/api/uploads/${uploadId}`)
  },
  
  // Resume processing
  async resumeProcessing(uploadId) {
    return apiClient.post(`/api/uploads/${uploadId}/resume`)
  },
  
  // Delete upload
  async deleteUpload(uploadId) {
    return apiClient.delete(`/api/uploads/${uploadId}`)
  }
}
