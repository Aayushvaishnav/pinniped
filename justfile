# Build and install Pinniped desktop as an RPM.

build:
    npm run build
    npx electron-builder --config electron/electron-builder.yml --linux rpm

install: build
    sudo rpm -Uvh --force electron/out/pinniped-*.rpm
