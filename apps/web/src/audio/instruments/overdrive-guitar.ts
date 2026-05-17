import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Overdriven lead/rhythm guitar: a sustaining sawtooth MonoSynth pushed through
// a heavy Distortion stage, with a lowpass before the dist to tame the fizz.
// Source level is kept very quiet because Distortion adds significant perceived
// loudness on top — the goal is bite, not blast.
export const overdriveGuitar: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const dist = new Tone.Distortion({ distortion: 0.65, wet: 0.8 }).connect(dest)
  const post = new Tone.Filter({ type: 'lowpass', frequency: 3200, Q: 0.7 }).connect(dist)
  const synth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.65, release: 0.4 },
    filter: { type: 'lowpass', Q: 1.5 },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0.7,
      release: 0.4,
      baseFrequency: 800,
      octaves: 2.5
    }
  }).connect(post)
  synth.volume.value = -18

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '4n', time, 0.8),
    dispose: () => {
      synth.dispose()
      post.dispose()
      dist.dispose()
    }
  }
}
