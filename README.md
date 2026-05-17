# comusic

Collaborative web sequencer for retro / 8-bit style loops. Multiple users join the same room and edit project title, tracks, loop containers, and step-grid notes together in real time. Each user runs audio locally; project state syncs via Yjs through a WebSocket relay.

## Highlights

- **Real-time multiplayer** — every change (notes, loops, tempo, meter, mutes, names) syncs instantly across all connected clients. Live presence avatars in the top bar.
- **Local-first audio** — synthesis runs in each browser via Tone.js. The relay only transports state, never audio; no server-side mixing or recording.
- **Step sequencer with depth** — variable-length loops on each track, 16th-note resolution, time signatures `4/4` / `3/4` / `6/8` / `12/8`, and an editable loop range across the song for selective playback.
- **Note grid you can play** — paint by dragging, drop notes with the last-used pitch, change pitch by dragging vertically (with a live overlay and audio preview), reposition by dragging horizontally, free-place with `Ctrl`, erase with right-click + drag. No popovers.
- **Built-in instrument library** — twenty Tone.js instruments grouped into synth leads (`square`, `triangle`, `saw`, `pulse`, `pluck`, `lead`, `pad`, `fat` super-saw, `poly-synth`, `fm` bells), basses (`sub-bass`, `fm-bass`, `acid-bass`), drums (`kick`, `snare`, `clap`, hi-hats), and percussion (`cowbell`, `crash`, `noise`). Adding more is a two-file change.
- **Opt-in collaboration** — per-client Sync toggles let you go off-grid on **playback** or **track mutes** so you can solo or A/B without affecting anyone else.
- **Frictionless sharing** — paste-in room links, snapshot export to `.comusic.json`, in-room **Fork** that opens the current state in a brand-new room.
- **Mobile-friendly** — full-screen loop editor overlay on phones, icon-only toolbar at narrow widths, collapsible track headers (tap a color dot to expand all), proper viewport-height scrolling on touch devices.
- **No persistence required** — the relay is intentionally dumb. Rooms exist while someone is connected; use export/fork to save work.

## Run locally

```
npm install
npm run dev
```

This starts both apps:

- Web: http://localhost:5173
- Relay (Yjs WebSocket): ws://localhost:1234

On the landing page, set your name (saved in your browser), then click **New project** or **Join existing room id**. Inside a room, share the URL with the **Copy link** button; anyone opening it joins the same project, sees your avatar in the top bar, and can edit alongside you.

## Transport and toolbar

- **Play / Stop** — green play button starts from the play-range start; while playing it turns red and shows a stop icon (full stop, rewinds to start). **Space** also toggles play/stop anywhere outside an input.
- **BPM** and **Meter** — type a BPM, choose `4/4`, `3/4`, `6/8`, or `12/8`. Existing notes keep their position in time; only bar grouping and grid lines change.
- **Sync** (Link icon) — opens a popover with per-client toggles for **playback** (play / stop) and **track mutes**. With a switch on you sync that aspect with the rest of the room (the default); off, your local control diverges without affecting others. Switching back on snaps you to the room state.
- **Loop song** (Repeat icon) — when on, playback wraps at the play-range end; when off, it stops there.
- **Copy link / Export / Fork / Leave** (right side) — share the room URL, download the project as a `.comusic.json` snapshot, open a fork of the current state in a fresh room, or return to the landing page.
- The top row also shows the room id and presence avatars.

## Tracks and loops

Each track has a thin header column with just a color dot. Tap a color dot to expand **all** track headers — the name field, mute toggle, and remove control appear. Remove asks for a second click to confirm (within ~3 seconds).

In a track lane:

- **Click empty grid** → drops a 2-bar loop at that bar.
- **Drag a loop's body** → reposition it; snaps to a sixteenth note.
- **Drag a loop's left or right edge** → resize it. Growing adds empty steps; shrinking trims them. Dragging the left edge keeps the right edge fixed in time.
- **Hold Ctrl/⌘ and drag the lane** → pans the tracks viewport horizontally.
- Click a loop to open it in the loop editor on the right (mobile: full-screen overlay; tap ✕ to close).
- Tracks always have a couple of empty bars beyond the last loop so there's room to click for adding more.

## Loop editor / note grid

Cells are square. Rows always represent a clean musical chunk: **8 cells per row in 4/4**, **6 cells per row in 3/4, 6/8, and 12/8** (one compound pulse per row in `6/8` and `12/8`).

Note interaction:

- **Left-click an empty cell** → paints a note using the last-placed pitch. Hold and drag horizontally within the same row to keep painting.
- **Vertical drag while painting** → live-pitches the most recently painted cell; an overlay shows the current pitch and previews the sound.
- **Left-click an existing note** → previews the note.
- **Left-drag an existing note** → horizontal moves it within its row, vertical changes its pitch.
- **Hold Ctrl/⌘ while dragging** → unconstrained 2D placement (any cell, pitch locked).
- **Right-click** → deletes the note. Right-click and drag to erase a sweep.

The loop editor pane also exposes the loop's instrument (and `pulseWidth` for the `pulse` instrument).

## Play range

The thin bar above the tracks is the **play range**. Drag a region to define it (start, end, or move with the middle handles). Tap the ✕ in the range header to clear it. Playback always honors the range; `Loop song` wraps inside it.

## Instruments

Categories shown in the loop editor dropdown:

- **Synth lead** — `square`, `triangle`, `saw`, `pulse` (with `pulseWidth`), `pluck`, `lead` (saw + chorus), `pad` (slow AM pad + reverb), `fat` (super-saw, OB-Xa style), `poly-synth` (overlapping release tails), `fm` (DX7-flavored FM bells)
- **Bass** — `sub-bass` (sine + lowpass), `fm-bass` (FMSynth, punchy), `acid-bass` (303-style mono synth + filter env + distortion)
- **Drums** — `kick`, `snare`, `clap`, `hihat-closed`, `hihat-open`
- **Percussion / FX** — `cowbell`, `crash`, `noise`

Pitched instruments expose per-step pitch in the note grid; unpitched ones don't.

To add another, drop a factory file in `apps/web/src/audio/instruments/` exporting `(params) => { trigger, dispose }`, then register it in `apps/web/src/audio/instruments/registry.ts`.

## Sharing a project as a file

- **Export** (top bar) downloads the current project as a `.comusic.json` snapshot.
- **Import .comusic.json file** (landing page) opens any snapshot in a fresh room — your own editable copy, independent of the original room.
- **Fork** in a room does the same thing without leaving: it snapshots the current doc and navigates you to a brand-new room with that state pre-loaded.

Use the live room link for real-time co-editing, and export/fork/import to send someone a forkable copy.

## Layout

- `apps/web` — Vite + React + Tailwind frontend with Tone.js audio
- `apps/relay` — minimal `y-websocket` relay server
