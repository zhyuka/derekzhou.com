// test/unit/drift.mjs: the clouds' drift with the wind at their level (physics: clouds/drift)
// plant: {"file": "src/world/410-drawing-frame.js", "find": "var tv = cloudT();", "with": "var tv = SIM.t;", "why": "the drawn bodies a step ahead of the camera: a judder at every frame between two steps"}
// plant: {"file": "src/world/180-world-definition-two-kits-by.js", "find": "Math.round((o.x - (ox || 0)) * 8)", "with": "Math.round(o.x * 8)", "why": "an air cell's keep hashed at its stored place: the layout's frame flips it"}
// plant: {"file": "src/world/236-cells-streamer-work-pool.js", "find": "var pc = o.w ? cloudPos(o, cloudT(), VDF) : o.c,", "with": "var pc = o.c0 || o.c,", "why": "a drifting body's distance fade read where it was laid out: it comes out of the haze where it no longer is"}
// plant: {"file": "src/realm-dunes.js", "find": "dir: dAirDir(C.V) + R.r(-15, 15) * PI / 180,", "with": "dir: dAirDir(C.V) + R.r(45, 75) * PI / 180,", "why": "the ranges at 60 deg to the wind, not along it"}
// plant: {"file": "src/realm-above.js", "find": "var s = aSite(C.ix, C.iz, C.salt), Rs, k, a, d;", "with": "var s = aSite(C.ix, C.iz, C.salt), Rs, k, a, d; if (s.kind === 0) aTower(C, R, s.x, s.z, 300, 400, 1, false);", "why": "the open sea's tower back in the world cell: a free cumulus standing still"}
// plant: {"file": "src/world/236-cells-streamer-work-pool.js", "find": "    return Math.min(f, cellDistFade(C));", "with": "    return f;", "why": "a body faded by its own distance alone: a cloud sea tower, or a canyon wall, at its cell's near side shows when its cell is made (a pop)"}
// plant: {"file": "src/world/414-draw-scene.js", "find": "dO - Math.floor(dO / 1024000) * 1024000", "with": "dO - Math.floor(dO / 1000000) * 1000000", "why": "the deck's offset wrapped at no whole number of its tiles: a seam at every wrap"}
// plant: {"file": "src/world/212-cloud-drift.js", "find": "var a = airBase(0, 0, layer === 'deck' ? AIR_H.deck : AIR_H.clouds, V);", "with": "var a = windAt(0, 0, layer === 'deck' ? AIR_H.deck : AIR_H.clouds, SIM.t, V);", "why": "the clouds' drift the sky's wind: a Milky Way's drifts them 1.3x"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "        if (C.air) C.dL = airD(V, SIM.t);", "with": "", "why": "the opening moon's layout reads an air cell's carry before it has one: the page throws on a moonlit night"}
// plant: {"file": "src/realm-above.js", "find": "var th = aStreet(C.V, s),", "with": "var th = s.r[0] * PI,", "why": "a canyon on a random axis, not along the wind as a cloud street"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

const SRC = cut(WORLD, '  function cloudWind(', '  /* ----'), AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') + cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function airSpeed(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(') + cut(WORLD, '  function airDay(', '\n', true);
const make = (simT, alpha) => vm.runInThisContext('(function (SIM, SIM_DT) { var PI = Math.PI;' + AIRSRC + SRC + ' return { cloudWind: cloudWind, cloudPos: cloudPos, cloudT: cloudT }; })')(simT === undefined ? { t: 0, alpha: 1 } : { t: simT, alpha }, 1 / 60);
const D = make();

