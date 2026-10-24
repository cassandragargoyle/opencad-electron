---
title: INT-002 - Rename a dashboard project via a pencil button instead of double-click
description: Apply when working on the project cards of the OpenCAD dashboard (submodule/opencad, ProjectDashboard.tsx), especially project rename and card actions.
category: specification
ai_load: on-demand
status: draft
created: 2026-10-24
last_updated: 2026-10-24
tags:
  - submodule
  - enhancement
  - ui
---

# INT-002 - Rename a dashboard project via a pencil button instead of double-click

## Metadata

- **Created**: 2026-10-24
- **Author**: Zdenek
- **Type**: Enhancement
- **Priority**: Medium
- **Status**: 📋 Open
- **Target**: `submodule/opencad` (OpenCAD fork, commit `e23c061`), package `packages/app`
- **GitHub**: [#2](https://github.com/cassandragargoyle/opencad-electron/issues/2)

## Why the issue lives here

`submodule/opencad` is a fork of OpenCAD without its own issue tracking. Issues against it
are recorded in this repository; the change itself is committed in the
[OpenCAD fork](https://github.com/cassandragargoyle/opencad), and the submodule bump is a
separate commit here.

## Problem

On a project card in the dashboard (`packages/app/src/components/ProjectDashboard.tsx`,
the `project-name` span), a single click opens the project and a double-click starts the
inline rename. The two gestures share one target: the first click of the double-click
already opens the editor, so the user rarely reaches the rename. The rename is reliably
reachable only through F2, which is not discoverable with the mouse.

Upstream already hit this in the e2e suite: commit `ae841ee` switched the rename test from
double-click to F2.

## Decision

- **Remove** the `onDoubleClick` handler from the project name
- **Add** a pencil icon button to `project-card-actions`, before the star and delete
  buttons, which calls `startRename(project.id, project.name)` and stops propagation so the
  project is not opened
- **Keep** F2 on the focused project name
- Clicking the name or the thumbnail keeps opening the project

Judgement calls:

- **A visible button over a context menu.** A context menu would scale better if more card
  actions appear, but it is more work and still hidden; the card already shows its actions
  as icon buttons, so a pencil fits the existing pattern.
- **The button is always visible**, styled like the star and delete buttons. If the card
  feels cluttered, showing the actions only on hover/focus is a styling follow-up, not part
  of this issue.
- **The name stays the open target.** Making a click on the name start the rename would
  remove the conflict too, but it changes established behaviour for every user.

## Implementation Notes

- Icon from `lucide-react` (`Pencil`), size matching the `Star` icon (14)
- New i18n key for the tooltip/`aria-label` (e.g. `dashboard.card.rename`) in every locale
  under `packages/app/src/locales/*/common.json` (12 locales at `e23c061`)
- The button needs an accessible name (`title` alone is not enough for screen readers;
  add `aria-label`)

## Acceptance Criteria

- [ ] The pencil button on a project card starts the inline rename and does not open the
      project
- [ ] F2 on the focused project name still starts the rename
- [ ] A single click on the name or the thumbnail still opens the project
- [ ] No `onDoubleClick` handler remains on the project card
- [ ] The rename key is translated in all shipped locales
- [ ] A component test covers the pencil button (rename starts, project not opened); the
      e2e rename test still passes
- [ ] The change is merged in the OpenCAD fork and `submodule/opencad` is bumped here in a
      separate commit
