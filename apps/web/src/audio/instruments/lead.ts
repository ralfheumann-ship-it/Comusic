import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Bright sawtooth lead with chorus for thickness — good for melodies.
export const lead: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.5, wet: 0.4 })
    .connect(dest)
    .start()
  const synth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 }
  }).connect(chorus)
  synth.volume.value = -6

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.7),
    dispose: () => {
      synth.dispose()
      chorus.dispose()
    }
  }
}
