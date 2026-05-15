const NAMES = [
  'Otter', 'Finch', 'Lark', 'Hare', 'Lynx', 'Wren', 'Newt', 'Wolf',
  'Mole', 'Crow', 'Dove', 'Sloth', 'Vole', 'Fox', 'Owl', 'Stoat'
]

const COLORS = [
  '#f43f5e', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#eab308'
]

const STORAGE_KEY = 'comusic.identity'

export interface Identity {
  name: string
  color: string
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Identity>
      if (parsed.name && parsed.color) return { name: parsed.name, color: parsed.color }
    }
  } catch {}
  const id: Identity = { name: pick(NAMES), color: pick(COLORS) }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(id))
  } catch {}
  return id
}

export function setIdentity(partial: Partial<Identity>): Identity {
  const current = getIdentity()
  const next: Identity = {
    name: partial.name?.trim() || current.name,
    color: partial.color || current.color
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
  return next
}
