import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import { addTrack, getTracks, type YTrack } from '../collab/schema'
import TrackLane from './TrackLane'
import type { LoopSelection } from './types'

interface Props {
  doc: Y.Doc
  onSelectLoop: (sel: LoopSelection) => void
  selected: LoopSelection | null
}

export default function TracksArea({ doc, onSelectLoop, selected }: Props) {
  const tracksArr = getTracks(doc)
  const tracks = useY<YTrack[]>(tracksArr, () => tracksArr.toArray())
  const scrollRef = useRef<HTMLDivElement>(null)
  const [ctrlHeld, setCtrlHeld] = useState(false)
  const [panning, setPanning] = useState(false)

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
      <div className="space-y-2 p-4 min-w-min">
        {tracks.map((track) => (
          <TrackLane
            key={track.get('id') as string}
            doc={doc}
            track={track}
            onSelectLoop={onSelectLoop}
            selected={selected}
          />
        ))}
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
