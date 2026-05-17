import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

export const hihat: InstrumentFactory = (params, output) => {
  const dest = output ?? Tone.getDestination()
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
  }).connect(dest)
  // MetalSynth high-band content is perceived quiet at low gain — keep this
  // moderate so closed/open hats sit on top of the kit rather than vanish.
  synth.volume.value = -10

  return {
    trigger: (time) => synth.triggerAttackRelease('C5', '32n', time, 0.9),
    dispose: () => synth.dispose()
  }
}
