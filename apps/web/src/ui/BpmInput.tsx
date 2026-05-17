import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

const DRAG_THRESHOLD_PX = 4
const PX_PER_BPM = 2

export default function BpmInput({ value, onChange, min = 20, max = 300 }: Props) {
  const [text, setText] = useState(String(value))
  const focusedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mirror the prop into local text whenever the input is not being edited,
  // so collaborator changes / drag updates / clamping all show through.
  useEffect(() => {
    if (!focusedRef.current) setText(String(value))
  }, [value])

  const onChangeText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    setText(t)
    const n = parseInt(t, 10)
    if (Number.isFinite(n)) onChange(n)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0) return
    const startY = e.clientY
    const startVal = value
    let dragging = false
    const move = (ev: PointerEvent) => {
      const dy = startY - ev.clientY
      if (!dragging && Math.abs(dy) > DRAG_THRESHOLD_PX) {
        dragging = true
        // Bail out of focus so onChange typing doesn't fight the drag, and so
        // the unfocused effect below resyncs the displayed text as we drag.
        inputRef.current?.blur()
      }
      if (dragging) {
        ev.preventDefault()
        onChange(startVal + Math.round(dy / PX_PER_BPM))
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={onChangeText}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        setText(String(value))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      onPointerDown={onPointerDown}
      className="h-10 w-20 bg-zinc-900 border border-zinc-800 rounded px-2 font-mono cursor-ns-resize"
      title="Type, drag up/down, or use the arrows to change BPM"
    />
  )
}
