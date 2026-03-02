import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Object3D, Raycaster, Vector2 } from 'three'
import { useEngineStore } from '../../store/useEngineStore'

const MAX_INTERACTION_DISTANCE = 5.5

function resolveInteractableId(object: Object3D | null): string | null {
  let current: Object3D | null = object

  while (current) {
    const candidate = (current.userData as { interactableId?: string }).interactableId
    if (typeof candidate === 'string') {
      return candidate
    }
    current = current.parent
  }

  return null
}

export function InteractionSystem() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const pointer = useThree((state) => state.pointer)
  const interactables = useEngineStore((state) => state.interactables)
  const focusedId = useEngineStore((state) => state.focusedId)
  const transitionPhase = useEngineStore((state) => state.transition.phase)
  const knowledgeHudOpen = useEngineStore((state) => state.knowledgeHudOpen)
  const setFocusedId = useEngineStore((state) => state.setFocusedId)
  const interact = useEngineStore((state) => state.interact)

  const raycaster = useMemo(() => new Raycaster(), [])
  const screenCenter = useMemo(() => new Vector2(0, 0), [])

  useFrame(() => {
    if (transitionPhase !== 'idle' || knowledgeHudOpen) {
      if (focusedId !== null) {
        setFocusedId(null)
      }
      return
    }

    raycaster.far = MAX_INTERACTION_DISTANCE
    const lockTarget = document.pointerLockElement
    const rayOrigin = lockTarget ? screenCenter : pointer
    raycaster.setFromCamera(rayOrigin, camera)

    const hits = raycaster.intersectObjects(scene.children, true)
    let nextFocusedId: string | null = null

    for (const hit of hits) {
      if (hit.distance > MAX_INTERACTION_DISTANCE) {
        continue
      }

      const candidate = resolveInteractableId(hit.object)
      if (candidate && interactables.has(candidate)) {
        nextFocusedId = candidate
        break
      }
    }

    if (nextFocusedId !== focusedId) {
      setFocusedId(nextFocusedId)
    }
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) {
        return
      }

      if (transitionPhase !== 'idle' || knowledgeHudOpen) {
        return
      }

      interact()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [interact, knowledgeHudOpen, transitionPhase])

  useEffect(() => {
    return () => {
      setFocusedId(null)
    }
  }, [setFocusedId])

  return null
}
