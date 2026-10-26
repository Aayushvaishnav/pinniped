// Builds the Element Call fork vendored in element-call/ (repo root).
// The vendored tree is upstream tag v0.20.1 with the former patch series
// (voice-call-layout, sound-overrides) already applied; edit it in place.
// Usage: node scripts/fork/element-call/build.mjs [outDir]
// Output defaults to node_modules/.cache/cinny-element-call-fork.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
export const ELEMENT_CALL_SRC = path.join(repoRoot, 'element-call');
export const ELEMENT_CALL_TAG = 'v0.20.1';

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

export function buildElementCallFork(outDir) {
  if (!fs.existsSync(path.join(ELEMENT_CALL_SRC, 'package.json'))) {
    throw new Error(`Element Call source not found at ${ELEMENT_CALL_SRC}`);
  }
  run('pnpm', ['install', '--frozen-lockfile'], ELEMENT_CALL_SRC);
  run('pnpm', ['build:embedded'], ELEMENT_CALL_SRC);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(path.join(ELEMENT_CALL_SRC, 'dist'), outDir, { recursive: true });
  return outDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.resolve(process.argv[2] ?? 'node_modules/.cache/cinny-element-call-fork');
  buildElementCallFork(out);
  console.log(`Element Call fork built at ${out}`);
}
