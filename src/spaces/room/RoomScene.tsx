import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Interactable } from '../../engine/interaction/Interactable'
import type { SpaceSceneProps } from '../../engine/spaces/types'

const ROOM_WIDTH = 7.2
const ROOM_DEPTH = 6.2
const ROOM_HEIGHT = 3.0

const SHELF_LEVELS = [2.25, 1.85, 1.45, 1.05, 0.65]
const BOOK_OFFSETS = [-0.48, -0.33, -0.2, -0.08, 0.08, 0.2, 0.33, 0.48]

export function RoomScene({ navigate, openChat }: SpaceSceneProps) {
  const wallThickness = 0.24
  const halfW = ROOM_WIDTH * 0.5
  const halfD = ROOM_DEPTH * 0.5
  const halfH = ROOM_HEIGHT * 0.5

  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#8a6243" roughness={0.78} />
      </mesh>

      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.01, 0.55]}>
        <planeGeometry args={[3.4, 2.1]} />
        <meshStandardMaterial color="#d6c09a" roughness={0.96} />
      </mesh>

      <mesh receiveShadow position={[0, ROOM_HEIGHT, 0]}>
        <boxGeometry args={[ROOM_WIDTH, 0.16, ROOM_DEPTH]} />
        <meshStandardMaterial color="#efe2cc" roughness={0.88} />
      </mesh>

      <mesh receiveShadow position={[0, halfH, -halfD]}>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, wallThickness]} />
        <meshStandardMaterial color="#ead8c0" roughness={0.9} />
      </mesh>

      <mesh receiveShadow position={[-halfW, halfH, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[ROOM_DEPTH, ROOM_HEIGHT, wallThickness]} />
        <meshStandardMaterial color="#e4d0b6" roughness={0.89} />
      </mesh>

      <mesh receiveShadow position={[halfW, halfH, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[ROOM_DEPTH, ROOM_HEIGHT, wallThickness]} />
        <meshStandardMaterial color="#e4d0b6" roughness={0.89} />
      </mesh>

      <group position={[1.72, 0, 0.12]}>
        <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
          <boxGeometry args={[1.38, 1.1, 1.1]} />
          <meshStandardMaterial color="#9a6a3f" roughness={0.74} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.1, 1.04, 0.02]}>
          <boxGeometry args={[1.0, 0.28, 0.68]} />
          <meshStandardMaterial color="#8a5730" roughness={0.81} />
        </mesh>
      </group>

      <group position={[0, 0, -2.52]}>
        <mesh castShadow receiveShadow position={[0, 0.76, 0]}>
          <boxGeometry args={[2.25, 0.08, 0.92]} />
          <meshStandardMaterial color="#bc8958" roughness={0.55} />
        </mesh>
        <mesh castShadow receiveShadow position={[-1.02, 0.38, -0.36]}>
          <boxGeometry args={[0.1, 0.72, 0.1]} />
          <meshStandardMaterial color="#f2f2f1" roughness={0.38} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.02, 0.38, -0.36]}>
          <boxGeometry args={[0.1, 0.72, 0.1]} />
          <meshStandardMaterial color="#f2f2f1" roughness={0.38} />
        </mesh>
        <mesh castShadow receiveShadow position={[-1.02, 0.38, 0.36]}>
          <boxGeometry args={[0.1, 0.72, 0.1]} />
          <meshStandardMaterial color="#f2f2f1" roughness={0.38} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.02, 0.38, 0.36]}>
          <boxGeometry args={[0.1, 0.72, 0.1]} />
          <meshStandardMaterial color="#f2f2f1" roughness={0.38} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.46, 0.37]}>
          <boxGeometry args={[2.08, 0.06, 0.06]} />
          <meshStandardMaterial color="#efefef" roughness={0.42} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.94, -0.2]}>
          <boxGeometry args={[1.2, 0.14, 0.24]} />
          <meshStandardMaterial color="#b37f4d" roughness={0.58} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.11, -0.22]}>
          <boxGeometry args={[0.78, 0.38, 0.03]} />
          <meshStandardMaterial color="#d7dee6" roughness={0.35} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.44, 0.97, -0.22]}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 20]} />
          <meshStandardMaterial color="#cfd3d8" roughness={0.34} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.44, 0.97, -0.22]}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 20]} />
          <meshStandardMaterial color="#cfd3d8" roughness={0.34} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.72, 0.92, -0.1]}>
          <coneGeometry args={[0.12, 0.2, 18]} />
          <meshStandardMaterial color="#f0e7d5" emissive="#f2d6aa" emissiveIntensity={0.25} />
        </mesh>
      </group>

      <group position={[0.86, 0, -1.38]}>
        <mesh castShadow receiveShadow position={[0, 0.54, 0]}>
          <boxGeometry args={[0.62, 0.12, 0.62]} />
          <meshStandardMaterial color="#34383f" roughness={0.8} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.95, -0.25]}>
          <boxGeometry args={[0.62, 0.7, 0.12]} />
          <meshStandardMaterial color="#2f333a" roughness={0.78} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.44, 14]} />
          <meshStandardMaterial color="#2b3037" roughness={0.62} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 20]} />
          <meshStandardMaterial color="#242831" roughness={0.58} />
        </mesh>
      </group>

      <group position={[-2.05, 0, -2.18]}>
        <mesh castShadow receiveShadow position={[0, 0.29, 0.08]}>
          <boxGeometry args={[1.52, 0.58, 2.08]} />
          <meshStandardMaterial color="#8f6441" roughness={0.6} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.62, 0.12]}>
          <boxGeometry args={[1.42, 0.2, 1.92]} />
          <meshStandardMaterial color="#e5dac4" roughness={0.9} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.93, -0.86]}>
          <boxGeometry args={[1.56, 1.05, 0.16]} />
          <meshStandardMaterial color="#7f5738" roughness={0.66} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.39, 0.79, -0.48]}>
          <boxGeometry args={[0.54, 0.14, 0.4]} />
          <meshStandardMaterial color="#d9ceb8" roughness={0.92} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.39, 0.79, -0.48]}>
          <boxGeometry args={[0.54, 0.14, 0.4]} />
          <meshStandardMaterial color="#d9ceb8" roughness={0.92} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.73, 0.1]}>
          <boxGeometry args={[1.34, 0.1, 1.22]} />
          <meshStandardMaterial color="#f1e7d4" roughness={0.94} />
        </mesh>
      </group>

      <group position={[2.36, 0, -2.22]}>
        <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
          <boxGeometry args={[1.55, 2.7, 0.5]} />
          <meshStandardMaterial color="#7b5435" roughness={0.66} />
        </mesh>
        {SHELF_LEVELS.map((level) => (
          <mesh castShadow key={`shelf-level-${level}`} position={[0, level, 0.02]}>
            <boxGeometry args={[1.36, 0.07, 0.4]} />
            <meshStandardMaterial color="#9b6f47" roughness={0.62} />
          </mesh>
        ))}
        {SHELF_LEVELS.map((level, levelIndex) =>
          BOOK_OFFSETS.map((offset, bookIndex) => (
            <mesh
              castShadow
              key={`book-${levelIndex}-${bookIndex}`}
              position={[
                offset,
                level + 0.12,
                -0.03 + ((bookIndex % 3) - 1) * 0.012,
              ]}
            >
              <boxGeometry args={[0.09, 0.2 + (bookIndex % 3) * 0.04, 0.13]} />
              <meshStandardMaterial
                color={['#8f4b3b', '#526b88', '#9f7a42', '#698457', '#b06755'][bookIndex % 5]}
                roughness={0.82}
              />
            </mesh>
          )),
        )}
      </group>

      <group position={[1.32, 0, -0.45]}>
        <mesh castShadow receiveShadow position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.042, 0.052, 2.2, 18]} />
          <meshStandardMaterial color="#7d5334" roughness={0.64} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.22, 2.32, 0.08]} rotation-z={-0.5}>
          <cylinderGeometry args={[0.026, 0.026, 0.45, 14]} />
          <meshStandardMaterial color="#7d5334" roughness={0.64} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.4, 2.28, 0.17]}>
          <coneGeometry args={[0.28, 0.23, 24, 1, true]} />
          <meshStandardMaterial color="#f2e8d8" emissive="#f1d4ac" emissiveIntensity={0.24} side={2} />
        </mesh>
      </group>

      <RigidBody colliders={false} type="fixed">
        <CuboidCollider args={[halfW, 0.25, halfD]} position={[0, -0.25, 0]} />
        <CuboidCollider args={[halfW, 0.1, halfD]} position={[0, ROOM_HEIGHT + 0.1, 0]} />
        <CuboidCollider args={[halfW, halfH, wallThickness * 0.5]} position={[0, halfH, -halfD]} />
        <CuboidCollider args={[halfW, halfH, wallThickness * 0.5]} position={[0, halfH, halfD]} />
        <CuboidCollider args={[wallThickness * 0.5, halfH, halfD]} position={[-halfW, halfH, 0]} />
        <CuboidCollider args={[wallThickness * 0.5, halfH, halfD]} position={[halfW, halfH, 0]} />

        <CuboidCollider args={[0.72, 0.62, 0.6]} position={[1.72, 0.62, 0.12]} />
        <CuboidCollider args={[1.2, 0.45, 0.52]} position={[0, 0.45, -2.52]} />
        <CuboidCollider args={[0.36, 0.55, 0.34]} position={[0.86, 0.55, -1.38]} />
        <CuboidCollider args={[0.8, 0.55, 1.05]} position={[-2.05, 0.55, -2.18]} />
        <CuboidCollider args={[0.78, 1.35, 0.28]} position={[2.36, 1.35, -2.22]} />
      </RigidBody>

      <mesh receiveShadow position={[0, halfH, halfD]}>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, wallThickness]} />
        <meshStandardMaterial color="#e7d5bb" roughness={0.9} />
      </mesh>

      <Interactable
        id="room.gallery"
        label="Gallery Frame"
        onInteract={() => navigate('/gallery')}
        position={[-3.48, 1.58, -0.9]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <group>
          <mesh castShadow receiveShadow position={[0, 0, -0.035]}>
            <boxGeometry args={[1.78, 1.18, 0.09]} />
            <meshStandardMaterial color="#7d5336" roughness={0.57} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0, 0.02]}>
            <boxGeometry args={[1.52, 0.92, 0.03]} />
            <meshStandardMaterial color="#d7b17a" roughness={0.88} />
          </mesh>
          <mesh position={[-0.2, 0.07, 0.038]}>
            <boxGeometry args={[0.18, 0.58, 0.012]} />
            <meshStandardMaterial color="#4f6d8d" roughness={0.8} />
          </mesh>
          <mesh position={[0.2, -0.12, 0.038]}>
            <boxGeometry args={[0.56, 0.2, 0.012]} />
            <meshStandardMaterial color="#cc7658" roughness={0.78} />
          </mesh>
          <mesh position={[0.01, 0.28, 0.038]}>
            <boxGeometry args={[0.32, 0.14, 0.012]} />
            <meshStandardMaterial color="#efd6a0" roughness={0.84} />
          </mesh>
        </group>
      </Interactable>

      <Interactable
        id="room.ceiling"
        label="Ceiling Circle"
        onInteract={() => navigate('/cosmos')}
        position={[0.15, ROOM_HEIGHT - 0.08, -0.2]}
      >
        <mesh castShadow>
          <torusGeometry args={[0.62, 0.12, 16, 56]} />
          <meshStandardMaterial color="#9cd8ff" emissive="#2d597f" emissiveIntensity={0.72} roughness={0.45} />
        </mesh>
      </Interactable>

      <Interactable
        id="room.bookshelf"
        label="Bookshelf"
        onInteract={() => navigate('/library')}
        position={[2.36, 1.45, -2.1]}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 2.7, 0.34]} />
          <meshStandardMaterial color="#866243" roughness={0.64} />
        </mesh>
      </Interactable>

      <Interactable
        id="room.papers"
        label="Open Papers"
        onInteract={() => window.alert('Papers interaction placeholder.')}
        position={[0.05, 0.79, -2.49]}
      >
        <group rotation={[-0.05, 0.16, -0.02]}>
          <mesh castShadow receiveShadow position={[-0.14, 0, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.34]} />
            <meshStandardMaterial color="#f2e4c6" roughness={0.97} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.17, 0.01, -0.02]} rotation={[0, -0.16, 0.05]}>
            <boxGeometry args={[0.48, 0.02, 0.32]} />
            <meshStandardMaterial color="#ead8b5" roughness={0.96} />
          </mesh>
        </group>
      </Interactable>

      <Interactable id="room.robot" label="Desk Robot" onInteract={openChat} position={[0.76, 0.9, -2.36]}>
        <group>
          <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
            <capsuleGeometry args={[0.16, 0.34, 6, 12]} />
            <meshStandardMaterial color="#ebecf4" emissive="#55596e" emissiveIntensity={0.12} roughness={0.52} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.2, 20, 20]} />
            <meshStandardMaterial color="#d5d9e8" roughness={0.42} />
          </mesh>
          <mesh position={[-0.07, 0.62, 0.17]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#a1dbff" emissive="#4ca5e8" emissiveIntensity={0.85} />
          </mesh>
          <mesh position={[0.07, 0.62, 0.17]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#a1dbff" emissive="#4ca5e8" emissiveIntensity={0.85} />
          </mesh>
        </group>
      </Interactable>

      <spotLight castShadow intensity={16} angle={0.42} penumbra={0.7} position={[1.6, 2.55, -0.32]} color="#ffd8aa" />
      <spotLight castShadow intensity={8} angle={0.34} penumbra={0.64} position={[-1.15, 2.7, -2.1]} color="#ffd6b0" />
      <spotLight castShadow intensity={8} angle={0.34} penumbra={0.64} position={[-2.8, 2.62, -0.92]} color="#ffd3a3" />
      <pointLight intensity={1.25} position={[-1.55, 1.05, 0.34]} color="#f5a792" />
      <pointLight intensity={0.92} position={[1.25, 0.95, -0.95]} color="#8bdb9a" />
      <pointLight intensity={0.62} position={[0.45, 0.36, 0.72]} color="#ffbe91" />
    </>
  )
}
