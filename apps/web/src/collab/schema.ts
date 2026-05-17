import * as Y from 'yjs'
import { nanoid } from 'nanoid'

export const PROJECT_KEY = 'project'
export const STEPS_PER_WHOLE_NOTE = 16
export const DEFAULT_LOOP_LENGTH_BARS = 2
export const MIN_LOOP_LENGTH_STEPS = 1
export const DEFAULT_BARS = 8
export const MAX_BARS = 256

export type TimeSignature = readonly [number, number]
export const DEFAULT_TIME_SIGNATURE: TimeSignature = [4, 4]

export const TIME_SIGNATURE_OPTIONS: TimeSignature[] = [
  [4, 4],
  [3, 4],
  [6, 8],
  [12, 8]
]

export const TRACK_COLORS = [
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899'
]

const CHROMA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const PITCHES: string[] = (() => {
  const out: string[] = []
  for (let oct = 2; oct <= 5; oct++) {
    for (const n of CHROMA) out.push(`${n}${oct}`)
  }
  out.push('C6')
  return out
})()

export type YProject = Y.Map<unknown>
export type YTrack = Y.Map<unknown>
export type YLoop = Y.Map<unknown>

export function getProjectMap(doc: Y.Doc): YProject {
  return doc.getMap(PROJECT_KEY)
}

export function getTracks(doc: Y.Doc): Y.Array<YTrack> {
  return doc.getArray<YTrack>('tracks')
}

export function getTrackLoops(track: YTrack): Y.Array<YLoop> {
  return track.get('loops') as Y.Array<YLoop>
}

export function getLoopNotes(loop: YLoop): Y.Map<boolean> {
  return loop.get('notes') as Y.Map<boolean>
}

export function getLoopPitches(loop: YLoop): Y.Map<string> {
  return loop.get('pitches') as Y.Map<string>
}

export function getLoopStartStep(loop: YLoop): number {
  return (loop.get('startStep') as number) ?? 0
}

export function getLoopLengthSteps(loop: YLoop): number {
  return (loop.get('lengthSteps') as number) ?? (DEFAULT_LOOP_LENGTH_BARS * STEPS_PER_WHOLE_NOTE)
}

export function getNoteActive(loop: YLoop, index: number): boolean {
  const m = getLoopNotes(loop)
  if (!m) return false
  return (m.get(String(index)) as boolean | undefined) ?? false
}

export function getNotePitch(loop: YLoop, index: number): string {
  const m = getLoopPitches(loop)
  if (!m) return 'C4'
  return (m.get(String(index)) as string | undefined) ?? 'C4'
}

export function getBars(doc: Y.Doc): number {
  return (getProjectMap(doc).get('bars') as number) ?? DEFAULT_BARS
}

export function getTimeSignature(doc: Y.Doc): TimeSignature {
  const raw = getProjectMap(doc).get('timeSignature') as
    | { 0?: number; 1?: number }
    | number[]
    | undefined
  if (Array.isArray(raw) && raw.length === 2 && typeof raw[0] === 'number' && typeof raw[1] === 'number') {
    return [raw[0], raw[1]]
  }
  return DEFAULT_TIME_SIGNATURE
}

export function setTimeSignature(doc: Y.Doc, ts: TimeSignature) {
  const [n, d] = ts
  if (!Number.isFinite(n) || !Number.isFinite(d) || n <= 0 || d <= 0) return
  getProjectMap(doc).set('timeSignature', [n, d])
}

export function stepsPerBarFor(ts: TimeSignature): number {
  const [n, d] = ts
  return Math.round(n * (STEPS_PER_WHOLE_NOTE / d))
}

export function stepsPerBeatFor(ts: TimeSignature): number {
  const [n, d] = ts
  const isCompound = d === 8 && n >= 6 && n % 3 === 0
  return isCompound ? 6 : Math.round(STEPS_PER_WHOLE_NOTE / d)
}

export function getStepsPerBar(doc: Y.Doc): number {
  return stepsPerBarFor(getTimeSignature(doc))
}

export function getStepsPerBeat(doc: Y.Doc): number {
  return stepsPerBeatFor(getTimeSignature(doc))
}

