import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Five detuned sawtooth oscillators stacked — the thick analog brass-lead
// sound that defines records like Van Halen's "Jump" (OB-Xa) or any wide
// supersaw lead. Tone.Synth accepts the FatOscillator's count/spread on
// its `oscillator` field when the type starts with "fat".
export const fat: InstrumentFactory = () => {
  // Tone's discriminated union for OmniOscillator options doesn't model
  // `{ type: 'fatsawtooth', count, spread }` cleanly at the TS level, so
  // we cast — the shape is exactly what FatOscillator expects at runtime.
  const synth = new Tone.Synth({
    oscillator: { type: 'fatsawtooth', count: 5, spread: 40 } as never,
    envelope: { attack: 0.02, decay: 0.25, sustain: 0.55, release: 0.4 }
  }).toDestination()
  synth.volume.value = -10

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.8),
    dispose: () => synth.dispose()
  }
}
