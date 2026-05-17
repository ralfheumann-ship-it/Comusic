import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Warm hand-drum thump with a touch of skin resonance. Tighter than a tom
// and rounder than a rim-shot — pairs well with shakers for Latin grooves.
export const conga: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 2,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.15 }
  }).connect(dest)
  synth.volume.value = -6

  return {
    trigger: (time) => synth.triggerAttackRelease('G3', '8n', time, 0.85),
    dispose: () => synth.dispose()
  }
}
