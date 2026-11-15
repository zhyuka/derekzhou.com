// test/unit/clouds.mjs: the cloud bodies' fine billows: one scale and depth a body, set once
// plant: {"file": "src/world/410-drawing-frame.js", "find": "B.u4a[2] = B.det[0] * (CRISP ? 2 : 1);", "with": "B.u4a[2] = (V.L || V.light).clDetail[0] * (CRISP ? 2 : 1);", "why": "the billows' scale blended per frame by the place's weight again"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

// (the owner's wiggle, 2026-11-14: clDetail, blended each frame by the place's weight between ABOVE's [80, 5] and the
// dunes' [120, 4], scaled noise looked up at world coordinates, so a few thousand metres from the origin the billows slid
// through every body as the flight crossed realms)
const DRAW = cut(WORLD, '    var push = pushVol;', '    ST.vols = m;');
const DET = cut(WORLD, '  function volDetail(V, x, z) {', '  function volPrep(');

test('clouds: the volume draw reads no light for the billows; each body brings its own', () => {
  assert.ok(!/clDetail/.test(DRAW), 'the draw loop reads clDetail: the billows\' scale changes per frame with the place');
  assert.match(DRAW, /B\.u4a\[2\] = B\.det\[0\] \* \(CRISP \? \d+ : 1\); B\.u4a\[3\] = B\.det\[1\] \* \(CRISP \? \d+ : 1\);/, 'the billows\' scale and depth are not the body\'s own (the desktop\'s deepened by the device\'s kind alone)');
});
test('clouds: a body\'s billows are set once, from the kits\' own blended by the light\'s weight about its own place, and never follow it', () => {
  assert.ok(DET, 'volDetail not found in world.js');
  // (the world's KW and lightWeight stubbed: the light's weight 0.6 at the body's place, 0.1 anywhere else (the camera's))
  const at = [1234, -567];
  const make = (ok, w) => { const f = vm.runInThisContext('(function (KW, CS, lightWeight) {' + DET + ' return volDetail; })')({ ok }, { x: 0, z: 0 }, (x, z) => (x === at[0] && z === at[1] ? w : 0.1)); return (V) => f(V, at[0], at[1]); };
  const kits = { lightRaw: { clDetail: [120, 4] }, lightRawB: { clDetail: [80, 5] } };
  // the boot: V.L the dunes kit's unblended copy, before the landing's first climateLight; the body takes the landing's light
  const boot = make(true, 0.6)(Object.assign({ L: { clDetail: new Float32Array([120, 4]) } }, kits));
  assert.ok(Math.abs(boot[0] - 96) < 1e-4 && Math.abs(boot[1] - 4.6) < 1e-4, `a body made in the boot: [${Array.from(boot)}], not the landing's [96, 4.6]`);
  const V = Object.assign({ L: { clDetail: new Float32Array([96, 4.6]) } }, kits), d = make(true, 0.6)(V);
  V.L.clDetail[0] = 120; V.L.clDetail[1] = 4;   // (the flight crosses into the dunes)
  assert.ok(Math.abs(d[0] - 96) < 1e-4, 'the body\'s billows followed the light');
  assert.deepEqual(Array.from(make(false, 0)({})), [120, 4], 'no weights, no light yet: the default');
  // (the one call: without V every body would fall back to [120, 4] and the stubs above would still pass)
  assert.match(WORLD, /volPrep\(PF, bi, null, [^;]*, V\)/, 'cells-resolve calls volPrep without the visit: every body would take the default billows');
  assert.match(WORLD, /det: volDetail\(V \|\| \{\}, c\[0\], c\[2\]\)/, 'a body\'s billows are not taken at its own centre');
  assert.ok(!/lightWeight\(CS\.x, CS\.z\)/.test(DET), 'volDetail reads the camera\'s place');
});

