import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Maraca / shaker — short pink-noise burst highpassed into the sparkle
// range. Sits in the groove rather than punching through it.
export const shaker: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const highpass = new Tone.Filter({ type: 'highpass', frequency: 3000 }).connect(dest)
  const synth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.005, decay: 0.06, sustain: 0, release: 0.05 }
  }).connect(highpass)
  synth.volume.value = -10

  return {
    trigger: (time) => synth.triggerAttackRelease('16n', time, 0.6),
    dispose: () => {
      synth.dispose()
      highpass.dispose()
    }
  }
}
