import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onCommit: (next: string) => void
  className?: string
  inputClassName?: string
  placeholder?: string
  maxLength?: number
  title?: string
}

export default function InlineEdit({
  value,
  onCommit,
  className,
  inputClassName,
  placeholder,
  maxLength,
  title
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        className={
          inputClassName ??
          'bg-zinc-900 border border-zinc-700 rounded px-1 outline-none focus:border-zinc-500 ' +
            (className ?? '')
        }
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title={title ?? 'Click to edit'}
      className={`cursor-text hover:bg-zinc-800/60 rounded px-1 ${className ?? ''}`}
    >
      {value || placeholder || ''}
    </span>
  )
}
