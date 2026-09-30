/**
 * Help → About window.
 *
 * A static page (assets/about/about.html) shown in a modal window. Build
 * details are passed in the query string, so the page needs no preload
 * script and no access to Node or Electron APIs.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, shell } from 'electron';

const ABOUT_WIDTH = 720;

let aboutWindow: BrowserWindow | null = null;

/** Version of the bundled OpenCAD web app, or "unknown" when it can't be read. */
function opencadVersion(): string {
  const packageJson = app.isPackaged
    ? path.join(process.resourcesPath, 'opencad-package.json')
    : path.join(app.getAppPath(), 'submodule', 'opencad', 'package.json');
  try {
    const { version } = JSON.parse(readFileSync(packageJson, 'utf8')) as { version?: unknown };
    return typeof version === 'string' ? version : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function showAboutWindow(parent: BrowserWindow | undefined): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }

  const window = new BrowserWindow({
    parent,
    modal: parent !== undefined,
    title: 'About CassandraGargoyle OpenCAD',
    width: ABOUT_WIDTH,
    height: 700,
    useContentSize: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  window.removeMenu();
  aboutWindow = window;

  // Links open in the system browser, never inside the About window
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });

  // Fit the window to the page, so fonts and platforms never add a scrollbar
  window.once('ready-to-show', () => {
    window.webContents
      .executeJavaScript('document.documentElement.scrollHeight')
      .then((height: unknown) => {
        if (typeof height === 'number' && height > 0) {
          window.setContentSize(ABOUT_WIDTH, Math.ceil(height));
        }
      })
      .catch(() => undefined)
      .finally(() => window.show());
  });
  window.on('closed', () => {
    aboutWindow = null;
  });

  void window.loadFile(path.join(app.getAppPath(), 'assets', 'about', 'about.html'), {
    query: {
      version: app.getVersion(),
      opencad: opencadVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
  });
}
