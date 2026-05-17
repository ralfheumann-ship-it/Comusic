import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Karplus-Strong pluck dialed warm and resonant for a nylon/steel-string feel.
// Higher attackNoise gives audible finger contact; a mid-lift EQ adds woody body.
export const acousticGuitar: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const eq = new Tone.EQ3({ low: 1, mid: 2, high: -1 }).connect(dest)
  const synth = new Tone.PluckSynth({
    attackNoise: 1.2,
    dampening: 4200,
    resonance: 0.92
  }).connect(eq)
  synth.volume.value = -2

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.85),
    dispose: () => {
      synth.dispose()
      eq.dispose()
    }
  }
}
