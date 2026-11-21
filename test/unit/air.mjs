// test/unit/air.mjs: the air (src/world/215-air.js), the world's one state: every reader of the wind points the way the
// visit's wind blows and has the speed of airSpeed at its own declared height, or is listed in AIR_APART with the change
// that joins it (and is then still apart: a reader joined is taken off the list); the key light is one for every sky,
// and the clouds' bake, the land and the birds read it; each sky's own sun stands where AIR_SUN_EL puts it, on the key's
// azimuth. A fake page: the streams, the vector maths and the air from the dev build, realm-dunes.js run on a stub kit
// (RULES.json one-world-state; tools/checks/42-one-air.sh keeps the literals out of the other sections).
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "if (u.uSun) gl.uniform3fv(u.uSun, L.sunDir);", "with": "if (u.uSun) gl.uniform3fv(u.uSun, skySphere(SIM.t + SKY.dt).sun);", "why": "the land lit by the frame's sun (a light under the horizon 70% of a night)"}
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "if (u.uSun) gl.uniform3fv(u.uSun, L.sunDir);", "with": "if (u.uSun) gl.uniform3fv(u.uSun, skySphere(SIM.t + (SKY.dt || 0), V).sun);", "why": "the land lit by the frame's sun through a nested call (#333's call shape)"}
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "if (u.uSkyS) gl.uniform3fv(u.uSkyS,", "with": "var FS = skySphere(SIM.t + SKY.dt, V); if (u.uSun) gl.uniform3fv(u.uSun, FS.sun); if (u.uSkyS) gl.uniform3fv(u.uSkyS,", "why": "the land lit by the frame's sun through a name"}
// plant: {"file": "src/world/215-air.js", "find": "var lst = S.lst0 + SKY_RATE * 2 * PI / AIR_SIDEREAL * tS,", "with": "var lst = S.lst0 + SKY_RATE * 2 * PI / AIR_SIDEREAL * tS * (1 + 0.5 * Math.sin(tS / 40)),", "why": "the sky turning at a pace of its own (faster, slower, back)"}
// plant: {"file": "src/world/215-air.js", "find": "S.lst0 = airSunH(el === null ? AIR_SUN_NIGHT : el, o === 'firstlight', S.dec) + S.ra;", "with": "S.lst0 = airSunH(el === null ? AIR_SUN_NIGHT : el, false, S.dec) + S.ra;", "why": "a first-light opening's sun in the evening"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_LAT = 64, AIR_OBL = 23.4393,", "with": "var AIR_LAT = 64, AIR_OBL = 0,", "why": "the ecliptic laid on the equator"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "vec3 nOff = fract(uVC / uVR.z);", "with": "vec3 nOff = fract(uVC / uVR.z) + vec3(uT * 0.004, 0.0, uT * 0.003);", "why": "the cloud billows slide by a clock of their own again"}
// plant: {"file": "src/realm-dunes.js", "find": "wind: A.vec3(V, A.H.motes, 0.1)", "with": "wind: [V.wind[0] * 2, 0.1, V.wind[1] * 2]", "why": "the motes faster than the air at their height"}
// plant: {"file": "src/world/490-birds-host.js", "find": "o[0] = a.x; o[1] = 0; o[2] = a.z;", "with": "o[0] = a.z; o[1] = 0; o[2] = a.x;", "why": "the birds' air across the sand's"}
// plant: {"file": "src/world/215-air.js", "find": "AIR_Z0 = 0.003,", "with": "AIR_Z0 = 0.03,", "why": "the sand ten times rougher (the profile's shares off)"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec3 prev = grain(id, uT - uMBdt, e2);", "with": "vec3 prev = head;", "why": "the motes' streak the camera's motion only (a windy mote a dot that jumps)"}
// plant: {"file": "src/world/210-cloud-volumes-baking.js", "find": "var sd = keyAt(V), cy", "with": "var sd = dirAzEl(V.light.sunAz, 9), cy", "why": "the clouds baked along a sun of their own"}
import { test, assert, fs, path, vm, ROOT, TMP, execFileSync, WORLD, cut, STREAMS, VEC } from '../unit-lib.mjs';

const AIR = cut(WORLD, '  /* ---------------------------------------------------------------- the air: the world\'s one state', '  /* ---------------------------------------------------------------- the time of day */');
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const LDEF = cut(WORLD, '  var LDEF = {', '  var LKC = ');
const HOSTWIND = cut(WORLD, '    wind: function (o, y) {', '\n', true);
const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', f), 'utf8');
const SEEDS = Array.from({ length: 16 }, (_, i) => (i * 2654435761 + 12345) >>> 0);

