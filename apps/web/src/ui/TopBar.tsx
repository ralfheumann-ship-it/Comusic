import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  getBpm,
  getIsPlaying,
  getLoopSong,
  getProjectMap,
  getTimeSignature,
  getTitle,
  setBpm,
  setIsPlaying,
  setLoopSong,
  setTimeSignature,
  setTitle,
  TIME_SIGNATURE_OPTIONS
} from '../collab/schema'
import { isAudioStarted, onAudioStartedChange, startAudio } from '../audio/engine'
import Presence from './Presence'
import InlineEdit from './InlineEdit'
import type { Awareness } from '../presence/useAwareness'
import { exportProject, slugifyTitle } from '../sharing/snapshot'

interface Props {
  doc: Y.Doc
  roomId: string
  awareness: Awareness | null
}

export default function TopBar({ doc, roomId, awareness }: Props) {
  const project = getProjectMap(doc)
  const bpm = useY(project, () => getBpm(doc))
  const playing = useY(project, () => getIsPlaying(doc))
  const title = useY(project, () => getTitle(doc))
  const loopSong = useY(project, () => getLoopSong(doc))
  const timeSig = useY(project, () => getTimeSignature(doc))
  const timeSigKey = `${timeSig[0]}/${timeSig[1]}`
  const [audioOn, setAudioOn] = useState(isAudioStarted())
  const [copied, setCopied] = useState(false)

  useEffect(() => onAudioStartedChange(setAudioOn), [])

  const onPlay = async () => {
    if (!audioOn) await startAudio()
    setIsPlaying(doc, !playing)
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

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center px-4 pt-3">
        <InlineEdit
          value={title}
          onCommit={(v) => setTitle(doc, v)}
          className="font-mono text-lg text-zinc-100"
          inputClassName="font-mono text-lg bg-zinc-900 border border-zinc-700 rounded px-1 outline-none focus:border-zinc-500"
          maxLength={80}
          title="Click to rename project"
        />
      </div>

      <div className="flex items-center gap-4 p-4">
        <button
          onClick={onPlay}
          className={`px-4 py-2 rounded font-mono text-zinc-950 ${
            playing ? 'bg-rose-400 hover:bg-rose-300' : 'bg-emerald-400 hover:bg-emerald-300'
          }`}
        >
          {!audioOn ? 'Enable audio' : playing ? 'Stop' : 'Play'}
        </button>

        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-sm font-mono">BPM</label>
          <input
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(doc, Number(e.target.value))}
            className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-sm font-mono">Meter</label>
          <select
            value={timeSigKey}
            onChange={(e) => {
              const [n, d] = e.target.value.split('/').map(Number)
              setTimeSignature(doc, [n, d])
            }}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 font-mono text-sm"
            title="Time signature — affects bar width and note grid; existing notes keep their position in time"
          >
            {TIME_SIGNATURE_OPTIONS.map(([n, d]) => (
              <option key={`${n}/${d}`} value={`${n}/${d}`}>{`${n}/${d}`}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm font-mono text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={loopSong}
            onChange={(e) => setLoopSong(doc, e.target.checked)}
            className="accent-emerald-400"
          />
          Loop song
        </label>

        <div className="flex-1" />

        <Presence awareness={awareness} />

        <div className="text-sm font-mono text-zinc-400">
          room <span className="text-zinc-200">{roomId}</span>
        </div>
        <button
          onClick={onCopy}
          className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded font-mono"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded font-mono"
          title="Download project as a .comusic.json file"
        >
          Export
        </button>
      </div>
    </div>
  )
}
