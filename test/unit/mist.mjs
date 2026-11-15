// test/unit/mist.mjs: the mist pools (delight-weather 1; src/world/227-mist-pools.js). The pools' depth is the weather's
// one model, AIR's (airWx(t).mist, 215-air.js: its table, the wind's thinning and the rate are held by test/unit/air.mjs):
// the pools read it at the flight's clock and keep no table or rate of their own. AIR's table is the hub's (first light 10,
// the nights 3-4, the afterglow 0). Their top is opaque within
// MIST_OPAQUE of depth whatever the depth (nothing thickens in place), drawn over the land and over the stones and the
// landmarks alike, its rim's ramp at least two pixels' worth of the surface's depth; none at all at depth 0. The
// camera's ground never reads the pools on any path (the same under every sky: the recorded ground, the flight's grid,
// the birds'); the flight keeps over them by its own floor, the land and the pools' depth and 1 m, which holds because
// the land never lies under the pools' floor (the hub's round-2 review of #302).
// plant: {"file": "src/world/227-mist-pools.js", "find": "airWx(SIM.t).mist", "with": "airWx(SIM.t + SKY.dt).mist", "why": "the sky's offset added twice: the pools a change out of step with the sky"}
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
  const { mainAt } = await import(new URL('../../tools/physics/dune-census.mjs', import.meta.url).href);
  let low = 0;
  for (const wind of [0, 0.6, 1.7, 2.9]) for (let i = 0; i < 20000; i++) low = Math.min(low, mainAt(-3000 + i * 0.37, 1200 - i * 0.211, wind).h[0]);
  assert.ok(low > -0.05, 'the main dunes ' + (-low).toFixed(3) + ' m under their floor: the pools\' top over the land past their depth');
});
