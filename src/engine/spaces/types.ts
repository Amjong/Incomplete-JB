import type { ComponentType } from 'react'
import type { WorldProfile } from '../world/WorldProfile'

export type SpaceId = 'room' | 'library' | 'cosmos'

export type SpacePath = '/' | '/library' | '/cosmos'

export interface SpaceSceneProps {
  navigate: (path: SpacePath) => void
  openChat: () => void
}

export interface SpaceDefinition {
  id: SpaceId
  title: string
  profile: WorldProfile
  spawn: { position: [number, number, number] }
  controls?: { speed?: number }
  Scene: ComponentType<SpaceSceneProps>
}
