# Hearthkeeper

A local TTRPG session dashboard, preserving the original React, Tailwind, and shadcn design. TanStack Router drives both frontends; TanStack Query loads campaign data and serializes saves. Drizzle ORM manages relational SQLite tables for campaign settings, scenes, audio, characters, and notes. Tauri 2 supplies the desktop shell, native database/notebook files, and Philips Hue integration.

## Run

Use Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev
```

The existing Lovable/TanStack Start web build is retained (`pnpm build`). Both versions run SQLite through the bundled SQL.js WebAssembly engine and Drizzle. The browser persists the SQLite file in IndexedDB, alongside imported media. It is a local single-user tool, without player networking or account sync.

For the desktop app, install Rust and the Windows C++ build tools plus WebView2 (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)):

```sh
pnpm tauri dev
pnpm tauri build
```

The Windows installer is generated under `src-tauri/target/release/bundle/nsis/`. To build only an executable: `pnpm tauri build --no-bundle`. Desktop uses a separate static Vite entry so no Node server is needed in the installed application. The default installer target is Windows NSIS; other platforms require their Tauri prerequisites and an appropriate bundle target.

## Prepare a session

- Open the menu in the header (or **More** on mobile) to manage scenes, sounds, music, and characters. Assets can belong to a scene or General. Higher priorities appear first.
- The sample sound/music names are preparation slots, not bundled recordings. Tap **Attach audio** to import your own files, or enter direct HTTP(S) media URLs. The same applies to additional scene backgrounds; a forest image is bundled as the default.
- File inputs accept drag-and-drop or click-to-browse, including backup restoration. Unsupported or multiple files are rejected with an explanation.
- Imported audio, images, and videos are copied into local media storage (250 MB limit per file). Local imports work offline. URLs require their host to remain available and support the WebView/browser media player. MP3/WAV audio and MP4/WebM video are useful choices; codec support depends on the OS/browser. Video backgrounds are muted and looped.
- Scene changes update visible assets and notes. Existing music, sound effects, and pinned character summaries remain until you stop/unpin them. Suggested music and lighting are deliberately applied by the DM, not automatically.
- Music uses one channel, with pause/resume and volume. Each one-shot sound invocation gets its own channel and may overlap, including repeated invocations of the same sound. A looping sound toggles off when clicked again. **Stop all audio** or **Ctrl/Cmd + .** stops everything, including pending loads.
- Each sound or music track has its own configured volume (0–100%), multiplied by its master volume. Changes also apply to currently playing audio. Existing assets default to 100%.
- Trash buttons are subtle until hovered. Deletion requires confirmation, then offers an **Undo** toast for 12 seconds. Undo restores the item and its references while preserving subsequent edits.
- Add scene or general notes with the button or **Ctrl/Cmd + Enter**. Click a saved note to edit it. All notes are stored together, with scope and creation time; export produces one `notes.md`.
- Character summaries support freeform sheets/stats, scene/general scope, search, and persistent screen pins. Click any character or pinned summary to open the full sheet.

## Philips Hue

Hue control is available in the desktop app. On the same local network as the bridge:

1. Find the bridge's IPv4 address in the Hue app's bridge settings.
2. Open **Lighting**, enter that address, press the bridge's physical link button, then **Pair bridge** within 30 seconds.
3. Choose a saved Hue scene. Create/edit lighting presets in the Hue app; use **Refresh scenes** after changes.

The last successful selection is remembered for each story scene. A preset is marked applied only after Hue confirms the request. Network, pairing, and bridge errors are shown rather than silently simulated. The native client uses the Hue v2 scene API, with a 10-second timeout and no HTTP redirects. Hue's self-signed TLS certificates are accepted only for validated private IPv4 bridge addresses and fixed Hue API operations.

Pairing credentials are stored locally in `hue.json` in the application data directory; they are excluded from backups and never sent to the web frontend. This file is not encrypted; protect it like other local application credentials. Re-pair to switch bridges. To revoke access, remove Hearthkeeper in Hue's connected-app settings.

## Storage and recovery

On Windows desktop, `%APPDATA%/app.hearthkeeper.desktop/` contains `campaign.sqlite`, `notes.md`, and previous `.bak` copies. Drizzle saves in a SQLite transaction, then the native layer persists the database using a temporary file and rename. Failed persistence rolls back the in-memory database. The notebook is a generated companion to the campaign: edit through the app, not directly in `notes.md` (a later save regenerates it). Media is stored separately in the WebView's IndexedDB. Keep the whole app data directory when moving installations, or use a full backup.

Existing `campaign.json` and browser campaign records migrate automatically on first launch when no SQLite database exists; legacy data is retained. Corrupt databases are reported rather than overwritten. Schema and generated migrations live in `src/db/`; use `pnpm db:generate` after schema changes and register the new migration in the database initialization sequence. `pnpm db:check` checks migration metadata. The app uses one local campaign per installation; keep one app instance open when editing.

Use **Campaign settings & backups → Export full backup** to export campaign data and all referenced imported media in one JSON file. Restore validates data and imports assets under new IDs before replacing the campaign. Export first before replacing a campaign. Media URLs stay URLs; backup cannot make remote assets available offline. Browser and desktop data are separate; use backups to transfer between them. Clearing browser/WebView storage removes its media and browser campaign. Deleted scenes move their notes and assets to General. Unreferenced imported files are retained locally rather than immediately deleted.

No files, notes, or credentials are uploaded by Hearthkeeper. External media URLs and Google Fonts use their respective hosts. Fonts fall back to local serif/sans-serif when offline.

## Validate

```sh
pnpm test
pnpm db:check
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm build:desktop
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml
```

Tests cover overlapping audio, independent volumes, loop toggling, stale playback cancellation, corrupt campaign rejection, scene deletion and undo, per-asset gain, drag-and-drop validation, priorities, notebook export, real SQLite migration/reopening/rollback, IndexedDB persistence, and media restoration. A real Hue bridge is required for hardware verification.

The repository remains connected to Lovable. Do not rewrite published Git history.
