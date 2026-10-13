# AGENTS.md

This repository is a private fork of [cinnyapp/cinny](https://github.com/cinnyapp/cinny), kept in sync with upstream `dev` via rebase. This file documents the workflow that any agent (human or AI) working in this repo must follow.

## Remotes

```
origin    git@github.com:largelanguagemeowing/cinny.git   (the fork, push here)
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
podman build --format docker \
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

## Fork-only files

- `AGENTS.md` itself is fork-only. It does not exist upstream and must survive every rebase.
- Any other fork-only files (scripts, configs) should be clearly named and kept in fork-specific paths so they do not collide with upstream files during rebase.

## Frontend form sizing

- In account and settings form rows, explicitly use `size="400"` for text inputs paired with `size="400"` action buttons. Put each input in a growing column wrapper so it stretches to the available row width. Do not rely on defaults, and visually verify that newly added controls match adjacent fields and buttons.