function page() {   // the air on a fake page (no clock, no DOM), and the dunes' kit registered on it
  const G = vm.runInThisContext('(function (W) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, SIM = { V: null, t: 0 }, CS = { x: 0, z: 0 }, J = { seed: 0 };\n' +
    '  function moonShown(t, o) { o.t = t; return o; }\n' + STREAMS + VEC + AIR + SKYDEF + LDEF +
    '  var HOST = {\n' + HOSTWIND + '  };\n' +
    '  return { SIM: SIM, J: J, RNG: RNG, subseed: subseed, AIRAPI: AIRAPI, AIR_DIR: AIR_DIR, AIR_H: AIR_H, AIR_CIRRUS: AIR_CIRRUS, AIR_APART: AIR_APART, AIR_SUN_EL: AIR_SUN_EL,\n' +
    '    AIR_KEY_EL: AIR_KEY_EL, AIR_KEY_AZ: AIR_KEY_AZ, SKY_RATE: SKY_RATE, AIR_GRAIN_K: AIR_GRAIN_K, airProfile: airProfile, airU10: airU10, airSpeed: airSpeed, windAt: windAt, airKeySet: airKeySet, keyAt: keyAt, airSunEl: airSunEl, airSkySun: airSkySun, skyFrame: skyFrame, airHeading0: airHeading0,\n' +
    '    SKY: SKY, AIR_LAT: AIR_LAT, AIR_OBL: AIR_OBL, AIR_SIDEREAL: AIR_SIDEREAL, AIR_FRAME: AIR_FRAME, skySphere: skySphere, airSunEl: airSunEl,\n' +
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
  G.SIM.V = { seed: 3, light: { sunAz: 10 } }; rates.stars = (G.skySphere(1).lst - G.skySphere(0).lst) / (2 * Math.PI / G.AIR_SIDEREAL);   // (the frame: SKY_RATE x sidereal, always)
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

test('air: the sky\'s frame (one celestial sphere: the pole at the latitude, the ecliptic and the galaxy where J2000 puts them, turning forward at SKY_RATE)', () => {
  const G = page(), D = 180 / Math.PI, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * D;
  const el = (v) => Math.asin(v[1]) * D, az = (v) => Math.atan2(v[0], v[2]) * D, adiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  const order = [{ id: 'afterglow', at: -30, hold: 80, move: 58 }, { id: 'milkyway', at: 108, hold: 90, move: 56 }, { id: 'firstlight', at: 254, hold: 100, move: 60 }, { id: 'bluehour', at: 414, hold: 80, move: 55 }, { id: 'moonlit', at: 549, hold: 190, move: 58 }];
  const decs = [], rate = G.SKY_RATE * 360 / G.AIR_SIDEREAL;   // (deg/s)
  for (const seed of SEEDS) {
    G.SKY.seq.length = 0; G.SKY.seq.push(...order.map((e) => Object.assign({}, e))); G.SKY.dt = 0;
    const V = { seed, light: { sunAz: (seed % 360) - 180 } }; G.SIM.V = V;
    const F = G.skySphere(30, V), M = F.M, col = (i) => [M[3 * i], M[3 * i + 1], M[3 * i + 2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) assert.ok(Math.abs(dot(col(i), col(j)) - (i === j ? 1 : 0)) < 1e-6, 'the frame is orthonormal');
    const X = col(0), Y = col(1), Z = col(2), c = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]];
    assert.ok(dot(c, Z) > 1 - 1e-6, 'right-handed: right ascension 0 x 90 is the pole');
    const R = G.skyFrame(30, V); for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) assert.equal(R[r * 3 + k], M[k * 3 + r], 'skyFrame: the same frame, row-major (226\'s uSkyF)');
    assert.strictEqual(R, G.AIR_FRAME, 'filled in place');
    assert.ok(Math.abs(el(F.pole) - G.AIR_LAT) < 1e-6, 'the pole stands at the latitude');
    assert.ok(Math.abs(ang(F.pole, F.ecl) - G.AIR_OBL) < 1e-4, 'the ecliptic leans the obliquity to the equator');
    assert.ok(Math.abs(ang(F.ecl, F.galPole) - 60.19) < 0.05, `the galactic pole ${ang(F.ecl, F.galPole).toFixed(2)} deg from the ecliptic's`);
    assert.ok(Math.abs(Math.asin(dot(F.galCentre, F.ecl)) * D + 5.54) < 0.1, 'the galactic centre 5.5 deg south of the ecliptic');
    assert.ok(Math.abs(dot(F.sun, F.ecl)) < 1e-5, 'the sun on the ecliptic');
    assert.ok(F.sunDec <= 1e-9 && F.sunDec >= -G.AIR_OBL - 1e-9, 'the dark half of the year'); decs.push(F.sunDec);
    const s0 = G.skySphere(0, V).sun; assert.ok(Math.abs(el(s0) - -3) < 1e-3 && adiff(az(s0), V.light.sunAz) < 1e-3, 'at sky time 0, the opening\'s (the afterglow\'s) sun: 3 deg down, on the drawn sun\'s azimuth');
    // the clock: forward only, at SKY_RATE x sidereal, never stopping, never turning back, through every hold and change
    let p = G.skySphere(-30, V).lst, lo = Infinity, hi = -Infinity;
    for (let i = 1; i <= 16600; i++) { const S2 = G.skySphere(-30 + i * 0.05, V), r = (S2.lst - p) * D / 0.05; lo = Math.min(lo, r); hi = Math.max(hi, r); p = S2.lst; }
    assert.ok(Math.abs(lo / rate - 1) < 1e-6 && Math.abs(hi / rate - 1) < 1e-6, `the sky turns at ${lo.toFixed(4)}-${hi.toFixed(4)} deg/s through every hold and change: SKY_RATE x sidereal is ${rate.toFixed(4)}, always (never still, never back)`);
    // a star rising in the east climbs (the turn is east to west)
    const C = JSON.parse(JSON.stringify({ M: Array.from(G.skySphere(100, V).M), lst: G.skySphere(100, V).lst })), ra = C.lst + Math.PI / 2, v = [Math.cos(ra), Math.sin(ra), 0], w2 = (S2) => [S2.M[0] * v[0] + S2.M[3] * v[1] + S2.M[6] * v[2], S2.M[1] * v[0] + S2.M[4] * v[1] + S2.M[7] * v[2], S2.M[2] * v[0] + S2.M[5] * v[1] + S2.M[8] * v[2]];
    assert.ok(Math.abs(el(w2(C))) < 1e-4, 'an equator star at hour angle -90 deg is on the horizon');
    assert.ok(w2(G.skySphere(101, V))[1] > w2(C)[1], 'a star rising in the east climbs as the night goes on (the sky turns east to west)');
  }
  assert.ok(Math.min(...decs) < -15 && Math.max(...decs) > -8, 'the visits\' seasons spread over the dark half');
  // a first-light opening: its sun in the morning, on the other side
  G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'firstlight', at: -20, hold: 80, move: 55 }); const W = { seed: 9, light: { sunAz: 40 } };
  const m = G.skySphere(0, W).sun; assert.ok(Math.abs(el(m) - -3) < 1e-3 && adiff(az(m), 40) > 30, 'a first-light opening: its sun 3 deg down, in the morning');
  G.SIM.V = null; assert.deepEqual(Array.from(G.skyFrame(0)), Array.from(G.skyFrame(0)), 'before a visit: the frame unchanged');
  // no reader lights by the frame's sun: no world section (but the air's own) or realm, bird or sound file reads skySphere's .sun, inline or through a name it is
  // assigned to (its other fields, sunDec, the pole, the ecliptic, are the sphere's to read: NIGHT's planets)
  const sunRead = (t) => { if (/skySphere\s*\((?:[^()]|\([^()]*\))*\)\s*\.\s*sun\b/.test(t)) return true; for (const m of t.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*(?:[\w$.]+\.)?skySphere\s*\(/g)) if (new RegExp('\\b' + m[1].replace(/\$/g, '\\$') + '\\s*\\.\\s*sun\\b').test(t)) return true; return false; };
  const SECS = fs.readdirSync(path.join(ROOT, 'src/world')).filter((n) => n.endsWith('.js') && n !== '215-air.js').map((n) => 'src/world/' + n);
  const READERS = execFileSync('git', ['ls-files', 'src/*.js', 'src/birds/*.js', 'src/birds/**/*.js'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => f && !f.startsWith('src/world/') && !f.startsWith('src/dev/'));
  for (const f of SECS.concat(READERS)) assert.ok(!sunRead(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} lights by skySphere().sun: the frame's sun is never a light (keyAt and uSkyS are)`);
  assert.ok(sunRead('var F = A.skySphere(0, V); x = F.sun;') && sunRead('a = skySphere(t).sun') && sunRead('d = skySphere(SIM.t + (SKY.dt || 0), V).sun') && !sunRead('var F = skySphere(t, V); d = F.sunDec;') && !sunRead('d = skySphere(SIM.t + (SKY.dt || 0), V).sunDec'), 'the guard: an inline (nested call too) or assigned .sun caught, .sunDec allowed');
});
