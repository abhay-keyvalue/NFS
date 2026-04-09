import { useCallback, useEffect, useRef, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { HUD } from './components/HUD'
import { LeaderboardPage } from './components/LeaderboardPage'
import { Loader } from './components/Loader'
import { ProfilePage } from './components/ProfilePage'
import { RacingScene } from './components/RacingScene'
import { TouchControls } from './components/TouchControls'
import { useAuth } from './contexts/AuthContext'
import { api } from './services/api'
import type { Difficulty, GameState, PlayerMode, Telemetry, ViewState } from './types/game'

const TOTAL_LAPS = 3

export default function App() {
  const { isAuthenticated } = useAuth()
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [gameState, setGameState] = useState<GameState>('idle')
  const [playerMode, setPlayerMode] = useState<PlayerMode>('single')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [countdownNum, setCountdownNum] = useState(0)
  const [raceSaved, setRaceSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

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
  const sessionIdRef = useRef<string | null>(null)
  const checkpointSequenceRef = useRef(0)
  const checkpointTimerRef = useRef<number>(0)
  const lastTelemetryP1Ref = useRef<Telemetry | null>(null)

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

  // Send checkpoints every 5 seconds during gameplay
  useEffect(() => {
    if (gameState !== 'running') return
    if (!isAuthenticated || !sessionIdRef.current) return

    const sendCheckpoint = () => {
      const telemetry = lastTelemetryP1Ref.current
      if (!telemetry || !sessionIdRef.current) return

      // Capture current elapsedMs at the time of sending
      setElapsedMs((currentElapsed) => {
        api.games.checkpoint({
          sessionId: sessionIdRef.current!,
          sequenceNumber: checkpointSequenceRef.current,
          timestamp: currentElapsed,
          position: {
            x: telemetry.position.x,
            y: telemetry.position.y,
            z: telemetry.position.z,
          },
          velocity: Math.abs(telemetry.speedMps),
          currentLap: telemetry.lap - 1, // Convert to 0-indexed
          collisionCount: telemetry.collisions,
        })
          .then((response) => {
            if (response.suspiciousFlags && response.suspiciousFlags.length > 0) {
              console.warn('[Checkpoint] Suspicious flags:', response.suspiciousFlags)
            }
            checkpointSequenceRef.current++
          })
          .catch((err) => {
            console.error('[Checkpoint] Failed to send checkpoint:', err)
          })
        
        return currentElapsed // Return unchanged value
      })
    }

    // Send initial checkpoint immediately
    sendCheckpoint()

    // Then send every 5 seconds
    checkpointTimerRef.current = window.setInterval(sendCheckpoint, 5000)

    return () => {
      if (checkpointTimerRef.current) {
        window.clearInterval(checkpointTimerRef.current)
      }
    }
  }, [gameState, isAuthenticated])

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
    lastTelemetryP1Ref.current = telemetry
  }, [])

  const onTelemetryP2 = useCallback((telemetry: Telemetry) => {
    setSpeedKmhP2(Math.abs(telemetry.speedMps) * 3.6)
    setLapP2(telemetry.lap)
    setCollisionsP2(telemetry.collisions)
  }, [])

  useEffect(() => {
    if (gameState !== 'gameover' || raceSaved) return
    if (!isAuthenticated) {
      setSaveMessage('Login to save your records')
      return
    }

    if (!sessionIdRef.current) {
      setSaveMessage('Failed to save race (no session)')
      return
    }

    setRaceSaved(true)

    const modeMap: Record<PlayerMode, string> = {
      single: 'solo',
      ai: 'ai',
      multi: 'multiplayer',
    }

    api.games
      .save({
        sessionId: sessionIdRef.current,
        gameMode: modeMap[playerMode],
        difficulty: playerMode === 'ai' ? difficulty : null,
        totalLaps: TOTAL_LAPS,
        elapsedMs,
        collisions: collisionsP1,
        won: playerMode === 'single' ? null : winner === 1,
      })
      .then(() => setSaveMessage('Race saved!'))
      .catch(() => setSaveMessage('Failed to save race'))
  }, [gameState, isAuthenticated, raceSaved, playerMode, difficulty, elapsedMs, collisionsP1, winner])

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
    setRaceSaved(false)
    setSaveMessage(null)
    sessionIdRef.current = null
    checkpointSequenceRef.current = 0
    lastTelemetryP1Ref.current = null
    if (checkpointTimerRef.current) {
      window.clearInterval(checkpointTimerRef.current)
      checkpointTimerRef.current = 0
    }
  }, [])

  const start = useCallback((mode: PlayerMode, diff?: Difficulty) => {
    if (gameState === 'gameover') {
      resetRace()
    }
    setPlayerMode(mode)
    if (diff) setDifficulty(diff)
    setGameState('countdown')
    setViewState('countdown')

    const modeMap: Record<PlayerMode, string> = {
      single: 'solo',
      ai: 'ai',
      multi: 'multiplayer',
    }

    if (isAuthenticated) {
      api.games
        .startSession({
          gameMode: modeMap[mode],
          difficulty: mode === 'ai' ? (diff ?? 'medium') : null,
          totalLaps: TOTAL_LAPS,
        })
        .then(({ sessionId }) => {
          sessionIdRef.current = sessionId
        })
        .catch((err) => {
          console.warn('Failed to start game session:', err)
          sessionIdRef.current = null
        })
    }
  }, [gameState, resetRace, isAuthenticated])

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
    setViewState('idle')
  }, [resetRace])

  const navigateTo = useCallback((view: 'leaderboard' | 'profile') => {
    setViewState(view)
  }, [])

  const navigateHome = useCallback(() => {
    setViewState('idle')
  }, [])

  if (viewState === 'leaderboard') {
    return (
      <div className="app-shell">
        <LeaderboardPage onBack={navigateHome} />
      </div>
    )
  }

  if (viewState === 'profile') {
    return (
      <div className="app-shell">
        <ProfilePage onBack={navigateHome} />
      </div>
    )
  }

  if (gameState === 'idle') {
    return (
      <div className="app-shell">
        <HomeScreen onStart={start} totalLaps={TOTAL_LAPS} onNavigate={navigateTo} />
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
          saveMessage={saveMessage}
          onStart={start}
          onPauseToggle={togglePause}
          onToggleOverview={toggleOverview}
          onReset={reset}
        />
        <TouchControls gameState={gameState} playerMode={playerMode} />
      </main>
    </div>
  )
}
