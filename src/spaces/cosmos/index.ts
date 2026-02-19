import type { SpaceDefinition } from '../../engine/spaces/types'
import { CosmosScene } from './CosmosScene'

export const cosmosSpace: SpaceDefinition = {
  id: 'cosmos',
  title: 'Cosmos',
  profile: {
    background: '#02030a',
    fog: {
      color: '#050711',
      near: 48,
      far: 180,
    },
    gravity: [0, 0, 0],
    camera: {
      fov: 84,
      movementAcceleration: 8,
      swayAmount: 0.004,
      swayFrequency: 5,
    },
    sound: {
      enabled: true,
      mode: "track",
      trackUrl: "/audio/cosmos-ambience.wav",
      playbackRate: 1,
      gain: 0.028,
      lowpassHz: 1400,
      delayMs: 520,
      feedback: 0.36,
      reverbMix: 0.3,
    },
    postprocessing: {
      bloom: {
        intensity: 1.2,
        luminanceThreshold: 0.12,
        luminanceSmoothing: 0.2,
      },
      noise: {
        opacity: 0.04,
      },
      vignette: {
        offset: 0.15,
        darkness: 0.75,
      },
    },
  },
  spawn: { position: [0, 1.6, 6.2] },
  controls: { speed: 5.4 },
  Scene: CosmosScene,
}

export { CosmosScene }
