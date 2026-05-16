import * as Y from 'yjs'
import {
  getIsPlaying,
  getPlayPaused,
  setIsPlaying,
  setPlayPaused
} from '../collab/schema'
import { useSyncPrefs } from './syncPrefs'
import { useLocalPlayback } from './localPlayback'

// All playback transitions go through these so the call site doesn't need to
// know whether the current client has playback sync enabled. When sync is on
// the doc is the source of truth; when off, only the local store updates.

export function getEffectivePlaying(doc: Y.Doc): boolean {
  return useSyncPrefs.getState().syncPlayback
    ? getIsPlaying(doc)
    : useLocalPlayback.getState().isPlaying
}

export function getEffectivePaused(doc: Y.Doc): boolean {
  return useSyncPrefs.getState().syncPlayback
    ? getPlayPaused(doc)
    : useLocalPlayback.getState().paused
}

export function setPlayingIntent(doc: Y.Doc, playing: boolean, paused = false) {
  if (useSyncPrefs.getState().syncPlayback) {
    doc.transact(() => {
      setIsPlaying(doc, playing)
      setPlayPaused(doc, paused)
    })
  } else {
    useLocalPlayback.setState({ isPlaying: playing, paused })
  }
}

// Called when a user disables playback sync: copy the current shared state to
// the local store so their transport keeps playing where it was instead of
// jumping to the default (stopped) state.
export function snapshotPlaybackToLocal(doc: Y.Doc) {
  useLocalPlayback.setState({
    isPlaying: getIsPlaying(doc),
    paused: getPlayPaused(doc)
  })
}
