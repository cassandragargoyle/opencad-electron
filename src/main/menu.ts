/**
 * Native application menu.
 *
 * Item IDs match the Tauri backend; a click sends a `menu` event with the ID
 * as payload, which the app handles in hooks/useMenuBar.ts.
 *
 * Single-key tool shortcuts (V, L, W, …) are intentionally not registered as
 * accelerators: Electron would capture them globally and break typing in text
 * fields. The web app handles those keys itself.
 */

import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import type { ZoomAction } from './appButtons';

export type MenuEventSender = (window: BrowserWindow, id: string) => void;

export interface MenuActions {
  /** Forwards a menu item ID to the web app */
  sendMenuEvent: MenuEventSender;
  /** Help → About is handled by the desktop shell, not the web app */
  showAbout(window: BrowserWindow | undefined): void;
  /** File → Open is handled by the desktop shell (native dialog, *.opencad files) */
  openProject(window: BrowserWindow | undefined): void;
  /** View → Zoom is handled by the desktop shell (the web app ignores menu events) */
  zoom(window: BrowserWindow, action: ZoomAction): void;
  /** File → Close returns to the project dashboard (the web app ignores menu events) */
  closeProject(window: BrowserWindow): void;
}

export function buildMenu(
  { sendMenuEvent, showAbout, openProject, zoom, closeProject }: MenuActions,
  isDev: boolean
): Menu {
  const item = (id: string, label: string, accelerator?: string): MenuItemConstructorOptions => ({
    id,
    label,
    accelerator,
    click: (_item, window) => {
      if (window instanceof BrowserWindow) sendMenuEvent(window, id);
    },
  });

  /** Item handled by the desktop shell instead of the web app */
  const shellItem = (
    id: string,
    label: string,
    accelerator: string,
    run: (window: BrowserWindow) => void
  ): MenuItemConstructorOptions => ({
    id,
    label,
    accelerator,
    click: (_item, window) => {
      if (window instanceof BrowserWindow) run(window);
    },
  });

  const template: MenuItemConstructorOptions[] = [];

  if (process.platform === 'darwin') {
    template.push({ role: 'appMenu' });
  }

  template.push(
    {
      label: 'File',
      submenu: [
        item('file-new', 'New Project', 'CmdOrCtrl+N'),
        {
          id: 'file-open',
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: (_item, window) =>
            openProject(window instanceof BrowserWindow ? window : undefined),
        },
        { type: 'separator' },
        item('file-save', 'Save', 'CmdOrCtrl+S'),
        item('file-save-as', 'Save As…', 'CmdOrCtrl+Shift+S'),
        { type: 'separator' },
        {
          label: 'Import',
          submenu: [
            item('import-ifc', 'IFC…'),
            item('import-dwg', 'DWG…'),
            item('import-pdf', 'PDF…'),
            item('import-revit', 'Revit (RVT)…'),
            item('import-sketchup', 'SketchUp (SKP)…'),
          ],
        },
        item('file-export', 'Export…'),
        { type: 'separator' },
        shellItem('file-close', 'Close', 'CmdOrCtrl+W', closeProject),
        ...(process.platform === 'darwin'
          ? []
          : [{ type: 'separator' } as const, { role: 'quit' } as const]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        item('edit-undo', 'Undo', 'CmdOrCtrl+Z'),
        item('edit-redo', 'Redo', 'CmdOrCtrl+Shift+Z'),
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        item('edit-delete', 'Delete'),
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        shellItem('view-zoom-in', 'Zoom In', 'CmdOrCtrl+Plus', (w) => zoom(w, 'in')),
        shellItem('view-zoom-out', 'Zoom Out', 'CmdOrCtrl+-', (w) => zoom(w, 'out')),
        shellItem('view-zoom-fit', 'Zoom to Fit', 'CmdOrCtrl+0', (w) => zoom(w, 'fit')),
        { type: 'separator' },
        item('view-toggle-2d-3d', 'Toggle 2D / 3D', 'CmdOrCtrl+Shift+3'),
        { type: 'separator' },
        item('view-panel-layers', 'Show/Hide Layers'),
        item('view-panel-properties', 'Show/Hide Properties'),
        item('view-panel-ai-chat', 'Show/Hide AI Chat'),
        { type: 'separator' },
        item('view-dark-mode', 'Dark Mode'),
        item('view-light-mode', 'Light Mode'),
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev
          ? [
              { type: 'separator' } as const,
              { role: 'reload' } as const,
              { role: 'toggleDevTools' } as const,
            ]
          : []),
      ],
    },
    {
      label: 'Tools',
      submenu: [
        item('tool-select', 'Select'),
        { type: 'separator' },
        item('tool-line', 'Line'),
        item('tool-rectangle', 'Rectangle'),
        item('tool-circle', 'Circle'),
        item('tool-arc', 'Arc'),
        { type: 'separator' },
        item('tool-wall', 'Wall'),
        item('tool-door', 'Door'),
        item('tool-window', 'Window'),
        { type: 'separator' },
        item('tool-dimension', 'Dimension'),
        item('tool-text', 'Text'),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          id: 'help-about',
          label: 'About OpenCAD',
          click: (_item, window) =>
            showAbout(window instanceof BrowserWindow ? window : undefined),
        },
        item('help-check-updates', 'Check for Updates…'),
        item('help-docs', 'Documentation'),
      ],
    }
  );

  return Menu.buildFromTemplate(template);
}
