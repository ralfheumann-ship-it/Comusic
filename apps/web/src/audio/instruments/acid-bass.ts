import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// 303-style squelchy bass: sawtooth + resonant lowpass with filter envelope,
// fed through a touch of distortion for the classic acid bite.
export const acidBass: InstrumentFactory = () => {
  const distortion = new Tone.Distortion({ distortion: 0.3, wet: 0.4 }).toDestination()
  const synth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.15 },
    filter: { type: 'lowpass', Q: 6, rolloff: -24 },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.25,
      sustain: 0.1,
      release: 0.2,
      baseFrequency: 200,
      octaves: 4
    }
  }).connect(distortion)
  synth.volume.value = -8

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.9),
    dispose: () => {
      synth.dispose()
      distortion.dispose()
    }
  }
}
