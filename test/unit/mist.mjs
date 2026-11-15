// test/unit/mist.mjs: the mist pools (delight-weather 1; src/world/227-mist-pools.js). The pools' depth is the sky's,
// a pure function of the sky's time (a still at any moment is the flight's own): the opening sky's depth from its first
// frame (no ramp in), each sky's own depth through its hold, and through a change a ramp never faster than MIST_RATE
// and never a step (the hub's ruling 1: the level moves, the rim a shoreline, never a fade). Their top is opaque within
// MIST_OPAQUE of depth whatever the depth (nothing thickens in place), drawn over the land and over the stones and the
// landmarks alike, its rim's ramp at least two pixels' worth of the surface's depth; the camera's ground reads it on
// both paths (the flight passes over the pools, never through them); none at all at depth 0.
// plant: {"file": "src/world/227-mist-pools.js", "find": "var b = mistD(n.id), T = Math.max(e.move, Math.abs(b - a) / MIST_RATE);", "with": "var b = mistD(n.id), T = e.move;", "why": "the level as fast as the sky's change: past MIST_RATE"}
// plant: {"file": "src/world/glsl/world-glsl.glsl", "find": "max(uMist.y, 2.0 * px)", "with": "uMist.y", "why": "the rim's ramp not widened by the pixel: the far shorelines crawl"}
// plant: {"file": "src/world/glsl/fs-probe-split.glsl", "find": "h = max(max(h, mistTop(", "with": "h = max(max(h, -1e4 + 0.0 * mistTop(", "why": "the split's camera ground under the pools"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

const MIST = cut(WORLD, '  /* ---------------------------------------------------------------- the mist pools (delight-weather 1) */', '  function mistU(');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

function page(seq) {   // the pools' depth on a fake sky: its order of skies, the flight's clock
  return vm.runInThisContext('(function (seq) {\n  var SKY = { seq: seq, i: 0, dt: 0 }, SIM = { t: 0 };\n' +
    '  function ss01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }\n' + MIST +
    '  function at(t) { var i = seq.length - 2; while (i > 0 && seq[i].at > t) i--; SKY.i = i; SIM.t = t; var L = {}; mistStep(L); return L.mist; }\n' +
    '  return { at: at, MIST_D: MIST_D, MIST_RATE: MIST_RATE, MIST_OPAQUE: MIST_OPAQUE };\n})')(seq);
}
function order(ids, hold = 70, move = 57) {   // a sky order as skyNext lays it: each entry's start, hold and change
  const seq = []; let at = 0;
  for (const id of ids) { seq.push({ id, at, hold, move }); at += hold + move; }
  return seq;
}

test('mist: each sky\'s depth from the hub\'s table; the opening sky\'s from the first frame, no ramp in', () => {
  const ids = ['firstlight', 'afterglow', 'moonlit', 'bluehour', 'firstlight', 'milkyway', 'aurora', 'afterglow'];
  const P = page(order(ids));
  assert.equal(P.MIST_D.firstlight, 10); assert.equal(P.MIST_D.afterglow, 0);
  assert.ok(P.MIST_D.moonlit >= 3 && P.MIST_D.moonlit <= 4 && P.MIST_D.milkyway === P.MIST_D.moonlit && P.MIST_D.aurora === P.MIST_D.moonlit, 'the night\'s 3-4 m');
  assert.equal(P.at(0), 10, 'the opening first light at its whole depth at once');
  assert.equal(page(order(['afterglow', 'firstlight'])).at(0), 0, 'and an afterglow opening at none');
});

