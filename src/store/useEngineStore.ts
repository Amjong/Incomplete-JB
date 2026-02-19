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
}

export const useEngineStore = create<EngineStore>((set, get) => ({
  spaceId: 'room',
  setSpaceId: (spaceId) =>
    set({
      spaceId,
      focusedId: null,
      interactables: new Map(),
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
  setChatOpen: (open) => set({ chatOpen: open }),
  audioMuted: false,
  setAudioMuted: (muted) => set({ audioMuted: muted }),
}))
