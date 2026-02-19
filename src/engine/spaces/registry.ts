import { cosmosSpace } from '../../spaces/cosmos'
import { librarySpace } from '../../spaces/library'
import { roomSpace } from '../../spaces/room'
import type { SpaceDefinition, SpaceId } from './types'

export const spaceRegistry: Record<SpaceId, SpaceDefinition> = {
  room: roomSpace,
  library: librarySpace,
  cosmos: cosmosSpace,
}

export function pathToSpaceId(pathname: string): SpaceId {
  if (pathname === '/library') {
    return 'library'
  }

  if (pathname === '/cosmos') {
    return 'cosmos'
  }

  return 'room'
}
