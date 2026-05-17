import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Polyphonic Synth: each step's note rings out independently instead of
// being cut off by the next trigger, so release tails of consecutive notes
// overlap. Triangle voice with a moderate release works well for arpeggios
// and sustained washes.
export const polySynth: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 }
  }).connect(dest)
  synth.volume.value = -6

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
