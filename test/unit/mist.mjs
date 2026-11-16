// test/unit/mist.mjs: the mist pools (delight-weather 1; src/world/229-mist-pools.js). The pools' depth is the weather's
// one model, AIR's (airWx(t).mist, 215-air.js: its table, the wind's thinning and the rate are held by test/unit/air.mjs):
// the pools read it at the flight's clock and keep no table or rate of their own. AIR's table is the hub's (first light 10,
// the nights 3-4, the afterglow 0). Their top is opaque within
// MIST_OPAQUE of depth whatever the depth (nothing thickens in place), drawn over the land and over the stones and the
// landmarks alike, its rim's ramp at least two pixels' worth of the surface's depth; none at all at depth 0. The
// camera's ground never reads the pools on any path (the same under every sky: the recorded ground, the flight's grid,
// the birds'); the flight keeps over them by its own floor, the land and the pools' depth and 1 m, which holds because
// the land never lies under the pools' floor (the hub's round-2 review of #302).
// plant: {"file": "src/world/229-mist-pools.js", "find": "airWx(SIM.t).mist", "with": "airWx(SIM.t + SKY.dt).mist", "why": "the sky's offset added twice: the pools a change out of step with the sky"}
// plant: {"file": "src/world/glsl/world-glsl.glsl", "find": "max(uMist.y, 2.0 * px)", "with": "uMist.y", "why": "the rim's ramp not widened by the pixel: the far shorelines crawl"}
// plant: {"file": "src/world/270-flight.js", "find": "Math.max(cl[0] * 0.6, ((V.L && V.L.mist) || 0) + 1)", "with": "cl[0] * 0.6", "why": "the camera down into the pools"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

const MIST = cut(WORLD, '  /* ---------------------------------------------------------------- the mist pools (delight-weather 1) */', '  function mistU(');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

function page(seq) {   // the pools' depth on a fake sky, AIR's weather stubbed: what the pools ask it, and what they hand on
  return vm.runInThisContext('(function (seq) {\n  var SKY = { seq: seq, i: 0, dt: 17 }, SIM = { t: 0 }, asked = [];\n' +
    '  function airWx(t) { asked.push(t); return { mist: 0.5 + t / 1000, oro: 0, ridge: 0, vis: 10, dust: 0 }; }\n' + MIST +
    '  function at(t) { SIM.t = t; var L = {}; mistStep(L); return L.mist; }\n' +
    '  return { at: at, asked: asked, MIST_OPAQUE: MIST_OPAQUE };\n})')(seq);
}

test('mist: the pools\' depth is AIR\'s airWx(t).mist at the flight\'s clock, no table or rate of their own', () => {
  const P = page([{ id: 'firstlight', at: 0, hold: 70, move: 57 }, { id: 'afterglow', at: 127, hold: 70, move: 57 }]);
  for (const t of [0, 37, 300]) assert.equal(P.at(t), 0.5 + t / 1000, 'the level at ' + t + ' s is AIR\'s');
  assert.deepEqual(P.asked, [0, 37, 300], 'asked at the flight\'s own t (AIR adds the sky\'s offset)');
  assert.equal(page([{ id: 'firstlight', at: 0, hold: 70, move: 57 }]).at(5), 0, 'none before the sky has an order');
  assert.doesNotMatch(strip(MIST), /MIST_D|MIST_RATE|firstlight/, 'no table or rate of the pools\' own: one model of the weather');
  const A = strip(fs.readFileSync(path.join(ROOT, 'src/world/215-air.js'), 'utf8'));
  const T = /var AIR_MIST = (\{[^}]*\});/.exec(A); assert.ok(T, 'AIR_MIST found');
  const M = vm.runInThisContext('(' + T[1] + ')');
  assert.equal(M.firstlight, 10); assert.equal(M.afterglow, 0);
  for (const n of ['moonlit', 'milkyway', 'aurora']) assert.ok(M[n] >= 3 && M[n] <= 4, `the night ${n}: 3-4 m`);
});

