import type { GameState } from '../types/game'
import { formatTime } from '../utils/game'

type Props = {
  speedKmh: number
  lap: number
  totalLaps: number
  elapsedMs: number
  collisions: number
  gameState: GameState
  onStart: () => void
  onPauseToggle: () => void
  onReset: () => void
}

export function HUD({
  speedKmh,
  lap,
  totalLaps,
  elapsedMs,
  collisions,
  gameState,
  onStart,
  onPauseToggle,
  onReset,
}: Props) {
  return (
    <div className="hud-root">
      <div className="hud-panel hud-stats">
        <Stat label="Speed" value={`${Math.max(0, speedKmh).toFixed(0)} km/h`} />
        <Stat label="Lap" value={`${Math.min(lap, totalLaps)}/${totalLaps}`} />
        <Stat label="Timer" value={formatTime(elapsedMs)} />
        <Stat label="Collisions" value={String(collisions)} />
      </div>

      <div className="hud-panel hud-controls">
        <div className="hud-buttons">
          <button className="action-btn primary" disabled={gameState === 'running'} onClick={onStart}>
            {gameState === 'idle' ? 'Start' : 'Resume'}
          </button>
          <button
            className="action-btn"
            disabled={gameState === 'idle' || gameState === 'gameover'}
            onClick={onPauseToggle}
          >
            {gameState === 'paused' ? 'Continue' : 'Pause'}
          </button>
          <button className="action-btn danger" onClick={onReset}>
            Reset
          </button>
        </div>
        <p className="hint">Controls: W/Arrow Up accelerate, S/Arrow Down brake, A/D or Arrow Left/Right to steer.</p>
      </div>

      {(gameState === 'idle' || gameState === 'gameover') && (
        <div className="hud-overlay">
          <div className="hud-overlay-card">
            <h2>{gameState === 'gameover' ? 'Race Complete' : '3D Racing Challenge'}</h2>
            <p>
              {gameState === 'gameover'
                ? `Finished in ${formatTime(elapsedMs)} with ${collisions} collisions.`
                : 'Complete three laps while avoiding barriers and obstacles.'}
            </p>
            <button className="action-btn primary" onClick={onStart}>
              {gameState === 'gameover' ? 'Race Again' : 'Start Race'}
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
