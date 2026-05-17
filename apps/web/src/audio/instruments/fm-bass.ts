import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Punchy, slightly metallic FM bass — the "groovy" pick.
export const fmBass: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.FMSynth({
    harmonicity: 1.5,
    modulationIndex: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.18, sustain: 0.4, release: 0.18 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
  }).connect(dest)
  synth.volume.value = -8

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.8),
    dispose: () => synth.dispose()
  }
}
