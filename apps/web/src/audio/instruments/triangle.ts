import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const triangle: InstrumentFactory = () => {
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.4, release: 0.15 }
  }).toDestination()

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.6),
    dispose: () => synth.dispose()
  }
}