test('drift: the clouds\' wind is the air\'s day wind (airBase, never the sky\'s share) at the low layer\'s height, and the deck\'s; the cloud sea held', () => {
  const W = vm.runInThisContext('(function (SIM) { var PI = Math.PI;' + AIRSRC + ' return { airBase: airBase, airDay: airDay, AIR_H: AIR_H }; })')({ V: null, t: 0 });
  for (const az of [0, 37, 200, 333]) {
    const a = az * Math.PI / 180, V = { wind: [Math.sin(a), Math.cos(a)], u10: 3 + az / 90 };
    const lo = D.cloudWind(V, 'low'), dk = D.cloudWind(V, 'deck'), sea = D.cloudWind(V, 'sea');
    const wl = { ...W.airBase(0, 0, W.AIR_H.clouds, V) }, wd = { ...W.airBase(0, 0, W.AIR_H.deck, V) };   // (copies: airBase returns its one object)
    assert.ok(Math.abs(lo[0] - wl.x) < 1e-12 && Math.abs(lo[1] - wl.z) < 1e-12, `low ${Array.from(lo)} is not airBase's ${wl.x}, ${wl.z}`);
    assert.ok(Math.abs(dk[0] - wd.x) < 1e-12 && Math.abs(dk[1] - wd.z) < 1e-12, 'the deck is not airBase\'s');
    assert.deepEqual(Array.from(sea), [0, 0], 'the cloud sea is held');
  }
  assert.deepEqual(Array.from(D.cloudWind({}, 'low')), [0, 0], 'a visit with no wind: no drift');
  // (the hub, 2026-11-23: windAt's t now carries the sky's share; a Milky Way's 1.5 aloft would drift the clouds 1.3x: they read the day's wind)
  const D212 = cut(WORLD, '  function cloudWind(', '  /* ----').replace(/\/\/[^\n]*/g, '');
  assert.ok(!/\bwindAt\(/.test(D212), 'the clouds read windAt: their drift changes with the sky (its share), and a place is no longer a pure function of t');
  assert.match(WORLD, /var AIRAPI = \{[^\n]*\bday: airDay,/, 'the air does not hand the realms its day wind (day)');
});

test('drift: every layout of a cell sets an air cell\'s carry (dL) first, as cellApi reads it', () => {
  // (#303's opening moon lays out every scale's cells at the cut, the air scales among them: cellApi reads C.dL[0])
  const calls = WORLD.split('\n').map((l, i) => [l, i]).filter(([l]) => /\bcellApi\(C\)/.test(l) && !/function cellApi/.test(l));
  assert.ok(calls.length >= 2, `${calls.length} layouts of a cell found (the stream's and the opening moon's)`);
  const W = WORLD.split('\n');
  for (const [l, i] of calls) {
    const before = W.slice(Math.max(0, i - 3), i + 1).join('\n');
    assert.ok(/if \(C\.air\) \{? ?C\.dL = airD\(V, SIM\.t\)/.test(before), `a cell laid out without its air carry set: ${l.trim().slice(0, 100)}`);
  }
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
  assert.match(VS, /w = uVC \+ vec3\(/); assert.match(VS, /vec4\(eyeRel\(w\), 1\.0\)/);   // (the eye-relative place, #309's large world)
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

// the ranges lie along the low layer's own way, +- 15 deg (a cloud street; physics: clouds/drift, the spec's ranges row):
// the dunes' own dAir run in Node with the air's day wind (airBase), its draws recorded, over winds from every way
test('drift: a range lies along the low layer\'s wind, within 15 deg of it', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT } = await import('../unit-lib.mjs');
  const DUNES = fs.readFileSync(path.join(ROOT, 'src/realm-dunes.js'), 'utf8');
  const AIRSRC2 = AIRSRC + cut(WORLD, '  function airSpeed(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(');
  const DAIR = cut(DUNES, '  function dAirDir(V) {', '\n', true) + cut(DUNES, '  function dAir(C, R) {', '\n  }\n', true);
  const run = vm.runInThisContext('(function (SIM, C, R) { var PI = Math.PI;' + AIRSRC2 + ' var A = { day: airDay, H: AIR_H };\n' + DAIR + ' dAir(C, R); })');
  let n = 0, worst = 0;
  for (let az = 0; az < 360; az += 7.5) for (const u10 of [3, 5.5, 7.5]) for (const ex of [-1, -0.4, 0, 0.4, 1]) {
    const a = az * Math.PI / 180, V = { wind: [Math.sin(a), Math.cos(a)], u10 }, out = [];
    const W = vm.runInThisContext('(function (SIM, V) { var PI = Math.PI;' + AIRSRC2 + ' var w = airBase(0, 0, AIR_H.clouds, V); return Math.atan2(w.x, w.z); })')({ V: null, t: 0 }, V);
    // (R: its first draw admits the range; its uniform draws at the ends of their spans (ex -1, 1) and between)
    const R = { f: () => 0, r: (lo, hi) => lo + (hi - lo) * (0.5 + 0.5 * ex), seed: () => 1 };
    run({ V: null, t: 0 }, { V, x0: 0, z0: 0, size: 3000, cloud: (o) => out.push(o) }, R);
    assert.equal(out.length, 1, 'no range laid out');
    const d = ((out[0].dir - W) * 180 / Math.PI % 360 + 540) % 360 - 180;
    worst = Math.max(worst, Math.abs(d)); n++;
    assert.ok(Math.abs(d) <= 15 + 1e-9, `a range at ${d.toFixed(1)} deg from the low layer's wind (az ${az}, U10 ${u10})`);
  }
  assert.ok(worst > 14.9, `the ranges' spread reaches only ${worst.toFixed(1)} deg: the test does not see their span`);
});

// every free cumulus is carried (the hub's round-3 review): ABOVE's own realm run on a stub kit with the world's
// streams, its world cells (cell:) over a census of sites lay out no cumulus at all (the canyon's walls are the cloud
// sea's, held), and its air cells (air:) lay out every tower; a tower put back in cell: would stand still
test('drift: ABOVE\'s world cells lay out no cumulus; its air cells lay out the towers', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT, STREAMS } = await import('../unit-lib.mjs');
  const ABOVE = fs.readFileSync(path.join(ROOT, 'src/realm-above.js'), 'utf8');
  const S = vm.runInThisContext('(function () { var PI = Math.PI, SIM = { V: null }, J = { seed: 1 };\n' + STREAMS + ' return { RNG: RNG, cellHash: cellHash, hk: hk, hfl: hfl, ihash: ihash }; })')();
  let def = null;
  const kit = { lch: (l, c, h, k) => [l, c, h, k === undefined ? 1 : k], cellHash: S.cellHash, hk: S.hk, hfl: S.hfl, ihash: S.ihash, RNG: S.RNG };
  vm.runInThisContext('(function (window) {\n' + ABOVE + '\n})')({ WORLD: { kit, forms: {}, air: {}, realm: (d) => { def = d; } } });
  assert.ok(def && def.cell && def.air, 'ABOVE did not register');
  const kinds = { cell: {}, air: {} };
  const cellOf = (ix, iz, salt) => {
    const out = [], C = { ix, iz, salt, hash: S.cellHash(ix, iz, salt), x0: ix * 1200, z0: iz * 1200, size: 1200, V: { wind: [0, 1], u10: 5, light: { sunEl: 8, sunAz: 120 } } };
    C.cloud = (cl) => { out.push(cl); return cl; }; C.add = () => {}; C.poi = () => {}; C.flock = () => {}; C.inside = () => true;
    return [C, out];
  };
  for (const salt of [1, 77, 4099]) for (let iz = -12; iz < 12; iz++) for (let ix = -12; ix < 12; ix++) {
    for (const way of ['cell', 'air']) {
      const [C, out] = cellOf(ix, iz, salt);
      def[way](C, S.RNG(S.hk(C.hash, way === 'air' ? 47 : 1)));
      for (const cl of out) kinds[way][cl.kind] = (kinds[way][cl.kind] || 0) + 1;
    }
  }
  assert.ok(!kinds.cell.cumulus, `ABOVE's world cells lay out ${kinds.cell.cumulus} cumulus: free clouds standing still (${JSON.stringify(kinds.cell)})`);
  assert.ok(kinds.cell.wall > 0, 'the census met no canyon: it proves nothing about the world cells');
  assert.ok(kinds.air.cumulus > 50, `ABOVE's air cells lay out only ${kinds.air.cumulus || 0} cumulus: the towers are gone`);
});

// the canyon walls lie along the low layer's wind as a cloud street's rows (physics: clouds/streets): within 30 deg of
// the mean wind, most often within 10 (https://doi.org/10.1007/BF00705527). ABOVE's own world cells run on the stub kit
// with the air's day wind, over a census of sites and every way and strength of wind
test('drift: every canyon lies along the low layer\'s wind, within the cloud streets\' 30 deg, most within 10', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT, STREAMS } = await import('../unit-lib.mjs');
  const ABOVE = fs.readFileSync(path.join(ROOT, 'src/realm-above.js'), 'utf8');
  const AIRSRC2 = AIRSRC + cut(WORLD, '  function airSpeed(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(');
  const G = vm.runInThisContext('(function (SIM) { var PI = Math.PI, J = { seed: 1 };\n' + STREAMS + AIRSRC2 + ' return { RNG: RNG, cellHash: cellHash, hk: hk, hfl: hfl, ihash: ihash, airDay: airDay, airBase: airBase, AIR_H: AIR_H }; })')({ V: null, t: 0 });
  let def = null;
  const kit = { lch: (l, c, h, k) => [l, c, h, k === undefined ? 1 : k], cellHash: G.cellHash, hk: G.hk, hfl: G.hfl, ihash: G.ihash, RNG: G.RNG };
  vm.runInThisContext('(function (window) {\n' + ABOVE + '\n})')({ WORLD: { kit, forms: {}, air: { day: G.airDay, H: G.AIR_H }, realm: (d) => { def = d; } } });
  let n = 0, near = 0, worst = 0;
  for (let az = 0; az < 360; az += 15) for (const u10 of [3, 5.5, 7.5]) {
    const a = az * Math.PI / 180, V = { wind: [Math.sin(a), Math.cos(a)], u10, light: { sunEl: 8, sunAz: 120 } };
    const w = { ...G.airBase(0, 0, G.AIR_H.clouds, V) }, wa = Math.atan2(w.x, w.z);
    for (const salt of [1, 4099]) for (let iz = -6; iz < 6; iz++) for (let ix = -6; ix < 6; ix++) {
      const out = [], C = { ix, iz, salt, hash: G.cellHash(ix, iz, salt), x0: ix * 1200, z0: iz * 1200, size: 1200, V };
      C.cloud = (cl) => { out.push(cl); return cl; }; C.add = () => {}; C.poi = () => {}; C.flock = () => {}; C.inside = () => true;
      def.cell(C, G.RNG(G.hk(C.hash, 1)));
      for (const cl of out) if (cl.kind === 'wall') {
        const d = Math.abs(((cl.dir - wa) * 180 / Math.PI % 180 + 270) % 180 - 90);   // (a line: either way along it)
        assert.ok(d <= 30 + 1e-9, `a canyon wall ${d.toFixed(1)} deg off the low layer's wind (az ${az}, U10 ${u10}, cell ${ix}, ${iz})`);
        n++; if (d <= 10) near++; worst = Math.max(worst, d);
      }
    }
  }
  assert.ok(n > 500, `the census met only ${n} canyon walls`);
  assert.ok(near / n > 0.45, `only ${(100 * near / n).toFixed(0)}% within 10 deg: most cloud streets lie within 10 of the wind`);
  assert.ok(worst > 20, `the walls' spread reaches only ${worst.toFixed(1)} deg: the test does not see the source's span`);
});

