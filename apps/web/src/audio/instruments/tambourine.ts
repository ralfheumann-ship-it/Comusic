import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Two-layer tambourine: a short bright noise burst gives the "shhh" of the
// shell hit, while a quick MetalSynth ping layers in the jingle of the
// zils. Both share a single highpass to keep the lows out of the mix.
export const tambourine: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const hp = new Tone.Filter({ type: 'highpass', frequency: 5000 }).connect(dest)
  const noiseSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.06 }
  }).connect(hp)
  noiseSynth.volume.value = -8
  const metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.16, release: 0.1 },
    harmonicity: 6.2,
    modulationIndex: 24,
    resonance: 6000,
    octaves: 1.2
  }).connect(hp)
  metal.volume.value = -22

  return {
    trigger: (time) => {
      noiseSynth.triggerAttackRelease('16n', time, 0.8)
      metal.triggerAttackRelease('C6', '16n', time, 0.7)
    },
    dispose: () => {
      noiseSynth.dispose()
      metal.dispose()
      hp.dispose()
    }
  }
}
