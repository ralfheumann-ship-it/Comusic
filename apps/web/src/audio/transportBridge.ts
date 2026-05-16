import * as Tone from 'tone'
import * as Y from 'yjs'
import {
  getEffectivePlayRange,
  getProjectMap,
  getSongEndSteps,
  getTimeSignature,
  getTracks,
  getLoopSong,
  type YTrack
} from '../collab/schema'
import { isAudioStarted, onAudioStartedChange } from './engine'
import { clearAllPlayheads } from '../state/playhead'
import { useSyncPrefs } from '../state/syncPrefs'
import { useLocalPlayback } from '../state/localPlayback'
import {
  getEffectivePaused,
  getEffectivePlaying,
  setPlayingIntent
} from '../state/playbackIntent'

let doc: Y.Doc | null = null
let projectMap: Y.Map<unknown> | null = null
let tracksArr: Y.Array<YTrack> | null = null
let projectObserver: (() => void) | null = null
let tracksObserver: (() => void) | null = null
let unsubAudio: (() => void) | null = null
let unsubSyncPrefs: (() => void) | null = null
let unsubLocalPlayback: (() => void) | null = null
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
  const playing = getEffectivePlaying(doc)
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
  const paused = getEffectivePaused(doc)

  if (playing && canPlay && Tone.Transport.state !== 'started') {
    // Fresh start resets to playStart; resuming from pause keeps current position.
    if (!paused) Tone.Transport.position = `${startTicks}i`
    Tone.Transport.start()
  } else if ((!playing || !canPlay) && Tone.Transport.state === 'started') {
    if (paused) {
      Tone.Transport.pause()
    } else {
      Tone.Transport.stop()
      Tone.Transport.position = `${startTicks}i`
    }
    clearAllPlayheads()
  }

  if (playing && canPlay && !loopSong) {
    stopEventId = Tone.Transport.scheduleOnce(() => {
      stopEventId = null
      const d = doc
      if (!d) return
      // Natural song-end is a stop, not a pause. setPlayingIntent routes to
      // doc or local depending on whether playback sync is enabled.
      setPlayingIntent(d, false, false)
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
  // Sync prefs and local playback are alternative sources of the effective
  // play state — react to them with the same applyState pass.
  unsubSyncPrefs = useSyncPrefs.subscribe(() => applyState())
  unsubLocalPlayback = useLocalPlayback.subscribe(() => applyState())
  applyState()
}

export function detachTransport() {
  if (projectMap && projectObserver) projectMap.unobserve(projectObserver)
  if (tracksArr && tracksObserver) tracksArr.unobserveDeep(tracksObserver)
  unsubAudio?.()
  unsubSyncPrefs?.()
  unsubLocalPlayback?.()
  clearStopEvent()
  doc = null
  projectMap = null
  tracksArr = null
  projectObserver = null
  tracksObserver = null
  unsubAudio = null
  unsubSyncPrefs = null
  unsubLocalPlayback = null
  if (Tone.Transport.state === 'started') {
    Tone.Transport.stop()
    Tone.Transport.position = 0
  }
  clearAllPlayheads()
}
