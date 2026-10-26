# Build and install Pinniped desktop as an RPM.

build:
    npm run build
    npx electron-builder --config electron/electron-builder.yml --linux rpm

install: build
    sudo rpm -Uvh --force electron/out/pinniped-*.rpm

# Fast iteration on the installed app: rebuild the bundle and copy it in place.
# Run `just install` once first; this refreshes app code only, not the electron
# runtime (re-run `just install` after a version bump or electron/ packaging change).
sync:
    npm run build
    sudo rsync -a --delete dist/ /opt/Pinniped/resources/app/dist/
    sudo rsync -a electron/*.cjs /opt/Pinniped/resources/app/electron/

# Desktop dev with HMR: vite dev server + an electron window loading it.
dev-electron:
    #!/usr/bin/env bash
    set -euo pipefail
    npx vite --strictPort &
    watcher=$!
    trap 'kill $watcher 2>/dev/null || true' EXIT
    until curl -sf http://localhost:8080/ >/dev/null 2>&1; do
      kill -0 $watcher 2>/dev/null || { echo "vite dev server exited" >&2; exit 1; }
      sleep 0.2
    done
    CINNY_DEV_SERVER_URL=http://localhost:8080 CINNY_DEV_RELOAD=1 npm run electron:start
