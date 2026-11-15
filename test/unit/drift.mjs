// test/unit/drift.mjs: the clouds' drift with the wind at their level (physics: clouds/drift)
// plant: {"file": "src/world/410-drawing-frame.js", "find": "var tv = cloudT();", "with": "var tv = SIM.t;", "why": "the drawn bodies a step ahead of the camera: a judder at every frame between two steps"}
// plant: {"file": "src/world/180-world-definition-two-kits-by.js", "find": "Math.round((o.x - (ox || 0)) * 8)", "with": "Math.round(o.x * 8)", "why": "an air cell's keep hashed at its stored place: the layout's frame flips it"}
// plant: {"file": "src/world/236-cells-streamer-work-pool.js", "find": "var pc = o.w ? cloudPos(o, cloudT(), VDF) : o.c,", "with": "var pc = o.c0 || o.c,", "why": "a drifting body's distance fade read where it was laid out: it comes out of the haze where it no longer is"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

const SRC = cut(WORLD, '  function cloudWind(', '  /* ----'), AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') + cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function airSpeed(', '\n', true) + cut(WORLD, '  function windAt(', '  function airVec3(');
const make = (simT, alpha) => vm.runInThisContext('(function (SIM, SIM_DT) { var PI = Math.PI;' + AIRSRC + SRC + ' return { cloudWind: cloudWind, cloudPos: cloudPos, cloudT: cloudT }; })')(simT === undefined ? { t: 0, alpha: 1 } : { t: simT, alpha }, 1 / 60);
const D = make();
const deg = (v) => Math.atan2(v[0], v[1]) * 180 / Math.PI;

test('drift: the clouds\' wind is the air\'s: windAt at the low layer\'s height, and the deck\'s; the cloud sea held', () => {
  const W = vm.runInThisContext('(function (SIM) { var PI = Math.PI;' + AIRSRC + ' return { windAt: windAt, AIR_H: AIR_H }; })')({ V: null, t: 0 });
  for (const az of [0, 37, 200, 333]) {
    const a = az * Math.PI / 180, V = { wind: [Math.sin(a), Math.cos(a)], u10: 3 + az / 90 };
    const lo = D.cloudWind(V, 'low'), dk = D.cloudWind(V, 'deck'), sea = D.cloudWind(V, 'sea');
    const wl = { ...W.windAt(0, 0, W.AIR_H.clouds, 0, V) }, wd = { ...W.windAt(0, 0, W.AIR_H.deck, 0, V) };   // (copies: windAt returns its one object)
    assert.ok(Math.abs(lo[0] - wl.x) < 1e-12 && Math.abs(lo[1] - wl.z) < 1e-12, `low ${Array.from(lo)} is not windAt's ${wl.x}, ${wl.z}`);
    assert.ok(Math.abs(dk[0] - wd.x) < 1e-12 && Math.abs(dk[1] - wd.z) < 1e-12, 'the deck is not windAt\'s');
    const veer = (x) => ((deg(x) - az) % 360 + 540) % 360 - 180;   // (clockwise of the surface's way: the low layer 20 deg, the deck 40: physics: air/wind-profile)
    assert.ok(Math.abs(veer(lo) - 20) < 1e-9 && Math.abs(veer(dk) - 40) < 1e-9, `the low layer veers ${veer(lo)} deg, the deck ${veer(dk)}: not the air's 20 and 40`);
    assert.deepEqual(Array.from(sea), [0, 0], 'the cloud sea is held');
  }
  assert.deepEqual(Array.from(D.cloudWind({}, 'low')), [0, 0], 'a visit with no wind: no drift');
});

test('drift: a body\'s place is a pure function of t, in doubles; its height never moves', () => {
  const o = { c0: Float64Array.from([1234.5, 812.25, -9876.125]), w: Float64Array.from([3.1, -7.9]) };
  const t = 3600 + 1 / 7, p = D.cloudPos(o, t);
  assert.equal(p[0], 1234.5 + 3.1 * t); assert.equal(p[2], -9876.125 - 7.9 * t); assert.equal(p[1], 812.25);
  assert.deepEqual(Array.from(D.cloudPos(o, t)), Array.from(p), 'the same t, the same place');
  // a frame later at an hour: the step is the wind's, to a micrometre (no single-precision steps)
  const q = D.cloudPos(o, t + 1 / 60);
  assert.ok(Math.abs((q[0] - p[0]) - 3.1 / 60) < 1e-6 && Math.abs((q[2] - p[2]) + 7.9 / 60) < 1e-6, 'a frame\'s step is not the wind\'s');
  assert.deepEqual(Array.from(D.cloudPos({ c0: o.c0 }, t)), Array.from(o.c0), 'a body with no wind stays put');
});

