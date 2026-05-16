import { create } from 'zustand'

// Per-client mute overlay keyed by trackId. Used when syncMutes is OFF.
interface LocalMutesState {
  mutes: Record<string, boolean>
  setMute: (trackId: string, muted: boolean) => void
}

export const useLocalMutes = create<LocalMutesState>((set) => ({
  mutes: {},
  setMute: (trackId, muted) =>
    set((s) => ({ mutes: { ...s.mutes, [trackId]: muted } }))
}))
