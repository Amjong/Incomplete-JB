import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo } from 'react'
import { Interactable } from '../../../engine/interaction/Interactable'
import { LibraryModule } from '../modules/LibraryModule'
import { useKnowledgeStore } from '../../../store/useKnowledgeStore'

function TowerFallback() {
  return (
    <group>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 8, 1.5]} />
        <meshStandardMaterial color="#445567" metalness={0.35} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[0, 3.7, 0]}>
        <boxGeometry args={[2.3, 0.08, 1.6]} />
        <meshStandardMaterial color="#6f8296" metalness={0.45} roughness={0.38} />
      </mesh>
    </group>
  )
}

function CategoryMarkerMesh({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 1.0, 0.4]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 0.9, 12]} />
        <meshStandardMaterial color="#90a8c0" metalness={0.45} roughness={0.33} />
      </mesh>
    </group>
  )
}

function DocMarkerMesh() {
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color="#f5e29d" emissive="#f5cc5a" emissiveIntensity={0.6} />
    </mesh>
  )
}

function LibrarianDeskMesh() {
  return (
    <group>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[2.2, 0.9, 1.1]} />
        <meshStandardMaterial color="#4c5f73" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 1.05, -0.15]}>
        <boxGeometry args={[1.2, 0.16, 0.6]} />
        <meshStandardMaterial color="#8ab1d8" emissive="#6ba0d2" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

const categoryMarkerColors = ['#7da1c8', '#8cb8de', '#97c6d4', '#a7c8b8', '#b5a9d8']

export function LibraryKnowledgeLayer() {
  const index = useKnowledgeStore((state) => state.index)
  const loadState = useKnowledgeStore((state) => state.loadState)
  const ensureLoaded = useKnowledgeStore((state) => state.ensureLoaded)
  const openLibrarian = useKnowledgeStore((state) => state.openLibrarian)
  const openCategory = useKnowledgeStore((state) => state.openCategory)
  const openDoc = useKnowledgeStore((state) => state.openDoc)

  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])

  const docsById = useMemo(() => {
    if (!index) {
      return new Map<string, string>()
    }

    return new Map(index.docs.map((doc) => [doc.id, doc.title]))
  }, [index])

  if (!index || loadState === 'loading' || loadState === 'idle') {
    return (
      <>
        {[-12, -8, 8, 12].flatMap((x) =>
          [8, 2, -4, -10].map((z) => (
            <LibraryModule fallback={<TowerFallback />} key={`fallback-${x}-${z}`} moduleKey="tower" position={[x, 4, z]} />
          )),
        )}
      </>
    )
  }

  const laneSpacing = index.layout.settings.laneBaySpacingZ

  return (
    <>
      {index.layout.lanes.flatMap((lane) =>
        Array.from({ length: lane.visibleBayCount }, (_, bayIndex) => {
          const z = lane.zStart - bayIndex * laneSpacing
          return (
            <LibraryModule
              fallback={<TowerFallback />}
              key={`tower-${lane.id}-${bayIndex}`}
              moduleKey="tower"
              placementKey={`knowledge.tower.${lane.categoryId}.${bayIndex}`}
              position={[lane.x, 4, z]}
            />
          )
        }),
      )}

      {index.layout.lanes.map((lane, laneIndex) => {
        const color = categoryMarkerColors[laneIndex % categoryMarkerColors.length]
        const markerPosition: [number, number, number] = [
          lane.x + (lane.side === 'left' ? 1.7 : -1.7),
          2.2,
          lane.zStart + 1.5,
        ]

        return (
          <Interactable
            id={`library.category.${lane.categoryId}`}
            key={`category-${lane.categoryId}`}
            label={`Open ${lane.label}`}
            onInteract={() => openCategory(lane.categoryId)}
            position={markerPosition}
          >
            <CategoryMarkerMesh color={color} />
          </Interactable>
        )
      })}

      {index.layout.docAnchors.map((anchor) => (
        <Interactable
          id={`library.doc.${anchor.docId}`}
          key={anchor.id}
          label={docsById.get(anchor.docId) ?? 'Open note'}
          onInteract={() => openDoc(anchor.docId)}
          position={anchor.position}
        >
          <DocMarkerMesh />
        </Interactable>
      ))}

      <Interactable id="library.librarianDesk" label="Open Librarian" onInteract={openLibrarian} position={[0, 1.2, 12.6]}>
        <LibrarianDeskMesh />
      </Interactable>

      <RigidBody colliders={false} type="fixed">
        {index.layout.lanes.flatMap((lane) =>
          Array.from({ length: lane.visibleBayCount }, (_, bayIndex) => {
            const z = lane.zStart - bayIndex * laneSpacing
            return <CuboidCollider args={[1.1, 4, 0.76]} key={`tower-col-${lane.id}-${bayIndex}`} position={[lane.x, 4, z]} />
          }),
        )}

        <CuboidCollider args={[1.2, 0.5, 0.65]} position={[0, 0.45, 12.6]} />
      </RigidBody>
    </>
  )
}
