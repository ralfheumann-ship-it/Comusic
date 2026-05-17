import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Round, deep low-end glue: sine osc through a fixed lowpass.
export const subBass: InstrumentFactory = () => {
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 350, Q: 0.7 }).toDestination()
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.25 }
  }).connect(filter)
  synth.volume.value = -4

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.9),
    dispose: () => {
      synth.dispose()
      filter.dispose()
    }
  }
}
