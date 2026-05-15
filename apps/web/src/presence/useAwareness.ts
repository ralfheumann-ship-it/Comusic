import { useEffect, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import type { Identity } from './identity'

export type Awareness = WebsocketProvider['awareness']

export interface PresenceUser extends Identity {
  clientId: number
  isSelf: boolean
}

export function useAwareness(awareness: Awareness | null): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([])
  useEffect(() => {
    if (!awareness) return
    const update = () => {
      const states = awareness.getStates()
      const list: PresenceUser[] = []
      states.forEach((value, clientId) => {
        const v = value as { user?: Identity } | undefined
        if (v?.user?.name && v.user.color) {
          list.push({
            name: v.user.name,
            color: v.user.color,
            clientId,
            isSelf: clientId === awareness.clientID
          })
        }
      })
      list.sort((a, b) => (a.isSelf === b.isSelf ? a.clientId - b.clientId : a.isSelf ? -1 : 1))
      setUsers(list)
    }
    awareness.on('change', update)
    update()
    return () => {
      awareness.off('change', update)
    }
  }, [awareness])
  return users
}
