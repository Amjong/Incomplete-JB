export interface BloomProfile {
  intensity?: number
  luminanceThreshold?: number
  luminanceSmoothing?: number
  mipmapBlur?: boolean
}

export interface VignetteProfile {
  offset?: number
  darkness?: number
  eskil?: boolean
}

export interface NoiseProfile {
  opacity?: number
}

export interface CameraProfile {
  fov?: number
  movementAcceleration?: number
  swayAmount?: number
  swayFrequency?: number
}

export interface SoundProfile {
  enabled?: boolean
  mode?: 'procedural' | 'track'
  trackUrl?: string
  playbackRate?: number
  toneHz?: number
  gain?: number
  lowpassHz?: number
  delayMs?: number
  feedback?: number
  reverbMix?: number
}

export interface WorldProfile {
  background: string
  fog?: {
    color: string
    near: number
    far: number
  }
  gravity: [number, number, number]
  camera?: CameraProfile
  sound?: SoundProfile
  postprocessing?: {
    bloom?: boolean | BloomProfile
    vignette?: boolean | VignetteProfile
    noise?: boolean | NoiseProfile
  }
}
