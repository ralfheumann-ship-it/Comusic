import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? 'ws://localhost:1234'

export interface Room {
  doc: Y.Doc
  provider: WebsocketProvider
  roomId: string
}

let active: Room | null = null

export function connectRoom(roomId: string): Room {
  if (active && active.roomId === roomId) return active
  if (active) disconnectRoom()

  const doc = new Y.Doc()
  const provider = new WebsocketProvider(RELAY_URL, roomId, doc)
  active = { doc, provider, roomId }
  return active
}

export function getRoom(): Room | null {
  return active
}

export function disconnectRoom() {
  if (!active) return
  active.provider.disconnect()
  active.provider.destroy()
  active.doc.destroy()
  active = null
}
