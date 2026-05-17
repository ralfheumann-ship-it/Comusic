import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Ride cymbal: a MetalSynth tuned brighter and with longer sustain than the
// hi-hats, but tighter than the crash so repeated quarter-notes don't smear
// into a wash. Lower harmonicity than the crash gives a more focused "ping".
export const ride: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.2, release: 0.6 },
    harmonicity: 4.5,
    modulationIndex: 18,
    resonance: 5000,
    octaves: 1.5
  }).connect(dest)
  synth.volume.value = -14

  return {
    trigger: (time) => synth.triggerAttackRelease('C5', '4n', time, 0.7),
    dispose: () => synth.dispose()
  }
}
