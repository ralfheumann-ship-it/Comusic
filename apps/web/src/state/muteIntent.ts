import * as Y from 'yjs'
import {
  findTrack,
  getTracks,
  getTrackMuted,
  getTrackSolo,
  setTrackMuted,
  setTrackSolo,
  type YTrack
} from '../collab/schema'
import { useSyncPrefs } from './syncPrefs'
import { useLocalMutes } from './localMutes'
import { useLocalSolos } from './localSolos'

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

export function getEffectiveSoloForTrack(track: YTrack | undefined | null): boolean {
  if (!track) return false
  const trackId = track.get('id') as string
  return useSyncPrefs.getState().syncMutes
    ? getTrackSolo(track)
    : !!useLocalSolos.getState().solos[trackId]
}

export function setSoloIntent(doc: Y.Doc, trackId: string, solo: boolean) {
  if (useSyncPrefs.getState().syncMutes) {
    setTrackSolo(doc, trackId, solo)
  } else {
    useLocalSolos.getState().setSolo(trackId, solo)
  }
}

export function isAnyTrackEffectivelySoloed(doc: Y.Doc): boolean {
  if (useSyncPrefs.getState().syncMutes) {
    const tracks = getTracks(doc)
    for (let i = 0; i < tracks.length; i++) {
      if (getTrackSolo(tracks.get(i))) return true
    }
    return false
  }
  const solos = useLocalSolos.getState().solos
  for (const k in solos) if (solos[k]) return true
  return false
}

export function isTrackEffectivelyAudible(track: YTrack, doc: Y.Doc): boolean {
  if (getEffectiveMuteForTrack(track)) return false
  if (isAnyTrackEffectivelySoloed(doc) && !getEffectiveSoloForTrack(track)) return false
  return true
}

// Called when a user disables mute sync: copy each track's shared mute and solo
// state to the local overlays so audibility doesn't change at the toggle moment.
export function snapshotMutesToLocal(doc: Y.Doc) {
  const tracks = getTracks(doc)
  const mutes: Record<string, boolean> = {}
  const solos: Record<string, boolean> = {}
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks.get(i)
    const id = t.get('id') as string
    mutes[id] = getTrackMuted(t)
    solos[id] = getTrackSolo(t)
  }
  useLocalMutes.setState({ mutes })
  useLocalSolos.setState({ solos })
}
