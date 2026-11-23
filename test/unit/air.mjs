// test/unit/air.mjs: the air (src/world/215-air.js), the world's one state: every reader of the wind points the way the
// visit's wind blows and has the speed of airSpeed at its own declared height, or is listed in AIR_APART with the change
// that joins it (and is then still apart: a reader joined is taken off the list); the key light is one for every sky,
// and the clouds' bake, the land and the birds read it; each sky's own sun stands where AIR_SUN_EL puts it, on the key's
// azimuth. A fake page: the streams, the vector maths and the air from the dev build, realm-dunes.js run on a stub kit
// (RULES.json one-world-state; tools/checks/42-one-air.sh keeps the literals out of the other sections).
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "float a = uPc.a * 0.55 *", "with": "float a = uPc.a * 0.55 * mix(0.15, 1.0, gust) *", "why": "the veils fading with the gust again"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "airGust(sp.xy, w, uAirU, Wv, uT - AIR_UT0)", "with": "airGust(sp.xy, w, uAirU, Wv, uT)", "why": "the veils read the field 40 s ahead of the birds"}
// plant: {"file": "src/world/215-air.js", "find": "return AIR_GUST[0] * airSpeed(y, V) * gustN(xi, eta);", "with": "return AIR_GUST[0] * airSpeed(y, V) * gustN(xi * AIR_GUST[1] * U / (AIR_GUST[1] * airSpeed(y, V)), eta);", "why": "each height carried at its own speed (a bird over a veil feels another gust)"}
// plant: {"file": "src/world/215-air.js", "find": "o.az = m.az; o.el = m.el; o.up = m.w > 0;", "with": "o.az = m.el; o.el = m.az; o.up = m.w > 0;", "why": "the moon's az and el swapped"}
// plant: {"file": "src/world/215-air.js", "find": "o.az = m.az; o.el = m.el; o.up = m.w > 0;", "with": "o.az = m.az; o.el = m.el; o.up = m.w >= 0;", "why": "a moon of no weight counted up"}
// plant: {"file": "src/world/215-air.js", "find": "var m = moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, AIR_MOONS);", "with": "var m = moonShown(SIM.t, AIR_MOONS);", "why": "the moon's direction a step behind the drawn disc"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "vec3 nOff = fract(uVC / uVR.z);", "with": "vec3 nOff = fract(uVC / uVR.z) + vec3(uT * 0.004, 0.0, uT * 0.003);", "why": "the cloud billows slide by a clock of their own again"}
// plant: {"file": "src/realm-dunes.js", "find": "wind: A.vec3(V, A.H.motes, 0.1)", "with": "wind: [V.wind[0] * 2, 0.1, V.wind[1] * 2]", "why": "the motes faster than the air at their height"}
// plant: {"file": "src/world/490-birds-host.js", "find": "o[0] = a.x; o[1] = 0; o[2] = a.z;", "with": "o[0] = a.z; o[1] = 0; o[2] = a.x;", "why": "the birds' air across the sand's"}
// plant: {"file": "src/world/215-air.js", "find": "AIR_Z0 = 0.003,", "with": "AIR_Z0 = 0.03,", "why": "the sand ten times rougher (the profile's shares off)"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_GUST = [0.26, 22,", "with": "var AIR_GUST = [0.12, 22,", "why": "gusts too weak (the 3-s gust under 1.4 of the mean)"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "airGust(sp.xy, w, uAirU, Wv, uT - AIR_UT0)", "with": "Wv * AIR_GUST_I * sin(uT * 0.9 + r1 * 7.0)", "why": "the veils on a private cycle again"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec3 prev = grain(id, uT - uMBdt, e2);", "with": "vec3 prev = head;", "why": "the motes' streak the camera's motion only (a windy mote a dot that jumps)"}
// plant: {"file": "src/world/210-cloud-volumes-baking.js", "find": "var sd = keyAt(V), cy", "with": "var sd = dirAzEl(V.light.sunAz, 9), cy", "why": "the clouds baked along a sun of their own"}
import { test, assert, fs, path, vm, ROOT, TMP, WORLD, cut, STREAMS, VEC } from '../unit-lib.mjs';

