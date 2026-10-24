---
title: INT-001 - Ctrl+Z in a text field undoes the document instead of the field
description: Apply when working on undo/redo keyboard shortcuts in the OpenCAD web app (submodule/opencad) or on focus handling of global shortcuts.
category: specification
ai_load: on-demand
status: draft
created: 2026-10-24
last_updated: 2026-10-24
tags:
  - submodule
  - bug
---

# INT-001 - Ctrl+Z in a text field undoes the document instead of the field

## Metadata

- **Created**: 2026-10-24
- **Author**: Zdenek
- **Type**: Bug
- **Priority**: Medium
- **Status**: 📋 Open
- **Target**: `submodule/opencad` (OpenCAD fork, commit `e23c061`), package `packages/app`
- **GitHub**: [#1](https://github.com/cassandragargoyle/opencad-electron/issues/1)

## Why the issue lives here

`submodule/opencad` is a fork of OpenCAD without its own issue tracking. Issues against it
are recorded in this repository; the fix itself is committed in the
[OpenCAD fork](https://github.com/cassandragargoyle/opencad), and the submodule bump is a
separate commit here.

## Problem

`useUndoRedo` (`packages/app/src/hooks/useUndoRedo.ts`) registers a `keydown` listener on
`window` and reacts to Ctrl/Cmd+Z, Ctrl/Cmd+Y and Ctrl/Cmd+Shift+Z regardless of where the
focus is. When the user edits a text field (e.g. the inline project rename, a property
panel input) and presses Ctrl+Z, the hook calls `preventDefault()` and undoes the last
document change. The browser's native undo in the field never runs.

### Observed

1. Open a document and make a change (e.g. move a shape)
2. Focus any text input and type a few characters
3. Press Ctrl+Z

The shape moves back; the typed characters stay.

### Expected

The typed characters are undone; the document is untouched. Undo/redo of the document
applies only when the focus is not in an editable element.

## Proposed Solution

Return early from the handler when the event target is an editable element:
`INPUT`, `TEXTAREA`, `SELECT` or an element with `isContentEditable`. The same guard is
already used for other global shortcuts in `packages/app/src/AppLayout.tsx` (around lines
470 and 786); reuse that pattern rather than inventing a new one.

Judgement calls:

- **All input types are skipped**, including checkboxes and range inputs, which have no
  native undo. Keeping the guard identical to `AppLayout.tsx` is simpler and consistent;
  the cost is that Ctrl+Z does nothing while such a control has focus.
- **The guard is not extracted into a shared helper** in this issue. Three copies of the
  same check would justify one, but that refactor touches `AppLayout.tsx` and can be done
  separately.

## Acceptance Criteria

- [ ] Ctrl/Cmd+Z, Ctrl/Cmd+Y and Ctrl/Cmd+Shift+Z do not call `undo`/`redo` and do not call
      `preventDefault()` when the event target is an `input`, `textarea`, `select` or a
      `contentEditable` element
- [ ] Outside editable elements the shortcuts behave as before
- [ ] `packages/app/src/hooks/useUndoRedo.test.ts` covers the new cases (input, textarea,
      contentEditable) and the existing tests still pass
- [ ] The fix is merged in the OpenCAD fork and `submodule/opencad` is bumped here in a
      separate commit
