import { useState, useEffect } from 'react'
import { Photo, ChaperoneConfig } from '../types'
import { api } from '../utils/api'
import { CONFIG } from '../config'

interface ChaperoneExportProps {
  photos: Photo[]
}

export default function ChaperoneExport({ photos }: ChaperoneExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [config, setConfig] = useState<ChaperoneConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [steamvrDetected, setSteamvrDetected] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)

  useEffect(() => {
    checkSteamVR()
  }, [])

  const checkSteamVR = async () => {
    try {
      const response = await api.get('/api/steamvr/status')
      setSteamvrDetected(response.data.detected)
    } catch {
      // Backend not ready, assume manual mode
      setSteamvrDetected(false)
    }
  }

  const generateChaperone = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // TODO: Call backend to generate chaperone config from photos
      const mockConfig: ChaperoneConfig = {
        version: 5,
        universes: [
          {
            collision_bounds: [
              [[-2, 0, -2], [-2, 2.43, -2], [2, 2.43, -2], [2, 0, -2]],
              [[2, 0, -2], [2, 2.43, -2], [2, 2.43, 2], [2, 0, 2]],
              [[2, 0, 2], [2, 2.43, 2], [-2, 2.43, 2], [-2, 0, 2]],
              [[-2, 0, 2], [-2, 2.43, 2], [-2, 2.43, -2], [-2, 0, -2]],
            ],
            play_area: [3.2, 1.7],
            seated: {
              translation: [0, 0, 0],
              yaw: 0,
            },
            standing: {
              translation: [0, 0, 0],
              yaw: 0,
            },
            time: new Date().toISOString(),
            universeID: Date.now().toString(),
          },
        ],
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setConfig(mockConfig)
    } catch (err) {
      setError('Failed to generate chaperone configuration. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadConfig = () => {
    if (!config) return

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chaperone_info.vrchap'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const applyToSteamVR = async () => {
    if (!config) return

    try {
      await api.post('/api/steamvr/apply', config)
      setApplySuccess(true)
      setTimeout(() => setApplySuccess(false), 3000)
    } catch (err: any) {
      const backendError = err.response?.data?.detail || err.message
      setError(backendError || 'Failed to apply to SteamVR. You may need to manually copy the file.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-steam-dark rounded-lg p-6">
        <h2 className="text-xl font-semibold text-steam-light mb-4">
          Export to SteamVR
        </h2>

        {!config ? (
          <div className="text-center py-8">
            <p className="text-steam-light mb-4">
              Generate the chaperone configuration file from your {photos.length} annotated photos
            </p>
            <button
              onClick={generateChaperone}
              disabled={isGenerating}
              className="px-6 py-3 bg-steam-blue hover:bg-steam-blue/80 text-steam-darker font-semibold rounded disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Chaperone Config'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-steam-gray/30 rounded p-4">
              <h3 className="font-semibold text-steam-light mb-2">Configuration Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-steam-gray">Universe ID:</span>
                  <span className="text-steam-light ml-2 font-mono">
                    {config.universes[0].universeID}
                  </span>
                </div>
                <div>
                  <span className="text-steam-gray">Play Area:</span>
                  <span className="text-steam-light ml-2">
                    {config.universes[0].play_area[0]}m × {config.universes[0].play_area[1]}m
                  </span>
                </div>
                <div>
                  <span className="text-steam-gray">Wall Segments:</span>
                  <span className="text-steam-light ml-2">
                    {config.universes[0].collision_bounds.length}
                  </span>
                </div>
                <div>
                  <span className="text-steam-gray">Version:</span>
                  <span className="text-steam-light ml-2">{config.version}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={downloadConfig}
                className="flex-1 px-4 py-2 bg-steam-gray hover:bg-steam-gray/80 text-steam-light rounded font-medium"
              >
                Download .vrchap File
              </button>

              {steamvrDetected ? (
                <button
                  onClick={applyToSteamVR}
                  className={`flex-1 px-4 py-2 rounded font-medium ${
                    applySuccess 
                      ? 'bg-green-500 text-white' 
                      : 'bg-steam-blue hover:bg-steam-blue/80 text-steam-darker'
                  }`}
                >
                  {applySuccess ? '✓ Applied to SteamVR' : 'Apply to SteamVR'}
                </button>
              ) : (
                <div className="flex-1 px-4 py-2 bg-steam-gray/50 text-steam-gray rounded text-center text-sm">
                  SteamVR not detected
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="bg-steam-gray/30 rounded p-4 text-sm text-steam-light/80">
        <h4 className="font-semibold text-steam-light mb-2">Manual Installation:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Download the <code className="bg-steam-dark px-1 rounded">chaperone_info.vrchap</code> file</li>
          <li>Close SteamVR completely (check system tray)</li>
          <li>Navigate to: <code className="bg-steam-dark px-1 rounded">{CONFIG.STEAMVR_CONFIG_PATH}</code></li>
          <li>Backup the existing <code className="bg-steam-dark px-1 rounded">chaperone_info.vrchap</code> file</li>
          <li>Copy the new file to the config folder</li>
          <li>Restart SteamVR</li>
        </ol>
        <p className="mt-2 text-steam-gray">
          Note: You may need to run Room Setup in SteamVR if the new bounds don't appear immediately.
        </p>
      </div>
    </div>
  )
}
