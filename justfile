# Build and install Pinniped desktop as an RPM.

build:
    npm run build
    npx electron-builder --config electron/electron-builder.yml --linux rpm

install: build
    sudo rpm -Uvh --force "$(ls -t electron/out/[Pp]inniped-*.rpm | head -1)"

# Fast iteration on the installed app: rebuild the bundle and repack the asar in place.
# Run `just install` once first; this refreshes app code only, not the electron
# runtime (re-run `just install` after a version bump or electron/ packaging change).
sync:
    #!/usr/bin/env bash
    set -euo pipefail
    npm run build
    stage=$(mktemp -d)
    trap 'rm -rf "$stage"' EXIT
    npx asar extract /opt/Pinniped/resources/app.asar "$stage/app"
    rsync -a --delete dist/ "$stage/app/dist/"
    rsync -a electron/*.cjs "$stage/app/electron/"
    npx asar pack "$stage/app" "$stage/app.asar" --unpack "**/icon.png"
    sudo rsync -a "$stage/app.asar" /opt/Pinniped/resources/app.asar
    sudo rsync -a --delete "$stage/app.asar.unpacked/" /opt/Pinniped/resources/app.asar.unpacked/

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