// no pops in the air (physics: clouds/drift, the spec's "no pops" proof): both kits' air cells, laid out by the realms
// themselves (their air(), their cloud(), 120's builders and volPrep's boxes) and streamed by the world's own radii
// (streamR: made at it and half a cell, freed at 1.3 of it and half a cell), on 20 min flights of random turns, every
// way and strength of wind; each body's weight the world's own volDistFade at the draw's moment. No body may weigh
// more than 0.001 when its cell is made, nor for 10 s after (the cell's build and bake), nor when it is freed
test('drift: no cloud body shows when its cell is made or freed, air cells and world cells, on 20 min flights in every wind', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT, STREAMS } = await import('../unit-lib.mjs');
  const DUNES = fs.readFileSync(path.join(ROOT, 'src/realm-dunes.js'), 'utf8'), ABOVE = fs.readFileSync(path.join(ROOT, 'src/realm-above.js'), 'utf8');
  const AIR2 = AIRSRC + cut(WORLD, '  function airSpeed(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(');
  const W = vm.runInThisContext(`(function () { var PI = Math.PI, SIM = { V: null, t: 0, alpha: 1 }, SIM_DT = 1 / 60, shown = true, DEVMODE = false, SW = {}, VOL16 = false, LOOKD = false, J = { seed: 1 }, CAM = { pos: [0, 0, 0] };
    function clamp(x, a, b) { return Math.min(Math.max(x, a), b); } function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function memTier() { return 'desktop'; } function volDetail() { return new Float32Array([96, 4.6]); } function cellLift() { return 0; }
    ${STREAMS}${AIR2}${SRC}${cut(WORLD, '  function Puffs() {', '  function mound(')}${cut(WORLD, '  function volPrep(', '  /* up to budget units')}
    ${cut(WORLD, '  function nearDist(C, x, z) {', '\n', true)}${cut(WORLD, '  function streamR(L, V) {', '\n', true)}${cut(WORLD, '  function fadeZ(V, sc) {', '  function lateBorn(')}
    return { SIM: SIM, CAM: CAM, RNG: RNG, cellHash: cellHash, subseed: subseed, hk: hk, hfl: hfl, ihash: ihash, airBase: airBase, airDay: airDay, AIR_H: AIR_H, airW: airW, streamR: streamR, volDistFade: volDistFade, Puffs: Puffs, volPrep: volPrep, cumulus: cumulus, range: range, wall: wall };
  })()`);
  const defs = {};
  for (const [name, src] of [['dunes', DUNES], ['above', ABOVE]]) {
    const kit = { lch: (l, c, h, k) => [l, c, h, k === undefined ? 1 : k], cellHash: W.cellHash, hk: W.hk, hfl: W.hfl, ihash: W.ihash, RNG: W.RNG, cumulus: W.cumulus, range: W.range, wall: W.wall, box: () => {}, prism: () => {}, lathe: () => {}, rock: () => {} };
    vm.runInThisContext('(function (window) {\n' + src + '\n})')({ WORLD: { kit, forms: {}, air: { day: W.airDay, H: W.AIR_H }, realm: (d) => { defs[name] = d; } } });
  }
  const KITS = { dunes: { sc: 3, L: { size: 1500, radius: 5200, air: 'dunes' } }, above: { sc: 4, L: { size: 1200, radius: 3800, air: 'above' } }, aboveWorld: { sc: 2, L: { size: 1200, radius: 3800 }, world: true, def: 'above' } };
  assert.match(WORLD, /\{ size: KD\.layout\.scales\[0\]\.size, radius: KD\.layout\.scales\[0\]\.radius, air: 'dunes' \}, \{ size: KA\.layout\.scales\[0\]\.size, radius: KA\.layout\.scales\[0\]\.radius, air: 'above' \}/, 'the air scales are not the 4th and 5th, at the kits\' sizes');
  assert.match(DUNES, /scales: \[\{ size: DS, radius: 5200 \}/); assert.match(DUNES, /var DS = 1500,/); assert.match(ABOVE, /scales: \[\{ size: AS, radius: 3800 \}\]/); assert.match(ABOVE, /var AS = 1200,/);
  let s0 = 12345; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
  const tot = { dunes: { n: 0, lead: Infinity, free: 0 }, above: { n: 0, lead: Infinity, free: 0 }, aboveWorld: { n: 0, lead: Infinity, free: 0 } };
  for (const kit of ['dunes', 'above', 'aboveWorld']) for (const u10 of [3, 5, 7.5]) for (let az = 0; az < 360; az += 45) for (const seed of [11, 707]) {
    const { sc, L } = KITS[kit], K0 = KITS[kit], dn = K0.def || kit, a = az * Math.PI / 180, scales = []; scales[sc] = L;
    const V = { wind: [Math.sin(a), Math.cos(a)], u10, seed: seed + az, salt: seed * 31, speed: 12, light: { sunEl: 8, sunAz: 120 }, def: { layout: { scales } } };
    const w = K0.world ? [0, 0] : W.airW(V), Rs = W.streamR(L, V), make = Rs + L.size / 2, free = Rs * 1.3 + L.size / 2, cells = new Map(), pend = [], T = tot[kit];
    const cellOf = (ix, iz) => {   // (an air cell laid out where the air stood at t 0: its bodies' c0 in the air frame, carried at w)
      const out = [], hash = W.cellHash(ix, iz, ((K0.world ? V.salt : W.subseed(V.seed, 47)) ^ (sc * 0x9e3779b9)) >>> 0), C = { V, sc, air: !K0.world, cx: (ix + 0.5) * L.size, cz: (iz + 0.5) * L.size, size: L.size };
      defs[dn][K0.world ? 'cell' : 'air']({ V, ix, iz, scale: 0, salt: V.salt, hash, x0: ix * L.size, z0: iz * L.size, size: L.size, air: !K0.world, cloud: (cl) => { out.push(cl); return cl; }, add: () => {}, poi: () => {}, flock: () => {}, inside: () => true, weights: () => [1, 0] }, W.RNG(hash), {});
      const B = [];
      for (let i = 0; i < out.length; i++) { const cl = out[i]; cl.base = 600; const PF = new W.Puffs(); defs[dn].cloud(cl, PF, W.RNG(cl.seed || (i * 7919) >>> 0)); for (let bi = 0; bi < PF.bodies.length; bi++) { const o = W.volPrep(PF, bi, null, 44, V).out; if (!K0.world) { o.c0 = Float64Array.from(o.c); o.w = w; } o.cell = C; B.push(o); } }
      return { ix, iz, C, B };
    };
    let x = 0, z = 0, hd = rnd() * 6.283, turn = 0;
    for (let s = 0; s < 2400; s++) {
      const t = s * 0.5; if (s % 10 === 0) turn = (rnd() - 0.5) * 0.6; hd += turn * 0.5; x += 12 * Math.sin(hd) * 0.5; z += 12 * Math.cos(hd) * 0.5;
      W.SIM.t = t; W.CAM.pos[0] = x; W.CAM.pos[2] = z;
      const ax = x - w[0] * t, az2 = z - w[1] * t, n = Math.ceil(Rs / L.size) + 1, bx = Math.floor(ax / L.size), bz = Math.floor(az2 / L.size);
      for (let jz = -n; jz <= n; jz++) for (let jx = -n; jx <= n; jx++) {
        const ix = bx + jx, iz = bz + jz, k = ix + ',' + iz;
        if (cells.has(k) || Math.hypot((ix + 0.5) * L.size - ax, (iz + 0.5) * L.size - az2) > make) continue;
        const c = cellOf(ix, iz); cells.set(k, c); if (s > 0) for (const o of c.B) { T.n++; pend.push([o, t]); }
      }
      for (let i = pend.length - 1; i >= 0; i--) if (W.volDistFade(pend[i][0]) > 0.001) { T.lead = Math.min(T.lead, t - pend[i][1]); pend.splice(i, 1); }
      for (const [k, c] of cells) if (Math.hypot((c.ix + 0.5) * L.size - ax, (c.iz + 0.5) * L.size - az2) > free) { for (const o of c.B) T.free = Math.max(T.free, W.volDistFade(o)); cells.delete(k); }
    }
  }
  for (const kit of ['dunes', 'above', 'aboveWorld']) {
    const T = tot[kit];
    assert.ok(T.n > 300, `only ${T.n} ${kit} bodies made in flight: the census proves nothing`);
    assert.ok(T.lead >= 10, `a ${kit} air cell's body weighs over 0.001 ${T.lead} s after its cell is made: it pops in as it is baked`);
    assert.ok(T.free <= 0.001, `a ${kit} air cell is freed with a body at weight ${T.free.toFixed(3)}: it pops out`);
  }
  if (process.env.DRIFT_SAY) console.log(JSON.stringify(tot));
});

