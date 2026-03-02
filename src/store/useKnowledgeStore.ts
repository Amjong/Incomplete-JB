import { create } from 'zustand'
import { rebuildKnowledgeIndex } from '../knowledge/categorizer/librarian'
import { serializeKnowledgeDraftToMarkdown } from '../knowledge/parser/frontmatter'
import { buildSearchIndex, searchKnowledge, type SearchIndex } from '../knowledge/search'
import type {
  KnowledgeCategory,
  KnowledgeDoc,
  KnowledgeDraft,
  KnowledgeDraftInput,
  KnowledgeIndex,
} from '../knowledge/types'

export type KnowledgePanelTab = 'librarian' | 'search' | 'editor' | 'reader'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface SearchPage {
  total: number
  page: number
  totalPages: number
  items: KnowledgeDoc[]
}

interface KnowledgeStore {
  loadState: LoadState
  error: string | null
  index: KnowledgeIndex | null
  searchIndex: SearchIndex | null
  panelOpen: boolean
  activeTab: KnowledgePanelTab
  selectedCategoryId: string | null
  selectedDocId: string | null
  query: string
  page: number
  pageSize: number
  drafts: KnowledgeDraft[]
  draftExportText: string
  loadIndex: () => Promise<void>
  ensureLoaded: () => void
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  setActiveTab: (tab: KnowledgePanelTab) => void
  setSelectedCategoryId: (categoryId: string | null) => void
  setSelectedDocId: (docId: string | null) => void
  setQuery: (query: string) => void
  setPage: (page: number) => void
  openLibrarian: () => void
  openCategory: (categoryId: string) => void
  openDoc: (docId: string) => void
  addDraft: (input: KnowledgeDraftInput) => void
  clearDrafts: () => void
  recategorize: () => void
  archiveDoc: (docId: string) => void
  getSearchPage: () => SearchPage
  getCategoryCounts: () => Array<{ category: KnowledgeCategory; count: number }>
}

function buildDocToCategory(docByCategory: Record<string, string[]>): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const [categoryId, docIds] of Object.entries(docByCategory)) {
    for (const docId of docIds) {
      mapping[docId] = categoryId
    }
  }

  return mapping
}

function buildStoreSearchIndex(index: KnowledgeIndex): SearchIndex {
  return buildSearchIndex(index.docs, buildDocToCategory(index.docByCategory))
}

function toDocById(docs: KnowledgeDoc[]): Map<string, KnowledgeDoc> {
  return new Map(docs.map((doc) => [doc.id, doc]))
}

