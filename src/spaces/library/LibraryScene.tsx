import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Interactable } from '../../engine/interaction/Interactable'
import type { SpaceSceneProps } from '../../engine/spaces/types'

const shelfDepths = Array.from({ length: 7 }, (_, index) => -index * 4)

export function LibraryScene({ navigate }: SpaceSceneProps) {
  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[10, 38]} />
        <meshStandardMaterial color="#101a2f" />
      </mesh>

      <mesh position={[0, 2.8, -14]}>
        <boxGeometry args={[10, 5.6, 0.35]} />
        <meshStandardMaterial color="#18253f" />
      </mesh>

      {shelfDepths.map((z) => (
        <group key={`shelf-row-${z}`}>
          <mesh castShadow position={[-3.2, 1.7, z]}>
            <boxGeometry args={[1.3, 3.4, 0.9]} />
            <meshStandardMaterial color="#2e4f7c" />
          </mesh>
          <mesh castShadow position={[3.2, 1.7, z]}>
            <boxGeometry args={[1.3, 3.4, 0.9]} />
            <meshStandardMaterial color="#2e4f7c" />
          </mesh>
        </group>
      ))}

      <RigidBody colliders={false} type="fixed">
        <CuboidCollider args={[5, 0.35, 19.5]} position={[0, -0.35, 0]} />
        <CuboidCollider args={[4.8, 2.8, 0.2]} position={[0, 2.8, -14.2]} />
        <CuboidCollider args={[0.2, 2.8, 19.2]} position={[-4.8, 2.8, 0]} />
        <CuboidCollider args={[0.2, 2.8, 19.2]} position={[4.8, 2.8, 0]} />

        {shelfDepths.map((z) => (
          <CuboidCollider key={`left-shelf-col-${z}`} args={[0.65, 1.7, 0.45]} position={[-3.2, 1.7, z]} />
        ))}
        {shelfDepths.map((z) => (
          <CuboidCollider key={`right-shelf-col-${z}`} args={[0.65, 1.7, 0.45]} position={[3.2, 1.7, z]} />
        ))}
      </RigidBody>

      <Interactable id="library.exit" label="Exit" onInteract={() => navigate('/')} position={[0, 1.5, 3.8]}>
        <mesh castShadow>
          <torusGeometry args={[0.85, 0.2, 16, 64]} />
          <meshStandardMaterial color="#b9dcff" emissive="#305a8f" emissiveIntensity={0.8} />
        </mesh>
      </Interactable>
    </>
  )
}
