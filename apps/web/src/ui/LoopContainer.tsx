import { useRef, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  duplicateLoop,
  getLoopLengthSteps,
  getLoopStartStep,
  MIN_LOOP_LENGTH_STEPS,
  moveLoop,
  moveLoopToTrack,
  removeLoop,
  resizeLoopLeft,
  resizeLoopRight,
  type YLoop
} from '../collab/schema'
import { getInstrumentLabel } from '../audio/instruments/registry'
import { useLoopDragStore } from '../state/loopDrag'
import { suppressSelectionUntilPointerUp } from '../state/dragSelect'
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
  onCrossTrackMove?: (newTrackId: string) => void
  isSelected: boolean
}

const DRAG_THRESHOLD_PX = 4
const HANDLE_PX = 6

type DragMode = 'move' | 'resize-left' | 'resize-right'

// Walk the [data-track-id] wrappers (rendered by TracksArea) and return the
// id of the one whose vertical span contains `y`. Used during a cross-track
// drag to figure out which lane the pointer is currently hovering.
function findTrackAtY(y: number): string | null {
  const els = document.querySelectorAll<HTMLElement>('[data-track-id]')
  for (const el of els) {
    const rect = el.getBoundingClientRect()
    if (y >= rect.top && y <= rect.bottom) {
      return el.getAttribute('data-track-id')
    }
  }
  return null
}

export default function LoopContainer({
  doc,
  trackId,
  loop,
  color,
  barsTotal,
  stepsPerBar,
  muted,
  onClick,
  onCrossTrackMove,
  isSelected
}: Props) {
  const loopId = loop.get('id') as string
  const startStep = useY(loop, () => getLoopStartStep(loop))
  const lengthSteps = useY(loop, () => getLoopLengthSteps(loop))
  const instrumentId = useY(loop, () => loop.get('instrumentId') as string)

  const [resizePreview, setResizePreview] = useState<{
    startStep: number
    lengthSteps: number
  } | null>(null)
  const draggedRef = useRef(false)
  // Hide self once a cross-track drag of THIS loop has actually started moving
  // (otherwise the user would briefly see the loop at its original position
  // alongside the ghost in the target lane).
  const isBeingDragged = useLoopDragStore(
    (s) => s.drag?.loopId === loopId && s.drag.sourceTrackId === trackId
  )

  // barsTotal / stepsPerBar are no longer used as drag-time upper bounds — the lane
  // auto-grows in the schema. We still suppress unused-prop warnings locally.
  void barsTotal
  void stepsPerBar

  const beginMoveDrag = (e: React.PointerEvent) => {
    if (e.ctrlKey || e.metaKey) return
    e.preventDefault()
    e.stopPropagation()
    suppressSelectionUntilPointerUp()
    const startX = e.clientX
    const startY = e.clientY
    draggedRef.current = false

    const setDrag = useLoopDragStore.getState().setDrag
    setDrag({
      sourceTrackId: trackId,
      loopId,
      targetTrackId: trackId,
      startStep,
      lengthSteps,
      color,
      instrumentId
    })

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (
        !draggedRef.current &&
        (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)
      ) {
        draggedRef.current = true
      }
      const deltaSteps = Math.round(dx / STEP_WIDTH)
      const newStart = Math.max(0, startStep + deltaSteps)
      const targetTrackId = findTrackAtY(ev.clientY) ?? trackId
      setDrag({
        sourceTrackId: trackId,
        loopId,
        targetTrackId,
        startStep: newStart,
        lengthSteps,
        color,
        instrumentId
      })
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const finalDrag = useLoopDragStore.getState().drag
      setDrag(null)

      if (!draggedRef.current) {
        onClick()
        return
      }
      if (!finalDrag) return
      const dx = ev.clientX - startX
      const deltaSteps = Math.round(dx / STEP_WIDTH)
      const newStart = Math.max(0, startStep + deltaSteps)
      const target = finalDrag.targetTrackId
      if (target !== trackId) {
        moveLoopToTrack(doc, trackId, target, loopId, newStart)
        onCrossTrackMove?.(target)
      } else if (deltaSteps !== 0) {
        moveLoop(doc, trackId, loopId, newStart)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const beginResizeDrag = (e: React.PointerEvent, mode: 'resize-left' | 'resize-right') => {
    if (e.ctrlKey || e.metaKey) return
    e.preventDefault()
    e.stopPropagation()
    suppressSelectionUntilPointerUp()
    const startX = e.clientX
    draggedRef.current = false

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) draggedRef.current = true
      const deltaSteps = Math.round(dx / STEP_WIDTH)
      if (mode === 'resize-right') {
        const newLen = Math.max(MIN_LOOP_LENGTH_STEPS, lengthSteps + deltaSteps)
        setResizePreview({ startStep, lengthSteps: newLen })
      } else {
        const rightEdge = startStep + lengthSteps
        const minStart = 0
        const maxStart = rightEdge - MIN_LOOP_LENGTH_STEPS
        const newStart = Math.max(minStart, Math.min(maxStart, startStep + deltaSteps))
        setResizePreview({ startStep: newStart, lengthSteps: rightEdge - newStart })
      }
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const dx = ev.clientX - startX
      const deltaSteps = Math.round(dx / STEP_WIDTH)
      if (draggedRef.current) {
        if (mode === 'resize-right' && deltaSteps !== 0) {
          resizeLoopRight(doc, trackId, loopId, lengthSteps + deltaSteps)
        } else if (mode === 'resize-left' && deltaSteps !== 0) {
          resizeLoopLeft(doc, trackId, loopId, startStep + deltaSteps)
        }
      }
      setResizePreview(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const beginDrag = (e: React.PointerEvent, mode: DragMode) => {
    if (mode === 'move') beginMoveDrag(e)
    else beginResizeDrag(e, mode)
  }

  const onRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeLoop(doc, trackId, loopId)
  }

  const onDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateLoop(doc, trackId, loopId)
  }

  const displayStart = resizePreview?.startStep ?? startStep
  const displayLength = resizePreview?.lengthSteps ?? lengthSteps
  const resizing = resizePreview !== null

  if (isBeingDragged) {
    // Render nothing — the cross-track ghost in the target lane represents
    // this loop until the drop commits.
    return null
  }

  return (
    <div
      onPointerDown={(e) => beginDrag(e, 'move')}
      className={`absolute top-2 bottom-2 rounded cursor-grab active:cursor-grabbing select-none flex items-center justify-between text-xs font-mono text-zinc-950 transition ${
        isSelected ? 'ring-2 ring-zinc-100' : 'hover:brightness-110'
      }`}
      style={{
        left: displayStart * STEP_WIDTH,
        width: Math.max(STEP_WIDTH, displayLength * STEP_WIDTH - 1),
        background: color,
        opacity: muted ? 0.4 : resizing ? 0.85 : 1
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
