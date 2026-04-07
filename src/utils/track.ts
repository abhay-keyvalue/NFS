import { CatmullRomCurve3, Vector3 } from 'three'

const CONTROL_POINTS = [
  // Start/finish straight
  new Vector3(0, 0, 0),
  new Vector3(50, 0.3, 3),
  new Vector3(100, 0.5, 8),
  // T1 wide right
  new Vector3(138, 1.2, 30),
  new Vector3(152, 2, 60),
  // Gentle straight
  new Vector3(145, 2.8, 90),
  // T3 wide sweeping turn
  new Vector3(130, 3.2, 115),
  new Vector3(105, 3.5, 135),
  new Vector3(75, 3.2, 148),
  // T4-T5 gentle S-curves
  new Vector3(52, 3, 168),
  new Vector3(58, 3.3, 192),
  new Vector3(42, 3.8, 215),
  // T6 sweeping left
  new Vector3(10, 4.2, 238),
  new Vector3(-30, 4, 240),
  new Vector3(-62, 3.5, 222),
  // Back straight
  new Vector3(-85, 3, 185),
  new Vector3(-98, 2.5, 145),
  // T7 gentle right
  new Vector3(-95, 2.8, 110),
  new Vector3(-82, 3.2, 80),
  // T8 smooth chicane
  new Vector3(-88, 3.5, 55),
  new Vector3(-76, 3.8, 35),
  // T9 wide left sweeper
  new Vector3(-88, 3.2, 10),
  new Vector3(-75, 2.5, -10),
  // T10 gentle return to start
  new Vector3(-52, 1.5, -25),
  new Vector3(-28, 0.8, -20),
  new Vector3(-12, 0.3, -10),
]

export const trackCurve = new CatmullRomCurve3(CONTROL_POINTS, true, 'catmullrom', 0.65)

export const TRACK_HALF_WIDTH = 7
export const TRACK_SAMPLE_COUNT = 800

const sampledPoints: Vector3[] = []
const sampledTangents: Vector3[] = []

for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
  const t = i / TRACK_SAMPLE_COUNT
  sampledPoints.push(trackCurve.getPointAt(t))
  sampledTangents.push(trackCurve.getTangentAt(t))
}

export const TRACK_LENGTH = trackCurve.getLength()

const startPoint = trackCurve.getPointAt(0)
const startTangent = trackCurve.getTangentAt(0)
export const START_HEADING = Math.atan2(startTangent.z, startTangent.x)

const lateral = new Vector3(-startTangent.z, 0, startTangent.x).normalize()
const LANE_OFFSET = 2.2

export const START_POSITION = new Vector3(
  startPoint.x + lateral.x * LANE_OFFSET,
  startPoint.y + 0.35,
  startPoint.z + lateral.z * LANE_OFFSET,
)
export const START_POSITION_P2 = new Vector3(
  startPoint.x - lateral.x * LANE_OFFSET,
  startPoint.y + 0.35,
  startPoint.z - lateral.z * LANE_OFFSET,
)

export type TrackQuery = {
  closestPoint: Vector3
  tangent: Vector3
  distance: number
  t: number
}

const _queryResult: TrackQuery = {
  closestPoint: new Vector3(),
  tangent: new Vector3(),
  distance: 0,
  t: 0,
}

/**
 * When hintT is provided, searches a narrow window (±SEARCH_WINDOW) around
 * the last known position instead of the full 800 samples. Falls back to
 * full scan on first call or when the car may have teleported.
 */
const SEARCH_WINDOW = 40

export function getClosestPointOnTrack(pos: Vector3, hintT?: number): TrackQuery {
  let bestDist = Infinity
  let bestIdx = 0

  if (hintT !== undefined) {
    const hint = Math.round(hintT * TRACK_SAMPLE_COUNT)
    for (let j = hint - SEARCH_WINDOW; j <= hint + SEARCH_WINDOW; j++) {
      const i = ((j % TRACK_SAMPLE_COUNT) + TRACK_SAMPLE_COUNT) % TRACK_SAMPLE_COUNT
      const dx = pos.x - sampledPoints[i].x
      const dz = pos.z - sampledPoints[i].z
      const d = dx * dx + dz * dz
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
  } else {
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
      const dx = pos.x - sampledPoints[i].x
      const dz = pos.z - sampledPoints[i].z
      const d = dx * dx + dz * dz
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
  }

  _queryResult.closestPoint = sampledPoints[bestIdx]
  _queryResult.tangent = sampledTangents[bestIdx]
  _queryResult.distance = Math.sqrt(bestDist)
  _queryResult.t = bestIdx / TRACK_SAMPLE_COUNT
  return _queryResult
}

const gatePoint = sampledPoints[0]
const gateNormal = new Vector3(sampledTangents[0].x, 0, sampledTangents[0].z).normalize()

export function crossedStartGate(prevPos: Vector3, curPos: Vector3): boolean {
  const prevDot =
    (prevPos.x - gatePoint.x) * gateNormal.x +
    (prevPos.z - gatePoint.z) * gateNormal.z
  const curDot =
    (curPos.x - gatePoint.x) * gateNormal.x +
    (curPos.z - gatePoint.z) * gateNormal.z

  if (prevDot <= 0 && curDot > 0) {
    const dx = curPos.x - gatePoint.x
    const dz = curPos.z - gatePoint.z
    const lateral = Math.abs(dx * gateNormal.z - dz * gateNormal.x)
    return lateral < TRACK_HALF_WIDTH
  }
  return false
}
