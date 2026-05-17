import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Floor tom — deep boomy hit with a quick pitch drop and a long body decay.
export const tomLow: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.4 }
  }).connect(dest)
  synth.volume.value = -6

  return {
    trigger: (time) => synth.triggerAttackRelease('E2', '8n', time, 0.9),
    dispose: () => synth.dispose()
  }
}