// How many cells the loop-edit grid shows per row. Chosen so each row maps to
// a natural musical chunk (half-bar in 4/4, one compound pulse in 6/8 and 12/8)
// and stepsPerBar is always a clean multiple of the per-row count.
export function noteGridColsFor(ts: TimeSignature): number {
  const [n, d] = ts
  if (d === 4 && n === 4) return 8
  return 6
}

export function getNoteGridCols(doc: Y.Doc): number {
  return noteGridColsFor(getTimeSignature(doc))
}

export function getSongSteps(doc: Y.Doc): number {
  return getBars(doc) * getStepsPerBar(doc)
}

// Bars of empty trailing space kept beyond the last filled step so the lane
// always exposes clickable grid for adding a new loop after the song ends.
const TRAILING_PADDING_BARS = 2

function ensureBarsForSteps(doc: Y.Doc, neededSteps: number) {
  const stepsPerBar = getStepsPerBar(doc)
  if (stepsPerBar <= 0 || neededSteps <= 0) return
  const project = getProjectMap(doc)
  const currentBars = (project.get('bars') as number) ?? DEFAULT_BARS
  const wantBars = Math.min(
    MAX_BARS,
    Math.ceil(neededSteps / stepsPerBar) + TRAILING_PADDING_BARS
  )
  if (wantBars > currentBars) project.set('bars', wantBars)
}

// Spacing between consecutive track orderKeys. Large enough that drag-and-drop
// reorders can keep midpoint-averaging the key for a long time before bumping
// into floating-point granularity issues.
export const TRACK_ORDER_GAP = 100

export function initProject(doc: Y.Doc) {
  const project = getProjectMap(doc)
  const tracks = getTracks(doc)
  doc.transact(() => {
    if (project.get('bpm') === undefined) project.set('bpm', 120)
    if (project.get('isPlaying') === undefined) project.set('isPlaying', false)
    if (project.get('bars') === undefined) project.set('bars', DEFAULT_BARS)
    if (project.get('title') === undefined) project.set('title', 'Untitled')
    if (project.get('loopSong') === undefined) project.set('loopSong', true)
    if (project.get('timeSignature') === undefined)
      project.set('timeSignature', [DEFAULT_TIME_SIGNATURE[0], DEFAULT_TIME_SIGNATURE[1]])
    if (tracks.length === 0) {
      const track = new Y.Map<unknown>()
      track.set('id', nanoid(8))
      track.set('name', 'Track 1')
      track.set('color', TRACK_COLORS[0])
      track.set('orderKey', TRACK_ORDER_GAP)
      track.set('loops', new Y.Array<YLoop>())
      tracks.push([track])
    } else {
      // Backfill orderKey on legacy tracks so sorted rendering is always
      // well-defined. Preserve current array order by giving them keys
      // matching their current position.
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks.get(i)
        if (typeof t.get('orderKey') !== 'number') {
          t.set('orderKey', (i + 1) * TRACK_ORDER_GAP)
        }
      }
    }
  })
}

export function getTitle(doc: Y.Doc): string {
  return (getProjectMap(doc).get('title') as string) ?? 'Untitled'
}

export function setTitle(doc: Y.Doc, title: string) {
  getProjectMap(doc).set('title', title)
}

export function getLoopSong(doc: Y.Doc): boolean {
  return (getProjectMap(doc).get('loopSong') as boolean) ?? true
}

export function setLoopSong(doc: Y.Doc, value: boolean) {
  getProjectMap(doc).set('loopSong', value)
}

export function getPlayPaused(doc: Y.Doc): boolean {
  return (getProjectMap(doc).get('playPaused') as boolean) ?? false
}

export function setPlayPaused(doc: Y.Doc, value: boolean) {
  getProjectMap(doc).set('playPaused', value)
}

export function getPlayStart(doc: Y.Doc): number | null {
  const v = getProjectMap(doc).get('playStart')
  return typeof v === 'number' ? v : null
}

export function getPlayEnd(doc: Y.Doc): number | null {
  const v = getProjectMap(doc).get('playEnd')
  return typeof v === 'number' ? v : null
}

