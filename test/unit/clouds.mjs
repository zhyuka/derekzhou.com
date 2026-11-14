// test/unit/clouds.mjs: the cloud bodies' fine billows: one scale and depth a body, set once
// plant: {"file": "src/world/410-drawing-frame.js", "find": "B.u4a[2] = B.det[0]; B.u4a[3] = B.det[1];", "with": "B.u4a[2] = (V.L || V.light).clDetail[0]; B.u4a[3] = B.det[1];", "why": "the billows' scale blended per frame by the place's weight again"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

// (the owner's wiggle, 2026-11-14: clDetail, blended each frame by the place's weight between ABOVE's [80, 5] and the
// dunes' [120, 4], scaled noise looked up at world coordinates, so a few thousand metres from the origin the billows slid
// through every body as the flight crossed realms)
const DRAW = cut(WORLD, '    var push = pushVol;', '    ST.vols = m;');
const DET = /\n(  function volDetail\(V\) \{[^\n]*\})/.exec(WORLD);

test('clouds: the volume draw reads no light for the billows; each body brings its own', () => {
  assert.ok(!/clDetail/.test(DRAW), 'the draw loop reads clDetail: the billows\' scale changes per frame with the place');
  assert.match(DRAW, /B\.u4a\[2\] = B\.det\[0\]; B\.u4a\[3\] = B\.det\[1\];/, 'the billows\' scale and depth are not the body\'s own');
});
test('clouds: a body\'s billows are set once, from the light it is made under, and never follow it', () => {
  assert.ok(DET, 'volDetail not found in world.js');
  const volDetail = vm.runInThisContext('(function () {' + DET[1] + ' return volDetail; })')();
  const V = { L: { clDetail: new Float32Array([80, 5]) } }, d = volDetail(V);
  assert.deepEqual(Array.from(d), [80, 5]);
  V.L.clDetail[0] = 120; V.L.clDetail[1] = 4;   // (the flight crosses into the dunes)
  assert.deepEqual(Array.from(d), [80, 5], 'the body\'s billows followed the light');
  assert.deepEqual(Array.from(volDetail({})), [120, 4], 'no light yet: the default');
});