const AIR = cut(WORLD, '  /* ---------------------------------------------------------------- the air: the world\'s one state', '  /* ---------------------------------------------------------------- the time of day */');
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const LDEF = cut(WORLD, '  var LDEF = {', '  var LKC = ');
const HOSTWIND = cut(WORLD, '    wind: function (o, y) {', '\n', true) + cut(WORLD, '    gust: function (x, z, y) {', '\n', true) + cut(WORLD, '    gustPhase: function (x, z, y) {', '\n', true) + cut(WORLD, '    gustSigma: function (y) {', '\n', true);
const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', f), 'utf8');
const SEEDS = Array.from({ length: 16 }, (_, i) => (i * 2654435761 + 12345) >>> 0);

function page() {   // the air on a fake page (no clock, no DOM), and the dunes' kit registered on it
  const G = vm.runInThisContext('(function (W) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, SIM_DT = 1 / 60, SIM = { V: null, t: 0, alpha: 1 }, CS = { x: 0, z: 0 }, J = { seed: 0 };\n' +
    '  var MSTUB = null; function moonShown(t, o) { o.t = t; if (MSTUB) { o.d = MSTUB.d.slice(); o.w = MSTUB.w; o.az = MSTUB.az; o.el = MSTUB.el; } return o; }\n' + STREAMS + VEC + AIR + SKYDEF + LDEF +
    '  var HOST = {\n' + HOSTWIND + '  };\n' +
    '  return { SIM: SIM, J: J, RNG: RNG, subseed: subseed, AIRAPI: AIRAPI, AIR_DIR: AIR_DIR, AIR_H: AIR_H, AIR_CIRRUS: AIR_CIRRUS, AIR_APART: AIR_APART, AIR_SUN_EL: AIR_SUN_EL,\n' +
    '    AIR_KEY_EL: AIR_KEY_EL, AIR_KEY_AZ: AIR_KEY_AZ, SKY_RATE: SKY_RATE, AIR_GRAIN_K: AIR_GRAIN_K, airProfile: airProfile, airU10: airU10, gustAt: gustAt, gustPhase: gustPhase, gustSigma: gustSigma, AIR_GUST: AIR_GUST, AIR_GOCT: AIR_GOCT, airGustGlsl: airGustGlsl, airSpeed: airSpeed, windAt: windAt, airKeySet: airKeySet, keyAt: keyAt, airSunEl: airSunEl, airSkySun: airSkySun, skyFrame: skyFrame, airHeading0: airHeading0,\n' +
    '    SKY: SKY, airMoonDir: airMoonDir, AIR_MOON: AIR_MOON, AIR_MOONS: AIR_MOONS, stub: function (m) { MSTUB = m; },\n' +
    '    WSKY: WSKY, LDEF: LDEF, HOST: HOST };\n})')();
  let def = null;
  const kit = { lch: (l, c, h, k) => [l, c, h, k === undefined ? 1 : k], cellHash: () => 0, hk: () => 0, hfl: () => 0.5, RNG: G.RNG, range: () => {}, rock: () => {} };
  const window = { WORLD: { kit, forms: {}, air: G.AIRAPI, realm: (d) => { def = d; } } };
  vm.runInThisContext('(function (window) {\n' + DUNES + '\n})')(window);
  G.dunes = def;
  return G;
}
function visit(G, seed) {   // planVisit's order: the field (its stream 1), the light (2), the key; then the particles and the veils
  const V = { seed, salt: G.subseed(seed, 7) >>> 0 };   // (planVisit's V.salt)
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
  for (const name of ['cirrus']) assert.ok(apart[name], `${name} is joined to the air: take it off AIR_APART (215-air.js)`);
});

