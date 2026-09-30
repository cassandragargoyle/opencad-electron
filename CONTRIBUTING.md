# Contributing to OpenCAD Electron

Thank you for considering a contribution to OpenCAD Electron, the Electron-based
desktop application for [OpenCAD](https://github.com/cassandragargoyle/opencad).
This file is the entry point — the full set of guidelines lives under
[`docs/contributing/`](docs/contributing/).

## Quick Start

1. **Pick or open an issue** — browse
   [open issues](https://github.com/cassandragargoyle/opencad-electron/issues) or
   open a new one describing the change you want to make. Non-trivial
   changes should have an issue first so the scope can be agreed on before
   code is written.

2. **Fork and clone** (including the OpenCAD submodule)

   ```bash
   git clone --recurse-submodules https://github.com/<your-user>/opencad-electron.git
   cd opencad-electron
   ```

3. **Create a feature branch** following the project convention:

   ```bash
   git checkout -b feature/issue-<number>-<short-name>
   ```

4. **Set up the dev environment** (Node.js 22+, pnpm 9+)

   ```bash
   make install                    # init submodule, install dependencies
   make opencad                    # build the OpenCAD web app
   ```

5. **Build and test**

   ```bash
   make build                      # compile Electron main + preload
   make test                       # unit tests (Vitest)
   make typecheck                  # TypeScript type checking
   make check                      # typecheck + tests
   make start                      # run the app
   make dev                        # run against the Vite dev server (hot reload)
   ```

   For debugging in VS Code, see the launch configurations described in the
   [README](README.md#debugging-in-vs-code).

6. **Commit and push** using Conventional-Commit-style messages
   (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` …).

7. **Open a Pull Request** from your feature branch into `main`.
   Run `make check` before opening it; the CI pipeline will run type checking,
   unit tests and a packaging build before the PR can be merged.

## Ground Rules

- All code, comments, commit messages, and PR descriptions are written in English.
- Follow existing conventions — explore the codebase before introducing new patterns.
- Write tests for new features and bug fixes. See [TEST_GUIDE.md](TEST_GUIDE.md) and
  [`docs/contributing/TESTING_METHODOLOGY.md`](docs/contributing/TESTING_METHODOLOGY.md).
- Tests **must not** touch real user data or the host system — use in-memory SQLite (`:memory:`) and temporary directories — see
  [`docs/contributing/ISSUE-DEVELOPMENT-METHODOLOGY.md`](docs/contributing/ISSUE-DEVELOPMENT-METHODOLOGY.md).
- Do not modify `submodule/opencad` in this repository. Changes to OpenCAD itself go to the
  [OpenCAD repository](https://github.com/cassandragargoyle/opencad); submodule updates are committed separately (`chore: bump opencad`).
- Keep the desktop bridge compatible with the Tauri backend — command names and argument shapes must match
  `submodule/opencad/packages/desktop/src-tauri/src/main.rs`, so the OpenCAD web app runs unchanged.
- Do not add co-authored-by attributions for AI tools in commits.
- `CHANGELOG.md` is kept current — add an entry under the target version when landing a user-visible change.

## Detailed Guidelines

The `docs/contributing/` directory contains the full set of project standards. A few of the most frequently referenced documents:

- [README](docs/contributing/README.md) — index of all contributing docs
- [Issue Development Methodology](docs/contributing/ISSUE-DEVELOPMENT-METHODOLOGY.md) — the mandatory issue → branch → test → merge flow
- [Issue Management](docs/contributing/ISSUE-MANAGEMENT.md)
- [Testing Methodology](docs/contributing/TESTING_METHODOLOGY.md) — unit tests with Vitest, test isolation rules
- [TypeScript Code Style](docs/contributing/CODE-STYLE-TYPESCRIPT.md),
  [Python Code Style](docs/contributing/CODE-STYLE-PYTHON.md),
  [Markdown Style](docs/contributing/MARKDOWN-STYLE.md),
  [Markdown Frontmatter](docs/contributing/MARKDOWN-FRONTMATTER.md)
- [Git Workflow](docs/contributing/GIT-WORKFLOW.md) and
  [GitHub Workflow](docs/contributing/GITHUB-WORKFLOW.md)
- [Bug Reporting](docs/contributing/BUG-REPORTING.md)
- [Desktop Command Development](docs/contributing/DESKTOP-COMMAND-DEVELOPMENT.md) — required checklist when adding a new desktop
  command (`src/main/commands.ts`, Tauri compatibility, tests)
- [Versioning](docs/contributing/VERSIONING.md)
- [Terminology](docs/contributing/TERMINOLOGY.md)

## Reporting Bugs and Requesting Features

- **Bugs** — open an issue using the bug reporting guidelines in [`docs/contributing/BUG-REPORTING.md`](docs/contributing/BUG-REPORTING.md).
  Include the OpenCAD Electron version (`package.json`), the OpenCAD submodule commit (`git submodule status`), OS, steps to reproduce,
  expected vs. actual behavior, and relevant logs (main process output and the renderer DevTools console).
- **Feature requests** — open an issue describing the use case and the motivation. For substantial changes, an ADR in `docs/adr/` may be
  proposed alongside the feature request. Features of the OpenCAD application itself belong in the
  [OpenCAD repository](https://github.com/cassandragargoyle/opencad/issues).

## Security

For security-sensitive reports, please do not open a public issue. Instead, contact the maintainers privately — see the
[CassandraGargoyle team](https://github.com/cassandragargoyle) page for contact options.

## License

By contributing to OpenCAD Electron you agree that your contributions will be
licensed under the [MIT License](LICENSE).
