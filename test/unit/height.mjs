// test/unit/height.mjs: the camera's height over the world's real ground
// plant: {"file": "src/world/320-camera-drawn-between-last-two.js", "find": "CRUISE = [14, 32], CRUISE_IN = 2;", "with": "CRUISE = [14, 32], CRUISE_IN = 0;", "why": "the cloud sea's aim on the band's top: half its swells over it"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';
import { loadGround } from '../ground.mjs';

// ------------------------------------------------------------------ the owner's band: 14-32 m over 90% of the time
// (flight-height) heightTarget, the cruise and the height's spring and hard rule cut from the world as it ships, flown
// straight out of seed 11's landing on 12 headings, 1.25 km each, left alone (no tilt: the clearance at the cruise), over
// the ground the 4090 recorded (test/golden/ground/11: 15% land, the rest the cloud sea's top). The camera stays in its
// 14-32 m band at least 90% of the time and its p90 within 32 m, with no push of the hard rule, and nods no more than
// it did (a nod: the climb turning to a descent or back, at over 0.3 m/s). (Before: 66% in the band, p90 35.2 m; it
// aimed at the highest ground of the next 12 s at the full clearance, and at a crest 20 s ahead, and the cloud sea's
// cruise on the band's top.) The recording has no solids: their climbs are heightTarget's other half, as they were.
const G = loadGround(11);
const HT = cut(WORLD, '  var TAN_CLIMB = ', '  /* can the camera climb over a solid');
const CRUISE = cut(WORLD, '  var CW_S = [', '\n  function flightParams') + '\n' + cut(WORLD, '  function flightParams(V, cw) {', '\n  }\n', true);
const MAKE = (G) => vm.runInThisContext('(function (G) {\n  \'use strict\';\n  var DEG = Math.PI / 180, CLIMB_LEAD = 2.2, SLIP_T = 90, SLIP_REACH = 1200;\n' +
  '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function lerp(a, b, t) { return a + (b - a) * t; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
  '  function groundAt(V, x, z) { return G.groundAt(x, z); }\n  function kwAt(x, z) { return [0, 0, 0, G.seaW(x, z)]; }\n  function nearObstacles() { return []; }\n  function climbOK() { return true; }\n' +
  '  var CS = {};\n' + HT + '\n' + CRUISE +
  '\n  return function (psi, len) {\n    var V = { speed: 12, def: { clear: [7, 14, 45], cruise: [14, 32], margin: 12, marginB: 26, lookT: 20, lookTan: 0.15 } }, dt = 1 / 60;\n' +
  '    CS = { x: 0, z: 0, psi: psi, c: 14, cw: NaN, vy: 0, latT: 0, lat: 0, climbs: null, y: 0 };\n    cruiseStep(CS, 0); flightParams(V, CS.cw); CS.c = V.clear[1]; CS.y = groundAt(V, 0, 0) + CS.c;\n' +
  '    var out = [], push = 0, nods = 0, sign = 0;\n' +
  '    for (var s = 0; s < len; s += V.speed * dt) {\n      cruiseStep(CS, dt); var cl = flightParams(V, CS.cw);\n      CS.c += clamp(cl[1] - CS.c, -2.2 * dt, 2.2 * dt); CS.c = clamp(CS.c, cl[0], cl[2]);\n' +   // (left alone: the clearance eases to the cruise, as simStep's auto)
  '      var yT = heightTarget(V, 0), w = VY_W, acc = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);\n' +
  '      CS.vy = clamp(CS.vy + acc * dt, -VY_DN, VY_UP); CS.y += CS.vy * dt;\n      CS.x += Math.sin(psi) * V.speed * dt; CS.z += Math.cos(psi) * V.speed * dt;\n' +
  '      var gh = groundAt(V, CS.x, CS.z) + cl[0] * 0.6; if (CS.y < gh) { CS.y = Math.min(gh, CS.y + PUSH_V * dt); if (CS.vy < 0) CS.vy = 0; push++; }\n' +
  '      var ceil = groundAt(V, CS.x, CS.z) + cl[2] + CEIL_OVER; if (CS.y > ceil) { CS.y = ceil; if (CS.vy > 0) CS.vy = 0; }\n' +
  '      var sg = Math.abs(CS.vy) > 0.3 ? Math.sign(CS.vy) : sign; if (sign && sg !== sign) nods++; sign = sg;\n' +
  '      if (s > 120) out.push(CS.y - groundAt(V, CS.x, CS.z));\n    }\n    return { cl: out, push: push, nods: nods };\n  };\n})')(G);
const FLY = MAKE(G);
function flights() {
  const all = []; let push = 0, nods = 0;
  for (let h = 0; h < 12; h++) { const r = FLY(2 * Math.PI * h / 12, 1250); all.push(...r.cl); push += r.push; nods += r.nods; }
  const s = [...all].sort((a, b) => a - b);
  return { band: all.filter((c) => c >= 13.5 && c <= 32.5).length / all.length, p10: s[Math.floor(0.1 * (s.length - 1))], p90: s[Math.floor(0.9 * (s.length - 1))], push, nodsKm: nods / 15 };
}
test('height: over the recorded ground, in the owner\'s 14-32 m band 90% of the time, p90 within 32 m, no push, no more nods', () => {
  const r = flights(), f = (x) => x.toFixed(1);
  assert.ok(r.band >= 0.9, `in the band ${f(r.band * 100)}% of the time (want 90%)`);
  assert.ok(r.p90 <= 32.5, `p90 ${f(r.p90)} m (want 32 m at most)`);
  assert.ok(r.p10 >= 13.5, `p10 ${f(r.p10)} m (want the band's 14 m at least)`);
  assert.equal(r.push, 0, `the hard rule pushed the camera up ${r.push} times`);
  assert.ok(r.nodsKm <= 5.2, `${f(r.nodsKm)} nods a km (main: 5.2)`);
});

test('height: a steep rise on the way is climbed early, at the spring\'s own slope, with no push of the hard rule', () => {
  // (a ridge 40 m high rising over 100 m, 400 m out, on flat sand: the mean of the way's ground alone meets it late; the climb
  // under it, at twice the least clearance, as main's at the land's 14 m cruise)
  const ridge = (x, z) => { const d = z; return d < 400 ? 0 : d < 500 ? 40 * (d - 400) / 100 : d < 700 ? 40 : 0; };
  const R = MAKE({ groundAt: ridge, seaW: () => 0 })(0, 900);
  assert.equal(R.push, 0, `the hard rule pushed the camera up ${R.push} times at the ridge`);
  // (22 deg, past the 12 deg the spring can climb at 2.6 m/s: the clearance dips, never to the hard rule, and no lower than
  // main's own 5.2 m)
  assert.ok(Math.min(...R.cl) >= 5.5, `the clearance came down to ${Math.min(...R.cl).toFixed(1)} m on the ridge`);
});
