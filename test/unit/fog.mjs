// test/unit/fog.mjs: the fog pools (src/world/234-fog-pools.js), the reader of AIR's fog-pool sites (216-events.js).
// The pool fills the lowest land within the site's radius to AIR's depth for the mist now, held under the basin's rim
// (the lowest land on the circle at r, less FOG_SPILL), so it never spills and no edge shows at r; no mist, no pool;
// the floor and rim are read once a site, from the probe, asynchronously; the shaders draw it with the mist pools'
// shading (fogTopAt beside mistTop) and the flight keeps over its top (270's hard rule, 280's height, the ceiling).
// plant: {"file": "src/world/234-fog-pools.js", "find": "Math.min(FOG.lo + evPoolDepth(s, L.mist), FOG.rim - FOG_SPILL)", "with": "FOG.lo + evPoolDepth(s, L.mist)", "why": "the fog pool over its basin's rim: it spills and shows an edge at r"}
// plant: {"file": "src/world/234-fog-pools.js", "find": "FOG.lo + evPoolDepth(s, L.mist)", "with": "FOG.lo + evPoolDepth(s, 10)", "why": "a fog pool deep whatever the mist (none with no mist, none moving with it)"}
// plant: {"file": "src/world/280-ground-what-stands-ahead.js", "find": "return Math.max(yT, g0 + lc, fogTopAt(V, CS.x, CS.z) + 1 + MIST_OVER);", "with": "return Math.max(yT, g0 + lc);", "why": "the camera aimed down into a fog pool"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

const FOGSEC = cut(WORLD, '  /* ---------------------------------------------------------------- the fog pools (delight-weather: AIR\'s events) */', '  function fogU(');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');

// a fake page: one site, a probe that answers with a given land, AIR's depth (4x the mist, as evPoolDepth)
function page(site, land) {
  return vm.runInThisContext('(function (site, land) {\n  var PI = Math.PI, CAM = { pos: site ? [site.x + 100, 50, site.z] : [0, 50, 0] }, jobs = [];\n' +
    '  function eventsNear() { return site ? [site] : []; }\n' +
    '  function evPoolDepth(s, mist) { return mist > 0 ? Math.min(145, mist * 4) : 0; }\n' +
    '  function probeJob(V, pts, n, mode) { var j = { pts: pts, n: n, mode: mode, done: false, h: null }; jobs.push(j); return j; }\n' +
    '  function land_(j) { var h = new Float32Array(j.n); for (var i = 0; i < j.n; i++) h[i] = land(j.pts[2 * i], j.pts[2 * i + 1]); j.h = h; j.done = true; }\n' +
    FOGSEC +
    '  return { step: function (V, mist) { V.L = V.L || {}; V.L.mist = mist; fogStep(V, V.L); return V.L.fogPool; }, land: function () { jobs.forEach(land_); }, jobs: jobs, top: fogTopAt, SPILL: FOG_SPILL };\n})')(site, land);
}
const SITE = { kind: 'fogpool', id: '0:1:2', x: 9000, z: -4000, r: 700, d: 100 };
const bowl = (deep, rim) => (x, z) => { const d = Math.hypot(x - SITE.x, z - SITE.z) / SITE.r; return 100 - deep + (deep + rim) * d * d; };   // (floor 100-deep at the site, 100+rim at r)

test('fog: the pool fills the basin\'s lowest land to AIR\'s depth, held under the rim; none until the probe lands', () => {
  const P = page(SITE, bowl(60, 0)), V = {};
  assert.equal(P.step(V, 10), null, 'no pool before the basin is read');
  assert.equal(P.jobs.length, 1, 'one probe a site');
  assert.equal(P.jobs[0].mode, 0, 'the land\'s own height (mode 0), not the camera\'s ground');
  P.land();
  const f = P.step(V, 10);
  assert.ok(f && Math.abs(f[3] - (40 + 40)) < 0.6, `the top at the floor + AIR's 40 m (got ${f && f[3]})`);
  assert.deepEqual([f[0], f[1], f[2]], [SITE.x, SITE.z, SITE.r], 'at the site, its radius');
  P.step(V, 10); assert.equal(P.jobs.length, 1, 'read once, not again');
  const g = P.step(V, 5);
  assert.ok(g && Math.abs(g[3] - (40 + 20)) < 0.6, `the level moves with the mist: AIR's 20 m at 5 m of mist (got ${g && g[3]})`);
});

test('fog: under the rim (never spilled), none with no mist, and only within the radius', () => {
  const P = page(SITE, bowl(20, -5)), V = {};   // (a shallow bowl, its rim 5 m under the site's middle height: 95 m)
  P.step(V, 10); P.land();
  const f = P.step(V, 10);
  assert.ok(f && f[3] <= 95 - P.SPILL + 1e-6, `held under the rim, less the spill margin (got ${f && f[3]}, rim 95)`);
  assert.equal(P.step(V, 0), null, 'no mist, no pool');
  P.step(V, 10);
  assert.equal(P.top(V, SITE.x + 10, SITE.z), V.L.fogPool[3], 'its top within the radius');
  assert.equal(P.top(V, SITE.x + SITE.r + 1, SITE.z), -Infinity, 'none past it');
  assert.equal(page(null, bowl(60, 0)).step({}, 10), null, 'no site in reach, no pool');
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
