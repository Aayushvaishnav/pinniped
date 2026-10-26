# AGENTS.md

This repository is a private fork of [cinnyapp/cinny](https://github.com/cinnyapp/cinny), kept in sync with upstream `dev` via rebase. This file documents the workflow that any agent (human or AI) working in this repo must follow.

## Remotes

```
origin    git@github.com:largelanguagemeowing/pinniped.git   (the fork, push here)
upstream  git@github.com:cinnyapp/cinny.git                (read-only source of truth)
```

- `origin` is the fork you own and push to.
- `upstream` is the original cinnyapp/cinny. Fetch only. Never push here.

## Branch layout

```
upstream/dev  --*--*--*--*--*--*--*   (read-only)
                 | ff-only
dev           --*--*--*--*--*--*--*   (mirror, push to origin)
                 | rebase
fork/dev      --*--*--*  <- fork-specific commits, always on top
```

- `dev` is a pure fast-forward mirror of `upstream/dev`. Never commit on it. Never rebase or merge into it. It only ever advances via `git merge --ff-only upstream/dev`.
- `fork/dev` is where all fork-specific work lives. It is rebased onto `dev` on every sync. This is the branch you build and deploy from.

## Where to commit

- All fork-specific changes go on `fork/dev`.
- Do not commit on `dev`. The `git sync` alias enforces this with a fast-forward-only merge that will refuse to run if `dev` has diverged.
- Keep commits small and atomic. Small commits make rebase conflicts easy to resolve and easy to reorder or squash. Since this is a private fork with no upstream PRs, you are free to squash aggressively.

## Syncing with upstream

Run the one-command sync:

```bash
git sync
```

This runs, in order:

1. `git fetch upstream`
2. `git checkout dev`
3. `git merge --ff-only upstream/dev` (aborts if `dev` has diverged)
4. `git push origin dev`
5. `git checkout fork/dev`
6. `git rebase dev` (replays your commits on top of the new `dev`)
7. `git push --force-with-lease origin fork/dev`

If any step fails, fix the cause and rerun. The `--force-with-lease` on the final push will fail if `origin/fork/dev` has moved since your last fetch, which protects against clobbering work pushed from another clone.

## Useful aliases

```bash
git sync        # full upstream sync (see above)
git fork-log    # show commits fork/dev carries on top of dev
git dev-log     # show recent upstream commits on dev
```

## Config in effect (repo-local)

```
rebase.autoStash              = true
pull.rebase                   = true
push.default                  = current
branch.dev.remote             = upstream   (fetch)
branch.dev.pushRemote         = origin
branch.fork/dev.remote        = .          (rebases onto local dev)
branch.fork/dev.pushRemote    = origin
branch.fork/dev.rebase        = true
```

## Recovering from a messy rebase

1. `git rebase --abort` to get back to the pre-rebase state.
2. Squash or reorder your commits: `git rebase -i dev`.
3. Retry `git sync`.

If one upstream commit conflicts with several of yours, squashing yours first usually makes the conflict trivial.

## Element Call fork

Calls run in an embedded Element Call widget (`element-call/`, vendored in the
tree). It is NOT built by cinny's own build: `scripts/fork/element-call/build.mjs`
runs `pnpm install && pnpm build:embedded` in `element-call/` and copies
`dist/` to `node_modules/.cache/cinny-element-call-fork`, which
`scripts/fork/element-call-activity.mjs` (called from vite.config.js) embeds
under `public/element-call/`. The Dockerfile does the same in a first stage.
`vite` and `vite build` rebuild it automatically when anything under `element-call/` is newer than the last build (the Dockerfile and nix set `ELEMENT_CALL_FORK_REBUILD=0`). Without a fork build, vite falls back to the published
`@element-hq/element-call-embedded` package (used by the nix build, which does
not build the vendored tree — its call widget has none of the fork's changes).

The vendored tree is upstream `v0.20.1` with the former patch series
(voice-call-layout, sound-overrides) applied plus fork changes made in place.
There are no patch files anymore; edit `element-call/` directly. To upgrade:
refresh the tree from a new upstream tag and re-do the fork changes (see
`git log -- element-call/` for what they are).

Fork changes on top of upstream + old patches:

- **Audio pipeline** (`src/livekit/denoise.ts` and its callers): the mic is
  always captured raw (browser noise suppression and AGC off; AEC stays with
  the browser), DeepFilterNet 3 denoising via `deepfilternet3-noise-filter` as
  an opt-in toggle (Cinny settings → Calls, off by default; Cinny seeds
  the widget via the `denoise`/`audioInput`/`audioOutput` URL params and updates
  them mid-call with the `io.cinny.call_settings` widget action; the mic and
  speaker pickers live there too, and the widget's settings modal is not reachable
  when embedded (all its entry points are hidden when `widget !== null`; its
  remaining tabs — effect volume, camera, background blur — are dead there),
  96 kbps Opus, DTX off. The DF3 runtime wasm + model (~24 MB) are vendored
  under `element-call/public/df3/` and copied into the widget output by
  `scripts/fork/element-call/build.mjs` (the embedded vite build disables
  publicDir). A previous `denoise-voice-clarity` attempt bundled an AGC/EQ/
  compressor "clarity chain" that sounded fried; it was replaced by pure DF3.
- **Call stats**: the widget (`src/livekit/callStats.ts`, reported from
  `InCallView`) samples each SFU connection's `RTCPeerConnection` stats once a
  second and sends the raw counters to Cinny as the `io.cinny.call_stats`
  widget action. `CallEmbed` keeps five minutes of history; clicking "Voice
  Connected" opens the ping popout and its Debug view
  (`src/app/features/call-status/stats/`).
- **Soundboard**: sounds live in Matrix data (`club.stablecat.pinniped.user_sounds`
  account data for the user, `club.stablecat.pinniped.room_sounds` state for a
  room or space, `club.stablecat.pinniped.sound_favorites` for favourites;
  `src/app/plugins/sound-pack/`). Cinny downloads a sound, hands the widget a
  same-origin `blob:` URL via the `io.cinny.soundboard` action, and the widget
  (`src/livekit/soundboard.ts`, owned by `Publisher`) decodes it and publishes it
  on an audio track of its own (source `unknown`, which `MatrixAudioRenderer`
  already plays) while also playing it locally. The mic track is untouched.
  The picker is `src/app/features/soundboard/`.
- Note: `element-call/` has its own pnpm/eslint/vitest setup. Its
  `.eslintrc.cjs` sets `root: true` so the outer repo's eslint does not
  cascade in. Run `pnpm lint:types`/`pnpm test:unit` inside `element-call/`.
  The voice-call-layout change (pre-dating the vendoring) changed the layout
  behaviour that 15 upstream tests pinned (the 35 failing cases in
  `CallViewModel`, `LayoutSwitch`, `InCallView` and `SpotlightTile`); those
  tests were removed rather than kept failing, so the suite is expected to be
  green. Upstream `v0.20.1` still has them if you want to port one.

## Build and deployment

The fork ships as a container image to a Kubernetes cluster. The app is a static Vite SPA served by nginx (see `Dockerfile`: `node:24.13.1-alpine` builds, `nginx:1.31.2-alpine` serves). Build and deploy from `fork/dev`, after committing and pushing.

### Target

- Registry: `repo.k8s.mreow.de` (Harbor)
- Image: `repo.k8s.mreow.de/githubshit/cinny`
- Namespace: `githubshit`
- Deployment: `cinny` (manifest in `k8s.yaml`)
- Cluster: DUS, kubectl context `admin@alessandro-talos`
- URL: `https://cinny.k8s.mreow.de/`

Deploy only to DUS. The `cluster-gz6gk` context is the FRA cluster, which also runs a `cinny` deployment (served at `cinny.k8s-fra.mreow.de`); do not roll out there.

The deployment uses `imagePullPolicy: Always` with the `:latest` tag, so a rollout restart pulls whatever `:latest` currently points to in the registry.

### Tooling (this machine)

- `podman` (not docker) for image builds and pushes
- `kubectl` (context `admin@alessandro-talos`, always pass it explicitly)

### Deploy steps

```bash
SHA=$(git rev-parse --short HEAD)

# 1. Build. Use --format docker; tag latest plus a sha tag for traceability.
#    APP_COMMIT is shown in the app version and the Matrix device name (.git is not in the image).
podman build --format docker \
  --build-arg APP_COMMIT=$SHA \
  -t repo.k8s.mreow.de/githubshit/cinny:latest \
  -t repo.k8s.mreow.de/githubshit/cinny:sha-$SHA \
  -f Dockerfile .

# 2. Push both tags. The saved login in ~/.config/containers/auth.json has
#    push rights to githubshit/cinny.
podman push repo.k8s.mreow.de/githubshit/cinny:sha-$SHA
podman push repo.k8s.mreow.de/githubshit/cinny:latest

# 3. Roll out on DUS so k8s pulls the new :latest.
kubectl --context admin@alessandro-talos -n githubshit rollout restart deployment/cinny
kubectl --context admin@alessandro-talos -n githubshit rollout status deployment/cinny --timeout=240s
```

### Verifying a deploy

Do not compare the local podman image digest to the cluster's `imageID`. They legitimately differ (local config digest vs registry manifest digest, and `--format docker` vs OCI). Verify by the **served bundle hash** instead:

```bash
# What the live site serves
curl -sS https://cinny.k8s.mreow.de/ | grep -oE 'assets/index-[^"]+\.js' | head -1

# What the pushed image serves (should match the live site)
podman run --rm repo.k8s.mreow.de/githubshit/cinny:latest cat /app/index.html \
  | grep -oE 'assets/index-[^"]+\.js' | head -1
```

A successful deploy: the live hash changed from the previous deploy, and live == pushed image. The build runs inside the container (no local `dist/` is produced), and a local `npm run build` yields a different hash than the container build (different Node version), so do not use a local build to verify the deployed bundle. Compare against the pushed image's `index.html`.

## Nix flake

`flake.nix` and `package.nix` are fork-only. They build the Electron app from source in the nixpkgs idiom: `buildNpmPackage` builds the Vite bundle, then a wrapper launches nixpkgs' `electron` against it. No electron-builder, fpm, or asar is involved (the main process uses only node built-ins + electron, so no node_modules are shipped). `dist/` and `electron/` are installed as siblings under `$out/lib/cinny` because `electron/main.cjs` resolves `../dist`.

```bash
nix build .#cinny           # build, symlinked at ./result
nix run .#cinny             # build and launch
nix profile install .#cinny # install into the user profile
```

Caveats:

- Flakes only see git-tracked files. Freshly created `flake.nix`/`package.nix` must be committed (or `git add -N`'d) before `nix build` works in the repo.
- The package version is read from `package.json` at eval time, so it tracks upstream automatically on rebase.
- When `package-lock.json` changes (upstream dependency updates), refresh `npmDepsHash` by running:
  ```bash
  nix run .#update-npm-deps
  ```
  (fork-only script `scripts/update-npm-deps.sh`; prefetches and rewrites the hash in `package.nix` in place, no-op if already current)
- CI covers this automatically: `.github/workflows/npm-deps-hash.yml` (fork-only) runs on pushes to `fork/dev` that touch `package-lock.json`, refreshes the hash, verifies `nix build .#pinniped`, and opens a PR (`auto/npm-deps-hash`) that only needs merging. So normally: push the rebase, merge the PR if it appears, done.

## Fork-only files

- `AGENTS.md` itself is fork-only. It does not exist upstream and must survive every rebase.
- `flake.nix` and `package.nix` are fork-only (see the Nix flake section). Upstream has neither file.
- `element-call/` is fork-only (see the Element Call fork section).
- Any other fork-only files (scripts, configs) should be clearly named and kept in fork-specific paths so they do not collide with upstream files during rebase.

## Frontend form sizing

- In account and settings form rows, explicitly use `size="400"` for text inputs paired with `size="400"` action buttons. Put each input in a growing column wrapper so it stretches to the available row width. Do not rely on defaults, and visually verify that newly added controls match adjacent fields and buttons.
