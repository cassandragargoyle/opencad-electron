/**
 * Desktop commands invoked by the OpenCAD web app.
 *
 * The web app talks to the desktop shell through `window.__TAURI__.core.invoke`
 * (see submodule/opencad/packages/app/src/hooks/useTauri.ts). The preload
 * script exposes a compatible bridge, and every call ends up here. Command
 * names and argument shapes match the Tauri backend so the app runs unchanged.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Storage } from './storage';

export type CommandArgs = Record<string, unknown>;

/** App-wide Electron operations, injected so commands stay testable. */
export interface CommandHost {
  dataDir: string;
  openNewWindow(route: string, title: string): void;
}

/** Operations bound to the window that sent the command. */
export interface WindowContext {
  id: string;
  showOpenDialog(filters: FileFilter[]): Promise<string | null>;
  showSaveDialog(defaultName: string, filters: FileFilter[]): Promise<string | null>;
  toggleMaximize(): void;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export type CommandHandler = (args: CommandArgs, window: WindowContext) => unknown;

/** Storage quota reported to the app — same value as the Tauri backend (10 GiB). */
const STORAGE_QUOTA = 10 * 1024 * 1024 * 1024;

function stringArg(args: CommandArgs, key: string): string {
  const value = args[key];
  if (typeof value !== 'string') {
    throw new Error(`Missing or invalid argument "${key}"`);
  }
  return value;
}

async function directorySize(dir: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(full);
    } else if (entry.isFile()) {
      total += (await fs.stat(full)).size;
    }
  }
  return total;
}

export function createCommands(storage: Storage, host: CommandHost): Record<string, CommandHandler> {
  return {
    // ─── Project persistence ───────────────────────────────
    save_project: (args) =>
      storage.saveProject(stringArg(args, 'id'), stringArg(args, 'name'), stringArg(args, 'data')),
    load_project: (args) => storage.loadProject(stringArg(args, 'id')),
    list_projects: () => storage.listProjects(),
    delete_project: (args) => storage.deleteProject(stringArg(args, 'id')),

    // ─── Native file I/O ───────────────────────────────────
    open_file: async (args) => {
      const filePath = stringArg(args, 'path');
      const [content, stat] = await Promise.all([
        fs.readFile(filePath, 'utf8'),
        fs.stat(filePath),
      ]);
      return { path: filePath, size: stat.size, content };
    },
    save_file: async (args) => {
      const filePath = stringArg(args, 'path');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, stringArg(args, 'content'), 'utf8');
    },
    open_file_dialog: (_args, window) =>
      window.showOpenDialog([{ name: 'OpenCAD files', extensions: ['opencad', 'ifc', 'dwg'] }]),
    save_file_dialog: (args, window) =>
      window.showSaveDialog(stringArg(args, 'defaultName'), [
        { name: 'OpenCAD Project', extensions: ['opencad'] },
      ]),
    get_storage_info: async () => [await directorySize(host.dataDir), STORAGE_QUOTA],
    check_external_drive: async (args) => {
      try {
        await fs.access(stringArg(args, 'path'));
        return true;
      } catch {
        return false;
      }
    },

    // ─── File watching (not implemented, same as Tauri) ────
    watch_file: () => undefined,
    unwatch_file: () => undefined,

    // ─── Local AI (not available, same as Tauri) ───────────
    get_local_ai_status: () => ({ available: false, model_loaded: false, model_path: null }),
    load_local_ai_model: () => false,
    run_local_ai: () => {
      throw new Error('Local AI not available');
    },

    // ─── Windows ───────────────────────────────────────────
    open_new_window: (args) =>
      host.openNewWindow(stringArg(args, 'route'), stringArg(args, 'title')),
    get_current_window_id: (_args, window) => window.id,
    'plugin:window|toggle_maximize': (_args, window) => window.toggleMaximize(),
    // Windows use native decorations, so dragging is handled by the OS.
    'plugin:window|start_dragging': () => undefined,

    // ─── Tray (not implemented, same as Tauri) ─────────────
    set_tray_status: () => undefined,
    show_tray_notification: () => undefined,

    // ─── Updates (not implemented yet) ─────────────────────
    check_for_update: () => ({ available: false, version: null, notes: null, url: null }),
    download_update: () => undefined,
    install_update: () => {
      throw new Error('Auto-update not available');
    },

    // ─── Crash recovery ────────────────────────────────────
    get_recovery_data: () => storage.getRecoveryData(),
    save_recovery_data: (args) => storage.saveRecoveryData(stringArg(args, 'data')),
    clear_recovery_data: () => storage.clearRecoveryData(),

    // ─── Recent files ──────────────────────────────────────
    add_recent_file: (args) =>
      storage.addRecentFile(stringArg(args, 'path'), stringArg(args, 'name')),
    get_recent_files: () => storage.getRecentFiles(),
    clear_recent_files: () => storage.clearRecentFiles(),

    // ─── Browser-desktop sync (not implemented, same as Tauri) ─
    get_sync_status: () => 'synced',
    sync_document: () => undefined,
    get_synced_document: () => null,
  };
}
