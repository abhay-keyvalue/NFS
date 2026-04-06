import { Sky } from '@react-three/drei'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { trackCurve, TRACK_HALF_WIDTH } from '../utils/track'

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

type TreeProps = {
  position: [number, number, number]
  scale: number
  trunkHeight: number
}

function Tree({ position, scale, trunkHeight }: TreeProps) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.2, trunkHeight, 6]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, trunkHeight + 0.8, 0]}>
        <coneGeometry args={[1.2, 2.4, 7]} />
        <meshStandardMaterial color="#2d6b30" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, trunkHeight + 1.8, 0]}>
        <coneGeometry args={[0.85, 1.8, 7]} />
        <meshStandardMaterial color="#3a8a3e" roughness={0.85} />
      </mesh>
    </group>
  )
}

function Mountain({ position, scale, color }: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}) {
  return (
    <mesh position={position} scale={scale}>
      <coneGeometry args={[1, 1.6, 5]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  )
}

export function EnvironmentObjects() {
  const trees = useMemo(() => {
    const rng = seededRandom(42)
    const items: TreeProps[] = []
    const treeCount = 140

    for (let i = 0; i < treeCount; i++) {
      const t = rng()
      const point = trackCurve.getPointAt(t)
      const tangent = trackCurve.getTangentAt(t)
      const right = new Vector3(-tangent.z, 0, tangent.x).normalize()

      const side = rng() > 0.5 ? 1 : -1
      const lateralDist = TRACK_HALF_WIDTH + 12 + rng() * 40
      const x = point.x + right.x * side * lateralDist
      const z = point.z + right.z * side * lateralDist

      items.push({
        position: [x, point.y - 0.3, z],
        scale: 0.7 + rng() * 0.9,
        trunkHeight: 1.5 + rng() * 1.5,
      })
    }
    return items
  }, [])

  const mountains = useMemo(() => {
    const items: { position: [number, number, number]; scale: [number, number, number]; color: string }[] = []
    const rng = seededRandom(99)
    const center = new Vector3(20, 0, 100)
    const mountainCount = 14

    for (let i = 0; i < mountainCount; i++) {
      const angle = (i / mountainCount) * Math.PI * 2 + rng() * 0.5
      const dist = 200 + rng() * 80
      const x = center.x + Math.cos(angle) * dist
      const z = center.z + Math.sin(angle) * dist
      const h = 15 + rng() * 30
      const w = 20 + rng() * 25

      const greenVal = Math.floor(60 + rng() * 40)
      const blueVal = Math.floor(50 + rng() * 30)
      const color = `rgb(${greenVal - 10}, ${greenVal}, ${blueVal})`

      items.push({
        position: [x, h * 0.3, z],
        scale: [w, h, w],
        color,
      })
    }
    return items
  }, [])

  return (
    <>
      <Sky
        distance={450000}
        turbidity={8}
        rayleigh={2}
        mieCoefficient={0.005}
        sunPosition={[100, 40, -30]}
      />

      {trees.map((tree, idx) => (
        <Tree key={`tree-${idx}`} {...tree} />
      ))}

      {mountains.map((mt, idx) => (
        <Mountain key={`mt-${idx}`} {...mt} />
      ))}
    </>
  )
}
