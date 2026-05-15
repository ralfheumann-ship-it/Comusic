import * as Y from 'yjs'
import { nanoid } from 'nanoid'

export const PROJECT_KEY = 'project'
export const NOTES_PER_LOOP = 32
export const DEFAULT_LOOP_LENGTH_BARS = 2
export const DEFAULT_BARS = 8

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

export function initProject(doc: Y.Doc) {
  const project = getProjectMap(doc)
  doc.transact(() => {
    if (project.get('bpm') === undefined) project.set('bpm', 120)
    if (project.get('isPlaying') === undefined) project.set('isPlaying', false)
    if (project.get('bars') === undefined) project.set('bars', DEFAULT_BARS)
    if (project.get('title') === undefined) project.set('title', 'Untitled')
    if (project.get('loopSong') === undefined) project.set('loopSong', true)
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

export function getSongEndBars(doc: Y.Doc): number {
  const tracks = getTracks(doc)
  let end = 0
  for (let i = 0; i < tracks.length; i++) {
    const loops = getTrackLoops(tracks.get(i))
    for (let j = 0; j < loops.length; j++) {
      const l = loops.get(j)
      const start = (l.get('startBar') as number) ?? 0
      const len = (l.get('lengthBars') as number) ?? 0
      const e = start + len
      if (e > end) end = e
    }
  }
  return end
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
    track.set('loops', new Y.Array<YLoop>())
    tracks.push([track])
  })
  return id
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

export function removeTrack(doc: Y.Doc, trackId: string) {
  const tracks = getTracks(doc)
  for (let i = 0; i < tracks.length; i++) {
    if ((tracks.get(i).get('id') as string) === trackId) {
      tracks.delete(i, 1)
      return
    }
  }
}

export function addLoop(doc: Y.Doc, trackId: string, startBar: number): string | null {
  const track = findTrack(doc, trackId)
  if (!track) return null
  const loops = getTrackLoops(track)
  const id = nanoid(8)
  doc.transact(() => {
    const loop = new Y.Map<unknown>()
    loop.set('id', id)
    loop.set('startBar', Math.max(0, Math.round(startBar)))
    loop.set('lengthBars', DEFAULT_LOOP_LENGTH_BARS)
    loop.set('instrumentId', 'square')
    const notes = new Y.Map<boolean>()
    const pitches = new Y.Map<string>()
    for (let i = 0; i < NOTES_PER_LOOP; i++) {
      notes.set(String(i), false)
      pitches.set(String(i), 'C4')
    }
    loop.set('notes', notes)
    loop.set('pitches', pitches)
    loops.push([loop])
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

  const sourceStart = (source.get('startBar') as number) ?? 0
  const sourceLength = (source.get('lengthBars') as number) ?? DEFAULT_LOOP_LENGTH_BARS
  const totalBars = getBars(doc)
  const proposed = sourceStart + sourceLength
  const clamped = Math.max(0, Math.min(proposed, Math.max(0, totalBars - sourceLength)))

  const id = nanoid(8)
  doc.transact(() => {
    const copy = new Y.Map<unknown>()
    copy.set('id', id)
    copy.set('startBar', clamped)
    copy.set('lengthBars', sourceLength)
    copy.set('instrumentId', (source.get('instrumentId') as string) ?? 'square')
    if (source.get('pulseWidth') !== undefined) {
      copy.set('pulseWidth', source.get('pulseWidth'))
    }
    const sourceNotes = source.get('notes') as Y.Map<boolean> | undefined
    const sourcePitches = source.get('pitches') as Y.Map<string> | undefined
    const notes = new Y.Map<boolean>()
    const pitches = new Y.Map<string>()
    for (let i = 0; i < NOTES_PER_LOOP; i++) {
      const key = String(i)
      notes.set(key, ((sourceNotes?.get(key) as boolean | undefined) ?? false))
      pitches.set(key, ((sourcePitches?.get(key) as string | undefined) ?? 'C4'))
    }
    copy.set('notes', notes)
    copy.set('pitches', pitches)
    loops.push([copy])
  })
  return id
}

export function moveLoop(doc: Y.Doc, trackId: string, loopId: string, startBar: number) {
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const max = Math.max(0, getBars(doc) - (loop.get('lengthBars') as number))
  loop.set('startBar', Math.max(0, Math.min(max, Math.round(startBar))))
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
  if (index < 0 || index >= NOTES_PER_LOOP) return
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
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
  doc.transact(() => {
    for (let i = 0; i < NOTES_PER_LOOP; i++) {
      notes.set(String(i), false)
    }
  })
}

export function setNotePitch(doc: Y.Doc, trackId: string, loopId: string, index: number, pitch: string) {
  if (index < 0 || index >= NOTES_PER_LOOP) return
  const loop = findLoop(doc, trackId, loopId)
  if (!loop) return
  const pitches = getLoopPitches(loop)
  if (!pitches) return
  pitches.set(String(index), pitch)
}
