import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Clean electric guitar: bright pluck through a gentle lowpass to round off the
// fizz, with a touch of chorus for amp-cab character. Less attack-noise than
// the acoustic for that direct, plugged-in tone.
export const electricGuitar: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3, depth: 0.4, wet: 0.25 })
    .connect(dest)
    .start()
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 3500, Q: 0.6 }).connect(chorus)
  const synth = new Tone.PluckSynth({
    attackNoise: 0.4,
    dampening: 5500,
    resonance: 0.96
  }).connect(filter)
  synth.volume.value = -4

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.85),
    dispose: () => {
      synth.dispose()
      filter.dispose()
      chorus.dispose()
    }
  }
}
