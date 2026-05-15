import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as Y from 'yjs'
import { useY } from '../collab/useY'
import {
  getLoopLengthSteps,
  getLoopNotes,
  getLoopPitches,
  getProjectMap,
  getStepsPerBar,
  PITCHES,
  setNotePitch,
  toggleNote,
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

interface PitchEdit {
  index: number
  pitch: string
  cellRect: DOMRect
}

interface Gesture {
  cellIndex: number
  pointerId: number
  startX: number
  startY: number
  entryY: number
  cellRect: DOMRect
  initialIdx: number
  initialPitch: string
  entered: boolean
  movedFar: boolean
  lastIdx: number
  livePitch: string
}

export default function NoteGrid({ doc, trackId, loop, color, pitched }: Props) {
  const loopId = loop.get('id') as string
  const notesMap = getLoopNotes(loop)
  const pitchesMap = getLoopPitches(loop)
  const lengthSteps = useY(loop, () => getLoopLengthSteps(loop))
  const stepsPerBar = useY(getProjectMap(doc), () => getStepsPerBar(doc))
  const cols = Math.max(1, stepsPerBar)

  // Read full Y.Map snapshots so the useY read closure does not capture lengthSteps —
  // observers are registered only when the target ref changes, so the captured closure
  // is from first render. Snapshotting keeps the read independent of length, and we
  // derive the array per-render below.
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

  const [edit, setEdit] = useState<PitchEdit | null>(null)
  const gestureRef = useRef<Gesture | null>(null)

  const engagePitch = (g: Gesture, atY: number) => {
    if (g.entered) return
    g.entered = true
    g.entryY = atY
    const wasActive = notesSnapshot[String(g.cellIndex)] ?? false
    if (!wasActive) toggleNote(doc, trackId, loopId, g.cellIndex)
    setEdit({ index: g.cellIndex, pitch: g.initialPitch, cellRect: g.cellRect })
    previewNote(trackId, loopId, g.initialPitch)
  }

  const onPointerDown = (i: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (gestureRef.current) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const cellRect = e.currentTarget.getBoundingClientRect()
    const initialPitch = pitchesSnapshot[String(i)] ?? 'C4'
    const initialIdx = Math.max(0, PITCHES.indexOf(initialPitch))

    gestureRef.current = {
      cellIndex: i,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      entryY: e.clientY,
      cellRect,
      initialIdx,
      initialPitch,
      entered: false,
      movedFar: false,
      lastIdx: initialIdx,
      livePitch: initialPitch
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return

    if (!g.entered) {
      const dy = e.clientY - g.startY
      const dx = e.clientX - g.startX
      const absY = Math.abs(dy)
      const absX = Math.abs(dx)
      if (pitched && absY >= MOVE_THRESHOLD_PX && absY >= absX) {
        engagePitch(g, e.clientY)
      } else if (absX >= MOVE_THRESHOLD_PX || (!pitched && absY >= MOVE_THRESHOLD_PX)) {
        g.movedFar = true
      } else {
        return
      }
    }

    if (g.entered) {
      const dy = e.clientY - g.entryY
      const delta = -Math.round(dy / PITCH_STEP_PX)
      const newIdx = Math.max(0, Math.min(PITCHES.length - 1, g.initialIdx + delta))
      if (newIdx !== g.lastIdx) {
        g.lastIdx = newIdx
        const newPitch = PITCHES[newIdx]
        g.livePitch = newPitch
        setEdit((s) => (s ? { ...s, pitch: newPitch } : s))
        previewNote(trackId, loopId, newPitch)
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    if (g.entered) {
      setNotePitch(doc, trackId, loopId, g.cellIndex, g.livePitch)
    } else if (!g.movedFar) {
      toggleNote(doc, trackId, loopId, g.cellIndex)
    }
    setEdit(null)
    gestureRef.current = null
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    setEdit(null)
    gestureRef.current = null
  }

  return (
    <>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: lengthSteps }, (_, i) => {
          const key = String(i)
          const active = notesSnapshot[key] ?? false
          const pitch = pitchesSnapshot[key] ?? 'C4'
          const isHead = step === i
          const isEditing = edit?.index === i
          return (
            <button
              key={i}
              onPointerDown={(e) => onPointerDown(i, e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              className={`aspect-square rounded transition-colors flex items-center justify-center select-none touch-none ${
                isHead ? 'ring-2 ring-zinc-100' : ''
              } ${isEditing ? 'ring-2 ring-amber-300' : ''}`}
              style={{
                background: active ? color : 'rgb(39 39 42)',
                opacity: active ? 1 : 0.5
              }}
              title={
                pitched
                  ? active
                    ? pitch
                    : 'click to activate · drag up/down to pitch'
                  : active
                    ? 'click to remove'
                    : 'click to activate'
              }
            >
              {active && pitched && (
                <span className="text-[9px] font-mono text-zinc-950">{pitch}</span>
              )}
            </button>
          )
        })}
      </div>

      {edit && pitched &&
        createPortal(
          <div
            className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 shadow-xl pointer-events-none font-mono text-2xl text-zinc-100"
            style={{
              top: edit.cellRect.top - 56,
              left: edit.cellRect.left + edit.cellRect.width / 2,
              transform: 'translateX(-50%)'
            }}
          >
            {edit.pitch}
          </div>,
          document.body
        )}
    </>
  )
}
