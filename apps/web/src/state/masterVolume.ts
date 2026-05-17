import * as Tone from 'tone'
import { create } from 'zustand'
import { pctToDb } from '../audio/volume'

const STORAGE_KEY = 'comusic.masterVolume.v1'
const DEFAULT_VOLUME = 50

interface MasterVolumeState {
  volume: number
  setVolume: (v: number) => void
}

function load(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_VOLUME
    const n = Number(raw)
    if (!Number.isFinite(n)) return DEFAULT_VOLUME
    return Math.max(0, Math.min(100, n))
  } catch {
    return DEFAULT_VOLUME
  }
}

function persist(v: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(v))
  } catch {
    // ignore quota / privacy errors
  }
}

export const useMasterVolume = create<MasterVolumeState>((set) => ({
  volume: load(),
  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(100, v))
    set({ volume: clamped })
    persist(clamped)
  }
}))

// Side-effect wiring: keep Tone's master destination volume in sync with the
// store. Applies the loaded value once on module init and listens for changes.
function apply(volume: number) {
  Tone.getDestination().volume.value = pctToDb(volume)
}

apply(useMasterVolume.getState().volume)
useMasterVolume.subscribe((s) => apply(s.volume))
