import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { useRef, useState } from 'react'
import { getIdentity, setIdentity } from '../presence/identity'
import { parseImport, stashPendingImport } from '../sharing/snapshot'

export default function Landing() {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState('')
  const [name, setName] = useState(() => getIdentity().name)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onNameBlur = () => {
    const trimmed = name.trim()
    if (trimmed) setIdentity({ name: trimmed })
    else setName(getIdentity().name)
  }

  const onImportClick = () => {
    setImportError(null)
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const bytes = parseImport(text)
      const newId = nanoid(10)
      stashPendingImport(newId, bytes)
      navigate(`/room/${newId}`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-4xl font-mono">comusic</h1>
        <p className="text-zinc-400">A collaborative step sequencer. Make 8-bit loops alone or with friends.</p>

        <label className="block">
          <span className="text-sm font-mono text-zinc-400 block mb-1">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={onNameBlur}
            maxLength={32}
            placeholder="Anonymous"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 font-mono"
          />
        </label>

        <button
          onClick={() => navigate(`/room/${nanoid(10)}`)}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium py-3 rounded"
        >
          New project
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (joinId.trim()) navigate(`/room/${joinId.trim()}`)
          }}
          className="flex gap-2"
        >
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Join existing room id"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
          />
          <button type="submit" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded">
            Join
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-800">
          <button
            onClick={onImportClick}
            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded font-mono text-sm"
          >
            Import .comusic.json file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={onFile}
          />
          {importError && (
            <p className="mt-2 text-sm text-rose-400 font-mono">{importError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
