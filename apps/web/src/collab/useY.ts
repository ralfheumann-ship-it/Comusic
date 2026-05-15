import { useEffect, useState } from 'react'
import * as Y from 'yjs'

type AnyYType = Y.AbstractType<any>

export function useY<T>(target: AnyYType | null | undefined, read: () => T): T {
  const [value, setValue] = useState<T>(read)
  useEffect(() => {
    if (!target) return
    const update = () => setValue(read())
    target.observeDeep(update)
    update()
    return () => target.unobserveDeep(update)
  }, [target])
  return value
}
