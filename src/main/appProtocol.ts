/**
 * Serves the built OpenCAD web app (packages/app/dist) over a custom
 * `opencad://app/` scheme.
 *
 * A custom scheme instead of file:// gives the app a stable origin (needed by
 * IndexedDB, localStorage and the service worker) and lets unknown paths fall
 * back to index.html, which the app's BrowserRouter relies on.
 */

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

export const APP_SCHEME = 'opencad';
export const APP_HOST = 'app';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/**
 * Paths of the OpenCAD server API. The desktop app has no server behind
 * `opencad://app`, so these must fail instead of falling back to index.html -
 * otherwise the web app's health check (`/api/v1/health`) reports the server
 * as online and project creation waits on API calls that return HTML.
 */
export function isServerApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

/**
 * Map a request pathname to a file inside `distDir`.
 * Paths escaping `distDir` and paths without a matching file resolve to index.html.
 */
export function resolveAppFile(distDir: string, pathname: string): string {
  const indexFile = path.join(distDir, 'index.html');
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return indexFile;
  }

  const root = path.resolve(distDir);
  const candidate = path.resolve(root, `.${path.posix.normalize(`/${decoded}`)}`);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    return indexFile;
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }
  return indexFile;
}
