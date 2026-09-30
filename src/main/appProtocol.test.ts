import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isServerApiPath, resolveAppFile } from './appProtocol';

describe('resolveAppFile', () => {
  let dist: string;
  let index: string;

  beforeAll(() => {
    dist = mkdtempSync(path.join(tmpdir(), 'opencad-dist-'));
    index = path.join(dist, 'index.html');
    writeFileSync(index, '<html></html>');
    mkdirSync(path.join(dist, 'assets'));
    writeFileSync(path.join(dist, 'assets', 'app.js'), '');
    writeFileSync(path.join(dist, 'file with space.txt'), '');
    writeFileSync(path.join(path.dirname(dist), 'secret.txt'), '');
  });

  afterAll(() => {
    rmSync(dist, { recursive: true, force: true });
    rmSync(path.join(path.dirname(dist), 'secret.txt'), { force: true });
  });

  it('serves existing files', () => {
    expect(resolveAppFile(dist, '/assets/app.js')).toBe(path.join(dist, 'assets', 'app.js'));
  });

  it('decodes URL-encoded paths', () => {
    expect(resolveAppFile(dist, '/file%20with%20space.txt')).toBe(
      path.join(dist, 'file with space.txt')
    );
  });

  it('falls back to index.html for client-side routes and the root', () => {
    expect(resolveAppFile(dist, '/')).toBe(index);
    expect(resolveAppFile(dist, '/project/123')).toBe(index);
    expect(resolveAppFile(dist, '/assets')).toBe(index);
  });

  it('never resolves outside the dist directory', () => {
    expect(resolveAppFile(dist, '/../secret.txt')).toBe(index);
    expect(resolveAppFile(dist, '/%2e%2e/secret.txt')).toBe(index);
    expect(resolveAppFile(dist, '/..%2Fsecret.txt')).toBe(index);
  });

  it('falls back to index.html for malformed encodings', () => {
    expect(resolveAppFile(dist, '/%E0%A4%A')).toBe(index);
  });
});

describe('isServerApiPath', () => {
  it('matches the server API but not app routes or assets', () => {
    expect(isServerApiPath('/api')).toBe(true);
    expect(isServerApiPath('/api/v1/health')).toBe(true);
    expect(isServerApiPath('/apiary')).toBe(false);
    expect(isServerApiPath('/project/api')).toBe(false);
    expect(isServerApiPath('/assets/api.js')).toBe(false);
  });
});
