import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Interactable } from '../../engine/interaction/Interactable'
import type { SpaceSceneProps } from '../../engine/spaces/types'

export function RoomScene({ navigate, openChat }: SpaceSceneProps) {
  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#4a382f" />
      </mesh>

      <mesh position={[0, 3.2, -4]}>
        <boxGeometry args={[18, 6.4, 0.35]} />
        <meshStandardMaterial color="#624838" />
      </mesh>

      <mesh position={[-9, 3.2, 1]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[10.4, 6.4, 0.35]} />
        <meshStandardMaterial color="#5f4435" />
      </mesh>

      <mesh position={[9, 3.2, 1]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[10.4, 6.4, 0.35]} />
        <meshStandardMaterial color="#5f4435" />
      </mesh>

      <RigidBody colliders={false} type="fixed">
        <CuboidCollider args={[10, 0.25, 10]} position={[0, -0.25, 0]} />
        <CuboidCollider args={[9, 3.2, 0.2]} position={[0, 3.2, -4.2]} />
        <CuboidCollider args={[0.2, 3.2, 5.2]} position={[-9, 3.2, 1]} />
        <CuboidCollider args={[0.2, 3.2, 5.2]} position={[9, 3.2, 1]} />
        <CuboidCollider args={[0.95, 1.45, 0.45]} position={[-2.8, 1.45, 1.2]} />
        <CuboidCollider args={[0.7, 0.4, 0.55]} position={[0.8, 0.45, 2.2]} />
        <CuboidCollider args={[0.45, 0.95, 0.45]} position={[2.8, 1.1, 1.6]} />
        <CuboidCollider args={[0.55, 1.15, 0.4]} position={[-0.8, 1.2, 1.8]} />
      </RigidBody>

      <Interactable id="room.bookshelf" label="Bookshelf" onInteract={() => navigate('/library')} position={[-2.8, 1.4, 1.2]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 2.8, 0.8]} />
          <meshStandardMaterial color="#8d5a3b" />
        </mesh>
      </Interactable>

      <Interactable
        id="room.papers"
        label="Papers"
        onInteract={() => window.alert('Papers interaction placeholder.')}
        position={[0.8, 0.9, 2.2]}
      >
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.08, 0.9]} />
          <meshStandardMaterial color="#f2e7cc" />
        </mesh>
      </Interactable>

      <Interactable id="room.robot" label="Robot" onInteract={openChat} position={[2.8, 1.1, 1.6]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 1.2, 4, 12]} />
          <meshStandardMaterial color="#7ec4ff" emissive="#12384f" emissiveIntensity={0.4} />
        </mesh>
      </Interactable>

      <Interactable id="room.gallery" label="Gallery Portal" onInteract={() => navigate('/gallery')} position={[-0.8, 1.2, 1.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.52, 0.52, 2.3, 24]} />
          <meshStandardMaterial color="#d8e3ef" emissive="#5d7896" emissiveIntensity={0.28} />
        </mesh>
      </Interactable>

      <Interactable id="room.ceiling" label="Ceiling Circle" onInteract={() => navigate('/cosmos')} position={[0, 3.1, 1.4]}>
        <mesh castShadow>
          <torusGeometry args={[0.72, 0.14, 16, 60]} />
          <meshStandardMaterial color="#9cd8ff" emissive="#2d597f" emissiveIntensity={0.75} />
        </mesh>
      </Interactable>
    </>
  )
}
