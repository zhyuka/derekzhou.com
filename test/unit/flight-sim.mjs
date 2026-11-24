// test/unit/flight-sim.mjs: the flight flown whole: its controllers under random drags among solids
// plant: {"file": "src/world/286-hard-rule.js", "find": "(SIM.t - S.pt >= SLIP_REGAP && !(Math.abs(angDiff(S.psi, S.ppsi)) < SLIP_REPSI))", "with": "!(Math.abs(angDiff(S.psi, S.ppsi)) < 0.004)", "why": "the slip re-planned at every step of a turn"}
// plant: {"file": "src/world/231-cells-resolve.js", "find": "if (dB > 0) { for", "with": "if (dB > 1e9) { for", "why": "the cloud bodies no longer lifted over the flight band: the cores' heights the sim assumes are gone"}
// plant: {"file": "src/world/180-world-definition-two-kits-by.js", "find": "FORM_ALLOW * fd) + FLY_TOP + BAND_M;", "with": "FORM_ALLOW * fd) + BAND_M;", "why": "the band's top without the camera's reach over the land: the cores sit lower than the sim puts them"}
// plant: {"file": "src/world/286-hard-rule.js", "find": "(SIM.t - S.pt >= SLIP_REGAP && !(", "with": "((true) && !(", "why": "the slip re-planned at every 2 deg of a fast turn: no floor between plans"}
// plant: {"file": "src/world/286-hard-rule.js", "find": "    if (Math.abs(S.latT - S.lat) < 0.05 && Math.abs(S.sv) < 0.02) S.sv = 0;\n", "with": "", "why": "the slip not held at rest on its line: it chatters"}
// plant: {"file": "src/world/286-hard-rule.js", "find": "var k = Math.max(Math.min(R, d + ds), o.r + HARD_IN) / Math.max(d, 1e-3);", "with": "var k = R / Math.max(d, 1e-3);", "why": "the hard rule's push out of a landmark a jump"}
// plant: {"file": "src/world/286-hard-rule.js", "find": "var k2 = Math.max(Math.min(R2, dd + ds), o.r + HARD_IN) / Math.max(dd, 1e-3);", "with": "var k2 = Math.min(R2, dd + ds) / Math.max(dd, 1e-3);", "why": "the hard rule's ease out of a cloud's core with no floor: the camera inside the solid"}
// plant: {"file": "src/world/286-hard-rule.js", "find": "  var HARD_IN = 1.25;", "with": "  var HARD_IN = 1;", "why": "the hard rule at 1 m: the near plane's corner (1.15 m in a square window) cuts a face met obliquely"}
// plant: {"file": "src/world/270-flight.js", "find": "CS.y = Math.max(ceil, CS.y - PUSH_V * dt);", "with": "CS.y = ceil;", "why": "the ceiling a jump"}
// plant: {"file": "src/world/270-flight.js", "find": " if (CS.ay > 0) CS.ay = 0; SIM.fixC++; }", "with": " if (CS.ay > 0) CS.ay = 0; }", "why": "the ceiling's clamps not counted"}
// plant: {"file": "src/world/280-ground-what-stands-ahead.js", "find": "q.x = o.x + off[0]; q.z = o.z + off[1];", "with": "q.x = o.x; q.z = o.z;", "why": "an air cell's obstacles where its cell laid them out, not where the air carried them"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';
import { loadGround } from '../ground.mjs';

