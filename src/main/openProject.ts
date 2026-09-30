/**
 * File → Open: loads a *.opencad project file into the web app.
 *
 * Used by the menu, by files passed on the command line (file associations)
 * and by macOS "open-file" events.
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import {
  asCopy,
  importProjectScript,
  parseProjectFile,
  projectExistsScript,
  PROJECT_FILE_FILTERS,
  type ProjectDocument,
} from './projectFile';
import type { Storage } from './storage';

export interface ProjectOpenerOptions {
  /** Base URL of the web app (opencad://app or the Vite dev server) */
  appBaseUrl: string;
  storage: Storage;
}

export type OpenProjectFile = (window: BrowserWindow, filePath?: string) => Promise<void>;

async function showError(window: BrowserWindow, filePath: string, detail: string): Promise<void> {
  await dialog.showMessageBox(window, {
    type: 'error',
    title: 'Open Project',
    message: `Cannot open ${path.basename(filePath)}`,
    detail,
  });
}

/**
 * Decide what to do when the project is already in the web app.
 * Returns the document to import, or null when the user cancels.
 */
async function resolveConflict(
  window: BrowserWindow,
  document: ProjectDocument
): Promise<ProjectDocument | null> {
  const exists = (await window.webContents.executeJavaScript(
    projectExistsScript(document.id)
  )) as boolean;
  if (!exists) return document;

  const { response } = await dialog.showMessageBox(window, {
    type: 'question',
    title: 'Open Project',
    message: `The project "${document.name}" is already open in OpenCAD.`,
    detail:
      'Replace overwrites the local copy with the file. ' +
      'Open as Copy keeps the local copy and adds the file as a new project.',
    buttons: ['Replace', 'Open as Copy', 'Cancel'],
    defaultId: 1,
    cancelId: 2,
    noLink: true,
  });

  if (response === 0) return document;
  if (response === 1) return asCopy(document, randomUUID(), `${document.name} (copy)`);
  return null;
}

export function createProjectOpener({ appBaseUrl, storage }: ProjectOpenerOptions): OpenProjectFile {
  return async (window, filePath) => {
    let selected = filePath;
    if (!selected) {
      const result = await dialog.showOpenDialog(window, {
        title: 'Open Project',
        properties: ['openFile'],
        filters: PROJECT_FILE_FILTERS,
      });
      if (result.canceled || !result.filePaths[0]) return;
      selected = result.filePaths[0];
    }

    let text: string;
    try {
      text = await fs.readFile(selected, 'utf8');
    } catch (err) {
      await showError(window, selected, err instanceof Error ? err.message : String(err));
      return;
    }

    const parsed = parseProjectFile(text);
    if (!parsed.ok) {
      await showError(window, selected, parsed.error);
      return;
    }

    const document = await resolveConflict(window, parsed.document);
    if (!document) return;

    await window.webContents.executeJavaScript(importProjectScript(document, Date.now()));
    storage.addRecentFile(selected, document.name);

    // A full load, so the web app's stores re-read the project list
    await window.loadURL(`${appBaseUrl}/project/${encodeURIComponent(document.id)}`);
  };
}
