import * as Tone from 'tone'
import type { InstrumentFactory } from './registry'

// Classic 808 cowbell: two square oscillators at ~587 and ~845 Hz routed
// through an amplitude envelope and a bandpass for the tinny "knock" sound.
export const cowbell: InstrumentFactory = () => {
  const filter = new Tone.Filter({ type: 'bandpass', frequency: 700, Q: 2 }).toDestination()
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.001,
    decay: 0.3,
    sustain: 0,
    release: 0.1
  }).connect(filter)
  const osc1 = new Tone.Oscillator({ frequency: 587, type: 'square', volume: -10 }).connect(env)
  const osc2 = new Tone.Oscillator({ frequency: 845, type: 'square', volume: -10 }).connect(env)
  osc1.start()
  osc2.start()

  return {
    trigger: (time) => env.triggerAttackRelease(0.2, time, 0.7),
    dispose: () => {
      osc1.dispose()
      osc2.dispose()
      env.dispose()
      filter.dispose()
    }
  }
}
