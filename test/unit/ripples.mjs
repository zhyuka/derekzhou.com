// test/unit/ripples.mjs: the sand ripples' warp is C1 at the noise volume's texel borders.
// The ripples' phase is warped by the noise volume (shadeSand's nz); its gradient is the phase's. A linear texture read
// is only C0 at each texel border (its gradient jumps there), so the ripples kinked every 1.9 m (61 m / 32 texels). The
// read the ripples take must put the lattice's fraction through a cubic first (n3vC1): C1. Checked on the source (the
// ripples call a read whose body makes the cubic remap) and on numbers (a 32 x 32 lattice read as GL's LINEAR with
// REPEAT reads it: the gradient's jump across a border, plain against remapped).
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "    vec4 nz = n3vC1(vec3(p.xz / 61.0, 0.71));", "with": "    vec4 nz = n3v(vec3(p.xz / 61.0, 0.71));", "why": "the ripples warped by the plain (C0) read again"}
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = fs.readFileSync(path.join(ROOT, 'src/glsl/dunes-glsl.glsl'), 'utf8');
const LIB = fs.readFileSync(path.join(ROOT, 'src/world/glsl/lib.glsl'), 'utf8');

function body(src, sig) {
  const a = src.search(sig); if (a < 0) return null;
  let i = src.indexOf('{', a), n = 0;
  for (; i < src.length; i++) { if (src[i] === '{') n++; else if (src[i] === '}' && --n === 0) break; }
  return src.slice(src.indexOf('{', a) + 1, i);
}

test('ripples: the warp\'s noise read is the C1 one', () => {
  const sand = body(G, /vec3 shadeSand\(/); assert.ok(sand, 'shadeSand found');
  const m = /vec4 nz = (\w+)\(vec3\(p\.xz \/ 61\.0, 0\.71\)\)/.exec(sand); assert.ok(m, 'the ripples\' noise read found');
  const fn = body(G + LIB, new RegExp('vec4 ' + m[1] + '\\(vec3 p\\)'));
  assert.ok(fn, 'its function found: ' + m[1]);
  const code = fn.replace(/\/\/[^\n]*/g, '');
  assert.match(code, /floor\(/, m[1] + ' reads the lattice (floor): a plain texture read is C0 at the texels\' borders');
  assert.match(code, /f \* f \* \(3\.0 - 2\.0 \* f\)/, m[1] + ' puts the fraction through the cubic');
});

// GL's LINEAR read of a REPEAT lattice in 2D (texel centres at (i + 0.5) / N)
const N = 32, rnd = (() => { let s = 7; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })();
const L = Array.from({ length: N * N }, rnd), at = (i, j) => L[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
function linear(u, v) { const x = u * N - 0.5, y = v * N - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  return (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy; }
function c1(u, v) {   // n3vC1's remap, then the linear read
  const q = [u * N - 0.5, v * N - 0.5], i = q.map(Math.floor), f = q.map((x, k) => { const t = x - i[k]; return t * t * (3 - 2 * t); });
  return linear((i[0] + f[0] + 0.5) / N, (i[1] + f[1] + 0.5) / N);
}
function jump(fn, v) {   // the gradient's jump in u where the linear read changes cells (a texel centre, 10.5 / N), one-sided
  const b = 10.5 / N, h = 1e-7 / N, eps = 1e-12;
  const left = (fn(b - eps, v) - fn(b - eps - h, v)) / h, right = (fn(b + eps + h, v) - fn(b + eps, v)) / h;
  return Math.abs(right - left);
}

test('ripples: the remapped read\'s gradient is continuous at a texel border; the plain read\'s is not', () => {
  let plain = 0, smooth = 0;
  for (let k = 0; k < 16; k++) { const v = (k + 0.37) / 16; plain = Math.max(plain, jump(linear, v)); smooth = Math.max(smooth, jump(c1, v)); }
  assert.ok(plain > 1, 'the plain read kinks: a gradient jump of ' + plain.toFixed(2) + ' a unit');
  assert.ok(smooth < 1e-3, 'the C1 read does not: ' + smooth.toExponential(2));
});
