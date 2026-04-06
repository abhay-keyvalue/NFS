import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { CameraTarget } from '../types/game'

const SIDE = 0.5
const LOOK_AHEAD = 4
const LOOK_HEIGHT = 1.5
const LERP_SPEED = 4.5

function computeDesired(
  target: CameraTarget,
  behind: number,
  height: number,
  out: Vector3,
) {
  const { position, heading } = target
  out.set(
    position.x - Math.cos(heading) * behind + Math.sin(heading) * SIDE,
    position.y + height,
    position.z - Math.sin(heading) * behind - Math.cos(heading) * SIDE,
  )
}

function computeLookAt(target: CameraTarget, out: Vector3) {
  const { position, heading } = target
  out.set(
    position.x + Math.cos(heading) * LOOK_AHEAD,
    position.y + LOOK_HEIGHT,
    position.z + Math.sin(heading) * LOOK_AHEAD,
  )
}

function applyShake(target: CameraTarget, pos: Vector3, delta: number) {
  if (target.shake > 0.01) {
    const intensity = target.shake * 0.4
    pos.x += (Math.random() - 0.5) * intensity
    pos.y += (Math.random() - 0.5) * intensity * 0.6
    pos.z += (Math.random() - 0.5) * intensity
    target.shake *= Math.max(0, 1 - delta * 8)
  } else {
    target.shake = 0
  }
}

type SingleProps = {
  targetRef: MutableRefObject<CameraTarget>
}

export function FollowCamera({ targetRef }: SingleProps) {
  const { camera } = useThree()
  const desiredPos = useMemo(() => new Vector3(), [])
  const lookAtPos = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    const target = targetRef.current
    computeDesired(target, 12, 5.5, desiredPos)
    applyShake(target, desiredPos, delta)
    camera.position.lerp(desiredPos, 1 - Math.exp(-delta * LERP_SPEED))
    computeLookAt(target, lookAtPos)
    camera.lookAt(lookAtPos)
  })

  return null
}

type SplitProps = {
  targetRefP1: MutableRefObject<CameraTarget>
  targetRefP2: MutableRefObject<CameraTarget>
}

const OVERVIEW_BEHIND = 22
const OVERVIEW_HEIGHT = 14
const OVERVIEW_FOV = 62

const PLAYER_BEHIND = 14
const PLAYER_HEIGHT = 7
const PLAYER_FOV = 68

export function SplitScreenCamera({ targetRefP1, targetRefP2 }: SplitProps) {
  const initializedRef = useRef(false)

  const camOverview = useMemo(() => new PerspectiveCamera(OVERVIEW_FOV, 1, 0.1, 500), [])
  const camP1 = useMemo(() => new PerspectiveCamera(PLAYER_FOV, 1, 0.1, 500), [])
  const camP2 = useMemo(() => new PerspectiveCamera(PLAYER_FOV, 1, 0.1, 500), [])

  const desOverview = useMemo(() => new Vector3(), [])
  const lookOverview = useMemo(() => new Vector3(), [])
  const desP1 = useMemo(() => new Vector3(), [])
  const lookP1 = useMemo(() => new Vector3(), [])
  const desP2 = useMemo(() => new Vector3(), [])
  const lookP2 = useMemo(() => new Vector3(), [])
  const midPos = useMemo(() => new Vector3(), [])

  useFrame(({ gl, scene, size }, delta) => {
    const t1 = targetRefP1.current
    const t2 = targetRefP2.current

    // Overview camera: follows midpoint of both players
    midPos.lerpVectors(t1.position, t2.position, 0.5)
    const midHeading = (t1.heading + t2.heading) / 2
    const dist = t1.position.distanceTo(t2.position)
    const dynamicBehind = OVERVIEW_BEHIND + Math.max(0, dist - 15) * 0.4
    const dynamicHeight = OVERVIEW_HEIGHT + Math.max(0, dist - 15) * 0.3

    const fakeOverviewTarget: CameraTarget = {
      position: midPos,
      heading: midHeading,
      shake: Math.max(t1.shake, t2.shake),
    }
    computeDesired(fakeOverviewTarget, dynamicBehind, dynamicHeight, desOverview)
    applyShake(fakeOverviewTarget, desOverview, delta)
    lookOverview.set(
      midPos.x + Math.cos(midHeading) * 6,
      midPos.y + 1.5,
      midPos.z + Math.sin(midHeading) * 6,
    )

    // P1 camera
    computeDesired(t1, PLAYER_BEHIND, PLAYER_HEIGHT, desP1)
    applyShake(t1, desP1, delta)
    computeLookAt(t1, lookP1)

    // P2 camera
    computeDesired(t2, PLAYER_BEHIND, PLAYER_HEIGHT, desP2)
    applyShake(t2, desP2, delta)
    computeLookAt(t2, lookP2)

    if (!initializedRef.current) {
      camOverview.position.copy(desOverview)
      camP1.position.copy(desP1)
      camP2.position.copy(desP2)
      initializedRef.current = true
    } else {
      const lerpFactor = 1 - Math.exp(-delta * LERP_SPEED)
      camOverview.position.lerp(desOverview, lerpFactor)
      camP1.position.lerp(desP1, lerpFactor)
      camP2.position.lerp(desP2, lerpFactor)
    }

    camOverview.lookAt(lookOverview)
    camP1.lookAt(lookP1)
    camP2.lookAt(lookP2)

    // Three.js setViewport/setScissor expect CSS pixels (internally multiplied by DPR)
    const w = size.width
    const h = size.height
    const halfH = Math.floor(h / 2)
    const halfW = Math.floor(w / 2)

    camOverview.aspect = w / halfH
    camOverview.updateProjectionMatrix()

    const bottomAspect = halfW / halfH
    camP1.aspect = bottomAspect
    camP1.updateProjectionMatrix()
    camP2.aspect = bottomAspect
    camP2.updateProjectionMatrix()

    gl.setScissorTest(true)

    // Top half: overview (WebGL y=0 is bottom, so top half starts at y=halfH)
    gl.setViewport(0, halfH, w, h - halfH)
    gl.setScissor(0, halfH, w, h - halfH)
    gl.render(scene, camOverview)

    // Bottom-left: P2
    gl.setViewport(0, 0, halfW, halfH)
    gl.setScissor(0, 0, halfW, halfH)
    gl.render(scene, camP2)

    // Bottom-right: P1
    gl.setViewport(halfW, 0, w - halfW, halfH)
    gl.setScissor(halfW, 0, w - halfW, halfH)
    gl.render(scene, camP1)

    // Reset state for next frame
    gl.setScissorTest(false)
    gl.setViewport(0, 0, w, h)
  }, 1)

  return null
}
