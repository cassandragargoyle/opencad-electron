// Runs the OpenCAD Vite dev server, waits until it responds, then starts Electron against it
// Usage: node scripts/dev.mjs <opencad-dir> <dev-url>
import { spawn, spawnSync } from 'node:child_process';

const [opencadDir = 'submodule/opencad', devUrl = 'http://localhost:5173'] = process.argv.slice(2);
const isWindows = process.platform === 'win32';

// pnpm is a .cmd shim on Windows, which needs a shell to run
function run(args, options = {}) {
  return spawn('pnpm', args, { stdio: 'inherit', shell: isWindows, ...options });
}

// Kills the process together with its children (pnpm -> vite / electron)
function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // process group already gone
    }
  }
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// Detached on POSIX so the whole Vite process group can be killed at once
const vite = run(['-C', opencadDir, 'dev:browser'], { detached: !isWindows });
let electron;

function shutdown(code) {
  killTree(electron);
  killTree(vite);
  process.exit(code);
}

vite.on('exit', (code) => {
  console.error(`Vite dev server exited (code ${code})`);
  shutdown(code ?? 1);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(130));
}

console.log(`Waiting for ${devUrl} ...`);
while (!(await isReachable(devUrl))) {
  await new Promise((resolve) => setTimeout(resolve, 500));
}

electron = run(['exec', 'electron', '.', `--dev-url=${devUrl}`]);
electron.on('exit', (code) => shutdown(code ?? 0));
