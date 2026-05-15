import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const kick: InstrumentFactory = () => {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 }
  }).toDestination()

  return {
    trigger: (time) => synth.triggerAttackRelease('C2', '8n', time, 0.9),
    dispose: () => synth.dispose()
  }
}
