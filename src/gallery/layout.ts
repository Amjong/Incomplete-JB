import type { GalleryItem, GalleryLayoutResult, GalleryPlacement } from './types'

interface WallSection {
  id: string
  center: [number, number, number]
  rotationY: number
  width: number
}

const YOUTUBE_SIZE = {
  width: 1.6,
  height: 0.9,
}

const TARGET_IMAGE_HEIGHT = 1.2
const MIN_IMAGE_WIDTH = 0.7
const MAX_IMAGE_WIDTH = 2.4
const MAX_IMAGE_HEIGHT = 1.8
// Keep exhibits in front of the thick wall colliders/meshes.
// Walls are ~0.28-0.34 thick, frame depth is ~0.08.
const WALL_OFFSET = 0.24
const LEFT_PADDING = 0.7
const ITEM_GAP = 0.42
const ROW_YS = [2.55, 1.15]

export const GALLERY_WALL_SECTIONS: WallSection[] = [
  { id: 'partition-a-front', center: [-4.2, 0, -6.0], rotationY: 0, width: 10.8 },
  { id: 'partition-a-back', center: [-4.2, 0, -6.0], rotationY: Math.PI, width: 10.8 },
  { id: 'partition-b-front', center: [4.4, 0, -8.5], rotationY: 0, width: 10.8 },
  { id: 'partition-b-back', center: [4.4, 0, -8.5], rotationY: Math.PI, width: 10.8 },
  { id: 'curve-mid', center: [0.0, 0, -14.5], rotationY: 0, width: 10.0 },
  { id: 'curve-left', center: [-8.4, 0, -12.0], rotationY: 0.48, width: 9.2 },
  { id: 'curve-right', center: [8.4, 0, -12.0], rotationY: -0.48, width: 9.2 },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function resolveMediaSize(item: GalleryItem): { width: number; height: number } {
  if (item.media.kind === 'youtube') {
    return YOUTUBE_SIZE
  }

  const ratio = item.media.naturalWidth / item.media.naturalHeight
  let width = TARGET_IMAGE_HEIGHT * ratio
  let height = TARGET_IMAGE_HEIGHT

  if (width > MAX_IMAGE_WIDTH) {
    width = MAX_IMAGE_WIDTH
    height = width / ratio
  }

  if (width < MIN_IMAGE_WIDTH) {
    width = MIN_IMAGE_WIDTH
    height = width / ratio
  }

  if (height > MAX_IMAGE_HEIGHT) {
    height = MAX_IMAGE_HEIGHT
    width = height * ratio
  }

  return {
    width: clamp(width, MIN_IMAGE_WIDTH, MAX_IMAGE_WIDTH),
    height: clamp(height, 0.5, MAX_IMAGE_HEIGHT),
  }
}

function toWorldPosition(
  section: WallSection,
  localX: number,
  y: number,
): [number, number, number] {
  const cos = Math.cos(section.rotationY)
  const sin = Math.sin(section.rotationY)

  const rightX = cos
  const rightZ = -sin

  const normalX = sin
  const normalZ = cos

  return [
    section.center[0] + rightX * localX + normalX * WALL_OFFSET,
    y,
    section.center[2] + rightZ * localX + normalZ * WALL_OFFSET,
  ]
}

export function buildGalleryLayout(items: GalleryItem[]): GalleryLayoutResult {
  const placements: GalleryPlacement[] = []
  const overflowItemIds: string[] = []

  let sectionIndex = 0
  let rowIndex = 0
  let cursorX = -GALLERY_WALL_SECTIONS[0].width / 2 + LEFT_PADDING

  for (const item of items) {
    const size = resolveMediaSize(item)
    let placed = false

    while (!placed) {
      const section = GALLERY_WALL_SECTIONS[sectionIndex]
      if (!section) {
        overflowItemIds.push(item.id)
        break
      }

      const maxX = section.width / 2 - LEFT_PADDING
      const left = cursorX
      const right = cursorX + size.width

      if (right > maxX) {
        rowIndex += 1
        cursorX = -section.width / 2 + LEFT_PADDING

        if (rowIndex >= ROW_YS.length) {
          sectionIndex += 1
          rowIndex = 0
          const nextSection = GALLERY_WALL_SECTIONS[sectionIndex]
          if (!nextSection) {
            overflowItemIds.push(item.id)
            break
          }
          cursorX = -nextSection.width / 2 + LEFT_PADDING
        }
        continue
      }

      const centerX = (left + right) * 0.5
      placements.push({
        id: `placement.${item.id}`,
        itemId: item.id,
        width: size.width,
        height: size.height,
        position: toWorldPosition(section, centerX, ROW_YS[rowIndex]),
        rotation: [0, section.rotationY, 0],
      })

      cursorX = right + ITEM_GAP
      placed = true
    }
  }

  return {
    placements,
    overflowItemIds,
  }
}
