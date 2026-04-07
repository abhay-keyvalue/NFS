import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Group } from 'three'
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { CameraTarget, Difficulty, GameState, Telemetry } from '../types/game'
import {
  trackCurve,
  TRACK_LENGTH,
  START_POSITION_P2,
  crossedStartGate,
} from '../utils/track'

const CAR_MODEL = `${import.meta.env.BASE_URL}models/peugeot_205_gti.glb`

const AI_PROFILES: Record<Difficulty, { baseSpeed: number; variation: number; wobble: number }> = {
  easy:   { baseSpeed: 16, variation: 3,   wobble: 2.5 },
  medium: { baseSpeed: 22, variation: 4,   wobble: 1.5 },
  hard:   { baseSpeed: 28, variation: 2.5, wobble: 0.6 },
}

const AI_VARIATION_FREQ = 0.3
const CAR_COLLISION_DIST = 2.5

type GLTFResult = { scene: Group }

type Props = {
  gameState: GameState
  resetToken: number
  targetRef: MutableRefObject<CameraTarget>
  onTelemetry: (telemetry: Telemetry) => void
  opponentRef?: MutableRefObject<CameraTarget>
  difficulty: Difficulty
}

export function AICar({ gameState, resetToken, targetRef, onTelemetry, opponentRef, difficulty }: Props) {
  const carRef = useRef<Group>(null)
  const tRef = useRef(0)
  const lapRef = useRef(1)
  const lapDistRef = useRef(0)
  const telemetryTickRef = useRef(0)
  const speedRef = useRef(0)
  const prevPosRef = useRef(new Vector3())
  const timeRef = useRef(0)
  const collisionsRef = useRef(0)
  const carHitActiveRef = useRef(false)

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
        const mat = (mesh.material as MeshStandardMaterial).clone()
        mat.color = new Color('#2266ff')
        mesh.material = mat
      }
    })

    return carScene
  }, [gltf.scene])

  const startPos = useMemo(() => START_POSITION_P2.clone(), [])

  useEffect(() => {
    tRef.current = 0
    lapRef.current = 1
    lapDistRef.current = 0
    speedRef.current = 0
    telemetryTickRef.current = 0
    timeRef.current = 0
    collisionsRef.current = 0
    carHitActiveRef.current = false
    prevPosRef.current.copy(startPos)

    targetRef.current.position.copy(startPos)
    targetRef.current.heading = 0
    targetRef.current.shake = 0

    onTelemetry({ speedMps: 0, lap: 1, collisions: 0, position: startPos.clone() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken])

  useFrame((_, delta) => {
    if (!carRef.current) return

    if (gameState === 'countdown') {
      const revIntensity = 0.008
      carRef.current.position.x += (Math.random() - 0.5) * revIntensity
      carRef.current.position.z += (Math.random() - 0.5) * revIntensity
      return
    }

    if (gameState !== 'running') return

    const dt = Math.min(delta, 0.05)
    timeRef.current += dt

    const profile = AI_PROFILES[difficulty]
    const speedVariation = Math.sin(timeRef.current * AI_VARIATION_FREQ * Math.PI * 2) * profile.variation
    const currentSpeed = profile.baseSpeed + speedVariation
    speedRef.current = currentSpeed

    const distThisFrame = currentSpeed * dt
    const tDelta = distThisFrame / TRACK_LENGTH
    tRef.current = (tRef.current + tDelta) % 1

    const point = trackCurve.getPointAt(tRef.current)
    const tangent = trackCurve.getTangentAt(tRef.current)

    const lateralWobble = Math.sin(timeRef.current * 0.7) * profile.wobble
    const lateral = new Vector3(-tangent.z, 0, tangent.x).normalize()

    const pos = point.clone()
    pos.x += lateral.x * lateralWobble
    pos.z += lateral.z * lateralWobble
    pos.y += 0.10

    if (opponentRef) {
      const opp = opponentRef.current.position
      const dx = pos.x - opp.x
      const dz = pos.z - opp.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < CAR_COLLISION_DIST && dist > 0.01) {
        const overlap = CAR_COLLISION_DIST - dist
        const nx = dx / dist
        const nz = dz / dist
        pos.x += nx * overlap * 0.5
        pos.z += nz * overlap * 0.5
        speedRef.current *= 0.7

        if (!carHitActiveRef.current) {
          collisionsRef.current += 1
          carHitActiveRef.current = true
        }
      } else {
        carHitActiveRef.current = false
      }
    }

    const heading = Math.atan2(tangent.z, tangent.x)

    lapDistRef.current += Math.abs(distThisFrame)

    if (crossedStartGate(prevPosRef.current, pos) && lapDistRef.current > TRACK_LENGTH * 0.5) {
      lapRef.current += 1
      lapDistRef.current = 0
    }

    prevPosRef.current.copy(pos)

    carRef.current.position.copy(pos)
    carRef.current.rotation.set(0, -heading + Math.PI / 2, 0)

    targetRef.current.position.copy(pos)
    targetRef.current.heading = heading
    targetRef.current.shake = 0

    telemetryTickRef.current -= dt
    if (telemetryTickRef.current <= 0) {
      telemetryTickRef.current = 0.08
      onTelemetry({
        speedMps: currentSpeed,
        lap: lapRef.current,
        collisions: collisionsRef.current,
        position: pos.clone(),
      })
    }
  })

  return (
    <group ref={carRef} position={startPos.toArray()}>
      <primitive object={preparedCarScene} />
    </group>
  )
}
