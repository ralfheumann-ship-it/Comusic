import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { MoreVertical } from 'lucide-react'
import { useY } from '../collab/useY'
import {
  addLoop,
  getBars,
  getStepsPerBar,
  getStepsPerBeat,
  getTrackLoops,
  getTrackMuted,
  getTrackSolo,
  getTracks,
  getProjectMap,
  removeTrack,
  setTrackName,
  type YLoop,
  type YTrack
} from '../collab/schema'
import InlineEdit from './InlineEdit'
import LoopContainer from './LoopContainer'
import { STEP_WIDTH, type LoopSelection } from './types'
import { useSongPosition } from '../state/songPosition'
import { useSyncPrefs } from '../state/syncPrefs'
import { useLocalMutes } from '../state/localMutes'
import { useLocalSolos } from '../state/localSolos'
import { setMuteIntent, setSoloIntent } from '../state/muteIntent'
import { useTrackHeaderExpanded } from '../state/trackHeaderExpanded'

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
  const docMuted = useY(track, () => getTrackMuted(track))
  const docSoloed = useY(track, () => getTrackSolo(track))
  const localMuted = useLocalMutes((s) => !!s.mutes[trackId])
  const localSoloed = useLocalSolos((s) => !!s.solos[trackId])
  const syncMutes = useSyncPrefs((s) => s.syncMutes)
  const muted = syncMutes ? docMuted : localMuted
  const soloed = syncMutes ? docSoloed : localSoloed
  const tracksArr = getTracks(doc)
  const anyDocSoloed = useY(tracksArr, () => {
    for (let i = 0; i < tracksArr.length; i++) {
      if (getTrackSolo(tracksArr.get(i))) return true
    }
    return false
  })
  const localSolosMap = useLocalSolos((s) => s.solos)
  const anyLocalSoloed = Object.values(localSolosMap).some(Boolean)
  const anySoloed = syncMutes ? anyDocSoloed : anyLocalSoloed
  const silencedBySolo = anySoloed && !soloed
  const effectiveMuted = muted || silencedBySolo

  const loopsArr = getTrackLoops(track)
  const loops = useY<YLoop[]>(loopsArr, () => loopsArr.toArray())
  const projectMap = getProjectMap(doc)
  const bars = useY(projectMap, () => getBars(doc))
  const stepsPerBar = useY(projectMap, () => getStepsPerBar(doc))
  const stepsPerBeat = useY(projectMap, () => getStepsPerBeat(doc))
  const cursorBars = useSongPosition((s) => s.bars)
  const cursorPlaying = useSongPosition((s) => s.playing)
  const laneRef = useRef<HTMLDivElement>(null)
  const expanded = useTrackHeaderExpanded((s) => s.expanded)
  const toggleExpanded = useTrackHeaderExpanded((s) => s.toggle)

  // Track-options dropdown (3-dot menu).
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current) return
      if (e.target instanceof Node && menuRef.current.contains(e.target)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Two-tap remove confirmation inside the dropdown. First click arms; second
  // click within the timeout actually removes. Closing the menu resets it.
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  useEffect(() => {
    if (!confirmingRemove) return
    const t = window.setTimeout(() => setConfirmingRemove(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmingRemove])
  useEffect(() => {
    if (!menuOpen) setConfirmingRemove(false)
  }, [menuOpen])

  const onRemoveClick = () => {
    if (confirmingRemove) {
      removeTrack(doc, trackId)
    } else {
      setConfirmingRemove(true)
    }
  }

  const barWidth = stepsPerBar * STEP_WIDTH
  const beatWidth = stepsPerBeat * STEP_WIDTH
  const laneWidth = bars * barWidth

  // Use pointerdown rather than click so the target check is reliable: a
  // synthesized click bubbles to the nearest common ancestor of pointerdown
  // and pointerup, which can be the lane itself when a resize gesture starts
  // on a child handle and the pointer ends up outside the loop on release —
  // that would otherwise spawn a stray new loop.
  const onLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // Hold Ctrl/Meta to pan the lane via TracksArea — don't spawn a loop.
    if (e.ctrlKey || e.metaKey) return
    if (e.target !== laneRef.current) return
    const rect = laneRef.current.getBoundingClientRect()
    const bar = Math.floor((e.clientX - rect.left) / barWidth)
    addLoop(doc, trackId, bar * stepsPerBar)
  }

  // Three-layer grid: soft per-step, medium per-beat, brighter per-bar.
  const gridBackground = [
    `repeating-linear-gradient(90deg, transparent 0 ${STEP_WIDTH - 1}px, rgba(255,255,255,0.03) ${STEP_WIDTH - 1}px ${STEP_WIDTH}px)`,
    `repeating-linear-gradient(90deg, transparent 0 ${beatWidth - 1}px, rgba(255,255,255,0.07) ${beatWidth - 1}px ${beatWidth}px)`,
    `repeating-linear-gradient(90deg, transparent 0 ${barWidth - 1}px, rgba(255,255,255,0.14) ${barWidth - 1}px ${barWidth}px)`
  ].join(', ')

  return (
    <div className="flex bg-zinc-900 border border-zinc-800 rounded">
      <div
        className={`shrink-0 p-2 sm:p-3 border-r border-zinc-800 min-w-0 sticky left-0 z-20 bg-zinc-900 rounded-l ${
          expanded ? 'w-48 flex flex-col justify-between gap-1' : 'w-9 flex justify-center items-center'
        }`}
      >
        <div className={expanded ? 'flex items-center gap-2 min-w-0' : 'contents'}>
          <button
            type="button"
            onClick={toggleExpanded}
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: color }}
            aria-label={expanded ? 'Collapse track headers' : 'Expand track headers'}
            aria-expanded={expanded}
            title={expanded ? 'Hide track controls' : 'Show track controls'}
          />
          {expanded && (
            <InlineEdit
              value={name}
              onCommit={(v) => setTrackName(doc, trackId, v)}
              className="font-mono text-sm flex-1 truncate min-w-0"
              inputClassName="font-mono text-sm flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-1 outline-none focus:border-zinc-500"
              maxLength={48}
              title="Click to rename track"
            />
          )}
        </div>

        {expanded && (
          <div className="flex items-end justify-between gap-2">
            <div className="inline-flex rounded border border-zinc-700 overflow-hidden font-mono text-[11px] leading-none">
              <button
                onClick={() => setMuteIntent(doc, trackId, !muted)}
                className={`w-6 h-6 flex items-center justify-center border-r border-zinc-700 transition-colors ${
                  muted
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                aria-pressed={muted}
                title={muted ? 'Unmute track' : 'Mute track'}
              >
                M
              </button>
              <button
                onClick={() => setSoloIntent(doc, trackId, !soloed)}
                className={`w-6 h-6 flex items-center justify-center transition-colors ${
                  soloed
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                aria-pressed={soloed}
                title={soloed ? 'Unsolo track' : 'Solo track'}
              >
                S
              </button>
            </div>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                aria-label="Track options"
                aria-expanded={menuOpen}
                title="Track options"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 bottom-full mb-1 z-30 min-w-[8rem] rounded-md border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                  <button
                    onClick={onRemoveClick}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono ${
                      confirmingRemove
                        ? 'text-rose-300 bg-rose-500/10'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-rose-300'
                    }`}
                  >
                    {confirmingRemove ? 'Click again to confirm' : 'Delete track'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        ref={laneRef}
        onPointerDown={onLanePointerDown}
        className="relative h-20 cursor-cell"
        style={{
          width: laneWidth,
          backgroundImage: gridBackground
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
            stepsPerBar={stepsPerBar}
            muted={effectiveMuted}
            onClick={() => onSelectLoop({ trackId, loopId: loop.get('id') as string })}
            isSelected={
              selected?.trackId === trackId && selected?.loopId === (loop.get('id') as string)
            }
          />
        ))}
        {cursorPlaying && (
          <div
            className="absolute top-0 bottom-0 bg-zinc-100 pointer-events-none"
            style={{ left: cursorBars * barWidth - 0.5, width: 1 }}
          />
        )}
      </div>
    </div>
  )
}
