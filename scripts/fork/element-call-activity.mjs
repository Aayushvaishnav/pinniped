import fs from 'node:fs';
import path from 'node:path';
import { buildElementCallFork, elementCallForkStale } from './element-call/build.mjs';

// Element Call 0.20.1 suppresses its speaking CSS in spotlight/one-to-one layouts.
// Expose the existing raw observable value on the media tile for Cinny's sidebar.
// Keep the patch guarded: an embedded-call upgrade must review this integration.
export function patchCallActivity(source) {
  const marker = 'videoFit:T,className:(0,z.default)(c,m5.tile,{[m5.speaking]:re';
  if (source.split(marker).length !== 2 || !source.includes('w=V(t.speaking$)')) {
    throw new Error(
      'Element Call activity patch no longer matches; review the embedded call integration.'
    );
  }
  return source.replace(
    marker,
    'videoFit:T,"data-cinny-speaking":w,"data-cinny-user-id":t.userId,className:(0,z.default)(c,m5.tile,{[m5.speaking]:re'
  );
}

// Prefer the Element Call fork (vendored in element-call/, built by
// `npm run build:element-call` or the Dockerfile). Without a fork build, fall back to
// the published embedded package plus the minified-bundle patch below.
export function prepareElementCall() {
  const fork = path.resolve(
    process.env.ELEMENT_CALL_FORK_DIST ?? 'node_modules/.cache/cinny-element-call-fork'
  );
  // Rebuild the vendored widget whenever its source is newer than the last build,
  // so `vite`/`vite build` never serve a stale call widget.
  // The container and nix builds prebuild (or skip) the widget themselves and opt out.
  if (process.env.ELEMENT_CALL_FORK_REBUILD !== '0' && elementCallForkStale(fork)) {
    buildElementCallFork(fork);
  }
  if (fs.existsSync(path.join(fork, 'index.html'))) return fork;
  const root = path.resolve('node_modules/@element-hq/element-call-embedded');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.version !== '0.20.1')
    throw new Error('Review the Element Call activity patch for the new version.');
  const output = path.resolve('node_modules/.cache/cinny-element-call');
  // Copying the 42 MB embedded dist runs on every vite start and build; the result
  // only changes when the embedded package version does.
  const marker = `${output}.version`;
  if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8') === pkg.version) return output;
  fs.rmSync(output, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'dist'), output, { recursive: true });
  const asset = path.join(output, 'assets/index-Dul-9Slf.js');
  const patchedAsset = path.join(output, 'assets/index-Dul-9Slf-cinny-activity.js');
  fs.writeFileSync(patchedAsset, patchCallActivity(fs.readFileSync(asset, 'utf8')));
  // A new URL ensures browsers do not reuse the unpatched cached widget bundle.
  const html = path.join(output, 'index.html');
  fs.writeFileSync(
    html,
    fs
      .readFileSync(html, 'utf8')
      .replaceAll('index-Dul-9Slf.js', 'index-Dul-9Slf-cinny-activity.js')
  );
  fs.writeFileSync(marker, pkg.version);
  return output;
}
