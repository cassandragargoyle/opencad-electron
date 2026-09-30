# OpenCAD Electron

Desktop application for the [OpenCAD](https://github.com/cassandragargoyle/opencad) project, built on [Electron](https://www.electronjs.org/).

## About OpenCAD

OpenCAD is a browser-native, AI-powered, open-source BIM platform. It combines the accessibility of tools like Figma (browser-native, WASM, real-time collaboration) with the feature depth of tools like Archicad (BIM modeling, documentation, code compliance).

Key features:

- **2D drafting** – lines, arcs, dimensions, annotations, layers, snapping
- **3D modeling** – extrude, boolean operations, parametric BIM elements (walls, slabs, doors, windows, roofs)
- **Real-time collaboration** – simultaneous editing with CRDT-based conflict resolution
- **Full offline support** – automatic sync when reconnected
- **File interoperability** – import/export IFC, DWG, DXF, PDF, glTF, OBJ, STL, STEP and more
- **AI features** – floor plan generation from natural language, code compliance checking, natural-language model edits

## Relationship to the OpenCAD source code

The OpenCAD source code is maintained in a separate repository:

- Repository: <https://github.com/cassandragargoyle/opencad>
- License: Apache 2.0

OpenCAD is a monorepo (pnpm + Turborepo) with packages in the `packages/` directory:

| Package | Description |
| ------- | ----------- |
| `app` | Web application (`@opencad/app`, Vite) |
| `desktop` | Desktop application built on Tauri v2 (`@opencad/desktop`) |
| `document` | Document model |
| `shared` | Shared code |
| `ai` | AI orchestration |
| `sync-rs` | Sync engine (Rust/WASM) |

This repository provides an alternative, Electron-based desktop application (alongside the official Tauri-based variant in `packages/desktop`).

OpenCAD is included as a git submodule in `submodule/opencad`.

## How it works

- The Electron main process loads the OpenCAD web app (`packages/app`) — either the production build served over a custom `opencad://app/` scheme, or the Vite dev server.
- The web app detects the desktop shell via `window.__TAURI__`. The preload script (`src/preload/preload.ts`) exposes a compatible bridge (`core.invoke`, `event.listen`) that forwards calls to the main process over IPC, so the upstream app runs unchanged.
- Desktop commands (`src/main/commands.ts`) mirror the Tauri backend: project storage, crash recovery and recent files in SQLite (`node:sqlite`, same schema as Tauri), native file I/O and dialogs, window management.
- The native menu (`src/main/menu.ts`) sends the same `menu` events as the Tauri app.

Data is stored in `opencad.db` in Electron's `userData` directory (e.g. `~/.config/OpenCAD` on Linux).

## Getting started

Prerequisites: Node.js 22+, pnpm 9+, and the toolchain OpenCAD itself needs to build its web app (see the OpenCAD README).

```bash
git clone --recurse-submodules <this repo>
make install   # init submodule, install dependencies
make opencad   # build the OpenCAD web app
make start     # run the desktop app
```

Run `make help` to list all targets:

| Target | Description |
| ------ | ----------- |
| `make install` | Initialise the submodule and install dependencies |
| `make opencad` | Build the OpenCAD web app (`packages/app/dist`) |
| `make start` | Run the app with the built web app |
| `make dev` | Run the app against the Vite dev server (hot reload) |
| `make check` | Type-check and run unit tests |
| `make dist` | Package installers into `release/` (electron-builder) |

## Debugging in VS Code

Launch configurations are in `.vscode/launch.json`:

| Configuration | Description |
| ------------- | ----------- |
| Electron: Main | Debug the main process with the built web app |
| Electron: Main (Vite dev server) | Starts the Vite dev server, then debugs the main process against it |
| Electron: Renderer | Attach to the renderer (web app) on port 9222 |
| Electron: Main + Renderer | Debug both processes at once (also available with the Vite dev server) |
| Vitest: current file | Debug the unit tests in the open file |

Breakpoints in the web app work best with the Vite dev server variant, which serves source maps.

## Known limitations

- Sign-in with OAuth popups (Firebase) may not work, because the `opencad://app` origin is not an authorised Firebase domain.
- Like the Tauri backend, local AI, file watching, tray status, auto-update and browser–desktop sync are stubs.

## License

The code in this repository is licensed under the [MIT License](LICENSE).

OpenCAD (the `submodule/opencad` submodule) is licensed separately under the [Apache License 2.0](https://github.com/cassandragargoyle/opencad/blob/main/LICENSE). Packaged builds include the OpenCAD web app together with its license.
