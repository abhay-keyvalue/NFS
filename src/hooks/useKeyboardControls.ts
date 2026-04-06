import { useCallback, useEffect, useRef } from 'react'
import type { ControlsState, KeyMap } from '../types/game'

const DEFAULT: ControlsState = {
  accelerate: false,
  brake: false,
  left: false,
  right: false,
}

export const ARROW_KEYMAP: KeyMap = {
  ArrowUp: 'accelerate',
  ArrowDown: 'brake',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

export const WASD_KEYMAP: KeyMap = {
  w: 'accelerate',
  W: 'accelerate',
  s: 'brake',
  S: 'brake',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
}

export const ALL_KEYS_KEYMAP: KeyMap = {
  ...ARROW_KEYMAP,
  ...WASD_KEYMAP,
}

export function useKeyboardControls(keymap: KeyMap = ALL_KEYS_KEYMAP) {
  const controlsRef = useRef<ControlsState>({ ...DEFAULT })
  const keymapRef = useRef(keymap)
  keymapRef.current = keymap

  useEffect(() => {
    const setValue = (event: KeyboardEvent, pressed: boolean) => {
      const key = keymapRef.current[event.key]
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
