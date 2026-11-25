#!/usr/bin/env bash
# check: The world's pure code, unit-tested
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# test/unit/<area>.mjs (restructure step 6; one file an area since 2026-11-07, found by glob): the world's code that runs without a page, read from the
# dev build by its own anchors (src/ exports nothing for it): the streams and integer hashes (values,
# ranges, spread), the sky order's rules (the landing sky the hour's, never one of the last few, near unless
# far, every sky seen), the maps and the kit weights (in [0, 1]; the same plan and flight from the same seed),
# and the plan's worker against the page's own plan, hash for hash. Golden values in test/golden/unit/<area>.json:
# after a deliberate change, node test/unit/<area>.mjs --write, committed with it.
# every area file found by glob, each in its own process (node --test runs them side by side); a new area is a new file
# plants-also: test/unit/*.mjs
# (CI lane, 2026-11-24) a plant written in one area file (tools/check.mjs --prove sets CHECK_PLANT_AT to the file the
# plant line is in) is that file's to catch, so only that file runs: a unit plant re-ran all 40 area files, two minutes
# a plant on a hosted runner. Any other run, every file.
# (HYGIENE lane, 2026-11-25) `# parts: 2`: tools/check.mjs runs this as two checks on a push, CHECK_PART=0/2 and 1/2,
# so two shards take the area files side by side (104 s on one shard: every lane's iteration waited on it). Not three:
# 35-birds is three parts, so a third would share a shard with one of them (#469: 119 and 141 s beside its 20 processes). The files
# are dealt longest first, each to the part with the least so far, by their seconds alone on a 4-core machine below
# (stills counts 14: its build test runs a whole build; a file not listed counts 1 s), so both parts compute the same split and every file runs in exactly one. Unset
# (plants, --only, a run by hand): every file.
# parts: 2
part=0; parts=1
if [[ "${CHECK_PART:-}" =~ ^([0-9]+)/([0-9]+)$ ]]; then part=${BASH_REMATCH[1]}; parts=${BASH_REMATCH[2]}; fi
files=$(node -e '
  const W = { "flight-sim": 14, air: 12, aurora: 11, stills: 14, ruler: 10, maps: 9, band: 7, dunes: 6, drift: 6, sky: 5, lenticular: 4, clipmap: 4, sound: 3, drag: 2, handoff: 2 };
  const [part, parts] = process.argv.slice(1).map(Number), fs = require("fs"), w = (f) => W[f.replace(/\.mjs$/, "")] || 1;
  const all = fs.readdirSync("test/unit").filter((f) => /\.mjs$/.test(f)).sort().sort((a, b) => w(b) - w(a)), load = Array(parts).fill(0), mine = [];
  for (const f of all) { const k = load.indexOf(Math.min(...load)); load[k] += w(f); if (k === part) mine.push("test/unit/" + f); }
  console.log(mine.sort().join(" "));' "$part" "$parts")
[ -n "$files" ] || { echo "::error::no area file in part $part/$parts"; exit 1; }
if [[ "${CHECK_PLANT_AT:-}" =~ ^test/unit/[A-Za-z0-9_-]+\.mjs$ ]] && [ -f "$CHECK_PLANT_AT" ]; then files="$CHECK_PLANT_AT"; fi
node --test --test-reporter=tap $files > "$RUNNER_TEMP/u" 2>&1 || rc=$?
cat "$RUNNER_TEMP/u"
n=$(grep -cE '^(ok|not ok) [0-9]+ - ' "$RUNNER_TEMP/u" || true); f=$(ls $files | wc -l)
echo "unit: $n tests in $f area files"
exit ${rc:-0}
