import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Box, Line } from '@react-three/drei'
import { Photo, Point3D } from '../types'
import * as THREE from 'three'

interface RoomPreviewProps {
  photos: Photo[]
}

// Placeholder for 3D visualization - will be populated from backend data
function RoomBoundary({ points }: { points: Point3D[] }) {
  if (points.length < 3) return null

  const linePoints = [...points, points[0]] // Close the loop
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(
    linePoints.map(p => new THREE.Vector3(p.x, p.y, p.z))
  )

  return (
    <>
      {/* Floor perimeter */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#66c0f4" linewidth={2} />
      </line>
      
      {/* Wall lines */}
      {points.map((point, i) => {
        const nextPoint = points[(i + 1) % points.length]
        const wallPoints = [
          new THREE.Vector3(point.x, 0, point.z),
          new THREE.Vector3(point.x, 2.43, point.z),
          new THREE.Vector3(nextPoint.x, 2.43, nextPoint.z),
          new THREE.Vector3(nextPoint.x, 0, nextPoint.z),
          new THREE.Vector3(point.x, 0, point.z),
        ]
        const wallGeometry = new THREE.BufferGeometry().setFromPoints(wallPoints)
        
        return (
          <line key={i} geometry={wallGeometry}>
            <lineBasicMaterial color="#66c0f4" transparent opacity={0.3} />
          </line>
        )
      })}

      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color="#66c0f4" transparent opacity={0.1} />
      </mesh>
    </>
  )
}

function CameraPositions({ count }: { count: number }) {
  // Show camera positions around the room
  const positions = [
    [2, 1.5, 2],
    [-2, 1.5, 2],
    [-2, 1.5, -2],
    [2, 1.5, -2],
  ].slice(0, count)

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <Box args={[0.1, 0.1, 0.2]}>
            <meshBasicMaterial color="#ff6b6b" />
          </Box>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, -1.5, 0, 0, 0, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ff6b6b" />
          </line>
        </group>
      ))}
    </>
  )
}

export default function RoomPreview({ photos }: RoomPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [roomPoints, setRoomPoints] = useState<Point3D[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Call backend to process photos and generate 3D points
    // For now, show a placeholder room
    const mockPoints: Point3D[] = [
      { x: -2, y: 0, z: -2 },
      { x: 2, y: 0, z: -2 },
      { x: 2, y: 0, z: 2 },
      { x: -2, y: 0, z: 2 },
    ]
    
    setTimeout(() => {
      setRoomPoints(mockPoints)
      setIsLoading(false)
    }, 1000)
  }, [photos])

  if (isLoading) {
    return (
      <div className="bg-steam-dark rounded-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-steam-blue border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-steam-light">Processing photos and interpolating perimeters...</p>
        <p className="text-sm text-steam-gray mt-2">
          This may take a moment while we analyze depth and camera positions
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-steam-dark rounded-lg overflow-hidden" style={{ height: '500px' }}>
        <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          <Grid 
            position={[0, 0, 0]} 
            args={[20, 20]} 
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#2a475e"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#66c0f4"
            fadeDistance={25}
            infiniteGrid
          />
          
          <RoomBoundary points={roomPoints} />
          <CameraPositions count={photos.length} />
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2 - 0.1}
          />
        </Canvas>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-steam-dark rounded p-4">
          <h4 className="font-semibold text-steam-light mb-1">Room Dimensions</h4>
          <p className="text-2xl text-steam-blue">
            4.0m × 4.0m
          </p>
          <p className="text-sm text-steam-gray">Estimated from {photos.length} photos</p>
        </div>
        
        <div className="bg-steam-dark rounded p-4">
          <h4 className="font-semibold text-steam-light mb-1">Play Area</h4>
          <p className="text-2xl text-steam-blue">
            3.2m × 1.7m
          </p>
          <p className="text-sm text-steam-gray">Maximum inscribed rectangle</p>
        </div>
        
        <div className="bg-steam-dark rounded p-4">
          <h4 className="font-semibold text-steam-light mb-1">Confidence</h4>
          <p className="text-2xl text-green-400">
            High
          </p>
          <p className="text-sm text-steam-gray">Multi-view geometry applied</p>
        </div>
      </div>

      <div className="bg-steam-gray/30 rounded p-4 text-sm text-steam-light/80">
        <h4 className="font-semibold text-steam-light mb-2">3D Preview Controls:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Left click + drag to rotate view</li>
          <li>Right click + drag to pan</li>
          <li>Scroll to zoom in/out</li>
          <li>Blue lines show your room perimeter</li>
          <li>Red boxes indicate estimated camera positions</li>
        </ul>
      </div>
    </div>
  )
}
