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
import { lead } from './lead'
import { pad } from './pad'
import { fat } from './fat'
import { polySynth } from './poly-synth'
import { fm } from './fm'
import { subBass } from './sub-bass'
import { fmBass } from './fm-bass'
import { acidBass } from './acid-bass'
import { noise } from './noise'
import { kick } from './kick'
import { snare } from './snare'
import { clap } from './clap'
import { hihat } from './hihat'
import { cowbell } from './cowbell'
import { crash } from './crash'

interface InstrumentMeta {
  factory: InstrumentFactory
  pitched: boolean
  label: string
}

const wrap =
  (factory: InstrumentFactory, extra: Record<string, unknown>): InstrumentFactory =>
  (params) =>
    factory({ ...extra, ...(params ?? {}) })

// Order here is the order shown in the loop instrument dropdown.
// Grouped: melody/leads, basses, drums & percussion, noise.
const instruments: Record<string, InstrumentMeta> = {
  square: { factory: square, pitched: true, label: 'Square' },
  triangle: { factory: triangle, pitched: true, label: 'Triangle' },
  saw: { factory: saw, pitched: true, label: 'Saw' },
  pulse: { factory: pulse, pitched: true, label: 'Pulse' },
  pluck: { factory: pluck, pitched: true, label: 'Pluck' },
  lead: { factory: lead, pitched: true, label: 'Lead' },
  pad: { factory: pad, pitched: true, label: 'Pad' },
  fat: { factory: fat, pitched: true, label: 'Fat (super-saw)' },
  'poly-synth': { factory: polySynth, pitched: true, label: 'PolySynth' },
  fm: { factory: fm, pitched: true, label: 'FM bell' },
  'sub-bass': { factory: subBass, pitched: true, label: 'Sub bass' },
  'fm-bass': { factory: fmBass, pitched: true, label: 'FM bass' },
  'acid-bass': { factory: acidBass, pitched: true, label: 'Acid bass' },
  kick: { factory: kick, pitched: false, label: 'Kick' },
  snare: { factory: snare, pitched: false, label: 'Snare' },
  clap: { factory: clap, pitched: false, label: 'Clap' },
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
  cowbell: { factory: cowbell, pitched: false, label: 'Cowbell' },
  crash: { factory: crash, pitched: false, label: 'Crash' },
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