export function setPlayStart(doc: Y.Doc, step: number | null) {
  const project = getProjectMap(doc)
  if (step === null) project.delete('playStart')
  else project.set('playStart', Math.max(0, Math.round(step)))
}

export function setPlayEnd(doc: Y.Doc, step: number | null) {
  const project = getProjectMap(doc)
  if (step === null) project.delete('playEnd')
  else project.set('playEnd', Math.max(1, Math.round(step)))
}

export function setPlayRange(doc: Y.Doc, start: number | null, end: number | null) {
  doc.transact(() => {
    setPlayStart(doc, start)
    setPlayEnd(doc, end)
  })
}

export function hasExplicitPlayRange(doc: Y.Doc): boolean {
  const project = getProjectMap(doc)
  return project.has('playStart') || project.has('playEnd')
}

export function getEffectivePlayRange(doc: Y.Doc): { start: number; end: number } {
  const explicitStart = getPlayStart(doc)
  const explicitEnd = getPlayEnd(doc)
  const songEnd = getSongEndSteps(doc)
  const start = explicitStart !== null ? explicitStart : 0
  let end = explicitEnd !== null ? explicitEnd : songEnd
  if (end <= start) {
    // Degenerate (e.g. nothing in the song yet, or both clamped to 0):
    // fall back to a non-zero window so downstream loopEnd math is safe.
    end = Math.max(songEnd, start + 1)
  }
  return { start, end }
}

export function getSongEndSteps(doc: Y.Doc): number {
  const tracks = getTracks(doc)
  let end = 0
  for (let i = 0; i < tracks.length; i++) {
    const loops = getTrackLoops(tracks.get(i))
    for (let j = 0; j < loops.length; j++) {
      const l = loops.get(j)
      const start = getLoopStartStep(l)
      const len = getLoopLengthSteps(l)
      const e = start + len
      if (e > end) end = e
    }
  }
  return end
}

export function getSongEndBars(doc: Y.Doc): number {
  const spb = getStepsPerBar(doc)
  return spb > 0 ? getSongEndSteps(doc) / spb : 0
}

export function getBpm(doc: Y.Doc): number {
  return (getProjectMap(doc).get('bpm') as number) ?? 120
}

export function setBpm(doc: Y.Doc, bpm: number) {
  getProjectMap(doc).set('bpm', Math.max(20, Math.min(300, Math.round(bpm))))
}

export function getIsPlaying(doc: Y.Doc): boolean {
  return (getProjectMap(doc).get('isPlaying') as boolean) ?? false
}

export function setIsPlaying(doc: Y.Doc, playing: boolean) {
  getProjectMap(doc).set('isPlaying', playing)
}

export function findTrack(doc: Y.Doc, trackId: string): YTrack | undefined {
  const tracks = getTracks(doc)
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks.get(i)
    if ((t.get('id') as string) === trackId) return t
  }
  return undefined
}

export function findLoop(doc: Y.Doc, trackId: string, loopId: string): YLoop | undefined {
  const track = findTrack(doc, trackId)
  if (!track) return undefined
  const loops = getTrackLoops(track)
  for (let i = 0; i < loops.length; i++) {
    const l = loops.get(i)
    if ((l.get('id') as string) === loopId) return l
  }
  return undefined
}

export function addTrack(doc: Y.Doc): string {
  const tracks = getTracks(doc)
  const id = nanoid(8)
  doc.transact(() => {
    const track = new Y.Map<unknown>()
    track.set('id', id)
    track.set('name', `Track ${tracks.length + 1}`)
    track.set('color', TRACK_COLORS[tracks.length % TRACK_COLORS.length])
    track.set('orderKey', nextTrackOrderKey(doc))
    track.set('loops', new Y.Array<YLoop>())
    tracks.push([track])
  })
  return id
}

function nextTrackOrderKey(doc: Y.Doc): number {
  const tracks = getTracks(doc)
  let max = 0
  for (let i = 0; i < tracks.length; i++) {
    const v = tracks.get(i).get('orderKey')
    if (typeof v === 'number' && v > max) max = v
  }
  return max + TRACK_ORDER_GAP
}

