import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Punchy, slightly metallic FM bass — the "groovy" pick.
export const fmBass: InstrumentFactory = () => {
  const synth = new Tone.FMSynth({
    harmonicity: 1.5,
    modulationIndex: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.18, sustain: 0.4, release: 0.18 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
  }).toDestination()
  synth.volume.value = -6

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.85),
    dispose: () => synth.dispose()
  }
}
