import { useCallback, useEffect, useState } from 'react'
import { HUD } from './components/HUD'
import { Loader } from './components/Loader'
import { RacingScene } from './components/RacingScene'
import type { GameState, PlayerMode, Telemetry } from './types/game'

const TOTAL_LAPS = 3

export default function App() {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [playerMode, setPlayerMode] = useState<PlayerMode>('single')
  const [winner, setWinner] = useState<1 | 2 | null>(null)

  const [speedKmhP1, setSpeedKmhP1] = useState(0)
  const [lapP1, setLapP1] = useState(1)
  const [collisionsP1, setCollisionsP1] = useState(0)

  const [speedKmhP2, setSpeedKmhP2] = useState(0)
  const [lapP2, setLapP2] = useState(1)
  const [collisionsP2, setCollisionsP2] = useState(0)

  const [elapsedMs, setElapsedMs] = useState(0)
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
    if (gameState !== 'running') return

    if (playerMode === 'single') {
      if (lapP1 > TOTAL_LAPS) {
        setWinner(null)
        setGameState('gameover')
      }
    } else {
      if (lapP1 > TOTAL_LAPS && winner === null) {
        setWinner(1)
        setGameState('gameover')
      }
      if (lapP2 > TOTAL_LAPS && winner === null) {
        setWinner(2)
        setGameState('gameover')
      }
    }
  }, [lapP1, lapP2, playerMode, gameState, winner])

  const onTelemetryP1 = useCallback((telemetry: Telemetry) => {
    setSpeedKmhP1(Math.abs(telemetry.speedMps) * 3.6)
    setLapP1(telemetry.lap)
    setCollisionsP1(telemetry.collisions)
  }, [])

  const onTelemetryP2 = useCallback((telemetry: Telemetry) => {
    setSpeedKmhP2(Math.abs(telemetry.speedMps) * 3.6)
    setLapP2(telemetry.lap)
    setCollisionsP2(telemetry.collisions)
  }, [])

  const resetRace = useCallback(() => {
    setSpeedKmhP1(0)
    setLapP1(1)
    setCollisionsP1(0)
    setSpeedKmhP2(0)
    setLapP2(1)
    setCollisionsP2(0)
    setElapsedMs(0)
    setWinner(null)
    setResetToken((v) => v + 1)
  }, [])

  const start = useCallback((mode: PlayerMode) => {
    if (gameState === 'gameover') {
      resetRace()
    }
    setPlayerMode(mode)
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
      <Loader />
      <main className="game-layout">
        <section className="scene-area">
          <RacingScene
            gameState={gameState}
            resetToken={resetToken}
            playerMode={playerMode}
            onTelemetryP1={onTelemetryP1}
            onTelemetryP2={onTelemetryP2}
          />
        </section>

        <HUD
          playerMode={playerMode}
          speedKmhP1={speedKmhP1}
          lapP1={lapP1}
          speedKmhP2={speedKmhP2}
          lapP2={lapP2}
          totalLaps={TOTAL_LAPS}
          elapsedMs={elapsedMs}
          collisionsP1={collisionsP1}
          collisionsP2={collisionsP2}
          gameState={gameState}
          winner={winner}
          onStart={start}
          onPauseToggle={togglePause}
          onReset={reset}
        />
      </main>
    </div>
  )
}
