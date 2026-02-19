import { Physics } from '@react-three/rapier'
import { useMemo } from 'react'
import { useEngineStore } from '../store/useEngineStore'
import { PhysicsPlayer } from './player/PhysicsPlayer'
import { spaceRegistry } from './spaces/registry'
import type { SpacePath } from './spaces/types'
import { World } from './world/World'

interface SpaceManagerProps {
  navigate: (path: SpacePath) => void
}

export function SpaceManager({ navigate }: SpaceManagerProps) {
  const spaceId = useEngineStore((state) => state.spaceId)
  const transitionPhase = useEngineStore((state) => state.transition.phase)
  const setChatOpen = useEngineStore((state) => state.setChatOpen)

  const definition = spaceRegistry[spaceId]
  const openChat = useMemo(() => () => setChatOpen(true), [setChatOpen])

  return (
    <World profile={definition.profile}>
      <Physics key={spaceId} gravity={definition.profile.gravity}>
        <PhysicsPlayer
          cameraProfile={definition.profile.camera}
          enabled={transitionPhase === 'idle'}
          moveSpeed={definition.controls?.speed ?? 4.2}
          spawn={definition.spawn.position}
        />
        <definition.Scene navigate={navigate} openChat={openChat} />
      </Physics>
    </World>
  )
}
