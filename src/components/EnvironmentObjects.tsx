import { Sky } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import {
  ConeGeometry,
  CylinderGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { trackCurve, TRACK_HALF_WIDTH } from '../utils/track'

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

type TreeData = {
  x: number
  y: number
  z: number
  scale: number
  trunkHeight: number
}

const TREE_COUNT = 140

function buildTreeData(): TreeData[] {
  const rng = seededRandom(42)
  const items: TreeData[] = []

  for (let i = 0; i < TREE_COUNT; i++) {
    const t = rng()
    const point = trackCurve.getPointAt(t)
    const tangent = trackCurve.getTangentAt(t)
    const rx = -tangent.z
    const rz = tangent.x
    const len = Math.sqrt(rx * rx + rz * rz)
    const nx = rx / len
    const nz = rz / len

    const side = rng() > 0.5 ? 1 : -1
    const lateralDist = TRACK_HALF_WIDTH + 12 + rng() * 40

    items.push({
      x: point.x + nx * side * lateralDist,
      y: point.y - 0.3,
      z: point.z + nz * side * lateralDist,
      scale: 0.7 + rng() * 0.9,
      trunkHeight: 1.5 + rng() * 1.5,
    })
  }
  return items
}

const _dummy = new Object3D()

function InstancedTrees() {
  const trees = useMemo(buildTreeData, [])

  const trunkGeo = useMemo(() => new CylinderGeometry(0.15, 0.2, 1, 6), [])
  const lowerConeGeo = useMemo(() => new ConeGeometry(1.2, 2.4, 7), [])
  const upperConeGeo = useMemo(() => new ConeGeometry(0.85, 1.8, 7), [])

  const trunkMat = useMemo(() => new MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.9 }), [])
  const lowerConeMat = useMemo(() => new MeshStandardMaterial({ color: '#2d6b30', roughness: 0.85 }), [])
  const upperConeMat = useMemo(() => new MeshStandardMaterial({ color: '#3a8a3e', roughness: 0.85 }), [])

  const trunkRef = useRef<InstancedMesh>(null)
  const lowerConeRef = useRef<InstancedMesh>(null)
  const upperConeRef = useRef<InstancedMesh>(null)

  useEffect(() => {
    const trunk = trunkRef.current
    const lower = lowerConeRef.current
    const upper = upperConeRef.current
    if (!trunk || !lower || !upper) return

    for (let i = 0; i < trees.length; i++) {
      const { x, y, z, scale: s, trunkHeight: th } = trees[i]

      _dummy.position.set(x, y + s * th * 0.5, z)
      _dummy.scale.set(s, s * th, s)
      _dummy.updateMatrix()
      trunk.setMatrixAt(i, _dummy.matrix)

      _dummy.position.set(x, y + s * (th + 0.8), z)
      _dummy.scale.set(s, s, s)
      _dummy.updateMatrix()
      lower.setMatrixAt(i, _dummy.matrix)

      _dummy.position.set(x, y + s * (th + 1.8), z)
      _dummy.updateMatrix()
      upper.setMatrixAt(i, _dummy.matrix)
    }

    trunk.instanceMatrix.needsUpdate = true
    lower.instanceMatrix.needsUpdate = true
    upper.instanceMatrix.needsUpdate = true
  }, [trees])

  return (
    <>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, TREE_COUNT]} castShadow />
      <instancedMesh ref={lowerConeRef} args={[lowerConeGeo, lowerConeMat, TREE_COUNT]} castShadow />
      <instancedMesh ref={upperConeRef} args={[upperConeGeo, upperConeMat, TREE_COUNT]} castShadow />
    </>
  )
}

function Mountains() {
  const geo = useMemo(() => new ConeGeometry(1, 1.6, 5), [])
  const meshRef = useRef<InstancedMesh>(null)

  const data = useMemo(() => {
    const rng = seededRandom(99)
    const center = new Vector3(20, 0, 100)
    const count = 14
    const items: { matrix: Matrix4; color: Color }[] = []

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng() * 0.5
      const dist = 200 + rng() * 80
      const x = center.x + Math.cos(angle) * dist
      const z = center.z + Math.sin(angle) * dist
      const h = 15 + rng() * 30
      const w = 20 + rng() * 25

      const greenVal = (60 + rng() * 40) / 255
      const blueVal = (50 + rng() * 30) / 255
      const redVal = (greenVal * 255 - 10) / 255

      const mat = new Matrix4()
      _dummy.position.set(x, h * 0.3, z)
      _dummy.scale.set(w, h, w)
      _dummy.updateMatrix()
      mat.copy(_dummy.matrix)

      items.push({ matrix: mat, color: new Color(redVal, greenVal, blueVal) })
    }
    return items
  }, [])

  const material = useMemo(() => new MeshStandardMaterial({ roughness: 1, flatShading: true }), [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    for (let i = 0; i < data.length; i++) {
      mesh.setMatrixAt(i, data[i].matrix)
      mesh.setColorAt(i, data[i].color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data])

  return (
    <instancedMesh ref={meshRef} args={[geo, material, data.length]} />
  )
}

export function EnvironmentObjects() {
  return (
    <>
      <Sky
        distance={450000}
        turbidity={8}
        rayleigh={2}
        mieCoefficient={0.005}
        sunPosition={[100, 40, -30]}
      />
      <InstancedTrees />
      <Mountains />
    </>
  )
}
