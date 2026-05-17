import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// General-purpose FMSynth — DX7-flavored bell/electric-piano tones.
// Higher harmonicity and modulationIndex than fm-bass gives a brighter
// metallic sustain rather than a punchy attack.
export const fm: InstrumentFactory = () => {
  const synth = new Tone.FMSynth({
    harmonicity: 3,
    modulationIndex: 10,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 1 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.5 }
  }).toDestination()
  synth.volume.value = -10

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
