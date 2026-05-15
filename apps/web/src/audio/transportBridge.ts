import * as Tone from 'tone'
import * as Y from 'yjs'
import {
  getProjectMap,
  getSongEndBars,
  getTracks,
  getLoopSong,
  setIsPlaying,
  type YTrack
} from '../collab/schema'
import { isAudioStarted, onAudioStartedChange } from './engine'
import { clearAllPlayheads } from '../state/playhead'

let doc: Y.Doc | null = null
let projectMap: Y.Map<unknown> | null = null
let tracksArr: Y.Array<YTrack> | null = null
let projectObserver: (() => void) | null = null
let tracksObserver: (() => void) | null = null
let unsubAudio: (() => void) | null = null
let stopEventId: number | null = null

function clearStopEvent() {
  if (stopEventId !== null) {
    Tone.Transport.clear(stopEventId)
    stopEventId = null
  }
}

function applyState() {
  if (!doc || !projectMap) return
  const bpm = (projectMap.get('bpm') as number) ?? 120
  const playing = (projectMap.get('isPlaying') as boolean) ?? false
  const loopSong = getLoopSong(doc)
  const songEnd = getSongEndBars(doc)

  Tone.Transport.bpm.value = bpm
  Tone.Transport.loop = loopSong
  Tone.Transport.loopStart = 0
  Tone.Transport.loopEnd = `${Math.max(songEnd, 1)}m`

  clearStopEvent()

  if (!isAudioStarted()) return

  const canPlay = songEnd > 0

  if (playing && canPlay && Tone.Transport.state !== 'started') {
    Tone.Transport.position = 0
    Tone.Transport.start()
  } else if ((!playing || !canPlay) && Tone.Transport.state === 'started') {
    Tone.Transport.stop()
    Tone.Transport.position = 0
    clearAllPlayheads()
  }

  if (playing && canPlay && !loopSong) {
    stopEventId = Tone.Transport.scheduleOnce(() => {
      stopEventId = null
      if (doc) setIsPlaying(doc, false)
    }, `${songEnd}m`)
  }
}

export function attachTransport(d: Y.Doc) {
  detachTransport()
  doc = d
  projectMap = getProjectMap(d)
  tracksArr = getTracks(d)
  projectObserver = () => applyState()
  tracksObserver = () => applyState()
  projectMap.observe(projectObserver)
  tracksArr!.observeDeep(tracksObserver)
  unsubAudio = onAudioStartedChange(() => applyState())
  applyState()
}

export function detachTransport() {
  if (projectMap && projectObserver) projectMap.unobserve(projectObserver)
  if (tracksArr && tracksObserver) tracksArr.unobserveDeep(tracksObserver)
  unsubAudio?.()
  clearStopEvent()
  doc = null
  projectMap = null
  tracksArr = null
  projectObserver = null
  tracksObserver = null
  unsubAudio = null
  if (Tone.Transport.state === 'started') {
    Tone.Transport.stop()
    Tone.Transport.position = 0
  }
  clearAllPlayheads()
}
