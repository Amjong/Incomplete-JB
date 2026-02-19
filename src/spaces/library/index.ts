import type { SpaceDefinition } from '../../engine/spaces/types'
import { LibraryScene } from './LibraryScene'

export const librarySpace: SpaceDefinition = {
  id: 'library',
  title: 'Library',
  profile: {
    background: '#050d1f',
    fog: {
      color: '#081228',
      near: 8,
      far: 42,
    },
    gravity: [0, -8.6, 0],
    camera: {
      fov: 68,
      movementAcceleration: 12,
      swayAmount: 0.012,
      swayFrequency: 8,
    },
    sound: {
      enabled: true,
      mode: "track",
      trackUrl: "/audio/library-ambience.wav",
      playbackRate: 1,
      gain: 0.025,
      lowpassHz: 700,
      delayMs: 320,
      feedback: 0.26,
      reverbMix: 0.2,
    },
    postprocessing: {
      bloom: {
        intensity: 0.62,
        luminanceThreshold: 0.24,
      },
      vignette: {
        offset: 0.28,
        darkness: 0.66,
      },
    },
  },
  spawn: { position: [0, 1.6, 8] },
  controls: { speed: 4.0 },
  Scene: LibraryScene,
}

export { LibraryScene }
