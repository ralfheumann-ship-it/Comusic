import * as Tone from 'tone'

let started = false
const listeners = new Set<(started: boolean) => void>()

export async function startAudio() {
  if (started) return
  await Tone.start()
  started = true
  listeners.forEach((l) => l(true))
}

export function isAudioStarted(): boolean {
  return started
}

export function onAudioStartedChange(listener: (started: boolean) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
