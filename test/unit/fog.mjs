// test/unit/fog.mjs: the fog pools (src/world/234-fog-pools.js), the reader of AIR's fog-pool sites (216-events.js).
// The pool takes the hollow the site drains (of the centres over the drained ring, over land, the one whose rim stands
// highest over its floor) and fills it to AIR's depth for the mist now, held under the rim (less FOG_SPILL), so it
// never spills and no edge shows at r; no mist, no pool; no hollow over land, no pool; the centres and rims are read
// once a site, from the probe, asynchronously; the shaders draw it with the mist pools' shading (fogTopAt beside
// mistTop) and the flight keeps over its top (270's hard rule, 280's height, the ceiling).
// plant: {"file": "src/world/234-fog-pools.js", "find": "Math.min(b[2] + evPoolDepth(s, L.mist), b[3] - FOG_SPILL)", "with": "b[2] + evPoolDepth(s, L.mist)", "why": "the fog pool over its basin's rim: it spills and shows an edge at r"}
// plant: {"file": "src/world/234-fog-pools.js", "find": "b[2] + evPoolDepth(s, L.mist)", "with": "b[2] + evPoolDepth(s, 10)", "why": "a fog pool deep whatever the mist (none with no mist, none moving with it)"}
// plant: {"file": "src/world/234-fog-pools.js", "find": " || kitAt(x, z).wC >= 0.5", "with": "", "why": "a fog pool over the cloud sea, where the land it fills is hidden"}
// plant: {"file": "src/world/280-ground-what-stands-ahead.js", "find": "return Math.max(yT, g0 + lc, fogTopAt(V, CS.x, CS.z) + 1 + MIST_OVER);", "with": "return Math.max(yT, g0 + lc);", "why": "the camera aimed down into a fog pool"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

const FOGSEC = cut(WORLD, '  /* ---------------------------------------------------------------- the fog pools (delight-weather: AIR\'s events) */', '  function fogU(');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');

// a fake page: one site, a probe that answers with a given land, the cloud sea's weight, AIR's depth (4x the mist, as
// evPoolDepth) and its drain ring (twice r)
function page(site, land, sea) {
  return vm.runInThisContext('(function (site, land, sea) {\n  var PI = Math.PI, CAM = { pos: site ? [site.x + 100, 50, site.z] : [0, 50, 0] }, jobs = [], EV_POOL = { catch: 2 };\n' +
    '  function eventsNear() { return site ? [site] : []; }\n  function kitAt(x, z) { return { wC: sea ? sea(x, z) : 0 }; }\n' +
    '  function evPoolDepth(s, mist) { return mist > 0 ? Math.min(145, mist * 4) : 0; }\n' +
    '  function probeJob(V, pts, n, mode) { var j = { pts: pts, n: n, mode: mode, done: false, h: null }; jobs.push(j); return j; }\n' +
    '  function land_(j) { var h = new Float32Array(j.n); for (var i = 0; i < j.n; i++) h[i] = land(j.pts[2 * i], j.pts[2 * i + 1]); j.h = h; j.done = true; }\n' +
    FOGSEC +
    '  return { step: function (V, mist) { V.L = V.L || {}; V.L.mist = mist; fogStep(V, V.L); return V.L.fogPool; }, land: function () { jobs.forEach(land_); }, jobs: jobs, top: fogTopAt, SPILL: FOG_SPILL };\n})')(site, land, sea);
}
const SITE = { kind: 'fogpool', id: '0:1:2', x: 9000, z: -4000, r: 700, d: 100 };
const HX = SITE.x + SITE.r, HZ = SITE.z;   // (the hollow: r east of the site, on the centres' grid)
const bowl = (deep) => (x, z) => { const d = Math.min(Math.hypot(x - HX, z - HZ) / SITE.r, 1.6); return 100 - deep + deep * d * d; };   // (floor 100-deep, 100 at r, a plateau past 1.6 r)

