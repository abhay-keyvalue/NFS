import { CatmullRomCurve3, Vector3 } from 'three'

const CONTROL_POINTS = [
  new Vector3(0, 0, 0),
  new Vector3(30, 0.5, 5),
  new Vector3(55, 2, 25),
  new Vector3(70, 4, 55),
  new Vector3(60, 3, 85),
  new Vector3(30, 1.5, 100),
  new Vector3(0, 0, 90),
  new Vector3(-25, -0.5, 65),
  new Vector3(-35, 1, 40),
  new Vector3(-50, 3.5, 15),
  new Vector3(-50, 2, -10),
  new Vector3(-35, 1, -25),
  new Vector3(-15, 0.3, -20),
]

export const trackCurve = new CatmullRomCurve3(CONTROL_POINTS, true, 'catmullrom', 0.5)

export const TRACK_HALF_WIDTH = 7
export const TRACK_SAMPLE_COUNT = 600

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
export const START_POSITION = new Vector3(startPoint.x, startPoint.y + 0.35, startPoint.z)
export const START_HEADING = Math.atan2(startTangent.z, startTangent.x)

export type TrackQuery = {
  closestPoint: Vector3
  tangent: Vector3
  distance: number
  t: number
}

export function getClosestPointOnTrack(pos: Vector3): TrackQuery {
  let bestDist = Infinity
  let bestIdx = 0

  for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
    const dx = pos.x - sampledPoints[i].x
    const dz = pos.z - sampledPoints[i].z
    const d = dx * dx + dz * dz
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }

  return {
    closestPoint: sampledPoints[bestIdx],
    tangent: sampledTangents[bestIdx],
    distance: Math.sqrt(bestDist),
    t: bestIdx / TRACK_SAMPLE_COUNT,
  }
}

export function isOnTrack(pos: Vector3, halfWidth = TRACK_HALF_WIDTH): boolean {
  const { distance } = getClosestPointOnTrack(pos)
  return distance <= halfWidth
}

export function getTrackElevation(pos: Vector3): number {
  const { closestPoint } = getClosestPointOnTrack(pos)
  return closestPoint.y
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
