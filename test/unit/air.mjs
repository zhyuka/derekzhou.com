// test/unit/air.mjs: the air (src/world/215-air.js), the world's one state: every reader of the wind points the way the
// visit's wind blows and has the speed of airSpeed at its own declared height, or is listed in AIR_APART with the change
// that joins it (and is then still apart: a reader joined is taken off the list); the key light is one for every sky,
// and the clouds' bake, the land and the birds read it; each sky's own sun stands where AIR_SUN_EL puts it, on the key's
// azimuth. A fake page: the streams, the vector maths and the air from the dev build, realm-dunes.js run on a stub kit
// (RULES.json one-world-state; tools/checks/42-one-air.sh keeps the literals out of the other sections).
// plant: {"file": "src/world/215-air.js", "find": "return d === undefined ? 0 : q * d; }", "with": "return d === undefined ? 0 : d; }", "why": "the mist on every visit again (no moisture)"}
// plant: {"file": "src/world/215-air.js", "find": " BYSKY: airTable,", "with": " BYSKY: function () { return AIR_BYSKY; },", "why": "BYSKY handing readers the live table"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_MIST_RATE = 0.18,", "with": "var AIR_MIST_RATE = 0.5,", "why": "the mist racing through a change"}
// plant: {"file": "src/world/215-air.js", "find": "o.dust = airEase(K.dust[0], K.dust[1], u);", "with": "o.dust = airEase(K.dust[0], K.dust[1], u * weather(t)[0]);", "why": "the haze changing with the sky (the far land fading in place)"}
// plant: {"file": "src/world/glsl/fs-ribbon.glsl", "find": "(dot(vW.xz, w) - uAir.x * length(uWind.xz)) * 0.035", "with": "dot(vW.xz, w) * 0.035 - uT * 0.22", "why": "the veils' streaks at a pace of their own"}
// plant: {"file": "src/world/215-air.js", "find": "eta = (z * f.x - x * f.z) / L + oz;", "with": "eta = (z * f.x - x * f.z - U * 0.6 * T[1]) / L + oz;", "why": "the gusts slid across the wind (row 6: carried at the mean wind)"}
// plant: {"file": "src/world/215-air.js", "find": "if (tS <= seq[0].at) { var A0 = airSh(seq[0]); for (c = 0; c < AIR_NC; c++) out[c] = (tS - seq[0].at) * A0[c]; return out; }", "with": "if (tS <= 0) { var A0 = airSh(seq[0]); for (c = 0; c < AIR_NC; c++) out[c] = tS * A0[c]; return out; }", "why": "the wind's clock jumps at the flight's start (the opening part way through its hold)"}
// plant: {"file": "src/world/413-draw-frame.js", "find": "airFrameU(UT[0] - AIR_UT0, MBS.dt);", "with": "airFrameU(UT[0], MBS.dt);", "why": "the veils and the grains carried 40 s ahead of the birds"}
// plant: {"file": "src/world/215-air.js", "find": "xi = (x * f.x + z * f.z - U * T[0]) / L + ox,", "with": "xi = (x * f.x + z * f.z - U * airCarried(y, t)) / L + ox,", "why": "each height carried at its own speed (a bird over a veil feels another gust)"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "float a = uPc.a * 0.55 *", "with": "float a = uPc.a * 0.55 * mix(0.15, 1.0, gust) *", "why": "the veils fading with the gust again"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "AIR_DRIFT(uT)", "with": "vec3(uT * 0.004, 0.0, uT * 0.003)", "why": "the cloud billows' drift a literal of their own again"}
// plant: {"file": "src/realm-dunes.js", "find": "wind: A.vec3(V, A.H.motes, 0.1)", "with": "wind: [V.wind[0] * 2, 0.1, V.wind[1] * 2]", "why": "the motes faster than the air at their height"}
// plant: {"file": "src/world/490-birds-host.js", "find": "o[0] = a.x; o[1] = 0; o[2] = a.z;", "with": "o[0] = a.z; o[1] = 0; o[2] = a.x;", "why": "the birds' air across the sand's"}
// plant: {"file": "src/world/215-air.js", "find": "AIR_Z0 = 0.003,", "with": "AIR_Z0 = 0.03,", "why": "the sand ten times rougher (the profile's shares off)"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_GUST = [0.26, 22,", "with": "var AIR_GUST = [0.12, 22,", "why": "gusts too weak (the 3-s gust under 1.4 of the mean)"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "airGust(sp.xy, w, uAirU, Wv * uAir.y * uAir.z, uAir.x)", "with": "Wv * AIR_GUST_I * sin(uT * 0.9 + r1 * 7.0)", "why": "the veils on a private cycle again"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec2 pos = p0 + vel.xz * tau +", "with": "vec2 pos = p0 + vel.xz * t +", "why": "the grains carried by the wind times the time (a change of sky jumps them)"}
// plant: {"file": "src/score.js", "find": "return a ? [WIND_DAY * a[0], a[2]] : [0, 0];", "with": "return { afterglow: [0.35, 1], bluehour: [0.2, 0.65] }[id] || [0.2, 0.65];", "why": "the score with a breeze of its own by sky"}
// plant: {"file": "src/world/215-air.js", "find": "for (c = 0; c < AIR_NC; c++) AIR_WX[c] = A[c] + (B[c] - A[c]) * q;", "with": "for (c = 0; c < AIR_NC; c++) AIR_WX[c] = k < 0.5 ? A[c] : B[c];", "why": "the wind jumps at a change of sky"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec3 prev = grain(id, uT - uMBdt, uAir.w, e2);", "with": "vec3 prev = head;", "why": "the motes' streak the camera's motion only (a windy mote a dot that jumps)"}
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
  const G = vm.runInThisContext('(function (W) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, SIM = { V: null, t: 0 }, CS = { x: 0, z: 0 }, J = { seed: 0 };\n' +
    '  function moonShown(t, o) { o.t = t; return o; }\n' + STREAMS + VEC + AIR + SKYDEF + LDEF +
    '  var HOST = {\n' + HOSTWIND + '  };\n' +
    '  return { SIM: SIM, J: J, RNG: RNG, subseed: subseed, AIRAPI: AIRAPI, AIR_DIR: AIR_DIR, AIR_H: AIR_H, AIR_DRIFT: AIR_DRIFT, AIR_CIRRUS: AIR_CIRRUS, AIR_APART: AIR_APART, AIR_SUN_EL: AIR_SUN_EL,\n' +
    '    AIR_KEY_EL: AIR_KEY_EL, AIR_KEY_AZ: AIR_KEY_AZ, SKY_RATE: SKY_RATE, AIR_GRAIN_K: AIR_GRAIN_K, airProfile: airProfile, airU10: airU10, gustAt: gustAt, gustPhase: gustPhase, gustSigma: gustSigma, AIR_GUST: AIR_GUST, AIR_GOCT: AIR_GOCT, airGustGlsl: airGustGlsl, airSpeed: airSpeed, windAt: windAt, airKeySet: airKeySet, keyAt: keyAt, airSunEl: airSunEl, airSkySun: airSkySun, skyFrame: skyFrame, airHeading0: airHeading0,\n' +
    '    airWx: airWx, AIR_MIST: AIR_MIST, AIR_MOIST: AIR_MOIST, SKY: SKY, weather: weather, airClock: airClock, airShare: airShare, airCarried: airCarried, AIR_BYSKY: AIR_BYSKY, airTable: airTable, airFrameU: airFrameU, UAIR: UAIR,\n' +
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
  G.SKY.seq.push({ id: 'bluehour', at: -40, hold: 60, move: 58 }, { id: 'milkyway', at: 78, hold: 90, move: 56 }); G.SKY.dt = 0;   // (an order: the night's jet aloft, its weak air at the ground)
  for (const seed of SEEDS.slice(0, 6)) {
    const V = visit(G, seed); if (!(V.u10 > 0)) continue;
    for (const d of [0, 500, 3000, 8000]) {
      const a = [], b = [], c = [];
      for (let i = 0; i < 400; i++) { const t = i * 0.5, x = d + 37 * Math.sin(i), z = -d / 2 + 23 * Math.cos(i * 1.3); a.push(G.gustAt(x, z, 5, t, V) / G.gustSigma(5, V, t)); b.push(G.gustAt(x, z, 40, t, V) / G.gustSigma(40, V, t)); c.push(G.gustAt(x, z, 200, t, V) / G.gustSigma(200, V, t)); }   // (t 0-200 s: through the blue hour's change into the night, each in its own sigmas)
      assert.ok(corr(a, b) > 0.9999 && corr(a, c) > 0.9999, `${d} m out: the gust at 5 m and 40 m (and 200 m) is one gust (${corr(a, b).toFixed(4)})`);
      assert.ok(Math.abs(G.gustAt(d, 0, 40, 50, V) / G.gustAt(d, 0, 5, 50, V) - G.airSpeed(40, V) * G.airShare(40, 50) / (G.airSpeed(5, V) * G.airShare(5, 50))) < 1e-9, 'its size the height\'s wind');
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
  assert.ok(/airGust\(sp\.xy, w, uAirU, Wv \* uAir\.y \* uAir\.z, uAir\.x\) \/ max\(Wv \* AIR_GUST_I, 1e-4\)/.test(vr), 'the veils lift with the gust over their brink, in the day\'s sigmas, carried on the surface\'s clock (gustAt\'s)');
  assert.match(WORLD, /airFrameU\(UT\[0\] - AIR_UT0, MBS\.dt\);/, 'uAir on the flight\'s clock (the shaders\' lead taken off: one clock with HOST.gust)');
  assert.match(WORLD, /if \(P\.u\.uAirU\) gl\.uniform1f\(P\.u\.uAirU, u10Of\(V\)\);/, 'the veils carry the field at the visit\'s U10');
  const alpha = vr.split('float a =')[1].split(';')[0];
  assert.ok(!/\bgust\b|\buAir\b|\buT\b/.test(alpha), 'a veil\'s opacity follows neither the gust, the sky\'s wind nor the clock (no fade: it rises and lies down): ' + alpha.trim());
  assert.ok(/max\(lie, mix\(lie, up, gust\)\)/.test(vr), 'at calm the sheet settles flat onto the sand');
  assert.ok(!/uRb|fract\(g\)/.test(vr), 'no private cycle of their own');
});

test('air: a mote is drawn along its whole motion on the window (its own wind and the camera\'s), never a jumping dot', () => {
  const vp = GLSL('vs-particle.glsl');
  assert.ok(/vec3 prev = grain\(id, uT - uMBdt, uAir\.w, e2\);/.test(vp), 'the streak starts where the mote was a frame ago (its own wind, on the air\'s clock a frame back)');
  assert.ok(/uPVP2 \* vec4\(prev - uPCam2, 1\.0\)/.test(vp), 'seen from where the camera was');
  assert.match(WORLD, /if \(P\.u\.uMBdt\) gl\.uniform1f\(P\.u\.uMBdt, MBS\.dt\);/, 'the frame\'s own time since the last');
  assert.match(WORLD, /MBS\.dt = dU > 0 \? dU : 0;/, 'kept with the moment\'s first drawing (W7\'s pair draws it the same)');
});

test('air: the wind by sky (one table: the world and the score), eased with the sky and carried by its integral, never a jump', () => {
  const G = page(), T = G.AIR_BYSKY, ids = Object.keys(G.WSKY);
  for (const id of ids) assert.ok(Array.isArray(T[id]) && T[id].length === 3, `the sky ${id} has its wind`);
  assert.deepEqual(T.afterglow, [1, 1, 1], 'the afterglow: the day\'s own wind');
  const nights = ['moonlit', 'milkyway', 'aurora'];
  assert.ok(T.afterglow[0] > T.bluehour[0] && nights.every((n) => T.bluehour[0] > T[n][0] && T[n][0] > T.firstlight[0]), 'the surface: the afterglow, then the blue hour, then the nights, first light the stillest');
  assert.ok(nights.every((n) => T[n][1] >= 1.2 && T[n][1] <= 1.5 && T[n][2] < 1), 'a night: the jet aloft 1.2-1.5 of the day\'s, its gusts weaker');
  // an order: two near changes and a far one, opening part way through its first hold
  G.SKY.seq.push({ id: 'afterglow', at: -25, hold: 80, move: 58 }, { id: 'bluehour', at: 113, hold: 90, move: 56 }, { id: 'milkyway', at: 259, hold: 100, move: 60, far: true }, { id: 'firstlight', at: 419, hold: 80, move: 55 });
  G.SKY.dt = 0;   // (as skyInit makes it: the opening part way through its first hold, seq[0].at below 0; SKY.dt 0 outside dev)
  assert.deepEqual(Array.from(G.airClock(0)), [0, 0, 0], 'the clocks start at the flight\'s start'); assert.ok(G.airClock(1 / 60)[0] < 1 / 60 + 1e-12, 'and run no faster than the wind: no jump at the start');
  const h = 0.01; let I = [0, 0, 0], prev = G.weather(0).slice(), worst = 0, worstI = 0, last = G.airClock(0).slice();
  for (let t = h; t <= 520; t += h) {
    const w = G.weather(t).slice();
    for (let c = 0; c < 3; c++) { I[c] += (w[c] + prev[c]) / 2 * h; worst = Math.max(worst, Math.abs(w[c] - prev[c])); }
    const C = G.airClock(t);
    for (let c = 0; c < 3; c++) { worstI = Math.max(worstI, Math.abs(C[c] - I[c])); assert.ok(C[c] > last[c], 'each clock runs forward'); last[c] = C[c]; }
    prev = w;
  }
  assert.ok(worst < 0.002, `the shares step ${worst.toFixed(4)} in 10 ms (eased with the sky, never a jump)`);
  assert.ok(worstI < 1e-4, `the clocks are the shares' integral (off by ${worstI.toExponential(2)} s)`);
  assert.deepEqual(G.weather(30).slice(), [1, 1, 1], 'a hold: its own sky\'s'); assert.deepEqual(G.weather(180).slice(), T.bluehour, 'the next hold: the next sky\'s');
  // by height: the particles (20 m and under) on the surface's share, the jet at 100-300 m, the free air's 1 by 1500 m
  const t = 420, w = G.weather(t).slice();
  for (const y of [0.8, 5, 13, 20]) assert.equal(G.airShare(y, t), w[0], `at ${y} m the surface's share`);
  for (const y of [100, 200, 300]) assert.ok(Math.abs(G.airShare(y, t) - w[1]) < 1e-12, `at ${y} m the jet's`);
  assert.equal(G.airShare(1500, t), 1); assert.ok(G.airShare(40, t) > Math.min(w[0], w[1]) && G.airShare(40, t) < Math.max(w[0], w[1]), 'the birds\' 40 m between');
  for (const y of [5, 40, 200]) {   // the carried distance is the wind's own integral at each height
    let n = 0; for (let i = 0; i < Math.round(t / h); i++) n += (G.airShare(y, i * h) + G.airShare(y, (i + 1) * h)) / 2 * h;
    assert.ok(Math.abs(G.airCarried(y, t) - n) < 1e-3, `at ${y} m the gusts are carried by the wind's integral`);
  }
  // the readers: the wind and the gusts take the sky's share; a grain or a gust moves on by no more than its wind a frame
  const V = visit(G, SEEDS[3]), b = G.windAt(0, 0, 5, 30, V), Wd = Math.hypot(b.x, b.z), n = G.windAt(0, 0, 5, t, V);
  assert.ok(Math.abs(Math.hypot(n.x, n.z) - Wd * w[0]) < 1e-9, 'the wind at 5 m: the day\'s times the sky\'s share');
  assert.ok(Math.abs(G.gustSigma(40, V, t) - 0.26 * w[2] * G.airShare(40, t) * Math.hypot(G.windAt(0, 0, 40, 30, V).x, G.windAt(0, 0, 40, 30, V).z)) < 1e-9, 'sigma: the day\'s, the share, the gustiness');
  let gj = 0, gp = G.gustAt(40, -15, 5, 40, V);
  for (let x = 40 + 1 / 60; x < 300; x += 1 / 60) { const g = G.gustAt(40, -15, 5, x, V); gj = Math.max(gj, Math.abs(g - gp)); gp = g; }
  assert.ok(gj < 0.05 * G.gustSigma(5, V, 30), `through a change the gust steps ${gj.toFixed(4)} m/s a frame (no jump)`);
  G.airFrameU(t, 1 / 60);
  assert.ok(Math.abs(G.UAIR[0] - G.airClock(t)[0]) < 1e-3 && G.UAIR[1] === Math.fround(w[0]) && G.UAIR[2] === Math.fround(w[2]) && G.UAIR[0] > G.UAIR[3], 'uAir: the surface\'s clock on uT\'s footing, its share, the gustiness, the clock a frame back');
  assert.match(WORLD, /airFrameU\(UT\[0\] - AIR_UT0, MBS\.dt\);/, 'set with the shaders\' clock (held with it)');
  assert.match(WORLD, /if \(u\.uAir\) gl\.uniform4fv\(u\.uAir, UAIR\);/, 'given to every program that reads it');
  const vp = GLSL('vs-particle.glsl');
  assert.ok(/vec2 pos = p0 \+ vel\.xz \* tau \+/.test(vp) && !/vel\.xz \* t \+/.test(vp), 'the grains carried by the air\'s clock, never the wind times the time');
  // the score: the world's own table, read only, by its feed
  const SC = fs.readFileSync(path.join(ROOT, 'src', 'score.js'), 'utf8');
  assert.match(WORLD, /air: airTable\(\), still:/, 'the feed hands the score the table');
  const c = G.airTable(); c.afterglow[0] = 9; assert.equal(T.afterglow[0], 1, 'a copy: the score never writes the world\'s');
  assert.ok(/function breeze\(id\) \{ var a = S\.air && S\.air\[id\];/.test(SC) && /S\.air = F\.air/.test(SC), 'the score\'s breeze is the feed\'s table');
  assert.ok(!/\b(afterglow|bluehour|firstlight|moonlit|milkyway|aurora)\s*:\s*\[\s*0?\.\d+\s*,\s*0?\.\d+\s*\]/.test(SC), 'no breeze of the score\'s own by sky');
});

test('air: the weather the wind makes (mist on still nights and before sunrise, the ridge\'s lee waves, the sand haze)', () => {
  const G = page(), skies = Object.keys(G.WSKY), N = 400, out = {};
  for (const id of skies) assert.ok(typeof G.AIR_MIST[id] === 'number', `the sky ${id} has its mist`);
  G.SKY.dt = 0;
  for (const id of skies) {
    G.SKY.seq.length = 0; G.SKY.seq.push({ id, at: 0, hold: 1e6, move: 60 });
    const r = { mist: [], oro: 0, dust: 0, vis: [] };
    for (let i = 0; i < N; i++) {
      const V = { seed: (i * 2654435761 + 99) >>> 0 }; V.u10 = G.airU10(V.seed);
      const a = G.airWx(10, V), b = G.airWx(500, V);
      assert.deepEqual([a.mist, a.oro, a.vis], [b.mist, b.oro, b.vis], 'constant through a hold');
      if (a.moist > 0) r.mist.push(a.mist / a.moist); r.oro += a.oro > 0.5; r.dust += a.dust > 0.5; r.vis.push(a.vis);   // (the mist per unit of the visit's moisture: the sky's and the wind's part)
      assert.ok(a.mist >= 0 && a.mist <= G.AIR_MIST[id] + 1e-12 && a.vis >= 4 - 1e-12 && a.vis <= 10 + 1e-12 && a.oro >= 0 && a.oro <= 1);
    }
    r.mist.sort((x, y) => x - y);
    out[id] = { mistMed: r.mist[r.mist.length >> 1], mistMax: r.mist[r.mist.length - 1], moistN: r.mist.length, oro: r.oro / N, dust: r.dust / N, visMin: Math.min(...r.vis) };
  }
  if (process.env.WX) console.log(JSON.stringify(out));
  assert.equal(out.afterglow.mistMax, 0, 'the afterglow: no mist');
  assert.ok(out.firstlight.mistMed > 8, `first light: mist about 10 m on a still morning (median ${out.firstlight.mistMed.toFixed(1)})`);
  for (const n of ['moonlit', 'milkyway', 'aurora']) assert.ok(out[n].mistMax <= 3.5 + 1e-9 && out[n].mistMed > 2, `${n}: 3-4 m`);
  // the windiest visits: no mist (a surface wind past 4.5 m/s mixes it up)
  const V = { seed: 1, u10: 7.5 }; G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'bluehour', at: 0, hold: 1e6, move: 60 });
  assert.equal(G.airWx(5, V).mist, 0, 'the blue hour at the windiest: none');
  for (const id of skies) assert.ok(Math.abs(out[id].oro - out.afterglow.oro) < 1e-12 && Math.abs(out[id].dust - out.afterglow.dust) < 1e-12 && out[id].visMin === out.afterglow.visMin, `${id}: the lee-wave gate and the haze the visit's own (U10 alone), the same in every sky`);
  assert.ok(out.afterglow.oro > 0.05 && out.afterglow.oro < 0.4, `the ridge's lee waves on the windier visits only (${(100 * out.afterglow.oro).toFixed(0)}% of visits)`);
  assert.ok(out.afterglow.dust > 0.05 && out.afterglow.dust < 0.4 && out.afterglow.visMin < 5, 'the sand haze only on the visits past the sand\'s threshold, the visibility 10 km clean, 4-5 km in blown sand');
  // through every change of sky, at every wind: the mist's level never faster than 0.01 m in 50 ms; the gate and the haze never move
  let worst = 0, wv = 0;
  for (const A of skies) for (const B of skies) {
    if (A === B) continue;
    G.SKY.seq.length = 0; G.SKY.seq.push({ id: A, at: -20, hold: 40, move: 55 }, { id: B, at: 75, hold: 300, move: 60 });
    for (let u = 3; u <= 7.5; u += 0.25) {
      const W = { seed: 2, u10: u }; let p = G.airWx(0, W).mist; const o0 = G.airWx(0, W).oro, v0 = G.airWx(0, W).vis;
      for (let i = 1; i <= 3600; i++) { const o = G.airWx(i * 0.05, W); worst = Math.max(worst, Math.abs(o.mist - p)); p = o.mist; wv = Math.max(wv, Math.abs(o.oro - o0), Math.abs(o.vis - v0)); }
      assert.ok(Math.abs(p - G.airWx(1e4, W).mist) < 1e-9, `${A} into ${B} at ${u} m/s: the mist reaches the next sky's level within its hold`);
    }
  }
  assert.ok(worst <= 0.01 + 1e-12, `the mist's level moves ${worst.toFixed(4)} m in 50 ms (at most 0.01: 0.2 m/s)`);
  assert.equal(wv, 0, 'the gate and the haze never move through a change');
});