// ------------------------------------------------------------------ the flight's controllers, flown whole
// (flight-controllers-smooth) The flight cut from the world as it ships: the flight section to the hard rules (270-286:
// simStep, the height's target and spring, the slip's plan and step, the hard rules), the drag's input (340) and the
// cruise (320), flown over seed 11's recorded ground (test/golden/ground/11) among solids made here (landmarks'
// cylinders and clouds' cores, one a 400 m cell, out to 3.2 km), 4 seeds x 240 s of random drags (a turn of up to
// 900 px/s on a 1000 px window, a tilt of up to 150 px/s, 0.3-2 s each, one every 4 s or so).
//   - while the way turns, the slip is planned at most 10 times a second, every 0.1 s at most however fast the turn
//     (it was every step: 46-48 a second);
//   - the slip's sign flips under once in 2 s (its controller chattered about its line: 2.1-8 times a second);
//   - the height's acceleration changes at most 2 m/s3 (VY_J), the hard rules included;
//   - the ground's rule never acts, and no step leaves the camera nearer a solid's face (its side, top or foot) than
//     HARD_IN (1.25 m: past the near plane's farthest corner in any settled window), measured every step.
// A drag can turn the way straight at a landmark 20 m off, nearer than any slip can clear (1.05 m/s2): the hard rule
// then eases the camera out along its face, as on main, so pushes under drags are not counted here; left alone among
// the same solids the flight needs no push of any rule (6 headings a seed, 120 s each).
const G = loadGround(11);
const HARD_IN = +/var HARD_IN = ([\d.]+);/.exec(WORLD)[1];
const FLIGHT = cut(WORLD, '  /* ---------------------------------------------------------------- the flight */', '  /* ---------------------------------------------------------------- the places, the look ahead */');
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* dev: an input injected');
const CRUISE = cut(WORLD, '  var CW_S = [', '\n  function flightParams') + '\n' + cut(WORLD, '  function flightParams(V, cw) {', '\n  }\n', true);
// (physics: clouds/drift) the clouds' cores ride in air cells: the world's own cellOff carries them by the low layer's
// wind (airW: the test's), with no lift (the band's lift is band.mjs's); the landmarks stand in world cells
const CELLOFF = cut(WORLD, '  function cellOff(', '\n  }\n', true);
const MAKE = vm.runInThisContext('(function (G, OBST, AW) {\n  \'use strict\';\n' +
  '  function airW() { return AW; }\n  function cellLift() { return 0; }\n' + CELLOFF + '\n' +
  '  var PI = Math.PI, DEG = PI / 180, DEVMODE = false, POSE = null, NOAUTO = false, shown = true, STILLMODE = false, SEEDR = 1, J = { seed: 1 }, VSTAGES = [], BIRDS = null, DTMAX = 0.1, SW = {};\n' +
  '  var OUT = { cssW: 1000 }, MOTION = { on: false }, INPQ = []; INPQ.i = 0; var REC = null, REL = { n: 0 }, px = 0, py = 0, pd = false;\n' +
  '  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0, fx: 0, fy: 0, ft: 0, relAny: false, held: false, qx: 0, qy: 0 };\n' +
  '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function lerp(a, b, t) { return a + (b - a) * t; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
  '  function angDiff(a, b) { var d = (a - b) % (2 * PI); return d > PI ? d - 2 * PI : d < -PI ? d + 2 * PI : d; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n  function devInput() {}\n' +
  '  function groundAt(V, x, z) { return G.groundAt(x, z); }\n  function kwAt(x, z) { return [0, 0, 0, G.seaW(x, z)]; }\n  function airHeading0() { return 0.7; }\n' +
  '  function planVisit() {}\n  function kwFollow() {}\n  function kwUpload() {}\n  function groundCache() {}\n  function climateLight() {}\n  function events() {}\n  function directorStep() {}\n  function beamWake() {}\n  function envSolids() {}\n  function pitchLook() {}\n  function devTrace() {}\n' +
  '  var V = { k: 0, st: 0, speed: 12, clear: [7, 14, 45], def: { clear: [7, 14, 45], cruise: [14, 32], margin: 12, marginB: 26 }, margin: 12, evRng: { r: function (a) { return a; } }, cellList: OBST };\n' +
  '  function worldAt() { return { V: V, u: 0 }; }\n' +
  CRUISE + '\n' + FLIGHT + '\n' + INPUT +
  '\n  return { SIM: SIM, CS: CS, INP: INP, cellOff: cellOff, pushOut: function () { pushOut(V); }, ceil: function () { return groundAt(V, CS.x, CS.z) + V.clear[2] + CEIL_OVER; }, ds: PUSH_V * SIM_DT,\n' +
  '    drag: function (dx, dy, up) { INP.down = !up; INP.rel = !!up; INP.dx += dx; INP.dy += dy; px += dx; py += dy; if (typeof relAdd === "function") { if (!pd) REL.n = 0; relAdd(px, py, SIM.t * 1000); } pd = !up; },\n' +   // (onMove's and onUp's samples, where the release reads them)
  '    step: function () { if (typeof inputFrame === "function" && SIM.V) inputFrame(SIM_DT); return simStep(); } };\n})');
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const AWS = [[4.2, -2.1], [-6.3, 5.0], [0.8, 8.9], [-5.5, -3.9], [7.4, 1.2]];   // (the low layer's wind a seed, m/s: 4.7-8.9)
// (#288 follow-up) where the world puts a cloud's core: 231 lifts every body whole until its lowest lobe's billows
// (its centre less 1.3 radii) clear the flight band's top, at least the land's own height + FLY_TOP + BAND_M (180's
// bandTopAt; the cloud sea's level and the formations' allowance only raise it), and 210 keeps a core 0.9 of its lobe
// less 29 m at least (the erosion's inward and 29 m): its foot 29 m over the band's top at least. The drag tests fly
// both: the stress set (cores 20-60 m over the ground, in the band, nearer than the world ever puts one) and the
// world's own (cores at the lowest the world can put them).
const FLY_TOP = +/FLY_TOP = ([\d.]+)/.exec(WORLD)[1], BAND_M = +/BAND_M = ([\d.]+)/.exec(WORLD)[1];
const INWARD = /Rm \* 0\.42 \+ (\d+) \+ (\d+), cores/.exec(WORLD), LIFTED = /- 1\.3 \* PF\.a\[j \* 12 \+ 3\]\);[^]{0,600}?if \(dB > 0\) \{ for/.test(WORLD) && /FORM_ALLOW \* fd\) \+ FLY_TOP \+ BAND_M;/.test(WORLD);
const CORE_FOOT = FLY_TOP + BAND_M + +INWARD[1] + +INWARD[2];   // (a core's foot over the land under it, m: the least the world gives)
function solids(seed, real) {
  const r = lcg(seed), L = [];
  for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
    if (!i && !j) continue;
    const cx = i * 400 + (r() - 0.5) * 300, cz = j * 400 + (r() - 0.5) * 300, g = G.groundAt(cx, cz);
    if (r() < 0.5) { L.push({ st: 2, obst: [{ c: true, x: cx, z: cz, r: 20 + 80 * r(), y0: g - 5, y1: g + 30 + 250 * r() }], bound: [cx, 0, cz, 120], softB: null }); continue; }
    // a cloud's core in an air cell, laid out where its cell stood at tL (dL: the air's carry then), so at the flight's
    // t it stands w t - dL from there: at the start, where it was drawn (the solids' grid), then carried by the wind
    const tL = 3600 * r(), dL = [AWS[seed % AWS.length][0] * tL, AWS[seed % AWS.length][1] * tL];
    const o = { c: false, cloud: true, x: cx + dL[0], z: cz + dL[1], y: g + 20 + 40 * r(), r: 15 + 40 * r() };
    if (real) o.y = g + CORE_FOOT + o.r + (o.y - g - 20);   // (the same core, its foot at the world's least and up to 40 m over it)
    L.push({ st: 2, air: true, V: {}, dL, obst: [o], bound: [cx + dL[0], 0, cz + dL[1], 120], softB: null });
  }
  return L;
}
function face(L, x, y, z, t = 0, aw = [0, 0]) {   // how near the camera is to the nearest solid's face (m; negative inside), an air cell's where the wind has carried it by t
  let m = 1e9;
  for (const C of L) for (const o of C.obst) {
    const ox = o.x + (C.air ? aw[0] * t - C.dL[0] : 0), oz = o.z + (C.air ? aw[1] * t - C.dL[1] : 0);
    let d;
    if (o.c) {   // (a capped cylinder's signed distance: its side and its top and foot)
      const dr = Math.hypot(x - ox, z - oz) - o.r, dy = Math.max(o.y0 - y, y - o.y1);
      d = Math.hypot(Math.max(dr, 0), Math.max(dy, 0)) + Math.min(Math.max(dr, dy), 0);
    } else d = Math.hypot(x - ox, y - o.y, z - oz) - o.r;
    if (d < m) m = d;
  }
  return m;
}
function dragged(seed, secs, real) {
  const L = solids(seed, real), AW = AWS[seed % AWS.length], F = MAKE(G, L, AW), { SIM, CS, INP } = F, r = lcg(seed * 2654435761);
  const CL = L.map((C) => ({ air: C.air, dL: C.dL, obst: C.obst.filter((o) => o.cloud) }));
  let drag = null, turnSteps = 0, turnPlans = 0, flips = 0, lastSv = 0, jerk = 0, lastAy = 0, near = 1e9, nearCl = 1e9;
  for (let k = 0; k < secs * 60; k++) {
    if (!drag && r() < 1 / 240) drag = { left: Math.round((0.3 + 1.7 * r()) * 60), vx: (r() - 0.5) * 1800 / 60, vy: (r() - 0.5) * 300 / 60 };
    if (drag) { const up = --drag.left <= 0; F.drag(drag.vx, drag.vy, false); if (up) { drag = null; F.drag(0, 0, true); } }
    if (!F.step()) continue;
    if (Math.abs(CS.yawRate) > 0.05) { turnSteps++; if (CS.pt === SIM.t) turnPlans++; }
    if (k > 60) {
      if (lastSv && CS.sv && Math.sign(CS.sv) !== Math.sign(lastSv)) flips++;
      jerk = Math.max(jerk, Math.abs(CS.ay - lastAy) * 60);
      near = Math.min(near, face(L, CS.x, CS.y, CS.z, SIM.t, AW));   // (every step)
      nearCl = Math.min(nearCl, face(CL, CS.x, CS.y, CS.z, SIM.t, AW));
    }
    lastSv = CS.sv; lastAy = CS.ay;
  }
  return { plans: turnPlans / (turnSteps / 60), flips: flips / secs, jerk, near, nearCl, fixG: SIM.fixG };
}
test('flight-sim: under random drags the slip plans at most 10 times a second while turning and does not chatter; the height stays smooth', () => {
  for (const seed of [1, 2, 3, 4]) {
    const r = dragged(seed, 240), f = (x) => x.toFixed(2);
    assert.ok(r.plans <= 10, `seed ${seed}: ${f(r.plans)} plans a second while the way turns (want 10 at most, a plan at most every 0.1 s; main: 46-48)`);
    assert.ok(r.flips < 0.5, `seed ${seed}: the slip's sign flipped ${f(r.flips)} times a second (want under 0.5; main: 2.1-8)`);
    assert.ok(r.jerk <= 2 + 1e-6, `seed ${seed}: the height's acceleration changed at ${f(r.jerk)} m/s3 (want 2 at most)`);
    assert.equal(r.fixG, 0, `seed ${seed}: the ground's rule pushed the camera up ${r.fixG} times`);
    assert.ok(r.near >= HARD_IN - 1e-6, `seed ${seed}: the camera came ${f(r.near)} m from a solid's face (want ${HARD_IN} m at least: HARD_IN)`);
  }
});
test('flight-sim: among cores where the world puts them, the drags keep the same bounds, and no core comes within BAND_M of the camera', () => {
  assert.ok(LIFTED, 'the world lifts every cloud body whole until its lowest lobe clears the band\'s top (231), at least the land + FLY_TOP + BAND_M (180\'s bandTopAt): the cores\' heights here assume both');
  for (const seed of [1, 2, 3, 4]) {
    const r = dragged(seed, 240, true), f = (x) => x.toFixed(2);
    assert.ok(r.plans <= 10 && r.flips < 0.5 && r.jerk <= 2 + 1e-6 && r.fixG === 0 && r.near >= HARD_IN - 1e-6, `seed ${seed}: plans ${f(r.plans)}/s, flips ${f(r.flips)}/s, jerk ${f(r.jerk)} m/s3, ground pushes ${r.fixG}, nearest face ${f(r.near)} m`);
    assert.ok(r.nearCl >= BAND_M, `seed ${seed}: a cloud's core came ${f(r.nearCl)} m from the camera (want ${BAND_M} m at least: BAND_M, the mist's reach; 142-189 m today)`);
  }
});
test('flight-sim: left alone among the same solids, no rule pushes the camera: the ground, the solids, the ceiling', () => {
  for (const seed of [1, 2, 3, 4]) for (let h = 0; h < 6; h++) {
    const F = MAKE(G, solids(seed), AWS[seed % AWS.length]), { SIM, CS } = F;
    F.step(); CS.psi = CS.yawV = h * Math.PI / 3; CS.fpsi = NaN;   // (after the landing: its heading)
    for (let k = 0; k < 120 * 60; k++) F.step();
    assert.deepEqual([SIM.fixG, SIM.fixO, SIM.fixC], [0, 0, 0], `seed ${seed}, heading ${h * 60} deg: pushes by the ground's, the solids' and the ceiling's rules`);
  }
});
test('flight-sim: the hard rules ease the camera out at the climb\'s own travel, never nearer a solid than HARD_IN; the ceiling\'s are counted', () => {
  // (a landmark 40 m across and a cloud's core 30 m, the camera set inside each one's margin; each push a step's travel)
  for (const [o, place] of [[{ c: true, x: 0, z: 100, r: 40, y0: -50, y1: 400 }, (F, gap) => { F.CS.x = 0; F.CS.z = 100 - 40 - gap; F.CS.y = 30; }],
    [{ c: false, cloud: true, x: 0, y: 30, z: 100, r: 30 }, (F, gap) => { F.CS.x = 0; F.CS.z = 100 - 30 - gap; F.CS.y = 30; }]]) {
    const L = [{ st: 2, obst: [o], bound: [0, 0, 100, 120], softB: null }];
    for (const gap of [0.2, 0.9, 1.5, 2.5, 3.4]) {
      const F = MAKE(G, L, [0, 0]); F.step(); place(F, gap);
      const before = face(L, F.CS.x, F.CS.y, F.CS.z); F.pushOut(); const after = face(L, F.CS.x, F.CS.y, F.CS.z);
      const want = Math.max(Math.min(o.c ? 3.5 : 7, before + F.ds), HARD_IN);
      assert.ok(Math.abs(after - want) < 1e-9, `${o.c ? 'a landmark' : 'a cloud\'s core'}, ${gap} m from its face: pushed to ${after.toFixed(3)} m (want ${want.toFixed(3)}: a step's travel, at least ${HARD_IN} m off)`);
      assert.ok(F.SIM.fixO === 1, 'the push is counted');
    }
  }
  // (physics: clouds/drift) a cloud's core in an air cell is pushed out of where the wind has carried it, not where its
  // cell laid it out: laid out 700 m off (its cell's tL an hour back, the carry since then 700 m), carried to the camera
  for (const gap of [0.4, 1.5, 2.5]) {
    const AW = [6, -3], o = { c: false, cloud: true, x: 0, y: 30, z: 0, r: 30 }, Lc = [{ st: 2, air: true, V: {}, dL: [0, 0], obst: [o], bound: [0, 0, 0, 120], softB: null }];
    const F = MAKE(G, Lc, AW); F.step();
    const t = F.SIM.t;   // (the cell laid out with the core at x 700: its carry at t, w t - dL, takes it to (0, 30, 100))
    o.x = 700; Lc[0].bound[0] = 700; Lc[0].dL = [AW[0] * t + 700, AW[1] * t - 100];
    const off = F.cellOff(Lc[0], t);
    assert.ok(Math.abs(o.x + off[0]) < 1e-9 && Math.abs(o.z + off[1] - 100) < 1e-9, `the harness's core is not carried to (0, 100): ${o.x + off[0]}, ${o.z + off[1]}`);
    F.CS.x = 0; F.CS.z = 100 - 30 - gap; F.CS.y = 30;
    const n0 = F.SIM.fixO, before = face(Lc, F.CS.x, F.CS.y, F.CS.z, t, AW); F.pushOut(); const after = face(Lc, F.CS.x, F.CS.y, F.CS.z, t, AW);
    assert.ok(F.SIM.fixO === n0 + 1 && Math.abs(after - Math.max(Math.min(7, before + F.ds), HARD_IN)) < 1e-9, `a carried cloud's core ${gap} m from the camera: pushed to ${after.toFixed(3)} m, counted ${F.SIM.fixO - n0} (its obstacle not where the air carried it)`);
  }
  const F = MAKE(G, [], [0, 0]); F.step(); for (let k = 0; k < 30; k++) F.step();
  const c0 = F.ceil(); F.CS.y = c0 + 5; F.step();
  assert.ok(F.SIM.fixC === 1 && F.CS.y > F.ceil() + 4.5, `over the ceiling by 5 m: after a step ${(F.CS.y - F.ceil()).toFixed(2)} m over it, counted ${F.SIM.fixC} (want eased down, counted)`);
});

