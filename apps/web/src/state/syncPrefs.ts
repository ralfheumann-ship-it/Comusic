import { create } from 'zustand'

const STORAGE_KEY = 'comusic.syncPrefs.v1'

export interface SyncPrefs {
  syncPlayback: boolean
  syncMutes: boolean
}

interface SyncPrefsState extends SyncPrefs {
  setSyncPlayback: (v: boolean) => void
  setSyncMutes: (v: boolean) => void
}

const DEFAULTS: SyncPrefs = {
  syncPlayback: true,
  syncMutes: true
}

function load(): SyncPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const obj = JSON.parse(raw)
    return {
      syncPlayback: typeof obj.syncPlayback === 'boolean' ? obj.syncPlayback : DEFAULTS.syncPlayback,
      syncMutes: typeof obj.syncMutes === 'boolean' ? obj.syncMutes : DEFAULTS.syncMutes
    }
  } catch {
    return DEFAULTS
  }
}

function persist(s: SyncPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // ignore quota / privacy errors — prefs simply won't survive a reload
  }
}

export const useSyncPrefs = create<SyncPrefsState>((set, get) => ({
  ...load(),
  setSyncPlayback: (v) => {
    set({ syncPlayback: v })
    persist({ syncPlayback: v, syncMutes: get().syncMutes })
  },
  setSyncMutes: (v) => {
    set({ syncMutes: v })
    persist({ syncPlayback: get().syncPlayback, syncMutes: v })
  }
}))
