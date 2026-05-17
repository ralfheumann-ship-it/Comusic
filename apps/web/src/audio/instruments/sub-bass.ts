import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Round, deep low-end glue: sine osc through a fixed lowpass.
export const subBass: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 350, Q: 0.7 }).connect(dest)
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.25 }
  }).connect(filter)
  synth.volume.value = -8

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.85),
    dispose: () => {
      synth.dispose()
      filter.dispose()
    }
  }
}
