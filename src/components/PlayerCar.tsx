import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Group } from 'three'
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useCarPhysics } from '../hooks/useCarPhysics'
import { useKeyboardControls, ALL_KEYS_KEYMAP } from '../hooks/useKeyboardControls'
import type { CameraTarget, GameState, KeyMap, Telemetry } from '../types/game'
import { clamp } from '../utils/game'
import {
  START_POSITION,
  TRACK_HALF_WIDTH,
  TRACK_LENGTH,
  crossedStartGate,
  getClosestPointOnTrack,
} from '../utils/track'

const CAR_MODEL = `${import.meta.env.BASE_URL}models/peugeot_205_gti.glb`

type GLTFResult = {
  scene: Group
}

type Props = {
  gameState: GameState
  resetToken: number
  targetRef: MutableRefObject<CameraTarget>
  onTelemetry: (telemetry: Telemetry) => void
  keymap?: KeyMap
  startPos?: Vector3
  carColor?: string
}

export function PlayerCar({
  gameState,
  resetToken,
  targetRef,
  onTelemetry,
  keymap = ALL_KEYS_KEYMAP,
  startPos,
  carColor,
}: Props) {
  const effectiveStart = startPos ?? START_POSITION
  const carRef = useRef<Group>(null)
  const lapRef = useRef(1)
  const lapDistRef = useRef(0)
  const collisionsRef = useRef(0)
  const wallHitActiveRef = useRef(false)
  const telemetryTickRef = useRef(0)
  const prevPosRef = useRef(effectiveStart.clone())

  const { controlsRef, resetControls } = useKeyboardControls(keymap)
  const { speedRef, headingRef, positionRef, step, reset } = useCarPhysics(effectiveStart)
  const gltf = useGLTF(CAR_MODEL) as GLTFResult
  const preparedCarScene = useMemo(() => {
    const carScene = gltf.scene.clone(true)
    const box = new Box3().setFromObject(carScene)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())

    carScene.position.sub(center)
    const maxXZ = Math.max(size.x, size.z) || 1
    const targetLength = 3.6
    carScene.scale.multiplyScalar(targetLength / maxXZ)
    carScene.position.y += 0.4
    carScene.rotation.y = Math.PI * 2

    carScene.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (carColor) {
          const mat = (mesh.material as MeshStandardMaterial).clone()
          mat.color = new Color(carColor)
          mesh.material = mat
        }
      }
    })

    return carScene
  }, [gltf.scene, carColor])

  useEffect(() => {
    reset()
    resetControls()
    lapRef.current = 1
    lapDistRef.current = 0
    collisionsRef.current = 0
    wallHitActiveRef.current = false
    telemetryTickRef.current = 0
    prevPosRef.current.copy(effectiveStart)

    const pos = effectiveStart.clone()
    targetRef.current.position.copy(pos)
    targetRef.current.heading = headingRef.current
    targetRef.current.shake = 0
    onTelemetry({
      speedMps: 0,
      lap: 1,
      collisions: 0,
      position: pos,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken])

  useFrame((_, delta) => {
    if (gameState !== 'running' || !carRef.current) {
      return
    }

    const { speed, heading } = step(delta, controlsRef.current)
    const pos = positionRef.current

    const query = getClosestPointOnTrack(pos)
    const carRadius = 1.2
    const effectiveHalf = TRACK_HALF_WIDTH - carRadius

    if (query.distance > effectiveHalf) {
      if (!wallHitActiveRef.current) {
        collisionsRef.current += 1
        wallHitActiveRef.current = true
        const impactForce = Math.min(Math.abs(speedRef.current) / 20, 1)
        targetRef.current.shake = 0.5 + impactForce * 0.8
      }
      const pushDir = new Vector3(
        query.closestPoint.x - pos.x,
        0,
        query.closestPoint.z - pos.z,
      ).normalize()
      const overshoot = query.distance - effectiveHalf
      pos.x += pushDir.x * overshoot * 0.6
      pos.z += pushDir.z * overshoot * 0.6
      speedRef.current *= -0.15
    } else {
      wallHitActiveRef.current = false
    }

    pos.y = query.closestPoint.y + 0.10

    if (speed > 0.5) {
      lapDistRef.current += Math.abs(speed) * delta
    }

    if (crossedStartGate(prevPosRef.current, pos) && lapDistRef.current > TRACK_LENGTH * 0.5) {
      lapRef.current += 1
      lapDistRef.current = 0
    }

    prevPosRef.current.copy(pos)

    carRef.current.position.copy(pos)
    carRef.current.rotation.set(0, -heading + Math.PI / 2, 0)

    targetRef.current.position.copy(pos)
    targetRef.current.heading = heading

    telemetryTickRef.current -= delta
    if (telemetryTickRef.current <= 0) {
      telemetryTickRef.current = 0.08
      onTelemetry({
        speedMps: clamp(speedRef.current, -40, 40),
        lap: lapRef.current,
        collisions: collisionsRef.current,
        position: pos.clone(),
      })
    }
  })

  return (
    <group ref={carRef} position={effectiveStart.toArray()}>
      <primitive object={preparedCarScene} />
    </group>
  )
}

useGLTF.preload(CAR_MODEL)
