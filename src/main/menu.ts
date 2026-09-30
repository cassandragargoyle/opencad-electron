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

export type MenuEventSender = (window: BrowserWindow, id: string) => void;

export function buildMenu(sendMenuEvent: MenuEventSender, isDev: boolean): Menu {
  const item = (id: string, label: string, accelerator?: string): MenuItemConstructorOptions => ({
    id,
    label,
    accelerator,
    click: (_item, window) => {
      if (window instanceof BrowserWindow) sendMenuEvent(window, id);
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
        item('file-open', 'Open…', 'CmdOrCtrl+O'),
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
        item('file-close', 'Close', 'CmdOrCtrl+W'),
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
        item('view-zoom-in', 'Zoom In', 'CmdOrCtrl+Plus'),
        item('view-zoom-out', 'Zoom Out', 'CmdOrCtrl+-'),
        item('view-zoom-fit', 'Zoom to Fit', 'CmdOrCtrl+0'),
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
        item('help-about', 'About OpenCAD'),
        item('help-check-updates', 'Check for Updates…'),
        item('help-docs', 'Documentation'),
      ],
    }
  );

  return Menu.buildFromTemplate(template);
}
