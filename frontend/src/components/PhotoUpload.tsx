import { useState, useCallback } from 'react'
import { Photo } from '../types'
import { uploadPhotos } from '../utils/api'
import { CONFIG } from '../config'

interface PhotoUploadProps {
  onPhotosUploaded: (photos: Photo[]) => void
}

export default function PhotoUpload({ onPhotosUploaded }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([])
  const [error, setError] = useState<string | null>(null)

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    )

    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }

    if (imageFiles.length > CONFIG.MAX_PHOTOS) {
      alert(`Maximum ${CONFIG.MAX_PHOTOS} photos allowed`)
      return
    }

    // Create local preview objects
    const newPhotos: Photo[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      perimeterPoints: [],
      status: 'uploading',
      progress: 0,
    }))

    setUploadingPhotos(newPhotos)

    try {
      // Actually upload to backend
      const data = await uploadPhotos(files)
      
      // Update with server response
      const serverPhotos: Photo[] = data.photos.map((p: any, idx: number) => ({
        id: p.id,
        file: imageFiles[idx],
        url: newPhotos[idx].url, // Keep local preview
        serverUrl: p.url,
        path: p.path,
        perimeterPoints: [],
        status: 'annotating',
        progress: 100,
      }))

      setUploadingPhotos([])
      onPhotosUploaded(serverPhotos)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setUploadingPhotos(prev => prev.map(p => ({ ...p, status: 'error' })))
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging 
            ? 'border-steam-blue bg-steam-blue/10' 
            : 'border-steam-gray hover:border-steam-light'
        }`}
      >
        <div className="space-y-4">
          <svg 
            className="w-16 h-16 mx-auto text-steam-gray" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          
          <div>
            <p className="text-lg text-steam-light">
              Drag and drop 1-6 photos of your room
            </p>
            <p className="text-sm text-steam-gray mt-1">
              Take photos from different corners to improve accuracy
            </p>
          </div>

          <div>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="px-6 py-2 bg-steam-blue hover:bg-steam-blue/80 text-steam-darker font-semibold rounded cursor-pointer transition-colors">
                Select Files
              </span>
            </label>
          </div>
        </div>
      </div>

      {uploadingPhotos.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-steam-light">Uploading...</h3>
          {uploadingPhotos.map(photo => (
            <div key={photo.id} className="bg-steam-dark rounded p-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-steam-gray rounded flex items-center justify-center text-xs text-steam-light">
                IMG
              </div>
              <div className="flex-1">
                <p className="text-sm text-steam-light truncate">{photo.file.name}</p>
                <div className="w-full bg-steam-gray rounded-full h-2 mt-1">
                  <div 
                    className="bg-steam-blue h-2 rounded-full transition-all"
                    style={{ width: `${photo.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-steam-blue">{photo.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-400">
          <p className="font-semibold">Upload failed</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">Check that backend is running on {window.location.hostname}:8000</p>
        </div>
      )}

      <div className="bg-steam-gray/30 rounded p-4 text-sm text-steam-light">
        <h4 className="font-semibold mb-2">Tips for best results:</h4>
        <ul className="list-disc list-inside space-y-1 text-steam-light/80">
          <li>Take photos from each corner of the room (2-4 photos recommended)</li>
          <li>Include the floor and walls clearly in each shot</li>
          <li>Keep the camera level (not tilted up/down)</li>
          <li>Good lighting helps with accurate detection</li>
          <li>Stand in the corner and face the opposite corner for each photo</li>
        </ul>
      </div>
    </div>
  )
}
