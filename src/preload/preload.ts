/**
 * Exposes a Tauri-compatible `window.__TAURI__` bridge to the OpenCAD web app.
 *
 * The app detects the desktop shell via `window.__TAURI__` and calls
 * `core.invoke(cmd, args)` / `event.listen(name, handler)`. Both are forwarded
 * to the Electron main process over IPC, so the upstream app needs no changes.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

// Sandboxed preload scripts cannot require local modules, so the channel
// names are duplicated here. Keep in sync with src/main/main.ts.
const IPC_INVOKE = 'opencad:invoke';
const IPC_EVENT = 'opencad:event';

type EventHandler = (event: { event: string; payload: unknown }) => void;

contextBridge.exposeInMainWorld('__TAURI__', {
  core: {
    invoke: (cmd: string, args?: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke(IPC_INVOKE, cmd, args ?? {}),
  },
  event: {
    listen: (name: string, handler: EventHandler): Promise<() => void> => {
      const listener = (_e: IpcRendererEvent, eventName: string, payload: unknown): void => {
        if (eventName === name) handler({ event: eventName, payload });
      };
      ipcRenderer.on(IPC_EVENT, listener);
      return Promise.resolve(() => {
        ipcRenderer.removeListener(IPC_EVENT, listener);
      });
    },
  },
});

contextBridge.exposeInMainWorld('opencadElectron', {
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },
});
