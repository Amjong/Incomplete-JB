export type KnowledgeStatus = 'active' | 'archived'

export interface KnowledgeDoc {
  id: string
  title: string
  summary: string
  tags: string[]
  categoryHint?: string
  createdAt: string
  updatedAt: string
  body: string
  status: KnowledgeStatus
}

export interface KnowledgeCategory {
  id: string
  label: string
  parentId: string | null
  keywords: string[]
  tagAliases: string[]
}

export interface CategorizationResult {
  primaryCategoryId: string
  secondaryCategoryIds: string[]
  confidence: number
  reasons: string[]
}

export interface KnowledgeRecentChange {
  docId: string
  title: string
  categoryId: string
  updatedAt: string
  status: KnowledgeStatus
}

export interface LibraryLayoutSettings {
  baseLength: number
  bayLength: number
  docsPerBay: number
  maxVisibleBaysPerLane: number
  laneGapX: number
  laneBaseX: number
  laneStartZ: number
  laneBaySpacingZ: number
}

export interface LibraryLaneBlueprint {
  id: string
  categoryId: string
  label: string
  side: 'left' | 'right'
  x: number
  zStart: number
  bayCount: number
  visibleBayCount: number
  docCount: number
  compressedDocCount: number
  docIds: string[]
}

export interface LibraryDocAnchor {
  id: string
  docId: string
  categoryId: string
  position: [number, number, number]
}

export type LibraryInteractableKind = 'librarian' | 'category' | 'doc'

export interface LibraryInteractableBlueprint {
  id: string
  kind: LibraryInteractableKind
  label: string
  position: [number, number, number]
  targetId?: string
}

export interface LibraryLayoutBlueprint {
  settings: LibraryLayoutSettings
  lanes: LibraryLaneBlueprint[]
  docAnchors: LibraryDocAnchor[]
  interactables: LibraryInteractableBlueprint[]
}

export interface KnowledgeIndex {
  generatedAt: string
  categories: KnowledgeCategory[]
  docs: KnowledgeDoc[]
  categorizationResults: Record<string, CategorizationResult>
  docByCategory: Record<string, string[]>
  recentChanges: KnowledgeRecentChange[]
  layout: LibraryLayoutBlueprint
}

export interface KnowledgeDraftInput {
  title: string
  summary: string
  tags: string[]
  categoryHint?: string
  body: string
}

export interface KnowledgeDraft extends KnowledgeDoc {
  draftId: string
  source: 'in-app'
}
