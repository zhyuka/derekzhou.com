#!/usr/bin/env bash
# check: The ink birds' behaviour, simulated
# test/birds.mjs (about 20 s): the real ink birds module run headless (tools/birds/sim.mjs) over random scenes at
# 960x600 and 390x844, against the research's numbers. The full run: BIRDS_N=16 BIRDS_LONG=1 node test/birds.mjs.
# plant: {"file": "src/birds/inkbirds/262-approach.js", "find": "function airLo(b) { return 0.45 * b.K.v; }", "with": "function airLo(b) { return 2.5 * b.K.v; }", "why": "a landing that can never happen (#89's own plant)"}
# (check-speed) each test of test/birds.mjs in its own process, side by side (their names read from the file, so a new
# test runs too): the slowest alone, not their sum
mapfile -t names < <(node -e "for (const m of require('fs').readFileSync('test/birds.mjs', 'utf8').matchAll(/^test\('((?:[^'\\\\]|\\\\.)*)'/gm)) console.log(m[1].replace(/\\\\(.)/g, '\$1'))")
[ "${#names[@]}" -gt 0 ] || { echo "::error::no test found in test/birds.mjs"; exit 1; }
pids=(); i=0
for n in "${names[@]}"; do
  pat=$(node -e "process.stdout.write('^' + process.argv[1].replace(/[.*+?^\${}()|[\]\\\\]/g, '\\\\$&') + '$')" "$n")
  node --test --test-reporter=tap --test-name-pattern="$pat" test/birds.mjs > "$RUNNER_TEMP/b$i" 2>&1 & pids+=($!); i=$((i + 1))
done
rc=0; for p in "${pids[@]}"; do wait "$p" || rc=1; done
cat "$RUNNER_TEMP"/b*
ran=$(cat "$RUNNER_TEMP"/b* | grep -cE '^(ok|not ok) [0-9]+ - ' || true)
echo "birds: ${#names[@]} tests in ${#names[@]} processes, $ran ran"
[ "$ran" -eq "${#names[@]}" ] || { echo "::error::birds: $ran of ${#names[@]} tests ran"; rc=1; }
exit $rc