test('fog: the pool takes the hollow the site drains and fills it to AIR\'s depth; none until the probe lands', () => {
  const P = page(SITE, bowl(60)), V = {};
  assert.equal(P.step(V, 10), null, 'no pool before the ring is read');
  assert.equal(P.jobs.length, 1, 'one probe a site');
  assert.equal(P.jobs[0].mode, 1, 'the surface drawn (mode 1: the land, or the cloud sea\'s top over it), not the land under the sea');
  P.land();
  const f = P.step(V, 10);
  assert.ok(f && f[0] === HX && f[1] === HZ, `in the hollow r from the site (got ${f && [f[0], f[1]]})`);
  assert.ok(Math.abs(f[3] - (40 + 40)) < 1e-6, `the top at the floor + AIR's 40 m (got ${f[3]})`);
  assert.equal(f[2], SITE.r, 'its radius the site\'s');
  P.step(V, 10); assert.equal(P.jobs.length, 1, 'read once, not again');
  const g = P.step(V, 5);
  assert.ok(g && Math.abs(g[3] - (40 + 20)) < 1e-6, `the level moves with the mist: AIR's 20 m at 5 m of mist (got ${g && g[3]})`);
});

test('fog: under the rim (never spilled), none with no mist, only within the radius, none without a hollow over land', () => {
  const P = page(SITE, bowl(20)), V = {};   // (a shallow hollow: AIR's 40 m would spill over its rim at 100 m)
  P.step(V, 10); P.land();
  const f = P.step(V, 10);
  assert.ok(f && Math.abs(f[3] - (100 - P.SPILL)) < 1e-6, `held under the rim, less the spill margin (got ${f && f[3]}, rim 100)`);
  assert.equal(P.step(V, 0), null, 'no mist, no pool');
  P.step(V, 10);
  assert.equal(P.top(V, HX + 10, HZ), V.L.fogPool[3], 'its top within the radius');
  assert.equal(P.top(V, HX + SITE.r + 1, HZ), -Infinity, 'none past it');
  assert.equal(page(null, bowl(60)).step({}, 10), null, 'no site in reach, no pool');
  const flat = page(SITE, () => 100), Vf = {}; flat.step(Vf, 10); flat.land();
  assert.equal(flat.step(Vf, 10), null, 'no hollow, no pool');
  const sea = page(SITE, bowl(60), () => 1), Vs = {}; sea.step(Vs, 10); sea.land();
  assert.equal(sea.step(Vs, 10), null, 'none over the cloud sea, where the land it would fill is hidden');
});

test('fog: drawn by the mist pools\' shading over the land and the stones, and the flight keeps over it', () => {
  const W = GLSL('world/glsl/world-glsl.glsl');
  assert.match(W, /float fogTopAt\(vec2 p\) \{ vec2 d = p - uFogP\.xy; return dot\(d, d\) < uFogP\.z \* uFogP\.z \? uFogP\.w : -1e4; \}/, 'the top within the radius, none past it');
  assert.match(W, /return max\(mistTop\([^;]*\), fogTopAt\(p\)\);/, 'the stones\' and scatter\'s pool top takes it');
  assert.match(fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8'), /mistOver\(c, max\(mistTop\(vMB\), fogTopAt\(vW\.xz\)\) - vW\.y/, 'the land\'s too');
  assert.match(GLSL('world/glsl/frame-u.glsl'), /uniform vec4 uFogP;/, 'one uniform');
  assert.match(WORLD, /fogStep\(V, L\);/, 'stepped with the mist');
  assert.match(WORLD, /if \(u\.uFogP\) fogU\(u, L\);/, 'given to every program that reads it');
  assert.match(WORLD, /var yf = fogTopAt\(V, CS\.x \+ hx \* s, CS\.z \+ hz \* s\) \+ 1 \+ MIST_OVER - s \* TAN_CLIMB;/, 'a pool ahead climbed onto as a rise is');
  assert.match(WORLD, /return Math\.max\(yT, g0 \+ lc, fogTopAt\(V, CS\.x, CS\.z\) \+ 1 \+ MIST_OVER\);/, 'the height over the pool\'s top by its least');
  assert.match(WORLD, /fogTopAt\(V, CS\.x, CS\.z\) \+ 1\);/, 'the hard rule\'s floor 1 m over it');
  assert.match(WORLD, /var ceil = Math\.max\(groundAt\(V, CS\.x, CS\.z, false\) \+ cl\[2\], fogTopAt\(V, CS\.x, CS\.z\) \+ 1 \+ MIST_OVER\) \+ CEIL_OVER;/, 'the ceiling over the pool\'s least');
});

