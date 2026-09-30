# Development Instructions

# AGENTS.md (root)

@docs/FEATURES_OVERVIEW.md
@docs/contributing/
@docs/contributing/ISSUE-DEVELOPMENT-METHODOLOGY.md
@docs/contributing/TRANSLATION-WORKFLOW.md
@docs/contributing/TESTING_METHODOLOGY.md
@docs/contributing/GITHUB-WORKFLOW.md

## Project Information

- **Local Development Repository**: <http://gitea:3000/CassandraGargoyle/opencad-electron> (primary development)
- **GitHub Repository**: <https://github.com/cassandragargoyle/opencad-electron/> (public mirror)
- **Project Name**: OpenCAD Electron (Electron-based desktop application for [OpenCAD](https://github.com/cassandragargoyle/opencad))
- **Primary Language**: TypeScript
- **Platforms**: Windows, Linux, macOS (cross-platform)

## Security

- Never run destructive commands without confirmation

## Project Structure

/docs/adr - Architecture Decision Records.
/src/main - Electron main process (window, `opencad://` protocol, desktop commands, menu, SQLite storage).
/src/preload - Preload script exposing the Tauri-compatible `window.__TAURI__` bridge.
/submodule/opencad - OpenCAD git submodule (web app is built from `packages/app`).
/.vscode - Debug launch configurations and tasks.

## Coding Guidelines & Development Instructions

### Strict Rules

- Code, code comments, and user messages must be in English.
- Build only one application (OpenCAD); don't create additional Electron apps, entry points or executables.
- Communicate with me in Czech, or when not possible, in English.
- If implementing a request could lead to loss of implemented code (e.g., when manipulating git), it's necessary to highlight this prominently
  and always require confirmation.
- Don't add "Generated with [Claude Code](https://claude.ai/code) Co-Authored-By: Claude <noreply@anthropic.com>" to code or other files
- **NEVER add "Co-Authored-By: Claude <noreply@anthropic.com>" to code files or git commits** - attribution not required
- When implementing checks, or installation of any program or package, use standard portunix functionality (`portunix install …`).
- **CONTAINER USAGE**: Before using word "docker" in code, require user approval. Use "portunix container" commands instead of direct docker commands.
- Never apologize - focus on solutions and explanations instead.
- All Markdown files must follow [Markdown Style Guide](docs/contributing/MARKDOWN-STYLE.md) — document categories,
  heading rules, metadata blocks, section numbering
- **Never modify `submodule/opencad`** in this repository. Changes to OpenCAD belong to the
  [OpenCAD repository](https://github.com/cassandragargoyle/opencad); submodule bumps are separate commits.
- **Keep the desktop bridge Tauri-compatible** — command names and argument shapes in `src/main/commands.ts` must match
  `submodule/opencad/packages/desktop/src-tauri/src/main.rs`, so the OpenCAD web app runs unchanged.

### General Principles

- Follow existing conventions and styles in the project
- Always explore existing code first before creating new code
- Prefer editing existing files over creating new ones
- When asked to preview a .md file, run command: `marktext "path/to/file.md"`
- All texts in programs (messages, labels, constants) are in English
- Comments are in English and are not sentences (no period at the end)
- When changing version, don't forget the `version` field in `package.json`
- Keep the renderer secure: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; expose APIs only via the preload bridge

### Build

- Build the Electron app with: `make build` (compiles `src/` to `dist/` via `tsc`)
- Build the OpenCAD web app with: `make opencad` (output in `submodule/opencad/packages/app/dist`)
- Run with: `make start`, or `make dev` against the Vite dev server
- Run `make help` for all targets

### Python Tooling (uv)

- The project currently has no Python code. If Python scripts are added to `scripts/`, manage them with
  [uv](https://docs.astral.sh/uv/) — same approach as Portunix (ADR-039 in the Portunix repository)
- Provision: `uv sync`
- Run scripts without activation: `uv run scripts/<name>.py …`
- Run tests: `uv run pytest test/…`
- Install uv: `portunix install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Manifest is `pyproject.toml` + `uv.lock` at repo root; do NOT introduce
  `requirements.txt`

### Release Management

- **IMPORTANT**: Project uses electron-builder for packaging:
  - `package.json` → `build` section - complete electron-builder configuration (targets, icons, file associations,
    bundled OpenCAD web app and license)
  - `make dist` - **MAIN PACKAGING COMMAND** - builds the OpenCAD web app, compiles the Electron app and creates installers in `release/`
  - **DON'T CREATE** new release scripts without agreement - use `make dist`
  - The OpenCAD web app and its license (`licenses/OpenCAD-LICENSE`) must be part of every packaged build
  - Version is taken from `package.json`
  - **WARNING**: packaged builds contain the OpenCAD submodule commit that is currently checked out - verify it with `git submodule status`

#### Testing Release Build

For testing without creating a real release:

```bash
# 1. Test packaging for the current platform
make dist

# 2. Run the packaged app from release/ (e.g. the AppImage on Linux)
./release/*.AppImage

# 3. Full release test with SNAPSHOT version
#    Use current version + 1 patch + SNAPSHOT suffix in package.json
#    e.g. 0.1.1-SNAPSHOT if current is 0.1.0
```

- **Use SNAPSHOT suffix** for test builds (e.g., 0.1.1-SNAPSHOT for current 0.1.0)
- Check current version: `node -p "require('./package.json').version"`

### ADR (Architecture Decision Record)

- Only Architect can write to ADR.

### Issue Tracking & Documentation

- Issue tracking and documentation is located in `docs/issues/`
- Directory layout: active issues live in `docs/issues/internal/`; completed
  issues (`✅ Implemented` / `❌ Closed`) are archived in `docs/issues/internal/done/`
- `docs/issues/README.md` holds two tables — **Active** and **Done** — mirroring
  the layout used by `portunix-synapse`
- GitHub issues are mirrored to local documentation in `docs/issues/internal/`
- Before creating new features, check existing issues in `docs/issues/README.md`

#### Issue workflow process

1. **Creating new issue:**
   - Create file `docs/issues/internal/{number}-{name}.md` (e.g., `175-feature-name.md`)
   - Add row to the **Active** table in `docs/issues/README.md`
   - Create corresponding GitHub issue with same content
   - Keep both files synchronized

2. **Updating existing issue:**
   - Edit local markdown file in `docs/issues/internal/`
   - Update status in `docs/issues/README.md`
   - Synchronize changes to GitHub issue

3. **Completing issue (✅ Implemented or ❌ Closed):**
   - Change status to `✅ Implemented` (or `❌ Closed`) in the issue file header
   - Archive the file — move it to `internal/done/` preserving git history:

     ```bash
     git mv docs/issues/internal/{number}-{name}.md \
            docs/issues/internal/done/{number}-{name}.md
     ```

   - In `docs/issues/README.md`, move the row from the **Active** table to the
     **Done** table and update the link path to `internal/done/…`
   - Close the GitHub issue

### Testing Methodology

- **Testing Methodology**: Use `docs/contributing/TESTING_METHODOLOGY.md` for detailed testing rules
- **Test Framework**: [Vitest](https://vitest.dev/); tests live next to the code as `src/**/*.test.ts`
- **Running tests**:
  - `make test` (or `pnpm test`)
  - Single file: `pnpm exec vitest run src/main/storage.test.ts`
  - Verbose output: `pnpm exec vitest run --reporter=verbose`
- **Isolation**: Use in-memory SQLite (`new Storage(':memory:')`) and temporary directories; never touch real user data
- **Electron APIs**: Keep logic testable without Electron — inject Electron-specific operations (see `CommandHost` and
  `WindowContext` in `src/main/commands.ts`) and mock them in tests
- **Debugging**: Use the "Vitest: current file" launch configuration in VS Code

### GitHub Publishing Workflow

@docs/contributing/GITHUB-WORKFLOW.md

### System Information Detection

- **Always use** `portunix system info` for OS detection when Portunix is available
- **Only if Portunix is not available**, then use manual detection methods
- Don't write custom OS detection scripts when Portunix already provides this functionality
