import * as Tone from 'tone'
import * as Y from 'yjs'
import {
  getTracks,
  getTrackLoops,
  getLoopNotes,
  getLoopPitches,
  getLoopPulseWidth,
  NOTES_PER_LOOP,
  type YLoop,
  type YTrack
} from '../collab/schema'
import { getInstrument, type Instrument } from './instruments/registry'
import { clearAllPlayheads, clearPlayheadStep, setPlayheadStep } from '../state/playhead'

interface LoopRunner {
  loopId: string
  loopMap: YLoop
  trackMap: YTrack
  notes: Y.Map<boolean>
  pitches: Y.Map<string>
  sequence: Tone.Sequence | null
  instrument: Instrument | null
  previewInstrument: Instrument | null
  previewLastTime: number
  observer: () => void
}

interface TrackRunner {
  trackId: string
  trackMap: YTrack
  loopsArr: Y.Array<YLoop>
  runners: Map<string, LoopRunner>
  observer: () => void
}

let trackRunners: Map<string, TrackRunner> = new Map()
let tracksArr: Y.Array<YTrack> | null = null
let tracksObserver: (() => void) | null = null
let doc: Y.Doc | null = null

const STEP_INDEXES = Array.from({ length: NOTES_PER_LOOP }, (_, i) => i)

function buildLoopRunner(loopMap: YLoop, trackMap: YTrack): LoopRunner {
  const runner: LoopRunner = {
    loopId: loopMap.get('id') as string,
    loopMap,
    trackMap,
    notes: getLoopNotes(loopMap),
    pitches: getLoopPitches(loopMap),
    sequence: null,
    instrument: null,
    previewInstrument: null,
    previewLastTime: 0,
    observer: () => rebuildSequence(runner)
  }
  loopMap.observe(runner.observer)
  rebuildSequence(runner)
  return runner
}

function rebuildSequence(runner: LoopRunner) {
  runner.sequence?.dispose()
  runner.instrument?.dispose()
  runner.previewInstrument?.dispose()

  const instrumentId = runner.loopMap.get('instrumentId') as string
  const startBar = (runner.loopMap.get('startBar') as number) ?? 0
  const factory = getInstrument(instrumentId)
  const params = { pulseWidth: getLoopPulseWidth(runner.loopMap) }

  runner.instrument = factory(params)
  runner.previewInstrument = factory(params)
  runner.previewLastTime = 0
  const notes = runner.notes
  const pitches = runner.pitches
  const loopId = runner.loopId
  const inst = runner.instrument

  const trackMap = runner.trackMap
  const loopMap = runner.loopMap

  runner.sequence = new Tone.Sequence(
    (time, index) => {
      const start = (loopMap.get('startBar') as number) ?? 0
      const length = (loopMap.get('lengthBars') as number) ?? 2
      const ticks = Tone.Transport.getTicksAtTime(time)
      const bars = ticks / Tone.Transport.PPQ / 4
      if (bars < start - 1e-6 || bars >= start + length - 1e-6) {
        Tone.Draw.schedule(() => clearPlayheadStep(loopId), time)
        return
      }

      const muted = (trackMap.get('muted') as boolean) ?? false
      if (!muted) {
        const key = String(index)
        const active = notes ? ((notes.get(key) as boolean | undefined) ?? false) : false
        if (active) {
          const p = pitches ? (pitches.get(key) as string | undefined) : undefined
          inst.trigger(time, p ?? 'C4')
        }
      }
      Tone.Draw.schedule(() => setPlayheadStep(loopId, index), time)
    },
    STEP_INDEXES,
    '16n'
  )
  runner.sequence.start(0)
}

function disposeLoopRunner(runner: LoopRunner) {
  runner.loopMap.unobserve(runner.observer)
  runner.sequence?.dispose()
  runner.instrument?.dispose()
  runner.previewInstrument?.dispose()
  clearPlayheadStep(runner.loopId)
}

function buildTrackRunner(trackMap: YTrack): TrackRunner {
  const trackId = trackMap.get('id') as string
  const loopsArr = getTrackLoops(trackMap)
  const runners = new Map<string, LoopRunner>()

  for (let i = 0; i < loopsArr.length; i++) {
    const lm = loopsArr.get(i)
    const r = buildLoopRunner(lm, trackMap)
    runners.set(r.loopId, r)
  }

  const tr: TrackRunner = {
    trackId,
    trackMap,
    loopsArr,
    runners,
    observer: () => syncTrackLoops(tr)
  }
  loopsArr.observe(tr.observer)
  return tr
}

function syncTrackLoops(tr: TrackRunner) {
  const present = new Set<string>()
  for (let i = 0; i < tr.loopsArr.length; i++) {
    const lm = tr.loopsArr.get(i)
    const id = lm.get('id') as string
    present.add(id)
    if (!tr.runners.has(id)) {
      tr.runners.set(id, buildLoopRunner(lm, tr.trackMap))
    }
  }
  for (const [id, runner] of tr.runners) {
    if (!present.has(id)) {
      disposeLoopRunner(runner)
      tr.runners.delete(id)
    }
  }
}

function disposeTrackRunner(tr: TrackRunner) {
  tr.loopsArr.unobserve(tr.observer)
  for (const r of tr.runners.values()) disposeLoopRunner(r)
  tr.runners.clear()
}

function syncTracks() {
  if (!tracksArr) return
  const present = new Set<string>()
  for (let i = 0; i < tracksArr.length; i++) {
    const tm = tracksArr.get(i)
    const id = tm.get('id') as string
    present.add(id)
    if (!trackRunners.has(id)) {
      trackRunners.set(id, buildTrackRunner(tm))
    }
  }
  for (const [id, tr] of trackRunners) {
    if (!present.has(id)) {
      disposeTrackRunner(tr)
      trackRunners.delete(id)
    }
  }
}

export function attachScheduler(d: Y.Doc) {
  detachScheduler()
  doc = d
  tracksArr = getTracks(d)
  tracksObserver = () => syncTracks()
  tracksArr.observe(tracksObserver)
  syncTracks()
}

export function previewNote(trackId: string, loopId: string, pitch: string) {
  const tr = trackRunners.get(trackId)
  const lr = tr?.runners.get(loopId)
  if (!lr?.previewInstrument) return
  const t = Math.max(Tone.now(), lr.previewLastTime + 0.005)
  lr.previewLastTime = t
  lr.previewInstrument.trigger(t, pitch)
}

export function detachScheduler() {
  if (tracksArr && tracksObserver) tracksArr.unobserve(tracksObserver)
  for (const tr of trackRunners.values()) disposeTrackRunner(tr)
  trackRunners.clear()
  tracksArr = null
  tracksObserver = null
  doc = null
  clearAllPlayheads()
}
