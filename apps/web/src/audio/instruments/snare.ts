import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const snare: InstrumentFactory = () => {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.05 }
  }).toDestination()

  const body = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
  }).toDestination()
  body.volume.value = -10

  return {
    trigger: (time) => {
      noise.triggerAttackRelease('16n', time, 0.5)
      body.triggerAttackRelease('A2', '16n', time, 0.6)
    },
    dispose: () => {
      noise.dispose()
      body.dispose()
    }
  }
}
