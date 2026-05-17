import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// MetalSynth tuned and enveloped as a long crash cymbal.
// NOTE: MetalSynth inherits triggerAttackRelease(note, duration, time, velocity)
// from Instrument — the first arg is the base frequency, not a duration. Passing
// a duration token there ("2n", "8n") silently produces nothing audible.
export const crash: InstrumentFactory = () => {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.5, release: 0.5 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5
  }).toDestination()

  return {
    trigger: (time) => synth.triggerAttackRelease('C4', '8n', time, 0.8),
    dispose: () => synth.dispose()
  }
}
