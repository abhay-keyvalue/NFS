import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useMemo, useRef } from 'react'
import type { CameraTarget, Difficulty, GameState, PlayerMode, Telemetry } from '../types/game'
import { START_HEADING, START_POSITION, START_POSITION_P2 } from '../utils/track'
import { ARROW_KEYMAP, WASD_KEYMAP } from '../hooks/useKeyboardControls'
import { AICar } from './AICar'
import { EnvironmentObjects } from './EnvironmentObjects'
import { FollowCamera, SplitScreenCamera } from './FollowCamera'
import { PlayerCar } from './PlayerCar'
import { Track } from './Track'

type Props = {
  gameState: GameState
  resetToken: number
  playerMode: PlayerMode
  difficulty: Difficulty
  onTelemetryP1: (telemetry: Telemetry) => void
  onTelemetryP2: (telemetry: Telemetry) => void
}

export function RacingScene({ gameState, resetToken, playerMode, difficulty, onTelemetryP1, onTelemetryP2 }: Props) {
  const initialTarget = useMemo<CameraTarget>(
    () => ({
      position: START_POSITION.clone(),
      heading: START_HEADING,
      shake: 0,
    }),
    [],
  )
  const targetRefP1 = useRef<CameraTarget>(initialTarget)

  const initialTargetP2 = useMemo<CameraTarget>(
    () => ({
      position: START_POSITION_P2.clone(),
      heading: START_HEADING,
      shake: 0,
    }),
    [],
  )
  const targetRefP2 = useRef<CameraTarget>(initialTargetP2)

  const isMulti = playerMode === 'multi'
  const isAI = playerMode === 'ai'

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
        <PlayerCar
          gameState={gameState}
          resetToken={resetToken}
          targetRef={targetRefP1}
          onTelemetry={onTelemetryP1}
          keymap={isMulti ? ARROW_KEYMAP : undefined}
          carColor={isMulti ? '#ee2222' : isAI ? '#ee2222' : undefined}
          opponentRef={(isMulti || isAI) ? targetRefP2 : undefined}
        />
        {isMulti && (
          <PlayerCar
            gameState={gameState}
            resetToken={resetToken}
            targetRef={targetRefP2}
            onTelemetry={onTelemetryP2}
            keymap={WASD_KEYMAP}
            startPos={START_POSITION_P2}
            carColor="#f5c542"
            opponentRef={targetRefP1}
          />
        )}
        {isAI && (
          <AICar
            gameState={gameState}
            resetToken={resetToken}
            targetRef={targetRefP2}
            onTelemetry={onTelemetryP2}
            opponentRef={targetRefP1}
            difficulty={difficulty}
          />
        )}
      </Suspense>

      <Track />

      {isMulti ? (
        <SplitScreenCamera targetRefP1={targetRefP1} targetRefP2={targetRefP2} />
      ) : (
        <>
          <FollowCamera targetRef={targetRefP1} />
          <EffectComposer>
            <Bloom intensity={0.3} luminanceThreshold={0.85} luminanceSmoothing={0.4} mipmapBlur />
            <Vignette eskil={false} offset={0.15} darkness={0.4} />
          </EffectComposer>
        </>
      )}
    </Canvas>
  )
}
