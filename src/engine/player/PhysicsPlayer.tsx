import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import type { CameraProfile } from '../world/WorldProfile'

interface PhysicsPlayerProps {
  cameraProfile?: CameraProfile
  enabled: boolean
  spawn: [number, number, number]
  moveSpeed: number
}

const CAPSULE_HALF_HEIGHT = 0.45
const CAPSULE_RADIUS = 0.35
const CAMERA_EYE_OFFSET = 0.8
const JUMP_VELOCITY = 5.4
const GROUND_CHECK_DISTANCE = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.15

const DEFAULT_ACCELERATION = 16
const DEFAULT_SWAY_FREQUENCY = 9

export function PhysicsPlayer({ cameraProfile, enabled, spawn, moveSpeed }: PhysicsPlayerProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const keysRef = useRef({ KeyW: false, KeyA: false, KeyS: false, KeyD: false })
  const jumpQueuedRef = useRef(false)

  const camera = useThree((state) => state.camera)
  const { world, rapier } = useRapier()

  const forward = useMemo(() => new Vector3(), [])
  const right = useMemo(() => new Vector3(), [])
  const movement = useMemo(() => new Vector3(), [])

  const spawnBodyY = spawn[1] - CAMERA_EYE_OFFSET

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code in keysRef.current) {
        keysRef.current[event.code as keyof typeof keysRef.current] = true
      }

      if (event.code === 'Space') {
        event.preventDefault()
        jumpQueuedRef.current = true
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code in keysRef.current) {
        keysRef.current[event.code as keyof typeof keysRef.current] = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) {
      return
    }

    body.setTranslation({ x: spawn[0], y: spawnBodyY, z: spawn[2] }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    camera.position.set(spawn[0], spawn[1], spawn[2])
  }, [camera, spawn, spawnBodyY])

  useFrame((state, delta) => {
    const body = bodyRef.current
    if (!body) {
      return
    }

    if (!enabled) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      return
    }

    const bodyPosition = body.translation()

    forward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    if (forward.lengthSq() > 0) {
      forward.normalize()
    }

    right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    if (right.lengthSq() > 0) {
      right.normalize()
    }

    movement.set(0, 0, 0)
    if (keysRef.current.KeyW) movement.add(forward)
    if (keysRef.current.KeyS) movement.sub(forward)
    if (keysRef.current.KeyA) movement.sub(right)
    if (keysRef.current.KeyD) movement.add(right)

    const currentVelocity = body.linvel()
    const acceleration = cameraProfile?.movementAcceleration ?? DEFAULT_ACCELERATION
    const velocityBlend = Math.min(acceleration * delta, 1)
    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(moveSpeed)
    }

    const nextX = currentVelocity.x + (movement.x - currentVelocity.x) * velocityBlend
    const nextZ = currentVelocity.z + (movement.z - currentVelocity.z) * velocityBlend

    body.setLinvel(
      {
        x: nextX,
        y: currentVelocity.y,
        z: nextZ,
      },
      true,
    )

    if (jumpQueuedRef.current) {
      const ray = new rapier.Ray(
        { x: bodyPosition.x, y: bodyPosition.y, z: bodyPosition.z },
        { x: 0, y: -1, z: 0 },
      )
      const hit = world.castRay(
        ray,
        GROUND_CHECK_DISTANCE,
        true,
        undefined,
        undefined,
        undefined,
        body,
      )

      if (hit) {
        body.setLinvel(
          {
            x: nextX,
            y: JUMP_VELOCITY,
            z: nextZ,
          },
          true,
        )
      }

      jumpQueuedRef.current = false
    }

    const nextPosition = body.translation()
    const horizontalSpeed = Math.hypot(nextX, nextZ)
    const swayAmount = cameraProfile?.swayAmount ?? 0
    const swayFrequency = cameraProfile?.swayFrequency ?? DEFAULT_SWAY_FREQUENCY
    const swayY =
      horizontalSpeed > 0.15
        ? Math.sin(state.clock.elapsedTime * swayFrequency) * swayAmount
        : 0

    camera.position.set(nextPosition.x, nextPosition.y + CAMERA_EYE_OFFSET + swayY, nextPosition.z)
  })

  return (
    <RigidBody
      ref={bodyRef}
      canSleep={false}
      ccd
      colliders={false}
      enabledRotations={[false, false, false]}
      linearDamping={10}
      mass={1}
      position={[spawn[0], spawnBodyY, spawn[2]]}
      type="dynamic"
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} friction={0.15} restitution={0} />
    </RigidBody>
  )
}
