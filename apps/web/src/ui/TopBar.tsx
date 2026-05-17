import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import { Copy, Download, GitFork, LogOut, Play, Repeat, Square } from 'lucide-react'
import { useY } from '../collab/useY'
import {
  getBpm,
  getIsPlaying,
  getLoopSong,
  getPlayPaused,
  getProjectMap,
  getTimeSignature,
  getTitle,
  setBpm,
  setLoopSong,
  setTimeSignature,
  setTitle,
  TIME_SIGNATURE_OPTIONS
} from '../collab/schema'
import { isAudioStarted, onAudioStartedChange, startAudio } from '../audio/engine'
import { useSyncPrefs } from '../state/syncPrefs'
import { useLocalPlayback } from '../state/localPlayback'
import { setPlayingIntent } from '../state/playbackIntent'
import { useMasterVolume } from '../state/masterVolume'
import Presence from './Presence'
import InlineEdit from './InlineEdit'
import Knob from './Knob'
import BpmInput from './BpmInput'
import SyncMenu from './SyncMenu'
import type { Awareness } from '../presence/useAwareness'
import { exportProject, slugifyTitle, stashPendingImport } from '../sharing/snapshot'

interface Props {
  doc: Y.Doc
  roomId: string
  awareness: Awareness | null
}

export default function TopBar({ doc, roomId, awareness }: Props) {
  const project = getProjectMap(doc)
  const bpm = useY(project, () => getBpm(doc))
  const docPlaying = useY(project, () => getIsPlaying(doc))
  const docPaused = useY(project, () => getPlayPaused(doc))
  const localPlaying = useLocalPlayback((s) => s.isPlaying)
  const localPaused = useLocalPlayback((s) => s.paused)
  const syncPlayback = useSyncPrefs((s) => s.syncPlayback)
  const playing = syncPlayback ? docPlaying : localPlaying
  const paused = syncPlayback ? docPaused : localPaused
  const title = useY(project, () => getTitle(doc))
  const loopSong = useY(project, () => getLoopSong(doc))
  const timeSig = useY(project, () => getTimeSignature(doc))
  const timeSigKey = `${timeSig[0]}/${timeSig[1]}`
  const [audioOn, setAudioOn] = useState(isAudioStarted())
  const [copied, setCopied] = useState(false)
  const masterVolume = useMasterVolume((s) => s.volume)
  const setMasterVolume = useMasterVolume((s) => s.setVolume)
  const navigate = useNavigate()

  useEffect(() => onAudioStartedChange(setAudioOn), [])

  const onPlayOrStop = async () => {
    if (!audioOn) await startAudio()
    if (playing) {
      // Full stop clears the paused flag so the next start rewinds to playStart.
      setPlayingIntent(doc, false, false)
    } else {
      // Start (or resume — the bridge keeps position when paused was true).
      setPlayingIntent(doc, true, paused)
    }
  }

  const onCopy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const onExport = () => {
    const json = exportProject(doc, title)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugifyTitle(title)}.comusic.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const onFork = () => {
    const update = Y.encodeStateAsUpdate(doc)
    const newId = nanoid(10)
    stashPendingImport(newId, update)
    navigate(`/room/${newId}`)
  }

  const onLeave = () => {
    navigate('/')
  }

  const playLabel = !audioOn ? 'Enable audio' : playing ? 'Stop' : 'Play'
  const PrimaryIcon = playing ? Square : Play

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 shrink-0">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 pt-3">
        <InlineEdit
          value={title}
          onCommit={(v) => setTitle(doc, v)}
          className="font-mono text-lg text-zinc-100"
          inputClassName="font-mono text-lg bg-zinc-900 border border-zinc-700 rounded px-1 outline-none focus:border-zinc-500"
          maxLength={80}
          title="Click to rename project"
        />

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Presence awareness={awareness} />
          <div className="text-sm font-mono text-zinc-400">
            room <span className="text-zinc-200">{roomId}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
        <button
          onClick={onPlayOrStop}
          className={`h-10 w-10 rounded-md text-zinc-950 flex items-center justify-center ${
            playing ? 'bg-rose-400 hover:bg-rose-300' : 'bg-emerald-400 hover:bg-emerald-300'
          }`}
          aria-label={playLabel}
          title={playing ? 'Stop' : 'Play'}
        >
          <PrimaryIcon size={18} />
        </button>

        <div className="flex items-center gap-2 h-10">
          <label className="text-zinc-400 text-sm font-mono">Vol</label>
          <Knob
            value={masterVolume}
            onChange={setMasterVolume}
            size={28}
            ariaLabel="Master volume"
            title="Master volume (this client only)"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-sm font-mono">BPM</label>
          <BpmInput value={bpm} onChange={(v) => setBpm(doc, v)} />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-sm font-mono">Meter</label>
          <select
            value={timeSigKey}
            onChange={(e) => {
              const [n, d] = e.target.value.split('/').map(Number)
              setTimeSignature(doc, [n, d])
            }}
            className="h-10 bg-zinc-900 border border-zinc-800 rounded px-2 font-mono text-sm"
            title="Time signature — affects bar width and note grid; existing notes keep their position in time"
          >
            {TIME_SIGNATURE_OPTIONS.map(([n, d]) => (
              <option key={`${n}/${d}`} value={`${n}/${d}`}>{`${n}/${d}`}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex justify-between gap-2">
          <div className="flex items-center gap-2">
            <SyncMenu doc={doc} />

            <button
              onClick={() => setLoopSong(doc, !loopSong)}
              className={`h-10 w-10 sm:w-auto sm:px-[.688rem] rounded font-mono flex items-center justify-center ${
                loopSong
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500'
              }`}
              aria-label={loopSong ? 'Disable song loop' : 'Enable song loop'}
              aria-pressed={loopSong}
              title={loopSong ? 'Song loop is on — click to disable' : 'Song loop is off — click to enable'}
            >
              <Repeat size={18} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onCopy}
              className="h-10 w-10 sm:w-auto sm:px-[.688rem] rounded font-mono text-sm bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center sm:gap-1.5"
              aria-label="Copy room link"
              title="Copy room link to clipboard"
            >
              <Copy size={18} />
              <span className="hidden lg:inline">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
            <button
              onClick={onExport}
              className="h-10 w-10 sm:w-auto sm:px-[.688rem] rounded font-mono text-sm bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center sm:gap-1.5"
              aria-label="Export project"
              title="Download project as a .comusic.json file"
            >
              <Download size={18} />
              <span className="hidden lg:inline">Export</span>
            </button>
            <button
              onClick={onFork}
              className="h-10 w-10 sm:w-auto sm:px-[.688rem] rounded font-mono text-sm bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center sm:gap-1.5"
              aria-label="Fork project to a new room"
              title="Create a private copy of this project in a new room"
            >
              <GitFork size={18} />
              <span className="hidden lg:inline">Fork</span>
            </button>
            <button
              onClick={onLeave}
              className="h-10 w-10 sm:w-auto sm:px-[.688rem] rounded font-mono text-sm bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center sm:gap-1.5"
              aria-label="Leave room"
              title="Leave this room and return to the landing page"
            >
              <LogOut size={18} />
              <span className="hidden lg:inline">Leave</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
