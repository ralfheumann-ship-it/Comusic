import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export const pulse: InstrumentFactory = (params) => {
  const width = clamp((params?.pulseWidth as number) ?? 0.25, 0.05, 0.95)
  const synth = new Tone.Synth({
    oscillator: { type: 'pulse', width } as Tone.OmniOscillatorOptions,
    envelope: { attack: 0.005, decay: 0.06, sustain: 0.3, release: 0.1 }
  }).toDestination()

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '16n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
