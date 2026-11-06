#!/usr/bin/env bash
# check: The world's pure code, unit-tested
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# test/unit.mjs (restructure step 6, about 10 s): the world's code that runs without a page, read from the
# dev build by its own anchors (src/ exports nothing for it): the streams and integer hashes (values,
# ranges, spread), the sky order's rules (the landing sky the hour's, never one of the last few, near unless
# far, every sky seen), the maps and the kit weights (in [0, 1]; the same plan and flight from the same seed),
# and the plan's worker against the page's own plan, hash for hash. Golden values in test/golden/unit.json:
# after a deliberate change, node test/unit.mjs --write, committed with it.
# (dev-speed) in three processes side by side, by test name: the plan, the maps, and every other test (a new test runs
# in the third unless its name starts with plan or maps); each process assembles src/ itself
node --test --test-reporter=tap --test-name-pattern='^plan' test/unit.mjs > "$RUNNER_TEMP/u1" 2>&1 & p1=$!
node --test --test-reporter=tap --test-name-pattern='^maps' test/unit.mjs > "$RUNNER_TEMP/u2" 2>&1 & p2=$!
node --test --test-reporter=tap --test-skip-pattern='^(plan|maps)' test/unit.mjs > "$RUNNER_TEMP/u3" 2>&1 & p3=$!
rc=0; for p in $p1 $p2 $p3; do wait $p || rc=1; done
cat "$RUNNER_TEMP/u1" "$RUNNER_TEMP/u2" "$RUNNER_TEMP/u3"
n=$(cat "$RUNNER_TEMP/u1" "$RUNNER_TEMP/u2" "$RUNNER_TEMP/u3" | grep -cE '^(ok|not ok) [0-9]+ - ')
echo "unit: $n tests in three processes"
[ "$n" -ge 9 ] || { echo "::error::unit: fewer tests ran ($n) than unit.mjs holds"; rc=1; }
exit $rc