// the high deck carried by its wind (physics: clouds/drift 7): 414 computes its offset in doubles from the draw's moment
// and wraps it to a whole number of the deck's noise tiles (sky-body.glsl: 153.6 km along the wind) before it goes to
// the GPU as a float, so after a day's flight it still moves by whole float steps of under 0.1 m, and the wrap is seamless
test('drift: the high deck\'s offset is carried in doubles and wrapped to whole noise tiles', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT } = await import('../unit-lib.mjs');
  const SKY = fs.readFileSync(path.join(ROOT, 'src/world/glsl/sky-body.glsl'), 'utf8');
  const L = /var dW = cloudWind\(V, 'deck', DECKW\), dS = [^;]+, dO = dS \* cloudT\(\);/.exec(WORLD), U = /gl\.uniform4f\(P\.u\.uDeck, [^;]*?, dO - Math\.floor\(dO \/ (\d+)\) \* \1, 0\);/.exec(WORLD);
  assert.ok(L, 'the deck\'s offset is not its wind\'s speed times the draw\'s moment (cloudT, in doubles)');
  assert.ok(U, 'the deck\'s offset is not wrapped before it goes to the GPU');
  const tile = +/vec2\(1\.0 \/ (\d+)\.0, 1\.0 \/ \d+\.0\)/.exec(SKY)[1], wrap = +U[1];
  assert.equal(wrap % tile, 0, `the wrap ${wrap} m is not a whole number of the deck's ${tile} m tile: a seam at every wrap`);
  for (const t of [0, 1, 3600, 86400, 864000]) for (const dS of [2, 9.5, 19]) {
    const dO = dS * t, z = dO - Math.floor(dO / wrap) * wrap, z1 = Math.fround(z), dz = dS / 60, z2 = Math.fround(z + dz);
    assert.ok(z >= 0 && z < wrap, `the wrapped offset ${z} is outside [0, ${wrap})`);
    assert.ok(Math.abs(z1 - z) < 0.05, `at t ${t} s the float offset is ${Math.abs(z1 - z).toFixed(3)} m off`);
    if (z + dz < wrap) assert.ok(Math.abs((z2 - z1) - dz) < 0.1, `at t ${t} s a frame's move of ${dz.toFixed(3)} m is ${(z2 - z1).toFixed(3)} m as a float`);
  }
});
