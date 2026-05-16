import * as Tone from 'tone'
import * as Y from 'yjs'
import {
  getEffectivePlayRange,
  getProjectMap,
  getSongEndSteps,
  getTimeSignature,
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
  const [tsNum, tsDen] = getTimeSignature(doc)
  const { start: rangeStart, end: rangeEnd } = getEffectivePlayRange(doc)
  const songEndSteps = getSongEndSteps(doc)

  // Ticks-based throughout to avoid decimal-measure parsing quirks.
  const PPQ = Tone.Transport.PPQ
  const ticksPerStep = PPQ / 4
  const quartersPerBar = tsNum * (4 / tsDen)
  const ticksPerBar = PPQ * quartersPerBar
  const startTicks = Math.max(0, rangeStart * ticksPerStep)
  // Guarantee a non-zero loop window so Transport.loop never gets a 0-length region.
  const endTicks = Math.max(startTicks + ticksPerBar, rangeEnd * ticksPerStep)

  Tone.Transport.timeSignature = [tsNum, tsDen]
  Tone.Transport.bpm.value = bpm
  Tone.Transport.loop = loopSong
  Tone.Transport.loopStart = `${startTicks}i`
  Tone.Transport.loopEnd = `${endTicks}i`

  clearStopEvent()

  if (!isAudioStarted()) return

  const canPlay = songEndSteps > 0 && rangeEnd > rangeStart

  if (playing && canPlay && Tone.Transport.state !== 'started') {
    Tone.Transport.position = `${startTicks}i`
    Tone.Transport.start()
  } else if ((!playing || !canPlay) && Tone.Transport.state === 'started') {
    Tone.Transport.stop()
    Tone.Transport.position = `${startTicks}i`
    clearAllPlayheads()
  }

  if (playing && canPlay && !loopSong) {
    stopEventId = Tone.Transport.scheduleOnce(() => {
      stopEventId = null
      if (doc) setIsPlaying(doc, false)
    }, `${endTicks}i`)
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
