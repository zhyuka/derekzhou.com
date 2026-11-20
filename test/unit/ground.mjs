// test/unit/ground.mjs: the recorded ground's measure (tools/ground-site.mjs): the grid's points, the tolerance, and
// that the recorder and the check read the same page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { points, measure, TOL, HOOK } from '../../tools/ground-site.mjs';
import { ROOT } from '../ground.mjs';

const meta = { n: 4, x0: -15, z0: -15, cell: 10 };
const rec = () => { const a = new Float32Array(32); for (let i = 0; i < 16; i++) { a[i] = i - 5; a[16 + i] = i / 16; } return a; };

test('ground: every step-th point of the grid, row by row, with its place', () => {
  const p = points(meta, 3);
  assert.deepEqual(p.idx, [0, 3, 12, 15]);
  assert.deepEqual(p.xz, [-15, -15, 15, -15, -15, 15, 15, 15]);
  assert.equal(points(meta, 1).idx.length, 16);
});

test('ground: within the tolerance passes; a height or a weight past it, or a NaN, fails, with the worst place', () => {
  const all = rec(), { idx } = points(meta, 1), got = { h: idx.map((i) => all[i] + 0.003), w: idx.map((i) => all[16 + i] + 3e-8) };
  assert.equal(measure(meta, all, idx, got).off, 0);
  const h = got.h.slice(); h[5] += 2 * TOL.h; h[9] = all[9] + 47;
  const m = measure(meta, all, idx, { h, w: got.w });
  assert.equal(m.off, 2); assert.equal(m.worst.x, -15 + 10); assert.equal(m.worst.z, -15 + 20); assert.ok(m.worst.dh > 46);
  const w = got.w.slice(); w[0] += 2 * TOL.w;
  assert.equal(measure(meta, all, idx, { h: got.h, w }).off, 1);
  const n = got.h.slice(); n[3] = NaN;
  assert.equal(measure(meta, all, idx, { h: n, w: got.w }).off, 1);
});

test('ground: the recorder and the freshness check both read tools/ground-site.mjs\'s page, and the hook is the probe\'s', () => {
  for (const f of ['tools/gpu/record-ground.mjs', 'tools/ground-fresh.mjs']) assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /hookedSite\(ROOT, tmp\)/, f);
  assert.match(HOOK, /probeJob\(V, pts, m, 1, true\)/); assert.match(HOOK, /kitAt\(/);
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/checks/37-ground-fresh.sh'), 'utf8'), /node tools\/ground-fresh\.mjs/);
});
