---
name: deploy-local
description: 'Builds OpenCAD Electron from the working tree, runs the checks, and installs the desktop application on this machine as an AppImage with a launcher entry. Use when the user wants to try the current state outside the source tree (e.g. "nasaď lokálně", "nainstaluj si to", "aktualizuj desktop aplikaci") or runs `/deploy-local`.'
user-invocable: true
---

# Deploy Local

Build what is in the working tree and install it on this machine, so the next OpenCAD the
user starts is the code they are looking at.

> This file is the source of truth. `SKILL.cs.md` is a Czech translation for
> human readers only — when you change this file, update the translation too.

## Context

- Communicate with the user in Czech; anything written to files is in **English**
- There is no server to deploy. "Local deploy" means one install into the user's own
  profile: the AppImage, its icon and a launcher entry, nothing else
- Do not install the `.deb` from `release/` - it needs root and installs system-wide
- Never modify `submodule/opencad`; the build uses the commit that is checked out

| Artifact | Installed to |
| -------- | ------------ |
| `release/OpenCAD-<version>*.AppImage` | `~/Applications/OpenCAD.AppImage`, with a launcher entry |

## STEP 1: Look at what is being deployed

```bash
git status --short
git log --oneline -1
git submodule status
node -p "require('./package.json').version"
```

Tell the user the branch, the last commit, the OpenCAD submodule commit, the version, and
whether the working tree is dirty. A dirty tree is allowed - trying uncommitted work is
the point - but say so, because the installed version number will not identify what was
installed. A `+` in front of the submodule commit means it differs from the commit
recorded in this repository; say that too.

If `~/Applications/OpenCAD.AppImage` already exists, say that the install replaces it.

## STEP 2: Checks - stop on the first failure

```bash
make typecheck
make test
```

These are `make check`. Run them one by one so the failing one is named. If any fails,
**stop**: show the failing output, install nothing, and do not offer to skip the checks
unless the user asks for it.

## STEP 3: Build

Linux only. On Windows or macOS, stop and point the user at the installer that `make dist`
creates in `release/`.

```bash
make dist
ls release/OpenCAD-*.AppImage
```

`make dist` builds the OpenCAD web app, compiles the Electron sources and packages
`release/` (AppImage and deb). If dependencies are missing, run `make install` first and
tell the user. If `release/` holds more than one AppImage, pick the one with the version
from `package.json`.

## STEP 4: Install

Check that a running instance is not holding the old file first - the process is
`opencad-electron`, the executable name electron-builder derives from the `name` in
`package.json`. Use `pidof`, not `pgrep -x`, which only sees the first 15 characters of a
process name, and not `pgrep -f`, which would find the shell that runs the check:

```bash
pidof opencad-electron
```

If it is running, ask the user to close it before installing. Then:

```bash
mkdir -p ~/Applications ~/.local/share/applications ~/.local/share/icons/hicolor/512x512/apps
install -m 755 release/OpenCAD-<version>*.AppImage ~/Applications/OpenCAD.AppImage
install -m 644 submodule/opencad/packages/desktop/src-tauri/icons/icon.png \
  ~/.local/share/icons/hicolor/512x512/apps/opencad.png
```

The installed file has a **fixed name** with no version in it, so the launcher entry and
anything the user pinned keep working after the next deploy.

Write the launcher entry only when it is missing or points somewhere else:

```ini
# ~/.local/share/applications/opencad.desktop
[Desktop Entry]
Type=Application
Name=OpenCAD
Comment=OpenCAD desktop application
Exec=<home>/Applications/OpenCAD.AppImage %f
Icon=<home>/.local/share/icons/hicolor/512x512/apps/opencad.png
Terminal=false
Categories=Graphics;
StartupWMClass=OpenCAD
```

Use the absolute home path in `Exec` and `Icon`; a desktop entry does not expand `~`.
`Icon` is a path rather than the theme name `opencad` on purpose: a running Plasma keeps
its icon cache from before the install and draws a blank document for a name it has not
seen, in the menu and in the task bar alike. A path is read from the file directly.

`StartupWMClass` is `OpenCAD` because `package.json` has no `desktopName` and the app
calls `app.setName('OpenCAD')`. If the task bar shows a separate generic icon for the
running window, check the real class with `xprop WM_CLASS` and fix the entry.

Then refresh the menu caches - `update-desktop-database` for GNOME and the others,
`kbuildsycoca6` for KDE, which does not read the first one:

```bash
update-desktop-database ~/.local/share/applications 2>/dev/null || true
command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 >/dev/null 2>&1 || true
```

The AppImage needs FUSE to start. If the first launch fails with a FUSE error, tell the
user about `libfuse2` rather than extracting the image.

## STEP 5: Summary

Report what actually happened:

- Version, commit and OpenCAD submodule commit deployed, and whether the tree was dirty
- Checks: each one passed, or which one failed
- The installed path and whether the launcher entry was written or kept, or skipped and
  why
- What the user has to do: start OpenCAD again

A step that was skipped is reported as skipped, never as deployed.

## Rollback

- An older `release/OpenCAD-<version>*.AppImage`, if one is still there, installed over
  `~/Applications/OpenCAD.AppImage`
- Remove the app with
  `rm ~/Applications/OpenCAD.AppImage ~/.local/share/applications/opencad.desktop`
