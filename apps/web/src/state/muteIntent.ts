import * as Y from 'yjs'
import {
  findTrack,
  getTracks,
  getTrackMuted,
  setTrackMuted,
  type YTrack
} from '../collab/schema'
import { useSyncPrefs } from './syncPrefs'
import { useLocalMutes } from './localMutes'

export function getEffectiveMuteForTrack(track: YTrack | undefined | null): boolean {
  if (!track) return false
  const trackId = track.get('id') as string
  return useSyncPrefs.getState().syncMutes
    ? getTrackMuted(track)
    : !!useLocalMutes.getState().mutes[trackId]
}

export function getEffectiveMuteById(doc: Y.Doc, trackId: string): boolean {
  if (useSyncPrefs.getState().syncMutes) {
    const t = findTrack(doc, trackId)
    return t ? getTrackMuted(t) : false
  }
  return !!useLocalMutes.getState().mutes[trackId]
}

export function setMuteIntent(doc: Y.Doc, trackId: string, muted: boolean) {
  if (useSyncPrefs.getState().syncMutes) {
    setTrackMuted(doc, trackId, muted)
  } else {
    useLocalMutes.getState().setMute(trackId, muted)
  }
}

// Called when a user disables mute sync: copy each track's shared mute state
// to the local overlay so audibility doesn't change at the moment of toggling.
export function snapshotMutesToLocal(doc: Y.Doc) {
  const tracks = getTracks(doc)
  const mutes: Record<string, boolean> = {}
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks.get(i)
    mutes[t.get('id') as string] = getTrackMuted(t)
  }
  useLocalMutes.setState({ mutes })
}