test('drift: the draw\'s moment is between the last two steps, as the camera\'s', () => {
  const M = make(100, 0.25);
  assert.ok(Math.abs(M.cloudT() - (100 - 0.75 / 60)) < 1e-12);
  assert.ok(WORLD.includes("vb.out.c0 = Float64Array.from(vb.out.c); if (C.air) { vb.out.c0[0] -= C.dL[0]; vb.out.c0[2] -= C.dL[1]; vb.out.w = airW(V); } else vb.out.w = null;"), 'resolve does not give each body its centre in the air and the low layer\'s wind');
});

test('drift: an air cell holds what it laid out where the air had carried it; at t its body and its lobes stand together, D(t) - D(tL) on', () => {
  const M = make();
  const ctx = vm.createContext({ SIM: { t: 0, alpha: 1 }, SIM_DT: 1 / 60 });
  vm.runInContext('var PI = Math.PI;' + AIRSRC + SRC + '; this.F = { airW, airD, cellOff, cloudPos };', ctx);
  const F = ctx.F, V = { wind: [Math.sin(1.1), Math.cos(1.1)], u10: 5.5 }, tL = 2345.6;
  const C = { air: true, V, dL: F.airD(V, tL) };
  // a body laid out at tL at the stored place s (where the air had carried it then); its centre in the air c0 = s - D(tL)
  const s = [1000, 650, -400], o = { c0: Float64Array.from([s[0] - C.dL[0], s[1], s[2] - C.dL[1]]), w: F.airW(V) };
  for (const t of [tL, tL + 0.5, tL + 600, tL + 3600]) {
    const p = F.cloudPos(o, t), off = F.cellOff(C, t);
    assert.ok(Math.abs(p[0] - (s[0] + off[0])) < 1e-6 && Math.abs(p[2] - (s[2] + off[1])) < 1e-6, `at ${t} the body and its cell's lobes part`);
  }
  assert.deepEqual(Array.from(F.cellOff({ air: false, V }, 999)), [0, 0, 0], 'a world cell is never carried, nor lifted');
  assert.ok(Math.abs(Math.hypot(...F.cellOff(C, tL + 1)) - Math.hypot(...F.airW(V))) < 1e-9 && Math.hypot(...F.airW(V)) > 1, 'a second on, the low layer\'s wind');
});

