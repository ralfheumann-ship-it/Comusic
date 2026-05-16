import { useRef, useState } from 'react'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  getBars,
  getPlayEnd,
  getPlayStart,
  getProjectMap,
  getSongEndSteps,
  getStepsPerBar,
  getStepsPerBeat,
  getTracks,
  hasExplicitPlayRange,
  MAX_BARS,
  setPlayEnd,
  setPlayRange,
  setPlayStart
} from '../collab/schema'
import { STEP_WIDTH } from './types'

interface Props {
  doc: Y.Doc
}

type Mode = 'start' | 'end' | 'move' | 'define'

interface DragState {
  mode: Mode
  pointerId: number
  startClientX: number
  startStep: number
  initialStart: number
  initialEnd: number
  moved: boolean
  laneLeft: number
}

interface Preview {
  start: number
  end: number
}

const HANDLE_HIT_PX = 8
const HANDLE_VISUAL_PX = 2
const DRAG_THRESHOLD_PX = 4
const BAR_HEIGHT_PX = 24
const GRID_STRIP_PX = 8
const ARROW_HALF_WIDTH = 4
const ARROW_HEIGHT = 5
const EMERALD_400 = 'rgb(74 222 128)'

export default function PlayRangeBar({ doc }: Props) {
  const projectMap = getProjectMap(doc)
  const tracksArr = getTracks(doc)
  const bars = useY(projectMap, () => getBars(doc))
  const stepsPerBar = useY(projectMap, () => getStepsPerBar(doc))
  const stepsPerBeat = useY(projectMap, () => getStepsPerBeat(doc))
  const playStart = useY(projectMap, () => getPlayStart(doc))
  const playEnd = useY(projectMap, () => getPlayEnd(doc))
  const explicit = useY(projectMap, () => hasExplicitPlayRange(doc))
  const songEndSteps = useY(tracksArr, () => getSongEndSteps(doc))

  const rangeRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  const effectiveStart = playStart !== null ? playStart : 0
  const effectiveEnd = playEnd !== null ? playEnd : songEndSteps
  const showMarker = explicit || preview !== null
  const displayStart = preview?.start ?? effectiveStart
  const displayEnd = preview?.end ?? effectiveEnd

  const barWidth = stepsPerBar * STEP_WIDTH
  const beatWidth = stepsPerBeat * STEP_WIDTH
  const laneWidth = bars * barWidth
  const maxStep = MAX_BARS * stepsPerBar

  const startPx = displayStart * STEP_WIDTH
  const endPx = displayEnd * STEP_WIDTH

  // Same three-layer grid the track lanes use — rendered only in the lower
  // strip so the bar reads as a quiet reference rule, not a full lane.
  const gridBackground = [
    `repeating-linear-gradient(90deg, transparent 0 ${STEP_WIDTH - 1}px, rgba(255,255,255,0.03) ${STEP_WIDTH - 1}px ${STEP_WIDTH}px)`,
    `repeating-linear-gradient(90deg, transparent 0 ${beatWidth - 1}px, rgba(255,255,255,0.07) ${beatWidth - 1}px ${beatWidth}px)`,
    `repeating-linear-gradient(90deg, transparent 0 ${barWidth - 1}px, rgba(255,255,255,0.14) ${barWidth - 1}px ${barWidth}px)`
  ].join(', ')

  const computeNext = (s: DragState, clientX: number): Preview => {
    const dx = clientX - s.startClientX
    const delta = Math.round(dx / STEP_WIDTH)
    if (s.mode === 'start') {
      const newStart = Math.max(0, Math.min(s.initialEnd - 1, s.initialStart + delta))
      return { start: newStart, end: s.initialEnd }
    } else if (s.mode === 'end') {
      const newEnd = Math.max(s.initialStart + 1, Math.min(maxStep, s.initialEnd + delta))
      return { start: s.initialStart, end: newEnd }
    } else if (s.mode === 'move') {
      const length = s.initialEnd - s.initialStart
      const newStart = Math.max(0, Math.min(maxStep - length, s.initialStart + delta))
      return { start: newStart, end: newStart + length }
    }
    const curStep = Math.max(0, Math.min(maxStep, Math.round((clientX - s.laneLeft) / STEP_WIDTH)))
    const lo = Math.min(s.startStep, curStep)
    const hi = Math.max(s.startStep, curStep)
    return { start: lo, end: Math.max(lo + 1, hi) }
  }

  const beginDrag = (e: React.PointerEvent<HTMLDivElement>, mode: Mode) => {
    if (e.button !== 0) return
    if (e.ctrlKey || e.metaKey) return
    if (!rangeRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const rect = rangeRef.current.getBoundingClientRect()
    const downStep = Math.max(0, Math.round((e.clientX - rect.left) / STEP_WIDTH))

    e.currentTarget.setPointerCapture(e.pointerId)

    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startStep: downStep,
      initialStart: effectiveStart,
      initialEnd: effectiveEnd,
      moved: false,
      laneLeft: rect.left
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current
    if (!s || s.pointerId !== e.pointerId) return
    const dx = e.clientX - s.startClientX
    if (!s.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) s.moved = true
    if (s.moved) setPreview(computeNext(s, e.clientX))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current
    if (!s || s.pointerId !== e.pointerId) return
    dragRef.current = null

    if (!s.moved) {
      // Short click anywhere in the bar clears the range.
      if (explicit) setPlayRange(doc, null, null)
      setPreview(null)
      return
    }

    const next = computeNext(s, e.clientX)
    if (s.mode === 'start' && next.start !== s.initialStart) {
      setPlayStart(doc, next.start)
    } else if (s.mode === 'end' && next.end !== s.initialEnd) {
      setPlayEnd(doc, next.end)
    } else if (s.mode === 'move' && next.start !== s.initialStart) {
      setPlayRange(doc, next.start, next.end)
    } else if (s.mode === 'define') {
      setPlayRange(doc, next.start, next.end)
    }
    setPreview(null)
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current
    if (!s || s.pointerId !== e.pointerId) return
    dragRef.current = null
    setPreview(null)
  }

  return (
    <div className="flex sticky top-0 z-30 border border-zinc-950 bg-zinc-950 rounded">
      {/* Spacer so the bar's lane area starts where the track headers end. */}
      <div
        className="w-48 shrink-0 sticky left-0 z-40 bg-zinc-950 rounded-l"
        style={{ height: BAR_HEIGHT_PX }}
      />

      <div
        ref={rangeRef}
        className="relative select-none touch-none rounded bg-black/50 overflow-hidden"
        style={{ width: laneWidth, height: BAR_HEIGHT_PX }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Grid strip in the lower third — visible even with no range set so the
            bar reads as a thin ruler attached to the track view. */}
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{ height: GRID_STRIP_PX, backgroundImage: gridBackground }}
        />

        {showMarker && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-400/25 pointer-events-none"
            style={{ left: startPx, width: Math.max(1, endPx - startPx) }}
          />
        )}

        {showMarker ? (
          <>
            {startPx > 0 && (
              <div
                className="absolute top-0 bottom-0 cursor-cell"
                style={{ left: 0, width: Math.max(0, startPx - HANDLE_HIT_PX / 2) }}
                onPointerDown={(e) => beginDrag(e, 'define')}
              />
            )}
            <div
              className="absolute top-0 bottom-0 cursor-ew-resize"
              style={{ left: startPx - HANDLE_HIT_PX / 2, width: HANDLE_HIT_PX }}
              onPointerDown={(e) => beginDrag(e, 'start')}
              title="Drag to move play range start"
            />
            <div
              className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing"
              style={{
                left: startPx + HANDLE_HIT_PX / 2,
                width: Math.max(0, endPx - startPx - HANDLE_HIT_PX)
              }}
              onPointerDown={(e) => beginDrag(e, 'move')}
              title="Drag to move play range"
            />
            <div
              className="absolute top-0 bottom-0 cursor-ew-resize"
              style={{ left: endPx - HANDLE_HIT_PX / 2, width: HANDLE_HIT_PX }}
              onPointerDown={(e) => beginDrag(e, 'end')}
              title="Drag to move play range end"
            />
            <div
              className="absolute top-0 bottom-0 cursor-cell"
              style={{ left: endPx + HANDLE_HIT_PX / 2, right: 0 }}
              onPointerDown={(e) => beginDrag(e, 'define')}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 cursor-cell"
            onPointerDown={(e) => beginDrag(e, 'define')}
            title="Drag to set a play range"
          />
        )}

        {showMarker && (
          <>
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 pointer-events-none"
              style={{ left: startPx, width: HANDLE_VISUAL_PX }}
            />
            {/* Downward arrow at the start handle, sitting at the bar's bottom. */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: startPx + HANDLE_VISUAL_PX / 2 - ARROW_HALF_WIDTH,
                bottom: 0,
                width: 0,
                height: 0,
                borderLeft: `${ARROW_HALF_WIDTH}px solid transparent`,
                borderRight: `${ARROW_HALF_WIDTH}px solid transparent`,
                borderTop: `${ARROW_HEIGHT}px solid ${EMERALD_400}`
              }}
            />
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 pointer-events-none"
              style={{ left: endPx - HANDLE_VISUAL_PX, width: HANDLE_VISUAL_PX }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                left: endPx - HANDLE_VISUAL_PX / 2 - ARROW_HALF_WIDTH,
                bottom: 0,
                width: 0,
                height: 0,
                borderLeft: `${ARROW_HALF_WIDTH}px solid transparent`,
                borderRight: `${ARROW_HALF_WIDTH}px solid transparent`,
                borderTop: `${ARROW_HEIGHT}px solid ${EMERALD_400}`
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
