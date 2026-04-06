import type { PlayerMode } from '../types/game'

type Props = {
  onStart: (mode: PlayerMode) => void
  totalLaps: number
}

export function HomeScreen({ onStart, totalLaps }: Props) {
  return (
    <div className="home-screen">
      <div className="home-bg-grid" />

      <div className="home-content">
        <div className="home-header">
          <span className="home-flag">🏁</span>
          <h1 className="home-title">NFS Racing</h1>
          <p className="home-subtitle">Complete {totalLaps} laps to win the race</p>
        </div>

        <div className="home-modes">
          <button className="home-mode-card" onClick={() => onStart('single')}>
            <div className="home-mode-icon">🏎️</div>
            <div className="home-mode-info">
              <span className="home-mode-name">Solo Race</span>
              <span className="home-mode-detail">Race against the clock</span>
            </div>
            <span className="home-mode-keys">Arrow Keys</span>
          </button>

          <button className="home-mode-card home-mode-ai" onClick={() => onStart('ai')}>
            <div className="home-mode-icon">🤖</div>
            <div className="home-mode-info">
              <span className="home-mode-name">Play with AI</span>
              <span className="home-mode-detail">Beat the computer opponent</span>
            </div>
            <span className="home-mode-keys">Arrow Keys</span>
          </button>

          <button className="home-mode-card home-mode-multi" onClick={() => onStart('multi')}>
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
  )
}
