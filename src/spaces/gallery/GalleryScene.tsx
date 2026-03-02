import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect } from 'react'
import { DoubleSide } from 'three'
import { Interactable } from '../../engine/interaction/Interactable'
import type { SpaceSceneProps } from '../../engine/spaces/types'
import { useGalleryStore } from '../../store/useGalleryStore'
import { GalleryExhibitLayer } from './GalleryExhibitLayer'

const WALL_SEGMENTS = Array.from({ length: 9 }, (_, index) => {
  const start = -Math.PI * 0.62
  const end = Math.PI * 0.62
  const t = index / 8
  const angle = start + (end - start) * t
  const radius = 16
  return {
    key: `outer-segment-${index}`,
    x: Math.sin(angle) * radius,
    z: -12 + Math.cos(angle) * radius,
    rotation: angle,
  }
})

export function GalleryScene({ navigate }: SpaceSceneProps) {
  const loadSeed = useGalleryStore((state) => state.loadSeed)
  const openPanel = useGalleryStore((state) => state.openPanel)

  useEffect(() => {
    void loadSeed()
  }, [loadSeed])

  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <circleGeometry args={[18, 96]} />
        <meshStandardMaterial color="#7d828e" metalness={0.18} roughness={0.62} />
      </mesh>

      <mesh position={[0, 3.3, -2.5]}>
        <boxGeometry args={[15.5, 0.2, 4.2]} />
        <meshStandardMaterial color="#f2f4f7" roughness={0.86} />
      </mesh>

      <mesh position={[-4.2, 2.5, -6]}>
        <boxGeometry args={[10.8, 5, 0.28]} />
        <meshStandardMaterial color="#f7f9fb" roughness={0.88} />
      </mesh>

      <mesh position={[4.4, 2.5, -8.5]}>
        <boxGeometry args={[10.8, 5, 0.28]} />
        <meshStandardMaterial color="#f7f9fb" roughness={0.88} />
      </mesh>

      {WALL_SEGMENTS.map((segment) => (
        <mesh
          castShadow
          key={segment.key}
          position={[segment.x, 2.5, segment.z]}
          rotation={[0, segment.rotation, 0]}
        >
          <boxGeometry args={[6.2, 5, 0.34]} />
          <meshStandardMaterial color="#f8fbff" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0.8, 1.6, -5.4]}>
        <cylinderGeometry args={[1.55, 1.55, 3.2, 48, 1, true]} />
        <meshStandardMaterial color="#e5edf4" metalness={0.1} opacity={0.28} roughness={0.2} side={DoubleSide} transparent />
      </mesh>

      <GalleryExhibitLayer />

      <spotLight angle={0.3} castShadow intensity={13} penumbra={0.7} position={[-4, 7.6, -5.8]} />
      <spotLight angle={0.3} castShadow intensity={13} penumbra={0.7} position={[4.2, 7.6, -8.4]} />
      <spotLight angle={0.33} castShadow intensity={11} penumbra={0.68} position={[0.8, 8.2, -12]} />
      <pointLight color="#ffffff" intensity={3.2} position={[0, 5.4, -2]} />

      <RigidBody colliders={false} type="fixed">
        <CuboidCollider args={[18, 0.3, 18]} position={[0, -0.3, 0]} />
        <CuboidCollider args={[5.4, 2.5, 0.15]} position={[-4.2, 2.5, -6]} />
        <CuboidCollider args={[5.4, 2.5, 0.15]} position={[4.4, 2.5, -8.5]} />

        {WALL_SEGMENTS.map((segment) => (
          <CuboidCollider
            args={[3.1, 2.5, 0.2]}
            key={`col-${segment.key}`}
            position={[segment.x, 2.5, segment.z]}
            rotation={[0, segment.rotation, 0]}
          />
        ))}
      </RigidBody>

      <Interactable id="gallery.console" label="Open Curator Panel" onInteract={openPanel} position={[0, 1.1, 12.8]}>
        <mesh castShadow>
          <boxGeometry args={[2.4, 1, 1.2]} />
          <meshStandardMaterial color="#d7dde7" emissive="#647488" emissiveIntensity={0.18} roughness={0.5} />
        </mesh>
      </Interactable>

      <Interactable id="gallery.exit" label="Exit" onInteract={() => navigate('/')} position={[0, 1.2, 15.4]}>
        <mesh castShadow>
          <torusGeometry args={[0.7, 0.13, 16, 60]} />
          <meshStandardMaterial color="#ffffff" emissive="#89a0b9" emissiveIntensity={0.5} />
        </mesh>
      </Interactable>
    </>
  )
}
