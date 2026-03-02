import type { SpaceDefinition } from '../../engine/spaces/types'
import { RoomScene } from './RoomScene'

export const roomSpace: SpaceDefinition = {
  id: 'room',
  title: 'Room',
  profile: {
    background: '#24160f',
    fog: {
      color: '#2d1b12',
      near: 5.5,
      far: 18,
    },
    gravity: [0, -9.81, 0],
    camera: {
      fov: 72,
      movementAcceleration: 18,
      swayAmount: 0.018,
      swayFrequency: 9,
    },
    sound: {
      enabled: true,
      mode: "track",
      trackUrl: "/audio/room-ambience.wav",
      playbackRate: 1,
      gain: 0.03,
      lowpassHz: 950,
      delayMs: 260,
      feedback: 0.18,
      reverbMix: 0.12,
    },
    postprocessing: {
      bloom: {
        intensity: 0.3,
        luminanceThreshold: 0.35,
      },
      vignette: {
        offset: 0.2,
        darkness: 0.44,
      },
    },
  },
  spawn: { position: [0, 1.6, 2.2] },
  controls: { speed: 1.4 },
  Scene: RoomScene,
}

export { RoomScene }
