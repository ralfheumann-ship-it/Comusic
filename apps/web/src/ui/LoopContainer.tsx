import { useRef, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import { duplicateLoop, moveLoop, removeLoop, type YLoop } from '../collab/schema'
import { getInstrumentLabel } from '../audio/instruments/registry'
import { BAR_WIDTH } from './types'

interface Props {
  doc: Y.Doc
  trackId: string
  loop: YLoop
  color: string
  barsTotal: number
  muted: boolean
  onClick: () => void
  isSelected: boolean
}

const DRAG_THRESHOLD_PX = 4

export default function LoopContainer({
  doc,
  trackId,
  loop,
  color,
  barsTotal,
  muted,
  onClick,
  isSelected
}: Props) {
  const loopId = loop.get('id') as string
  const startBar = useY(loop, () => loop.get('startBar') as number)
  const lengthBars = useY(loop, () => loop.get('lengthBars') as number)
  const instrumentId = useY(loop, () => loop.get('instrumentId') as string)

  const [dragOffset, setDragOffset] = useState(0)
  const draggedRef = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    draggedRef.current = false

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) draggedRef.current = true
      setDragOffset(dx)
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const dx = ev.clientX - startX
      if (draggedRef.current) {
        const deltaBars = Math.round(dx / BAR_WIDTH)
        if (deltaBars !== 0) {
          const max = Math.max(0, barsTotal - lengthBars)
          moveLoop(doc, trackId, loopId, Math.max(0, Math.min(max, startBar + deltaBars)))
        }
      } else {
        onClick()
      }
      setDragOffset(0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeLoop(doc, trackId, loopId)
  }

  const onDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateLoop(doc, trackId, loopId)
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className={`absolute top-2 bottom-2 rounded cursor-grab active:cursor-grabbing select-none flex items-center justify-between px-2 text-xs font-mono text-zinc-950 ${
        isSelected ? 'ring-2 ring-zinc-100' : ''
      }`}
      style={{
        left: startBar * BAR_WIDTH + dragOffset,
        width: lengthBars * BAR_WIDTH - 4,
        background: color,
        opacity: muted ? 0.4 : dragOffset !== 0 ? 0.85 : 1
      }}
    >
      <span className="truncate">{getInstrumentLabel(instrumentId)}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDuplicate}
          className="text-zinc-950/60 hover:text-zinc-950 text-xs leading-none"
          title="Duplicate loop"
        >
          ⧉
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="text-zinc-950/60 hover:text-zinc-950 text-xs"
          title="Remove loop"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
