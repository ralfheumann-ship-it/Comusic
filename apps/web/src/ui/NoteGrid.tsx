import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  getLoopLengthSteps,
  getLoopNotes,
  getLoopPitches,
  getNoteGridCols,
  getProjectMap,
  moveNote,
  PITCHES,
  setNote,
  setNotePitch,
  type YLoop
} from '../collab/schema'
import { previewNote } from '../audio/scheduler'
import { usePlayhead } from '../state/playhead'

interface Props {
  doc: Y.Doc
  trackId: string
  loop: YLoop
  color: string
  pitched: boolean
}

const MOVE_THRESHOLD_PX = 6
const PITCH_STEP_PX = 10
const DEFAULT_PITCH = 'C4'
const GRID_GAP_PX = 4

type GestureKind = 'paint' | 'erase' | 'pending' | 'dragging'

interface Gesture {
  kind: GestureKind
  pointerId: number
  startCell: number
  startCol: number
  startRow: number
  startX: number
  startY: number
  initialPitch: string
  cellWidth: number
  lastTouchedCell: number
  dragCell: number
  dragPitch: string
  cellRect: DOMRect
  freeMode: boolean
}

interface PitchOverlay {
  cellRect: DOMRect
  pitch: string
}

function findCellIndex(target: EventTarget | null): number | null {
  let el: HTMLElement | null = target as HTMLElement | null
  while (el && el.dataset && el.dataset.cell === undefined) el = el.parentElement
  if (!el) return null
  const v = el.dataset.cell
  if (v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function cellAtPoint(x: number, y: number): { index: number; rect: DOMRect } | null {
  const el = document.elementFromPoint(x, y)
  let cur: HTMLElement | null = el as HTMLElement | null
  while (cur && cur.dataset && cur.dataset.cell === undefined) cur = cur.parentElement
  if (!cur) return null
  const idx = Number(cur.dataset.cell)
  if (!Number.isFinite(idx)) return null
  return { index: idx, rect: cur.getBoundingClientRect() }
}

export default function NoteGrid({ doc, trackId, loop, color, pitched }: Props) {
  const loopId = loop.get('id') as string
  const notesMap = getLoopNotes(loop)
  const pitchesMap = getLoopPitches(loop)
  const lengthSteps = useY(loop, () => getLoopLengthSteps(loop))
  const gridCols = useY(getProjectMap(doc), () => getNoteGridCols(doc))
  const cols = Math.max(1, gridCols)

  const notesSnapshot = useY<Record<string, boolean>>(notesMap, () => {
    const out: Record<string, boolean> = {}
    if (notesMap) notesMap.forEach((v, k) => { out[k] = !!v })
    return out
  })
  const pitchesSnapshot = useY<Record<string, string>>(pitchesMap, () => {
    const out: Record<string, string> = {}
    if (pitchesMap) pitchesMap.forEach((v, k) => { out[k] = v as string })
    return out
  })
  const step = usePlayhead((s) => s.steps[loopId] ?? -1)

  const gridRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const lastPitchRef = useRef<string>(DEFAULT_PITCH)
  const [overlay, setOverlay] = useState<PitchOverlay | null>(null)
  const [dragView, setDragView] = useState<{ from: number; to: number; pitch: string } | null>(null)
  const [ctrlHeld, setCtrlHeld] = useState(false)
  // Drives a re-render when a gesture transitions to/from 'dragging' so the
  // grabbing-cursor class is applied consistently to all children.
  const [, setRenderTick] = useState(0)
  const bumpRender = () => setRenderTick((t) => t + 1)

  // Track Ctrl/Meta state via window listeners so the hover cursor reflects
  // the modifier even when the pointer isn't moving. Pointer events themselves
  // carry ctrlKey, so during a drag we read that directly.
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

  // Seed lastPitch from any existing note the first time we mount this loop.
  useEffect(() => {
    for (let i = 0; i < lengthSteps; i++) {
      if (notesSnapshot[String(i)]) {
        const p = pitchesSnapshot[String(i)]
        if (p) {
          lastPitchRef.current = p
          return
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopId])

  const paintAt = (idx: number) => {
    if (notesSnapshot[String(idx)]) return
    setNote(doc, trackId, loopId, idx, true, lastPitchRef.current)
  }

  const eraseAt = (idx: number) => {
    if (!notesSnapshot[String(idx)]) return
    setNote(doc, trackId, loopId, idx, false)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current) return
    const idx = findCellIndex(e.target)
    if (idx === null) return

    const cellEl = e.target as HTMLElement
    const cellRect = cellEl.getBoundingClientRect()
    const cellWidth = cellRect.width + GRID_GAP_PX
    const startCol = idx % cols
    const startRow = Math.floor(idx / cols)
    const freeMode = e.ctrlKey || e.metaKey

    if (e.button === 2) {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      gestureRef.current = {
        kind: 'erase',
        pointerId: e.pointerId,
        startCell: idx,
        startCol,
        startRow,
        startX: e.clientX,
        startY: e.clientY,
        initialPitch: DEFAULT_PITCH,
        cellWidth,
        lastTouchedCell: idx,
        dragCell: idx,
        dragPitch: DEFAULT_PITCH,
        cellRect,
        freeMode: true
      }
      eraseAt(idx)
      return
    }

    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)

    const isActive = !!notesSnapshot[String(idx)]

    if (isActive) {
      const initialPitch = pitchesSnapshot[String(idx)] ?? DEFAULT_PITCH
      gestureRef.current = {
        kind: 'pending',
        pointerId: e.pointerId,
        startCell: idx,
        startCol,
        startRow,
        startX: e.clientX,
        startY: e.clientY,
        initialPitch,
        cellWidth,
        lastTouchedCell: idx,
        dragCell: idx,
        dragPitch: initialPitch,
        cellRect,
        freeMode
      }
    } else {
      gestureRef.current = {
        kind: 'paint',
        pointerId: e.pointerId,
        startCell: idx,
        startCol,
        startRow,
        startX: e.clientX,
        startY: e.clientY,
        initialPitch: lastPitchRef.current,
        cellWidth,
        lastTouchedCell: idx,
        dragCell: idx,
        dragPitch: lastPitchRef.current,
        cellRect,
        freeMode: false
      }
      paintAt(idx)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return

    if (g.kind === 'paint') {
      // Crossing into a new empty cell on the same row paints it and becomes
      // the new pitch anchor (pitch is measured from the Y at which each cell
      // was placed). Sliding back over the same cell does nothing.
      const hit = cellAtPoint(e.clientX, e.clientY)
      if (hit && Math.floor(hit.index / cols) === g.startRow && hit.index !== g.lastTouchedCell) {
        const wasEmpty = !notesSnapshot[String(hit.index)]
        g.lastTouchedCell = hit.index
        if (wasEmpty) {
          g.dragCell = hit.index
          g.cellRect = hit.rect
          g.startY = e.clientY
          g.initialPitch = lastPitchRef.current
          g.dragPitch = lastPitchRef.current
          paintAt(hit.index)
        }
      }

      // Vertical drag pitches the most recently painted note in real time.
      if (pitched) {
        const dy = e.clientY - g.startY
        const pitchDelta = -Math.round(dy / PITCH_STEP_PX)
        const initialIdx = Math.max(0, PITCHES.indexOf(g.initialPitch))
        const newIdx = Math.max(0, Math.min(PITCHES.length - 1, initialIdx + pitchDelta))
        const newPitch = PITCHES[newIdx]
        if (newPitch !== g.dragPitch) {
          g.dragPitch = newPitch
          setNotePitch(doc, trackId, loopId, g.dragCell, newPitch)
          lastPitchRef.current = newPitch
          setOverlay({ cellRect: g.cellRect, pitch: newPitch })
          previewNote(trackId, loopId, newPitch)
        }
      }
      return
    }

    if (g.kind === 'erase') {
      const hit = cellAtPoint(e.clientX, e.clientY)
      if (!hit) return
      if (hit.index === g.lastTouchedCell) return
      g.lastTouchedCell = hit.index
      eraseAt(hit.index)
      return
    }

    if (g.kind === 'pending') {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (Math.hypot(dx, dy) < MOVE_THRESHOLD_PX) return
      g.kind = 'dragging'
      setDragView({ from: g.startCell, to: g.startCell, pitch: g.initialPitch })
      if (pitched) setOverlay({ cellRect: g.cellRect, pitch: g.initialPitch })
      bumpRender()
    }

    if (g.kind === 'dragging') {
      // Ctrl is read live during the drag so toggling it mid-gesture works.
      const free = e.ctrlKey || e.metaKey
      g.freeMode = free

      let targetCell: number
      let targetRect: DOMRect

      if (free) {
        const hit = cellAtPoint(e.clientX, e.clientY)
        targetCell = hit ? hit.index : g.dragCell
        targetRect = hit ? hit.rect : g.cellRect
      } else {
        // Constrained: horizontal-only within the starting row.
        const dx = e.clientX - g.startX
        const deltaCol = Math.round(dx / g.cellWidth)
        const newCol = Math.max(0, Math.min(cols - 1, g.startCol + deltaCol))
        const candidate = g.startRow * cols + newCol
        targetCell = candidate < lengthSteps ? candidate : g.dragCell
        // Update rect for overlay placement: probe via the actual cell element.
        const rectEl = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${targetCell}"]`)
        targetRect = rectEl ? rectEl.getBoundingClientRect() : g.cellRect
      }

      // Pitch: only when constrained (no ctrl).
      let newPitch = g.dragPitch
      if (!free && pitched) {
        const dy = e.clientY - g.startY
        const pitchDelta = -Math.round(dy / PITCH_STEP_PX)
        const initialIdx = Math.max(0, PITCHES.indexOf(g.initialPitch))
        const idx = Math.max(0, Math.min(PITCHES.length - 1, initialIdx + pitchDelta))
        newPitch = PITCHES[idx]
      } else if (free) {
        // Ctrl-drag: pitch is locked to the original.
        newPitch = g.initialPitch
      }

      const changed = newPitch !== g.dragPitch || targetCell !== g.dragCell
      g.dragPitch = newPitch
      g.dragCell = targetCell
      g.cellRect = targetRect

      if (changed) {
        setDragView({ from: g.startCell, to: targetCell, pitch: newPitch })
        if (pitched) {
          setOverlay(free ? null : { cellRect: targetRect, pitch: newPitch })
          if (!free) previewNote(trackId, loopId, newPitch)
        }
      }
    }
  }

  const finishGesture = (g: Gesture) => {
    if (g.kind === 'pending') {
      previewNote(trackId, loopId, g.initialPitch)
    } else if (g.kind === 'dragging') {
      if (g.dragCell === g.startCell && g.dragPitch === g.initialPitch) {
        previewNote(trackId, loopId, g.initialPitch)
      } else {
        moveNote(doc, trackId, loopId, g.startCell, g.dragCell, g.dragPitch)
        lastPitchRef.current = g.dragPitch
      }
    }
    gestureRef.current = null
    setOverlay(null)
    setDragView(null)
    bumpRender()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    finishGesture(g)
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    gestureRef.current = null
    setOverlay(null)
    setDragView(null)
    bumpRender()
  }

  const isDragging = gestureRef.current?.kind === 'dragging'
  const containerCursor = isDragging
    ? 'cursor-grabbing [&_*]:!cursor-grabbing'
    : ''

  return (
    <>
      <div
        ref={gridRef}
        className={`grid gap-1 select-none touch-none ${containerCursor}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: lengthSteps }, (_, i) => {
          const key = String(i)
          let active = notesSnapshot[key] ?? false
          let pitch = pitchesSnapshot[key] ?? DEFAULT_PITCH
          if (dragView) {
            if (i === dragView.from) active = false
            if (i === dragView.to) {
              active = true
              pitch = dragView.pitch
            }
          }
          const isHead = step === i
          const cellCursor = active
            ? ctrlHeld
              ? 'cursor-grab'
              : 'cursor-pointer'
            : 'cursor-cell'
          return (
            <div
              key={i}
              data-cell={i}
              className={`aspect-square rounded transition-colors flex items-center justify-center ${cellCursor} ${
                isHead ? 'ring-2 ring-zinc-100' : ''
              }`}
              style={{
                background: active ? color : 'rgb(39 39 42)',
                opacity: active ? 1 : 0.5
              }}
              title={
                pitched
                  ? active
                    ? `${pitch} · click to play · drag X to move, Y to pitch · ctrl+drag to move freely · right-click to delete`
                    : 'click to place · drag horizontally to paint · right-click+drag to erase'
                  : active
                    ? 'click to play · drag to move · ctrl+drag to move freely · right-click to delete'
                    : 'click to place · drag horizontally to paint'
              }
            >
              {active && pitched && (
                <span className="text-xs font-mono text-zinc-950 pointer-events-none">
                  {pitch}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {overlay && pitched &&
        createPortal(
          <div
            className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 shadow-xl pointer-events-none font-mono text-2xl text-zinc-100"
            style={{
              top: overlay.cellRect.top - 56,
              left: overlay.cellRect.left + overlay.cellRect.width / 2,
              transform: 'translateX(-50%)'
            }}
          >
            {overlay.pitch}
          </div>,
          document.body
        )}
    </>
  )
}
