#!/usr/bin/env bash
# Fork-only helper: refresh npmDepsHash in package.nix after package-lock.json
# changes (e.g. an upstream rebase). Run as: nix run .#update-npm-deps
# CI may pass the hash directly (from nix build's "got:" line) as $1 to skip
# the prefetch step.
set -euo pipefail

if [[ $# -eq 1 ]]; then
  hash=$1
else
  prefetcher=$(nix-build -E 'with import <nixpkgs> {}; prefetch-npm-deps' --no-out-link)
  hash=$("$prefetcher/bin/prefetch-npm-deps" package-lock.json)
fi

old=$(grep -o 'npmDepsHash = "[^"]*"' package.nix)
if [[ "$old" == *"\"$hash\""* ]]; then
  echo "npmDepsHash already up to date"
  exit 0
fi

sed -i "s|npmDepsHash = \"[^\"]*\"|npmDepsHash = \"$hash\"|" package.nix
echo "updated: ${old} -> npmDepsHash = \"$hash\""
