import * as Y from 'yjs'
import { useY } from '../collab/useY'
import { addTrack, getTracks, type YTrack } from '../collab/schema'
import TrackLane from './TrackLane'
import type { LoopSelection } from './types'

interface Props {
  doc: Y.Doc
  onSelectLoop: (sel: LoopSelection) => void
  selected: LoopSelection | null
}

export default function TracksArea({ doc, onSelectLoop, selected }: Props) {
  const tracksArr = getTracks(doc)
  const tracks = useY<YTrack[]>(tracksArr, () => tracksArr.toArray())

  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-2 p-4">
        {tracks.map((track) => (
          <TrackLane
            key={track.get('id') as string}
            doc={doc}
            track={track}
            onSelectLoop={onSelectLoop}
            selected={selected}
          />
        ))}
        <button
          onClick={() => addTrack(doc)}
          className="px-3 py-2 text-sm font-mono bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 rounded text-zinc-400"
        >
          + Add track
        </button>
      </div>
    </div>
  )
}
