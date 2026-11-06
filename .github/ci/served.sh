#!/usr/bin/env bash
# served.sh: what base and head serve, built (tools/build.mjs --plain, each commit with its own tools and its own
# pinned terser). site/ holds only sources; the files a visitor gets (the minified scripts, the start file and its
# table) exist only in a build. The gates compare these two folders and render them.
#   bash .github/ci/served.sh BASE_SHA OUT     -> OUT/base, OUT/head (run from the head's checkout)
set -euo pipefail
base_sha="$1"; rm -rf "$2"; mkdir -p "$2"; out="$(cd "$2" && pwd)"
wt="$(mktemp -d)/base"
git worktree add --detach "$wt" "$base_sha" >/dev/null
( cd "$wt" && npm ci --no-audit --no-fund --ignore-scripts >/dev/null && node tools/build.mjs --plain "$out/base" >/dev/null ) &
b=$!
npm ci --no-audit --no-fund --ignore-scripts >/dev/null
node tools/build.mjs --plain "$out/head" >/dev/null
wait "$b"
git worktree remove --force "$wt"
echo "built: base $base_sha -> $out/base ($(find "$out/base" -type f | wc -l) files), head -> $out/head ($(find "$out/head" -type f | wc -l) files)"
