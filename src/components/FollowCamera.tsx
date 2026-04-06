import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import type { MutableRefObject } from 'react'
import { Vector3 } from 'three'
import type { CameraTarget } from '../types/game'

type Props = {
  targetRef: MutableRefObject<CameraTarget>
}

export function FollowCamera({ targetRef }: Props) {
  const { camera } = useThree()
  const desiredPos = useMemo(() => new Vector3(), [])
  const lookAtPos = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    const target = targetRef.current
    const { position, heading } = target
    const behind = 12
    const side = 0.5
    const height = 5.5

    desiredPos.set(
      position.x - Math.cos(heading) * behind + Math.sin(heading) * side,
      position.y + height,
      position.z - Math.sin(heading) * behind - Math.cos(heading) * side,
    )

    if (target.shake > 0.01) {
      const intensity = target.shake * 0.4
      desiredPos.x += (Math.random() - 0.5) * intensity
      desiredPos.y += (Math.random() - 0.5) * intensity * 0.6
      desiredPos.z += (Math.random() - 0.5) * intensity
      target.shake *= Math.max(0, 1 - delta * 8)
    } else {
      target.shake = 0
    }

    camera.position.lerp(desiredPos, 1 - Math.exp(-delta * 4.5))

    lookAtPos.set(
      position.x + Math.cos(heading) * 4,
      position.y + 1.5,
      position.z + Math.sin(heading) * 4,
    )
    camera.lookAt(lookAtPos)
  })

  return null
}
