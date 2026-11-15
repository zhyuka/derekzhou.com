// test/unit/air.mjs: the air (src/world/215-air.js), the world's one state: every reader of the wind points the way the
// visit's wind blows and has the speed of airSpeed at its own declared height, or is listed in AIR_APART with the change
// that joins it (and is then still apart: a reader joined is taken off the list); the key light is one for every sky,
// and the clouds' bake, the land and the birds read it; each sky's own sun stands where AIR_SUN_EL puts it, on the key's
// azimuth. A fake page: the streams, the vector maths and the air from the dev build, realm-dunes.js run on a stub kit
// (RULES.json one-world-state; tools/checks/42-one-air.sh keeps the literals out of the other sections).
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "gl.uniform3fv(u.uSun, airLightDir(L));", "with": "gl.uniform3fv(u.uSun, L.sunDir);", "why": "the night lit by the key, 36 deg off the moon"}
// plant: {"file": "src/world/215-air.js", "find": "o.az = m.az; o.el = m.el; o.up = m.w > 0;", "with": "o.az = m.el; o.el = m.az; o.up = m.w > 0;", "why": "the moon's az and el swapped"}
// plant: {"file": "src/world/215-air.js", "find": "o.az = m.az; o.el = m.el; o.up = m.w > 0;", "with": "o.az = m.az; o.el = m.el; o.up = m.w >= 0;", "why": "a moon of no weight counted up"}
// plant: {"file": "src/world/215-air.js", "find": "var m = moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, AIR_MOONS);", "with": "var m = moonShown(SIM.t, AIR_MOONS);", "why": "the moon's direction a step behind the drawn disc"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "AIR_DRIFT(uT)", "with": "vec3(uT * 0.004, 0.0, uT * 0.003)", "why": "the cloud billows' drift a literal of their own again"}
// plant: {"file": "src/realm-dunes.js", "find": "wind: A.vec3(V, A.H.motes, 0.1)", "with": "wind: [V.wind[0] * 2, 0.1, V.wind[1] * 2]", "why": "the motes faster than the air at their height"}
// plant: {"file": "src/world/490-birds-host.js", "find": "o[0] = a.x; o[1] = 0; o[2] = a.z;", "with": "o[0] = a.z; o[1] = 0; o[2] = a.x;", "why": "the birds' air across the sand's"}
// plant: {"file": "src/world/215-air.js", "find": "AIR_Z0 = 0.003,", "with": "AIR_Z0 = 0.03,", "why": "the sand ten times rougher (the profile's shares off)"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec3 prev = grain(id, uT - uMBdt, e2);", "with": "vec3 prev = head;", "why": "the motes' streak the camera's motion only (a windy mote a dot that jumps)"}
// plant: {"file": "src/world/210-cloud-volumes-baking.js", "find": "var sd = keyAt(V), cy", "with": "var sd = dirAzEl(V.light.sunAz, 9), cy", "why": "the clouds baked along a sun of their own"}
import { test, assert, fs, path, vm, ROOT, TMP, WORLD, cut, STREAMS, VEC } from '../unit-lib.mjs';

const AIR = cut(WORLD, '  /* ---------------------------------------------------------------- the air: the world\'s one state', '  /* ---------------------------------------------------------------- the time of day */');
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const LDEF = cut(WORLD, '  var LDEF = {', '  var LKC = ');
const HOSTWIND = cut(WORLD, '    wind: function (o, y) {', '\n', true);
const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', f), 'utf8');
const SEEDS = Array.from({ length: 16 }, (_, i) => (i * 2654435761 + 12345) >>> 0);

