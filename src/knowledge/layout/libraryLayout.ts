import type {
  KnowledgeCategory,
  LibraryDocAnchor,
  LibraryInteractableBlueprint,
  LibraryLaneBlueprint,
  LibraryLayoutBlueprint,
  LibraryLayoutSettings,
} from '../types'

export interface LibraryLayoutOptions {
  settings?: Partial<LibraryLayoutSettings>
}

export const DEFAULT_LIBRARY_LAYOUT_SETTINGS: LibraryLayoutSettings = {
  baseLength: 2,
  bayLength: 1,
  docsPerBay: 12,
  maxVisibleBaysPerLane: 9,
  laneGapX: 4.2,
  laneBaseX: 9.5,
  laneStartZ: 8,
  laneBaySpacingZ: 6,
}

function resolveSettings(options?: LibraryLayoutOptions): LibraryLayoutSettings {
  return {
    ...DEFAULT_LIBRARY_LAYOUT_SETTINGS,
    ...(options?.settings ?? {}),
  }
}

function toLane(
  category: KnowledgeCategory,
  laneIndex: number,
  docIds: string[],
  settings: LibraryLayoutSettings,
): LibraryLaneBlueprint {
  const side = laneIndex % 2 === 0 ? 'left' : 'right'
  const sideIndex = Math.floor(laneIndex / 2)

  const bayCount =
    settings.baseLength + settings.bayLength * Math.ceil(docIds.length / settings.docsPerBay)
  const visibleBayCount = Math.min(bayCount, settings.maxVisibleBaysPerLane)

  return {
    id: `lane.${category.id}`,
    categoryId: category.id,
    label: category.label,
    side,
    x: (side === 'left' ? -1 : 1) * (settings.laneBaseX + sideIndex * settings.laneGapX),
    zStart: settings.laneStartZ,
    bayCount,
    visibleBayCount,
    docCount: docIds.length,
    compressedDocCount: Math.max(0, docIds.length - visibleBayCount * settings.docsPerBay),
    docIds,
  }
}

function createDocAnchors(lanes: LibraryLaneBlueprint[]): LibraryDocAnchor[] {
  const anchors: LibraryDocAnchor[] = []

  for (const lane of lanes) {
    const previewDocIds = lane.docIds.slice(0, 6)

    previewDocIds.forEach((docId, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const xOffset = lane.side === 'left' ? 1.45 : -1.45
      const zOffset = -1.2 * column
      const y = 1.4 + row * 0.18

      anchors.push({
        id: `anchor.${lane.categoryId}.${docId}`,
        docId,
        categoryId: lane.categoryId,
        position: [lane.x + xOffset, y, lane.zStart + 0.7 + zOffset],
      })
    })
  }

  return anchors
}

function createInteractables(
  lanes: LibraryLaneBlueprint[],
  anchors: LibraryDocAnchor[],
): LibraryInteractableBlueprint[] {
  const interactables: LibraryInteractableBlueprint[] = [
    {
      id: 'library.librarianDesk',
      kind: 'librarian',
      label: 'Librarian Console',
      position: [0, 1.2, 12.6],
    },
  ]

  for (const lane of lanes) {
    interactables.push({
      id: `library.category.${lane.categoryId}`,
      kind: 'category',
      label: `Category: ${lane.label}`,
      targetId: lane.categoryId,
      position: [lane.x + (lane.side === 'left' ? 1.7 : -1.7), 2.15, lane.zStart + 1.5],
    })
  }

  for (const anchor of anchors) {
    interactables.push({
      id: `library.doc.${anchor.docId}`,
      kind: 'doc',
      label: 'Open note',
      targetId: anchor.docId,
      position: anchor.position,
    })
  }

  return interactables
}

export function buildLibraryLayout(
  categories: KnowledgeCategory[],
  docByCategory: Record<string, string[]>,
  options?: LibraryLayoutOptions,
): LibraryLayoutBlueprint {
  const settings = resolveSettings(options)

  const sourceCategories = categories.filter((category) => {
    if (category.id === 'uncategorized') {
      return true
    }

    return (docByCategory[category.id]?.length ?? 0) > 0
  })

  const lanes = (sourceCategories.length > 0 ? sourceCategories : categories)
    .map((category, index) => toLane(category, index, docByCategory[category.id] ?? [], settings))

  const docAnchors = createDocAnchors(lanes)
  const interactables = createInteractables(lanes, docAnchors)

  return {
    settings,
    lanes,
    docAnchors,
    interactables,
  }
}
