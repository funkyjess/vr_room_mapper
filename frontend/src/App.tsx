import { useState } from 'react'
import PhotoUpload from './components/PhotoUpload'
import PerimeterEditor from './components/PerimeterEditor'
import RoomPreview from './components/RoomPreview'
import ChaperoneExport from './components/ChaperoneExport'
import { Photo, ChaperoneConfig } from './types'

function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [generatedConfig, setGeneratedConfig] = useState<ChaperoneConfig | null>(null)
  const [step, setStep] = useState<'upload' | 'annotate' | 'preview' | 'export'>('upload')

  const handlePhotosUploaded = (newPhotos: Photo[]) => {
    setPhotos(newPhotos)
    setStep('annotate')
    if (newPhotos.length > 0) {
      setActivePhotoId(newPhotos[0].id)
    }
  }

  const handlePerimeterUpdate = (photoId: string, points: { x: number; y: number }[]) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, perimeterPoints: points } : p
    ))
  }

  const handleGenerateChaperone = async () => {
    // TODO: Call backend to process photos and generate chaperone
    setStep('preview')
  }

  return (
    <div className="min-h-screen bg-steam-darker">
      <header className="bg-steam-dark border-b border-steam-gray px-6 py-4">
        <h1 className="text-2xl font-bold text-steam-blue flex items-center gap-3">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          SteamVR Room Perimeter Mapper
        </h1>
        <p className="text-steam-light text-sm mt-1">
          Draw your room perimeter on photos, then interpolate for accurate chaperone bounds
        </p>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { id: 'upload', label: '1. Upload Photos' },
            { id: 'annotate', label: '2. Draw Perimeters' },
            { id: 'preview', label: '3. Preview 3D' },
            { id: 'export', label: '4. Export to SteamVR' },
          ].map((s, i) => (
            <div key={s.id} className={`flex items-center gap-2 ${step === s.id ? 'text-steam-blue' : 'text-steam-light opacity-50'}`}>
              <span className="font-semibold">{s.label}</span>
              {i < 3 && <span className="text-steam-gray">→</span>}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 'upload' && (
          <PhotoUpload onPhotosUploaded={handlePhotosUploaded} />
        )}

        {step === 'annotate' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              {/* Photo Thumbnails */}
              <div className="w-48 flex-shrink-0 space-y-2">
                <h3 className="font-semibold text-steam-light">Photos ({photos.length})</h3>
                {photos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setActivePhotoId(photo.id)}
                    className={`w-full text-left p-2 rounded border-2 transition-colors ${
                      activePhotoId === photo.id 
                        ? 'border-steam-blue bg-steam-gray' 
                        : 'border-transparent hover:bg-steam-gray'
                    }`}
                  >
                    <img 
                      src={photo.url} 
                      alt="Thumbnail" 
                      className="w-full h-20 object-cover rounded mb-1"
                    />
                    <div className="text-xs text-steam-light truncate">
                      {photo.file.name}
                    </div>
                    <div className="text-xs text-steam-blue">
                      {photo.perimeterPoints.length} points
                    </div>
                  </button>
                ))}
              </div>

              {/* Perimeter Editor */}
              <div className="flex-1">
                {activePhotoId && (
                  <PerimeterEditor
                    photo={photos.find(p => p.id === activePhotoId)!}
                    onPerimeterUpdate={(points) => handlePerimeterUpdate(activePhotoId, points)}
                  />
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-steam-gray">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded bg-steam-gray hover:bg-steam-gray/80 text-steam-light"
              >
                ← Back to Upload
              </button>
              <button
                onClick={handleGenerateChaperone}
                disabled={photos.every(p => p.perimeterPoints.length < 3)}
                className="px-6 py-2 rounded bg-steam-blue hover:bg-steam-blue/80 text-steam-darker font-semibold disabled:opacity-50"
              >
                Generate 3D Preview →
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <RoomPreview photos={photos} />
            <div className="flex justify-between">
              <button
                onClick={() => setStep('annotate')}
                className="px-4 py-2 rounded bg-steam-gray hover:bg-steam-gray/80 text-steam-light"
              >
                ← Refine Annotations
              </button>
              <button
                onClick={() => setStep('export')}
                className="px-6 py-2 rounded bg-steam-blue hover:bg-steam-blue/80 text-steam-darker font-semibold"
              >
                Export to SteamVR →
              </button>
            </div>
          </div>
        )}

        {step === 'export' && (
          <ChaperoneExport photos={photos} />
        )}
      </main>
    </div>
  )
}

export default App
