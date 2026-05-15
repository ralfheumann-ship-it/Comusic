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
- **Click** an empty spot on a track lane to drop a new loop at that bar (default 2 bars / 32 sixteenth notes)
- **Drag a loop's body** to reposition it; movement snaps to a sixteenth note
- **Drag a loop's left or right edge** to resize it; growing adds empty notes, shrinking trims them. Dragging the left edge keeps the right edge fixed and shifts the existing notes so they stay at the same absolute time.
- **Click** the project title or a track name to rename it
- **BPM** input in the top bar
- **Meter** dropdown — choose 4/4, 3/4, 6/8 or 12/8. Existing notes keep their position in time; only the bar grouping and grid lines change.
- **Loop song** checkbox — when on, playback restarts at the rightmost loop's right edge; when off, it stops there

## Grid

Each track lane shows three grid layers:

- A faint vertical line every sixteenth note
- A medium line every beat (in compound 6/8 and 12/8 this groups three eighth notes per beat)
- A bright line every bar (12, 16 or 24 sixteenth notes wide depending on the meter)

The note grid inside the loop editor lays out cells in `stepsPerBar` columns, so each row equals one bar in the current meter.

## Sharing a project as a file

- **Export** (top bar) downloads the current project as a `.comusic.json` snapshot.
- **Import .comusic.json file** (landing page) opens any snapshot in a fresh room — your own editable copy, independent of the original room.

Use the live room link for real-time co-editing, and export/import to send someone a forkable copy.

## Layout

- `apps/web` — Vite + React + Tailwind frontend with Tone.js audio
- `apps/relay` — minimal `y-websocket` relay server