// a dive held across a basin's fog pool (40 m deep over a 60 m hollow, its top 20 m under the flats): heightTarget,
// its fog terms and the spring cut from the world as it ships; the hard rule's floor 1 m over the pool's top never acts,
// the camera eases over the top by the least, and the height's change of speed stays within the spring's limits
test('fog: a dive held across a 40 m fog pool never meets the hard rule; it eases over the top by the spring', () => {
  const HT = cut(WORLD, '  var TAN_CLIMB = ', '  /* can the camera climb over a solid');
  const SPRING = cut(WORLD, '    var yT = heightTarget(V, t), w = VY_W', '    CS.x += (Math.sin(CS.psi)');
  const SPRINGK = WORLD.includes('  var VY_J = ') ? cut(WORLD, '  var VY_J = ', '\n', true) : '';
  const fly = (fogAhead) => vm.runInThisContext('(function (fogAhead) {\n  \'use strict\';\n  var DEG = Math.PI / 180, CLIMB_LEAD = 2.2, SLIP_T = 90, SLIP_REACH = 1200;\n' +
    '  var SX = 0, SZ = 1500, R = 700, TOP = -20;\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
    '  function groundAt(V, x, z) { var d = Math.hypot(x - SX, z - SZ) / R; return d < 1 ? -60 + 60 * d * d : 0; }\n' +
    '  function inPool(x, z) { return Math.hypot(x - SX, z - SZ) < R; }\n' +
    '  var held = false; function fogTopAt(V, x, z) { return (fogAhead || held) && inPool(x, z) ? TOP : -Infinity; }\n' +
    '  function nearObstacles() { return []; }\n  function climbOK() { return true; }\n  var CS = {};\n' + HT + '\n' + SPRINGK +
    '\n  var out = { push: 0, acc: 0, low: 1e9 }, V = { speed: 12, clear: [7, 14, 45], L: { mist: 10 }, def: { margin: 12 } }, cl = V.clear, dt = 1 / 60;\n' +
    '  CS = { x: 0, z: 0, psi: 0, c: 14, vy: 0, ay: 0, latT: 0, lat: 0, climbs: null }; CS.y = groundAt(V, 0, 0) + CS.c;\n' +
    '  for (var s = 0; s < 3000; s += V.speed * dt) {\n    CS.c += V.speed * Math.sin(-0.35) * dt * 0.9; CS.c = clamp(CS.c, leastAt(V, cl), cl[2]);\n' +
    '    var t = 0, vy0 = CS.vy;\n' + SPRING +
    '    if (s > 60) out.acc = Math.max(out.acc, Math.abs(CS.vy - vy0) / dt);\n' +
    '    CS.z += V.speed * dt;\n' +
    '    held = true; var gh = Math.max(groundAt(V, CS.x, CS.z) + Math.max(cl[0] * 0.6, V.L.mist + 1), fogTopAt(V, CS.x, CS.z) + 1); held = false;\n' +
    '    if (CS.y < gh) { CS.y = Math.min(gh, CS.y + PUSH_V * dt); if (CS.vy < 0) CS.vy = 0; if (CS.ay < 0) CS.ay = 0; out.push++; }\n' +
    '    if (inPool(CS.x, CS.z)) out.low = Math.min(out.low, CS.y - TOP);\n  }\n  return out;\n})')(fogAhead);
  const r = fly(true);
  assert.equal(r.push, 0, `the hard rule acted ${r.push} times across the pool`);
  assert.ok(r.low >= 1.5, `the camera came within ${r.low.toFixed(2)} m of the pool's top (the hard rule's floor 1 m over it)`);
  assert.ok(r.acc <= 1.0 + 1e-6, `the height's change of speed ${r.acc.toFixed(2)} m/s2 (the spring's own limits)`);
  const blind = fly(false);
  assert.ok(blind.push > 0 || blind.low < 1.5, `with the height blind to the pool, the dive meets its floor (${blind.push} pushes, ${blind.low.toFixed(2)} m): the test can tell`);
});
