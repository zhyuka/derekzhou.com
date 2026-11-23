#!/usr/bin/env bash
# check: The ink birds' behaviour, simulated
# test/birds.mjs (about 20 s): the real ink birds module run headless (tools/birds/sim.mjs) over random scenes at
# 960x600 and 390x844, against the research's numbers. The full run: BIRDS_N=16 BIRDS_LONG=1 node test/birds.mjs.
# plant: {"file": "src/birds/inkbirds/262-approach.js", "find": "function airLo(b) { return 0.45 * b.K.v; }", "with": "function airLo(b) { return 2.5 * b.K.v; }", "why": "a landing that can never happen (#89's own plant)"}
# plant: {"file": "src/birds/inkbirds/230-paper-every-bird-3d-cut.js", "find": "if (s.xKey >= 0 && k !== s.xKey", "with": "if (false && s.xKey >= 0 && k !== s.xKey", "why": "the wings snapped at a change of what they do, a landing's among them (the second-landing test at 144 Hz: 2.40x the form bound)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "MV[0] = V * Math.sin(g) + cx; MV[1] = L.v[1] + cy; MV[2] = V * Math.cos(g) + cz;", "with": "MV[0] = V * Math.sin(h) + cx; MV[1] = L.v[1] + cy; MV[2] = V * Math.cos(h) + cz;", "why": "a member flown along its leader's heading through the air, not its track: a formation slides apart in a side wind (the side-wind places test: median 18.79 spans)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "var cx = k * ex, cy = k * ey, cz = k * ez, cn = Math.sqrt(cx * cx + cy * cy + cz * cz), cs = cn > cap ? cap / cn : 1;", "with": "var cx = clamp(k * ex, -cap, cap), cy = clamp(k * ey, -cap, cap), cz = clamp(k * ez, -cap, cap), cs = 1;", "why": "the pull to a member's place clamped by axis, not by length: 0.176 of its speed off on every axis (the side-wind places test)"}
# (check-speed) each test of test/birds.mjs in its own process, side by side (their names read from the file, so a new
# test runs too): the slowest alone, not their sum
pids=(); i=0; total=0; clock=()
for f in test/birds.mjs test/birds-motion.mjs test/birds-flock.mjs; do   # (birds-motion.mjs: the drawn motion, frame by frame, at the page's loop; birds-flock.mjs: how a flock flies together)
  mapfile -t names < <(node -e "for (const m of require('fs').readFileSync(process.argv[1], 'utf8').matchAll(/^test\('((?:[^'\\\\]|\\\\.)*)'/gm)) console.log(m[1].replace(/\\\\(.)/g, '\$1'))" "$f")
  [ "${#names[@]}" -gt 0 ] || { echo "::error::no test found in $f"; exit 1; }
  ! grep -nE 'test\(`' "$f" || { echo "::error::$f: a test named by a template is never run here (give it a plain name)"; exit 1; }
  for n in "${names[@]}"; do
    pat=$(node -e "process.stdout.write('^' + process.argv[1].replace(/[.*+?^\${}()|[\]\\\\]/g, '\\\\$&') + '$')" "$n")
    if [[ "$n" == *"slow phone"* ]]; then clock=("$pat" "$f"); continue; fi   # (the cost test reads the clock: run alone, after the rest)
    node --test --test-reporter=tap --test-name-pattern="$pat" "$f" > "$RUNNER_TEMP/b$i" 2>&1 & pids+=($!); i=$((i + 1))
  done
  total=$((total + ${#names[@]}))
done
rc=0; for p in "${pids[@]}"; do wait "$p" || rc=1; done
if [ "${#clock[@]}" -eq 2 ]; then node --test --test-reporter=tap --test-name-pattern="${clock[0]}" "${clock[1]}" > "$RUNNER_TEMP/b$i" 2>&1 || rc=1; fi
cat "$RUNNER_TEMP"/b*
ran=$(cat "$RUNNER_TEMP"/b* | grep -cE '^(ok|not ok) [0-9]+ - ' || true)
echo "birds: $total tests in $total processes, $ran ran"
[ "$ran" -eq "$total" ] || { echo "::error::birds: $ran of $total tests ran"; rc=1; }
exit $rc
