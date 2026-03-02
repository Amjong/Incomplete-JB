import { create } from 'zustand'
import type { Object3D } from 'three'
import type { SpaceId, SpacePath } from '../engine/spaces/types'

interface InteractableDefinition {
  id: string
  label: string
  onInteract: () => void
  object: Object3D | null
}

export type TransitionPhase = 'idle' | 'zoom-in' | 'navigate' | 'zoom-out'

interface SpaceTransition {
  phase: TransitionPhase
  pendingPath: SpacePath | null
  focusPoint: [number, number, number] | null
}

type PointerLockGuardSource = 'library' | 'gallery' | 'chat'

interface EngineStore {
  spaceId: SpaceId
  setSpaceId: (spaceId: SpaceId) => void
  focusedId: string | null
  setFocusedId: (id: string | null) => void
  interactables: Map<string, InteractableDefinition>
  registerInteractable: (interactable: InteractableDefinition) => void
  unregisterInteractable: (id: string) => void
  interact: () => void
  transition: SpaceTransition
  startTransition: (path: SpacePath, focusPoint: [number, number, number] | null) => void
  setTransitionPhase: (phase: TransitionPhase) => void
  clearTransition: () => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  audioMuted: boolean
  setAudioMuted: (muted: boolean) => void
  overlayHudBySource: {
    library: boolean
    gallery: boolean
  }
  overlayHudOpen: boolean
  setOverlayHudOpen: (source: 'library' | 'gallery', open: boolean) => void
  pointerLockGuardBySource: Record<PointerLockGuardSource, boolean>
  preventPointerLock: boolean
  setPointerLockGuard: (source: PointerLockGuardSource, blocked: boolean) => void
}

export const useEngineStore = create<EngineStore>((set, get) => ({
  spaceId: 'room',
  setSpaceId: (spaceId) =>
    set({
      spaceId,
      focusedId: null,
      interactables: new Map(),
      chatOpen: false,
      overlayHudBySource: {
        library: false,
        gallery: false,
      },
      overlayHudOpen: false,
      pointerLockGuardBySource: {
        library: false,
        gallery: false,
        chat: false,
      },
      preventPointerLock: false,
    }),
  focusedId: null,
  setFocusedId: (id) => set({ focusedId: id }),
  interactables: new Map(),
  registerInteractable: (interactable) =>
    set((state) => {
      const next = new Map(state.interactables)
      next.set(interactable.id, interactable)
      return { interactables: next }
    }),
  unregisterInteractable: (id) =>
    set((state) => {
      const next = new Map(state.interactables)
      next.delete(id)
      return {
        interactables: next,
        focusedId: state.focusedId === id ? null : state.focusedId,
      }
    }),
  interact: () => {
    const state = get()
    if (!state.focusedId) {
      return
    }

    state.interactables.get(state.focusedId)?.onInteract()
  },
  transition: {
    phase: 'idle',
    pendingPath: null,
    focusPoint: null,
  },
  startTransition: (pendingPath, focusPoint) =>
    set({
      focusedId: null,
      chatOpen: false,
      pointerLockGuardBySource: {
        library: false,
        gallery: false,
        chat: false,
      },
      preventPointerLock: false,
      transition: {
        phase: 'zoom-in',
        pendingPath,
        focusPoint,
      },
    }),
  setTransitionPhase: (phase) =>
    set((state) => ({
      transition: {
        ...state.transition,
        phase,
      },
    })),
  clearTransition: () =>
    set({
      transition: {
        phase: 'idle',
        pendingPath: null,
        focusPoint: null,
      },
    }),
  chatOpen: false,
  setChatOpen: (open) =>
    set((state) => {
      const nextGuards = {
        ...state.pointerLockGuardBySource,
        chat: open,
      }

      return {
        chatOpen: open,
        pointerLockGuardBySource: nextGuards,
        preventPointerLock: nextGuards.library || nextGuards.gallery || nextGuards.chat,
      }
    }),
  audioMuted: false,
  setAudioMuted: (muted) => set({ audioMuted: muted }),
  overlayHudBySource: {
    library: false,
    gallery: false,
  },
  overlayHudOpen: false,
  setOverlayHudOpen: (source, open) =>
    set((state) => {
      const nextBySource = {
        ...state.overlayHudBySource,
        [source]: open,
      }
      const nextOpen = nextBySource.library || nextBySource.gallery

      return {
        overlayHudBySource: nextBySource,
        overlayHudOpen: nextOpen,
      }
    }),
  pointerLockGuardBySource: {
    library: false,
    gallery: false,
    chat: false,
  },
  preventPointerLock: false,
  setPointerLockGuard: (source, blocked) =>
    set((state) => {
      const nextGuards = {
        ...state.pointerLockGuardBySource,
        [source]: blocked,
      }

      return {
        pointerLockGuardBySource: nextGuards,
        preventPointerLock: nextGuards.library || nextGuards.gallery || nextGuards.chat,
      }
    }),
}))
