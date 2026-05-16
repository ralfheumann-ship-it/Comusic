import { create } from 'zustand'

// Per-client playback state. Used when syncPlayback is OFF: the user controls
// their own transport without writing to the shared Yjs project map.
interface LocalPlaybackState {
  isPlaying: boolean
  paused: boolean
  set: (s: Partial<{ isPlaying: boolean; paused: boolean }>) => void
}

export const useLocalPlayback = create<LocalPlaybackState>((set) => ({
  isPlaying: false,
  paused: false,
  set: (s) => set(s)
}))
