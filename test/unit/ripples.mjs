// test/unit/ripples.mjs: the sand ripples' warp is C1 at the noise volume's texel borders.
// The ripples' phase is warped by the noise volume (shadeSand's nz); its gradient is the phase's. A linear texture read
// is only C0 at each texel border (its gradient jumps there), so the ripples kinked every 1.9 m (61 m / 32 texels). The
// read the ripples take must put the lattice's fraction through a cubic first (n3vC1): C1. Checked on the source (the
// ripples call a read whose body makes the cubic remap) and on numbers (a 32 x 32 lattice read as GL's LINEAR with
// REPEAT reads it: the gradient's jump across a border, plain against remapped).
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "    vec4 nz = n3vC1(vec3(p.xz / 61.0, 0.71));", "with": "    vec4 nz = n3v(vec3(p.xz / 61.0, 0.71));", "why": "the ripples warped by the plain (C0) read again"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "  float kI = 1.0 - smoothstep(0.2, 0.4, fwD / RIP_I);", "with": "  float kI = 1.0;", "why": "true-size ripples point-sampled with no fade by their pixels: they glitter in motion"}
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

/* (#420's study, tools/physics/ripple-size.py, as a test) the two ripple classes as shadeSand draws them, on level
   sand from 14 m up with the ground from 59 m, on the laptop's and the phone's render targets and frustums as
   measured in the page; each class point-sampled with the shader's own fade (its expression read from the source)
   against the shading filtered at the pixel (6 x 6 supersampled), between two frames of cruise (0.27 m on, 0.037 m
   aside). In motion the drawn ripples may change no more than the filtered truth does: no glitter, no shimmer */
const num = (name) => { const m = G.match(new RegExp('\\b' + name + ' = ([0-9.]+)')); assert.ok(m, name + ' in dunes-glsl'); return +m[1]; };
function fadeOf(k) {   // the shader's fade expression for class k (kI, kM), as JS of fwD (the sand class's factors 1: an interdune floor)
  const m = G.match(new RegExp('float ' + k + ' = ([^;]+);')); assert.ok(m, k + ' in shadeSand');
  const js = m[1].replace(/\bsmoothstep\(/g, 'ss(').replace(/\bgAF\b/g, '0.0').replace(/\bn0\.y\b/g, '1.0');
  return new Function('ss', 'fwD', 'RIP_I', 'RIP_M', 'RIP_FLOOR', 'return ' + js + ';');
}
const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const SUN = [Math.cos(0.1745) * Math.sin(1.047), Math.sin(0.1745), Math.cos(0.1745) * Math.cos(1.047)];
function lumaAt(x, z, lam, w, k) {   // the sand's diffuse at (x, z): the ripple's tilt k * 0.06 * slope across the wind
  const ph = (x * w[0] + z * w[1]) / lam, sl = Math.cos(2 * Math.PI * ph) + 0.35 * Math.cos(4 * Math.PI * ph + 1);
  const nx = -0.06 * k * sl * w[0], nz = -0.06 * k * sl * w[1], nn = Math.hypot(nx, 1, nz);
  return 255 * (0.36 + 0.3 * ss(-0.08, 0.26, (nx * SUN[0] + SUN[1] + nz * SUN[2]) / nn));
}
function frame(win, lam, w, fade, dz, dx, sub) {   // the crop's luma: sub x sub samples a pixel (the truth) or one with the fade
  const { H, W, ty } = win, h = 14, pitch = Math.atan(-14 / 59) + Math.atan(ty), CW = 160, CH = 90, x0 = (W - CW) / 2;
  const at = (px, py) => {   // world (x, z) of the ray through render pixel (px, py up from the bottom), on level sand
    const sx = (2 * px / W - 1) * ty * W / H, e = pitch + Math.atan((2 * py / H - 1) * ty), dist = h / Math.max(-Math.sin(e), 1e-4);
    return [sx * dist * Math.cos(e) + dx, dist * Math.cos(e) + dz];
  };
  const out = new Float64Array(CW * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
    let v = 0;
    if (sub > 1) { for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) { const q = at(x0 + i + (a + 0.5) / sub, j + (b + 0.5) / sub); v += lumaAt(q[0], q[1], lam, w, 1); } v /= sub * sub; }
    else {
      const q = at(x0 + i + 0.5, j + 0.5), qx = at(x0 + i + 1.5, j + 0.5), qy = at(x0 + i + 0.5, j + 1.5), d = (p) => p[0] * w[0] + p[1] * w[1];
      v = lumaAt(q[0], q[1], lam, w, fade(Math.abs(d(qx) - d(q)) + Math.abs(d(qy) - d(q))));
    }
    out[j * CW + i] = v;
  }
  return out;
}
const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
test('ripples: the two classes, faded by their pixels, never flicker over the filtered truth in motion (laptop and phone)', () => {
  const RIP_I = num('RIP_I'), RIP_M = num('RIP_M'), RIP_FLOOR = num('RIP_FLOOR');
  assert.ok(RIP_I >= 0.05 && RIP_I <= 0.25, 'impact ripples ' + RIP_I + ' m: wind ripples are 5-25 cm in dune sand (about a thousand grains)');
  assert.ok(RIP_M >= 0.3, 'megaripples ' + RIP_M + ' m: the larger class runs from about 30 cm');
  const fI = fadeOf('kI'), fM = fadeOf('kM'), WINS = { laptop: { H: 1800, W: 2880, ty: 0.454 }, phone: { H: 1688, W: 780, ty: 0.831 } }, rows = [];
  for (const [wn, win] of Object.entries(WINS)) for (const [cn, lam, f] of [['impact', RIP_I, fI], ['megaripple', RIP_M, fM]]) for (const [on, w] of [['facing', [0, 1]], ['side-on', [1, 0]]]) {
    const fade = (fw) => f(ss, fw, RIP_I, RIP_M, RIP_FLOOR);
    const t0 = frame(win, lam, w, null, 0, 0, 6), t1 = frame(win, lam, w, null, 0.27, 0.037, 6);
    const a0 = frame(win, lam, w, fade, 0, 0, 1), a1 = frame(win, lam, w, fade, 0.27, 0.037, 1);
    const flicker = mad(a0, a1) - mad(t0, t1);
    rows.push(wn + ' ' + cn + ' ' + on + ': flicker over the truth ' + flicker.toFixed(2) + ' levels');
    assert.ok(flicker <= 0.5, rows[rows.length - 1] + ' (more than half a level: the ripples glitter in motion)');
  }
});
test('ripples: megaripples only on the interdune floors, the sand class stated with its source', () => {
  const sand = body(G, /vec3 shadeSand\(/);
  assert.ok(/float kM = [^;]*gAF[^;]*n0\.y[^;]*;/.test(sand), 'the megaripples are not held to level ground near the troughs\' floor (gAF, n0.y)');
  assert.ok(sand.includes('https://arxiv.org/pdf/2208.00888'), 'the sand class (poorly sorted, coarse grains among the fine) without its source');
  assert.ok(sand.includes('https://arxiv.org/html/2501.10643v1'), 'the impact ripples\' spacing without its source');
  assert.ok(!/smoothstep\(0\.012, 0\.05, fp\)/.test(sand), 'today\'s footprint fade is back');
  const S350 = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
  assert.ok(S350.includes("gAF = vW.y - vMB.x;"), 'the terrain no longer gives the sand its height over the troughs\' floor');
});
