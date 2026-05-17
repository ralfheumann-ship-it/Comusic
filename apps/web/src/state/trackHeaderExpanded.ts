import { create } from 'zustand'

// Per-client UI state: are the track header columns showing just the color
// dot (collapsed) or the full name + mute + remove controls (expanded)?
// Tapping any track's color dot toggles this for all rows.
interface TrackHeaderExpandedState {
  expanded: boolean
  toggle: () => void
  set: (v: boolean) => void
}

export const useTrackHeaderExpanded = create<TrackHeaderExpandedState>((set) => ({
  expanded: false,
  toggle: () => set((s) => ({ expanded: !s.expanded })),
  set: (v) => set({ expanded: v })
}))
