import type { SpaceDefinition } from '../../engine/spaces/types'
import { GalleryScene } from './GalleryScene'

export const gallerySpace: SpaceDefinition = {
  id: 'gallery',
  title: 'Gallery',
  profile: {
    background: '#eef2f7',
    fog: {
      color: '#edf2f8',
      near: 16,
      far: 62,
    },
    gravity: [0, -9.81, 0],
    camera: {
      fov: 74,
      movementAcceleration: 12,
      swayAmount: 0.006,
      swayFrequency: 7,
    },
    sound: {
      enabled: true,
      mode: 'track',
      trackUrl: '/audio/library-ambience.wav',
      playbackRate: 0.92,
      gain: 0.02,
      lowpassHz: 1300,
      delayMs: 210,
      feedback: 0.15,
      reverbMix: 0.1,
    },
    postprocessing: {
      bloom: {
        intensity: 0.32,
        luminanceThreshold: 0.4,
      },
      vignette: {
        offset: 0.26,
        darkness: 0.42,
      },
    },
  },
  spawn: { position: [0, 1.6, 14.2] },
  controls: { speed: 4.1 },
  Scene: GalleryScene,
}

export { GalleryScene }