test('mist: the shaders: opaque within MIST_OPAQUE whatever the depth, the rim at least two pixels, over the land and the stones, the camera over the pools', () => {
  const W = strip(GLSL('world/glsl/world-glsl.glsl'));
  const over = /vec3 mistOver\([^)]*\) \{([\s\S]*?)\n\}/.exec(W); assert.ok(over, 'mistOver found');
  assert.match(over[1], /clamp\(\(d - 0\.5 \* uMist\.y\) \/ max\(uMist\.y, 2\.0 \* px\) \+ 0\.5, 0\.0, 1\.0\)/, 'the opacity a ramp of the depth alone, uMist.y wide or two pixels\' worth');
  assert.doesNotMatch(over[1], /uMist\.x \*/, 'never scaled by the depth: nothing thickens in place');
  assert.match(over[1], /float px = fp \* length\(n\.xz\) \/ max\(abs\(dot\(n, rd\)\), 0\.05\);/, 'the depth a pixel spans on the surface');
  assert.match(over[1], /cloudLight\(/, 'lit by the sky\'s own cloud light');
  assert.match(W, /float mistTop\(vec2 mb\) \{ return uMist\.x > 0\.0 \? mb\.x \+ uMist\.x \* mb\.y : -1e4; \}/, 'the top: the floor and the depth by the sand; none at depth 0');
  assert.match(W, /float HdCam\(vec2 p\) \{ return max\(Hd\(p\)\.x, HdSea\(p\)\.x\); \}/, 'the camera\'s ground never the pools\'');
  assert.match(W, /return max\(h\.x, \(lv \+ dMul\(A_Hd\(p\), amp\)\)\.x\);/, 'nor the probe\'s');
  assert.doesNotMatch(strip(GLSL('world/glsl/fs-probe-split.glsl')), /mistTop|uMist/, 'nor the split\'s probe\'s');
  const SCN = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
  assert.match(SCN, /c = mistOver\(c, mistTop\(vMB\) - vW\.y, n, rd, fp\);/, 'over the land');
  const LM = fs.readFileSync(path.join(ROOT, 'src/world/353-shaders-landmarks-probe.js'), 'utf8');
  assert.match(LM, /c = mistOver\(c, vMT - vW\.y, n, rd, fp\);/, 'over the stones and the landmarks');
  for (const f of ['vs-landmark', 'vs-lmsc', 'vs-landmark-inst', 'vs-scatter']) assert.match(GLSL('world/glsl/' + f + '.glsl'), /vMT = mistTopAt\(vW\.xz\);/, f + ' gives its vertices the pools\' top');
});

test('mist: the flight over the pools by its own floor, which holds: the land never under the pools\' floor', async () => {
  const F = fs.readFileSync(path.join(ROOT, 'src/world/270-flight.js'), 'utf8');
  assert.match(F, /var gh = groundAt\(V, CS\.x, CS\.z, true, true\) \+ Math\.max\(cl\[0\] \* 0\.6, \(\(V\.L && V\.L\.mist\) \|\| 0\) \+ 1\);/, 'the hard rule\'s floor: the land and the pools\' depth and 1 m');
  // (the floor holds only if the pools' top stands at most their depth over the land: the main dunes never under the
  // ground they stand on. The JS port of the shipped duneS1, walked in four winds)
  const { mainAt, overSwell } = await import(new URL('../../tools/physics/dune-census.mjs', import.meta.url).href);
  let low = 0, lowAll = 0;
  for (const wind of [0, 0.6, 1.7, 2.9]) for (let i = 0; i < 20000; i++) {
    const x = -3000 + i * 0.37, y = 1200 - i * 0.211;
    low = Math.min(low, mainAt(x, y, wind).h[0]); lowAll = Math.min(lowAll, overSwell(x, y, wind));
  }
  assert.ok(low > -0.05, 'the main dunes ' + (-low).toFixed(3) + ' m under their floor: the pools\' top over the land past their depth');
  assert.ok(lowAll > -0.05, 'the dunes with the near family ' + (-lowAll).toFixed(3) + ' m under their floor');
  // (the rest of the dunes kit's land, D_Hd: the basins scale and sink the land and the floor alike (gMS), so the land
  // stays over it by the dunes' height scaled; the plateaux only raise it (a smooth max); the ridges add a rise of rock,
  // never a cut (massif: steps in [0, 1] times a top over 0.7). The other kit is the cloud sea's, not land)
  const D = strip(fs.readFileSync(path.join(ROOT, 'src/glsl/dunes-glsl.glsl'), 'utf8'));
  const bo = /vec3 basinOf\([^)]*\) \{([\s\S]*?)\n\}/.exec(D)[1];
  assert.match(bo, /gMS = vec2\(gMS\.x \* \(1\.0 - fl \* w\.x\), gMS\.y \* \(1\.0 - fl \* w\.x\) - depth \* w\.x\);/, 'the floor scaled and sunk with the basin');
  assert.match(bo, /return dMul\(h, vec3\(1\.0, 0\.0, 0\.0\) - fl \* w\) - depth \* w;/, 'as the land is');
  assert.match(/vec3 plateauOf\([^)]*\) \{([\s\S]*?)\n\}/.exec(D)[1], /return dSmax\(h, pl, 5\.0\);/, 'the plateaux only raise the land');
  assert.match(D, /return h \+ ridges\(p\);/, 'the ridges added');
  const ma = /vec3 massif\([^)]*\) \{([\s\S]*?)\n\}/.exec(D)[1];
  assert.match(ma, /vec3 top = vec3\(1\.0 \+ b\.z \* l\.x, b\.z \* dlx\) \+ 0\.05 \* dNg\(g3, mat2\(2\.2 \/ m\.z\)\);/, 'the massif\'s top over 0.7 (|b.z| <= 0.15, |l.x| <= 1.3, the noise within 0.05)');
  assert.match(D, /vec4 b = vec4\(hf\(ih\(h \+ 5u\)\) \* PI, 0\.5 \+ 0\.3 \* hf\(ih\(h \+ 6u\)\), \(hf\(ih\(h \+ 7u\)\) - 0\.5\) \* 0\.3,/, 'b.z within 0.15');
});

