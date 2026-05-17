import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Synth-piano: PolySynth voiced with a triangle base for body and a tilted EQ
// that warms the lows and softens the highs. Hammer-like attack envelope with
// a long release lets overlapping chord tones ring into each other.
export const piano: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const eq = new Tone.EQ3({ low: -1, mid: 1, high: -3 }).connect(dest)
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.003, decay: 0.6, sustain: 0.18, release: 1.4 }
  }).connect(eq)
  synth.volume.value = -6

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.8),
    dispose: () => {
      synth.dispose()
      eq.dispose()
    }
  }
}
