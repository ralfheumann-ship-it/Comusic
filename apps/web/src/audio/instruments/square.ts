import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const square: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.1 }
  }).connect(dest)
  synth.volume.value = -6

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '16n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
