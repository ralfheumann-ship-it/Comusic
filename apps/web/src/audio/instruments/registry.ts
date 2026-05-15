export interface Instrument {
  trigger: (time: number, pitch: string) => void
  dispose: () => void
}

export type InstrumentFactory = (params?: Record<string, unknown>) => Instrument

import { square } from './square'
import { triangle } from './triangle'
import { saw } from './saw'
import { pulse } from './pulse'
import { pluck } from './pluck'
import { noise } from './noise'
import { kick } from './kick'
import { snare } from './snare'
import { hihat } from './hihat'

interface InstrumentMeta {
  factory: InstrumentFactory
  pitched: boolean
  label: string
}

const wrap =
  (factory: InstrumentFactory, extra: Record<string, unknown>): InstrumentFactory =>
  (params) =>
    factory({ ...extra, ...(params ?? {}) })

const instruments: Record<string, InstrumentMeta> = {
  square: { factory: square, pitched: true, label: 'Square' },
  triangle: { factory: triangle, pitched: true, label: 'Triangle' },
  saw: { factory: saw, pitched: true, label: 'Saw' },
  pulse: { factory: pulse, pitched: true, label: 'Pulse' },
  pluck: { factory: pluck, pitched: true, label: 'Pluck' },
  kick: { factory: kick, pitched: false, label: 'Kick' },
  snare: { factory: snare, pitched: false, label: 'Snare' },
  'hihat-closed': {
    factory: wrap(hihat, { open: false }),
    pitched: false,
    label: 'Hi-hat (closed)'
  },
  'hihat-open': {
    factory: wrap(hihat, { open: true }),
    pitched: false,
    label: 'Hi-hat (open)'
  },
  noise: { factory: noise, pitched: false, label: 'Noise' }
}

export function getInstrumentIds(): string[] {
  return Object.keys(instruments)
}

export function getInstrument(id: string): InstrumentFactory {
  return (instruments[id] ?? instruments.square).factory
}

export function isInstrumentPitched(id: string): boolean {
  return (instruments[id] ?? instruments.square).pitched
}

export function getInstrumentLabel(id: string): string {
  return instruments[id]?.label ?? id
}
