import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import type { PropsWithChildren, ReactElement } from 'react'
import type { BloomProfile, NoiseProfile, VignetteProfile, WorldProfile } from './WorldProfile'
import { WorldAudio } from './WorldAudio'

interface WorldProps {
  profile: WorldProfile
}

function toBloomConfig(value: boolean | BloomProfile | undefined): BloomProfile | null {
  if (!value) {
    return null
  }

  if (value === true) {
    return {
      intensity: 0.6,
      luminanceThreshold: 0.3,
      luminanceSmoothing: 0.2,
      mipmapBlur: true,
    }
  }

  return value
}

function toVignetteConfig(value: boolean | VignetteProfile | undefined): VignetteProfile | null {
  if (!value) {
    return null
  }

  if (value === true) {
    return { offset: 0.25, darkness: 0.6, eskil: false }
  }

  return value
}

function toNoiseConfig(value: boolean | NoiseProfile | undefined): NoiseProfile | null {
  if (!value) {
    return null
  }

  if (value === true) {
    return { opacity: 0.03 }
  }

  return value
}

export function World({ profile, children }: PropsWithChildren<WorldProps>) {
  const bloom = toBloomConfig(profile.postprocessing?.bloom)
  const vignette = toVignetteConfig(profile.postprocessing?.vignette)
  const noise = toNoiseConfig(profile.postprocessing?.noise)
  const effects: ReactElement[] = []

  if (bloom) {
    effects.push(
      <Bloom
        key="bloom"
        intensity={bloom.intensity ?? 0.6}
        luminanceThreshold={bloom.luminanceThreshold ?? 0.3}
        luminanceSmoothing={bloom.luminanceSmoothing ?? 0.2}
        mipmapBlur={bloom.mipmapBlur ?? true}
      />,
    )
  }

  if (vignette) {
    effects.push(
      <Vignette
        key="vignette"
        offset={vignette.offset ?? 0.25}
        darkness={vignette.darkness ?? 0.6}
        eskil={vignette.eskil ?? false}
      />,
    )
  }

  if (noise) {
    effects.push(<Noise key="noise" opacity={noise.opacity ?? 0.03} />)
  }

  return (
    <>
      <color attach="background" args={[profile.background]} />
      {profile.fog ? (
        <fog attach="fog" args={[profile.fog.color, profile.fog.near, profile.fog.far]} />
      ) : null}

      <ambientLight intensity={0.55} />
      <directionalLight castShadow intensity={1.0} position={[6, 8, 2]} shadow-mapSize={[1024, 1024]} />
      <WorldAudio profile={profile.sound} />

      {children}

      {effects.length > 0 ? <EffectComposer>{effects}</EffectComposer> : null}
    </>
  )
}
