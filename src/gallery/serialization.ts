import type { GalleryCollection, GalleryItem, GalleryYouTubeAsset } from './types'

function isIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isValidYouTube(media: unknown): media is GalleryYouTubeAsset {
  if (!media || typeof media !== 'object') {
    return false
  }

  const candidate = media as Partial<GalleryYouTubeAsset>
  return (
    candidate.kind === 'youtube' &&
    typeof candidate.url === 'string' &&
    typeof candidate.youtubeId === 'string' &&
    typeof candidate.thumbUrl === 'string' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number'
  )
}

function isValidItem(item: unknown): item is GalleryItem {
  if (!item || typeof item !== 'object') {
    return false
  }

  const candidate = item as Partial<GalleryItem>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    !isIso(candidate.createdAt) ||
    !isIso(candidate.updatedAt) ||
    !candidate.media
  ) {
    return false
  }

  const media = candidate.media
  if (media.kind === 'image') {
    return (
      (media.sourceType === 'url' || media.sourceType === 'upload') &&
      typeof media.src === 'string' &&
      typeof media.naturalWidth === 'number' &&
      typeof media.naturalHeight === 'number'
    )
  }

  return isValidYouTube(media)
}

export function parseCollectionJson(payload: string): GalleryCollection {
  const parsed = JSON.parse(payload) as Partial<GalleryCollection>

  if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
    throw new Error('Invalid collection schema.')
  }

  const items = parsed.items.filter((item): item is GalleryItem => isValidItem(item))
  if (items.length !== parsed.items.length) {
    throw new Error('Collection contains invalid items.')
  }

  return {
    version: 1,
    items,
  }
}

export function toCollectionJson(collection: GalleryCollection): string {
  return `${JSON.stringify(collection, null, 2)}\n`
}
