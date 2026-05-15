import { useRef } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  addLoop,
  getBars,
  getTrackLoops,
  getTrackMuted,
  getProjectMap,
  removeTrack,
  setTrackMuted,
  setTrackName,
  type YLoop,
  type YTrack
} from '../collab/schema'
import InlineEdit from './InlineEdit'
import LoopContainer from './LoopContainer'
import { BAR_WIDTH, type LoopSelection } from './types'
import { useSongPosition } from '../state/songPosition'

interface Props {
  doc: Y.Doc
  track: YTrack
  onSelectLoop: (sel: LoopSelection) => void
  selected: LoopSelection | null
}

export default function TrackLane({ doc, track, onSelectLoop, selected }: Props) {
  const trackId = track.get('id') as string
  const name = useY(track, () => track.get('name') as string)
  const color = useY(track, () => track.get('color') as string)
  const muted = useY(track, () => getTrackMuted(track))
  const loopsArr = getTrackLoops(track)
  const loops = useY<YLoop[]>(loopsArr, () => loopsArr.toArray())
  const bars = useY(getProjectMap(doc), () => getBars(doc))
  const cursorBars = useSongPosition((s) => s.bars)
  const cursorPlaying = useSongPosition((s) => s.playing)
  const laneRef = useRef<HTMLDivElement>(null)

  const onLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== laneRef.current) return
    const rect = laneRef.current.getBoundingClientRect()
    const bar = Math.floor((e.clientX - rect.left) / BAR_WIDTH)
    addLoop(doc, trackId, bar)
  }

  return (
    <div className="flex bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
      <div className="w-48 shrink-0 p-3 border-r border-zinc-800 flex items-center gap-2 min-w-0">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <InlineEdit
          value={name}
          onCommit={(v) => setTrackName(doc, trackId, v)}
          className="font-mono text-sm flex-1 truncate min-w-0"
          inputClassName="font-mono text-sm flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-1 outline-none focus:border-zinc-500"
          maxLength={48}
          title="Click to rename track"
        />
        <button
          onClick={() => setTrackMuted(doc, trackId, !muted)}
          className={`text-xs font-mono shrink-0 w-5 ${
            muted ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          title={muted ? 'Unmute track' : 'Mute track'}
        >
          M
        </button>
        <button
          onClick={() => removeTrack(doc, trackId)}
          className="text-zinc-500 hover:text-rose-400 text-xs font-mono shrink-0"
          title="Remove track"
        >
          ✕
        </button>
      </div>

      <div
        ref={laneRef}
        onClick={onLaneClick}
        className="relative h-20 cursor-cell"
        style={{
          width: bars * BAR_WIDTH,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${BAR_WIDTH - 1}px, rgba(255,255,255,0.06) ${BAR_WIDTH - 1}px ${BAR_WIDTH}px)`
        }}
      >
        {loops.map((loop) => (
          <LoopContainer
            key={loop.get('id') as string}
            doc={doc}
            trackId={trackId}
            loop={loop}
            color={color}
            barsTotal={bars}
            muted={muted}
            onClick={() => onSelectLoop({ trackId, loopId: loop.get('id') as string })}
            isSelected={
              selected?.trackId === trackId && selected?.loopId === (loop.get('id') as string)
            }
          />
        ))}
        {cursorPlaying && (
          <div
            className="absolute top-0 bottom-0 bg-zinc-100 pointer-events-none"
            style={{ left: cursorBars * BAR_WIDTH - 0.5, width: 1 }}
          />
        )}
      </div>
    </div>
  )
}
