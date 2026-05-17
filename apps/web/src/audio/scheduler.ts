import * as Tone from 'tone'
import * as Y from 'yjs'
import {
  getTracks,
  getTrackLoops,
  getLoopNotes,
  getLoopPitches,
  getLoopPulseWidth,
  getLoopStartStep,
  getLoopLengthSteps,
  getLoopVolume,
  type YLoop,
  type YTrack
} from '../collab/schema'
import { getInstrument, type Instrument } from './instruments/registry'
import { clearAllPlayheads, clearPlayheadStep, setPlayheadStep } from '../state/playhead'
import { getEffectiveMuteForTrack } from '../state/muteIntent'
import { pctToDb } from './volume'

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
  sequenceLength: number
  instrumentId: string
  pulseWidth: number
  volumeNode: Tone.Volume
  volumePct: number
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

function buildLoopRunner(loopMap: YLoop, trackMap: YTrack): LoopRunner {
  const initialVolume = getLoopVolume(loopMap)
  const volumeNode = new Tone.Volume(pctToDb(initialVolume)).toDestination()
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
    sequenceLength: 0,
    instrumentId: '',
    pulseWidth: NaN,
    volumeNode,
    volumePct: initialVolume,
    observer: () => onLoopChange(runner)
  }
  loopMap.observe(runner.observer)
  rebuildInstrument(runner)
  rebuildSequence(runner)
  return runner
}

function onLoopChange(runner: LoopRunner) {
  const instrumentId = runner.loopMap.get('instrumentId') as string
  const pulseWidth = getLoopPulseWidth(runner.loopMap)
  const length = getLoopLengthSteps(runner.loopMap)
  const volume = getLoopVolume(runner.loopMap)

  if (volume !== runner.volumePct) {
    runner.volumePct = volume
    runner.volumeNode.volume.value = pctToDb(volume)
  }
  if (instrumentId !== runner.instrumentId || pulseWidth !== runner.pulseWidth) {
    rebuildInstrument(runner)
  }
  if (length !== runner.sequenceLength) {
    rebuildSequence(runner)
  }
  // startStep changes are picked up dynamically inside the sequence callback —
  // no rebuild needed, which is important so we don't introduce audio glitches
  // when the user simply drags a loop along the timeline.
}

function rebuildInstrument(runner: LoopRunner) {
  runner.instrument?.dispose()
  runner.previewInstrument?.dispose()

  const instrumentId = runner.loopMap.get('instrumentId') as string
  const pulseWidth = getLoopPulseWidth(runner.loopMap)
  const factory = getInstrument(instrumentId)
  const params = { pulseWidth }

  runner.instrument = factory(params, runner.volumeNode)
  runner.previewInstrument = factory(params, runner.volumeNode)
  runner.previewLastTime = 0
  runner.instrumentId = instrumentId
  runner.pulseWidth = pulseWidth
}

function rebuildSequence(runner: LoopRunner) {
  runner.sequence?.dispose()

  const loopId = runner.loopId
  const trackMap = runner.trackMap
  const loopMap = runner.loopMap

  const length = Math.max(1, getLoopLengthSteps(loopMap))
  runner.sequenceLength = length
  const stepIndexes = Array.from({ length }, (_, i) => i)

  runner.sequence = new Tone.Sequence(
    (time) => {
      const start = getLoopStartStep(loopMap)
      const len = getLoopLengthSteps(loopMap)
      const stepDurationTicks = Tone.Transport.PPQ / 4
      const ticks = Tone.Transport.getTicksAtTime(time)
      const songStep = Math.round(ticks / stepDurationTicks)
      const offset = songStep - start
      if (offset < 0 || offset >= len) {
        Tone.Draw.schedule(() => clearPlayheadStep(loopId), time)
        return
      }

      const muted = getEffectiveMuteForTrack(trackMap)
      if (!muted) {
        const key = String(offset)
        const active = runner.notes
          ? ((runner.notes.get(key) as boolean | undefined) ?? false)
          : false
        if (active && runner.instrument) {
          const p = runner.pitches
            ? (runner.pitches.get(key) as string | undefined)
            : undefined
          runner.instrument.trigger(time, p ?? 'C4')
        }
      }
      Tone.Draw.schedule(() => setPlayheadStep(loopId, offset), time)
    },
    stepIndexes,
    '16n'
  )
  runner.sequence.start(0)
}

function disposeLoopRunner(runner: LoopRunner) {
  runner.loopMap.unobserve(runner.observer)
  runner.sequence?.dispose()
  runner.instrument?.dispose()
  runner.previewInstrument?.dispose()
  runner.volumeNode.dispose()
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
