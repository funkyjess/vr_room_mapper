import axios from 'axios'
import { CONFIG } from '../config'

export const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 30000,
})

export const uploadPhotos = async (files: FileList) => {
  const formData = new FormData()
  Array.from(files).forEach(file => {
    formData.append('files', file)
  })
  
  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = progressEvent.total
        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
        : 0
      console.log('Upload progress:', percentCompleted)
    },
  })
  
  return response.data
}
