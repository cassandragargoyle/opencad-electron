/**
 * OpenCAD Electron — main process.
 *
 * Loads the OpenCAD web app (built from submodule/opencad/packages/app) into a
 * BrowserWindow and provides the desktop commands the app expects from the
 * Tauri shell, via the bridge in src/preload/preload.ts.
 *
 * Modes:
 *   electron .                               built app served from packages/app/dist
 *   electron . --dev-url=http://localhost:5173  Vite dev server (hot reload)
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron';
import { showAboutWindow } from './about';
import {
  APP_HOST,
  APP_ORIGIN,
  APP_SCHEME,
  isServerApiPath,
  resolveAppFile,
} from './appProtocol';
import { createCommands, type FileFilter, type WindowContext } from './commands';
import { buildMenu } from './menu';
import { createProjectOpener, type OpenProjectFile } from './openProject';
import { projectFilesFromArgv } from './projectFile';
import { Storage } from './storage';
import { STYLE_FIXES } from './styleFixes';

// Keep in sync with src/preload/preload.ts.
const IPC_INVOKE = 'opencad:invoke';
const IPC_EVENT = 'opencad:event';

const WINDOW_TITLE = 'CassandraGargoyle OpenCAD';

/** Hosts allowed to open as in-app popups (OAuth sign-in used by Firebase). */
const AUTH_POPUP_HOSTS = [
  'firebaseapp.com',
  'web.app',
  'accounts.google.com',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'github.com',
];

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const devUrl = argValue('dev-url') ?? process.env.OPENCAD_DEV_URL;
const isDev = devUrl !== undefined || !app.isPackaged;
const appBaseUrl = devUrl ? devUrl.replace(/\/$/, '') : APP_ORIGIN;

const distDir =
  process.env.OPENCAD_APP_DIST ??
  (app.isPackaged
    ? path.join(process.resourcesPath, 'app-dist')
    : path.join(app.getAppPath(), 'submodule', 'opencad', 'packages', 'app', 'dist'));

// Packaged builds get their icon from electron-builder; this one is for unpackaged runs.
const devIcon = path.join(
  app.getAppPath(),
  'submodule/opencad/packages/desktop/src-tauri/icons/icon.png'
);

app.setName('OpenCAD');

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let storage: Storage | undefined;
let openProjectFile: OpenProjectFile | undefined;

/** Windows showing the web app (not About, not OAuth popups) */
const appWindows = new Set<BrowserWindow>();

/** Project files requested before the app was ready (command line, macOS open-file) */
const pendingProjectFiles: string[] = [];

function isAppUrl(url: string): boolean {
  return url === appBaseUrl || url.startsWith(`${appBaseUrl}/`);
}

function isAuthPopupUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return AUTH_POPUP_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function openExternal(url: string): void {
  if (/^https?:\/\//.test(url) || url.startsWith('mailto:')) {
    void shell.openExternal(url);
  }
}

function createWindow(route = '/', title = WINDOW_TITLE): BrowserWindow {
  const window = new BrowserWindow({
    title,
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: existsSync(devIcon) ? devIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  appWindows.add(window);
  window.on('closed', () => appWindows.delete(window));

  // insertCSS lasts until the next navigation, so apply it on every page load
  window.webContents.on('dom-ready', () => {
    void window.webContents.insertCSS(STYLE_FIXES);
  });

  // Keep our title instead of the web app's <title>
  window.on('page-title-updated', (event) => event.preventDefault());

  window.once('ready-to-show', () => {
    window.maximize();
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      createWindow(url.slice(appBaseUrl.length) || '/', title);
      return { action: 'deny' };
    }
    if (isAuthPopupUrl(url)) {
      return { action: 'allow' };
    }
    openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      openExternal(url);
    }
  });

  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  void window.loadURL(`${appBaseUrl}${normalizedRoute}`);
  return window;
}

/**
 * Open a project file (or show the Open dialog when no path is given) in an
 * app window, preferring the one the request came from.
 */
