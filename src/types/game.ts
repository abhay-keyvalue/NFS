import type { Vector3 } from 'three'

export type GameState = 'idle' | 'running' | 'paused' | 'gameover'

export type ControlsState = {
  accelerate: boolean
  brake: boolean
  left: boolean
  right: boolean
}

export type Telemetry = {
  speedMps: number
  lap: number
  collisions: number
  position: Vector3
}

export type CameraTarget = {
  position: Vector3
  heading: number
}
