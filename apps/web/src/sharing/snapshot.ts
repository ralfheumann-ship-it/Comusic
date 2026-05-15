import * as Y from 'yjs'

export const SNAPSHOT_FORMAT = 'comusic.v1'

interface Envelope {
  format: string
  title: string
  exportedAt: string
  data: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function exportProject(doc: Y.Doc, title: string): string {
  const update = Y.encodeStateAsUpdate(doc)
  const envelope: Envelope = {
    format: SNAPSHOT_FORMAT,
    title,
    exportedAt: new Date().toISOString(),
    data: bytesToBase64(update)
  }
  return JSON.stringify(envelope, null, 2)
}

export function parseImport(text: string): Uint8Array {
  let envelope: Envelope
  try {
    envelope = JSON.parse(text) as Envelope
  } catch {
    throw new Error('Not a valid JSON file')
  }
  if (envelope.format !== SNAPSHOT_FORMAT) {
    throw new Error(`Unrecognized format "${envelope.format ?? 'missing'}"`)
  }
  if (typeof envelope.data !== 'string') {
    throw new Error('Snapshot is missing data field')
  }
  return base64ToBytes(envelope.data)
}

export function slugifyTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'
}

const pendingImports = new Map<string, Uint8Array>()

export function stashPendingImport(roomId: string, bytes: Uint8Array) {
  pendingImports.set(roomId, bytes)
}

export function getPendingImport(roomId: string): Uint8Array | null {
  return pendingImports.get(roomId) ?? null
}
