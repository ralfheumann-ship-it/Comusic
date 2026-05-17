import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Classic 808 cowbell: two square oscillators in a fixed ratio routed through
// an amplitude envelope and a bandpass for the tinny "knock" sound. The
// original 808 used 587 / 845 Hz (ratio ≈ 1.44); here that ratio is preserved
// while the base pitch follows whatever the user plays.
const COWBELL_RATIO = 845 / 587

export const cowbell: InstrumentFactory = (_, output) => {
  const dest = output ?? Tone.getDestination()
  const filter = new Tone.Filter({ type: 'bandpass', frequency: 700, Q: 2 }).connect(dest)
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.001,
    decay: 0.3,
    sustain: 0,
    release: 0.1
  }).connect(filter)
  const osc1 = new Tone.Oscillator({ frequency: 587, type: 'square', volume: -6 }).connect(env)
  const osc2 = new Tone.Oscillator({ frequency: 845, type: 'square', volume: -6 }).connect(env)
  osc1.start()
  osc2.start()

  return {
    trigger: (time, pitch) => {
      const f = Tone.Frequency(pitch).toFrequency()
      osc1.frequency.setValueAtTime(f, time)
      osc2.frequency.setValueAtTime(f * COWBELL_RATIO, time)
      env.triggerAttackRelease(0.2, time, 0.7)
    },
    dispose: () => {
      osc1.dispose()
      osc2.dispose()
      env.dispose()
      filter.dispose()
    }
  }
}
