# Hearthkeeper

A local TTRPG session dashboard, preserving the original React, Tailwind, and shadcn design. TanStack Router drives both frontends; TanStack Query loads campaign data and serializes saves. A validated workspace document stores multiple campaigns, reusable assets, and archived notes; the previous Drizzle/SQLite database is retained for migration. Tauri 2 supplies the desktop shell, native database/notebook files, and Philips Hue integration.

## Run

Use Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev
```

The existing Lovable/TanStack Start web build is retained (`pnpm build`). Normal launches read the workspace directly without initializing SQLite/WASM. The browser persists it in IndexedDB, alongside imported media. It is a local single-user tool, without player networking or account sync.

For the desktop app, install Rust and the Windows C++ build tools plus WebView2 (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)):

```sh
pnpm tauri dev
pnpm tauri build
```

The Windows installer is generated under `src-tauri/target/release/bundle/nsis/`. To build only an executable: `pnpm tauri build --no-bundle`. Desktop uses a separate static Vite entry so no Node server is needed in the installed application. The default installer target is Windows NSIS; other platforms require their Tauri prerequisites and an appropriate bundle target.

## Prepare a session

- Use **Campaigns** to create and edit campaign names, games, and players, or open another campaign. **General library** stores reusable sounds, music, and lighting; **Import from library** in a campaign copies assets with fresh IDs. Edits to either copy remain independent. **Ctrl/Cmd + K** opens the quick navigator.
- Open the menu in the header (or **More** on mobile) to manage scenes, sounds, music, and characters. Assets can belong to a scene or General. Higher priorities appear first.
- The sample sound/music names are preparation slots, not bundled recordings. Tap **Attach audio** to import your own files, or enter direct HTTP(S) media URLs. The same applies to additional scene backgrounds; a forest image is bundled as the default.
- File inputs accept drag-and-drop or click-to-browse, including backup restoration. Unsupported or multiple files are rejected with an explanation.
- Imported audio, images, and videos are copied into local media storage (250 MB limit per file). Local imports work offline. URLs require their host to remain available and support the WebView/browser media player. MP3/WAV audio and MP4/WebM video are useful choices; codec support depends on the OS/browser. Video backgrounds are muted and looped.
- Scene changes update visible assets and notes. Existing music, sound effects, and pinned character summaries remain until you stop/unpin them. Suggested music and lighting are deliberately applied by the DM, not automatically.
- Music uses one channel, with pause/resume and volume. Each one-shot sound invocation gets its own channel and may overlap, including repeated invocations of the same sound. A looping sound toggles off when clicked again. **Stop all audio** or **Ctrl/Cmd + .** stops everything, including pending loads.
- Active playback instances have individual progress, seek, pause/resume, and stop controls. Pause retains position; stop resets it. A bounded warm pool prepares up to 24 active-scene/general sources, prioritizing suggested music. HTTP audio loads progressively when supported by the media host; instant playback still depends on browser buffering and codec/network availability.
- Right-click sound or character entries for edit, duplicate, scope, deletion, and playback/pin actions. Selection drawers animate in 100 ms and respect reduced motion.
- Each sound or music track has its own configured volume (0–100%), multiplied by its master volume. Changes also apply to currently playing audio. Existing assets default to 100%.
- Trash buttons are subtle until hovered; confirmation buttons say **Delete**. Notes go straight into **General library → Note archive** with an Undo toast. The archive is sorted by campaign and scene and supports restoration or confirmed permanent deletion. Expired notes are purged after three calendar months in a deferred startup task (failure keeps them until a later launch). Other deletion requires confirmation, then offers an **Undo** toast for 12 seconds. Undo restores the item and its references while preserving subsequent edits.
- Add scene or general notes with the button or **Ctrl/Cmd + Enter**. Click a saved note to edit it. All notes are stored together, with scope and creation time; export produces one `notes.md`.
- Character summaries support freeform sheets/stats, scene/general scope, search, and persistent screen pins. Click any character or pinned summary to open the full sheet.

## Philips Hue

Bridge control is available in the desktop app. On the same local network as the bridge:

1. Find the bridge's IPv4 address in the Hue app's bridge settings.
2. Open **Lighting**, enter that address, press the bridge's physical link button, then **Pair bridge** within 30 seconds.
3. Choose a saved Hue scene. Create/edit lighting presets in the Hue app; use **Refresh scenes** after changes.

The last successful selection is remembered for each story scene. A preset is marked applied only after Hue confirms the request. Network, pairing, and bridge errors are shown rather than silently simulated. The native client uses the Hue v2 scene API, with a 10-second timeout and no HTTP redirects. Hue's self-signed TLS certificates are accepted only for validated private IPv4 bridge addresses and fixed Hue API operations.

Pairing credentials are stored locally in `hue.json` in the application data directory; they are excluded from backups and never sent to the web frontend. This file is not encrypted; protect it like other local application credentials. Re-pair to switch bridges. To revoke access, remove Hearthkeeper in Hue's connected-app settings.

### Experimental Bluetooth

**Lighting → Connect a Hue light** controls one nearby Bluetooth-capable Hue light in runtimes exposing Web Bluetooth (typically Chrome/Edge on HTTPS or localhost). Pairing uses the system chooser; power, brightness, and supported white-temperature controls use the GATT characteristics documented by [HueBLE](https://github.com/flip-dots/HueBLE). This is an unofficial protocol and has not been verified against physical hardware here. Firmware, pairing state, and browser support vary. Unsupported runtimes show the bridge fallback; the Tauri WebView may not expose Web Bluetooth. No native Bluetooth driver is installed. You can create reusable Bluetooth power/brightness presets in the general library and import them into campaigns.

## Storage and recovery

On Windows desktop, `%APPDATA%/app.hearthkeeper.desktop/` contains `workspace.json`, the generated `notes.md` for all campaigns, and previous `.bak` copies. Writes use a temporary file and rename. Optimistic UI changes roll back on persistence failure. Media remains in the WebView's IndexedDB. Keep the whole app data directory when moving installations.

On first launch without a workspace, existing `campaign.sqlite` (or earlier `campaign.json`/browser campaign records) is migrated into the initial campaign. The source is retained untouched. SQLite/WASM loads only for that migration. Invalid data is reported instead of replaced. Keep one app instance open when editing. The old Drizzle schema and tests remain to support safe migration.

Use **Campaign settings & backups → Export full backup** to export the current campaign (including its lighting and archived notes) and all referenced imported media in one JSON file. Restore validates data and imports assets under new IDs before replacing the campaign. Export first before replacing a campaign. Media URLs stay URLs; backup cannot make remote assets available offline. Browser and desktop data are separate; use backups to transfer between them. Clearing browser/WebView storage removes its media and browser campaign. Deleted scenes move their notes and assets to General. Unreferenced imported files are retained locally rather than immediately deleted.

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

Tests cover overlapping audio, independent volumes, loop toggling, stale playback cancellation, corrupt campaign rejection, scene deletion and undo, per-asset gain, drag-and-drop validation, priorities, notebook export, real SQLite migration/reopening/rollback, IndexedDB persistence, and media restoration. Real Hue hardware is required for bridge and Bluetooth verification.

The repository remains connected to Lovable. Do not rewrite published Git history.
