#!/usr/bin/env bash
# Fork-only helper: set the x86_64-linux pnpm store hash in element-call.nix.
# CI passes the hash from nix build's "got:" line as $1.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <sha256-hash>" >&2
  exit 1
fi
hash=$1

old=$(grep -o 'x86_64-linux = "[^"]*"' element-call.nix)
if [[ "$old" == *"\"$hash\""* ]]; then
  echo "pnpm deps hash already up to date"
  exit 0
fi

sed -i "s|x86_64-linux = \"[^\"]*\"|x86_64-linux = \"$hash\"|" element-call.nix
echo "updated: ${old} -> x86_64-linux = \"$hash\""
