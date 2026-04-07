import { useMemo } from 'react'
import * as THREE from 'three'
import { trackCurve, TRACK_HALF_WIDTH } from '../utils/track'

const ROAD_SAMPLES = 600
const CURB_WIDTH = 0.7
const SHOULDER_WIDTH = 0.001

function sampleTrackFrames(count: number) {
  const points: THREE.Vector3[] = []
  const tangents: THREE.Vector3[] = []
  const normals: THREE.Vector3[] = []

  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= count; i++) {
    const t = i / count
    const pt = trackCurve.getPointAt(t % 1)
    const tan = trackCurve.getTangentAt(t % 1).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up).normalize()

    points.push(pt)
    tangents.push(tan)
    normals.push(right)
  }
  return { points, tangents, normals }
}

function buildRibbonGeometry(
  frames: ReturnType<typeof sampleTrackFrames>,
  halfWidth: number,
  yOffset: number,
): THREE.BufferGeometry {
  const { points, normals } = frames
  const count = points.length
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i < count; i++) {
    const p = points[i]
    const n = normals[i]
    const u = i / (count - 1)

    positions.push(
      p.x - n.x * halfWidth, p.y + yOffset, p.z - n.z * halfWidth,
      p.x + n.x * halfWidth, p.y + yOffset, p.z + n.z * halfWidth,
    )
    uvs.push(u, 0, u, 1)
  }

  for (let i = 0; i < count - 1; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2)
    indices.push(a + 1, a + 3, a + 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildCurbGeometry(
  frames: ReturnType<typeof sampleTrackFrames>,
  halfWidth: number,
  curbWidth: number,
  side: 1 | -1,
  yOffset: number,
): THREE.BufferGeometry {
  const { points, normals } = frames
  const count = points.length
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  const red = [0.85, 0.12, 0.1]
  const white = [0.95, 0.95, 0.95]

  for (let i = 0; i < count; i++) {
    const p = points[i]
    const n = normals[i]

    const innerOffset = halfWidth * side
    const outerOffset = (halfWidth + curbWidth) * side

    positions.push(
      p.x + n.x * innerOffset, p.y + yOffset, p.z + n.z * innerOffset,
      p.x + n.x * outerOffset, p.y + yOffset, p.z + n.z * outerOffset,
    )

    const stripe = Math.floor(i / 4) % 2 === 0 ? red : white
    colors.push(...stripe, ...stripe)
  }

  for (let i = 0; i < count - 1; i++) {
    const a = i * 2
    if (side === 1) {
      indices.push(a, a + 2, a + 1)
      indices.push(a + 1, a + 2, a + 3)
    } else {
      indices.push(a, a + 1, a + 2)
      indices.push(a + 1, a + 3, a + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildShoulderGeometry(
  frames: ReturnType<typeof sampleTrackFrames>,
  halfWidth: number,
  curbWidth: number,
  shoulderWidth: number,
  side: 1 | -1,
  yOffset: number,
): THREE.BufferGeometry {
  const { points, normals } = frames
  const count = points.length
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < count; i++) {
    const p = points[i]
    const n = normals[i]

    const innerOffset = (halfWidth + curbWidth) * side
    const outerOffset = (halfWidth + curbWidth + shoulderWidth) * side

    positions.push(
      p.x + n.x * innerOffset, p.y + yOffset - 0.02, p.z + n.z * innerOffset,
      p.x + n.x * outerOffset, p.y + yOffset - 0.05, p.z + n.z * outerOffset,
    )
  }

  for (let i = 0; i < count - 1; i++) {
    const a = i * 2
    if (side === 1) {
      indices.push(a, a + 2, a + 1)
      indices.push(a + 1, a + 2, a + 3)
    } else {
      indices.push(a, a + 1, a + 2)
      indices.push(a + 1, a + 3, a + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildStartLineGeometry(
  frames: ReturnType<typeof sampleTrackFrames>,
  halfWidth: number,
): THREE.BufferGeometry {
  const p = frames.points[0]
  const n = frames.normals[0]
  const t = frames.tangents[0]
  const depth = 1.5

  const hw = halfWidth - CURB_WIDTH
  const positions = [
    p.x - n.x * hw - t.x * depth * 0.5, p.y + 0.02, p.z - n.z * hw - t.z * depth * 0.5,
    p.x + n.x * hw - t.x * depth * 0.5, p.y + 0.02, p.z + n.z * hw - t.z * depth * 0.5,
    p.x - n.x * hw + t.x * depth * 0.5, p.y + 0.02, p.z - n.z * hw + t.z * depth * 0.5,
    p.x + n.x * hw + t.x * depth * 0.5, p.y + 0.02, p.z + n.z * hw + t.z * depth * 0.5,
  ]

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex([0, 1, 2, 1, 3, 2])
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2))
  geo.computeVertexNormals()
  return geo
}

function createCheckerTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cellSize = size / 8
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#1a1a1a'
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 1)
  return tex
}

function buildLineMarkingGeometry(
  frames: ReturnType<typeof sampleTrackFrames>,
  lateralOffset: number,
  lineWidth: number,
  yOffset: number,
  dashLength: number,
  gapLength: number,
): THREE.BufferGeometry {
  const { points, normals } = frames
  const count = points.length
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  const hw = lineWidth / 2
  const white = [1, 1, 1]
  const road = [0.227, 0.227, 0.227]

  for (let i = 0; i < count; i++) {
    const p = points[i]
    const n = normals[i]

    const cx = p.x + n.x * lateralOffset
    const cz = p.z + n.z * lateralOffset

    positions.push(
      cx - n.x * hw, p.y + yOffset, cz - n.z * hw,
      cx + n.x * hw, p.y + yOffset, cz + n.z * hw,
    )

    let color: number[]
    if (dashLength <= 0) {
      color = white
    } else {
      const cycle = dashLength + gapLength
      const pos = i % cycle
      color = pos < dashLength ? white : road
    }
    colors.push(...color, ...color)
  }

  for (let i = 0; i < count - 1; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2)
    indices.push(a + 1, a + 3, a + 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildFenceRailGeometry(
  frames: ReturnType<typeof sampleTrackFrames>,
  halfWidth: number,
  side: 1 | -1,
  railY: number,
  railThickness: number,
): THREE.BufferGeometry {
  const { points, normals } = frames
  const count = points.length
  const positions: number[] = []
  const indices: number[] = []

  const offset = (halfWidth + CURB_WIDTH + SHOULDER_WIDTH) * side
  const ht = railThickness / 2

  for (let i = 0; i < count; i++) {
    const p = points[i]
    const n = normals[i]
    const bx = p.x + n.x * offset
    const bz = p.z + n.z * offset

    positions.push(bx, p.y + railY - ht, bz)
    positions.push(bx, p.y + railY + ht, bz)
  }

  for (let i = 0; i < count - 1; i++) {
    const a = i * 2
    if (side === 1) {
      indices.push(a, a + 2, a + 1)
      indices.push(a + 1, a + 2, a + 3)
    } else {
      indices.push(a, a + 1, a + 2)
      indices.push(a + 1, a + 3, a + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

type FencePost = { position: [number, number, number]; height: number }

function computeFencePosts(
  frames: ReturnType<typeof sampleTrackFrames>,
  halfWidth: number,
  side: 1 | -1,
  spacing: number,
): FencePost[] {
  const { points, normals } = frames
  const offset = (halfWidth + CURB_WIDTH + SHOULDER_WIDTH + 0.3) * side
  const posts: FencePost[] = []

  for (let i = 0; i < points.length - 1; i += spacing) {
    const p = points[i]
    const n = normals[i]
    const bx = p.x + n.x * offset
    const bz = p.z + n.z * offset
    const h = 1.3
    posts.push({ position: [bx, p.y + h / 2 - 0.05, bz], height: h })
  }
  return posts
}

function FencePosts({ posts }: { posts: FencePost[] }) {
  return (
    <>
      {posts.map((post, idx) => (
        <mesh key={idx} position={post.position} castShadow>
          <boxGeometry args={[0.15, post.height, 0.15]} />
          <meshStandardMaterial color="#c8c8c8" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </>
  )
}

export function Track() {
  const frames = useMemo(() => sampleTrackFrames(ROAD_SAMPLES), [])
  const roadGeo = useMemo(() => buildRibbonGeometry(frames, TRACK_HALF_WIDTH, 0.01), [frames])
  const leftCurb = useMemo(() => buildCurbGeometry(frames, TRACK_HALF_WIDTH, CURB_WIDTH, -1, 0.015), [frames])
  const rightCurb = useMemo(() => buildCurbGeometry(frames, TRACK_HALF_WIDTH, CURB_WIDTH, 1, 0.015), [frames])
  const leftShoulder = useMemo(() => buildShoulderGeometry(frames, TRACK_HALF_WIDTH, CURB_WIDTH, SHOULDER_WIDTH, -1, 0.005), [frames])
  const rightShoulder = useMemo(() => buildShoulderGeometry(frames, TRACK_HALF_WIDTH, CURB_WIDTH, SHOULDER_WIDTH, 1, 0.005), [frames])
  const startLine = useMemo(() => buildStartLineGeometry(frames, TRACK_HALF_WIDTH), [frames])
  const checkerTex = useMemo(() => createCheckerTexture(), [])
  const leftRailTop = useMemo(() => buildFenceRailGeometry(frames, TRACK_HALF_WIDTH, -1, 1.1, 0.12), [frames])
  const leftRailMid = useMemo(() => buildFenceRailGeometry(frames, TRACK_HALF_WIDTH, -1, 0.6, 0.1), [frames])
  const rightRailTop = useMemo(() => buildFenceRailGeometry(frames, TRACK_HALF_WIDTH, 1, 1.1, 0.12), [frames])
  const rightRailMid = useMemo(() => buildFenceRailGeometry(frames, TRACK_HALF_WIDTH, 1, 0.6, 0.1), [frames])
  const leftPosts = useMemo(() => computeFencePosts(frames, TRACK_HALF_WIDTH, -1, 8), [frames])
  const rightPosts = useMemo(() => computeFencePosts(frames, TRACK_HALF_WIDTH, 1, 8), [frames])

  const centerLine = useMemo(() => buildLineMarkingGeometry(frames, 0, 0.18, 0.02, 6, 8), [frames])
  const leftEdgeLine = useMemo(() => buildLineMarkingGeometry(frames, -(TRACK_HALF_WIDTH - 0.35), 0.15, 0.02, 0, 0), [frames])
  const rightEdgeLine = useMemo(() => buildLineMarkingGeometry(frames, TRACK_HALF_WIDTH - 0.35, 0.15, 0.02, 0, 0), [frames])

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.3, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#4a8c3a" roughness={1} />
      </mesh>

      {/* Water body inside the track loop */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.18, 110]} scale={[75, 50, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color="#1a6e9e"
          roughness={0.08}
          metalness={0.4}
          transparent
          opacity={0.88}
        />
      </mesh>

      <mesh receiveShadow>
        <primitive object={roadGeo} attach="geometry" />
        <meshStandardMaterial color="#3a3a3a" roughness={0.88} metalness={0.02} />
      </mesh>

      {/* Road markings */}
      <mesh>
        <primitive object={centerLine} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>
      <mesh>
        <primitive object={leftEdgeLine} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>
      <mesh>
        <primitive object={rightEdgeLine} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>

      <mesh receiveShadow>
        <primitive object={leftCurb} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.55} />
      </mesh>
      <mesh receiveShadow>
        <primitive object={rightCurb} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.55} />
      </mesh>

      <mesh receiveShadow>
        <primitive object={leftShoulder} attach="geometry" />
        <meshStandardMaterial color="#6b5d4f" roughness={1} />
      </mesh>
      <mesh receiveShadow>
        <primitive object={rightShoulder} attach="geometry" />
        <meshStandardMaterial color="#6b5d4f" roughness={1} />
      </mesh>

      <mesh receiveShadow>
        <primitive object={startLine} attach="geometry" />
        <meshStandardMaterial map={checkerTex} roughness={0.4} />
      </mesh>

      <mesh>
        <primitive object={leftRailTop} attach="geometry" />
        <meshStandardMaterial color="#d0d0d0" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh>
        <primitive object={leftRailMid} attach="geometry" />
        <meshStandardMaterial color="#b8b8b8" roughness={0.45} metalness={0.45} />
      </mesh>
      <mesh>
        <primitive object={rightRailTop} attach="geometry" />
        <meshStandardMaterial color="#d0d0d0" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh>
        <primitive object={rightRailMid} attach="geometry" />
        <meshStandardMaterial color="#b8b8b8" roughness={0.45} metalness={0.45} />
      </mesh>
      <FencePosts posts={leftPosts} />
      <FencePosts posts={rightPosts} />
    </group>
  )
}
