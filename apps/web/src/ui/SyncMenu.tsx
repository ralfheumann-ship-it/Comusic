import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { Link2, Link2Off } from 'lucide-react'
import { useSyncPrefs } from '../state/syncPrefs'
import { snapshotPlaybackToLocal } from '../state/playbackIntent'
import { snapshotMutesToLocal } from '../state/muteIntent'

interface Props {
  doc: Y.Doc
}

export default function SyncMenu({ doc }: Props) {
  const syncPlayback = useSyncPrefs((s) => s.syncPlayback)
  const syncMutes = useSyncPrefs((s) => s.syncMutes)
  const setSyncPlayback = useSyncPrefs((s) => s.setSyncPlayback)
  const setSyncMutes = useSyncPrefs((s) => s.setSyncMutes)

  const allSynced = syncPlayback && syncMutes
  const noneSynced = !syncPlayback && !syncMutes

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current) return
      if (e.target instanceof Node && containerRef.current.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const Icon = noneSynced ? Link2Off : Link2
  const buttonTitle = allSynced
    ? 'Synced with collaborators'
    : noneSynced
      ? 'Not syncing with collaborators'
      : 'Partial sync with collaborators'

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-2 rounded font-mono flex items-center justify-center ${
          allSynced
            ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400'
            : noneSynced
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400'
        }`}
        aria-label="Sync settings"
        aria-expanded={open}
        title={buttonTitle}
      >
        <Icon size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl p-3">
          <div className="text-xs font-mono text-zinc-400 mb-2">
            Sync with collaborators
          </div>
          <label className="flex items-center gap-2 py-1.5 text-sm font-mono text-zinc-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncPlayback}
              onChange={(e) => {
                const next = e.target.checked
                if (!next && syncPlayback) snapshotPlaybackToLocal(doc)
                setSyncPlayback(next)
              }}
              className="accent-emerald-400"
            />
            <span>Playback (play / stop)</span>
          </label>
          <label className="flex items-center gap-2 py-1.5 text-sm font-mono text-zinc-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncMutes}
              onChange={(e) => {
                const next = e.target.checked
                if (!next && syncMutes) snapshotMutesToLocal(doc)
                setSyncMutes(next)
              }}
              className="accent-emerald-400"
            />
            <span>Track mutes</span>
          </label>
          <div className="mt-2 text-[11px] font-mono text-zinc-500 leading-relaxed">
            Turning a switch off lets you control that locally without affecting
            others. Turning it back on snaps your client to the room state.
          </div>
        </div>
      )}
    </div>
  )
}
