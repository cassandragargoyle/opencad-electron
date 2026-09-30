// Prints `make help` — targets annotated with `## description` in the given makefiles
// Node instead of grep/awk so it works with make on Windows (cmd.exe)
import { readFileSync } from 'node:fs';

const TARGET = /^([a-zA-Z_-]+):.*?## (.*)$/;

for (const file of process.argv.slice(2)) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = TARGET.exec(line);
    if (match) {
      console.log(`  \x1b[36m${match[1].padEnd(14)}\x1b[0m ${match[2]}`);
    }
  }
}
