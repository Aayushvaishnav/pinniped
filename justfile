# Build and install Pinniped desktop as an RPM.

build:
    npm run build
    npx electron-builder --config electron/electron-builder.yml --linux rpm

install: build
    sudo rpm -Uvh --force electron/out/pinniped-*.rpm

# Rebuild on change (vite build --watch) and reload the desktop window when the bundle updates.
dev-electron:
    #!/usr/bin/env bash
    set -euo pipefail
    # Don't empty dist on rebuilds: the open window keeps fetching config.json from it.
    npx vite build --watch --emptyOutDir false &
    watcher=$!
    trap 'kill $watcher 2>/dev/null || true' EXIT
    until [ -f dist/index.html ] && [ -f dist/config.json ]; do sleep 1; done
    CINNY_DEV_RELOAD=1 npm run electron:start