test('drift: the readers take an air cell\'s offset (physics: clouds/drift G1)', () => {
  for (const [what, re] of [
    ['the obstacles', /var off = cellOff\(C, tt, OBO\)/],
    ['the slip plan\'s bodies', /var off = cellOff\(C, SIM\.t, SLIPO\)/],
    ['the slip plan\'s meeting point', /if \(o\.w\) \{ var mt = slipMeet\(s, v, o\.w\[0\] \* hx \+ o\.w\[1\] \* hz\);/],
    ['the mist about the eye', /var off = cellOff\(B\.cell, cloudT\(\), MISTO\)/],
    ['the drawn bodies', /if \(o\.w\) \{ cloudPos\(o, tv, VPOS\);/],
    ['the drawn bodies\' moment (the draw\'s, between the last two steps)', /var tv = cloudT\(\);/],
    ['the air cells\' stream reach (the air\'s own closing speed)', /return L\.radius \+ Math\.sqrt\(w\[0\] \* w\[0\] \+ w\[1\] \* w\[1\]\) \/ Math\.max\(V\.speed, 1\) \* \(0\.1 \* L\.radius \+ 100 \+ L\.size \* 0\.5\);/],
    ['the bodies\' distance fade', /var pc = o\.w \? cloudPos\(o, cloudT\(\), VDF\) : o\.c/],
    ['the cores in the depth', /gl\.uniform3f\(P\.u\.uOccOff, oo\[0\], oo\[2\], oo\[1\]\)/],
    ['the birds\' cloud chords', /o2 = cellOff\(C2, cloudT\(\), CBO\)/],
    ['the birds\' places', /var po = p\.cell \? cellOff\(p\.cell, cloudT\(\), CBP\) : CBZ/],
    ['the boot\'s need', /pc = o\.c0 \? cloudPos\(o, SIM\.t, BOOTP\) : o\.c/],
  ]) assert.match(WORLD, re, `${what} read an air cell where it was laid out`);
  // (no reader takes c0 but cloudPos and the resolve that sets it)
  // (allowed: cloudPos itself, the resolve that sets it, the billows' offset (the laid-out centre is what it wants) and
  // the boot's guard; a cloud body is o, B, vb.out or a body's out; SKYN.c0 and a frame's f.c0 are other things)
  const allowed = [/r\[0\] = o\.c0\[0\] \+/, /vb\.out\.c0 = Float64Array\.from/, /var c0 = B\.c0 \|\| B\.c, nS/, /pc = o\.c0 \? cloudPos\(/];
  const bad = WORLD.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => /\b(o|B|out|o2|Bb|sb)\.c0\b/.test(l.replace(/\/\/.*$/, '')) && !allowed.some((re) => re.test(l)));
  assert.deepEqual(bad.map((l) => l.trim().slice(0, 120)), [], 'a reader takes a body\'s laid-out centre c0 directly');
});

test('drift: the march sees only the camera less the body (a body carried at W, the camera at V, is a still body with the camera at V - W)', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT } = await import('../unit-lib.mjs');
  const strip = (f) => fs.readFileSync(path.join(ROOT, 'src/world/glsl', f), 'utf8').replace(/\/\/[^\n]*/g, '');
  const FS = strip('fs-vbody.glsl'), VS = strip('vs-vbody.glsl');
  // every place the body's centre is read: the camera less it, its height (the drift is level), or the box's corner
  const fsUses = FS.match(/[^\n;]*\buVC\b[^\n;]*/g).filter((l) => !/uniform/.test(l));
  for (const l of fsUses) assert.ok(/uCam - uVC/.test(l) || /\buVC\.y\b/.test(l), `fs-vbody reads the body's place absolutely: ${l.trim()}`);
  assert.ok(!/\buVC\.(x|z|xz|xy)\b/.test(FS), 'fs-vbody reads the body\'s level place');
  assert.match(VS, /w = uVC \+ vec3\(/); assert.match(VS, /vec4\(w - uCam, 1\.0\)/);
  // the billows: the body's own offset, no clock, no world place
  assert.ok(/vec3 nOff = uVO;/.test(FS) && !/\buT\b/.test(FS), 'the billows read a clock or the world');
  assert.ok(!/\buCam\.(x|z|xz)\b/.test(FS), 'fs-vbody reads the camera\'s level place');
});

test('drift: an air cell keeps the same pieces whatever frame its layout ran in (its pick and gates in the air frame, x - dL)', () => {
  const PICK = cut(WORLD, '  function pickOf(o, salt, ox, oz) {', '\n', true);
  const P = vm.runInThisContext('(function () {' + cut(WORLD, '  function ihash(x) {', '\n', true) + cut(WORLD, '  function hfl(h) {', '\n', true) + PICK + ' return pickOf; })')();
  let flips = 0, n = 0;
  for (let i = 0; i < 10000; i++) {
    const ax = (i * 7919.37) % 40000 - 20000, az = (i * 104729.11) % 40000 - 20000, w = [6.3, -4.1], t = 1000 + i * 0.37;
    const d1 = [w[0] * t, w[1] * t], d2 = [w[0] * (t + 1 / 60), w[1] * (t + 1 / 60)];   // (laid out a frame later)
    const a = P({ x: ax + d1[0], z: az + d1[1] }, 0x5bd1e995, d1[0], d1[1]) < 0.5, b = P({ x: ax + d2[0], z: az + d2[1] }, 0x5bd1e995, d2[0], d2[1]) < 0.5;
    n++; if (a !== b) flips++;
  }
  assert.equal(flips, 0, `${flips} of ${n} keep decisions flip when the layout runs a frame later`);
  assert.match(WORLD, /function keep\(o\) \{ return pickOf\(o, kit === 'above' \? 0x5bd1e995 : 0x27d4eb2d, ox, oz\) < dens\(o\.x - ox, o\.z - oz\); \}/, 'the kit\'s keep hashes the stored place, not the air frame\'s');
  assert.match(WORLD, /var ox = C\.dL \? C\.dL\[0\] : 0, oz = C\.dL \? C\.dL\[1\] : 0;/);
  assert.match(WORLD, /return aboveKeep\(it, C\.air \? C\.dL\[0\] : 0, C\.air \? C\.dL\[1\] : 0\); \}\);/);
  assert.match(WORLD, /return !cl\.lq \|\| aboveKeep\(cl, C\.air \? C\.dL\[0\] : 0, C\.air \? C\.dL\[1\] : 0\); \}\);/);
});
