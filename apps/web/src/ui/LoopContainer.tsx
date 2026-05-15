import { useRef, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  duplicateLoop,
  getLoopLengthSteps,
  getLoopStartStep,
  MIN_LOOP_LENGTH_STEPS,
  moveLoop,
  removeLoop,
  resizeLoopLeft,
  resizeLoopRight,
  type YLoop
} from '../collab/schema'
import { getInstrumentLabel } from '../audio/instruments/registry'
import { STEP_WIDTH } from './types'

interface Props {
  doc: Y.Doc
  trackId: string
  loop: YLoop
  color: string
  barsTotal: number
  stepsPerBar: number
  muted: boolean
  onClick: () => void
  isSelected: boolean
}

const DRAG_THRESHOLD_PX = 4
const HANDLE_PX = 6

type DragMode = 'move' | 'resize-left' | 'resize-right'

export default function LoopContainer({
  doc,
  trackId,
  loop,
  color,
  barsTotal,
  stepsPerBar,
  muted,
  onClick,
  isSelected
}: Props) {
  const loopId = loop.get('id') as string
  const startStep = useY(loop, () => getLoopStartStep(loop))
  const lengthSteps = useY(loop, () => getLoopLengthSteps(loop))
  const instrumentId = useY(loop, () => loop.get('instrumentId') as string)

  const [preview, setPreview] = useState<{ startStep: number; lengthSteps: number } | null>(null)
  const draggedRef = useRef(false)

  // barsTotal / stepsPerBar are no longer used as drag-time upper bounds — the lane
  // auto-grows in the schema. We still suppress unused-prop warnings locally.
  void barsTotal
  void stepsPerBar

  const beginDrag = (e: React.PointerEvent, mode: DragMode) => {
    // Hold Ctrl/Meta to pan the lane via TracksArea — let that handler take over.
    if (e.ctrlKey || e.metaKey) return
    e.stopPropagation()
    const startX = e.clientX
    draggedRef.current = false

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) draggedRef.current = true
      const deltaSteps = Math.round(dx / STEP_WIDTH)
      if (mode === 'move') {
        const newStart = Math.max(0, startStep + deltaSteps)
        setPreview({ startStep: newStart, lengthSteps })
      } else if (mode === 'resize-right') {
        const newLen = Math.max(MIN_LOOP_LENGTH_STEPS, lengthSteps + deltaSteps)
        setPreview({ startStep, lengthSteps: newLen })
      } else {
        const rightEdge = startStep + lengthSteps
        const minStart = 0
        const maxStart = rightEdge - MIN_LOOP_LENGTH_STEPS
        const newStart = Math.max(minStart, Math.min(maxStart, startStep + deltaSteps))
        setPreview({ startStep: newStart, lengthSteps: rightEdge - newStart })
      }
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const dx = ev.clientX - startX
      const deltaSteps = Math.round(dx / STEP_WIDTH)
      if (draggedRef.current) {
        if (mode === 'move' && deltaSteps !== 0) {
          moveLoop(doc, trackId, loopId, Math.max(0, startStep + deltaSteps))
        } else if (mode === 'resize-right' && deltaSteps !== 0) {
          resizeLoopRight(doc, trackId, loopId, lengthSteps + deltaSteps)
        } else if (mode === 'resize-left' && deltaSteps !== 0) {
          resizeLoopLeft(doc, trackId, loopId, startStep + deltaSteps)
        }
      } else if (mode === 'move') {
        onClick()
      }
      setPreview(null)
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

  const displayStart = preview?.startStep ?? startStep
  const displayLength = preview?.lengthSteps ?? lengthSteps
  const dragging = preview !== null

  return (
    <div
      onPointerDown={(e) => beginDrag(e, 'move')}
      className={`absolute top-2 bottom-2 rounded cursor-grab active:cursor-grabbing select-none flex items-center justify-between text-xs font-mono text-zinc-950 ${
        isSelected ? 'ring-2 ring-zinc-100' : ''
      }`}
      style={{
        left: displayStart * STEP_WIDTH,
        width: Math.max(STEP_WIDTH, displayLength * STEP_WIDTH - 1),
        background: color,
        opacity: muted ? 0.4 : dragging ? 0.85 : 1
      }}
    >
      <div
        onPointerDown={(e) => beginDrag(e, 'resize-left')}
        className="absolute left-0 top-0 bottom-0 cursor-ew-resize"
        style={{ width: HANDLE_PX }}
        title="Drag to resize loop start"
      />
      <div
        onPointerDown={(e) => beginDrag(e, 'resize-right')}
        className="absolute right-0 top-0 bottom-0 cursor-ew-resize"
        style={{ width: HANDLE_PX }}
        title="Drag to resize loop end"
      />

      <span className="truncate px-2 pl-2.5">{getInstrumentLabel(instrumentId)}</span>
      <div className="flex items-center gap-1 shrink-0 pr-2.5">
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
