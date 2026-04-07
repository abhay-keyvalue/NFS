import { useCallback, useEffect, useRef } from 'react'
import type { GameState, PlayerMode } from '../types/game'

type Props = {
  gameState: GameState
  playerMode: PlayerMode
}

const ARROW_KEYS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
} as const

function DpadButton({
  arrowKey,
  label,
  className,
}: {
  arrowKey: string
  label: string
  className: string
}) {
  const pressed = useRef(false)

  const press = useCallback(() => {
    if (pressed.current) return
    pressed.current = true
    window.dispatchEvent(new KeyboardEvent('keydown', { key: arrowKey, bubbles: true }))
  }, [arrowKey])

  const release = useCallback(() => {
    if (!pressed.current) return
    pressed.current = false
    window.dispatchEvent(new KeyboardEvent('keyup', { key: arrowKey, bubbles: true }))
  }, [arrowKey])

  useEffect(() => {
    return () => {
      if (pressed.current) {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: arrowKey, bubbles: true }))
      }
    }
  }, [arrowKey])

  return (
    <button
      className={`touch-btn ${className}`}
      onTouchStart={(e) => { e.preventDefault(); press() }}
      onTouchEnd={(e) => { e.preventDefault(); release() }}
      onTouchCancel={release}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label}
    >
      {label}
    </button>
  )
}

export function TouchControls({ gameState, playerMode }: Props) {
  if (playerMode === 'multi') return null
  const isActive = gameState === 'running' || gameState === 'countdown'
  if (!isActive) return null

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <DpadButton arrowKey={ARROW_KEYS.up} label="▲" className="touch-btn-up" />
        <DpadButton arrowKey={ARROW_KEYS.left} label="◀" className="touch-btn-left" />
        <DpadButton arrowKey={ARROW_KEYS.right} label="▶" className="touch-btn-right" />
        <DpadButton arrowKey={ARROW_KEYS.down} label="▼" className="touch-btn-down" />
      </div>
    </div>
  )
}
