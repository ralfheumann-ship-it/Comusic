import { create } from 'zustand'

interface PlayheadStore {
  steps: Record<string, number>
}

export const usePlayhead = create<PlayheadStore>(() => ({ steps: {} }))

export function setPlayheadStep(loopId: string, step: number) {
  usePlayhead.setState((s) => ({ steps: { ...s.steps, [loopId]: step } }))
}

export function clearPlayheadStep(loopId: string) {
  usePlayhead.setState((s) => {
    if (!(loopId in s.steps)) return s
    const next = { ...s.steps }
    delete next[loopId]
    return { steps: next }
  })
}

export function clearAllPlayheads() {
  usePlayhead.setState({ steps: {} })
}
