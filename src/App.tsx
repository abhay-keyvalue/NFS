import { useCallback, useEffect, useRef, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { HUD } from './components/HUD'
import { Loader } from './components/Loader'
import { RacingScene } from './components/RacingScene'
import type { Difficulty, GameState, PlayerMode, Telemetry } from './types/game'

const TOTAL_LAPS = 3

export default function App() {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [playerMode, setPlayerMode] = useState<PlayerMode>('single')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [countdownNum, setCountdownNum] = useState(0)

  const [speedKmhP1, setSpeedKmhP1] = useState(0)
  const [lapP1, setLapP1] = useState(1)
  const [collisionsP1, setCollisionsP1] = useState(0)

  const [speedKmhP2, setSpeedKmhP2] = useState(0)
  const [lapP2, setLapP2] = useState(1)
  const [collisionsP2, setCollisionsP2] = useState(0)

  const [elapsedMs, setElapsedMs] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const [showOverview, setShowOverview] = useState(true)
  const countdownTimer = useRef<number>(0)

  useEffect(() => {
    if (gameState !== 'countdown') return

    setCountdownNum(3)
    let count = 3

    countdownTimer.current = window.setInterval(() => {
      count -= 1
      if (count > 0) {
        setCountdownNum(count)
      } else if (count === 0) {
        setCountdownNum(0)
      } else {
        window.clearInterval(countdownTimer.current)
        setGameState('running')
      }
    }, 1000)

    return () => window.clearInterval(countdownTimer.current)
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'running') return
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
    setCountdownNum(0)
    setResetToken((v) => v + 1)
  }, [])

  const start = useCallback((mode: PlayerMode, diff?: Difficulty) => {
    if (gameState === 'gameover') {
      resetRace()
    }
    setPlayerMode(mode)
    if (diff) setDifficulty(diff)
    setGameState('countdown')
  }, [gameState, resetRace])

  const toggleOverview = useCallback(() => {
    setShowOverview((v) => !v)
  }, [])

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

  if (gameState === 'idle') {
    return (
      <div className="app-shell">
        <HomeScreen onStart={start} totalLaps={TOTAL_LAPS} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Loader />
      <main className="game-layout">
        <section className="scene-area">
          <RacingScene
            gameState={gameState}
            resetToken={resetToken}
            playerMode={playerMode}
            difficulty={difficulty}
            showOverview={showOverview}
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
          countdownNum={countdownNum}
          winner={winner}
          showOverview={showOverview}
          onStart={start}
          onPauseToggle={togglePause}
          onToggleOverview={toggleOverview}
          onReset={reset}
        />
      </main>
    </div>
  )
}
