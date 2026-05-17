import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import { addTrack, getSortedTracks, getTracks, moveTrack, type YTrack } from '../collab/schema'
import TrackLane from './TrackLane'
import PlayRangeBar from './PlayRangeBar'
import type { LoopSelection } from './types'

interface Props {
  doc: Y.Doc
  onSelectLoop: (sel: LoopSelection) => void
  selected: LoopSelection | null
}

interface DragState {
  trackId: string
  fromIndex: number
  insertIndex: number
}

export default function TracksArea({ doc, onSelectLoop, selected }: Props) {
  const tracksArr = getTracks(doc)
  const tracks = useY<YTrack[]>(tracksArr, () => getSortedTracks(doc))
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowsContainerRef = useRef<HTMLDivElement>(null)
  const [ctrlHeld, setCtrlHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  const [dragState, setDragState] = useState<DragState | null>(null)
  // Mirror state in a ref so the pointerup handler can read the latest insert
  // index without going through a setState updater (calling moveTrack from
  // inside one is a side effect, and StrictMode double-invokes the updater).
  const dragStateRef = useRef<DragState | null>(null)
  const tracksRef = useRef(tracks)
  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHeld(false)
    }
    const onBlur = () => setCtrlHeld(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // Pointer can wander outside the scroll container during a track reorder
  // (the listeners are on window). Forcing the page-wide cursor here keeps the
  // grabbing affordance visible wherever the pointer ends up.
  useEffect(() => {
    if (!dragState) return
    const prev = document.body.style.cursor
    document.body.style.cursor = 'grabbing'
    return () => {
      document.body.style.cursor = prev
    }
  }, [dragState])

  // Capture-phase handler: when Ctrl/Meta is held we pre-empt child handlers
  // (loop drag, lane click) so dragging across the tracks pans the viewport.
  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return
    if (e.button !== 0) return
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startScroll = el.scrollLeft
    setPanning(true)

    const onMove = (ev: PointerEvent) => {
      el.scrollLeft = startScroll - (ev.clientX - startX)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setPanning(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const setDrag = (next: DragState | null) => {
    dragStateRef.current = next
    setDragState(next)
  }

  const onStartReorderDrag = (trackId: string) => {
    const list = tracksRef.current
    const fromIndex = list.findIndex((t) => (t.get('id') as string) === trackId)
    if (fromIndex < 0) return
    setDrag({ trackId, fromIndex, insertIndex: fromIndex })

    // With ghost rendering the lane positions don't change during the drag,
    // so live getBoundingClientRect is fine — and stays correct under scroll.
    const computeInsertIndex = (clientY: number): number => {
      const container = rowsContainerRef.current
      const cur = tracksRef.current
      if (!container) return fromIndex
      let idx = 0
      for (const t of cur) {
        const id = t.get('id') as string
        if (id === trackId) continue
        const el = container.querySelector(`[data-track-id="${id}"]`)
        if (!el) continue
        const rect = (el as HTMLElement).getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (clientY > midY) idx += 1
      }
      return idx
    }

    const onMove = (ev: PointerEvent) => {
      setDrag({ trackId, fromIndex, insertIndex: computeInsertIndex(ev.clientY) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const current = dragStateRef.current
      setDrag(null)
      if (current && current.insertIndex !== current.fromIndex) {
        moveTrack(doc, current.trackId, current.insertIndex)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Map an insertion index in the "others" list to a gap index in the rendered
  // (ghost-in-place) list. The gap immediately around the ghost is the no-op
  // zone — we hide the indicator there so the line only appears at positions
  // where dropping actually moves the track.
  const indicatorAtGap = (gap: number): boolean => {
    if (!dragState) return false
    const { fromIndex, insertIndex } = dragState
    if (insertIndex === fromIndex) return false
    if (insertIndex < fromIndex) return gap === insertIndex
    return gap === insertIndex + 1
  }

  const rows: React.ReactNode[] = []
  for (let i = 0; i < tracks.length; i++) {
    if (indicatorAtGap(i)) {
      rows.push(<DropIndicator key={`drop-indicator-${i}`} />)
    }
    const track = tracks[i]
    const id = track.get('id') as string
    const isGhost = dragState?.trackId === id
    rows.push(
      <div key={id} data-track-id={id} className={isGhost ? 'opacity-30' : ''}>
        <TrackLane
          doc={doc}
          track={track}
          onSelectLoop={onSelectLoop}
          selected={selected}
          onStartReorderDrag={onStartReorderDrag}
          reorderActive={dragState !== null}
        />
      </div>
    )
  }
  if (indicatorAtGap(tracks.length)) {
    rows.push(<DropIndicator key="drop-indicator-end" />)
  }

  const cursorClass = panning
    ? 'cursor-grabbing [&_*]:!cursor-grabbing'
    : ctrlHeld
      ? 'cursor-grab [&_*]:!cursor-grab'
      : ''

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-auto ${cursorClass}`}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div ref={rowsContainerRef} className="space-y-2 p-4 min-w-min">
        <PlayRangeBar doc={doc} />
        {rows}
        <button
          onClick={() => addTrack(doc)}
          className="px-3 py-2 text-sm font-mono bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 rounded text-zinc-400 sticky left-4"
        >
          + Add track
        </button>
      </div>
    </div>
  )
}

function DropIndicator() {
  return <div aria-hidden className="h-1 rounded bg-emerald-400 pointer-events-none" />
}
