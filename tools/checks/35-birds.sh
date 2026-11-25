#!/usr/bin/env bash
# check: The ink birds' behaviour, simulated
# test/birds.mjs (about 20 s): the real ink birds module run headless (tools/birds/sim.mjs) over random scenes at
# 960x600 and 390x844, against the research's numbers. The full run: BIRDS_N=16 BIRDS_LONG=1 node test/birds.mjs.
# plant: {"file": "src/birds/inkbirds/262-approach.js", "find": "function airLo(b) { return 0.45 * b.K.v; }", "with": "function airLo(b) { return 2.5 * b.K.v; }", "why": "a landing that can never happen (#89's own plant)"}
# plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "if (b.st !== 'fly' || b.offT > t) continue;", "with": "if (b.st !== 'fly') continue;", "why": "a crow that left the roost at first light picked to come down again at once (the roost test: 8 back on the words within a minute)"}
# plant: {"file": "src/birds/inkbirds/262-approach.js", "find": "(Math.abs(wr) > 1 && Math.cos(a) * Math.sign(wr) < 0.5 ? 100 : 0)", "with": "5 * Math.max(0, -Math.cos(a) * wr)", "why": "a side-wind gate over or under the perch: 80% against the wind on 32 seeds"}
# plant: {"file": "src/birds/inkbirds/230-paper-every-bird-3d-cut.js", "find": "if (s.xKey >= 0 && k !== s.xKey", "with": "if (false && s.xKey >= 0 && k !== s.xKey", "why": "the wings snapped at a change of what they do, a landing's among them (the second-landing test at 144 Hz: 2.40x the form bound)"}
# plant: {"file": "src/birds/inkbirds/264-perch-life.js", "find": "if (roost || P.wake) return;", "with": "if (P.wake) return;", "why": "a crow on the name left of its own wish between dusk and dawn (the roost not held: delight-life 1)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "MV[0] = V * Math.sin(g) + cx; MV[1] = L.v[1] + cy; MV[2] = V * Math.cos(g) + cz;", "with": "MV[0] = V * Math.sin(h) + cx; MV[1] = L.v[1] + cy; MV[2] = V * Math.cos(h) + cz;", "why": "a member flown along its leader's heading through the air, not its track: a formation slides apart in a side wind (the side-wind places test: median 18.79 spans)"}
# plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "foldHalf: side([48, 65, 30,", "with": "foldHalf: side([40, 65, 30,", "why": "the half-folded wing's arm let down to 40 deg: its wrist hangs below the feet over a taller neighbouring glyph just after a touch (the held half-fold test: 5.08 px, bar 5)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "var cx = k * ex, cy = k * ey, cz = k * ez, cn = Math.sqrt(cx * cx + cy * cy + cz * cz), cs = cn > cap ? cap / cn : 1;", "with": "var cx = clamp(k * ex, -cap, cap), cy = clamp(k * ey, -cap, cap), cz = clamp(k * ez, -cap, cap), cs = 1;", "why": "the pull to a member's place clamped by axis, not by length: 0.176 of its speed off on every axis (the side-wind places test)"}
# plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "fold: side([0, 78,", "with": "fold: side([0, -78,", "why": "the folded wings swept back and down, hanging below the feet through the letters (the hub's re-review 3)"}
# plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "if (ok && headroom(c, T[i])) out.push(U);", "with": "if (ok) out.push(U);", "why": "every name ledge kept, those under a stroke too: a bird inside a closed counter (the PC's #314 frames, a crow inside the Z)"}
# plant: {"file": "src/birds/inkbirds/264-perch-life.js", "find": "n = Math.min(n, Math.floor(Math.max(0, (x - P.x) * dir) / step));", "with": "n = n;", "why": "a walk not planned to the stroke: it stops past the stroke's end, on the shoulder where the ink curves away (the planned-walk test: 2,029 of 2,216 walks end past the ink)"}
# plant: {"file": "src/birds/inkbirds/264-perch-life.js", "find": "if (P.yawTo !== undefined && t - P.yawT < P.yawD && t >= P.yawT) {", "with": "if (false) {", "why": "a leave in the middle of a turn: the turn drawn on, the crouch and the lift coming in at once at its end (1.89x the 144 Hz bound, the hub's round 8)"}
# plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "var y = surfY(Lg.pts, P.x); o[0] = P.x; o[1] = y === y ? y : Lg.y;", "with": "var y = surfY(Lg.pts, P.x); o[0] = P.x; o[1] = (y === y ? y : Lg.y) + 2.5 * (P.li % 2);", "why": "a ledge's support 2.5 px off its neighbour's: a walk handing on from one to the next snaps its body (the walk-across-ledges test: 2.39x the 144 Hz bound)"}
# plant: {"file": "src/birds/inkbirds/230-paper-every-bird-3d-cut.js", "find": "hopL = turning ? (P.hopTurn ? 0.16 : 0.035) * Math.sin(Math.PI * clamp((TD - P.yawT) / P.yawD, 0, 1)) : wh * 0.05;", "with": "hopL = turning ? (P.hopTurn ? 0.16 : 0.035) : wh * 0.05;", "why": "a hop-turn's lift in at once, not along its arc: the body kinks at the turn's start and end (the narrow hop-turn test: 5.38x the 144 Hz bound)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "vy = b.V * Math.sin(b.gam) + b.lift, vz", "with": "vy = b.V * Math.sin(b.gam), vz", "why": "the rising air over a windward face carries no bird: a soaring gull sinks in the lift (slope soaring)"}
# plant: {"file": "src/birds/inkbirds/212-flocks.js", "find": "if (!L || L.st !== 'fly' || F.passage || (F.goal", "with": "if (!L || L.st !== 'fly' || (F.goal", "why": "the night passage sent on passes by the eye (recruit): it circles near the eye for minutes, 5 of 20 flown on (the night passage test, bar 75 %)"}
# plant: {"file": "src/birds/inkbirds/230-paper-every-bird-3d-cut.js", "find": "s.haloE = s.spanPx < SPECK_W ? 0 : (W < 600", "with": "s.haloE = (W < 600", "why": "a night speck given its halo again: a skein's specks sum into one glowing streak (at night a speck draws no halo)"}
# plant: {"file": "src/birds/inkbirds/glsl/vs-paper-2.glsl", "find": "uMode.x > 0.5 || aM.x <= 0.0 ? 0.0", "with": "uMode.x > 0.5 ? 0.0", "why": "the paper shader draws a halo at a 0 e-folding (at night a speck draws no halo)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "      else return newGoal(F, 'commute', r, cls);", "with": "      else { g.R = 50; g.cx = x; g.cz = z; }", "why": "a wheel round a drifting patch of air at dusk and first light: a thermal with no sun-heated ground (no bird wheels in a thermal)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "b.tumT = -1; b.tum0 -= TAU * b.tumS; b.tum = 0;", "with": "b.tumT = -1; b.tum = 0;", "why": "a crow's tumble ends by spinning a whole turn back in one frame (crows tumble only in a rim's strong lift)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "b.kind === 'crow' && b.lift > TUM_W && b.r() < TUM_P * dt", "with": "b.kind === 'crow' && b.r() < TUM_P * dt", "why": "crows tumble anywhere, in no lift (crows tumble only in a rim's strong lift)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "HOST.gust(b.p[0], b.p[2], hg)", "with": "HOST.gust(b.p[0] + 977 * b.id, b.p[2], hg)", "why": "a gust of each bird's own, a per-bird jitter, not the air's one field (one wind)"}
# plant: {"file": "src/birds/inkbirds/210-one-bird.js", "find": "HOST.wind(BWV, hg); w =", "with": "HOST.wind(BWV); w =", "why": "every bird in the wind at the birds' one height, not its own (one wind)"}
# (check-speed) each test of test/birds.mjs in its own process, side by side (their names read from the file, so a new
# test runs too): the slowest alone, not their sum
# (CI lane, 2026-11-24) `# parts: 3`: tools/check.mjs runs this as three checks on a push, CHECK_PART=0/3 .. 2/3, each
# the tests whose place in the list (over all four files) falls to it, so three shards take them side by side (177 s on
# one runner: the gate's long pole). The clock test is part 0's. Unset (plants, --only, a run by hand): every test.
# parts: 3
# inputs: test/birds*.mjs tools/birds/** src/birds/** test/ground.mjs test/golden/ground/** tools/parts.mjs tools/glslmin.mjs tools/plan.mjs package-lock.json
part=0; parts=1
if [[ "${CHECK_PART:-}" =~ ^([0-9]+)/([0-9]+)$ ]]; then part=${BASH_REMATCH[1]}; parts=${BASH_REMATCH[2]}; fi
pids=(); i=0; total=0; clock=(); k=0
for f in test/birds.mjs test/birds-motion.mjs test/birds-flock.mjs test/birds-wind.mjs; do   # (birds-motion.mjs: the drawn motion, frame by frame, at the page's loop; birds-flock.mjs: how a flock flies together; birds-wind.mjs: in the dunes' wind)
  mapfile -t names < <(node -e "for (const m of require('fs').readFileSync(process.argv[1], 'utf8').matchAll(/^test\('((?:[^'\\\\]|\\\\.)*)'/gm)) console.log(m[1].replace(/\\\\(.)/g, '\$1'))" "$f")
  [ "${#names[@]}" -gt 0 ] || { echo "::error::no test found in $f"; exit 1; }
  ! grep -nE 'test\(`' "$f" || { echo "::error::$f: a test named by a template is never run here (give it a plain name)"; exit 1; }
  for n in "${names[@]}"; do
    pat=$(node -e "process.stdout.write('^' + process.argv[1].replace(/[.*+?^\${}()|[\]\\\\]/g, '\\\\$&') + '$')" "$n")
    if [[ "$n" == *"slow phone"* ]]; then [ "$part" -eq 0 ] && { clock=("$pat" "$f"); total=$((total + 1)); }; continue; fi   # (the cost test reads the clock: run alone, after the rest)
    mine=$((k % parts)); k=$((k + 1)); [ "$mine" -eq "$part" ] || continue
    total=$((total + 1))
    node --test --test-reporter=tap --test-name-pattern="$pat" "$f" > "$RUNNER_TEMP/b$i" 2>&1 & pids+=($!); i=$((i + 1))
  done
done
rc=0; for p in "${pids[@]}"; do wait "$p" || rc=1; done
if [ "${#clock[@]}" -eq 2 ]; then node --test --test-reporter=tap --test-name-pattern="${clock[0]}" "${clock[1]}" > "$RUNNER_TEMP/b$i" 2>&1 || rc=1; fi
cat "$RUNNER_TEMP"/b*
ran=$(cat "$RUNNER_TEMP"/b* | grep -cE '^(ok|not ok) [0-9]+ - ' || true)
echo "birds: $total tests in $total processes, $ran ran$([ "$parts" -gt 1 ] && echo " (part $((part + 1)) of $parts)")"
[ "$ran" -eq "$total" ] || { echo "::error::birds: $ran of $total tests ran"; rc=1; }
exit $rc
