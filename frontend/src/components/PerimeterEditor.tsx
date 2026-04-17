import { useState, useRef, useCallback, useEffect } from 'react'
import { Photo, Point2D } from '../types'

interface PerimeterEditorProps {
  photo: Photo
  onPerimeterUpdate: (points: Point2D[]) => void
}

type EditMode = 'add' | 'move' | 'delete'

export default function PerimeterEditor({ photo, onPerimeterUpdate }: PerimeterEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [points, setPoints] = useState<Point2D[]>(photo.perimeterPoints)
  const [mode, setMode] = useState<EditMode>('add')
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setPoints(photo.perimeterPoints)
  }, [photo.id])

  useEffect(() => {
    onPerimeterUpdate(points)
  }, [points])

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      })
    }
  }

  const getCanvasCoordinates = (e: React.MouseEvent): Point2D | null => {
    if (!canvasRef.current || !imageRef.current) return null
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
  }

  const findNearestPoint = (clickPoint: Point2D): number | null => {
    const threshold = 0.03 // 3% of image size
    let nearestIndex: number | null = null
    let minDistance = Infinity

    points.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(point.x - clickPoint.x, 2) + 
        Math.pow(point.y - clickPoint.y, 2)
      )
      if (distance < threshold && distance < minDistance) {
        minDistance = distance
        nearestIndex = index
      }
    })

    return nearestIndex
  }

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    if (mode === 'add') {
      const nearestIndex = findNearestPoint(coords)
      if (nearestIndex !== null) {
        // Clicked near existing point, select it
        setSelectedPoint(nearestIndex)
        setMode('move')
      } else {
        // Add new point
        setPoints(prev => [...prev, coords])
      }
    } else if (mode === 'delete') {
      const nearestIndex = findNearestPoint(coords)
      if (nearestIndex !== null) {
        setPoints(prev => prev.filter((_, i) => i !== nearestIndex))
        setSelectedPoint(null)
      }
    }
  }, [mode, points])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'move' && selectedPoint !== null) {
      const coords = getCanvasCoordinates(e)
      if (!coords) return

      setPoints(prev => 
        prev.map((p, i) => i === selectedPoint ? coords : p)
      )
    }
  }, [mode, selectedPoint])

  const handleMouseUp = useCallback(() => {
    if (mode === 'move') {
      setMode('add')
      setSelectedPoint(null)
    }
  }, [mode])

  const handleClear = () => {
    setPoints([])
    setSelectedPoint(null)
    setMode('add')
  }

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1))
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-steam-dark rounded p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('add')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              mode === 'add' 
                ? 'bg-steam-blue text-steam-darker' 
                : 'bg-steam-gray text-steam-light hover:bg-steam-gray/80'
            }`}
          >
            Add Points
          </button>
          <button
            onClick={() => setMode('move')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              mode === 'move' 
                ? 'bg-steam-blue text-steam-darker' 
                : 'bg-steam-gray text-steam-light hover:bg-steam-gray/80'
            }`}
          >
            Move
          </button>
          <button
            onClick={() => setMode('delete')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              mode === 'delete' 
                ? 'bg-red-500 text-white' 
                : 'bg-steam-gray text-steam-light hover:bg-steam-gray/80'
            }`}
          >
            Delete
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={points.length === 0}
            className="px-3 py-1 rounded text-sm bg-steam-gray text-steam-light hover:bg-steam-gray/80 disabled:opacity-50"
          >
            Undo
          </button>
          <button
            onClick={handleClear}
            disabled={points.length === 0}
            className="px-3 py-1 rounded text-sm bg-red-500/80 text-white hover:bg-red-500 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-sm text-steam-light">
        <span>
          <strong className="text-steam-blue">{points.length}</strong> points defined
          {points.length >= 3 && (
            <span className="text-green-400 ml-2">✓ Perimeter complete</span>
          )}
        </span>
        <span className="text-steam-gray">
          {mode === 'add' && 'Click to add points around room perimeter'}
          {mode === 'move' && 'Drag points to adjust positions'}
          {mode === 'delete' && 'Click points to remove them'}
        </span>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="relative border-2 border-steam-gray rounded overflow-hidden cursor-crosshair select-none"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={photo.url}
          alt="Room to annotate"
          className="w-full h-auto max-h-[60vh] object-contain"
          onLoad={handleImageLoad}
          draggable={false}
        />

        {/* Perimeter Lines */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {points.length > 1 && (
            <polygon
              points={points.map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
              fill="rgba(102, 192, 244, 0.2)"
              stroke="#66c0f4"
              strokeWidth="0.5"
            />
          )}
        </svg>

        {/* Point Markers */}
        {points.map((point, index) => (
          <div
            key={index}
            className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 shadow-lg transition-transform cursor-move ${
              selectedPoint === index
                ? 'bg-white border-steam-blue scale-125'
                : 'bg-steam-blue border-white hover:scale-110'
            }`}
            style={{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
            }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-steam-blue font-bold bg-steam-dark px-1 rounded">
              {index + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-steam-gray/30 rounded p-4 text-sm text-steam-light/80">
        <h4 className="font-semibold text-steam-light mb-2">How to draw your room perimeter:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click around the edges of your room floor to place points</li>
          <li>Go clockwise or counter-clockwise around the perimeter</li>
          <li>Place points at corners and where walls change direction</li>
          <li>Include at least 3 points to define a valid room area</li>
          <li>Use "Move" mode to adjust point positions if needed</li>
        </ol>
      </div>
    </div>
  )
}
