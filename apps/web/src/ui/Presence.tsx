import { useAwareness, type Awareness } from '../presence/useAwareness'
import { setIdentity } from '../presence/identity'
import InlineEdit from './InlineEdit'

interface Props {
  awareness: Awareness | null
}

export default function Presence({ awareness }: Props) {
  const users = useAwareness(awareness)

  if (users.length === 0) return null

  const onRenameSelf = (next: string) => {
    if (!awareness) return
    const updated = setIdentity({ name: next })
    awareness.setLocalStateField('user', updated)
  }

  return (
    <div className="flex items-center gap-2">
      {users.map((u) => (
        <div key={u.clientId} className="flex items-center gap-1">
          <div
            title={u.isSelf ? `${u.name} (you)` : u.name}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-zinc-950 font-mono text-[10px] border-2 ${
              u.isSelf ? 'border-zinc-100' : 'border-zinc-900'
            }`}
            style={{ background: u.color }}
          >
            {u.name.slice(0, 2)}
          </div>
          {u.isSelf ? (
            <InlineEdit
              value={u.name}
              onCommit={onRenameSelf}
              className="text-xs font-mono text-zinc-300"
              inputClassName="text-xs font-mono w-24 bg-zinc-900 border border-zinc-700 rounded px-1 outline-none focus:border-zinc-500"
              maxLength={32}
              title="Click to change your name"
            />
          ) : (
            <span className="text-xs font-mono text-zinc-400">{u.name}</span>
          )}
        </div>
      ))}
    </div>
  )
}
