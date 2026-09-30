import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  asCopy,
  documentKey,
  importProjectScript,
  parseProjectFile,
  projectExistsScript,
  projectFilesFromArgv,
  PROJECTS_KEY,
  type ProjectDocument,
} from './projectFile';

/** Runs a page script against an in-memory localStorage, like executeJavaScript would */
function runInPage(script: string, items: Record<string, string> = {}): {
  result: unknown;
  items: Record<string, string>;
} {
  const store = new Map(Object.entries(items));
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  };
  const result = vm.runInNewContext(script, { localStorage, JSON });
  return { result, items: Object.fromEntries(store) };
}

const doc: ProjectDocument = {
  id: 'p1',
  name: 'House',
  content: { elements: { e1: { type: 'wall' } } },
  organization: { layers: {}, levels: {} },
  metadata: { createdAt: 1 },
};

describe('parseProjectFile', () => {
  it('accepts a serialised DocumentSchema', () => {
    const result = parseProjectFile(JSON.stringify(doc));
    expect(result).toEqual({ ok: true, document: doc });
  });

  it('names untitled projects', () => {
    const result = parseProjectFile(JSON.stringify({ ...doc, name: '  ' }));
    expect(result.ok && result.document.name).toBe('Untitled Project');
  });

  it.each([
    ['not JSON', '{nope', /not valid JSON/],
    ['an array', '[]', /does not contain/],
    ['no id', JSON.stringify({ ...doc, id: '' }), /no ID/],
    ['no elements', JSON.stringify({ ...doc, content: {} }), /no content/],
    ['no organization', JSON.stringify({ ...doc, organization: null }), /no organization/],
  ])('rejects %s', (_label, text, error) => {
    const result = parseProjectFile(text);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(error);
  });
});

describe('asCopy', () => {
  it('changes only the ID and name', () => {
    expect(asCopy(doc, 'p2', 'House (copy)')).toEqual({ ...doc, id: 'p2', name: 'House (copy)' });
    expect(doc.id).toBe('p1');
  });
});

describe('projectExistsScript', () => {
  it('finds a project in the list or by its stored document', () => {
    expect(runInPage(projectExistsScript('p1')).result).toBe(false);
    expect(
      runInPage(projectExistsScript('p1'), { [PROJECTS_KEY]: JSON.stringify([{ id: 'p1' }]) })
        .result
    ).toBe(true);
    expect(runInPage(projectExistsScript('p1'), { [documentKey('p1')]: '{}' }).result).toBe(true);
  });

  it('treats a corrupted project list as empty', () => {
    expect(runInPage(projectExistsScript('p1'), { [PROJECTS_KEY]: '{bad' }).result).toBe(false);
  });
});

describe('importProjectScript', () => {
  it('stores the document and adds it to the project list', () => {
    const other = { id: 'p0', name: 'Other' };
    const { result, items } = runInPage(importProjectScript(doc, 1000), {
      [PROJECTS_KEY]: JSON.stringify([other]),
    });

    expect(result).toBe('p1');
    expect(JSON.parse(items[documentKey('p1')]!)).toEqual(doc);
    expect(JSON.parse(items[PROJECTS_KEY]!)).toEqual([
      other,
      {
        id: 'p1',
        name: 'House',
        thumbnail: null,
        createdAt: 1000,
        updatedAt: 1000,
        collaborators: [],
        starred: false,
      },
    ]);
  });

  it('keeps createdAt, collaborators and starred of an existing entry', () => {
    const existing = {
      id: 'p1',
      name: 'Old name',
      thumbnail: null,
      createdAt: 5,
      updatedAt: 6,
      collaborators: ['u1'],
      starred: true,
    };
    const { items } = runInPage(importProjectScript(doc, 1000), {
      [PROJECTS_KEY]: JSON.stringify([existing]),
    });

    expect(JSON.parse(items[PROJECTS_KEY]!)).toEqual([
      { ...existing, name: 'House', updatedAt: 1000 },
    ]);
  });

  it('safely embeds names with quotes and script-like content', () => {
    const tricky = { ...doc, name: `"'\`</script>\${alert(1)}` };
    const { items } = runInPage(importProjectScript(tricky, 1));
    expect(JSON.parse(items[PROJECTS_KEY]!)[0].name).toBe(tricky.name);
  });
});

describe('projectFilesFromArgv', () => {
  it('picks *.opencad paths and skips switches', () => {
    expect(
      projectFilesFromArgv(['.', '--dev-url=http://x', 'a/House.opencad', 'B.OPENCAD', 'x.ifc'])
    ).toEqual(['a/House.opencad', 'B.OPENCAD']);
  });
});
