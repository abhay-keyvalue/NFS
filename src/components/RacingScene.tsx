import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useMemo, useRef } from 'react'
import type { CameraTarget, GameState, Telemetry } from '../types/game'
import { START_HEADING, START_POSITION } from '../utils/track'
import { EnvironmentObjects } from './EnvironmentObjects'
import { FollowCamera } from './FollowCamera'
import { PlayerCar } from './PlayerCar'
import { Track } from './Track'

type Props = {
  gameState: GameState
  resetToken: number
  onTelemetry: (telemetry: Telemetry) => void
}

export function RacingScene({ gameState, resetToken, onTelemetry }: Props) {
  const initialTarget = useMemo<CameraTarget>(
    () => ({
      position: START_POSITION.clone(),
      heading: START_HEADING,
      shake: 0,
    }),
    [],
  )
  const targetRef = useRef<CameraTarget>(initialTarget)

  return (
    <Canvas shadows camera={{ position: [START_POSITION.x - 10, START_POSITION.y + 6, START_POSITION.z - 10], fov: 55 }} dpr={[1, 1.8]}>
      <color attach="background" args={['#87ceeb']} />
      <fog attach="fog" args={['#b0d8f0', 100, 300]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#87ceeb', '#4a8c3a', 0.5]} />
      <directionalLight
        castShadow
        intensity={1.4}
        position={[40, 50, 20]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-far={200}
      />

      <Suspense fallback={null}>
        <EnvironmentObjects />
        <PlayerCar gameState={gameState} resetToken={resetToken} targetRef={targetRef} onTelemetry={onTelemetry} />
      </Suspense>

      <Track />
      <FollowCamera targetRef={targetRef} />

      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.15} darkness={0.4} />
      </EffectComposer>
    </Canvas>
  )
}
