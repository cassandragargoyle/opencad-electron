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
|---------|-------------|
| `app` | Web application (`@opencad/app`, Vite) |
| `desktop` | Desktop application built on Tauri v2 (`@opencad/desktop`) |
| `document` | Document model |
| `shared` | Shared code |
| `ai` | AI orchestration |
| `sync-rs` | Sync engine (Rust/WASM) |

This repository provides an alternative, Electron-based desktop application (alongside the official Tauri-based variant in `packages/desktop`).

## License

OpenCAD is licensed under the [Apache License 2.0](https://github.com/cassandragargoyle/opencad/blob/main/LICENSE).