function page() {   // the air on a fake page (no clock, no DOM), and the dunes' kit registered on it
  const G = vm.runInThisContext('(function (W) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, SIM_DT = 1 / 60, SIM = { V: null, t: 0, alpha: 1 }, CS = { x: 0, z: 0 }, J = { seed: 0 };\n' +
    '  var MSTUB = null; function moonShown(t, o) { o.t = t; if (MSTUB) { o.d = MSTUB.d.slice(); o.w = MSTUB.w; o.az = MSTUB.az; o.el = MSTUB.el; } return o; }\n' + STREAMS + VEC + AIR + SKYDEF + LDEF +
    '  var HOST = {\n' + HOSTWIND + '  };\n' +
    '  return { SIM: SIM, J: J, RNG: RNG, subseed: subseed, AIRAPI: AIRAPI, AIR_DIR: AIR_DIR, AIR_H: AIR_H, AIR_DRIFT: AIR_DRIFT, AIR_CIRRUS: AIR_CIRRUS, AIR_APART: AIR_APART, AIR_SUN_EL: AIR_SUN_EL,\n' +
    '    AIR_KEY_EL: AIR_KEY_EL, AIR_KEY_AZ: AIR_KEY_AZ, SKY_RATE: SKY_RATE, AIR_GRAIN_K: AIR_GRAIN_K, airProfile: airProfile, airU10: airU10, airSpeed: airSpeed, windAt: windAt, airKeySet: airKeySet, keyAt: keyAt, airSunEl: airSunEl, airSkySun: airSkySun, skyFrame: skyFrame, airHeading0: airHeading0,\n' +
    '    SKY: SKY, airMoonDir: airMoonDir, AIR_MOON: AIR_MOON, AIR_MOONS: AIR_MOONS, stub: function (m) { MSTUB = m; }, airLightDir: airLightDir, airNightShare: airNightShare,\n' +
    '    WSKY: WSKY, LDEF: LDEF, HOST: HOST };\n})')();
  let def = null;
  const kit = { lch: (l, c, h, k) => [l, c, h, k === undefined ? 1 : k], cellHash: () => 0, hk: () => 0, hfl: () => 0.5, RNG: G.RNG, range: () => {}, rock: () => {} };
  const window = { WORLD: { kit, forms: {}, air: G.AIRAPI, realm: (d) => { def = d; } } };
  vm.runInThisContext('(function (window) {\n' + DUNES + '\n})')(window);
  G.dunes = def;
  return G;
}
function visit(G, seed) {   // planVisit's order: the field (its stream 1), the light (2), the key; then the particles and the veils
  const V = { seed };
  V.field = G.dunes.field(G.RNG(G.subseed(seed, 1)), V);
  V.light = G.dunes.light(G.RNG(G.subseed(seed, 2)), V);
  G.airKeySet(V.light);
  V.parts = G.dunes.particles(V); V.ribbons = G.dunes.ribbons(V);
  G.SIM.V = V; G.J.seed = seed;
  return V;
}
const unit = (x, z) => { const n = Math.hypot(x, z); return [x / n, z / n]; };
const near = (a, b, eps = 1e-6) => Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;

test('air: every wind reader blows the visit\'s way, at the profile\'s speed at its height (16 seeds x 6 skies)', () => {
  const G = page(), skies = Object.keys(G.WSKY);
  assert.equal(skies.length, 6, 'six skies');
  const apart = {};   // a reader listed apart: still apart on some seed (or it is joined, and must come off the list)
  for (const seed of SEEDS) {
    const V = visit(G, seed), d = [G.AIR_DIR[0], G.AIR_DIR[1]];
    assert.ok(Math.abs(Math.hypot(d[0], d[1]) - 1) < 1e-12, 'the wind is a unit direction');
    assert.ok(near(d, V.wind, 0), 'V.wind is the air\'s own');
    for (const sky of skies) {
      const readers = {   // name: [its velocity (x, z), its declared height, or null for a direction alone]
        dunes: [V.field.params[9].slice(0, 2), null],
        grains: [[V.parts[0].wind[0], V.parts[0].wind[2]], G.AIR_H.grains],
        motes: [[V.parts[1].wind[0], V.parts[1].wind[2]], G.AIR_H.motes],
        veils: [[V.ribbons.wind[0], V.ribbons.wind[2]], G.AIR_H.veils],
        birds: [(() => { const o = G.HOST.wind([9, 9, 9]); assert.equal(o[1], 0); return [o[0], o[2]]; })(), G.AIR_H.birds],
        water: [G.LDEF.windDir, null],
        drift: [[-G.AIR_DRIFT[0], -G.AIR_DRIFT[1]], null],   // (the billows move against their noise's offset)
        cirrus: [G.AIR_CIRRUS, 'axis'],
      };
      for (const [name, [v, h]] of Object.entries(readers)) {
        const u = unit(v[0], v[1]), ok = h === 'axis' ? Math.abs(u[0] * d[1] - u[1] * d[0]) < 1e-6 : near(u, d);
        if (name in G.AIR_APART) { if (!ok) apart[name] = true; continue; }
        assert.ok(ok, `seed ${seed}, ${sky}: ${name} blows toward ${u.map((x) => x.toFixed(4))}, the air toward ${d.map((x) => x.toFixed(4))}`);
        if (typeof h === 'number') {
          const s = G.airSpeed(h), w = G.windAt(0, 0, h, 0, V);
          const k = name === 'grains' ? G.AIR_GRAIN_K : 1;
          assert.ok(Math.abs(Math.hypot(v[0], v[1]) - s * k) < 1e-9, `${name}: ${Math.hypot(v[0], v[1])} m/s, the profile ${s} (x ${k}) at ${h} m`);
          assert.ok(near([w.x, w.z], [d[0] * s, d[1] * s], 1e-12), 'windAt is the direction times the profile');
        }
      }
    }
  }
  for (const name of ['drift', 'cirrus']) assert.ok(apart[name], `${name} is joined to the air: take it off AIR_APART (215-air.js)`);
});

