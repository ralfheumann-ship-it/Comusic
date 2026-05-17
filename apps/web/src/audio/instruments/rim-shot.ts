import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Tight, clicky stick-on-rim accent. A very short metallic membrane hit with
// a noise transient on top gives the characteristic "tock".
export const rimShot: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const click = new Tone.MembraneSynth({
    pitchDecay: 0.005,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
  }).connect(dest)
  click.volume.value = -6

  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 }
  }).connect(dest)
  noise.volume.value = -16

  return {
    trigger: (time) => {
      click.triggerAttackRelease('A4', '32n', time, 0.9)
      noise.triggerAttackRelease('32n', time, 0.5)
    },
    dispose: () => {
      click.dispose()
      noise.dispose()
    }
  }
}
