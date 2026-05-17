import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const triangle: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.4, release: 0.15 }
  }).connect(dest)
  synth.volume.value = -4

  return {
    trigger: (time, pitch) => synth.triggerAttackRelease(pitch, '8n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
