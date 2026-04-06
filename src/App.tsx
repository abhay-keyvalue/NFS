import { useCallback, useEffect, useState } from 'react'
import { HUD } from './components/HUD'
import { RacingScene } from './components/RacingScene'
import type { GameState, Telemetry } from './types/game'

const TOTAL_LAPS = 3

export default function App() {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [speedKmh, setSpeedKmh] = useState(0)
  const [lap, setLap] = useState(1)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [collisions, setCollisions] = useState(0)
  const [resetToken, setResetToken] = useState(0)

  useEffect(() => {
    if (gameState !== 'running') {
      return
    }
    const timer = window.setInterval(() => {
      setElapsedMs((t) => t + 100)
    }, 100)
    return () => window.clearInterval(timer)
  }, [gameState])

  useEffect(() => {
    if (lap > TOTAL_LAPS) {
      setGameState('gameover')
    }
  }, [lap])

  const onTelemetry = useCallback((telemetry: Telemetry) => {
    setSpeedKmh(Math.abs(telemetry.speedMps) * 3.6)
    setLap(telemetry.lap)
    setCollisions(telemetry.collisions)
  }, [])

  const resetRace = useCallback(() => {
    setSpeedKmh(0)
    setLap(1)
    setElapsedMs(0)
    setCollisions(0)
    setResetToken((v) => v + 1)
  }, [])

  const start = useCallback(() => {
    if (gameState === 'gameover') {
      resetRace()
    }
    setGameState('running')
  }, [gameState, resetRace])

  const togglePause = useCallback(() => {
    setGameState((cur) => {
      if (cur === 'running') return 'paused'
      if (cur === 'paused') return 'running'
      return cur
    })
  }, [])

  const reset = useCallback(() => {
    resetRace()
    setGameState('idle')
  }, [resetRace])

  return (
    <div className="app-shell">
      <main className="game-layout">
        <section className="scene-area">
          <RacingScene gameState={gameState} resetToken={resetToken} onTelemetry={onTelemetry} />
        </section>

        <HUD
          speedKmh={speedKmh}
          lap={lap}
          totalLaps={TOTAL_LAPS}
          elapsedMs={elapsedMs}
          collisions={collisions}
          gameState={gameState}
          onStart={start}
          onPauseToggle={togglePause}
          onReset={reset}
        />
      </main>
    </div>
  )
}
