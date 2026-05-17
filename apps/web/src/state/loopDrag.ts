import { create } from 'zustand'

// Shared state for an in-progress loop drag. LoopContainer writes here as the
// pointer moves; the target TrackLane reads it to render a ghost preview at
// the predicted drop position. Kept out of Yjs because it's per-client UI.
export interface LoopDragState {
  sourceTrackId: string
  loopId: string
  targetTrackId: string
  startStep: number
  lengthSteps: number
  color: string
  instrumentId: string
}

interface LoopDragStore {
  drag: LoopDragState | null
  setDrag: (d: LoopDragState | null) => void
}

export const useLoopDragStore = create<LoopDragStore>((set) => ({
  drag: null,
  setDrag: (d) => set({ drag: d })
}))
