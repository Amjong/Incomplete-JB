import { create } from 'zustand'
import { buildGalleryLayout } from '../gallery/layout'
import { fileToDataUrl, probeImage } from '../gallery/imageProbe'
import { parseCollectionJson, toCollectionJson } from '../gallery/serialization'
import type {
  GalleryCollection,
  GalleryImageUrlInput,
  GalleryItem,
  GalleryLayoutResult,
  GalleryYouTubeInput,
} from '../gallery/types'
import { getYouTubeThumbnailUrl, parseYouTubeId } from '../gallery/youtube'

export type GalleryPanelTab = 'collection' | 'add' | 'data'
type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface GalleryStore {
  loadState: LoadState
  error: string | null
  collection: GalleryCollection
  layout: GalleryLayoutResult
  panelOpen: boolean
  activeTab: GalleryPanelTab
  detailItemId: string | null
  loadSeed: () => Promise<void>
  setActiveTab: (tab: GalleryPanelTab) => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  openDetail: (id: string) => void
  closeDetail: () => void
  addImageByUrl: (input: GalleryImageUrlInput) => Promise<void>
  addImageByFile: (file: File) => Promise<void>
  addYouTubeUrl: (input: GalleryYouTubeInput) => Promise<void>
  removeItem: (id: string) => void
  exportCollectionAsJson: () => string
  importCollectionFromJson: (fileOrText: File | string) => Promise<void>
}

const EMPTY_COLLECTION: GalleryCollection = {
  version: 1,
  items: [],
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function makeId(title: string): string {
  const base = slugify(title || 'gallery-item') || 'gallery-item'
  return `${base}-${Date.now().toString(36)}`
}

function updateLayout(collection: GalleryCollection): GalleryLayoutResult {
  return buildGalleryLayout(collection.items)
}

function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function baseName(fileName: string): string {
  const normalized = fileName.replace(/\.[^/.]+$/, '').trim()
  return normalized || 'Uploaded image'
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  loadState: 'idle',
  error: null,
  collection: EMPTY_COLLECTION,
  layout: updateLayout(EMPTY_COLLECTION),
  panelOpen: false,
  activeTab: 'collection',
  detailItemId: null,

  loadSeed: async () => {
    const state = get()
    if (state.loadState === 'loading' || state.loadState === 'ready') {
      return
    }

    set({ loadState: 'loading', error: null })

    try {
      const response = await fetch('/data/gallery-seed.json')
      if (!response.ok) {
        throw new Error(`Failed to load gallery seed: ${response.status}`)
      }

      const text = await response.text()
      const collection = parseCollectionJson(text)

      set({
        collection,
        layout: updateLayout(collection),
        loadState: 'ready',
        error: null,
      })
    } catch (error) {
      set({
        loadState: 'error',
        error: error instanceof Error ? error.message : 'Unknown gallery load error',
      })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab, panelOpen: true }),

  openPanel: () => set({ panelOpen: true }),

  closePanel: () => set({ panelOpen: false, detailItemId: null }),

  togglePanel: () =>
    set((state) => ({
      panelOpen: !state.panelOpen,
      detailItemId: state.panelOpen ? null : state.detailItemId,
    })),

  openDetail: (id) => set({ panelOpen: true, detailItemId: id }),

  closeDetail: () => set({ detailItemId: null }),

  addImageByUrl: async (input) => {
    const url = input.url.trim()
    if (!isHttpsUrl(url)) {
      throw new Error('Image URL must start with https://')
    }

    const dimensions = await probeImage(url)
    const now = new Date().toISOString()

    const item: GalleryItem = {
      id: makeId(input.title),
      title: input.title.trim() || 'Untitled image',
      description: input.description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      media: {
        kind: 'image',
        sourceType: 'url',
        src: url,
        naturalWidth: dimensions.width,
        naturalHeight: dimensions.height,
      },
    }

    set((state) => {
      const collection: GalleryCollection = {
        version: 1,
        items: [item, ...state.collection.items],
      }

      return {
        collection,
        layout: updateLayout(collection),
        panelOpen: true,
        activeTab: 'collection',
      }
    })
  },

  addImageByFile: async (file) => {
    const dataUrl = await fileToDataUrl(file)
    const dimensions = await probeImage(dataUrl)
    const now = new Date().toISOString()

    const item: GalleryItem = {
      id: makeId(file.name),
      title: baseName(file.name),
      createdAt: now,
      updatedAt: now,
      media: {
        kind: 'image',
        sourceType: 'upload',
        src: dataUrl,
        naturalWidth: dimensions.width,
        naturalHeight: dimensions.height,
      },
    }

    set((state) => {
      const collection: GalleryCollection = {
        version: 1,
        items: [item, ...state.collection.items],
      }

      return {
        collection,
        layout: updateLayout(collection),
        panelOpen: true,
        activeTab: 'collection',
      }
    })
  },

  addYouTubeUrl: async (input) => {
    const url = input.url.trim()
    if (!isHttpsUrl(url)) {
      throw new Error('YouTube URL must start with https://')
    }

    const youtubeId = parseYouTubeId(url)
    if (!youtubeId) {
      throw new Error('Invalid YouTube URL format.')
    }

    const now = new Date().toISOString()
    const item: GalleryItem = {
      id: makeId(input.title || youtubeId),
      title: input.title.trim() || `YouTube ${youtubeId}`,
      description: input.description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      media: {
        kind: 'youtube',
        url,
        youtubeId,
        thumbUrl: getYouTubeThumbnailUrl(youtubeId),
        width: 1.6,
        height: 0.9,
      },
    }

    set((state) => {
      const collection: GalleryCollection = {
        version: 1,
        items: [item, ...state.collection.items],
      }

      return {
        collection,
        layout: updateLayout(collection),
        panelOpen: true,
        activeTab: 'collection',
      }
    })
  },

  removeItem: (id) =>
    set((state) => {
      const collection: GalleryCollection = {
        version: 1,
        items: state.collection.items.filter((item) => item.id !== id),
      }

      return {
        collection,
        layout: updateLayout(collection),
        detailItemId: state.detailItemId === id ? null : state.detailItemId,
      }
    }),

  exportCollectionAsJson: () => {
    const state = get()
    const json = toCollectionJson(state.collection)

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `gallery-collection-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    return json
  },

  importCollectionFromJson: async (fileOrText) => {
    const text =
      typeof fileOrText === 'string' ? fileOrText : await fileOrText.text()

    const collection = parseCollectionJson(text)

    set({
      collection,
      layout: updateLayout(collection),
      detailItemId: null,
      panelOpen: true,
      activeTab: 'collection',
      loadState: 'ready',
      error: null,
    })
  },
}))
