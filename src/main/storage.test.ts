import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Storage } from './storage';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(':memory:');
  });

  afterEach(() => {
    storage.close();
    vi.useRealTimers();
  });

  it('saves, loads and deletes a project', () => {
    storage.saveProject('p1', 'House', '{"a":1}');
    expect(storage.loadProject('p1')).toBe('{"a":1}');

    storage.deleteProject('p1');
    expect(storage.loadProject('p1')).toBeNull();
  });

  it('returns null for an unknown project', () => {
    expect(storage.loadProject('missing')).toBeNull();
  });

  it('keeps created_at and bumps updated_at on re-save', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    storage.saveProject('p1', 'House', '{}');
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    storage.saveProject('p1', 'House v2', '{"b":2}');

    const [project] = storage.listProjects();
    expect(project).toEqual({
      id: 'p1',
      name: 'House v2',
      created_at: Date.UTC(2026, 0, 1) / 1000,
      updated_at: Date.UTC(2026, 0, 2) / 1000,
    });
  });

  it('lists projects by most recently updated first', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    storage.saveProject('old', 'Old', '{}');
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    storage.saveProject('new', 'New', '{}');

    expect(storage.listProjects().map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('stores and clears crash recovery data', () => {
    expect(storage.getRecoveryData()).toBeNull();
    storage.saveRecoveryData('first');
    storage.saveRecoveryData('second');
    expect(storage.getRecoveryData()).toBe('second');

    storage.clearRecoveryData();
    expect(storage.getRecoveryData()).toBeNull();
  });

  it('keeps at most 10 recent files, newest first', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 12; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
      storage.addRecentFile(`/tmp/f${i}.opencad`, `f${i}`);
    }

    const recent = storage.getRecentFiles();
    expect(recent).toHaveLength(10);
    expect(recent[0]!.name).toBe('f11');

    storage.clearRecentFiles();
    expect(storage.getRecentFiles()).toEqual([]);
  });
});
