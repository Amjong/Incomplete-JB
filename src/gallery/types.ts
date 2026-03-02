export type GalleryMediaKind = 'image' | 'youtube'
export type GalleryImageSourceType = 'url' | 'upload'

export interface GalleryImageAsset {
  kind: 'image'
  sourceType: GalleryImageSourceType
  src: string
  naturalWidth: number
  naturalHeight: number
}

export interface GalleryYouTubeAsset {
  kind: 'youtube'
  url: string
  youtubeId: string
  thumbUrl: string
  width: number
  height: number
}

export interface GalleryItem {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  media: GalleryImageAsset | GalleryYouTubeAsset
}

export interface GalleryCollection {
  version: 1
  items: GalleryItem[]
}

export interface GalleryPlacement {
  id: string
  itemId: string
  width: number
  height: number
  position: [number, number, number]
  rotation: [number, number, number]
}

export interface GalleryLayoutResult {
  placements: GalleryPlacement[]
  overflowItemIds: string[]
}

export interface GalleryImageUrlInput {
  url: string
  title: string
  description?: string
}

export interface GalleryYouTubeInput {
  url: string
  title: string
  description?: string
}