test('air: the billows read no clock (they ride with their body, physics: clouds/drift); the high streaks\' axis is the air\'s', () => {
  const vb = GLSL('fs-vbody.glsl').replace(/\/\/[^\n]*/g, ''), sb = GLSL('sky-body.glsl'), G = page();
  assert.ok(!/\buT\b/.test(vb), 'fs-vbody reads the clock: its billows slide through their body');
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
  let sum = 0, lo = 99, hi = 0; const N = 20000, bins = new Array(9).fill(0);   // the visits' U10: the speed distribution of a two-dimensional normal wind vector, of mean 5 mapped into 3.0-7.5 (the hub's ruling), nothing piled at the ends
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

test('air: one gust field, frozen and carried downwind (16 visits x 10 min at 10 Hz; the rate at 60 Hz)', () => {
  const G = page(), Gs = [], taus = [], lags = []; let fastest = 0, still = 0;
  for (let k = 0; k < 16; k++) {
    const V = visit(G, SEEDS[k]), y = 40, W = Math.hypot(G.windAt(0, 0, y, 0, V).x, G.windAt(0, 0, y, 0, V).z);
    if (W < 1) { still++; continue; }
    const dt = 0.1, N = 6000, u = new Float64Array(N), u2 = new Float64Array(N), w = V.wind, d = 100;
    for (let i = 0; i < N; i++) { const t = i * dt; u[i] = W + G.gustAt(0, 0, y, t, V); u2[i] = W + G.gustAt(w[0] * d, w[1] * d, y, t, V); }
    let mean = 0, v0 = 0; for (let i = 0; i < N; i++) mean += u[i] / N; for (let i = 0; i < N; i++) v0 += (u[i] - mean) ** 2 / N;
    let acc = 0, best = 0; for (let i = 0; i < N; i++) { acc += u[i]; if (i >= 30) acc -= u[i - 30]; if (i >= 29) best = Math.max(best, acc / 30); }
    Gs.push(best / mean);
    for (let L = 1; L < N / 2; L++) { let c = 0; for (let i = 0; i + L < N; i++) c += (u[i] - mean) * (u[i + L] - mean); if (c / (N - L) / v0 < 1 / Math.E) { taus.push(L * dt); break; } }
    let bl = 0, bc = -Infinity; const T = d / V.u10;   // (the peak of the cross-correlation within twice the expected lag: the field is carried at the visit's U10)
    for (let L = 0; L * dt < 2 * T; L++) { let c = 0; for (let i = 0; i + L < N; i++) c += (u[i] - mean) * (u2[i + L] - mean); if (c > bc) { bc = c; bl = L * dt; } }
    lags.push(bl / T);
    for (let i = 1, p = G.gustAt(0, 0, y, 0, V); i < 3600; i++) { const g = G.gustAt(0, 0, y, i / 60, V); fastest = Math.max(fastest, Math.abs(g - p) * 60 / W); p = g; }
  }
  const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
  assert.ok(Gs.length >= 10, `${Gs.length} windy visits of 16`);
  assert.ok(med(Gs) >= 1.4 && med(Gs) <= 1.7, `the 3-s gust over the 10-min mean: median ${med(Gs).toFixed(3)} (${Math.min(...Gs).toFixed(2)}-${Math.max(...Gs).toFixed(2)}), not 1.4-1.7`);
  assert.ok(med(taus) >= 10 && med(taus) <= 30, `the gusts' e-fold time: median ${med(taus).toFixed(1)} s, not 10-30`);
  for (const r of lags) assert.ok(Math.abs(r - 1) <= 0.1, `the lag 100 m downwind is ${r.toFixed(3)} of 100 / U10, not within 10%`);
  assert.ok(fastest < 1 / 0.5, `the gust changes by ${fastest.toFixed(3)} W a second (a change faster than 0.5 s)`);
  assert.ok(fastest < 0.3, `the gust changes by ${fastest.toFixed(3)} W a second: no flicker`);
  // still air: no gust, no phase
  const Vs = { seed: 1, wind: [0, 1], u10: 0 }; assert.equal(G.gustAt(5, 7, 40, 3, Vs), 0); assert.ok(Number.isNaN(G.gustPhase(5, 7, 40, 3, Vs)));
  // HOST: the birds' gust and phase at the default height and their own
  G.SIM.t = 12.5; const V = G.SIM.V, f = G.windAt(0, 0, 40, 0, V), Wb = Math.hypot(f.x, f.z);
  assert.equal(G.HOST.gust(30, -20), G.gustAt(30, -20, 40, 12.5, V)); assert.equal(G.HOST.gust(30, -20, 200), G.gustAt(30, -20, 200, 12.5, V));
  assert.ok(Math.abs(G.HOST.gustPhase(30, -20) - (12.5 - (30 * V.wind[0] - 20 * V.wind[1]) / V.u10)) < 1e-9 && G.HOST.gustPhase(30, -20, 200) === G.HOST.gustPhase(30, -20), 'the phase is t - x.w / U10, the same at every height');
  assert.ok(Math.abs(G.HOST.gustSigma() - 0.26 * Wb) < 1e-12 && G.gustSigma(40, Vs) === 0, 'sigma at the birds\' height, 0 in still air');
});

test('air: one field at every height (a bird over a veil feels the veil\'s gust, near the landing and far from it)', () => {
  const G = page(), corr = (a, b) => { let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } return ab / Math.sqrt(aa * bb); };
  for (const seed of SEEDS.slice(0, 6)) {
    const V = visit(G, seed); if (!(V.u10 > 0)) continue;
    for (const d of [0, 500, 3000, 8000]) {
      const a = [], b = [], c = [];
      for (let i = 0; i < 400; i++) { const t = i * 0.5, x = d + 37 * Math.sin(i), z = -d / 2 + 23 * Math.cos(i * 1.3); a.push(G.gustAt(x, z, 5, t, V)); b.push(G.gustAt(x, z, 40, t, V)); c.push(G.gustAt(x, z, 200, t, V)); }
      assert.ok(corr(a, b) > 0.9999 && corr(a, c) > 0.9999, `${d} m out: the gust at 5 m and 40 m (and 200 m) is one gust (${corr(a, b).toFixed(4)})`);
      assert.ok(Math.abs(b[7] / a[7] - G.airSpeed(40, V) / G.airSpeed(5, V)) < 1e-9, 'its size the height\'s wind');
    }
  }
});

test('air: the shaders\' gust is the same field (the same constants and hash), and the veils read it', () => {
  const G = page(), g = G.airGustGlsl(), vr = GLSL('vs-ribbon.glsl'), F = (v) => (/[.e]/.test(String(v)) ? String(v) : v + '.0');
  assert.ok(g.includes('#define AIR_GUST_I ' + F(G.AIR_GUST[0]) + '\n') && g.includes('#define AIR_GUST_T ' + F(G.AIR_GUST[1]) + '\n'), 'the same intensity and time scale');
  for (const [f, a, s] of G.AIR_GOCT) assert.ok(g.includes(`${F(a)} * airVn(q * ${F(f)}, ${s}u)`), `the octave ${f} in the shaders' noise`);
  assert.ok(g.includes(') * ' + F(G.AIR_GUST[2]) + '; }'), 'the same unit-variance gain');
  assert.ok(g.includes('hf(ih(ih2(ivec2(i, j)) ^ s)) * 2.0 - 1.0'), 'lib.glsl\'s hash, as the JS mirrors it');
  assert.match(WORLD, /C\(preG \+ airGustGlsl\(\) \+ VS_RIBBON,/, 'the veils\' program is given the gust field');
  assert.ok(/airGust\(sp\.xy, w, uAirU, Wv, uT - AIR_UT0\) \/ max\(Wv \* AIR_GUST_I, 1e-4\)/.test(vr), 'the veils lift with the gust over their brink, in sigmas, on the flight\'s clock');
  assert.match(WORLD, /UT\[0\] = u \+ AIR_UT0;/, 'the shaders\' clock leads the flight\'s by the air\'s AIR_UT0, which the veils take off (one clock: HOST.gust reads SIM.t)');
  assert.match(WORLD, /if \(P\.u\.uAirU\) gl\.uniform1f\(P\.u\.uAirU, u10Of\(V\)\);/, 'the veils carry the field at the visit\'s U10');
  const alpha = vr.split('float a =')[1].split(';')[0];
  assert.ok(!/\bgust\b|\buAir\b|\buT\b/.test(alpha), 'a veil\'s opacity follows neither the gust, the sky\'s wind nor the clock (no fade: it rises and lies down): ' + alpha.trim());
  assert.ok(/max\(lie, mix\(lie, up, gust\)\)/.test(vr), 'at calm the sheet settles flat onto the sand');
  assert.ok(!/uRb|fract\(g\)/.test(vr), 'no private cycle of their own');
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

