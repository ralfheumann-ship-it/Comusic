import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Rack tom — snappier attack and shorter sustain than the floor / mid toms.
export const tomHigh: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 3,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.18 }
  }).connect(dest)
  synth.volume.value = -6

  return {
    trigger: (time) => synth.triggerAttackRelease('C3', '8n', time, 0.9),
    dispose: () => synth.dispose()
  }
}
