import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const saw: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.1 }
  }).connect(dest)
  synth.volume.value = -8

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '16n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
