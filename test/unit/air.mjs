// test/unit/air.mjs: the air (src/world/215-air.js), the world's one state: every reader of the wind points the way the
// visit's wind blows and has the speed of airSpeed at its own declared height, or is listed in AIR_APART with the change
// that joins it (and is then still apart: a reader joined is taken off the list); the key light is one for every sky,
// and the clouds' bake, the land and the birds read it; each sky's own sun stands where AIR_SUN_EL puts it, on the key's
// azimuth. A fake page: the streams, the vector maths and the air from the dev build, realm-dunes.js run on a stub kit
// (RULES.json one-world-state; tools/checks/42-one-air.sh keeps the literals out of the other sections).
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "AIR_DRIFT(uT)", "with": "vec3(uT * 0.004, 0.0, uT * 0.003)", "why": "the cloud billows' drift a literal of their own again"}
// plant: {"file": "src/realm-dunes.js", "find": "wind: A.vec3(V, A.H.motes, 0.1)", "with": "wind: [V.wind[0] * 2, 0.1, V.wind[1] * 2]", "why": "the motes faster than the air at their height"}
// plant: {"file": "src/world/490-birds-host.js", "find": "o[0] = a.x; o[1] = 0; o[2] = a.z;", "with": "o[0] = a.z; o[1] = 0; o[2] = a.x;", "why": "the birds' air across the sand's"}
// plant: {"file": "src/world/210-cloud-volumes-baking.js", "find": "var sd = keyAt(V), cy", "with": "var sd = dirAzEl(V.light.sunAz, 9), cy", "why": "the clouds baked along a sun of their own"}
import { test, assert, fs, path, vm, ROOT, TMP, WORLD, cut, STREAMS, VEC } from '../unit-lib.mjs';

const AIR = cut(WORLD, '  /* ---------------------------------------------------------------- the air: the world\'s one state', '  /* ---------------------------------------------------------------- the time of day */');
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const LDEF = cut(WORLD, '  var LDEF = {', '  var LKC = ');
const HOSTWIND = cut(WORLD, '    wind: function (o) {', '\n', true);
const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', f), 'utf8');
const SEEDS = Array.from({ length: 16 }, (_, i) => (i * 2654435761 + 12345) >>> 0);

function page() {   // the air on a fake page (no clock, no DOM), and the dunes' kit registered on it
  const G = vm.runInThisContext('(function (W) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, SIM = { V: null, t: 0 }, CS = { x: 0, z: 0 }, J = { seed: 0 };\n' +
    '  function moonShown(t, o) { o.t = t; return o; }\n' + STREAMS + VEC + AIR + SKYDEF + LDEF +
    '  var HOST = {\n' + HOSTWIND + '  };\n' +
    '  return { SIM: SIM, J: J, RNG: RNG, subseed: subseed, AIRAPI: AIRAPI, AIR_DIR: AIR_DIR, AIR_H: AIR_H, AIR_DRIFT: AIR_DRIFT, AIR_CIRRUS: AIR_CIRRUS, AIR_APART: AIR_APART, AIR_SUN_EL: AIR_SUN_EL,\n' +
    '    AIR_KEY_EL: AIR_KEY_EL, AIR_KEY_AZ: AIR_KEY_AZ, SKY_RATE: SKY_RATE, airSpeed: airSpeed, windAt: windAt, airKeySet: airKeySet, keyAt: keyAt, airSunEl: airSunEl, airSkySun: airSkySun, skyFrame: skyFrame, airHeading0: airHeading0,\n' +
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
          assert.ok(Math.abs(Math.hypot(v[0], v[1]) - s) < 1e-9, `${name}: ${Math.hypot(v[0], v[1])} m/s, the profile ${s} at ${h} m`);
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
