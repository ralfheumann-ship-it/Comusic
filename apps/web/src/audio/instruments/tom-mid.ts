import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Mid tom — sits between floor and rack tom for a fill-friendly tom run.
export const tomMid: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 3,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.25 }
  }).connect(dest)
  synth.volume.value = -6

  return {
    trigger: (time) => synth.triggerAttackRelease('A2', '8n', time, 0.9),
    dispose: () => synth.dispose()
  }
}