// ------------------------------------------------------------------ HARD_IN clears the near plane's corners
// (follow-up) the near plane's corners lie NEAR sqrt(1 + tanX^2 + tanY^2) from the eye; HARD_IN keeps the camera farther
// than that from a solid's face in any settled window's shape (frustumFor, cut from 386, with 370's NEAR and FOV_LONG)
test('flight-sim: HARD_IN is past the near plane\'s farthest corner, in any settled window', () => {
  const NEAR = +/NEAR = ([\d.]+), FAR/.exec(WORLD)[1], FOV = +/var FOV_LONG = ([\d.]+);/.exec(WORLD)[1];
  const frustumFor = vm.runInThisContext('(function (FOV_LONG) { var DEG = Math.PI / 180;\n' + cut(WORLD, '  function frustumFor(aspect, out) {', '\n  }\n', true) + '\n  return frustumFor; })')(FOV);
  let worst = 0, at = 0;
  for (let a = 0.3; a <= 4; a += 0.01) { const f = frustumFor(a, {}), c = NEAR * Math.sqrt(1 + f.tanX * f.tanX + f.tanY * f.tanY); if (c > worst) { worst = c; at = a; } }
  assert.ok(HARD_IN >= worst + 0.05, `HARD_IN ${HARD_IN} m: the near plane's corner reaches ${worst.toFixed(3)} m (aspect ${at.toFixed(2)}); want 0.05 m clear`);
});
