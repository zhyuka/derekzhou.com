// test/unit/paint.mjs: the first paint's trend, its loads on three runners pooled and judged (tools/paint-trend.mjs
// --judge; CI lane, 2026-11-25, the hub's gate p90): a runner faster or slower than the others moves both arms alike and
// adds nothing to the noise; a head slower on every runner fails; a runner whose load never showed fails; the gate runs
// three runners and judges only when all three reported.
// plant: {"file": "tools/paint-trend.mjs", "find": "const c = med(b.concat(h));", "with": "const c = 0;", "why": "the runners pooled raw: their speeds become noise, and a head 62 ms slower everywhere passes"}
// plant: {"file": "tools/paint-trend.mjs", "find": "  for (const x of sets) out.fail.push(...(x.bad || []));\n", "with": "", "why": "a runner's load that never showed the world passes"}
// plant: {"file": ".github/workflows/gate.yml", "find": "[ \"$n\" = 3 ] || { echo \"::error::$n of 3 paint runners reported\"; exit 1; }", "with": "true", "why": "the judge runs on the runners that reported, two or one"}
import { test, assert } from '../unit-lib.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url).pathname, TREND = path.join(ROOT, 'tools/paint-trend.mjs');
// one runner's three loads an arm: words and world at its own speed (off ms on words, 20 x off on world), the head dh slower
const runner = (off, dh = 0, bad = []) => ({ runs: {
  base: [0, 1, 2].map((i) => ({ words: 80 + i * 5 + off, world: 9000 + i * 100 + off * 20, main: 5000 + i * 50 })),
  head: [0, 1, 2].map((i) => ({ words: 82 + i * 5 + off + dh, world: 9050 + i * 100 + off * 20, main: 5050 + i * 50 })) }, bad });
const judge = (sets) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paint-')), files = sets.map((s, i) => { const f = path.join(d, `s${i}.json`); fs.writeFileSync(f, JSON.stringify(s)); return f; });
  const r = spawnSync(process.execPath, [TREND, '--judge', ...files, '--json', path.join(d, 'out.json')], { encoding: 'utf8' });
  const out = JSON.parse(fs.readFileSync(path.join(d, 'out.json'), 'utf8')); fs.rmSync(d, { recursive: true });
  return { status: r.status, out, log: r.stdout };
};

test('paint: three runners at their own speeds, the same head: no regression, the runners\' speeds not in the noise', () => {
  const r = judge([runner(0), runner(40), runner(-30)]);
  assert.equal(r.status, 0, r.log);
  assert.equal(r.out.runners, 3); assert.equal(r.out.runs, 9);
  assert.ok(r.out.metrics.words.noise_ms <= 10, `words noise ${r.out.metrics.words.noise_ms} ms: the runners' 70 ms apart not in it`);
  assert.equal(r.out.metrics.words.delta_ms, 2);
});

test('paint: a head slower on every runner fails past the 50 ms floor, and not under it', () => {
  assert.equal(judge([runner(0, 62), runner(40, 62), runner(-30, 62)]).status, 1, '+62 ms everywhere');
  assert.equal(judge([runner(0, 200), runner(40, 200), runner(-30, 200)]).status, 1, '+200 ms everywhere');
  assert.equal(judge([runner(0, 45), runner(40, 45), runner(-30, 45)]).status, 0, '+45 ms: under the floor');
});

test('paint: a runner whose load never showed the world fails the judge', () => {
  const r = judge([runner(0), runner(10, 0, ['head load 2: the world never shown within 60000 ms']), runner(-5)]);
  assert.equal(r.status, 1); assert.match(r.out.fail.join(' '), /never shown/);
});

test('paint: the gate loads on three runners and judges once all three reported; the verdict reads the judge', () => {
  const g = fs.readFileSync(path.join(ROOT, '.github/workflows/gate.yml'), 'utf8');
  const loads = g.slice(g.indexOf('\n  paint-loads:\n'), g.indexOf('\n  paint:\n')), jg = g.slice(g.indexOf('\n  paint:\n'), g.indexOf('\n  verdict:\n'));
  assert.match(loads, /shard: \[0, 1, 2\]/);
  assert.match(loads, /--runs 3 --samples "\$RUNNER_TEMP\/paint\/s\$\{\{ matrix\.shard \}\}\.json"/);
  assert.match(loads, /handoff\.mjs get served "\$RUNNER_TEMP\/served" --pinned/);
  assert.match(jg, /needs: \[plan, paint-loads\]/);
  assert.match(jg, /\[ "\$n" = 3 \] \|\| \{ echo "::error::\$n of 3 paint runners reported"; exit 1; \}/);
  assert.match(jg, /node tools\/paint-trend\.mjs --judge "\$RUNNER_TEMP"\/paint\/s\*\.json/);
  assert.match(g, /\n  verdict:\n    needs: \[[^\]]*\bpaint\b[^\]]*\]/);
});
