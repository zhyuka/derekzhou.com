#!/usr/bin/env bash
# served.sh: what base and head serve, built (tools/build.mjs --plain, each commit with its own tools and its own
# pinned terser). site/ holds only sources; the files a visitor gets (the minified scripts, the start file and its
# table) exist only in a build. The gates compare these two folders and render them.
#   bash .github/ci/served.sh BASE_SHA OUT     -> OUT/base, OUT/head (run from the head's checkout), and their settled twins
#                                                 OUT/base-twin, OUT/head-twin for T2 (tools/gpu/twin.js; never deployed)
set -euo pipefail
base_sha="$1"; rm -rf "$2"; mkdir -p "$2"; out="$(cd "$2" && pwd)"
wt="$(mktemp -d)/base"
twin="$(pwd)/tools/gpu/twin.js"   # (T2's settled twins, OUT/base-twin and OUT/head-twin, each made with its own commit's build tools: head's twin.js)
git worktree add --detach "$wt" "$base_sha" >/dev/null
( cd "$wt" && npm ci --no-audit --no-fund --ignore-scripts >/dev/null && node tools/build.mjs --plain "$out/base" >/dev/null && { [ ! -f "$twin" ] || node "$twin" "$wt" "$out/base" "$out/base-twin" >/dev/null; } ) &
b=$!
npm ci --no-audit --no-fund --ignore-scripts >/dev/null
node tools/build.mjs --plain "$out/head" >/dev/null
[ ! -f "$twin" ] || node "$twin" "$(pwd)" "$out/head" "$out/head-twin" >/dev/null
wait "$b"
git worktree remove --force "$wt"
echo "built: base $base_sha -> $out/base ($(find "$out/base" -type f | wc -l) files), head -> $out/head ($(find "$out/head" -type f | wc -l) files)"
