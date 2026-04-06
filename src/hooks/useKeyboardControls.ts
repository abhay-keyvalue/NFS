import { useCallback, useEffect, useRef } from 'react'
import type { ControlsState } from '../types/game'

const DEFAULT: ControlsState = {
  accelerate: false,
  brake: false,
  left: false,
  right: false,
}

const KEYMAP: Record<string, keyof ControlsState> = {
  ArrowUp: 'accelerate',
  w: 'accelerate',
  W: 'accelerate',
  ArrowDown: 'brake',
  s: 'brake',
  S: 'brake',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
}

export function useKeyboardControls() {
  const controlsRef = useRef<ControlsState>({ ...DEFAULT })

  useEffect(() => {
    const setValue = (event: KeyboardEvent, pressed: boolean) => {
      const key = KEYMAP[event.key]
      if (!key) {
        return
      }
      event.preventDefault()
      controlsRef.current[key] = pressed
    }

    const keydown = (event: KeyboardEvent) => setValue(event, true)
    const keyup = (event: KeyboardEvent) => setValue(event, false)

    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
    }
  }, [])

  const resetControls = useCallback(() => {
    controlsRef.current = { ...DEFAULT }
  }, [])

  return { controlsRef, resetControls }
}
