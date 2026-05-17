import { useRef } from 'react'

interface Props {
  value: number // 0-100
  onChange: (v: number) => void
  defaultValue?: number
  size?: number
  ariaLabel?: string
  title?: string
}

interface DragState {
  pointerId: number
  startY: number
  startValue: number
}

const PIXELS_PER_FULL_RANGE = 160

// Knob: vertical-drag scrolls the value 0..100. Double-click resets to the
// supplied default. The indicator sweeps -135° → +135° around the dial.
export default function Knob({
  value,
  onChange,
  defaultValue = 50,
  size = 28,
  ariaLabel,
  title
}: Props) {
  const dragRef = useRef<DragState | null>(null)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY, startValue: value }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current
    if (!s || s.pointerId !== e.pointerId) return
    const dy = s.startY - e.clientY
    const delta = (dy / PIXELS_PER_FULL_RANGE) * 100
    const next = Math.max(0, Math.min(100, s.startValue + delta))
    if (next !== value) onChange(next)
  }

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current
    if (!s || s.pointerId !== e.pointerId) return
    dragRef.current = null
  }

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    onChange(defaultValue)
  }

  const angle = -135 + (value / 100) * 270
  const radians = ((angle - 90) * Math.PI) / 180
  const radius = size / 2 - 3
  const cx = size / 2
  const cy = size / 2
  const indicatorX = cx + radius * Math.cos(radians)
  const indicatorY = cy + radius * Math.sin(radians)

  const isAttenuating = value < 50
  const indicatorColor = isAttenuating ? 'rgb(165 180 252)' : 'rgb(110 231 183)'

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onDoubleClick={onDoubleClick}
      className="select-none touch-none cursor-ns-resize shrink-0"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={ariaLabel}
      title={title ? `${title} (${Math.round(value)}%) — double-click to reset` : undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="rgb(24 24 27)"
          stroke="rgb(82 82 91)"
          strokeWidth={1}
        />
        <line
          x1={cx}
          y1={cy}
          x2={indicatorX}
          y2={indicatorY}
          stroke={indicatorColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
