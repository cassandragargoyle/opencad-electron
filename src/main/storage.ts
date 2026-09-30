/**
 * Local SQLite storage for the desktop app.
 *
 * Mirrors the schema used by the Tauri backend
 * (submodule/opencad/packages/desktop/src-tauri/src/main.rs) so both desktop
 * variants store projects, recent files and crash-recovery data the same way.
 */

import { DatabaseSync } from 'node:sqlite';

export interface ProjectMetadata {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface RecentFile {
  path: string;
  name: string;
  last_opened: number;
}

const RECENT_FILES_LIMIT = 10;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export class Storage {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recent_files (
        path TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_opened INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recovery (
        id INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  // ─── Projects ──────────────────────────────────────────────

  saveProject(id: string, name: string, data: string): void {
    const now = nowSeconds();
    this.db
      .prepare(
        `INSERT OR REPLACE INTO projects (id, name, data, created_at, updated_at)
         VALUES (?1, ?2, ?3, COALESCE((SELECT created_at FROM projects WHERE id = ?1), ?4), ?4)`
      )
      .run(id, name, data, now);
  }

  loadProject(id: string): string | null {
    const row = this.db.prepare('SELECT data FROM projects WHERE id = ?').get(id) as
      | { data: string }
      | undefined;
    return row?.data ?? null;
  }

  listProjects(): ProjectMetadata[] {
    return this.db
      .prepare(
        'SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC'
      )
      .all() as unknown as ProjectMetadata[];
  }

  deleteProject(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  // ─── Crash recovery ────────────────────────────────────────

  getRecoveryData(): string | null {
    const row = this.db.prepare('SELECT data FROM recovery WHERE id = 1').get() as
      | { data: string }
      | undefined;
    return row?.data ?? null;
  }

  saveRecoveryData(data: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO recovery (id, data, timestamp) VALUES (1, ?, ?)')
      .run(data, nowSeconds());
  }

  clearRecoveryData(): void {
    this.db.prepare('DELETE FROM recovery WHERE id = 1').run();
  }

  // ─── Recent files ──────────────────────────────────────────

  addRecentFile(path: string, name: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO recent_files (path, name, last_opened) VALUES (?, ?, ?)')
      .run(path, name, nowSeconds());
  }

  getRecentFiles(): RecentFile[] {
    return this.db
      .prepare(
        'SELECT path, name, last_opened FROM recent_files ORDER BY last_opened DESC LIMIT ?'
      )
      .all(RECENT_FILES_LIMIT) as unknown as RecentFile[];
  }

  clearRecentFiles(): void {
    this.db.prepare('DELETE FROM recent_files').run();
  }
}
