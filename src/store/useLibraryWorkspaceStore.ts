import { create } from 'zustand'
import type { KnowledgeDoc } from '../knowledge/types'
export type WorkspaceSaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface WorkspaceDocument {
  id: string
  slug: string
  title: string
  body: string
  blockDepths: number[]
  blockIds: string[]
  status: KnowledgeDoc['status']
  updatedAt: string
  categoryId: string | null
  isLocalOnly: boolean
}

interface WorkspaceStore {
  docs: WorkspaceDocument[]
  selectedDocId: string | null
  query: string
  activeCategoryId: string | null
  sidebarOpen: boolean
  saveState: WorkspaceSaveState
  lastSavedAt: string | null
  saveRequestToken: number
  requestedSaveDocId: string | null
  hydrateFromKnowledgeDocs: (docs: KnowledgeDoc[], docByCategory: Record<string, string[]>) => void
  hydrateFromRemoteDocs: (docs: WorkspaceDocument[]) => void
  selectDoc: (docId: string | null) => void
  setQuery: (query: string) => void
  setActiveCategoryId: (categoryId: string | null) => void
  setSidebarOpen: (open: boolean) => void
  createDocument: () => void
  updateDocument: (docId: string, patch: Partial<Pick<WorkspaceDocument, 'title' | 'body' | 'blockDepths' | 'blockIds'>>) => void
  replaceDocument: (tempId: string, nextDoc: WorkspaceDocument) => void
  setSaveState: (saveState: WorkspaceSaveState, lastSavedAt?: string | null) => void
  saveDocument: (docId: string) => void
}

function createWorkspaceBlockId(docId: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${docId}-${crypto.randomUUID()}`
  }

  return `${docId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function slugifyWorkspaceTitle(input: string) {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return normalized || 'untitled'
}

function buildDocCategoryMap(docByCategory: Record<string, string[]>): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const [categoryId, docIds] of Object.entries(docByCategory)) {
    for (const docId of docIds) {
      mapping[docId] = categoryId
    }
  }

  return mapping
}

export const useLibraryWorkspaceStore = create<WorkspaceStore>((set) => ({
  docs: [],
  selectedDocId: null,
  query: '',
  activeCategoryId: null,
  sidebarOpen: false,
  saveState: 'idle',
  lastSavedAt: null,
  saveRequestToken: 0,
  requestedSaveDocId: null,

  hydrateFromKnowledgeDocs: (docs, docByCategory) =>
    set((state) => {
      if (state.docs.length > 0) {
        return state
      }

      const categoryMap = buildDocCategoryMap(docByCategory)
      const nextDocs = docs.map((doc) => ({
        id: doc.id,
        slug: slugifyWorkspaceTitle(doc.title || doc.id),
        title: doc.title,
        body: doc.body,
        blockDepths: [],
        blockIds: [],
        status: doc.status,
        updatedAt: doc.updatedAt,
        categoryId: categoryMap[doc.id] ?? null,
        isLocalOnly: false,
      }))

      return {
        docs: nextDocs,
        selectedDocId: state.selectedDocId ?? nextDocs[0]?.id ?? null,
      }
    }),

  hydrateFromRemoteDocs: (docs) =>
    set((state) => {
      const selectedExists = state.selectedDocId ? docs.some((doc) => doc.id === state.selectedDocId) : false

      return {
        docs,
        selectedDocId: selectedExists ? state.selectedDocId : docs[0]?.id ?? null,
        saveState: 'idle',
        lastSavedAt: null,
      }
    }),

  selectDoc: (docId) => set({ selectedDocId: docId }),
  setQuery: (query) => set({ query }),
  setActiveCategoryId: (categoryId) => set({ activeCategoryId: categoryId }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  createDocument: () =>
    set((state) => {
      const createdAt = new Date().toISOString()
      const docId = `local-${Date.now()}`
      const nextDoc: WorkspaceDocument = {
        id: docId,
        slug: `untitled-${state.docs.length + 1}`,
        title: 'Untitled page',
        body: '- Capture the core idea\n- Add links with [[Page Title]]\n',
        blockDepths: [0, 0],
        blockIds: [createWorkspaceBlockId(docId), createWorkspaceBlockId(docId)],
        status: 'active',
        updatedAt: createdAt,
        categoryId: null,
        isLocalOnly: true,
      }

      return {
        docs: [nextDoc, ...state.docs],
        selectedDocId: nextDoc.id,
        saveState: 'idle',
      }
    }),

  updateDocument: (docId, patch) =>
    set((state) => ({
      docs: state.docs.map((doc) => {
        if (doc.id !== docId) {
          return doc
        }

        const nextTitle = patch.title ?? doc.title
        return {
          ...doc,
          ...patch,
          slug: patch.title ? slugifyWorkspaceTitle(nextTitle) : doc.slug,
          updatedAt: new Date().toISOString(),
        }
      }),
      saveState: 'idle',
    })),

  replaceDocument: (tempId, nextDoc) =>
    set((state) => ({
      docs: state.docs.map((doc) => (doc.id === tempId ? nextDoc : doc)),
      selectedDocId: state.selectedDocId === tempId ? nextDoc.id : state.selectedDocId,
    })),

  setSaveState: (saveState, lastSavedAt = null) =>
    set({
      saveState,
      lastSavedAt: saveState === 'saved' ? lastSavedAt ?? new Date().toISOString() : lastSavedAt,
    }),

  saveDocument: (docId) =>
    set((state) => {
      const exists = state.docs.some((doc) => doc.id === docId)
      if (!exists) {
        return state
      }

      return {
        saveRequestToken: state.saveRequestToken + 1,
        requestedSaveDocId: docId,
      }
    }),
}))
