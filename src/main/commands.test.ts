import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommands, type CommandHandler, type WindowContext } from './commands';
import { Storage } from './storage';

describe('createCommands', () => {
  let dir: string;
  let storage: Storage;
  let commands: Record<string, CommandHandler>;
  let window: WindowContext;
  const openNewWindow = vi.fn();

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'opencad-cmd-'));
    storage = new Storage(':memory:');
    commands = createCommands(storage, { dataDir: dir, openNewWindow });
    window = {
      id: '7',
      showOpenDialog: vi.fn(async () => '/picked.opencad'),
      showSaveDialog: vi.fn(async () => null),
      toggleMaximize: vi.fn(),
    };
  });

  afterEach(() => {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
    openNewWindow.mockReset();
  });

  const run = (cmd: string, args: Record<string, unknown> = {}): unknown =>
    commands[cmd]!(args, window);

  it('implements every command of the Tauri backend', () => {
    const tauriCommands = [
      'save_project', 'load_project', 'list_projects', 'delete_project',
      'open_file', 'open_file_dialog', 'save_file', 'save_file_dialog',
      'get_storage_info', 'watch_file', 'unwatch_file', 'get_local_ai_status',
      'load_local_ai_model', 'run_local_ai', 'open_new_window', 'get_current_window_id',
      'set_tray_status', 'show_tray_notification', 'check_for_update', 'download_update',
      'install_update', 'get_recovery_data', 'save_recovery_data', 'clear_recovery_data',
      'check_external_drive', 'add_recent_file', 'get_recent_files', 'clear_recent_files',
      'get_sync_status', 'sync_document', 'get_synced_document',
    ];
    expect(tauriCommands.filter((c) => !(c in commands))).toEqual([]);
  });

  it('round-trips projects through storage', () => {
    run('save_project', { id: 'p1', name: 'House', data: '{}' });
    expect(run('load_project', { id: 'p1' })).toBe('{}');
    expect(run('list_projects')).toMatchObject([{ id: 'p1', name: 'House' }]);
  });

  it('rejects missing arguments', () => {
    expect(() => run('save_project', { id: 'p1' })).toThrow(/"name"/);
  });

  it('reads and writes files, creating parent directories', async () => {
    const file = path.join(dir, 'nested', 'a.opencad');
    await run('save_file', { path: file, content: 'hello' });
    expect(readFileSync(file, 'utf8')).toBe('hello');
    await expect(run('open_file', { path: file })).resolves.toEqual({
      path: file,
      size: 5,
      content: 'hello',
    });
  });

  it('reports storage usage of the data directory', async () => {
    writeFileSync(path.join(dir, 'x.bin'), Buffer.alloc(100));
    const [used, quota] = (await run('get_storage_info')) as [number, number];
    expect(used).toBe(100);
    expect(quota).toBe(10 * 1024 ** 3);
  });

  it('checks whether an external path exists', async () => {
    await expect(run('check_external_drive', { path: dir })).resolves.toBe(true);
    await expect(run('check_external_drive', { path: path.join(dir, 'nope') })).resolves.toBe(
      false
    );
  });

  it('delegates dialogs and window operations to the calling window', async () => {
    await expect(run('open_file_dialog')).resolves.toBe('/picked.opencad');
    await run('save_file_dialog', { defaultName: 'House.opencad' });
    expect(window.showSaveDialog).toHaveBeenCalledWith('House.opencad', [
      { name: 'OpenCAD Project', extensions: ['opencad'] },
    ]);

    run('plugin:window|toggle_maximize');
    expect(window.toggleMaximize).toHaveBeenCalled();
    expect(run('get_current_window_id')).toBe('7');

    run('open_new_window', { route: '/project/1', title: 'Project' });
    expect(openNewWindow).toHaveBeenCalledWith('/project/1', 'Project');
  });

  it('reports local AI as unavailable', () => {
    expect(run('get_local_ai_status')).toEqual({
      available: false,
      model_loaded: false,
      model_path: null,
    });
    expect(() => run('run_local_ai', { prompt: 'x' })).toThrow('Local AI not available');
  });
});
