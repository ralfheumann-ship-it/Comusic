import * as Tone from 'tone'
import { getInstrument, isInstrumentPitched, type Instrument } from './instruments/registry'

interface ActiveAudition {
  inst: Instrument
  timeoutId: number
}

let active: ActiveAudition | null = null
let lastTime = 0

export function auditionInstrument(id: string, params?: Record<string, unknown>) {
  if (active) {
    clearTimeout(active.timeoutId)
    active.inst.dispose()
    active = null
  }

  const inst = getInstrument(id)(params ?? {})
  const t = Math.max(Tone.now(), lastTime + 0.005)
  lastTime = t
  inst.trigger(t, isInstrumentPitched(id) ? 'C4' : 'C2')

  const timeoutId = window.setTimeout(() => {
    inst.dispose()
    if (active?.inst === inst) active = null
  }, 800)
  active = { inst, timeoutId }
}