function openProject(filePath?: string, preferred?: BrowserWindow): void {
  const window =
    preferred && appWindows.has(preferred) ? preferred : appWindows.values().next().value;
  if (!openProjectFile || !window) {
    if (filePath) pendingProjectFiles.push(filePath);
    return;
  }

  const open = openProjectFile;
  const run = (): void => {
    open(window, filePath).catch((err: unknown) => {
      console.error('Failed to open project file:', err);
    });
  };
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', run);
  } else {
    run();
  }
}

function windowContext(window: BrowserWindow): WindowContext {
  const pickPath = (result: { canceled: boolean; filePath?: string }): string | null =>
    result.canceled || !result.filePath ? null : result.filePath;

  return {
    id: String(window.id),
    showOpenDialog: async (filters: FileFilter[]) => {
      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        filters,
      });
      return pickPath({ canceled: result.canceled, filePath: result.filePaths[0] });
    },
    showSaveDialog: async (defaultName: string, filters: FileFilter[]) =>
      pickPath(await dialog.showSaveDialog(window, { defaultPath: defaultName, filters })),
    toggleMaximize: () => {
      if (window.isMaximized()) window.unmaximize();
      else window.maximize();
    },
  };
}

function registerAppProtocol(): void {
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.host !== APP_HOST) {
      return new Response('Not found', { status: 404 });
    }
    if (isServerApiPath(url.pathname)) {
      return new Response('No OpenCAD server in the desktop app', { status: 503 });
    }
    return net.fetch(pathToFileURL(resolveAppFile(distDir, url.pathname)).toString());
  });
}

function registerCommands(dataDir: string, db: Storage): void {
  const commands = createCommands(db, {
    dataDir,
    openNewWindow: (route, title) => {
      createWindow(route, title);
    },
  });

  ipcMain.handle(IPC_INVOKE, async (event, cmd: unknown, args: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error('Command sent from an unknown window');
    if (typeof cmd !== 'string' || !Object.hasOwn(commands, cmd)) {
      throw new Error(`Unknown command: ${String(cmd)}`);
    }
    const commandArgs =
      args !== null && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    return commands[cmd]!(commandArgs, windowContext(window));
  });
}

async function start(): Promise<void> {
  if (!devUrl && !existsSync(path.join(distDir, 'index.html'))) {
    dialog.showErrorBox(
      'OpenCAD web app not built',
      `No build found in:\n${distDir}\n\nRun "make opencad" (or "pnpm opencad:install && pnpm opencad:build") first.`
    );
    app.quit();
    return;
  }

  const dataDir = app.getPath('userData');
  mkdirSync(dataDir, { recursive: true });
  storage = new Storage(path.join(dataDir, 'opencad.db'));

  registerAppProtocol();
  registerCommands(dataDir, storage);

  Menu.setApplicationMenu(
    buildMenu(
      {
        sendMenuEvent: (window, id) => window.webContents.send(IPC_EVENT, 'menu', id),
        showAbout: showAboutWindow,
        openProject: (window) => openProject(undefined, window),
      },
      isDev
    )
  );

  const window = createWindow();
  openProjectFile = createProjectOpener({ appBaseUrl, storage });

  // Files from the command line / file associations, then any queued meanwhile
  const files = [
    ...projectFilesFromArgv(process.argv.slice(1)).map((f) => path.resolve(f)),
    ...pendingProjectFiles.splice(0),
  ];
  for (const file of files) openProject(file, window);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    const window: BrowserWindow | undefined = appWindows.values().next().value;
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
    for (const file of projectFilesFromArgv(argv.slice(1))) {
      openProject(path.resolve(workingDirectory, file), window);
    }
  });

  // macOS: files opened from Finder / the Dock, possibly before the app is ready
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    openProject(filePath);
  });

  app.whenReady().then(start, (err: unknown) => {
    console.error('Failed to start OpenCAD:', err);
    app.quit();
  });

  app.on('activate', () => {
    if (app.isReady() && storage && BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', () => {
    storage?.close();
  });
}