// (the hub's round 3 on #302) the least clearance rises over the pools (leastAt, 280): a dive held over a calm first
// light's 10 m eases onto the pools' depth + 1 m + MIST_OVER by the height's own spring, so the hard rule's floor (the
// pools' depth + 1 m) never acts: it had stood over the dive's least (7 m), and a held dive met it as a hard stop, the
// descent zeroed in one step. heightTarget, its least and the spring cut from the world as it ships; the dive at the
// visitor's whole tilt, over dunes 10 m from trough to crest, 2 km on four headings
test('mist: a dive held over 10 m of pools never meets the hard rule; it eases onto the least by the spring', () => {
  const HT = cut(WORLD, '  var TAN_CLIMB = ', '  /* can the camera climb over a solid');
  const SPRING = cut(WORLD, '    var yT = heightTarget(V, t), w = VY_W', '    CS.x += (Math.sin(CS.psi)');
  const SPRINGK = WORLD.includes('  var VY_J = ') ? cut(WORLD, '  var VY_J = ', '\n', true) : '';
  assert.match(WORLD, /CS\.c = clamp\(CS\.c, leastAt\(V, cl\), cl\[2\]\);/, 'the flight\'s clearance kept over the least, the pools\' with it');
  const fly = (mist, least) => vm.runInThisContext('(function (mist, least) {\n  \'use strict\';\n  var DEG = Math.PI / 180, CLIMB_LEAD = 2.2, SLIP_T = 90, SLIP_REACH = 1200;\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
    '  function groundAt(V, x, z) { var u = 0.6 * x + 0.8 * z; return 5 * Math.sin(u / 37) + 3 * Math.sin(u / 91 + 1) + 2 * Math.sin(x / 53); }\n' +
    '  function nearObstacles() { return []; }\n  function climbOK() { return true; }\n  var CS = {};\n' + HT + '\n' + SPRINGK +
    '\n  var out = { push: 0, acc: 0, low: 1e9 };\n  for (var h = 0; h < 4; h++) {\n    var psi = h * Math.PI / 2 + 0.3, V = { speed: 12, clear: [7, 14, 45], L: { mist: mist }, def: { margin: 12 } }, cl = V.clear, dt = 1 / 60;\n' +
    '    CS = { x: 0, z: 0, psi: psi, c: 14, vy: 0, ay: 0, latT: 0, lat: 0, climbs: null };\n    CS.y = groundAt(V, 0, 0) + CS.c;\n' +
    '    for (var s = 0; s < 2000; s += V.speed * dt) {\n      CS.c += V.speed * Math.sin(-0.35) * dt * 0.9; CS.c = clamp(CS.c, least ? leastAt(V, cl) : cl[0], cl[2]);\n' +
    '      var t = 0, vy0 = CS.vy;\n' + SPRING +
    '      if (s > 60) out.acc = Math.max(out.acc, Math.abs(CS.vy - vy0) / dt);\n' +
    '      CS.x += Math.sin(psi) * V.speed * dt; CS.z += Math.cos(psi) * V.speed * dt;\n' +
    '      var gh = groundAt(V, CS.x, CS.z) + Math.max(cl[0] * 0.6, mist + 1); if (CS.y < gh) { CS.y = Math.min(gh, CS.y + PUSH_V * dt); if (CS.vy < 0) CS.vy = 0; if (CS.ay < 0) CS.ay = 0; out.push++; }\n' +
    '      out.low = Math.min(out.low, CS.y - groundAt(V, CS.x, CS.z) - mist);\n    }\n  }\n  return out;\n})')(mist, least);
  const r = fly(10, true);
  assert.equal(r.push, 0, `the hard rule acted ${r.push} times in a dive held over 10 m of pools`);
  assert.ok(r.low >= 1.5, `the camera came within ${r.low.toFixed(2)} m of the pools' top (the hard rule's floor 1 m over it)`);
  assert.ok(r.acc <= 1.0 + 1e-6, `the height's change of speed ${r.acc.toFixed(2)} m/s2 (the spring's own limits: 0.5 down, 1.0 up)`);
  const old = fly(10, false);
  assert.ok(old.push > 0, 'where the least stayed at 7 m, the hard rule acted (' + old.push + ' times): the test can tell');
  const dry = fly(0, true);
  assert.equal(dry.push, 0, 'and with no pools the dive as it was, no push');
});
