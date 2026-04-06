import type { GameState, PlayerMode } from '../types/game'
import { formatTime } from '../utils/game'

type Props = {
  playerMode: PlayerMode
  speedKmhP1: number
  lapP1: number
  speedKmhP2: number
  lapP2: number
  totalLaps: number
  elapsedMs: number
  collisionsP1: number
  collisionsP2: number
  gameState: GameState
  countdownNum: number
  winner: 1 | 2 | null
  onStart: (mode: PlayerMode) => void
  onPauseToggle: () => void
  onReset: () => void
}

export function HUD({
  playerMode,
  speedKmhP1,
  lapP1,
  speedKmhP2,
  lapP2,
  totalLaps,
  elapsedMs,
  collisionsP1,
  collisionsP2,
  gameState,
  countdownNum,
  winner,
  onStart,
  onPauseToggle,
  onReset,
}: Props) {
  const isMulti = playerMode === 'multi'
  const isActive = gameState === 'running' || gameState === 'paused' || gameState === 'countdown'
  const isRunningMulti = isMulti && isActive

  return (
    <div className={`hud-root ${isRunningMulti ? 'hud-split' : ''}`}>
      {isRunningMulti && (
        <>
          <div className="split-divider-h" />
          <div className="split-divider-v" />
        </>
      )}

      {isRunningMulti && (
        <div className="hud-panel hud-top-timer">
          <Stat label="Timer" value={formatTime(elapsedMs)} />
          <div className="hud-buttons-inline">
            <button className="action-btn action-btn-sm" onClick={onPauseToggle} disabled={gameState === 'countdown'}>
              {gameState === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button className="action-btn action-btn-sm danger" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      )}

      <div className={`hud-panel hud-stats ${isRunningMulti ? 'hud-stats-split-p1' : ''}`}>
        {isMulti && <span className="player-label p1-label">P1 — Arrows</span>}
        <Stat label="Speed" value={`${Math.max(0, speedKmhP1).toFixed(0)} km/h`} />
        <Stat label="Lap" value={`${Math.min(lapP1, totalLaps)}/${totalLaps}`} />
        {!isRunningMulti && <Stat label="Timer" value={formatTime(elapsedMs)} />}
        <Stat label="Hits" value={String(collisionsP1)} />
      </div>

      {isMulti && (
        <div className={`hud-panel hud-stats ${isRunningMulti ? 'hud-stats-split-p2' : 'hud-stats-p2'}`}>
          <span className="player-label p2-label">P2 — WASD</span>
          <Stat label="Speed" value={`${Math.max(0, speedKmhP2).toFixed(0)} km/h`} />
          <Stat label="Lap" value={`${Math.min(lapP2, totalLaps)}/${totalLaps}`} />
          <Stat label="Hits" value={String(collisionsP2)} />
        </div>
      )}

      {!isRunningMulti && (
        <div className="hud-panel hud-controls">
          <div className="hud-buttons">
            <button
              className="action-btn"
              disabled={gameState === 'idle' || gameState === 'gameover' || gameState === 'countdown'}
              onClick={onPauseToggle}
            >
              {gameState === 'paused' ? 'Continue' : 'Pause'}
            </button>
            <button className="action-btn danger" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="countdown-overlay">
          <span key={countdownNum} className="countdown-number">
            {countdownNum > 0 ? countdownNum : 'GO!'}
          </span>
        </div>
      )}

      {gameState === 'idle' && (
        <div className="hud-overlay">
          <div className="hud-overlay-card mode-select">
            <h2>3D Racing Challenge</h2>
            <p>Complete {totalLaps} laps as fast as you can!</p>
            <div className="mode-buttons">
              <button className="mode-btn single-btn" onClick={() => onStart('single')}>
                <span className="mode-icon">🏎</span>
                <span className="mode-title">Single Player</span>
                <span className="mode-desc">Race against time</span>
              </button>
              <button className="mode-btn multi-btn" onClick={() => onStart('multi')}>
                <span className="mode-icon">🏁</span>
                <span className="mode-title">Multiplayer</span>
                <span className="mode-desc">P1 Arrows vs P2 WASD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="hud-overlay">
          <div className="hud-overlay-card">
            <h2>
              {winner
                ? `Player ${winner} Wins!`
                : 'Race Complete'}
            </h2>
            <p>
              Finished in {formatTime(elapsedMs)}
              {winner === null && ` with ${collisionsP1} collisions.`}
            </p>
            <button className="action-btn primary" onClick={() => onStart(playerMode)}>
              Race Again
            </button>
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="hud-overlay">
          <div className="hud-overlay-card">
            <h2>Paused</h2>
            <button className="action-btn primary" onClick={onPauseToggle}>
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-stat">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  )
}