export function getTrackOrderKey(track: YTrack, fallback: number): number {
  const v = track.get('orderKey')
  return typeof v === 'number' ? v : fallback
}

// Returns tracks sorted by their orderKey. Tracks without an explicit key fall
// back to their array position (multiplied by the gap) so legacy projects keep
// a stable visual order until something writes an explicit key.
export function getSortedTracks(doc: Y.Doc): YTrack[] {
  const arr = getTracks(doc)
  const items: { t: YTrack; key: number; id: string }[] = []
  for (let i = 0; i < arr.length; i++) {
    const t = arr.get(i)
    items.push({
      t,
      key: getTrackOrderKey(t, (i + 1) * TRACK_ORDER_GAP),
      id: t.get('id') as string
    })
  }
  items.sort((a, b) => a.key - b.key || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return items.map((x) => x.t)
}

// Move `trackId` so that, in the new sorted order, it sits at the given index
// (0..N-1 within the post-move list — i.e. the count of OTHER tracks above it).
// Implemented by writing a new orderKey midway between its new neighbours; the
// underlying YArray is never reordered, which keeps YMap references — and the
// scheduler's per-track observers — stable across moves.
export function moveTrack(doc: Y.Doc, trackId: string, targetIndex: number) {
  const sorted = getSortedTracks(doc)
  const fromIndex = sorted.findIndex((t) => (t.get('id') as string) === trackId)
  if (fromIndex < 0) return

  const others = sorted.filter((_, i) => i !== fromIndex)
  const t = Math.max(0, Math.min(others.length, targetIndex))
  // No-op if dropping where it already is.
  if (t === fromIndex) return

  const fallbackKey = (track: YTrack) =>
    getTrackOrderKey(track, (sorted.indexOf(track) + 1) * TRACK_ORDER_GAP)
  const prev = t > 0 ? others[t - 1] : null
  const next = t < others.length ? others[t] : null
  const prevK = prev ? fallbackKey(prev) : null
  const nextK = next ? fallbackKey(next) : null

  let newKey: number
  if (prevK === null && nextK !== null) newKey = nextK - TRACK_ORDER_GAP
  else if (prevK !== null && nextK === null) newKey = prevK + TRACK_ORDER_GAP
  else if (prevK !== null && nextK !== null) newKey = (prevK + nextK) / 2
  else newKey = TRACK_ORDER_GAP

  doc.transact(() => {
    sorted[fromIndex].set('orderKey', newKey)
  })
}

export function setTrackName(doc: Y.Doc, trackId: string, name: string) {
  const track = findTrack(doc, trackId)
  track?.set('name', name)
}

export function getTrackMuted(track: YTrack): boolean {
  return (track.get('muted') as boolean) ?? false
}

export function setTrackMuted(doc: Y.Doc, trackId: string, muted: boolean) {
  const track = findTrack(doc, trackId)
  track?.set('muted', muted)
}

export function getTrackSolo(track: YTrack): boolean {
  return (track.get('solo') as boolean) ?? false
}

export function setTrackSolo(doc: Y.Doc, trackId: string, solo: boolean) {
  const track = findTrack(doc, trackId)
  track?.set('solo', solo)
}

export const DEFAULT_TRACK_VOLUME = 50

export function getTrackVolume(track: YTrack): number {
  const v = track.get('volume')
  return typeof v === 'number' ? v : DEFAULT_TRACK_VOLUME
}

export function setTrackVolume(doc: Y.Doc, trackId: string, volume: number) {
  const track = findTrack(doc, trackId)
  if (!track) return
  track.set('volume', Math.max(0, Math.min(100, volume)))
}

export function removeTrack(doc: Y.Doc, trackId: string) {
  const tracks = getTracks(doc)
  for (let i = 0; i < tracks.length; i++) {
    if ((tracks.get(i).get('id') as string) === trackId) {
      tracks.delete(i, 1)
      return
    }
  }
}

export function addLoop(doc: Y.Doc, trackId: string, startStep: number): string | null {
  const track = findTrack(doc, trackId)
  if (!track) return null
  const loops = getTrackLoops(track)
  const id = nanoid(8)
  const length = DEFAULT_LOOP_LENGTH_BARS * getStepsPerBar(doc)
  const start = Math.max(0, Math.round(startStep))
  doc.transact(() => {
    const loop = new Y.Map<unknown>()
    loop.set('id', id)
    loop.set('startStep', start)
    loop.set('lengthSteps', length)
    loop.set('instrumentId', 'square')
    const notes = new Y.Map<boolean>()
    const pitches = new Y.Map<string>()
    for (let i = 0; i < length; i++) {
      notes.set(String(i), false)
      pitches.set(String(i), 'C4')
    }
    loop.set('notes', notes)
    loop.set('pitches', pitches)
    loops.push([loop])
    ensureBarsForSteps(doc, start + length)
  })
  return id
}

export function removeLoop(doc: Y.Doc, trackId: string, loopId: string) {
  const track = findTrack(doc, trackId)
  if (!track) return
  const loops = getTrackLoops(track)
  for (let i = 0; i < loops.length; i++) {
    if ((loops.get(i).get('id') as string) === loopId) {
      loops.delete(i, 1)
      return
    }
  }
}

export function duplicateLoop(doc: Y.Doc, trackId: string, loopId: string): string | null {
  const track = findTrack(doc, trackId)
  if (!track) return null
  const loops = getTrackLoops(track)
  let source: YLoop | undefined
  for (let i = 0; i < loops.length; i++) {
    const l = loops.get(i)
    if ((l.get('id') as string) === loopId) {
      source = l
      break
    }
  }
  if (!source) return null

  const sourceStart = getLoopStartStep(source)
  const sourceLength = getLoopLengthSteps(source)
  const stepsPerBar = getStepsPerBar(doc)
  const maxStartSteps = Math.max(0, MAX_BARS * stepsPerBar - sourceLength)
  const proposed = sourceStart + sourceLength
  const clamped = Math.max(0, Math.min(proposed, maxStartSteps))

  const id = nanoid(8)
  doc.transact(() => {
    const copy = new Y.Map<unknown>()
    copy.set('id', id)
    copy.set('startStep', clamped)
    copy.set('lengthSteps', sourceLength)
    copy.set('instrumentId', (source.get('instrumentId') as string) ?? 'square')
    if (source.get('pulseWidth') !== undefined) {
      copy.set('pulseWidth', source.get('pulseWidth'))
    }
    const sourceNotes = source.get('notes') as Y.Map<boolean> | undefined
    const sourcePitches = source.get('pitches') as Y.Map<string> | undefined
    const notes = new Y.Map<boolean>()
    const pitches = new Y.Map<string>()
    for (let i = 0; i < sourceLength; i++) {
      const key = String(i)
      notes.set(key, ((sourceNotes?.get(key) as boolean | undefined) ?? false))
      pitches.set(key, ((sourcePitches?.get(key) as string | undefined) ?? 'C4'))
    }
    copy.set('notes', notes)
    copy.set('pitches', pitches)
    loops.push([copy])
    ensureBarsForSteps(doc, clamped + sourceLength)
  })
  return id
}

export function moveLoop(doc: Y.Doc, trackId: string, loopId: string, startStep: number) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const stepsPerBar = getStepsPerBar(doc)
  const length = getLoopLengthSteps(loop)
  const max = Math.max(0, MAX_BARS * stepsPerBar - length)
  const start = Math.max(0, Math.min(max, Math.round(startStep)))
  doc.transact(() => {
    loop.set('startStep', start)
    ensureBarsForSteps(doc, start + length)
  })
}

