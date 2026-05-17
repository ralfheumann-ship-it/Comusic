import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { connectRoom, disconnectRoom, type Room as RoomState } from '../collab/doc'
import { initProject } from '../collab/schema'
import { getEffectivePlaying, setPlayingIntent } from '../state/playbackIntent'
import { attachTransport, detachTransport } from '../audio/transportBridge'
import { attachScheduler, detachScheduler } from '../audio/scheduler'
import { isAudioStarted, startAudio } from '../audio/engine'
import { attachSongPositionTracker, detachSongPositionTracker } from '../state/songPosition'
import { getIdentity } from '../presence/identity'
import { getPendingImport } from '../sharing/snapshot'
import TopBar from './TopBar'
import TracksArea from './TracksArea'
import LoopView from './LoopView'
import type { LoopSelection } from './types'

export default function Room() {
  const { roomId } = useParams()
  const [room, setRoom] = useState<RoomState | null>(null)
  const [selected, setSelected] = useState<LoopSelection | null>(null)

  useEffect(() => {
    if (!roomId) return
    const r = connectRoom(roomId)
    setRoom(r)

    const pending = getPendingImport(roomId)
    if (pending) {
      try {
        Y.applyUpdate(r.doc, pending)
      } catch (err) {
        console.error('Failed to apply imported project', err)
      }
    }

    r.provider.awareness.setLocalStateField('user', getIdentity())

    const seed = () => initProject(r.doc)
    let seeded = false
    const onSync = (synced: boolean) => {
      if (synced && !seeded) {
        seeded = true
        r.provider.off('sync', onSync)
        seed()
      }
    }
    if (r.provider.synced) {
      seeded = true
      seed()
    } else {
      r.provider.on('sync', onSync)
    }

    attachTransport(r.doc)
    attachScheduler(r.doc)
    attachSongPositionTracker()

    return () => {
      detachSongPositionTracker()
      detachScheduler()
      detachTransport()
      disconnectRoom()
      setRoom(null)
      setSelected(null)
    }
  }, [roomId])

  useEffect(() => {
    if (!room) return
    const onKey = async (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const t = e.target as HTMLElement | null
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t && t.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      if (!isAudioStarted()) await startAudio()
      setPlayingIntent(room.doc, !getEffectivePlaying(room.doc))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room])

  if (!room) return null

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <TopBar doc={room.doc} roomId={roomId!} awareness={room.provider.awareness} />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <TracksArea doc={room.doc} onSelectLoop={setSelected} selected={selected} />
        {selected && (
          <LoopView
            doc={room.doc}
            selection={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}
