import { create } from 'zustand'

// Per-client solo overlay keyed by trackId. Used when syncMutes is OFF
// (the same sync toggle gates both mutes and solos).
interface LocalSolosState {
  solos: Record<string, boolean>
  setSolo: (trackId: string, solo: boolean) => void
}

export const useLocalSolos = create<LocalSolosState>((set) => ({
  solos: {},
  setSolo: (trackId, solo) =>
    set((s) => ({ solos: { ...s.solos, [trackId]: solo } }))
}))
