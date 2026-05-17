import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const noise: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
  }).connect(dest)
  // Broadband white noise has high perceived loudness; tuck it well down.
  synth.volume.value = -12

  return {
    trigger: (time) => synth.triggerAttackRelease('16n', time, 0.5),
    dispose: () => synth.dispose()
  }
}
