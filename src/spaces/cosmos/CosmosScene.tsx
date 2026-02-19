import { Stars } from '@react-three/drei'
import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier'
import { Interactable } from '../../engine/interaction/Interactable'
import type { SpaceSceneProps } from '../../engine/spaces/types'

export function CosmosScene({ navigate }: SpaceSceneProps) {
  return (
    <>
      <Stars count={3600} depth={80} factor={3} radius={95} saturation={0} speed={1.25} />

      <RigidBody colliders={false} type="fixed">
        <BallCollider args={[2.2]} position={[0, -1.4, 0]} />
        <CuboidCollider args={[0.75, 0.75, 0.75]} position={[1.4, 2.2, -2.4]} />

        <mesh position={[0, -1.4, 0]} receiveShadow>
          <sphereGeometry args={[2.2, 40, 40]} />
          <meshStandardMaterial color="#15365e" metalness={0.2} roughness={0.78} />
        </mesh>
      </RigidBody>

      <mesh castShadow position={[1.4, 2.2, -2.4]}>
        <icosahedronGeometry args={[0.95, 0]} />
        <meshStandardMaterial color="#8dafff" emissive="#283b8f" emissiveIntensity={0.95} />
      </mesh>

      <Interactable id="cosmos.exit" label="Exit Portal" onInteract={() => navigate('/')} position={[0, 1.6, 3.6]}>
        <mesh castShadow>
          <torusKnotGeometry args={[0.68, 0.22, 120, 18]} />
          <meshStandardMaterial color="#f5e7ff" emissive="#7f3ed8" emissiveIntensity={1.15} />
        </mesh>
      </Interactable>
    </>
  )
}
