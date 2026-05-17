import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// 808-style clap stack: three quick noise bursts plus a tiny tail, all
// filtered to the upper mids where claps sit in a mix.
export const clap: InstrumentFactory = () => {
  const filter = new Tone.Filter({ type: 'bandpass', frequency: 1200, Q: 2 }).toDestination()
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
  }).connect(filter)
  noise.volume.value = -2

  return {
    trigger: (time) => {
      noise.triggerAttackRelease('32n', time, 0.4)
      noise.triggerAttackRelease('32n', time + 0.012, 0.5)
      noise.triggerAttackRelease('32n', time + 0.024, 0.4)
      noise.triggerAttackRelease('16n', time + 0.04, 0.3)
    },
    dispose: () => {
      noise.dispose()
      filter.dispose()
    }
  }
}
