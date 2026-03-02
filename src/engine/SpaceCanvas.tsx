import { PointerLockControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { useEngineStore } from '../store/useEngineStore'
import { InteractionSystem } from './interaction/InteractionSystem'
import { SpaceManager } from './SpaceManager'
import { spaceRegistry } from './spaces/registry'
import type { SpacePath } from './spaces/types'

const ZOOM_IN_MS = 260
const ZOOM_OUT_MS = 300
const DEFAULT_FOV = 72

function easeInOut(t: number) {
  return t * t * (3 - 2 * t)
}

function isPerspectiveCamera(camera: unknown): camera is PerspectiveCamera {
  return camera instanceof PerspectiveCamera
}

function CameraTransitionRig() {
  const baseCamera = useThree((state) => state.camera)
  const spaceId = useEngineStore((state) => state.spaceId)

  const transition = useEngineStore((state) => state.transition)
  const setTransitionPhase = useEngineStore((state) => state.setTransitionPhase)
  const clearTransition = useEngineStore((state) => state.clearTransition)

  const phaseRef = useRef(transition.phase)
  const startedAtRef = useRef(0)

  const startPos = useRef(new Vector3())
  const targetPos = useRef(new Vector3())

  const startQuat = useRef(new Quaternion())
  const targetQuat = useRef(new Quaternion())

  const startFov = useRef(DEFAULT_FOV)
  const targetFov = useRef(DEFAULT_FOV)

  const tempDirection = useMemo(() => new Vector3(), [])
  const tempFocus = useMemo(() => new Vector3(), [])
  const lookAtMatrix = useMemo(() => new Matrix4(), [])
  const baseSpaceFov = spaceRegistry[spaceId].profile.camera?.fov ?? DEFAULT_FOV

  useEffect(() => {
    if (!isPerspectiveCamera(baseCamera)) {
      return
    }
    if (transition.phase !== 'idle') {
      return
    }
    baseCamera.fov = baseSpaceFov
    baseCamera.updateProjectionMatrix()
  }, [baseCamera, baseSpaceFov, transition.phase])

  const startZoomIn = (camera: PerspectiveCamera) => {
    startedAtRef.current = performance.now()

    startPos.current.copy(camera.position)
    startQuat.current.copy(camera.quaternion)
    startFov.current = camera.fov

    if (transition.focusPoint) {
      tempFocus.set(...transition.focusPoint)
      targetPos.current.copy(startPos.current).lerp(tempFocus, 0.34)
      lookAtMatrix.lookAt(targetPos.current, tempFocus, camera.up)
      targetQuat.current.setFromRotationMatrix(lookAtMatrix)
    } else {
      camera.getWorldDirection(tempDirection)
      targetPos.current.copy(startPos.current).add(tempDirection.multiplyScalar(1.1))
      targetQuat.current.copy(startQuat.current)
    }

    targetFov.current = Math.max(baseSpaceFov - 22, 44)
  }

  const startZoomOut = (camera: PerspectiveCamera) => {
    startedAtRef.current = performance.now()

    startPos.current.copy(camera.position)
    targetPos.current.copy(camera.position)

    startQuat.current.copy(camera.quaternion)
    targetQuat.current.copy(camera.quaternion)

    startFov.current = camera.fov
    targetFov.current = baseSpaceFov
  }

  useFrame(() => {
    if (!isPerspectiveCamera(baseCamera)) {
      return
    }
    const camera = baseCamera

    if (transition.phase !== phaseRef.current) {
      phaseRef.current = transition.phase

      if (transition.phase === 'zoom-in') {
        startZoomIn(camera)
      } else if (transition.phase === 'zoom-out') {
        startZoomOut(camera)
      }
    }

    if (transition.phase === 'zoom-in') {
      const elapsed = performance.now() - startedAtRef.current
      const t = Math.min(elapsed / ZOOM_IN_MS, 1)
      const eased = easeInOut(t)

      camera.position.lerpVectors(startPos.current, targetPos.current, eased)
      camera.quaternion.slerpQuaternions(startQuat.current, targetQuat.current, eased)
      camera.fov = startFov.current + (targetFov.current - startFov.current) * eased
      camera.updateProjectionMatrix()

      if (t >= 1) {
        setTransitionPhase('navigate')
      }
      return
    }

    if (transition.phase === 'zoom-out') {
      const elapsed = performance.now() - startedAtRef.current
      const t = Math.min(elapsed / ZOOM_OUT_MS, 1)
      const eased = easeInOut(t)

      camera.position.lerpVectors(startPos.current, targetPos.current, eased)
      camera.quaternion.slerpQuaternions(startQuat.current, targetQuat.current, eased)
      camera.fov = startFov.current + (targetFov.current - startFov.current) * eased
      camera.updateProjectionMatrix()

      if (t >= 1) {
        clearTransition()
      }
    }
  })

  return null
}

export function SpaceCanvas() {
  const navigate = useNavigate()
  const location = useLocation()

  const spaceId = useEngineStore((state) => state.spaceId)
  const transition = useEngineStore((state) => state.transition)
  const knowledgeHudOpen = useEngineStore((state) => state.knowledgeHudOpen)
  const startTransition = useEngineStore((state) => state.startTransition)
  const setTransitionPhase = useEngineStore((state) => state.setTransitionPhase)

  const isTransitioning = transition.phase !== 'idle'
  const baseSpaceFov = spaceRegistry[spaceId].profile.camera?.fov ?? DEFAULT_FOV

  useEffect(() => {
    if ((isTransitioning || knowledgeHudOpen) && document.pointerLockElement) {
      void document.exitPointerLock()
    }
  }, [isTransitioning, knowledgeHudOpen])

  useEffect(() => {
    if (transition.phase === 'navigate' && transition.pendingPath) {
      navigate(transition.pendingPath)
      setTransitionPhase('zoom-out')
    }
  }, [navigate, setTransitionPhase, transition.pendingPath, transition.phase])

  const handleNavigate = (path: SpacePath) => {
    if (path === location.pathname || isTransitioning) {
      return
    }

    const state = useEngineStore.getState()
    const focused = state.focusedId ? state.interactables.get(state.focusedId) : null

    const focusPoint: [number, number, number] | null = (() => {
      if (!focused?.object) {
        return null
      }

      const point = new Vector3()
      focused.object.getWorldPosition(point)
      return [point.x, point.y, point.z]
    })()

    startTransition(path, focusPoint)
  }

  return (
    <Canvas camera={{ fov: baseSpaceFov, near: 0.1, far: 220, position: [0, 1.6, 6] }} shadows>
      <Suspense fallback={null}>
        <SpaceManager navigate={handleNavigate} />
        <InteractionSystem />
        <CameraTransitionRig />
        <PointerLockControls enabled={!isTransitioning && !knowledgeHudOpen} makeDefault />
      </Suspense>
    </Canvas>
  )
}
