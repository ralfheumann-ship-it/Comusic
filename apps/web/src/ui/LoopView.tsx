import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  clearLoopNotes,
  DEFAULT_LOOP_VOLUME,
  findLoop,
  findTrack,
  getLoopPulseWidth,
  getLoopVolume,
  setLoopInstrument,
  setLoopPulseWidth,
  setLoopVolume,
  type YLoop
} from '../collab/schema'
import {
  getInstrumentIds,
  getInstrumentLabel,
  isInstrumentPitched
} from '../audio/instruments/registry'
import { auditionInstrument } from '../audio/audition'
import { startAudio } from '../audio/engine'
import Knob from './Knob'
import NoteGrid from './NoteGrid'
import type { LoopSelection } from './types'

interface Props {
  doc: Y.Doc
  selection: LoopSelection
  onClose: () => void
}

export default function LoopView({ doc, selection, onClose }: Props) {
  const track = findTrack(doc, selection.trackId)
  const loop = findLoop(doc, selection.trackId, selection.loopId)

  const trackName = useY(track, () => (track?.get('name') as string) ?? '')
  const color = useY(track, () => (track?.get('color') as string) ?? '#ffffff')
  const instrumentId = useY(loop as YLoop | undefined, () =>
    (loop?.get('instrumentId') as string) ?? 'square'
  )
  const pulseWidth = useY(loop as YLoop | undefined, () =>
    loop ? getLoopPulseWidth(loop) : 0.25
  )
  const loopVolume = useY(loop as YLoop | undefined, () =>
    loop ? getLoopVolume(loop) : DEFAULT_LOOP_VOLUME
  )

  if (!track || !loop) {
    return null
  }

  const pitched = isInstrumentPitched(instrumentId)
  const isPulse = instrumentId === 'pulse'

  const onInstrumentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    setLoopInstrument(doc, selection.trackId, selection.loopId, newId)
    await startAudio()
    auditionInstrument(newId, { pulseWidth })
  }

  return (
    <div className="absolute inset-0 z-40 bg-zinc-950 flex flex-col md:relative md:inset-auto md:z-auto md:w-[640px] md:shrink-0 md:border-l md:border-zinc-800">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="font-mono text-sm text-zinc-400">{trackName} · loop</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => clearLoopNotes(doc, selection.trackId, selection.loopId)}
            className="text-xs font-mono text-zinc-500 hover:text-rose-400"
            title="Clear all notes in this loop"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-100 font-mono text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-mono">
            <span className="text-zinc-400">Instrument</span>
            <select
              value={instrumentId}
              onChange={onInstrumentChange}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1"
            >
              {getInstrumentIds().map((id) => (
                <option key={id} value={id}>
                  {getInstrumentLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-mono">Vol</span>
            <Knob
              value={loopVolume}
              defaultValue={DEFAULT_LOOP_VOLUME}
              onChange={(v) =>
                setLoopVolume(doc, selection.trackId, selection.loopId, v)
              }
              size={28}
              ariaLabel="Loop instrument volume"
              title="Loop instrument volume (shared with collaborators)"
            />
          </div>

          <div className="flex-1" />

          <div className="text-xs font-mono text-zinc-500">
            {pitched ? 'click · drag up/down to pitch' : 'click to toggle'}
          </div>
        </div>

        {isPulse && (
          <label className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span className="w-12">Width</span>
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.01}
              value={pulseWidth}
              onChange={(e) =>
                setLoopPulseWidth(
                  doc,
                  selection.trackId,
                  selection.loopId,
                  Number(e.target.value)
                )
              }
              className="flex-1 accent-emerald-400"
            />
            <span className="w-10 text-right text-zinc-300">{Math.round(pulseWidth * 100)}%</span>
          </label>
        )}
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <NoteGrid
          doc={doc}
          trackId={selection.trackId}
          loop={loop}
          color={color}
          pitched={pitched}
        />
      </div>
    </div>
  )
}
