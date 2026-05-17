import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Slow-attack AM pad through Freeverb — soft sustained bed.
// Freeverb is used instead of Tone.Reverb so it works on the first trigger
// without awaiting an async generate() call from a sync factory.
export const pad: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const reverb = new Tone.Freeverb({ roomSize: 0.85, dampening: 3000, wet: 0.4 }).connect(dest)
  const synth = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 2,
    oscillator: { type: 'triangle' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.4, decay: 0.5, sustain: 0.7, release: 1.2 }
  }).connect(reverb)
  synth.volume.value = -4

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.7),
    dispose: () => {
      synth.dispose()
      reverb.dispose()
    }
  }
}
