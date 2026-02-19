import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { PropsWithChildren } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Group, type Material, type Mesh, Vector3 } from 'three'
import { useEngineStore } from '../../store/useEngineStore'

type GroupProps = Omit<ThreeElements['group'], 'children' | 'id' | 'userData'>

interface InteractableProps extends PropsWithChildren<GroupProps> {
  id: string
  label: string
  onInteract: () => void
}

interface HighlightSnapshot {
  emissive: Color
  intensity: number
}

function hasHighlightableEmissive(
  material: Material,
): material is Material & {
  emissive: Color
  emissiveIntensity: number
  color?: Color
} {
  return 'emissive' in material && 'emissiveIntensity' in material
}

function toMaterialList(material: Material | Material[]): Material[] {
  return Array.isArray(material) ? material : [material]
}

export function Interactable({ id, label, onInteract, children, ...props }: InteractableProps) {
  const groupRef = useRef<Group>(null)
  const highlightStore = useRef(new WeakMap<Material, HighlightSnapshot>())

  const registerInteractable = useEngineStore((state) => state.registerInteractable)
  const unregisterInteractable = useEngineStore((state) => state.unregisterInteractable)
  const isFocused = useEngineStore((state) => state.focusedId === id)

  const userData = useMemo(() => ({ interactableId: id }), [id])
  const targetScale = useMemo(() => new Vector3(1, 1, 1), [])

  useEffect(() => {
    registerInteractable({ id, label, onInteract, object: groupRef.current })

    return () => {
      unregisterInteractable(id)
    }
  }, [id, label, onInteract, registerInteractable, unregisterInteractable])

  useEffect(() => {
    const group = groupRef.current
    if (!group) {
      return
    }

    group.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh || !mesh.material) {
        return
      }

      const materials = toMaterialList(mesh.material)
      for (const material of materials) {
        if (!hasHighlightableEmissive(material)) {
          continue
        }

        const snapshot = highlightStore.current.get(material) ?? {
          emissive: material.emissive.clone(),
          intensity: material.emissiveIntensity,
        }

        if (!highlightStore.current.has(material)) {
          highlightStore.current.set(material, snapshot)
        }

        if (isFocused) {
          if (
            snapshot.emissive.r === 0 &&
            snapshot.emissive.g === 0 &&
            snapshot.emissive.b === 0 &&
            material.color
          ) {
            material.emissive.copy(material.color).multiplyScalar(0.28)
          } else {
            material.emissive.copy(snapshot.emissive)
          }
          material.emissiveIntensity = snapshot.intensity + 0.55
        } else {
          material.emissive.copy(snapshot.emissive)
          material.emissiveIntensity = snapshot.intensity
        }
      }
    })
  }, [isFocused])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) {
      return
    }

    const baseScale = isFocused ? 1.05 : 1
    targetScale.setScalar(baseScale)
    group.scale.lerp(targetScale, 1 - Math.exp(-12 * delta))
  })

  return (
    <group ref={groupRef} {...props} userData={userData}>
      {children}
    </group>
  )
}