// ------------------------------------------------------------------ the edge band's boil (cloud-edge-boil, 2026-11-14)
// The march through a body's edge band, in one dimension along a ray (fs-vbody's band steps, the ramp integrated over
// each segment, a segment that can reach the band cut into at most uVK pieces with the billows read at each cut), for
// pixels whose rays graze a 60 m lobe at 80, 150 and 300 m, the steps forced to the box's rest over the steps left (mS),
// as the camera moves 0.25 and 0.5 m a frame. The boil: each pixel's coverage, frame to frame, off its own mean (p95).
// The pieces' cap is the world's own (410's uVK for the desktop and the rest; none on main: one piece), and the cut loop
// must be in the shader; desktop under 0.02 everywhere, the rest at least 4 times calmer than one piece.
const VBODY = fs.readFileSync(path.join(ROOT, 'src/world/glsl/fs-vbody.glsl'), 'utf8');
const VK = /gl\.uniform1f\(P\.u\.uVK, memTier\(\) === 'desktop' && TIER >= 1 \? (\d+) : (\d+)\)/.exec(WORLD);
const CAP = VK ? { desktop: +VK[1], rest: +VK[2] } : { desktop: 1, rest: 1 };
function hash(i, L) { let x = Math.imul(i ^ Math.imul(L + 1, 0x9e3779b1), 0x85ebca6b) ^ 0x1234567; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
function row(x, L) { const i = Math.floor(x), f = x - i; return hash(i, L) * (1 - f) + hash(i + 1, L) * f; }   // (a row of texels, filtered linearly)
function billow(t, texel, lod) { const l0 = Math.floor(lod), fr = lod - l0; return row(t / (texel * 2 ** l0), l0) * (1 - fr) + row(t / (texel * 2 ** (l0 + 1)), l0 + 1) * fr; }
function G(x, bE) { return x >= 0 ? 0 : x > -bE ? x * x / (2 * bE) : -x - 0.5 * bE; }
function ramp(s0, s1, bE) { const ds = s1 - s0; return Math.abs(ds) < 1e-3 * bE ? Math.min(Math.max(-0.5 * (s0 + s1) / bE, 0), 1) : (G(s0, bE) - G(s1, bE)) / ds; }   // (segRamp)
function boil({ dist, v, Kmax, scale = 80, amp = 5, band = 4, R = 60, frames = 48, px = 96, pxA = 0.0019, sig = 0.19 }) {
  const texel = scale / 32, dE = Math.max(Math.max(band * 0.6, 1), dist * 0.012), bE = Math.max(band, 2 * dist * pxA);
  const lod = Math.min(Math.max(Math.log2(Math.max(Math.max(2 * dist * pxA, 0.5 * dE) * 32 / scale, 1e-4)), 0), 5), step = Math.max(dE, dist / 25);
  const out = [];
  for (let k = 0; k < px; k++) {
    const rc = R - band * 1.5 + (band * 2.5 + amp * 2) * (k + 0.5) / px, tc = dist + R, off = k * 37.17;
    const sB = (t) => Math.hypot(rc, t - tc) - R, sF = (t) => sB(t) - (billow(t + off, texel, lod) - 0.5) * amp * 2;
    const t0 = tc - Math.sqrt(Math.max((R + band + amp) ** 2 - rc * rc, 0)), t1 = 2 * tc - t0;
    if (t1 <= t0) continue;
    const cs = [];
    for (let f = 0; f < frames; f++) {
      let tP = t0, sBP = sB(t0), sP = sBP, T = 1, t = t0 + (step - ((t0 + f * v) % step));   // (a leap's start, then the band's samples on the march's lattice, moved by the camera)
      while (t < t1) {
        const b = sB(t), s = sF(t);
        const K = Math.min(sBP, b) - amp < 0.5 * bE && Math.max(sBP, b) + amp > -bE ? Math.min(Math.max(Math.ceil((t - tP) / (0.5 * texel * 2 ** lod)), 1), Kmax) : 1;
        let sum = 0, sa = sP;
        for (let j = 1; j < K; j++) { const u = j / K, sk = sBP + (b - sBP) * u - (billow(tP + (t - tP) * u + off, texel, lod) - 0.5) * amp * 2; sum += ramp(sa, sk, bE); sa = sk; }
        sum += ramp(sa, s, bE);
        T *= Math.exp(-(sum / K) * sig * (t - tP));
        tP = t; sP = s; sBP = b; t += Math.max(s > 0 ? Math.max(dE, s * 0.5) : dE, step);
      }
      cs.push(1 - T);
    }
    const m = cs.reduce((a, c) => a + c, 0) / cs.length;
    if (m > 0.01) for (const c of cs) out.push(Math.abs(c - m));
  }
  out.sort((a, b) => a - b);
  return out[Math.floor(out.length * 0.95)];
}
test('clouds: the edge band is cut into pieces in the shader, at most 12, the cap a uniform the world sets per tier', () => {
  assert.match(VBODY, /uniform float uVK;/, 'fs-vbody has no uVK: one piece a segment');
  assert.match(VBODY, /for \(int k = 1; k < 12; k\+\+\) \{\n\s*if \(float\(k\) >= K\) break;/, 'the cut loop (k < 12, broken at K) is not in fs-vbody');
  assert.ok(VK, '410 sets no uVK for the tiers');
  assert.ok(CAP.desktop <= 12 && CAP.rest <= CAP.desktop, `caps ${JSON.stringify(CAP)}: the shader's loop cuts at most 12`);
});
test('clouds: the edge band boils under 0.02 on the desktop at 80, 150 and 300 m; the rest 4 times calmer than one piece', () => {
  const rows = [];
  for (const dist of [80, 150, 300]) for (const v of [0.25, 0.5]) {
    const one = boil({ dist, v, Kmax: 1 }), d = boil({ dist, v, Kmax: CAP.desktop }), r = boil({ dist, v, Kmax: CAP.rest });
    rows.push(`${dist} m at ${v} m/frame: one piece ${one.toFixed(3)}, desktop ${d.toFixed(3)}, the rest ${r.toFixed(3)}`);
    assert.ok(d < 0.02, `the desktop's edge boils: ${rows.at(-1)}`);
    assert.ok(r < one / 4, `the rest's edge boils: ${rows.at(-1)}`);
  }
  if (process.env.CLOUDS_SAY) console.log(rows.join('\n'));
});
