import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { Box3, Vector3 } from 'three'
import type { Difficulty, PlayerMode } from '../types/game'
import { startMusic, stopMusic } from '../utils/audio'

const CAR_MODEL = `${import.meta.env.BASE_URL}models/peugeot_205_gti.glb`

function RotatingCar() {
  const groupRef = useRef<Group>(null)
  const gltf = useGLTF(CAR_MODEL) as { scene: Group }

  const carScene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    const box = new Box3().setFromObject(clone)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    clone.position.sub(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    clone.scale.multiplyScalar(3.2 / maxDim)
    clone.position.y -= 0.3
    return clone
  }, [gltf.scene])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={carScene} />
    </group>
  )
}

type Props = {
  onStart: (mode: PlayerMode, difficulty?: Difficulty) => void
  totalLaps: number
}

export function HomeScreen({ onStart, totalLaps }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const musicStarted = useRef(false)

  useEffect(() => {
    const handleInteraction = () => {
      if (!musicStarted.current) {
        musicStarted.current = true
        startMusic()
      }
    }
    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      stopMusic()
    }
  }, [])

  const handleStart = (mode: PlayerMode, diff?: Difficulty) => {
    stopMusic()
    onStart(mode, diff)
  }

  return (
    <div className="home-screen">
      <div className="home-bg-grid" />

      <div className="home-layout">
        <div className="home-showcase">
          <div className="home-car-canvas">
            <div className="home-car-loader">
              <div className="home-car-spinner" />
              <span>Loading model...</span>
            </div>
            <Canvas
              camera={{ position: [0, 1.2, 5], fov: 40 }}
              dpr={[1, 1.5]}
              gl={{ alpha: true }}
              style={{ background: 'transparent' }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 8, 5]} intensity={1.8} />
              <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#8ab4f8" />
              <Suspense fallback={null}>
                <RotatingCar />
              </Suspense>
            </Canvas>
          </div>
          <div className="home-showcase-glow" />
        </div>

        <div className="home-panel">
          <div className="home-header">
            <h2 className="home-title"> Need For Speed</h2>
            <p className="home-subtitle">Complete {totalLaps} laps to win the race</p>
          </div>

          <div className="home-modes">
            <button className="home-mode-card" onClick={() => handleStart('single')}>
              <div className="home-mode-icon">🏎️</div>
              <div className="home-mode-info">
                <span className="home-mode-name">Solo Race</span>
                <span className="home-mode-detail">Race against the clock</span>
              </div>
              <span className="home-mode-keys">Arrow Keys</span>
            </button>

            <div className="home-mode-card home-mode-ai home-mode-card-ai-wrap">
              <div className="home-mode-ai-top" onClick={() => handleStart('ai', difficulty)}>
                <div className="home-mode-icon">🤖</div>
                <div className="home-mode-info">
                  <span className="home-mode-name">Play with AI</span>
                  <span className="home-mode-detail">Beat the computer opponent</span>
                </div>
                <span className="home-mode-keys">Arrow Keys</span>
              </div>
              <div className="home-difficulty">
                <span className="home-difficulty-label">Difficulty</span>
                <div className="home-difficulty-options">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      className={`home-difficulty-btn home-diff-${d} ${difficulty === d ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setDifficulty(d) }}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="home-mode-card home-mode-multi" onClick={() => handleStart('multi')}>
              <div className="home-mode-icon">👥</div>
              <div className="home-mode-info">
                <span className="home-mode-name">Multiplayer</span>
                <span className="home-mode-detail">Split-screen local race</span>
              </div>
              <span className="home-mode-keys">P1 Arrows / P2 WASD</span>
            </button>
          </div>

          <p className="home-footer">Use keyboard to control your car. Avoid the barriers!</p>
        </div>
      </div>
    </div>
  )
}
