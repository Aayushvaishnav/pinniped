// Builds the Element Call fork: upstream tag + the patch series in this directory.
// Usage: node scripts/fork/element-call/build.mjs [outDir]
// Output defaults to node_modules/.cache/cinny-element-call-fork.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ELEMENT_CALL_REPO = 'https://github.com/element-hq/element-call.git';
export const ELEMENT_CALL_TAG = 'v0.20.1';

const here = path.dirname(fileURLToPath(import.meta.url));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

export function buildElementCallFork(outDir) {
  // Must live outside node_modules: Vite skips tsconfig.json for files under it, which
  // drops `useDefineForClassFields: false` and breaks Element Call's class initialisers.
  const work = path.join(os.tmpdir(), 'cinny-element-call-src');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(work), { recursive: true });
  run('git', ['clone', '--depth', '1', '--branch', ELEMENT_CALL_TAG, ELEMENT_CALL_REPO, work]);

  fs.readdirSync(here)
    .filter((f) => f.endsWith('.patch'))
    .sort()
    .forEach((f) => run('git', ['apply', '--index', path.join(here, f)], work));

  run('pnpm', ['install', '--frozen-lockfile'], work);
  run('pnpm', ['build:embedded'], work);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(path.join(work, 'dist'), outDir, { recursive: true });
  return outDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.resolve(process.argv[2] ?? 'node_modules/.cache/cinny-element-call-fork');
  buildElementCallFork(out);
  console.log(`Element Call fork built at ${out}`);
}
