import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const pluck: InstrumentFactory = () => {
  const synth = new Tone.PluckSynth({
    attackNoise: 0.6,
    dampening: 4000,
    resonance: 0.7
  }).toDestination()

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.8),
    dispose: () => synth.dispose()
  }
}
