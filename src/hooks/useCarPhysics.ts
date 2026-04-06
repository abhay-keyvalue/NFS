import { useCallback, useRef } from 'react'
import type { ControlsState } from '../types/game'
import { clamp } from '../utils/game'
import { START_HEADING, START_POSITION } from '../utils/track'

type CarStep = {
  speed: number
  heading: number
}

const PHYSICS = {
  maxForward: 34,
  maxReverse: -10,
  acceleration: 22,
  braking: 28,
  drag: 0.82,
  rollingFriction: 1.5,
  steeringPower: 2.0,
  steeringSmooth: 6.2,
}

export function useCarPhysics() {
  const speedRef = useRef(0)
  const headingRef = useRef(START_HEADING)
  const steeringRef = useRef(0)
  const positionRef = useRef(START_POSITION.clone())

  const reset = useCallback(() => {
    speedRef.current = 0
    headingRef.current = START_HEADING
    steeringRef.current = 0
    positionRef.current.copy(START_POSITION)
  }, [])

  const step = useCallback((delta: number, controls: ControlsState): CarStep => {
    const dt = Math.min(delta, 0.05)
    const throttle = controls.accelerate ? 1 : 0
    const brake = controls.brake ? 1 : 0
    const steer = (controls.right ? 1 : 0) - (controls.left ? 1 : 0)

    speedRef.current += throttle * PHYSICS.acceleration * dt
    speedRef.current -= brake * PHYSICS.braking * dt

    if (!throttle && !brake) {
      speedRef.current *= Math.max(0, 1 - PHYSICS.drag * dt)
      if (Math.abs(speedRef.current) < 0.4) {
        speedRef.current = 0
      } else {
        speedRef.current -= Math.sign(speedRef.current) * PHYSICS.rollingFriction * dt
      }
    }

    speedRef.current = clamp(speedRef.current, PHYSICS.maxReverse, PHYSICS.maxForward)

    steeringRef.current += (steer - steeringRef.current) * Math.min(1, PHYSICS.steeringSmooth * dt)
    const steerRatio = clamp(Math.abs(speedRef.current) / PHYSICS.maxForward, 0.2, 1)
    headingRef.current += steeringRef.current * PHYSICS.steeringPower * steerRatio * dt * Math.sign(speedRef.current || 1)

    positionRef.current.x += Math.cos(headingRef.current) * speedRef.current * dt
    positionRef.current.z += Math.sin(headingRef.current) * speedRef.current * dt

    return {
      speed: speedRef.current,
      heading: headingRef.current,
    }
  }, [])

  return { speedRef, headingRef, positionRef, reset, step }
}
