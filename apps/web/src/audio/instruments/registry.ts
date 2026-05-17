import type * as Tone from 'tone'

export interface Instrument {
  trigger: (time: number, pitch: string) => void
  dispose: () => void
}

// `output` lets the caller route this instrument through their own audio node
// (e.g. a per-loop Tone.Volume). Factories must connect their final stage to
// `output` when provided, falling back to Tone.getDestination() otherwise.
export type InstrumentFactory = (
  params?: Record<string, unknown>,
  output?: Tone.ToneAudioNode
) => Instrument

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
import { piano } from './piano'
import { acousticGuitar } from './acoustic-guitar'
import { electricGuitar } from './electric-guitar'
import { overdriveGuitar } from './overdrive-guitar'
import { subBass } from './sub-bass'
import { fmBass } from './fm-bass'
import { acidBass } from './acid-bass'
import { bassGuitar } from './bass-guitar'
import { noise } from './noise'
import { kick } from './kick'
import { kick808 } from './kick-808'
import { snare } from './snare'
import { rimShot } from './rim-shot'
import { clap } from './clap'
import { tomLow } from './tom-low'
import { tomMid } from './tom-mid'
import { tomHigh } from './tom-high'
import { conga } from './conga'
import { hihat } from './hihat'
import { ride } from './ride'
import { shaker } from './shaker'
import { tambourine } from './tambourine'
import { cowbell } from './cowbell'
import { crash } from './crash'

interface InstrumentMeta {
  factory: InstrumentFactory
  pitched: boolean
  label: string
}

const wrap =
  (factory: InstrumentFactory, extra: Record<string, unknown>): InstrumentFactory =>
  (params, output) =>
    factory({ ...extra, ...(params ?? {}) }, output)

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
  piano: { factory: piano, pitched: true, label: 'Piano' },
  'acoustic-guitar': { factory: acousticGuitar, pitched: true, label: 'Acoustic guitar' },
  'electric-guitar': { factory: electricGuitar, pitched: true, label: 'Electric guitar' },
  'overdrive-guitar': {
    factory: overdriveGuitar,
    pitched: true,
    label: 'Overdrive guitar'
  },
  'sub-bass': { factory: subBass, pitched: true, label: 'Sub bass' },
  'fm-bass': { factory: fmBass, pitched: true, label: 'FM bass' },
  'acid-bass': { factory: acidBass, pitched: true, label: 'Acid bass' },
  'bass-guitar': { factory: bassGuitar, pitched: true, label: 'Bass guitar' },
  kick: { factory: kick, pitched: false, label: 'Kick' },
  'kick-808': { factory: kick808, pitched: false, label: 'Kick 808 (sub)' },
  snare: { factory: snare, pitched: false, label: 'Snare' },
  'rim-shot': { factory: rimShot, pitched: false, label: 'Rim shot' },
  clap: { factory: clap, pitched: false, label: 'Clap' },
  'tom-low': { factory: tomLow, pitched: false, label: 'Tom (low)' },
  'tom-mid': { factory: tomMid, pitched: false, label: 'Tom (mid)' },
  'tom-high': { factory: tomHigh, pitched: false, label: 'Tom (high)' },
  conga: { factory: conga, pitched: false, label: 'Conga' },
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
  ride: { factory: ride, pitched: false, label: 'Ride' },
  shaker: { factory: shaker, pitched: false, label: 'Shaker' },
  tambourine: { factory: tambourine, pitched: false, label: 'Tambourine' },
  cowbell: { factory: cowbell, pitched: true, label: 'Cowbell' },
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
