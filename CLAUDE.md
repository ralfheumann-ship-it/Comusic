# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install all workspace deps (run from repo root).
- `npm run dev` — runs `apps/web` (Vite, http://localhost:5173) and `apps/relay` (y-websocket, ws://localhost:1234) concurrently.
- `npm run dev:web` / `npm run dev:relay` — run a single app.
- `npm run build` — type-check + Vite build of the web app (`tsc -b && vite build`).
- There is no test runner and no linter configured. Type errors surface via `npm run build` or your editor's TS server.
- The web app reads `VITE_RELAY_URL` at build time to override the default `ws://localhost:1234`.

## Architecture

This is an npm-workspaces monorepo with two apps:

- `apps/relay` — a ~10-line `y-websocket` relay (`ws` server + `setupWSConnection`). It is a dumb relay: no auth, no persistence, no per-room logic. Rooms exist for as long as someone is connected.
- `apps/web` — Vite + React + Tailwind + Tone.js + Yjs frontend. Routes: `/` (Landing) and `/room/:roomId` (Room).

### Yjs is the single source of truth for project state

All shared project state lives in a single `Y.Doc` per room, accessed via helpers in `apps/web/src/collab/schema.ts`. There is no Redux/Zustand store mirroring the doc — UI subscribes directly via the `useY(target, read)` hook in `collab/useY.ts`, which calls `observeDeep` on a Y type and re-reads.

When mutating shared state, always go through the `schema.ts` helpers (`addTrack`, `addLoop`, `toggleNote`, `setBpm`, `setIsPlaying`, etc.) so transactions, clamping, and structure stay consistent. Use `doc.transact` when batching multiple writes.

Shared structure (see `schema.ts`):
- `project` map: `bpm`, `isPlaying`, `bars`, `title`, `loopSong`
- `tracks` Y.Array of track maps: `id`, `name`, `color`, `muted`, `loops`
- per-track `loops` Y.Array of loop maps: `id`, `startBar`, `lengthBars`, `instrumentId`, `pulseWidth?`, `notes` (Y.Map<bool> keyed by step index 0..31), `pitches` (Y.Map<string>)

`NOTES_PER_LOOP = 32` is fixed; loop length is in bars but step count per loop is constant.

### State flow: Yjs → audio + UI, not the other way

Two side-effect modules attach to the doc when a Room mounts (`apps/web/src/ui/Room.tsx`):

1. `audio/transportBridge.ts` — observes `project` map and `tracks` deeply, and mirrors `bpm`/`isPlaying`/`loopSong`/song-end into `Tone.Transport`. The "stop at song end when not looping" behavior uses `Tone.Transport.scheduleOnce`. Audio context starts lazily on first user interaction (`audio/engine.ts` `startAudio()` calling `Tone.start()`); the bridge re-applies state when audio becomes available.
2. `audio/scheduler.ts` — keeps a `Map<trackId, TrackRunner>` and per-loop `LoopRunner`s in sync with the Y arrays via `observe`. Each `LoopRunner` owns a `Tone.Sequence` over 32 16th-note steps; the sequence callback checks `Tone.Transport.getTicksAtTime` to gate on the loop's `[startBar, startBar+lengthBars)` window, then triggers the instrument. `previewInstrument` is a separate factory instance used by `previewNote()` for UI auditioning (kept separate to avoid colliding with playback voices).

Local-only state lives in tiny Zustand stores, **not** Yjs:
- `state/playhead.ts` — the currently-lit step per loop, written from inside the Tone sequence via `Tone.Draw.schedule`.
- `state/songPosition.ts` — bars-elapsed for the top-bar progress display, polled via `requestAnimationFrame`.

This split matters: anything that needs to be the same for all collaborators belongs in Yjs; anything that's purely per-client view state belongs in a Zustand store or component state.

### Presence

`presence/identity.ts` stores `{name, color}` in `localStorage`. `Room.tsx` writes it onto `provider.awareness` (`setLocalStateField('user', ...)`). `presence/useAwareness.ts` subscribes to awareness changes and feeds the avatars in `TopBar`/`Presence`. Awareness is separate from the doc — never persisted, never relayed except via the y-websocket provider.

### Instruments

`audio/instruments/registry.ts` is the single source of truth for instrument IDs (`square`, `triangle`, `saw`, `pulse`, `pluck`, `kick`, `snare`, `hihat-closed`, `hihat-open`, `noise`). Each module exports a factory `(params) => { trigger, dispose }`. `isInstrumentPitched(id)` controls whether the loop UI exposes per-step pitch. The `pulse` instrument additionally reads `pulseWidth` from the loop (stored on the loop map, not the instrument). To add an instrument, write a factory and register it in `registry.ts` — both the scheduler instance and the preview instance use the same factory.

### Snapshot import/export

`sharing/snapshot.ts` exports the doc as base64-encoded `Y.encodeStateAsUpdate(doc)` wrapped in a JSON envelope (`format: "comusic.v1"`). Import works by stashing the decoded `Uint8Array` keyed by a freshly-minted `roomId` (`stashPendingImport`), then navigating to `/room/:roomId`; `Room.tsx` calls `getPendingImport(roomId)` after connecting and applies it with `Y.applyUpdate`. The stash is in-memory only and lives only long enough for the navigation to complete.

### Reconnection / seeding

`Room.tsx` waits for the provider's first `sync` event before calling `initProject` so that we don't clobber existing room state with defaults. If `provider.synced` is already true (reconnection), it seeds immediately. `initProject` is idempotent — it only sets keys that are `undefined`.