function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 1) {
    return 1
  }
  return Math.min(Math.max(page, 1), totalPages)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  loadState: 'idle',
  error: null,
  index: null,
  searchIndex: null,
  panelOpen: false,
  activeTab: 'librarian',
  selectedCategoryId: null,
  selectedDocId: null,
  query: '',
  page: 1,
  pageSize: 8,
  drafts: [],
  draftExportText: '',

  loadIndex: async () => {
    const current = get().loadState
    if (current === 'loading') {
      return
    }

    set({ loadState: 'loading', error: null })

    try {
      const response = await fetch('/data/knowledge-index.json')
      if (!response.ok) {
        throw new Error(`Failed to load knowledge index: ${response.status}`)
      }

      const index = (await response.json()) as KnowledgeIndex
      set({
        index,
        searchIndex: buildStoreSearchIndex(index),
        loadState: 'ready',
        error: null,
      })
    } catch (error) {
      set({
        loadState: 'error',
        error: error instanceof Error ? error.message : 'Unknown knowledge index load error',
      })
    }
  },

  ensureLoaded: () => {
    if (get().loadState === 'idle') {
      void get().loadIndex()
    }
  },

  setPanelOpen: (open) =>
    set(() => ({
      panelOpen: open,
      page: open ? get().page : 1,
    })),

  togglePanel: () =>
    set((state) => ({
      panelOpen: !state.panelOpen,
      page: !state.panelOpen ? state.page : 1,
    })),

  setActiveTab: (tab) =>
    set((state) => ({
      activeTab: tab,
      panelOpen: true,
      selectedDocId: tab === 'reader' ? state.selectedDocId : null,
    })),

  setSelectedCategoryId: (categoryId) =>
    set({ selectedCategoryId: categoryId, page: 1, panelOpen: true, activeTab: 'search' }),

  setSelectedDocId: (docId) =>
    set({
      selectedDocId: docId,
      panelOpen: true,
      activeTab: docId ? 'reader' : 'search',
    }),

  setQuery: (query) => set({ query, page: 1, activeTab: 'search', panelOpen: true }),

  setPage: (page) => set({ page }),

  openLibrarian: () => set({ panelOpen: true, activeTab: 'librarian', selectedDocId: null }),

  openCategory: (categoryId) =>
    set({ panelOpen: true, activeTab: 'search', selectedCategoryId: categoryId, page: 1 }),

  openDoc: (docId) => set({ panelOpen: true, activeTab: 'reader', selectedDocId: docId }),

  addDraft: (input) => {
    const safeTitle = input.title.trim() || 'untitled-note'
    const draftId = `${slugify(safeTitle)}-${Date.now()}`
    const markdown = serializeKnowledgeDraftToMarkdown(input, draftId)
    const now = new Date().toISOString()

    const draft: KnowledgeDraft = {
      draftId,
      source: 'in-app',
      id: draftId,
      title: input.title,
      summary: input.summary,
      tags: input.tags,
      categoryHint: input.categoryHint,
      createdAt: now,
      updatedAt: now,
      body: input.body,
      status: 'active',
    }

    set((state) => {
      const nextDrafts = [...state.drafts, draft]
      const exportText = [...state.draftExportText.trim(), markdown.trim()]
        .filter(Boolean)
        .join('\n\n')

      return {
        drafts: nextDrafts,
        draftExportText: `${exportText}\n`,
        activeTab: 'editor',
        panelOpen: true,
      }
    })
  },

  clearDrafts: () => set({ drafts: [], draftExportText: '' }),

  recategorize: () =>
    set((state) => {
      if (!state.index) {
        return state
      }

      const rebuilt = rebuildKnowledgeIndex(state.index)
      return {
        index: rebuilt,
        searchIndex: buildStoreSearchIndex(rebuilt),
      }
    }),

  archiveDoc: (docId) =>
    set((state) => {
      if (!state.index) {
        return state
      }

      const docs = state.index.docs.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              status: 'archived' as const,
              updatedAt: new Date().toISOString(),
            }
          : doc,
      )

      const rebuilt = rebuildKnowledgeIndex({ ...state.index, docs })
      return {
        index: rebuilt,
        searchIndex: buildStoreSearchIndex(rebuilt),
        selectedDocId: state.selectedDocId === docId ? null : state.selectedDocId,
      }
    }),

  getSearchPage: () => {
    const state = get()
    if (!state.index || !state.searchIndex) {
      return {
        total: 0,
        page: 1,
        totalPages: 1,
        items: [],
      }
    }

    const hits = searchKnowledge(state.searchIndex, {
      query: state.query,
      categoryId: state.selectedCategoryId,
      includeArchived: false,
    })

    const docMap = toDocById(state.index.docs)
    const docs = hits.map((hit) => docMap.get(hit.docId)).filter((doc): doc is KnowledgeDoc => Boolean(doc))

    const total = docs.length
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize))
    const page = clampPage(state.page, totalPages)

    const start = (page - 1) * state.pageSize
    const items = docs.slice(start, start + state.pageSize)

    return {
      total,
      page,
      totalPages,
      items,
    }
  },

  getCategoryCounts: () => {
    const state = get()
    if (!state.index) {
      return []
    }

    return state.index.categories.map((category) => ({
      category,
      count: state.index?.docByCategory[category.id]?.length ?? 0,
    }))
  },
}))
