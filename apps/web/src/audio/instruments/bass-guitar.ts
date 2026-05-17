import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Fingerstyle bass guitar: triangle MonoSynth with a body-emphasising lowpass
// and a slight filter envelope sweep that mimics a plucked-string opening up.
// Distinct from sub-bass (round/dub) and acid-bass (squelchy) — this one is
// the everyday "rock/pop" bass tone.
export const bassGuitar: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const lowpass = new Tone.Filter({ type: 'lowpass', frequency: 1500, Q: 0.7 }).connect(dest)
  const synth = new Tone.MonoSynth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.35, sustain: 0.5, release: 0.3 },
    filter: { type: 'lowpass', Q: 1 },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.18,
      sustain: 0.4,
      release: 0.3,
      baseFrequency: 220,
      octaves: 3
    }
  }).connect(lowpass)
  synth.volume.value = -6

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.85),
    dispose: () => {
      synth.dispose()
      lowpass.dispose()
    }
  }
}
