import { useEffect } from 'react'
import { useEngineStore } from '../../store/useEngineStore'
import type { SoundProfile } from './WorldProfile'

interface WorldAudioProps {
  profile?: SoundProfile
}

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) {
    return null
  }

  return new AudioContextCtor()
}

export function WorldAudio({ profile }: WorldAudioProps) {
  const audioMuted = useEngineStore((state) => state.audioMuted)

  useEffect(() => {
    if (!profile?.enabled || audioMuted) {
      return
    }

    const audioContext = createAudioContext()
    if (!audioContext) {
      return
    }

    const filter = audioContext.createBiquadFilter()
    const dryGain = audioContext.createGain()
    const wetDelay = audioContext.createDelay(1)
    const wetFeedback = audioContext.createGain()
    const wetGain = audioContext.createGain()

    filter.type = 'lowpass'
    filter.frequency.value = profile.lowpassHz ?? 1200
    filter.Q.value = 0.8

    const masterGain = profile.gain ?? 0.03
    dryGain.gain.value = masterGain

    wetDelay.delayTime.value = Math.max((profile.delayMs ?? 170) / 1000, 0)
    wetFeedback.gain.value = profile.feedback ?? 0.28
    wetGain.gain.value = profile.reverbMix ?? 0.2

    filter.connect(dryGain)
    dryGain.connect(audioContext.destination)

    filter.connect(wetDelay)
    wetDelay.connect(wetFeedback)
    wetFeedback.connect(wetDelay)
    wetDelay.connect(wetGain)
    wetGain.connect(audioContext.destination)

    let oscillator: OscillatorNode | null = null
    let trackElement: HTMLAudioElement | null = null
    let trackSource: MediaElementAudioSourceNode | null = null

    if (profile.mode === 'track' && profile.trackUrl) {
      trackElement = new Audio(profile.trackUrl)
      trackElement.loop = true
      trackElement.preload = 'auto'
      trackElement.crossOrigin = 'anonymous'
      trackElement.volume = 1
      trackElement.playbackRate = profile.playbackRate ?? 1

      trackSource = audioContext.createMediaElementSource(trackElement)
      trackSource.connect(filter)
    } else {
      oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = profile.toneHz ?? 96
      oscillator.connect(filter)
      oscillator.start()
    }

    const startPlayback = () => {
      if (audioContext.state !== 'running') {
        void audioContext.resume()
      }

      if (trackElement) {
        void trackElement.play().catch(() => {
          // Expected until browser receives a user gesture.
        })
      }
    }

    window.addEventListener('pointerdown', startPlayback)
    window.addEventListener('keydown', startPlayback)
    startPlayback()

    return () => {
      window.removeEventListener('pointerdown', startPlayback)
      window.removeEventListener('keydown', startPlayback)

      const now = audioContext.currentTime
      dryGain.gain.setTargetAtTime(0, now, 0.08)
      wetGain.gain.setTargetAtTime(0, now, 0.08)

      if (oscillator) {
        oscillator.stop(now + 0.2)
      }

      if (trackElement) {
        trackElement.pause()
        trackElement.currentTime = 0
        trackElement.src = ''
      }

      window.setTimeout(() => {
        if (trackSource) {
          trackSource.disconnect()
        }
        void audioContext.close()
      }, 260)
    }
  }, [audioMuted, profile])

  return null
}