test('air: the billows\' drift and the high streaks\' axis are the air\'s (the shaders hold no literal of their own)', () => {
  const vb = GLSL('fs-vbody.glsl'), sb = GLSL('sky-body.glsl');
  assert.equal(vb.split('AIR_DRIFT(uT)').length - 1, 1, 'fs-vbody offsets its billows by AIR_DRIFT(uT), once');
  assert.ok(!/uT\s*\*\s*[0-9.]+/.test(vb), 'fs-vbody: no clock times a literal (a drift of its own)');
  assert.match(WORLD, /var FS_VBODY = HEAD \+ airGlsl\(\) \+/, 'the billows\' program is given the air\'s define');
  const G = page(), def = vm.runInThisContext('(function () { var AIR_DRIFT = ' + JSON.stringify(G.AIR_DRIFT) + ';\n' + cut(WORLD, '  function airGlsl()', '\n', true) + cut(WORLD, '  function airF(', '\n', true) + 'return airGlsl(); })')();
  assert.equal(def, '#define AIR_DRIFT(t) vec3(t * 0.004, 0.0, t * 0.003)\n', 'the define expands to today\'s offset, token for token');
  assert.match(sb, /vec2 qs = P \* vec2\(1\.0 \/ 153600\.0, 1\.0 \/ 38400\.0\);/, 'the streaks are long along world x (AIR_CIRRUS [1, 0])');
  assert.deepEqual(G.AIR_CIRRUS, [1, 0]);
});

