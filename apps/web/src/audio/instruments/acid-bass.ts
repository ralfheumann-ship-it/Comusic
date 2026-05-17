import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// 303-style squelchy bass: sawtooth + resonant lowpass with filter envelope,
// fed through a touch of distortion for the classic acid bite.
export const acidBass: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const distortion = new Tone.Distortion({ distortion: 0.3, wet: 0.2 }).connect(dest)
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
  // Distortion adds substantial perceived loudness on top of the raw signal
  // — keep the source quiet so the squelch sits in the mix, not on top of it.
  synth.volume.value = -14

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.7),
    dispose: () => {
      synth.dispose()
      distortion.dispose()
    }
  }
}
