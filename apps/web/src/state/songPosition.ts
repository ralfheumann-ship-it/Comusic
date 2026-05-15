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
    const ts = Tone.Transport.timeSignature
    let n = 4
    let d = 4
    if (typeof ts === 'number') {
      n = ts
    } else if (Array.isArray(ts) && ts.length >= 2) {
      n = ts[0] as number
      d = ts[1] as number
    }
    // PPQ is ticks per quarter note. quartersPerBar = numerator * (4 / denominator).
    const quartersPerBar = Math.max(0.0001, n * (4 / d))
    const bars = ticks / (Tone.Transport.PPQ * quartersPerBar)
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