// Move a loop from one track's loops array to another. Yjs YMaps can't be
// moved between containers, so we deep-clone the source, insert the clone in
// the target, and delete the original. The clone keeps the same `id`, which
// lets selection/scheduler keying continue to work — the scheduler simply
// disposes the source-track runner and builds a fresh one in the target.
export function moveLoopToTrack(
  doc: Y.Doc,
  fromTrackId: string,
  toTrackId: string,
  loopId: string,
  newStartStep: number
) {
  if (fromTrackId === toTrackId) {
    moveLoop(doc, fromTrackId, loopId, newStartStep)
    return
  }
  const fromTrack = findTrack(doc, fromTrackId)
  const toTrack = findTrack(doc, toTrackId)
  if (!fromTrack || !toTrack) return
  const fromLoops = getTrackLoops(fromTrack)
  let fromIdx = -1
  let source: YLoop | undefined
  for (let i = 0; i < fromLoops.length; i++) {
    const l = fromLoops.get(i)
    if ((l.get('id') as string) === loopId) {
      fromIdx = i
      source = l
      break
    }
  }
  if (!source || fromIdx < 0) return

  const stepsPerBar = getStepsPerBar(doc)
  const length = getLoopLengthSteps(source)
  const maxStart = Math.max(0, MAX_BARS * stepsPerBar - length)
  const start = Math.max(0, Math.min(maxStart, Math.round(newStartStep)))
  const toLoops = getTrackLoops(toTrack)

  doc.transact(() => {
    const cloned = source!.clone() as YLoop
    cloned.set('startStep', start)
    fromLoops.delete(fromIdx, 1)
    toLoops.push([cloned])
    ensureBarsForSteps(doc, start + length)
  })
}