test('mist: through every change the level moves at most MIST_RATE, never a step; a still at any moment the flight\'s own', () => {
  const ids = ['firstlight', 'afterglow', 'firstlight', 'moonlit', 'firstlight', 'afterglow', 'bluehour', 'aurora', 'firstlight', 'afterglow', 'firstlight'];
  for (const [hold, move] of [[70, 57], [63, 55], [190, 60]]) {
    const P = page(order(ids, hold, move)), dt = 0.25, end = ids.length * (hold + move) - (hold + move);
    let prev = P.at(0), most = 0;
    for (let t = dt; t < end; t += dt) { const d = P.at(t); most = Math.max(most, Math.abs(d - prev) / dt); prev = d; }
    assert.ok(most <= P.MIST_RATE * 1.01, `hold ${hold} s, change ${move} s: the level at ${most.toFixed(3)} m/s (at most ${P.MIST_RATE})`);
    // (pure: the same moment asked twice, in any order, the same depth)
    for (const t of [300, 1000, 37, 1000, 300]) assert.equal(P.at(t), page(order(ids, hold, move)).at(t), 'a still at ' + t + ' s');
  }
  // (every sky reaches its own depth by the end of the next sky's hold)
  const P = page(order(['firstlight', 'afterglow', 'firstlight']));
  assert.equal(P.at(127 + 70 - 1), 0, 'first light to the afterglow: dry before the afterglow\'s hold ends');
});

test('mist: the shaders: opaque within MIST_OPAQUE whatever the depth, the rim at least two pixels, over the land and the stones, the camera over the pools', () => {
  const W = strip(GLSL('world/glsl/world-glsl.glsl'));
  const over = /vec3 mistOver\([^)]*\) \{([\s\S]*?)\n\}/.exec(W); assert.ok(over, 'mistOver found');
  assert.match(over[1], /clamp\(\(d - 0\.5 \* uMist\.y\) \/ max\(uMist\.y, 2\.0 \* px\) \+ 0\.5, 0\.0, 1\.0\)/, 'the opacity a ramp of the depth alone, uMist.y wide or two pixels\' worth');
  assert.doesNotMatch(over[1], /uMist\.x \*/, 'never scaled by the depth: nothing thickens in place');
  assert.match(over[1], /float px = fp \* length\(n\.xz\) \/ max\(abs\(dot\(n, rd\)\), 0\.05\);/, 'the depth a pixel spans on the surface');
  assert.match(over[1], /cloudLight\(/, 'lit by the sky\'s own cloud light');
  assert.match(W, /float mistTop\(vec2 mb\) \{ return uMist\.x > 0\.0 \? mb\.x \+ uMist\.x \* mb\.y : -1e4; \}/, 'the top: the floor and the depth by the sand; none at depth 0');
  assert.match(W, /float HdCam\(vec2 p\) \{ float h = Hd\(p\)\.x; return max\(max\(h, mistTop\(gMB\)\), HdSea\(p\)\.x\); \}/, 'the camera\'s ground over the pools');
  assert.match(W, /return max\(max\(h\.x, mistTop\(gMB\)\), \(lv \+ dMul\(A_Hd\(p\), amp\)\)\.x\);/, 'and the probe\'s');
  assert.match(strip(GLSL('world/glsl/fs-probe-split.glsl')), /h = max\(max\(h, mistTop\(vec2\(swell\(p\) \* p7\.x \+ p7\.y - k1\.x, k0\.x\)\)\), /, 'and the split\'s probe');
  const SCN = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
  assert.match(SCN, /c = mistOver\(c, mistTop\(vMB\) - vW\.y, n, rd, fp\);/, 'over the land');
  const LM = fs.readFileSync(path.join(ROOT, 'src/world/353-shaders-landmarks-probe.js'), 'utf8');
  assert.match(LM, /c = mistOver\(c, vMT - vW\.y, n, rd, fp\);/, 'over the stones and the landmarks');
  for (const f of ['vs-landmark', 'vs-lmsc', 'vs-landmark-inst', 'vs-scatter']) assert.match(GLSL('world/glsl/' + f + '.glsl'), /vMT = mistTopAt\(vW\.xz\);/, f + ' gives its vertices the pools\' top');
});

test('mist: why: a ramp as fast as a sky\'s change would move the level twice as fast', () => {
  // (the arithmetic the rate cap prevents) first light to the afterglow, 10 m over a 57 s change
  assert.ok(10 / 57 > 2 * 0.085, 'the change\'s own ramp at ' + (10 / 57).toFixed(3) + ' m/s');
});
