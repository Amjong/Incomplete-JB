import type { SpaceDefinition } from '../../engine/spaces/types'
import { RoomScene } from './RoomScene'

export const roomSpace: SpaceDefinition = {
  id: 'room',
  title: 'Room',
  profile: {
    background: '#171116',
    fog: {
      color: '#171116',
      near: 10,
      far: 32,
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
        intensity: 0.45,
      },
      vignette: {
        offset: 0.24,
        darkness: 0.58,
      },
    },
  },
  spawn: { position: [0, 1.6, 5.2] },
  controls: { speed: 4.2 },
  Scene: RoomScene,
}

export { RoomScene }
