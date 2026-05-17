import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Long, deep 808-style sub-kick — the heavy hip-hop / trap boom.
// pitchDecay is much longer than the standard kick, which is what gives the
// characteristic descending sub-bass tail rather than a short thump.
export const kick808: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.4,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.8, sustain: 0.01, release: 1.4 }
  }).connect(dest)
  synth.volume.value = -4

  return {
    trigger: (time) => synth.triggerAttackRelease('A1', '2n', time, 0.9),
    dispose: () => synth.dispose()
  }
}