test('air: the mist by the visit\'s moisture (its marine layer in on a calm day): a find on about 1 visit in 3, never a fixture; MIST a copy', () => {
  const G = page();
  // the 16 openings (hour.js: seed k = 11 + k * 0x9e3779b9), each the visit's for the whole visit; dunes in view where the sand province is near the start (the world's own maps)
  const A1 = '  var CW = (function () {\n', A2 = '  var MAPS = {', A3 = '  var KN = 256, KSTEP = 64,';
  const E1 = '\n  })();\n', E2 = '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', E3 = '  var KFROWS = FN * FN / KN;';
  const mapsFn = vm.runInThisContext('(function (G) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180;\n' + cut(WORLD, A1, E1, true) + cut(WORLD, A2, E2, true) + cut(WORLD, A3, E3) + '\n  G.mapsInit = mapsInit; G.kitAt = kitAt;\n})');
  const rows = [];
  for (let k = 0; k < 16; k++) {
    const seed = (11 + Math.imul(k, 0x9e3779b9)) >>> 0, V = { seed }; V.u10 = G.airU10(seed);
    const M = {}; mapsFn(M); M.mapsInit(seed); let wD = 0; for (let j = 0; j < 100; j++) { const a = j * 2.4, r = 800 * Math.sqrt(j / 100); wD += M.kitAt(r * Math.cos(a), r * Math.sin(a)).wD / 100; }
    G.SKY.dt = 0; G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'firstlight', at: 0, hold: 1e6, move: 60 });
    rows.push({ k, u10: +V.u10.toFixed(2), moist: +G.airWx(5, V).moist.toFixed(3), mist: +G.airWx(5, V).mist.toFixed(2), dunes: wD > 0.1 });
  }
  if (process.env.WX) console.log(JSON.stringify(rows));
  const misty = rows.filter((r) => r.mist >= 1), dunes = rows.filter((r) => r.dunes), dm = dunes.filter((r) => r.mist >= 1);
  assert.ok(misty.length >= 4 && misty.length <= 6, `first-light mist of 1 m or more on ${misty.length} of the 16 openings, not about 1 in 3`);
  assert.ok(dm.length >= 2 && dm.length <= 3, `on ${dm.length} of the ${dunes.length} openings with dunes in view, not about 1 in 4`);
  const deep = dunes.filter((r) => r.mist >= 5), shallow = dunes.filter((r) => r.mist < 5);
  assert.equal(deep.length, 3, `pools at the cut need about 5 m: ${deep.length} of the ${dunes.length} dune openings get it, not 3 (the hub's ruling, with LAND)`);
  assert.ok(shallow.every((r) => r.mist < 2), 'the other dune openings stay under 2 m (no pools), never in the useless middle');
  // over the visits (the speeds' own distribution): about 1 in 3 to 1 in 4 moist
  let n = 0; const N = 20000; for (let i = 0; i < N; i++) { const V = { seed: (i * 2654435761 + 7) >>> 0 }; V.u10 = G.airU10(V.seed); n += G.airWx(5, V).moist > 0.1; }
  assert.ok(n / N > 0.22 && n / N < 0.36, `moist on ${(100 * n / N).toFixed(1)}% of visits, not about 1 in 3 to 1 in 4`);
  // the visit's own: calmer is moister, none on a windy day, the same through every sky
  let last = 2; for (let u = 3; u <= 7.5; u += 0.1) { const m = G.airWx(5, { seed: 1, u10: u }).moist; assert.ok(m <= last + 1e-12, 'calmer is moister'); last = m; }
  assert.equal(G.airWx(5, { seed: 1, u10: 4.5 }).mist, 0, 'a breezy first light: no mist (the marine layer mixed out)');
  for (const id of Object.keys(G.WSKY)) { G.SKY.seq.length = 0; G.SKY.seq.push({ id, at: 0, hold: 1e6, move: 60 }); assert.equal(G.airWx(5, { seed: 1, u10: 3.9 }).moist, G.airWx(5, { seed: 1, u10: 3.9 }).moist, 'the same in every sky'); }
  const M1 = G.AIRAPI.MIST(); M1.firstlight = 99; assert.equal(G.AIR_MIST.firstlight, 10, 'MIST hands a reader a copy, never the table');
  const B1 = G.AIRAPI.BYSKY(); B1.afterglow[0] = 99; assert.equal(G.AIR_BYSKY.afterglow[0], 1, 'BYSKY hands a reader a copy, never the table');
});