export function resizeLoopRight(
  doc: Y.Doc,
  trackId: string,
  loopId: string,
  newLengthSteps: number
) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const stepsPerBar = getStepsPerBar(doc)
  const startStep = getLoopStartStep(loop)
  const oldLength = getLoopLengthSteps(loop)
  const maxLength = Math.max(MIN_LOOP_LENGTH_STEPS, MAX_BARS * stepsPerBar - startStep)
  const length = Math.max(MIN_LOOP_LENGTH_STEPS, Math.min(maxLength, Math.round(newLengthSteps)))
  if (length === oldLength) return

  doc.transact(() => {
    loop.set('lengthSteps', length)
    const notes = getLoopNotes(loop)
    const pitches = getLoopPitches(loop)
    if (length > oldLength) {
      for (let i = oldLength; i < length; i++) {
        notes.set(String(i), false)
        pitches.set(String(i), 'C4')
      }
    } else {
      for (let i = length; i < oldLength; i++) {
        notes.delete(String(i))
        pitches.delete(String(i))
      }
    }
    ensureBarsForSteps(doc, startStep + length)
  })
}

export function resizeLoopLeft(
  doc: Y.Doc,
  trackId: string,
  loopId: string,
  newStartStep: number
) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const oldStart = getLoopStartStep(loop)
  const oldLength = getLoopLengthSteps(loop)
  const rightEdge = oldStart + oldLength
  const minStart = 0
  const maxStart = rightEdge - MIN_LOOP_LENGTH_STEPS
  const start = Math.max(minStart, Math.min(maxStart, Math.round(newStartStep)))
  if (start === oldStart) return

  const newLength = rightEdge - start
  const delta = start - oldStart // positive: shrunk from left; negative: grown from left

  doc.transact(() => {
    const notes = getLoopNotes(loop)
    const pitches = getLoopPitches(loop)

    if (delta > 0) {
      // shrinking: drop the first `delta` notes; shift indices [delta..oldLength-1] -> [0..newLength-1]
      const movedNotes: boolean[] = []
      const movedPitches: string[] = []
      for (let i = delta; i < oldLength; i++) {
        movedNotes.push(((notes.get(String(i)) as boolean | undefined) ?? false))
        movedPitches.push(((pitches.get(String(i)) as string | undefined) ?? 'C4'))
      }
      for (let i = 0; i < oldLength; i++) {
        notes.delete(String(i))
        pitches.delete(String(i))
      }
      for (let i = 0; i < movedNotes.length; i++) {
        notes.set(String(i), movedNotes[i])
        pitches.set(String(i), movedPitches[i])
      }
    } else {
      // growing: prepend (-delta) empty notes; shift existing [0..oldLength-1] -> [-delta..newLength-1]
      const shift = -delta
      const movedNotes: boolean[] = []
      const movedPitches: string[] = []
      for (let i = 0; i < oldLength; i++) {
        movedNotes.push(((notes.get(String(i)) as boolean | undefined) ?? false))
        movedPitches.push(((pitches.get(String(i)) as string | undefined) ?? 'C4'))
      }
      for (let i = 0; i < oldLength; i++) {
        notes.delete(String(i))
        pitches.delete(String(i))
      }
      for (let i = 0; i < shift; i++) {
        notes.set(String(i), false)
        pitches.set(String(i), 'C4')
      }
      for (let i = 0; i < movedNotes.length; i++) {
        notes.set(String(shift + i), movedNotes[i])
        pitches.set(String(shift + i), movedPitches[i])
      }
    }

    loop.set('startStep', start)
    loop.set('lengthSteps', newLength)
  })
}

