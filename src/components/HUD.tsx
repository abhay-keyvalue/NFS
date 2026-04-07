import type { Difficulty, GameState, PlayerMode } from '../types/game'
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
  showOverview: boolean
  saveMessage: string | null
  onStart: (mode: PlayerMode, difficulty?: Difficulty) => void
  onPauseToggle: () => void
  onToggleOverview: () => void
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
  showOverview,
  saveMessage,
  onStart,
  onPauseToggle,
  onToggleOverview,
  onReset,
}: Props) {
  const isMulti = playerMode === 'multi'
  const isAI = playerMode === 'ai'
  const hasOpponent = isMulti || isAI
  const isActive = gameState === 'running' || gameState === 'paused' || gameState === 'countdown'
  const isRunningMulti = isMulti && isActive

  return (
    <div className={`hud-root ${isRunningMulti ? 'hud-split' : ''}`}>
      {isRunningMulti && (
        <>
          {showOverview && <div className="split-divider-h" />}
          <div className="split-divider-v" />
        </>
      )}

      {isRunningMulti && (
        <div className="hud-panel hud-top-timer">
          <Stat label="Timer" value={formatTime(elapsedMs)} />
          <div className="hud-buttons-inline">
            <button className="action-btn action-btn-sm" onClick={onToggleOverview}>
              {showOverview ? '⬆ Hide Overview' : '⬇ Show Overview'}
            </button>
            <button className="action-btn action-btn-sm" onClick={onPauseToggle} disabled={gameState === 'countdown'}>
              {gameState === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button className="action-btn action-btn-sm danger" onClick={onReset}>
              Exit
            </button>
          </div>
        </div>
      )}

      <div className={`hud-panel hud-stats ${isRunningMulti ? 'hud-stats-split-p1' : ''}`}>
        {hasOpponent && (
          <span className="player-label p1-label">
            {isAI ? 'You' : 'P1 — Arrows'}
          </span>
        )}
        <Stat label="Speed" value={`${Math.max(0, speedKmhP1).toFixed(0)} km/h`} />
        <Stat label="Lap" value={`${Math.min(lapP1, totalLaps)}/${totalLaps}`} />
        {!isRunningMulti && <Stat label="Timer" value={formatTime(elapsedMs)} />}
        <Stat label="Hits" value={String(collisionsP1)} />
      </div>

      {hasOpponent && (
        <div className={`hud-panel hud-stats ${isRunningMulti ? 'hud-stats-split-p2' : 'hud-stats-p2'}`}>
          <span className={`player-label ${isAI ? 'ai-label' : 'p2-label'}`}>
            {isAI ? 'AI Opponent' : 'P2 — WASD'}
          </span>
          <Stat label="Speed" value={`${Math.max(0, speedKmhP2).toFixed(0)} km/h`} />
          <Stat label="Lap" value={`${Math.min(lapP2, totalLaps)}/${totalLaps}`} />
          <Stat label="Hits" value={String(collisionsP2)} />
        </div>
      )}

      {!isRunningMulti && gameState !== 'gameover' && (
        <div className="hud-bottom-actions">
          <button
            className="hud-action-pill"
            disabled={gameState === 'idle' || gameState === 'countdown'}
            onClick={onPauseToggle}
          >
            {gameState === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button className="hud-action-pill hud-action-exit" onClick={onReset}>
            ✕ Exit
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="countdown-overlay">
          <span key={countdownNum} className="countdown-number">
            {countdownNum > 0 ? countdownNum : 'GO!'}
          </span>
        </div>
      )}

      {gameState === 'gameover' && (() => {
        const playerWon = isAI ? winner === 1 : winner === 1 || winner === null
        const title = isAI
          ? winner === 1 ? 'You Win!' : 'AI Wins!'
          : winner
            ? `Player ${winner} Wins!`
            : 'Race Complete'

        return (
          <div className="hud-overlay">
            <div className={`gameover-card ${playerWon ? 'gameover-win' : 'gameover-lose'}`}>
              <div className="gameover-icon">{playerWon ? '🏆' : '💀'}</div>
              <h2 className="gameover-title">{title}</h2>
              <div className="gameover-stats">
                <div className="gameover-stat">
                  <span className="gameover-stat-label">Time</span>
                  <span className="gameover-stat-value">{formatTime(elapsedMs)}</span>
                </div>
                <div className="gameover-stat">
                  <span className="gameover-stat-label">Hits</span>
                  <span className="gameover-stat-value">{collisionsP1}</span>
                </div>
                {hasOpponent && (
                  <div className="gameover-stat">
                    <span className="gameover-stat-label">Winner</span>
                    <span className="gameover-stat-value">
                      {isAI ? (winner === 1 ? 'You' : 'AI') : `P${winner}`}
                    </span>
                  </div>
                )}
              </div>
              {saveMessage && (
                <p className="gameover-save-msg">{saveMessage}</p>
              )}
              <div className="gameover-buttons">
                <button className="gameover-btn gameover-btn-primary" onClick={() => onStart(playerMode)}>
                  Race Again
                </button>
                <button className="gameover-btn gameover-btn-secondary" onClick={onReset}>
                  Home
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
