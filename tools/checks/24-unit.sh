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
files='test/unit/*.mjs'
if [[ "${CHECK_PLANT_AT:-}" =~ ^test/unit/[A-Za-z0-9_-]+\.mjs$ ]] && [ -f "$CHECK_PLANT_AT" ]; then files="$CHECK_PLANT_AT"; fi
node --test --test-reporter=tap $files > "$RUNNER_TEMP/u" 2>&1 || rc=$?
cat "$RUNNER_TEMP/u"
n=$(grep -cE '^(ok|not ok) [0-9]+ - ' "$RUNNER_TEMP/u" || true); f=$(ls $files | wc -l)
echo "unit: $n tests in $f area files"
exit ${rc:-0}
