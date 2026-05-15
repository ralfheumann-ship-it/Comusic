import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const noise: InstrumentFactory = () => {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
  }).toDestination()

  return {
    trigger: (time) => synth.triggerAttackRelease('16n', time, 0.4),
    dispose: () => synth.dispose()
  }
}
