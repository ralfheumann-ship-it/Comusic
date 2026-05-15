import * as Tone from 'tone'
import { create } from 'zustand'

interface SongPositionStore {
  bars: number
  playing: boolean
}

export const useSongPosition = create<SongPositionStore>(() => ({
  bars: 0,
  playing: false
}))

let raf = 0
let attached = false

function tick() {
  const playing = Tone.Transport.state === 'started'
  const prev = useSongPosition.getState()
  if (playing) {
    const ticks = Tone.Time(Tone.Transport.position).toTicks()
    const beats = ticks / Tone.Transport.PPQ
    const bars = beats / 4
    if (prev.bars !== bars || !prev.playing) {
      useSongPosition.setState({ bars, playing: true })
    }
  } else if (prev.playing || prev.bars !== 0) {
    useSongPosition.setState({ bars: 0, playing: false })
  }
  raf = requestAnimationFrame(tick)
}

export function attachSongPositionTracker() {
  if (attached) return
  attached = true
  raf = requestAnimationFrame(tick)
}

export function detachSongPositionTracker() {
  if (!attached) return
  attached = false
  cancelAnimationFrame(raf)
  useSongPosition.setState({ bars: 0, playing: false })
}