test('air: one key for every sky; the clouds\' bake, the land and the birds read it; each sky\'s sun on its azimuth', () => {
  const G = page();
  for (const seed of SEEDS) {
    const V = visit(G, seed), k = G.keyAt(V);
    const up = Math.atan2(-V.wind[0], -V.wind[1]) * 180 / Math.PI, daz = ((V.light.sunAz - up + 540) % 360) - 180;
    assert.ok(V.light.sunEl >= G.AIR_KEY_EL[0] && V.light.sunEl <= G.AIR_KEY_EL[1] && Math.abs(daz) <= G.AIR_KEY_AZ, `seed ${seed}: the key ${V.light.sunEl.toFixed(1)} deg up, ${daz.toFixed(1)} from upwind`);
    for (const sky of Object.keys(G.WSKY)) {
      assert.equal(G.keyAt(V, sky), k, `${sky}: the key is the visit's one`);
      const el = G.airSunEl(sky), s = G.airSkySun(V, el);
      if (el === null) assert.deepEqual(s, Array.from(k), `${sky}: a night's sun is the key's place`);
      else {
        assert.ok(Math.abs(Math.asin(s[1]) * 180 / Math.PI - G.AIR_SUN_EL[sky]) < 1e-9 && s[1] < 0, `${sky}: its sun ${G.AIR_SUN_EL[sky]} deg, under the sea`);
        assert.ok(Math.abs(s[0] * k[2] - s[2] * k[0]) < 1e-9 && s[0] * k[0] + s[2] * k[2] > 0, `${sky}: its sun on the key's azimuth`);
      }
    }
  }
  // the readers of the key (world.js as built): the clouds' bake, the kits' lights (the land's uSun, and HOST.light's for
  // the birds), the sky's sets, the sun's change and the cells all take keyAt(V); nothing else reads or makes a sun
  for (const [what, re] of [['the clouds\' bake', /var sd = keyAt\(V\), cy/], ['the cloud sea\'s light', /LB\.sunDir = keyAt\(V\);/], ['the live light (uSun, the birds\' HOST.light)', /live\.sunDir = keyAt\(V\); V\.L = live;/],
    ['the sky\'s sets', /O\.rawD = skyRaw\(S, V\.lightRaw, keyAt\(V\)\); O\.rawA = skyRaw\(S, V\.lightRawB, keyAt\(V\)\);/], ['the sun\'s change', /var kd = keyAt\(V\);/], ['the cells', /sun: keyAt\(V\),/]])
    assert.match(WORLD, re, what + ' reads the key');
  const outside = WORLD.replace(AIR, '');
  assert.ok(!/V\.light\.sunDir/.test(outside), 'no section but the air reads V.light.sunDir');
  assert.ok(!/dirAzEl\(V\.light\.sunAz/.test(outside), 'no section but the air makes a sun');
  assert.ok(!/skyEl:/.test(SKYDEF), 'the sky table holds no sun of its own (AIR_SUN_EL)');
});

test('air: the landing\'s heading is drawn once, by the air; one cruise band', () => {
  const outside = WORLD.replace(AIR, '');
  assert.ok(!/subseed\(J\.seed, 77\)/.test(outside), 'no section but the air draws the landing\'s heading');
  assert.equal(WORLD.split('airHeading0()').length - 1, 5, 'its four readers (the first plan, the galaxy\'s lie, the flight, the boot) and its one definition');
  assert.match(WORLD, /cruise: AIR_CRUISE,/); assert.match(WORLD, /V\.def\.cruise \|\| AIR_CRUISE,/);
  assert.ok(!/\[14, 32\]/.test(outside), 'no second cruise band');
  const G = page(); G.J.seed = 11; const a = G.airHeading0(); assert.equal(a, G.airHeading0()); assert.ok(a >= 0 && a < 2 * Math.PI);
});

test('air: the clock (the sky\'s light at one rate, SKY_RATE)', { todo: 'the SKY lane: the sun about 70-90x, the moon 70-120x, the stars and the galaxy 0x today' }, () => {
  const G = page(), rates = {}, move = 57.5;   // (a change's move: 55-60 s; the real sun 15 deg an hour)
  for (const [sky, el] of Object.entries(G.AIR_SUN_EL)) rates['sun:' + sky] = (el - -24) / move / (15 / 3600);
  const f = G.skyFrame(0); rates.stars = f.every((x, i) => x === [1, 0, 0, 0, 1, 0, 0, 0, 1][i]) ? 0 : NaN;
  for (const [k, r] of Object.entries(rates)) assert.ok(Math.abs(r / G.SKY_RATE - 1) <= 0.1, `${k}: ${r.toFixed(1)}x, SKY_RATE ${G.SKY_RATE}x`);
});

test('air: the wind profile (the log law over sand under 100 m, veering aloft to the deck)', () => {
  const G = page(), share = (y) => G.airProfile(y).s, veer = (y) => G.airProfile(y).veer;
  for (const [y, lo, hi] of [[0.1, 0.39, 0.5], [0.87, 0.68, 0.72], [2.5, 0.82, 0.88], [10, 1, 1], [26, 1.09, 1.13], [60, 1.18, 1.24]])
    assert.ok(share(y) >= lo - 1e-12 && share(y) <= hi + 1e-12, `${y} m: ${share(y).toFixed(3)} of U10, not ${lo}-${hi}`);
  assert.equal(G.airSpeed(10), 0, 'still air before a visit\'s wind');
  let sum = 0, lo = 99, hi = 0; const N = 20000, bins = new Array(9).fill(0);   // the visits' U10: the Rayleigh of mean 5 mapped into 3.0-7.5 (the hub's ruling), nothing piled at the ends
  for (let i = 0; i < N; i++) { const u = G.airU10((i * 2654435761 + 7) >>> 0); sum += u; lo = Math.min(lo, u); hi = Math.max(hi, u); bins[Math.min(8, Math.floor((u - 3) / 0.5))]++; }
  assert.ok(lo >= 3 && hi <= 7.5, `U10 within 3.0-7.5 m/s (${lo.toFixed(3)}-${hi.toFixed(3)})`);
  assert.ok(lo < 3.05 && hi > 7.45, 'the whole range is reached');
  const pile = Math.max(bins[0], bins[8]) / N; assert.ok(pile < 0.16, `no pile at the ends (the end bins hold ${(100 * pile).toFixed(1)}%)`);
  for (let k = 1; k < 9; k++) assert.ok(Math.abs(bins[k] - bins[k - 1]) / N < 0.05, `a smooth spread (bins ${bins.join(', ')})`);
  assert.ok(sum / N > 4.6 && sum / N < 5.3, `the visits' mean U10 ${(sum / N).toFixed(2)} m/s`);
  assert.ok(G.airProfile(40).s * 7.5 < 8.8, `the windiest visit's 40 m wind ${(G.airProfile(40).s * 7.5).toFixed(2)} m/s, under every bird kind's airspeed (9-17)`);
  const V0 = visit(G, SEEDS[3]); assert.equal(V0.u10, G.airU10(SEEDS[3]), 'the visit\'s U10 is its own stream\'s, drawn once');
  assert.ok(Math.abs(G.airSpeed(10, V0) - V0.u10) < 1e-12, 'airSpeed at 10 m is the visit\'s U10');
  for (const y of [400, 1000, 1500]) { assert.ok(Math.abs(share(y) - 1.3) < 1e-12 && Math.abs(veer(y) - 20) < 1e-12, `${y} m: the low cloud layer, 1.3 U10 veered 20 deg`); }
  for (const y of [3000, 6000]) { assert.ok(Math.abs(share(y) - 2) < 1e-12 && Math.abs(veer(y) - 40) < 1e-12, `${y} m: the deck, 2 U10 veered 40 deg`); }
  let ps = 0, pv = 0;   // never slower or backing with height, and no step (0.05 m apart: within 1% of U10, 0.05 deg)
  for (let y = 0.05; y < 4000; y += 0.05) {
    const s = share(y), v = veer(y);
    assert.ok(s >= ps - 1e-12 && v >= pv - 1e-12, `${y.toFixed(2)} m: the wind slower or backing with height`);
    assert.ok(s - ps < 0.01 || y < 1, `${y.toFixed(2)} m: a step in the speed (${(s - ps).toFixed(4)})`); assert.ok(v - pv < 0.05, `${y.toFixed(2)} m: a step in the turn`);
    ps = s; pv = v;
  }
  assert.ok(share(0) === 0 && share(-3) === 0, 'no wind under the ground\'s own roughness');
  const V = visit(G, SEEDS[0]), d = V.wind, a = G.windAt(0, 0, 2000, 0, V), t = Math.atan2(d[0] * a.z - d[1] * a.x, d[0] * a.x + d[1] * a.z) * 180 / Math.PI;
  assert.ok(Math.abs(-t - veer(2000)) < 1e-9, `2000 m: the wind veered clockwise ${veer(2000).toFixed(2)} deg (${(-t).toFixed(2)})`);
  const mo = V.parts[1].wind, gr = V.parts[0].wind;
  assert.ok(Math.hypot(mo[0], mo[2]) > Math.hypot(gr[0], gr[2]), 'the motes faster than the grains under them');
  const o = [0, 0, 0]; G.HOST.wind(o, 300); assert.ok(Math.abs(Math.hypot(o[0], o[2]) - G.airSpeed(300)) < 1e-9, 'HOST.wind at a bird\'s own height');
});

test('air: a mote is drawn along its whole motion on the window (its own wind and the camera\'s), never a jumping dot', () => {
  const vp = GLSL('vs-particle.glsl');
  assert.ok(/vec3 prev = grain\(id, uT - uMBdt, e2\);/.test(vp), 'the streak starts where the mote was a frame ago (its own wind)');
  assert.ok(/uPVP2 \* vec4\(prev - uPCam2, 1\.0\)/.test(vp), 'seen from where the camera was');
  assert.match(WORLD, /if \(P\.u\.uMBdt\) gl\.uniform1f\(P\.u\.uMBdt, MBS\.dt\);/, 'the frame\'s own time since the last');
  assert.match(WORLD, /MBS\.dt = dU > 0 \? dU : 0;/, 'kept with the moment\'s first drawing (W7\'s pair draws it the same)');
});

test('air: one moon direction (the disc as drawn: a glory, a fogbow or a moonlit edge stands on it, never on the key)', () => {
  const G = page();
  // the night sky's uMoon and the air's moonDir: the same route at the same drawn moment
  const drawn = WORLD.match(/moonShown\((SIM\.t - \(1 - SIM\.alpha\) \* SIM_DT \+ SKY\.dt), MOON\.s\); SKYN\.moon\[0\] = MOON\.s\.d\[0\]/);
  assert.ok(drawn, 'the night sky draws the disc at the frame\'s own moment');
  assert.ok(WORLD.includes('var m = moonShown(' + drawn[1] + ', AIR_MOONS);'), 'moonDir reads the route at that same moment, on its own scratch (never moonAt\'s AIR_MOON)');
  assert.match(WORLD, /moonDir: airMoonDir,/, 'the realms and the kits read it as WORLD.air.moonDir');
  assert.equal(G.airMoonDir().up, false, 'before a visit: none');
  G.SIM.V = { seed: 1 }; G.SIM.t = 100; G.SIM.alpha = 0.25; G.SKY.dt = 7;
  G.airMoonDir(); assert.ok(Math.abs(G.AIR_MOONS.t - (100 - 0.75 / 60 + 7)) < 1e-12, 'asked at the drawn moment (the step\'s interpolation and the cycle\'s offset)');
  assert.equal(G.AIR_MOON.t, undefined, 'moonAt\'s scratch untouched');
  G.stub({ d: [0.6, 0.48, 0.64], w: 0.8, az: 30, el: 20 }); const p = G.airMoonDir();
  assert.deepEqual(p.d, [0.6, 0.48, 0.64]); assert.equal(p.w, 0.8); assert.equal(p.up, true);
  assert.ok(p.az === 30 && p.el === 20, 'az and el each its own (never swapped)');
  G.stub({ d: [0, -1, 0], w: 0, az: 10, el: -30 }); assert.equal(G.airMoonDir().up, false, 'a moon of weight 0 is not up');
  G.stub({ d: [0.6, 0.48, 0.64], w: 0.8, az: 30, el: 20 }); const q = G.airMoonDir();
  assert.notStrictEqual(q.d, G.AIR_MOONS.d, 'its own array: a reader never writes the route');
});

test('air: one light at night (the live key stands on the moon\'s disc, by its weight and the night\'s share; the clouds stay baked along the key)', () => {
  const G = page(), key = [0.3, 0.2, 0.932], n = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); }, K = n(key), L = { sunDir: K };
  const moon = n([-0.5, 0.6, 0.62]), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
  G.SIM.V = { seed: 1 }; G.SIM.alpha = 1; G.SKY.dt = 0;
  G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'afterglow', at: -20, hold: 80, move: 58 }, { id: 'moonlit', at: 118, hold: 190, move: 58 });
  G.stub({ d: moon, w: 1, az: 0, el: 37 });
  G.SIM.t = 30;   assert.ok(ang(G.airLightDir(L), K) < 0.05, 'a twilight\'s hold: the key');
  G.SIM.t = 200; assert.ok(ang(G.airLightDir(L), moon) < 0.05, 'a moonlit night\'s hold, the moon full on show: its disc');
  G.stub({ d: moon, w: 0.4, az: 0, el: 37 }); const half = Array.from(G.airLightDir(L)); assert.ok(ang(half, K) > 1 && ang(half, moon) > 1, 'the moon partly on show: between, by its weight');
  G.stub({ d: [0, -1, 0], w: 0, az: 0, el: -60 }); assert.ok(ang(G.airLightDir(L), K) < 0.05, 'no moon up: the key');
  G.stub({ d: moon, w: 1, az: 0, el: 37 }); let p = Array.from((G.SIM.t = 50, G.airLightDir(L))), worst = 0;
  for (let t = 50.05; t < 140; t += 0.05) { G.SIM.t = t; const d = Array.from(G.airLightDir(L)); worst = Math.max(worst, ang(d, p)); p = d; }
  assert.ok(worst < 0.2, `through the change into the night the light turns ${worst.toFixed(3)} deg in 50 ms (eased with the light, never a jump)`);
  assert.match(WORLD, /if \(u\.uSun\) gl\.uniform3fv\(u\.uSun, airLightDir\(L\)\);/, 'every program\'s uSun is the live key');
  assert.match(WORLD, /if \(u\.uSkyS\) gl\.uniform3fv\(u\.uSkyS, L\.skyS \|\| L\.sunDir\);/, 'the sky\'s own sun stays on the key');
  assert.match(WORLD, /var sd = keyAt\(V\)/, 'the clouds stay baked along the key');
});

