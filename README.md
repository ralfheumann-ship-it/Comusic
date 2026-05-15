# comusic

Collaborative web sequencer for retro / 8-bit style loops. Multiple users join the same room and edit project title, tracks, loop containers, and step-grid notes together in real time. Each user runs audio locally; project state syncs via Yjs through a WebSocket relay.

## Run locally

```
npm install
npm run dev
```

This starts both apps:

- Web: http://localhost:5173
- Relay (Yjs WebSocket): ws://localhost:1234

On the landing page, set your name (saved in your browser), then click **New project** or **Join existing room id**. Inside a room, share the URL with the **Copy link** button; anyone opening it joins the same project, sees your avatar in the top bar, and can edit alongside you.

## Controls

- **Space** — play / stop (anywhere outside an input)
- **Click** a step cell to toggle on/off
- **Drag a cell up/down** to set its pitch
- **Click** a track lane to add a loop at that bar
- **Drag** a loop horizontally to reposition
- **Click** the project title or a track name to rename it
- **Loop song** checkbox in the top bar — when on, playback restarts at the rightmost loop's right edge; when off, it stops there

## Sharing a project as a file

- **Export** (top bar) downloads the current project as a `.comusic.json` snapshot.
- **Import .comusic.json file** (landing page) opens any snapshot in a fresh room — your own editable copy, independent of the original room.

Use the live room link for real-time co-editing, and export/import to send someone a forkable copy.

## Layout

- `apps/web` — Vite + React + Tailwind frontend with Tone.js audio
- `apps/relay` — minimal `y-websocket` relay server