export function setLoopInstrument(doc: Y.Doc, trackId: string, loopId: string, instrumentId: string) {
  const loop = findLoop(doc, trackId, loopId)
  loop?.set('instrumentId', instrumentId)
}

export const DEFAULT_PULSE_WIDTH = 0.25

export function getLoopPulseWidth(loop: YLoop): number {
  return (loop.get('pulseWidth') as number) ?? DEFAULT_PULSE_WIDTH
}

export function setLoopPulseWidth(doc: Y.Doc, trackId: string, loopId: string, width: number) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  loop.set('pulseWidth', Math.max(0.05, Math.min(0.95, width)))
}

export function toggleNote(doc: Y.Doc, trackId: string, loopId: string, index: number) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  if (index < 0 || index >= getLoopLengthSteps(loop)) return
  const notes = getLoopNotes(loop)
  if (!notes) return
  const key = String(index)
  notes.set(key, !((notes.get(key) as boolean | undefined) ?? false))
}

export function clearLoopNotes(doc: Y.Doc, trackId: string, loopId: string) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const notes = getLoopNotes(loop)
  if (!notes) return
  const length = getLoopLengthSteps(loop)
  doc.transact(() => {
    for (let i = 0; i < length; i++) {
      notes.set(String(i), false)
    }
  })
}

export const DEFAULT_LOOP_VOLUME = 50

export function getLoopVolume(loop: YLoop): number {
  const v = loop.get('volume')
  return typeof v === 'number' ? v : DEFAULT_LOOP_VOLUME
}

export function setLoopVolume(doc: Y.Doc, trackId: string, loopId: string, volume: number) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  loop.set('volume', Math.max(0, Math.min(100, volume)))
}

export function setNotePitch(doc: Y.Doc, trackId: string, loopId: string, index: number, pitch: string) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  if (index < 0 || index >= getLoopLengthSteps(loop)) return
  const pitches = getLoopPitches(loop)
  if (!pitches) return
  pitches.set(String(index), pitch)
}

export function setNote(
  doc: Y.Doc,
  trackId: string,
  loopId: string,
  index: number,
  active: boolean,
  pitch?: string
) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  if (index < 0 || index >= getLoopLengthSteps(loop)) return
  const notes = getLoopNotes(loop)
  const pitches = getLoopPitches(loop)
  if (!notes) return
  doc.transact(() => {
    notes.set(String(index), active)
    if (active && pitch !== undefined && pitches) pitches.set(String(index), pitch)
  })
}

export function moveNote(
  doc: Y.Doc,
  trackId: string,
  loopId: string,
  fromIndex: number,
  toIndex: number,
  pitchOverride?: string
) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const length = getLoopLengthSteps(loop)
  if (fromIndex < 0 || fromIndex >= length) return
  if (toIndex < 0 || toIndex >= length) return
  if (fromIndex === toIndex && pitchOverride === undefined) return
  const notes = getLoopNotes(loop)
  const pitches = getLoopPitches(loop)
  if (!notes) return
  const fromKey = String(fromIndex)
  const toKey = String(toIndex)
  const movingPitch = pitchOverride ?? ((pitches?.get(fromKey) as string | undefined) ?? 'C4')
  doc.transact(() => {
    if (fromIndex !== toIndex) {
      notes.set(fromKey, false)
    }
    notes.set(toKey, true)
    if (pitches) pitches.set(toKey, movingPitch)
  })
}
