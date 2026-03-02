import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Interactable } from '../../engine/interaction/Interactable'
import type { SpaceSceneProps } from '../../engine/spaces/types'
import { LibraryKnowledgeLayer } from './knowledge/LibraryKnowledgeLayer'
import { LibraryModule } from './modules/LibraryModule'

const bridgeZPositions = [8, -4, -16, -28]
const stairSteps = Array.from({ length: 12 }, (_, index) => index)

function BridgeFallback() {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[16, 0.22, 1.4]} />
      <meshStandardMaterial color="#5f6d78" metalness={0.45} roughness={0.42} />
    </mesh>
  )
}

function MezzanineFallback({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh receiveShadow>
      <boxGeometry args={[width, 0.25, depth]} />
      <meshStandardMaterial color="#3f4b5c" metalness={0.22} roughness={0.52} />
    </mesh>
  )
}

function StairStepFallback() {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[6.4, 0.24, 0.84]} />
      <meshStandardMaterial color="#5c6778" metalness={0.18} roughness={0.62} />
    </mesh>
  )
}

function RailingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.08, 1.7, 46]} />
      <meshStandardMaterial color="#748494" metalness={0.5} roughness={0.35} />
    </mesh>
  )
}

function WindowWallFallback() {
  return (
    <mesh>
      <planeGeometry args={[12, 9]} />
      <meshStandardMaterial color="#dbe9ff" emissive="#8fb7ff" emissiveIntensity={1.1} />
    </mesh>
  )
}

function FloorFallback() {
  return (
    <mesh receiveShadow rotation-x={-Math.PI / 2}>
      <planeGeometry args={[36, 82]} />
      <meshStandardMaterial color="#18243a" metalness={0.1} roughness={0.4} />
    </mesh>
  )
}

function BackWallFallback() {
  return (
    <mesh>
      <boxGeometry args={[35.2, 11, 0.5]} />
      <meshStandardMaterial color="#2d394b" metalness={0.18} roughness={0.5} />
    </mesh>
  )
}

function EntryWallFallback() {
  return (
    <mesh>
      <boxGeometry args={[12, 1.8, 0.1]} />
      <meshStandardMaterial color="#708295" metalness={0.35} roughness={0.35} />
    </mesh>
  )
}

export function LibraryScene({ navigate }: SpaceSceneProps) {
  return (
    <>
      <LibraryModule fallback={<FloorFallback />} moduleKey="floor" placementKey="floor.main" />

      <LibraryModule
        fallback={<MezzanineFallback depth={46} width={7.2} />}
        moduleKey="mezzanine"
        placementKey="mezzanine.left"
        position={[-11.6, 2.12, -6]}
      />

      <LibraryModule
        fallback={<MezzanineFallback depth={46} width={7.2} />}
        moduleKey="mezzanine"
        placementKey="mezzanine.right"
        position={[11.6, 2.12, -6]}
      />

      <LibraryModule
        fallback={<MezzanineFallback depth={8} width={12} />}
        moduleKey="mezzanine"
        placementKey="mezzanine.entry"
        position={[0, 2.12, 13]}
      />

      {stairSteps.map((step) => (
        <LibraryModule
          fallback={<StairStepFallback />}
          key={`step-${step}`}
          moduleKey="stairStep"
          placementKey={`stair.${step}`}
          position={[0, 2.1 - step * 0.2, 10.8 - step * 0.78]}
        />
      ))}

      {bridgeZPositions.map((z) => (
        <LibraryModule
          fallback={<BridgeFallback />}
          key={`bridge-${z}`}
          moduleKey="bridge"
          placementKey={`bridge.${z}`}
          position={[0, 6.3, z]}
        />
      ))}

      {[-15.2, -8.1, 8.1, 15.2].map((x, index) => (
        <LibraryModule
          fallback={<RailingFallback />}
          key={`rail-left-right-${x}`}
          moduleKey="railing"
          placementKey={`railing.${index}`}
          position={[x, 3, -6]}
        />
      ))}

      <LibraryModule
        fallback={<EntryWallFallback />}
        moduleKey="entryWall"
        placementKey="wall.entry"
        position={[0, 3.05, 17]}
      />

      <LibraryModule
        fallback={<BackWallFallback />}
        moduleKey="backWall"
        placementKey="wall.back"
        position={[0, 5.5, -41]}
      />

      <LibraryModule
        fallback={<WindowWallFallback />}
        moduleKey="windowWall"
        placementKey="window.backlight"
        position={[0, 6.5, -40.6]}
      />

      <LibraryKnowledgeLayer />

      <spotLight angle={0.58} color="#9dc2ff" intensity={11} penumbra={0.8} position={[0, 10, -38]} />
      <pointLight color="#78b5ff" intensity={7} position={[0, 6.5, -8]} />

      <RigidBody colliders={false} type="fixed">
        <CuboidCollider args={[18, 0.35, 41]} position={[0, -0.35, -10]} />
        <CuboidCollider args={[3.6, 0.2, 23]} position={[-11.6, 2.12, -6]} />
        <CuboidCollider args={[3.6, 0.2, 23]} position={[11.6, 2.12, -6]} />
        <CuboidCollider args={[6, 0.2, 4]} position={[0, 2.12, 13]} />

        <CuboidCollider args={[17.6, 5.5, 0.25]} position={[0, 5.5, -41]} />
        <CuboidCollider args={[0.25, 5.5, 41]} position={[-17.6, 5.5, -10]} />
        <CuboidCollider args={[0.25, 5.5, 41]} position={[17.6, 5.5, -10]} />

        {bridgeZPositions.map((z) => (
          <CuboidCollider args={[8, 0.18, 0.7]} key={`bridge-col-${z}`} position={[0, 6.3, z]} />
        ))}

        {stairSteps.map((step) => (
          <CuboidCollider
            args={[3.2, 0.12, 0.42]}
            key={`stair-col-${step}`}
            position={[0, 2.1 - step * 0.2, 10.8 - step * 0.78]}
          />
        ))}
      </RigidBody>

      <Interactable id="library.exit" label="Exit" onInteract={() => navigate('/')} position={[0, 2.85, 15.1]}>
        <mesh castShadow>
          <torusGeometry args={[0.72, 0.16, 16, 64]} />
          <meshStandardMaterial color="#c9e4ff" emissive="#5d93ca" emissiveIntensity={0.95} />
        </mesh>
      </Interactable>
    </>
  )
}