test('air: the gusts by sky: carried at the mean wind in every sky (row 6), the streaks on the veils\' own wind', () => {
  const G = page(), med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1], out = {}, lag = {};
  G.SKY.dt = 0;
  assert.ok(Object.values(G.AIR_BYSKY).every((r) => r.length === 3), 'each sky: its surface share, its jet share, its gustiness (no slide)');
  for (const id of Object.keys(G.AIR_BYSKY)) {
    G.SKY.seq.length = 0; G.SKY.seq.push({ id, at: -10, hold: 1e6, move: 60 });
    const s = G.AIR_BYSKY[id][0], taus = [], lags = [], dt = 0.25 / s, N = 2400;   // (sampled at the sky's own pace: the same field, slower)
    for (const seed of SEEDS.slice(0, 8)) {
      const V = visit(G, seed), U = G.airSpeed(10, V), u = new Float64Array(N), d = new Float64Array(N), w = V.wind;
      for (let i = 0; i < N; i++) { u[i] = G.gustAt(0, 0, 5, i * dt, V); d[i] = G.gustAt(100 * w[0], 100 * w[1], 5, i * dt, V); }
      let m = 0, v0 = 0; for (let i = 0; i < N; i++) m += u[i] / N; for (let i = 0; i < N; i++) v0 += (u[i] - m) ** 2 / N;
      for (let L = 1; L < N / 2; L++) { let c = 0; for (let i = 0; i + L < N; i++) c += (u[i] - m) * (u[i + L] - m); if (c / (N - L) / v0 < 1 / Math.E) { taus.push(L * dt); break; } }
      let best = -2, at = 0; for (let L = 0; L < N / 4; L++) { let c = 0, a2 = 0, b2 = 0; for (let i = 0; i + L < N; i++) { c += u[i] * d[i + L]; a2 += u[i] * u[i]; b2 += d[i + L] * d[i + L]; } const r = c / Math.sqrt(a2 * b2); if (r > best) { best = r; at = L * dt; } }
      assert.ok(best > 0.95, `${id}: a gust 100 m downwind is the same gust (r ${best.toFixed(3)}): never slid across the wind`);
      lags.push(at / (100 / (s * U)));
    }
    out[id] = med(taus); lag[id] = med(lags);
    assert.ok(Math.abs(lag[id] - 1) < 0.1, `${id}: a point 100 m downwind meets each gust 100 / (s U10) s later: ${lag[id].toFixed(3)} of it`);
  }
  for (const id of Object.keys(out)) {   // (the frozen field at the surface's pace: a calm sky's e-fold the day's over its share; the day's within row 6)
    const k = out[id] * G.AIR_BYSKY[id][0] / out.afterglow;
    assert.ok(Math.abs(k - 1) < 0.15, `${id}: the e-fold ${out[id].toFixed(1)} s is the day's ${out.afterglow.toFixed(1)} s over the share ${G.AIR_BYSKY[id][0]} (${k.toFixed(3)})`);
  }
  assert.ok(out.afterglow >= 10 && out.afterglow <= 30, `the day's e-fold median ${out.afterglow.toFixed(1)} s, not row 6's 10-30 s`);
  if (process.env.EF) console.log(JSON.stringify({ efold: out, lag }));
  const fr = GLSL('fs-ribbon.glsl');
  assert.ok(/\(dot\(vW\.xz, w\) - uAir\.x \* length\(uWind\.xz\)\) \* 0\.035/.test(fr) && !/\buT\b/.test(fr), 'the sand\'s streaks carried at the veils\' own wind on the air\'s clock, never a pace of their own');
  assert.ok(!/uAirM|UAIRM/.test(WORLD + GLSL('vs-ribbon.glsl')), 'no meander clock: the field is carried along the wind only');
});

