/**
 * Project files (*.opencad) and how they get into the OpenCAD web app.
 *
 * A project file is the JSON-serialised DocumentSchema, the same format the
 * Tauri variant reads and writes (packages/desktop/src/index.ts). The web app
 * keeps projects in localStorage: a project list and one document per
 * project (packages/app/src/stores/projectStore.ts, documentStore.ts), and
 * loads the document when it navigates to /project/<id>. Opening a file
 * therefore means writing both entries and navigating to the project.
 */

/** localStorage key of the web app's project list */
export const PROJECTS_KEY = 'opencad-projects';

/** localStorage key of one project's document */
export function documentKey(projectId: string): string {
  return `opencad-document:${projectId}`;
}

export const PROJECT_FILE_FILTERS = [
  { name: 'OpenCAD Project', extensions: ['opencad'] },
  { name: 'All Files', extensions: ['*'] },
];

/** The fields of DocumentSchema the web app needs to load a project */
export interface ProjectDocument {
  id: string;
  name: string;
  content: { elements: Record<string, unknown> };
  organization: Record<string, unknown>;
  [key: string]: unknown;
}

export type ParseResult =
  | { ok: true; document: ProjectDocument }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProjectFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }

  if (!isRecord(data)) {
    return { ok: false, error: 'The file does not contain an OpenCAD project.' };
  }
  if (typeof data.id !== 'string' || data.id.length === 0) {
    return { ok: false, error: 'The project has no ID.' };
  }
  if (!isRecord(data.content) || !isRecord(data.content.elements)) {
    return { ok: false, error: 'The project has no content.' };
  }
  if (!isRecord(data.organization)) {
    return { ok: false, error: 'The project has no organization (layers, levels).' };
  }

  const name = typeof data.name === 'string' && data.name.trim() ? data.name : 'Untitled Project';
  return { ok: true, document: { ...(data as ProjectDocument), name } };
}

/** Copy of the document under a new project ID and name */
export function asCopy(document: ProjectDocument, id: string, name: string): ProjectDocument {
  return { ...document, id, name };
}

/**
 * Script run in the web app's page: true when a project with the ID already
 * exists in the project list or has a stored document.
 */
export function projectExistsScript(projectId: string): string {
  const id = JSON.stringify(projectId);
  return `(() => {
    try {
      if (localStorage.getItem(${JSON.stringify(documentKey(projectId))}) !== null) return true;
      const projects = JSON.parse(localStorage.getItem(${JSON.stringify(PROJECTS_KEY)}) || '[]');
      return Array.isArray(projects) && projects.some((p) => p && p.id === ${id});
    } catch {
      return false;
    }
  })()`;
}

/**
 * Script run in the web app's page: stores the document and adds (or updates)
 * its entry in the project list, keeping createdAt and starred of an existing
 * entry.
 */
export function importProjectScript(document: ProjectDocument, now: number): string {
  return `(() => {
    const doc = ${JSON.stringify(document)};
    const now = ${JSON.stringify(now)};
    let projects = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(${JSON.stringify(PROJECTS_KEY)}) || '[]');
      if (Array.isArray(parsed)) projects = parsed;
    } catch {
      projects = [];
    }
    const existing = projects.find((p) => p && p.id === doc.id);
    const entry = {
      id: doc.id,
      name: doc.name,
      thumbnail: null,
      createdAt: existing && typeof existing.createdAt === 'number' ? existing.createdAt : now,
      updatedAt: now,
      collaborators: existing && Array.isArray(existing.collaborators) ? existing.collaborators : [],
      starred: existing ? existing.starred === true : false,
    };
    projects = projects.filter((p) => !p || p.id !== doc.id).concat(entry);
    localStorage.setItem(${JSON.stringify(documentKey(document.id))}, JSON.stringify(doc));
    localStorage.setItem(${JSON.stringify(PROJECTS_KEY)}, JSON.stringify(projects));
    return doc.id;
  })()`;
}

/** Project files passed on the command line (file associations, `electron . file.opencad`) */
export function projectFilesFromArgv(argv: readonly string[]): string[] {
  return argv.filter((arg) => !arg.startsWith('-') && arg.toLowerCase().endsWith('.opencad'));
}
