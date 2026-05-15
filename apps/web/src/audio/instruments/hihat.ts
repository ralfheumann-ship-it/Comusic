import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const hihat: InstrumentFactory = (params) => {
  const open = (params?.open as boolean) ?? false
  const synth = new Tone.MetalSynth({
    envelope: {
      attack: 0.001,
      decay: open ? 0.4 : 0.05,
      release: open ? 0.3 : 0.02
    },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5
  }).toDestination()
  synth.volume.value = -22

  return {
    trigger: (time) => synth.triggerAttackRelease('C5', '32n', time, 0.5),
    dispose: () => synth.dispose()
  }
}
