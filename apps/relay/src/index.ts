import { WebSocketServer } from 'ws'
// @ts-expect-error - y-websocket ships JS without types for this submodule
import { setupWSConnection } from 'y-websocket/bin/utils'

const port = Number(process.env.PORT ?? 1234)
const wss = new WebSocketServer({ port })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true })
})

console.log(`[relay] y-websocket relay listening on ws://localhost:${port}`)