// ------------------------------------------------------------------ the edge band's boil (cloud-edge-boil, 2026-11-14)
// The march through a body's edge band, in one dimension along a ray (fs-vbody's band steps, the ramp integrated over
// each segment, a segment that can reach the band cut into at most uVK pieces with the billows read at each cut), for
// pixels whose rays graze a 60 m lobe at 80, 150 and 300 m, the steps forced to the box's rest over the steps left (mS),
// as the camera moves 0.25 and 0.5 m a frame. The boil: each pixel's coverage, frame to frame, off its own mean (p95).
// The pieces' cap is the world's own (410's uVK for the desktop and the rest; none on main: one piece), and the cut loop
// must be in the shader; desktop under 0.02 everywhere, the rest at least 4 times calmer than one piece.
const VBODY = fs.readFileSync(path.join(ROOT, 'src/world/glsl/fs-vbody.glsl'), 'utf8');
const VK = /var CRISP = LOOKD;[^\n]*\s*gl\.uniform2f\(P\.u\.uVK, CRISP \? (\d+) : (\d+), CRISP \? 1 : 0\)/.exec(WORLD);
const CAP = VK ? { desktop: +VK[1], rest: +VK[2] } : { desktop: 1, rest: 1 };
function hash(i, L) { let x = Math.imul(i ^ Math.imul(L + 1, 0x9e3779b1), 0x85ebca6b) ^ 0x1234567; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
function row(x, L) { const i = Math.floor(x), f = x - i; return hash(i, L) * (1 - f) + hash(i + 1, L) * f; }   // (a row of texels, filtered linearly)
function billow(t, texel, lod) { const l0 = Math.floor(lod), fr = lod - l0; return row(t / (texel * 2 ** l0), l0) * (1 - fr) + row(t / (texel * 2 ** (l0 + 1)), l0 + 1) * fr; }
function G(x, bE) { return x >= 0 ? 0 : x > -bE ? x * x / (2 * bE) : -x - 0.5 * bE; }
function ramp(s0, s1, bE) { const ds = s1 - s0; return Math.abs(ds) < 1e-3 * bE ? Math.min(Math.max(-0.5 * (s0 + s1) / bE, 0), 1) : (G(s0, bE) - G(s1, bE)) / ds; }   // (segRamp)
const ss = (a, b, x) => { const q = Math.min(Math.max((x - a) / (b - a), 0), 1); return q * q * (3 - 2 * q); };
function boil({ dist, v, Kmax, crisp = false, scale = 80, amp = 5, band = 4, R = 60, frames = 48, px = 96, pxA = 0.0019, sig = 0.19 }) {
  const cw = crisp ? ss(150, 350, dist) : 1, pf = crisp ? 0.0625 : 0.5;   // (fs-vbody's crisp edge: cw 0 near, 1 from 350 m; its cuts an eighth of a texel throughout)
  const texel = scale / 32, dE = Math.max(Math.max(band * 0.6, 1), dist * 0.012), bE = Math.max(band * cw, (1.25 + 0.75 * cw) * dist * pxA);
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
      let last = false;
      while (!last) {
        if (t >= t1) { t = t1; last = true; }   // (the ray's end is a sample, as in the shader)
        const b = sB(t), s = sF(t);
        const K = Math.min(sBP, b) - amp < 0.5 * bE && Math.max(sBP, b) + amp > -bE ? Math.min(Math.max(Math.ceil((t - tP) / (pf * texel * 2 ** lod)), 1), Kmax) : 1;
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
test('clouds: the edge band is cut into pieces in the shader, at most 32, the cap a uniform the world sets per tier', () => {
  assert.match(VBODY, /uniform vec2 uVK;/, 'fs-vbody has no uVK: one piece a segment');
  assert.match(VBODY, /for \(int k = 1; k < 32; k\+\+\) \{\n\s*if \(float\(k\) >= K\) break;/, 'the cut loop (k < 32, broken at K) is not in fs-vbody');
  // (the shader's own cutting, as the model below does it: a mutation of any of these passed before, the hub's review)
  assert.ok(VBODY.includes('float K = min(sBP, sB) - amp < 0.5 * bE && max(sBP, sB) + amp > -bE ? clamp(ceil((t - tP) / (pf * texel * exp2(lod))), 1.0, uVK.x) : 1.0;'), 'the pieces\' count is not the two-sided test and a sixteenth (crisp) to half a texel at the LOD, capped by uVK');
  assert.ok(VBODY.includes('sk = mix(sBP, sB, u) - (textureLod(uN3, (ro + rl * mix(tP, t, u)) / uVR.z + nOff, lod).g - 0.5) * amp * 2.0;'), 'a cut does not read the billows again at its own place');
  assert.ok(VBODY.includes('dsum += segRamp(sa, s, bE);') && VBODY.includes('float d = dsum / K * 0.5 * (fP + fz);'), 'the pieces\' ramps are not summed and averaged');
  assert.ok(VBODY.includes('float tl = (gP + v.g) * 12.0, sky = exp(-(bP + v.b) * 0.5 * 12.0 * 0.85), tM = 0.5 * (tP + t);'), 'a segment is not lit at its middle');
  assert.ok(VBODY.includes('vec3 uv0 = (ro + rl * tc) / (2.0 * uVH) + 0.5'), 'the first face\'s normal is not taken where the smooth form crosses into the band');
  assert.ok(VBODY.includes('vec3 nOff = uVO;') && VBODY.includes('textureLod(uN3, p / uVR.z + nOff, lod)'), 'the billows are not read at body-relative coordinates');
  // (physics: clouds/drift: the billows ride with the body: no clock in them, their offset from the laid-out centre)
  assert.ok(!/\buT\b/.test(VBODY.replace(/\/\/[^\n]*/g, '')), 'fs-vbody reads the clock: the lumps slide through a body');
  assert.match(WORLD, /var c0 = B\.c0 \|\| B\.c, nS = B\.u4a\[2\];/, 'the billows\' offset is not taken from the body\'s laid-out centre');
  assert.ok(VK, '410 sets no uVK for the tiers');
  assert.ok(CAP.desktop <= 32 && CAP.rest <= CAP.desktop, `caps ${JSON.stringify(CAP)}: the shader's loop cuts at most 32`);
});
// (each kit's billows as the realms give them: the scale and depth fs-vbody reads, uVR.z and uVR.w)
const KITS = Object.fromEntries(['above', 'dunes'].map((k) => { const m = /clDetail: \[(\d+), (\d+)\]/.exec(fs.readFileSync(path.join(ROOT, `src/realm-${k}.js`), 'utf8')); return [k, { scale: +m[1], amp: +m[2] }]; }));
const DM = /B\.u4a\[2\] = B\.det\[0\] \* \(CRISP \? (\d+) : 1\); B\.u4a\[3\] = B\.det\[1\] \* \(CRISP \? (\d+) : 1\);/.exec(WORLD);
test('clouds: crisp cauliflower on the desktop (lumps 2x the size, 5x the depth, the edge 1.25 px near), and it boils under 0.02 at 80, 150 and 300 m in both kits; touch devices keep today\'s soft clouds in one piece', () => {
  assert.equal(CAP.rest, 1, 'off the desktop\'s top tier the band is not cut (4 pieces bound every segment on a phone for no gain)');
  assert.ok(VBODY.includes('float cw = uVK.y > 0.5 ? smoothstep(150.0, 350.0, t) : 1.0, pf = uVK.y > 0.5 ? 0.0625 : 0.5;') && VBODY.includes('float bE = max(band * cw, mix(1.25, 2.0, cw) * t * pxA);'), 'the edge is not crisp near (1.25 px to 150 m, the soft band by 350 m) where uVK.y asks');
  assert.ok(DM, '410 does not deepen the desktop\'s billows');
  const rows = [];
  for (const [kit, K] of Object.entries(KITS)) for (const dist of [80, 150, 300]) for (const v of [0.25, 0.5]) {
    const D = { scale: K.scale * +DM[1], amp: K.amp * +DM[2] }, d = boil({ dist, v, Kmax: CAP.desktop, crisp: true, ...D }), r = boil({ dist, v, Kmax: CAP.rest, ...K }), soft = boil({ dist, v, Kmax: 12, ...K });
    rows.push(`${kit} ${dist} m at ${v} m/frame: desktop crisp ${d.toFixed(3)} (today's soft desktop ${soft.toFixed(3)}), the rest (soft, one piece) ${r.toFixed(3)}`);
    assert.ok(d < 0.02, `the desktop's crisp edge boils: ${rows.at(-1)}`);
  }
  if (process.env.CLOUDS_SAY) console.log(rows.join('\n'));
});

// ------------------------------------------------------------------ the step budget (cloud-step-budget, 2026-11-14)
// One budget of band steps a tier (48 the desktop's top tier, 32 the rest), never cut by distance (a far tower's 24
// steps across a long box forced its band samples 12 m apart: the boil at its worst), and a ray's leaps counted against
// their own cap, so a ray that leaps through a body's gaps keeps all its band steps
test('clouds: the band\'s steps are one budget a tier, and the leaps have their own cap', () => {
  const D = cut(WORLD, '    var push = pushVol;', '    ST.vols = m;');
  assert.ok(!/d < 2500/.test(D), 'the volume draw cuts the steps by distance');
  assert.match(D, /var VSTEPS = LOOKD && TIER >= 1 \? 48 : 32;/);
  assert.match(D, /var steps = d < B\.r \* 1\.5 \? 48 : VSTEPS;/, 'a body the camera is near does not keep its 48 steps on every tier');
  // (leaps never shrink the band's steps: taken counts band samples only, so it is counted after the leap branch's
  // continue and before mS reads it; moved back before the leap test, or dropped, every leap would cut a band step)
  const leapEnd = VBODY.indexOf('max((s - amp) * 0.6, dE); continue;'), tk = VBODY.indexOf('taken += 1.0;'), ms = VBODY.indexOf('float mS = (tf - t) / max(uVR.y - taken + 1.0, 1.0);');
  assert.ok(leapEnd > 0 && tk > leapEnd && ms > tk, 'taken is not counted after the leap branch and before mS: leaps would shrink the band\'s steps');
  assert.equal(VBODY.split('taken += 1.0;').length - 1, 1, 'taken is counted more than once a sample');
  assert.match(VBODY, /if \(t > tf \|\| last \|\| taken >= uVR\.y\) break;/, 'the march stops on the loop\'s count, leaps and all');
  assert.match(VBODY, /&& leaps < 32\.0\) \{/, 'the leaps have no cap of their own');
  const loop = /for \(int i = 0; i < (\d+); i\+\+\) \{\n\s*if \(t > tf/.exec(VBODY);
  assert.ok(loop && +loop[1] >= 48 + 32, 'the loop is shorter than the band\'s steps and the leaps together');
});

// ------------------------------------------------------------------ the bake's detail (cloud-bake-detail, 2026-11-14)
// The density pass's billows at LOD 0 (a full-screen pass's implicit LOD took a coarse mip: 22-37% of their depth kept),
// one octave, on a tile of at least 24 voxels; the desktop's volumes 64 voxels across where the layout asks 44; and the
// march's voxel the body's own, not its box over 26
const VDENS = fs.readFileSync(path.join(ROOT, 'src/world/glsl/fs-vdens.glsl'), 'utf8');
test('clouds: the bake reads its billows at LOD 0 on a tile of 24 voxels or more; the march uses the body\'s voxel', () => {
  assert.match(VDENS, /float n = textureLod\(uN3, q, 0\.0\)\.g;/, 'the bake\'s billows at an implicit LOD');
  assert.ok(!/texture\(uN3/.test(VDENS), 'an implicit-LOD read of the noise is left in the bake');
  assert.match(WORLD, /var tile = Math\.max\(Rm \* \(B\.noise \|\| 3\.6\), 24 \* voxL\);/, 'the billows\' tile is not at least 24 of the layout\'s voxels');
  assert.match(WORLD, /if \(LOOKD\) res = Math\.round\(\(res \|\| 52\) \* 64 \/ 44\);/);
  assert.match(VBODY, /float vox = uVVox,/, 'the march\'s voxel is its box over 26');
  assert.match(WORLD, /gl\.uniform1f\(P\.u\.uVVox, B\.vox\);/);
});

// ------------------------------------------------------------------ the far banks (cloud-far-banks-opaque, 2026-11-14)
// A far body goes into the haze by its colour and stays opaque until the last quarter of its distance's weight: faded
// by its opacity over the whole weight, a bank half way out let half the stars through
test('clouds: a far bank keeps its colour and stays opaque to the last quarter of its weight, then fades into the sky', () => {
  assert.ok(!/col = mix\(hazeCol\(rd\), col/.test(VBODY), 'the far body\'s colour is mixed toward the haze colour: a flat silhouette off the sky behind it');
  assert.match(VBODY, /oC = vec4\(col \* al, al\) \* smoothstep\(0\.0, 0\.25, uVR2\.y\);/, 'the far body fades by its opacity over its whole weight');
  const op = (w) => Math.min(Math.max(w / 0.25, 0), 1) ** 2 * (3 - 2 * Math.min(Math.max(w / 0.25, 0), 1));
  for (const w of [0.25, 0.5, 0.9]) assert.equal(op(w), 1, `at weight ${w} the bank is opaque`);
  assert.equal(op(0), 0, 'at weight 0 the bank is gone: the sky behind it');
});

// ------------------------------------------------------------------ one cloud field on every tier (the hub's review of #238)
// The landscape 'hi' stills are baked as a non-touch desktop and shown to touch landscape devices of other tiers (an
// iPad 'low', an 8 GB Android or Windows touch 'full') until the cut to the live world: the bake's field must be the
// same on every tier. volPrep, run for the desktop and for a touch tier: the lobes, the box, the billows' tile and the
// body's noise all the same (the field fs-vdens bakes is a function of these alone); only the voxels' count differs
test('clouds: a body bakes the same field on the desktop and on a touch tier, only finer on the desktop', () => {
  const PREP = cut(WORLD, '  function volPrep(', '  /* up to budget units');
  const lobes = [[0, 300, 0, 60], [55, 330, 20, 48], [-40, 310, -30, 52], [10, 380, 5, 40]];
  const a = new Float32Array(lobes.length * 12); lobes.forEach((l, i) => a.set(l, i * 12));
  const PF = { a, bodies: [{ i0: 0, yaw: 0.4, billow: 0.8, noise: 3.6, erode: 0.75, seed: 0.41 }], count: () => lobes.length };
  const run = (tier) => vm.runInThisContext('(function (memTier, LOOKD) { var DEVMODE = false, SW = {}, VOL16 = false; function clamp(x, a, b) { return Math.min(Math.max(x, a), b); } function volDetail() { return new Float32Array([96, 4.6]); }\n' + PREP + ' return volPrep; })')(() => tier, tier === 'desktop')(PF, 0, null, 44, {});
  const d = run('desktop'), t = run('full'), l = run('low');
  for (const [name, o] of [['full', t], ['low', l]]) {
    assert.equal(d.tile, o.tile, `the billows' tile differs between the desktop and ${name}: ${d.tile} m against ${o.tile} m`);
    assert.deepEqual(Array.from(d.L), Array.from(o.L), `the lobes differ on ${name}`);
    assert.deepEqual(Array.from(d.h), Array.from(o.h), `the box differs on ${name}`);
    assert.deepEqual(d.B, o.B, `the body's noise differs on ${name}`);
  }
  assert.ok(d.vox < t.vox && d.dims[0] > t.dims[0], 'the desktop is not baked finer than a touch tier');
  assert.match(WORLD, /gl\.uniform4f\(P\.u\.uVK, B\.seed, B\.erode, vb\.tile, vb\.Rm \* B\.blend\);/, 'the bake does not use volPrep\'s tile');
});
