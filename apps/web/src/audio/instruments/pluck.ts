import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const pluck: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.PluckSynth({
    attackNoise: 0.6,
    dampening: 4000,
    resonance: 0.7
  }).connect(dest)
  synth.volume.value = -4

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.8),
    dispose: () => synth.dispose()
  }
}
