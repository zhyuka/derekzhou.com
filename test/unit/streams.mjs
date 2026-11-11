// test/unit/streams.mjs: splitmix32, mix32, subseed, RNG and the integer hashes: their values (golden), their ranges and their spread
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "test/unit/streams.mjs", "find": "test('streams: values', () => {", "with": "test('planted', () => { throw new Error('planted'); });\ntest('streams: values', () => {", "why": "a failing unit test"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ streams and hashes
const S = vm.runInThisContext('(function () {\n  \'use strict\';\n' + STREAMS +
  '\n  return { mix32: mix32, splitmix32: splitmix32, subseed: subseed, RNG: RNG, ihash: ihash, ihash2: ihash2, cellHash: cellHash, hfl: hfl, hk: hk };\n})')();

test('streams: values', () => {
  const f = S.splitmix32(0), g = S.splitmix32(12345);
  golden('streams.splitmix32', { s0: Array.from({ length: 6 }, f), s12345: Array.from({ length: 6 }, g) });
  golden('streams.mix32', [0, 1, 2, 41, 0xffffffff, 123456789].map(S.mix32));
  golden('streams.subseed', [[0, 41], [0, 42], [7, 41], [123456789, 77], [0xdeadbeef, 79]].map(([s, k]) => S.subseed(s, k)));
  golden('streams.ihash', { ihash: [0, 1, 2, 1e9, 0xffffffff].map(S.ihash), ihash2: [[0, 0], [1, 0], [0, 1], [-1, -1], [1000, -2000]].map(([a, b]) => S.ihash2(a, b)), cellHash: [[0, 0, 1], [3, 4, 5], [-7, 9, 0x1234]].map(([a, b, c]) => S.cellHash(a, b, c)) });
});
test('streams: ranges and spread', () => {
  const f = S.splitmix32(41); let sum = 0, lo = 1, hi = 0;
  for (let i = 0; i < 200000; i++) { const x = f(); assert.ok(x >= 0 && x < 1); sum += x; lo = Math.min(lo, x); hi = Math.max(hi, x); }
  assert.ok(Math.abs(sum / 200000 - 0.5) < 0.005, 'mean ' + sum / 200000);
  assert.ok(lo < 1e-4 && hi > 1 - 1e-4);
  const a = S.splitmix32(99), b = S.splitmix32(99);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b(), 'the same seed, the same stream');
  const salts = new Set(); for (let k = 0; k < 200; k++) salts.add(S.subseed(12345, k));
  assert.equal(salts.size, 200, 'every salt its own stream');
  const r = S.RNG(5), arr = ['a', 'b', 'c'];
  for (let i = 0; i < 5000; i++) {
    const x = r.r(2, 3), n = r.i(7), p = r.pick(arr), s = r.sign(), z = r.seed(), g = r.n();
    assert.ok(x >= 2 && x < 3 && Number.isInteger(n) && n >= 0 && n < 7 && arr.includes(p) && (s === 1 || s === -1) && Number.isInteger(z) && z >= 0 && z < 4294967296 && Number.isFinite(g));
  }
  for (let i = 0; i < 20000; i++) { const h = S.ihash(i * 2654435761); assert.ok(h >>> 0 === h); const v = S.hfl(h); assert.ok(v >= 0 && v < 1); }
  assert.notEqual(S.cellHash(0, 0, 1), S.cellHash(1, 0, 1)); assert.notEqual(S.cellHash(0, 0, 1), S.cellHash(0, 1, 1)); assert.notEqual(S.cellHash(0, 0, 1), S.cellHash(0, 0, 2));
  assert.equal(S.hk(77, 3), S.ihash(80));
});
