import { cosmosSpace } from '../../spaces/cosmos'
import { gallerySpace } from '../../spaces/gallery'
import { librarySpace } from '../../spaces/library'
import { roomSpace } from '../../spaces/room'
import type { SpaceDefinition, SpaceId } from './types'

export const spaceRegistry: Record<SpaceId, SpaceDefinition> = {
  room: roomSpace,
  library: librarySpace,
  cosmos: cosmosSpace,
  gallery: gallerySpace,
}

export function pathToSpaceId(pathname: string): SpaceId {
  if (pathname === '/library') {
    return 'library'
  }

  if (pathname === '/cosmos') {
    return 'cosmos'
  }

  if (pathname === '/gallery') {
    return 'gallery'
  }

  return 'room'
}
