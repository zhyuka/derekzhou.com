// test/unit/air.mjs: the air (src/world/215-air.js), the world's one state: every reader of the wind points the way the
// visit's wind blows and has the speed of airSpeed at its own declared height, or is listed in AIR_APART with the change
// that joins it (and is then still apart: a reader joined is taken off the list); the key light is one for every sky,
// and the clouds' bake, the land and the birds read it; each sky's own sun stands where AIR_SUN_EL puts it, on the key's
// azimuth. A fake page: the streams, the vector maths and the air from the dev build, realm-dunes.js run on a stub kit
// (RULES.json one-world-state; tools/checks/42-one-air.sh keeps the literals out of the other sections).
// plant: {"file": "src/world/215-air.js", "find": "      if (o === 'milkyway') S.lst0 = airGalLst(S, V);", "with": "", "why": "a milkyway opening at the night's depth's hour: its band hangs near-upright or out of frame"}
// plant: {"file": "src/world/512-score-feed.js", "find": "w.bear = Math.atan2(w.z * fx - w.x * fz,", "with": "w.bear = Math.atan2(w.x * fz - w.z * fx,", "why": "the wind's bearing on the wrong side of the eye"}
// plant: {"file": "src/world/512-score-feed.js", "find": "w.ax = w.x - (st ? 0 : s * v - c * CS.sv);", "with": "w.ax = w.x + (st ? 0 : s * v - c * CS.sv);", "why": "the apparent wind with the camera's motion added, not taken off"}
// plant: {"file": "src/world/212-cloud-drift.js", "find": "var a = airBase(0, 0, layer === 'deck' ? AIR_H.deck : AIR_H.clouds, V); o[0] = a.x; o[1] = a.z; return o;", "with": "o[0] = 6.5; o[1] = 0; return o;", "why": "the clouds' wind a literal of its own again"}
// plant: {"file": "src/world/170-world-itself.js", "find": "seed: r.seed(), D: Infinity", "with": "seed: r.seed() ^ 1, D: Infinity", "why": "the live visit's seed off the openings test's"}
// plant: {"file": "src/world/215-air.js", "find": "oro: [7.2, 8.2], oroU: 7.7, N: 0.01,", "with": "oro: [7.2, 8.2], oroU: 7.7, N: 0.02,", "why": "the lens's lee wave on a buoyancy frequency of the weather's own"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_MOIST = [4.02, 4.1];", "with": "var AIR_MOIST = [3.9, 4.3];", "why": "the moisture band set on the page's seed, not the live visit's (pools at the cut on the wrong dune openings)"}
// plant: {"file": "src/world/215-air.js", "find": "return d === undefined ? 0 : q * d; }", "with": "return d === undefined ? 0 : d; }", "why": "the mist on every visit again (no moisture)"}
// plant: {"file": "src/world/215-air.js", "find": "e = Math.max(Math.asin(Math.max(-1, Math.min(1, d[1]))), AIR_KEY_EL[0] * DEG);", "with": "e = Math.asin(Math.max(-1, Math.min(1, d[1])));", "why": "the land lit from a moon under the horizon"}
// plant: {"file": "src/world/215-air.js", "find": "var e = seq[i], a = e.id === 'moonlit' ? 1 : 0, b = seq[i + 1] ? (seq[i + 1].id === 'moonlit' ? 1 : 0) : a,", "with": "var e = seq[i], a = airSunEl(e.id) === null ? 1 : 0, b = seq[i + 1] ? (airSunEl(seq[i + 1].id) === null ? 1 : 0) : a,", "why": "every night lit by the moon (the moonlit sky's light only)"}
// plant: {"file": "src/world/215-air.js", "find": "return airTurnLow(k, AIR_LDT, rz, f, AIR_LD);", "with": "for (c = 0; c < 3; c++) AIR_LD[c] = k[c] + (AIR_LDT[c] - k[c]) * f; return AIR_LD;", "why": "the key cutting through the sky (a great circle overhead, not low across)"}
// plant: {"file": "src/world/215-air.js", "find": "dz = dr + w(zb - za - dr);", "with": "dz = w(zb - za);", "why": "the way round flipping as the disc passes opposite the key (a jump)"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "float cs = dot(rd, uKey), g = uClK.z;", "with": "float cs = dot(rd, uSun), g = uClK.z;", "why": "a cloud's silver edge on the live key, its self-shadow on the baked one"}
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "gl.uniform3fv(u.uSun, airLightDir(L));", "with": "gl.uniform3fv(u.uSun, L.sunDir);", "why": "the night lit by the key, 36 deg off the moon"}
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "if (u.uSun) gl.uniform3fv(u.uSun, airLightDir(L));", "with": "if (u.uSun) gl.uniform3fv(u.uSun, skySphere(SIM.t + SKY.dt).sun);", "why": "the land lit by the frame's sun (a light under the horizon 70% of a night)"}
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "if (u.uSun) gl.uniform3fv(u.uSun, airLightDir(L));", "with": "if (u.uSun) gl.uniform3fv(u.uSun, skySphere(SIM.t + (SKY.dt || 0), V).sun);", "why": "the land lit by the frame's sun through a nested call (#333's call shape)"}
// plant: {"file": "src/world/215-air.js", "find": "return f.W > 0 ? airClock(t)[0] - (x * f.x + z * f.z) / f.W : NaN;", "with": "return f.W > 0 ? t - (x * f.x + z * f.z) / f.W : NaN;", "why": "HOST.gustPhase on the flight's clock, not the field's"}
// plant: {"file": "src/world/215-air.js", "find": " BYSKY: airTable,", "with": " BYSKY: function () { return AIR_BYSKY; },", "why": "BYSKY handing readers the live table"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_MIST_RATE = 0.18,", "with": "var AIR_MIST_RATE = 0.5,", "why": "the mist racing through a change"}
// plant: {"file": "src/world/215-air.js", "find": "o.dust = airEase(K.dust[0], K.dust[1], u);", "with": "o.dust = airEase(K.dust[0], K.dust[1], u * weather(t)[0]);", "why": "the haze changing with the sky (the far land fading in place)"}
// plant: {"file": "src/world/215-air.js", "find": "return f.W > 0 ? airClock(t)[0] - (x * f.x + z * f.z) / f.W : NaN;", "with": "return f.W > 0 ? t - (x * f.x + z * f.z) / f.W : NaN;", "why": "HOST.gustPhase on the flight's clock, not the field's"}
// plant: {"file": "src/world/215-air.js", "find": "return { x: a.x, z: a.z }; }   // the day's wind", "with": "return a; }   // the day's wind", "why": "the day's wind handed out as the air's own reused object"}
// plant: {"file": "src/world/glsl/fs-ribbon.glsl", "find": "(dot(vW.xz, w) - uAir.x * length(uWind.xz)) * 0.035", "with": "dot(vW.xz, w) * 0.035 - uT * 0.22", "why": "the veils' streaks at a pace of their own"}
// plant: {"file": "src/world/215-air.js", "find": "eta = (z * f.x - x * f.z) / L + oz;", "with": "eta = (z * f.x - x * f.z - U * 0.6 * T[1]) / L + oz;", "why": "the gusts slid across the wind (row 6: carried at the mean wind)"}
// plant: {"file": "src/world/215-air.js", "find": "if (tS <= seq[0].at) { var A0 = airSh(seq[0]); for (c = 0; c < AIR_NC; c++) out[c] = (tS - seq[0].at) * A0[c]; return out; }", "with": "if (tS <= 0) { var A0 = airSh(seq[0]); for (c = 0; c < AIR_NC; c++) out[c] = tS * A0[c]; return out; }", "why": "the wind's clock jumps at the flight's start (the opening part way through its hold)"}
// plant: {"file": "src/world/413-draw-frame.js", "find": "airFrameU(UT[0] - AIR_UT0, MBS.dt);", "with": "airFrameU(UT[0], MBS.dt);", "why": "the veils and the grains carried 40 s ahead of the birds"}
// plant: {"file": "src/world/215-air.js", "find": "xi = (x * f.x + z * f.z - U * T[0]) / L + ox,", "with": "xi = (x * f.x + z * f.z - U * airCarried(y, t)) / L + ox,", "why": "each height carried at its own speed (a bird over a veil feels another gust)"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "float a = uPc.a * 0.55 *", "with": "float a = uPc.a * 0.55 * mix(0.15, 1.0, gust) *", "why": "the veils fading with the gust again"}
// plant: {"file": "src/world/370-frame-uniforms.js", "find": "if (u.uSkyS) gl.uniform3fv(u.uSkyS,", "with": "var FS = skySphere(SIM.t + SKY.dt, V); if (u.uSun) gl.uniform3fv(u.uSun, FS.sun); if (u.uSkyS) gl.uniform3fv(u.uSkyS,", "why": "the land lit by the frame's sun through a name"}
// plant: {"file": "src/world/215-air.js", "find": "var lst = S.lst0 + SKY_RATE * 2 * PI / AIR_SIDEREAL * tS,", "with": "var lst = S.lst0 + SKY_RATE * 2 * PI / AIR_SIDEREAL * tS * (1 + 0.5 * Math.sin(tS / 40)),", "why": "the sky turning at a pace of its own (faster, slower, back)"}
// plant: {"file": "src/world/215-air.js", "find": "S.lst0 = airSunH(el === null ? AIR_SUN_NIGHT : el, o === 'firstlight', S.dec) + S.ra;", "with": "S.lst0 = airSunH(el === null ? AIR_SUN_NIGHT : el, false, S.dec) + S.ra;", "why": "a first-light opening's sun in the evening"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_LAT = 64, AIR_OBL = 23.4393,", "with": "var AIR_LAT = 64, AIR_OBL = 0,", "why": "the ecliptic laid on the equator"}
// plant: {"file": "src/world/215-air.js", "find": "o.az = m.az; o.el = m.el; o.up = m.w > 0;", "with": "o.az = m.el; o.el = m.az; o.up = m.w > 0;", "why": "the moon's az and el swapped"}
// plant: {"file": "src/world/215-air.js", "find": "o.az = m.az; o.el = m.el; o.up = m.w > 0;", "with": "o.az = m.az; o.el = m.el; o.up = m.w >= 0;", "why": "a moon of no weight counted up"}
// plant: {"file": "src/world/215-air.js", "find": "var m = moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, AIR_MOONS);", "with": "var m = moonShown(SIM.t, AIR_MOONS);", "why": "the moon's direction a step behind the drawn disc"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "vec3 nOff = uVO;", "with": "vec3 nOff = uVO + vec3(uT * 0.004, 0.0, uT * 0.003);", "why": "the cloud billows slide by a clock of their own again"}
// plant: {"file": "src/world/490-birds-host.js", "find": "o[0] = a.x; o[1] = 0; o[2] = a.z;", "with": "o[0] = a.z; o[1] = 0; o[2] = a.x;", "why": "the birds' air across the sand's"}
// plant: {"file": "src/world/215-air.js", "find": "AIR_Z0 = 0.003,", "with": "AIR_Z0 = 0.03,", "why": "the sand ten times rougher (the profile's shares off)"}
// plant: {"file": "src/world/215-air.js", "find": "var AIR_GUST = [0.26, 22,", "with": "var AIR_GUST = [0.12, 22,", "why": "gusts too weak (the 3-s gust under 1.4 of the mean)"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "airGust(sp.xy, w, uAirU, Wv * uAir.y * uAir.z, uAir.x)", "with": "Wv * AIR_GUST_I * sin(uT * 0.9 + r1 * 7.0)", "why": "the veils on a private cycle again"}
// plant: {"file": "src/world/215-air.js", "find": "var w = windAt(x, z, y, t, V), wx = w.x, wz = w.z;", "with": "var w = windAt(x, z, y, t, V), wx = w.x + 0.02 * w.z, wz = w.z - 0.02 * w.x;", "why": "the air heard turned off the wind (the score's air from another way than the world's)"}
// plant: {"file": "src/world/215-air.js", "find": "carry: u10Of(V) * weather(t === undefined ? SIM.t : t)[0],", "with": "carry: Math.hypot(wx, wz),", "why": "the gusts carried at the wind heard, not at U10's share"}
// plant: {"file": "src/world/215-air.js", "find": "var a = airBase(x, z, y, V), k = airShare(", "with": "var a = airBase(x, z, y * 1.01, V), k = airShare(", "why": "windAt off the hand-computed wind (the profile at another height)"}
// plant: {"file": "src/world/215-air.js", "find": "return clamp((1.0 + e) * (1.0 + e), ", "with": "return clamp((1.0 + e), ", "why": "the grains' hop linear in the gust, not as the friction speed squared"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "airGust(xz, normalize(uWind.xz), uAirU, uAir.z, tau)", "with": "airGust(xz, normalize(uWind.xz), uAirU, uAir.z, uT)", "why": "the grains' gust on the frame's clock, not the air's"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "dot(uWind.xz, uWind.xz) > 1e-6 ? normalize(uWind.xz) : vec2(1.0, 0.0);", "with": "normalize(uWind.xz);", "why": "a windless rain normalizing a zero vector (NaN)"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "airGust(xz, wd, uAirU, uAir.z, uAir.x) / AIR_GUST_I);", "with": "gn(vec2(uT * 0.045, 3.7)) + 0.5);", "why": "the rain's gusts a pulse of the whole screen's again"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "k * uWind.xz * (uAir.x - tau)", "with": "k * uWind.xz * (uT - t)", "why": "the grains carried by the wind times the time (a change of sky jumps them)"}
// plant: {"file": "src/score.js", "find": "return a ? [WIND_DAY * a[0], a[2]] : [0, 0];", "with": "return { afterglow: [0.35, 1], bluehour: [0.2, 0.65] }[id] || [0.2, 0.65];", "why": "the score with a breeze of its own by sky"}
// plant: {"file": "src/world/215-air.js", "find": "for (c = 0; c < AIR_NC; c++) AIR_WX[c] = A[c] + (B[c] - A[c]) * q;", "with": "for (c = 0; c < AIR_NC; c++) AIR_WX[c] = k < 0.5 ? A[c] : B[c];", "why": "the wind jumps at a change of sky"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec3 prev = grain(id, uT - uMBdt, uAir.w, e2);", "with": "vec3 prev = head;", "why": "the motes' streak the camera's motion only (a windy mote a dot that jumps)"}
// plant: {"file": "src/world/210-cloud-volumes-baking.js", "find": "var sd = keyAt(V), cy", "with": "var sd = dirAzEl(V.light.sunAz, 9), cy", "why": "the clouds baked along a sun of their own"}
import { test, assert, fs, path, vm, ROOT, TMP, execFileSync, WORLD, cut, STREAMS, VEC } from '../unit-lib.mjs';

const AIR = cut(WORLD, '  /* ---------------------------------------------------------------- the air: the world\'s one state', '  /* ---------------------------------------------------------------- the time of day */');
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const CLOUDW = cut(WORLD, '  function cloudWind(', '  /* a tower\'s lean');
const LDEF = cut(WORLD, '  var LDEF = {', '  var LKC = ');
const HOSTWIND = cut(WORLD, '    wind: function (o, y) {', '\n', true) + cut(WORLD, '    gust: function (x, z, y) {', '\n', true) + cut(WORLD, '    gustPhase: function (x, z, y) {', '\n', true) + cut(WORLD, '    gustSigma: function (y) {', '\n', true);
const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const GLSL = (f) => fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', f), 'utf8');
const SEEDS = Array.from({ length: 16 }, (_, i) => (i * 2654435761 + 12345) >>> 0);

function page() {   // the air on a fake page (no clock, no DOM), and the dunes' kit registered on it
  const G = vm.runInThisContext('(function (W) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, SIM_DT = 1 / 60, SIM = { V: null, t: 0, alpha: 1 }, CS = { x: 0, z: 0 }, J = { seed: 0 };\n' +
    '  var MSTUB = null; function moonShown(t, o) { o.t = t; if (typeof MSTUB === \'function\') return MSTUB(t, o); if (MSTUB) { o.d = MSTUB.d.slice(); o.w = MSTUB.w; o.az = MSTUB.az; o.el = MSTUB.el; } return o; }\n' + STREAMS + VEC + AIR + CLOUDW + SKYDEF + LDEF +
    '  var HOST = {\n' + HOSTWIND + '  };\n' +
    '  return { SIM: SIM, J: J, RNG: RNG, subseed: subseed, AIRAPI: AIRAPI, AIR_DIR: AIR_DIR, AIR_H: AIR_H, cloudWind: cloudWind, AIR_APART: AIR_APART, AIR_SUN_EL: AIR_SUN_EL,\n' +
    '    AIR_KEY_EL: AIR_KEY_EL, AIR_KEY_AZ: AIR_KEY_AZ, SKY_RATE: SKY_RATE, AIR_GRAIN_K: AIR_GRAIN_K, airProfile: airProfile, airU10: airU10, gustAt: gustAt, gustPhase: gustPhase, gustSigma: gustSigma, AIR_GUST: AIR_GUST, AIR_GOCT: AIR_GOCT, AIR_HOP: AIR_HOP, airGustGlsl: airGustGlsl, airSpeed: airSpeed, windAt: windAt, airHeard: airHeard, airKeySet: airKeySet, keyAt: keyAt, airSunEl: airSunEl, airSkySun: airSkySun, skyFrame: skyFrame, airHeading0: airHeading0,\n' +
    '    airWx: airWx, AIR_WXK: AIR_WXK, AIR_MIST: AIR_MIST, AIR_MOIST: AIR_MOIST, SKY: SKY, weather: weather, airClock: airClock, airShare: airShare, airCarried: airCarried, AIR_BYSKY: AIR_BYSKY, airTable: airTable, airFrameU: airFrameU, UAIR: UAIR,\n' +
    '    SKY: SKY, airMoonDir: airMoonDir, AIR_MOON: AIR_MOON, AIR_MOONS: AIR_MOONS, stub: function (m) { MSTUB = m; }, airLightDir: airLightDir, airMoonShare: airMoonShare, AIR_KEY_EL: AIR_KEY_EL,\n' +
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
  const V = { seed, salt: G.subseed(seed, 7) >>> 0 };   // (planVisit's V.salt)
  V.field = G.dunes.field(G.RNG(G.subseed(seed, 1)), V);
  V.light = G.dunes.light(G.RNG(G.subseed(seed, 2)), V);
  G.airKeySet(V.light);
  V.parts = []; V.ribbons = G.dunes.ribbons(V);   // (the grains and the motes are gone: the veils are the sand's one air set)
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
        veils: [[V.ribbons.wind[0], V.ribbons.wind[2]], G.AIR_H.veils],
        birds: [(() => { const o = G.HOST.wind([9, 9, 9]); assert.equal(o[1], 0); return [o[0], o[2]]; })(), G.AIR_H.birds],
        water: [G.LDEF.windDir, null],
        clouds: [Array.from(G.cloudWind(V, 'low')), G.AIR_H.clouds],   // (physics: clouds/drift: the free clouds carried, the billows riding with them)
        deck: [Array.from(G.cloudWind(V, 'deck')), G.AIR_H.deck],   // (the high streaks drift with it, lying along it: sky-body's uDeck)
      };
      for (const [name, [v, h]] of Object.entries(readers)) {
        // (aloft the air veers clockwise of the surface's way, airProfile(h).veer: the readers there blow the air's way at their height)
        const vr = typeof h === 'number' ? G.airProfile(h).veer * Math.PI / 180 : 0, dh = [d[0] * Math.cos(vr) + d[1] * Math.sin(vr), d[1] * Math.cos(vr) - d[0] * Math.sin(vr)];
        const u = unit(v[0], v[1]), ok = h === 'axis' ? Math.abs(u[0] * d[1] - u[1] * d[0]) < 1e-6 : near(u, dh);
        if (name in G.AIR_APART) { if (!ok) apart[name] = true; continue; }
        assert.ok(ok, `seed ${seed}, ${sky}: ${name} blows toward ${u.map((x) => x.toFixed(4))}, the air toward ${dh.map((x) => x.toFixed(4))}`);
        if (typeof h === 'number') {
          const s = G.airSpeed(h), w = G.windAt(0, 0, h, 0, V);
          const k = 1;
          assert.ok(Math.abs(Math.hypot(v[0], v[1]) - s * k) < 1e-9, `${name}: ${Math.hypot(v[0], v[1])} m/s, the profile ${s} (x ${k}) at ${h} m`);
          assert.ok(near([w.x, w.z], [dh[0] * s, dh[1] * s], 1e-12), 'windAt is the direction (veered at its height) times the profile');
        }
      }
    }
  }
});

test('air: the billows\' drift and the high streaks\' axis are the air\'s (the shaders hold no clock or axis of their own)', () => {
  const vb = GLSL('fs-vbody.glsl').replace(/\/\/[^\n]*/g, ''), sb = GLSL('sky-body.glsl');
  assert.ok(!/\buT\b/.test(vb), 'fs-vbody reads the clock: its billows would slide through a body that the air carries');
  assert.match(vb, /vec3 nOff = uVO;/, 'the billows\' offset is not the body\'s own (they ride with it: 212, cloudPos)');
  assert.match(sb, /vec2 dD = dot\(uDeck\.xy, uDeck\.xy\) > 0\.25 \? uDeck\.xy : vec2\(1\.0, 0\.0\);/, 'the streaks do not lie along the deck\'s wind (uDeck)');
  assert.match(WORLD, /var dW = cloudWind\(V, 'deck', DECKW\)/, 'the deck\'s wind is not the air\'s (cloudWind: windAt at AIR_H.deck)');
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
  assert.equal(WORLD.split('airHeading0()').length - 1, 6, 'its five readers (the first plan, the galaxy\'s lie, the flight, the boot, a milkyway opening\'s hour) and its one definition');
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
  // the air heard (the score's, at the camera): a hand-computed wind for a fixed visit (the log law at 10 m and under
  // 100 m, no veer; 2 x U10 veered 40 deg clockwise from 3000 m), the sky's share its one scalar; its gust, sigma and
  // clock the field's; carry the speed the gusts pass at (a gust met dx downwind dx / carry later, the same gust)
  { const Vf = { seed: 7, wind: [0.6, 0.8], u10: 5 }, c40 = Math.cos(40 * Math.PI / 180), s40 = Math.sin(40 * Math.PI / 180); let worst = 0;
    for (let i = 0; i < 200; i++) {
      const x = 900 * Math.sin(i * 1.7), z = 700 * Math.cos(i * 0.9), hi = i % 2, y = hi ? 3000 + (i % 7) * 400 : 2 + (i % 7) * 14, t = i * 3.1, h = G.airHeard(x, z, y, t, Vf), k = G.airShare(y, t);
      const e = hi ? [(0.6 * c40 + 0.8 * s40) * 10 * k, (0.8 * c40 - 0.6 * s40) * 10 * k] : [0.6 * 5 * k * Math.log(y / 0.003) / Math.log(10 / 0.003), 0.8 * 5 * k * Math.log(y / 0.003) / Math.log(10 / 0.003)];
      worst = Math.max(worst, Math.abs(h.x - e[0]), Math.abs(h.z - e[1]));
      assert.equal(h.gust, G.gustAt(x, z, y, t, Vf)); assert.equal(h.sigma, G.gustSigma(y, Vf, t)); assert.equal(h.phase, G.gustPhase(x, z, y, t, Vf)); assert.equal(h.y, y);
      assert.ok(Math.abs(h.carry - 5 * G.weather(t)[0]) < 1e-12, 'carry: U10 x the sky\'s surface share');
    }
    assert.ok(worst < 1e-6, `the air heard is the visit's wind, computed by hand: within 1e-6 m/s (worst ${worst.toExponential(2)})`);
    let off = 0; for (let i = 0; i < 40; i++) {   // the gust now at a point is met dx downwind dx / carry later (in held air: the sky's shares fixed)
      const x = 300 * Math.sin(i), z = 200 * Math.cos(i * 1.3), y = 10 + i, t = 50 + i * 7, h = G.airHeard(x, z, y, t, Vf), dx = 60 + 5 * i;
      off = Math.max(off, Math.abs(G.gustPhase(x + 0.6 * dx, z + 0.8 * dx, y, t + dx / h.carry, Vf) - h.phase)); }
    assert.ok(off < 0.05, `a gust reaches dx downwind dx / carry later (worst ${off.toFixed(3)} s on the field's clock)`);
    const a = G.airHeard(10, 20, 30, 40, Vf), b = G.airHeard(10, 20, 30, 40, Vf); assert.notEqual(a, b, 'a fresh object each time (the score may keep it)'); assert.deepEqual(a, b);
    const hs = G.airHeard(5, 7, 40, 3, Vs); assert.ok(hs.x === 0 && hs.z === 0 && hs.gust === 0 && hs.carry === 0 && Number.isNaN(hs.phase), 'still air: none heard'); }
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
  assert.match(WORLD, /if \(u\.uAirU\) gl\.uniform1f\(u\.uAirU, u10Of\(V\)\);/, 'the veils carry the field at the visit\'s U10 (every program that reads it: the frame\'s uniforms)');
  const alpha = vr.split('float a =')[1].split(';')[0];
  assert.ok(!/\bgust\b|\buAir\b|\buT\b/.test(alpha), 'a veil\'s opacity follows neither the gust, the sky\'s wind nor the clock (no fade: it rises and lies down): ' + alpha.trim());
  assert.ok(/max\(lie, mix\(lie, up, gust\)\)/.test(vr), 'at calm the sheet settles flat onto the sand');
  assert.ok(!/uRb|fract\(g\)/.test(vr), 'no private cycle of their own');
});

test('air: the grains hop with the gust (physics: air/grain-hop): (1 + e)^2 of the calm hop, e the field\'s excess over the wind', () => {
  const G = page(), g = G.airGustGlsl(), vp = GLSL('vs-particle.glsl'), F = (v) => (/[.e]/.test(String(v)) ? String(v) : v + '.0');
  // the hop as the friction speed squared: (1 + e)^2 held to AIR_HOP, run as the shaders run it (their airHop, in JS)
  const src = g.split('float airHop(float e) {')[1].split('}')[0], hop = new Function('e', 'clamp', src.replace(/(\d)\.0\b/g, '$1'));
  const H = (e) => hop(e, (v, a, b) => Math.min(Math.max(v, a), b));
  assert.equal(H(0), 1, 'the calm hop at e = 0');
  for (const e of [-0.4, -0.26, -0.1, 0.1, 0.26, 0.5]) assert.ok(Math.abs(H(e) - (1 + e) * (1 + e)) < 1e-12, `(1 + ${e})^2`);
  assert.equal(H(-0.9), G.AIR_HOP[0]); assert.equal(H(1.2), G.AIR_HOP[1]);
  for (let e = -1; e < 1.5; e += 0.01) assert.ok(H(e + 0.01) >= H(e), 'never lower in a stronger gust');
  assert.ok(H(0.26) > 1.5 && H(-0.26) < 0.6, 'a one-sigma gust of the day (0.26) about doubles the hop over a lull\'s');
  // the shaders' twin, the same range; the particles' program given the field; the grains (kind 0) read it on tau
  assert.ok(g.includes('float airHop(float e) { return clamp((1.0 + e) * (1.0 + e), ' + F(G.AIR_HOP[0]) + ', ' + F(G.AIR_HOP[1]) + '); }'), 'the shaders\' hop is airHop\'s');
  assert.match(WORLD, /GROUND_LIB \+ airGustGlsl\(\) \+ VS_PARTICLE,/, 'the particles\' program is given the gust field');
  assert.ok(/float e = uPb\.w < 0\.5 \? airGust\(xz, normalize\(uWind\.xz\), uAirU, uAir\.z, tau\) : 0\.0;/.test(vp), 'e the gust at the grain over the wind there: the gustiness alone as W, on the grain\'s own clock tau (its streak\'s tail a moment back)');
  assert.ok(/float hop = uPb\.x \* airHop\(e\) \* abs\(sin\(/.test(vp), 'the hop\'s height x airHop(e)');
  assert.ok(/vec2 pos = p0 \+ dr \+/.test(vp) && !/dr[^;]*airGust|pos[^;]*airGust/.test(vp), 'the drift stays the mean wind\'s closed form (a gust never moves a grain: nothing jumps)');
  assert.match(WORLD, /P = DP\.pt; gl\.useProgram\(P\.p\); setFrameUniforms\(P, V\);/, 'the grains carry the field at the visit\'s U10, as the veils (the frame\'s uniforms)');
});

test('air: the rain\'s gusts are the air\'s one field (physics: air/rain-gust), never a cycle of the whole screen\'s', () => {
  const vp = GLSL('vs-particle.glsl'), rain = vp.split('void rain(int id) {')[1].split('\nvoid ')[0];
  assert.ok(/vec2 wd = dot\(uWind\.xz, uWind\.xz\) > 1e-6 \? normalize\(uWind\.xz\) : vec2\(1\.0, 0\.0\);/.test(rain), 'a windless rain never normalizes a zero vector (NaN: every drop shown)');
  assert.ok(/float gust = 1\.0 \+ uPd\.z \* 0\.5 \* smoothstep\(0\.2, 1\.2, airGust\(xz, wd, uAirU, uAir\.z, uAir\.x\) \/ AIR_GUST_I\);/.test(rain), 'a drop\'s gust the field\'s at the drop, in the day\'s sigmas times the sky\'s gustiness, on the surface\'s clock');
  assert.ok(rain.indexOf('vec2 xz = uCam.xz + rel;') < rain.indexOf('float gust ='), 'read where the drop is');
  assert.ok(!/gn\(vec2\(t \*|\buT\b/.test(rain.split('float gust =')[1].split(';')[0]) && !/\bt = uT\b/.test(rain), 'no private clock: the whole rain never pulses at once');
});

test('air: a mote is drawn along its whole motion on the window (its own wind and the camera\'s), never a jumping dot', () => {
  const vp = GLSL('vs-particle.glsl');
  assert.ok(/vec3 prev = grain\(id, uT - uMBdt, uAir\.w, e2\);/.test(vp), 'the streak starts where the mote was a frame ago (its own wind, on the air\'s clock a frame back)');
  assert.ok(/uPVP2 \* vec4\(prev \+ uPCamD, 1\.0\)/.test(vp), 'seen from where the camera was (the mote the eye\'s, uPCamD the two cameras\' difference in the JS\'s doubles: large world)');
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
  assert.ok(/k \* uWind\.xz \* \(uAir\.x - tau\)/.test(vp) && !/uWind\.xz \* \(uT - t\)/.test(vp), 'the grains carried by the air\'s clock, never the wind times the time');
  assert.match(WORLD, /var t = air \? airClock\(UT\[0\] - AIR_UT0\)\[0\] : UT\[0\]/, 'their drift in boxes (wrapU) on the same clock, in the JS\'s doubles');
  // the score: the world's own table, read only, by its feed
  const SC = fs.readFileSync(path.join(ROOT, 'src', 'score.js'), 'utf8');
  const B1 = G.AIRAPI.BYSKY(); B1.afterglow[0] = 99; assert.equal(G.AIR_BYSKY.afterglow[0], 1, 'BYSKY hands a reader a copy, never the table');
  { G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'milkyway', at: -10, hold: 1e6, move: 60 }); const V = visit(G, SEEDS[3]);   // the day's wind: the sky's share 1 on any sky (CLOUDS' drift and lens gate read it, not the hour's)
    let off = 0;
    for (const y of [5, 40, 300, 2000]) { const d = G.AIRAPI.day(10, 20, y, V), w = G.windAt(10, 20, y, 500, V), k = G.airShare(y, 500); if (Math.abs(k - 1) > 0.05) off++;
      assert.ok(Math.abs(d.x * k - w.x) < 1e-9 && Math.abs(d.z * k - w.z) < 1e-9, `${y} m: the day's wind is windAt's over the sky's share (${k.toFixed(3)})`); }
    assert.ok(off >= 2, 'the night\'s shares are not the day\'s (so the day\'s wind is asked for, not the hour\'s)');
    const a = G.AIRAPI.day(0, 0, 40, V), b = G.AIRAPI.day(0, 0, 40, V); assert.ok(a !== b && a.x === b.x, 'a fresh object each time'); }
  assert.match(WORLD, /air: airTable\(\), wind: w, still:/, 'the feed hands the score the table');
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
  { const w = G.airWx(5, { seed: 1, u10: 6 }); assert.ok(w.N === 0.01 && w.oroU === 7.7, 'the lee wave\'s numbers in the one weather: N 0.01/s, the gate at 7.7 m/s over the ridge');
    assert.ok(Math.abs((G.AIR_WXK.oro[0] + G.AIR_WXK.oro[1]) / 2 - w.oroU) < 1e-12, 'the gate eased about its own threshold');
    const lo = G.airWx(5, { seed: 1, u10: (w.oroU - 0.3) / G.AIR_WXK.ridge }).oro, hi = G.airWx(5, { seed: 1, u10: (w.oroU + 0.3) / G.AIR_WXK.ridge }).oro; assert.ok(lo < 0.5 && hi > 0.5, 'the gate opens at oroU over the ridge'); }
});

test('air: the mist by the visit\'s moisture (its marine layer in on a calm day): a find on about 1 visit in 3, never a fixture; MIST a copy', () => {
  const G = page();
  // the 16 openings (hour.js: the page's seed k = 11 + k * 0x9e3779b9; its one visit's seed RNG(subseed(seed, 1000)).seed(), as theWorld makes it, which airDraw and airU10 read), each the visit's for the whole visit; dunes in view where the sand province is near the start (the world's own maps, on the page's seed)
  assert.match(fs.readFileSync(path.join(ROOT, 'src/world/170-world-itself.js'), 'utf8'), /var r = RNG\(subseed\(J\.seed, 1000\)\);\s*J\.V = \{[^}]*\bseed: r\.seed\(\),/, "the live visit's seed is the one this test gives each opening");
  const A1 = '  var CW = (function () {\n', A2 = '  var MAPS = {', A3 = '  var KN = 256, KSTEP = 64,';
  const E1 = '\n  })();\n', E2 = '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', E3 = '  var KFROWS = FN * FN / KN;';
  const mapsFn = vm.runInThisContext('(function (G) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180;\n' + cut(WORLD, A1, E1, true) + cut(WORLD, A2, E2, true) + cut(WORLD, A3, E3) + '\n  G.mapsInit = mapsInit; G.kitAt = kitAt;\n})');
  const rows = [];
  for (let k = 0; k < 16; k++) {
    const seed = (11 + Math.imul(k, 0x9e3779b9)) >>> 0, V = { seed: G.RNG(G.subseed(seed, 1000)).seed() }; V.u10 = G.airU10(V.seed);   // (the live visit's seed: theWorld's, from J.seed; the maps stay on the page's seed)
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
  if (process.env.WX) console.log("moist share", n / N);
  assert.ok(n / N > 0.22 && n / N < 0.36, `moist on ${(100 * n / N).toFixed(1)}% of visits, not about 1 in 3 to 1 in 4`);
  // the visit's own: calmer is moister, none on a windy day, the same through every sky
  let last = 2; for (let u = 3; u <= 7.5; u += 0.1) { const m = G.airWx(5, { seed: 1, u10: u }).moist; assert.ok(m <= last + 1e-12, 'calmer is moister'); last = m; }
  assert.equal(G.airWx(5, { seed: 1, u10: 4.5 }).mist, 0, 'a breezy first light: no mist (the marine layer mixed out)');
  for (const id of Object.keys(G.WSKY)) { G.SKY.seq.length = 0; G.SKY.seq.push({ id, at: 0, hold: 1e6, move: 60 }); assert.equal(G.airWx(5, { seed: 1, u10: 3.9 }).moist, G.airWx(5, { seed: 1, u10: 3.9 }).moist, 'the same in every sky'); }
  const M1 = G.AIRAPI.MIST(); M1.firstlight = 99; assert.equal(G.AIR_MIST.firstlight, 10, 'MIST hands a reader a copy, never the table');
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
  { G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'milkyway', at: -10, hold: 1e6, move: 60 }); const V = visit(G, SEEDS[2]), t = 200, x = 30, z = -20; assert.ok(Math.abs(G.gustPhase(x, z, 5, t, V) - (G.airClock(t)[0] - (x * V.wind[0] + z * V.wind[1]) / V.u10)) < 1e-9 && G.gustPhase(x, z, 200, t, V) === G.gustPhase(x, z, 5, t, V), 'HOST.gustPhase: the surface clock less x.w / U10, the same at every height'); }
  const fr = GLSL('fs-ribbon.glsl');
  assert.ok(/\(dot\(vW\.xz, w\) - uAir\.x \* length\(uWind\.xz\)\) \* 0\.035/.test(fr) && !/\buT\b/.test(fr), 'the sand\'s streaks carried at the veils\' own wind on the air\'s clock, never a pace of their own');
  assert.ok(!/uAirM|UAIRM/.test(WORLD + GLSL('vs-ribbon.glsl')), 'no meander clock: the field is carried along the wind only');
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


test('air: the score\'s feed at the camera: the wind\'s bearing from the eye\'s way and the apparent wind (512 on a stub camera)', () => {
  const FEED = cut(WORLD, '  function skyFeed() {', '\n  }\n', true);
  const run = (o) => vm.runInThisContext('(function (o) {\n' +
    '  var SKY = { seq: [{ id: "afterglow", at: 0, hold: 60, move: 20 }], i: 0, dt: 0 }, SIM = { t: 5, V: { speed: o.v } }, MAPS = { w: null }, AIR_HEARD_Y = 2, STILLMODE = false, shown = false, SEEDR = 0, J = { seed: 1 };\n' +
    '  var CS = { x: 0, z: 0, y: 30, psi: o.psi, sv: o.sv }, CAM = { f: o.f, r: [9, 9, 9] };\n' +
    '  function reduced() { return o.still; } function groundAt() { return 0; } function kitAt() { return { wC: 0 }; } function airTable() { return {}; } function subseed() { return 7; }\n' +
    '  function airHeard() { return { x: o.w[0], z: o.w[1] }; }\n' + FEED + '\n  return skyFeed().wind;\n})')(o);
  const PI = Math.PI;
  for (const psi of [0, 0.7, -2.1, 3]) for (const pitch of [0, 25 * PI / 180, -40 * PI / 180]) {
    const cp = Math.cos(pitch), f = [Math.sin(psi) * cp, Math.sin(pitch), Math.cos(psi) * cp], fwd = [Math.sin(psi), Math.cos(psi)], right = [-Math.cos(psi), Math.sin(psi)];
    const base = { psi, f, v: 0, sv: 0, still: false };
    let b = run({ ...base, w: [3 * right[0], 3 * right[1]] }).bear; assert.ok(Math.abs(b - PI / 2) < 1e-9, `a wind along the camera's right: bear ${b} (want +pi/2)`);
    b = run({ ...base, w: [3 * fwd[0], 3 * fwd[1]] }).bear; assert.ok(Math.abs(b) < 1e-9, `a wind along the eye's way: bear ${b} (want 0; pitch ${pitch.toFixed(2)})`);
    b = run({ ...base, w: [-3 * right[0], -3 * right[1]] }).bear; assert.ok(Math.abs(b + PI / 2) < 1e-9, 'a wind to the left: -pi/2');
    const o = { psi, f, v: 9, sv: 1.5, still: false, w: [2, -1] }, a = run(o), s = Math.sin(psi), c = Math.cos(psi);
    assert.ok(Math.abs(a.ax - (2 - (s * 9 - c * 1.5))) < 1e-12 && Math.abs(a.az - (-1 - (c * 9 + s * 1.5))) < 1e-12, 'the apparent wind is the wind less the camera\'s velocity (on the heading, and the slip)');
    const q = run({ ...o, still: true }); assert.ok(q.ax === 2 && q.az === -1, 'still: the apparent wind is the wind itself');
  }
});
const ROUTE = vm.runInThisContext('(function () {\n' + cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END') + '\n  return { moonPlan: moonPlan, moonAt: moonAt };\n})')();
function stays(n) {   // moonlit stays on the real route (225's moonPlan): a sky before and after, the heading, the key, the moon's side and way, the pitch
  const R = RNG0(0x5eed), pick = (a) => a[Math.floor(R() * a.length)], out = [], tan = Math.tan(36 * Math.PI / 180);
  const fixed = [{ before: 'milkyway', psi: 30, keyAz: -40, keyEl: 9, side: -1, sigma: -1, p: -5 }, { before: 'afterglow', psi: 0, keyAz: 40, keyEl: 9, side: 1, sigma: 1, p: -4 }, { before: 'milkyway', after: 'aurora', psi: 69.5, keyAz: 26.9, keyEl: 5.4, side: -1, sigma: 1, p: -4.98 }];   // (the hub's round-3 cases, and round 4's fastest stay)
  for (let i = 0; i < n; i++) {
    const c = fixed[i] || { before: pick(['afterglow', 'bluehour', 'firstlight', 'milkyway', 'aurora']), psi: R() * 360 - 180, keyAz: R() * 360 - 180, keyEl: 5 + 9 * R(), side: R() < 0.5 ? -1 : 1, sigma: R() < 0.5 ? -1 : 1, p: -6 + 4 * R() };
    c.after = c.after || pick(['afterglow', 'bluehour', 'firstlight', 'milkyway', 'aurora']);
    const hold0 = 40 + 60 * R(), move0 = 55 + 5 * R(), hold = 150 + 60 * R(), move = 55 + 5 * R();
    c.seq = [{ id: c.before, at: -20, hold: hold0, move: move0 }, { id: 'moonlit', at: -20 + hold0 + move0, hold, move }, { id: c.after, at: -20 + hold0 + move0 + hold + move, hold: 300, move: 60 }];
    const t0 = -20 + hold0, t1 = t0 + move0, t2 = t1 + hold, t3 = t2 + move;
    c.P = ROUTE.moonPlan({ psi: c.psi, pN: c.p, pL: c.p, tanX: tan, tanY: tan * 9 / 16, W: 1600, H: 900, boxes: [[600, 380, 1000, 440], [650, 450, 950, 480], [700, 490, 900, 510], [650, 800, 950, 830], [1500, 20, 1580, 60]], keepPx: 12, coarse: false, noRoom: false, keyAz: c.keyAz, side: c.side, sigma: c.sigma, lift: 0, t0, t1, t2, t3 });
    c.t = [t0, t3]; out.push(c);
  }
  return out;
}
function RNG0(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('air: one light at night (on the moonlit sky the live key stands on the moon\'s disc, held 5 deg up, moved low across the sky; the clouds stay on the baked key)', () => {
  const G = page(), D = 180 / Math.PI, dirAE = (az, el) => [Math.sin(az / D) * Math.cos(el / D), Math.sin(el / D), Math.cos(az / D) * Math.cos(el / D)];
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * D, sin5 = Math.sin(G.AIR_KEY_EL[0] / D);
  G.SIM.V = { seed: 1 }; G.SIM.alpha = 1; G.SKY.dt = 0;
  // the shape: the key off the moonlit sky, the disc on it, held 5 deg up
  const K = dirAE(40, 9), L = { sunDir: K }, moon = dirAE(-60, 37);
  G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'afterglow', at: -20, hold: 80, move: 58 }, { id: 'moonlit', at: 118, hold: 190, move: 58 }, { id: 'milkyway', at: 366, hold: 300, move: 60 });
  G.stub({ d: moon, w: 1, az: -60, el: 37 });
  G.SIM.t = 30; assert.ok(ang(G.airLightDir(L), K) < 0.05, 'a twilight\'s hold: the key');
  G.SIM.t = 200; assert.ok(ang(G.airLightDir(L), moon) < 0.05, 'the moonlit hold: the disc');
  G.SIM.t = 600; assert.ok(ang(G.airLightDir(L), K) < 0.05, 'another night\'s hold, the moon still up: the key (the moonlit sky\'s light only)');
  G.SIM.t = 200; G.stub({ d: dirAE(-60, -12), w: 0.3, az: -60, el: -12 }); const lo = Array.from(G.airLightDir(L));
  assert.ok(Math.abs(Math.asin(lo[1]) * D - 5) < 1e-4 && ang(lo, dirAE(-60, 5)) < 0.05, 'a disc under the horizon: its azimuth, 5 deg up (never lit from under)');
  G.stub({ d: moon, w: 1, az: -60, el: 37 }); G.SIM.t = 89; const mid = Array.from(G.airLightDir(L)), azd = (v) => Math.atan2(v[0], v[2]) * D, eld = (v) => Math.asin(v[1]) * D;
  assert.ok(azd(mid) < 40 && azd(mid) > -60 && eld(mid) > 9 && eld(mid) < 37, 'through a change: its azimuth between the ends\' (the shorter way), its elevation between theirs');
  const far = dirAE(150, 6); G.stub({ d: far, w: 1, az: 150, el: 6 }); let top = 0; for (let t = 50; t <= 120; t += 0.5) { G.SIM.t = t; top = Math.max(top, G.airLightDir(L)[1]); }
  assert.ok(top <= Math.max(K[1], far[1]) + 1e-6, `a disc 110 deg round from the key: the light never higher than both ends (${(Math.asin(top) * D).toFixed(2)} deg up at most)`);
  G.SIM.t = 147.0001; const a1 = G.airLightDir(L), a2 = G.airLightDir(L); assert.strictEqual(a1, a2, 'filled in place, once a frame');
  // the real route (225's moonPlan, 400 stays: twilight and night into the moonlit sea and out, the band ahead and behind, the hub's two cases first)
  const S = stays(400), dt = 1 / 60, overBound = []; let worstY = 1, worstTurn = 0, worstOver = -1, worstB = 0, at = null, ahead = 0, behind = 0;
  for (const c of S) {
    G.SKY.seq.length = 0; G.SKY.seq.push(...c.seq.map((e) => Object.assign({}, e)));
    const o = { d: [0, 0, 0] }; G.stub((t, out) => { ROUTE.moonAt(c.P, t, o); out.d = o.d.slice(); out.w = o.w; out.az = o.az; out.el = o.el; return out; });
    if (c.P.caseA) ahead++; else behind++;
    const Kc = dirAE(c.keyAz, c.keyEl), Lc = { sunDir: Kc }; let prev = null, pT = null, turn = 0, bound = 0, discR = 0;
    const tgt = (t) => { ROUTE.moonAt(c.P, t, o); const az = Math.atan2(o.d[0], o.d[2]) * D, el = Math.max(Math.asin(Math.max(-1, Math.min(1, o.d[1]))) * D, G.AIR_KEY_EL[0]); return [az, el]; };
    const mv = Math.min(c.seq[0].move, c.seq[1].move);
    for (let t = c.t[0] - 2; t <= c.t[1] + 2; t += dt) {
      G.SIM.t = t; const d = Array.from(G.airLightDir(Lc)), T = tgt(t), Tv = dirAE(T[0], T[1]);
      if (d[1] < worstY) worstY = d[1];
      const over = d[1] - Math.max(Kc[1], Tv[1]); if (over > worstOver) worstOver = over;   // (never higher than both ends)
      let dA = Math.abs(T[0] - c.keyAz) % 360; if (dA > 180) dA = 360 - dA;
      if (pT && t > c.t[0] + dt && t < c.t[1] - dt) { let za = Math.abs(T[0] - pT[0]) % 360; if (za > 180) za = 360 - za; discR = Math.max(discR, (za + Math.abs(T[1] - pT[1])) / dt); }   // (the disc's own rate, on its route: never across its ends, where it stands at the nadir)
      bound = Math.max(bound, 1.5 * (dA + Math.abs(T[1] - c.keyEl)) / mv);
      if (prev) turn = Math.max(turn, ang(prev, d) / dt);
      prev = d; pT = T;
    }
    const B = bound + discR + 0.05;   // (the stay's own bound: the change's ease over its arc, plus the disc's own rate)
    if (turn > B) overBound.push({ before: c.before, psi: c.psi.toFixed(1), turn: turn.toFixed(2), bound: B.toFixed(2) });
    worstB = Math.max(worstB, B); if (turn > worstTurn) { worstTurn = turn; at = { before: c.before, psi: c.psi.toFixed(1), keyAz: c.keyAz.toFixed(1), bound: B.toFixed(2) }; }
  }
  if (process.env.NL) console.log(JSON.stringify({ worstEl: Math.asin(worstY) * D, worstTurn, worstOver, worstB, at, ahead, behind, overBound: overBound.length }));
  assert.ok(ahead > 50 && behind > 50, `the band culminating ahead (${ahead}) and behind (${behind})`);
  assert.ok(worstY >= sin5 - 1e-6, `the live key never under 5 deg up on the real route (lowest ${(Math.asin(worstY) * D).toFixed(3)} deg)`);
  assert.ok(worstOver <= 0.01, `mid-change the light never stands higher than both ends (by ${worstOver.toFixed(4)} at most)`);
  assert.equal(overBound.length, 0, `every stay turns within its own bound (the change's ease over its arc, plus the disc's rate): ${JSON.stringify(overBound.slice(0, 3))}`);
  assert.ok(worstTurn <= 5.5, `the live key turns at most ${worstTurn.toFixed(2)} deg/s (${JSON.stringify(at)}): 0.09 deg a frame at most, never a jump`);
  assert.match(WORLD, /if \(u\.uSun\) gl\.uniform3fv\(u\.uSun, airLightDir\(L\)\);/, 'every program\'s uSun is the live key');
  assert.match(WORLD, /if \(u\.uKey\) gl\.uniform3fv\(u\.uKey, L\.sunDir\);/, 'the clouds are given the baked key');
  const vb = GLSL('fs-vbody.glsl'); assert.ok(!/\buSun\b/.test(vb) && /dot\(rd, uKey\)/.test(vb) && /uKey\.y/.test(vb), 'the clouds\' phase, rim and wrap read the baked key their light depths are baked along');
  assert.match(WORLD, /if \(u\.uSkyS\) gl\.uniform3fv\(u\.uSkyS, L\.skyS \|\| L\.sunDir\);/, 'the sky\'s own sun stays on the key');
  assert.match(WORLD, /var sd = keyAt\(V\)/, 'the clouds stay baked along the key');
});

test('air: a milkyway opening frames its band (the hub\'s round 11): across the view, flat and high, never upright', () => {
  // the galactic pole at sky time 0 of a milkyway opening, the band a straight screen line through the eye, measured
  // here on its own: in both reference views (a 16:10 desktop and a 393x852 phone at the opening's heading and framing),
  // its height at the view's centre column well above the horizon and inside the top, and its tilt no more than TILT
  const G = page(), D = 180 / Math.PI, TILT = 70;   // (at 64 deg north a level band crosses 37 deg up or more, above a desktop's top: the flattest in frame)
  const views = [{ tX: Math.tan(36 / D), tY: Math.tan(36 / D) / 1.6, fr: 0, hw: 1 / 1.6, up: 9 }, { tX: Math.tan(21 / D), tY: Math.min(Math.tan(21 / D) * 852 / 393, Math.tan(40 / D)), fr: 1, hw: 852 / 393, up: 0 }];
  const band = (gp, yaw, v, gc) => {   // sampled across the view: its tilt, its share high and in frame, the brightest such point's weight and longitude
    const p = Math.atan((2 * (0.4 + 0.2 * v.fr) - 1) * v.tY) + v.up / D, f = [Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p)];
    const r = [Math.cos(yaw), 0, -Math.sin(yaw)], u0 = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]], u = u0[1] < 0 ? u0.map((x) => -x) : u0;
    const dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], ug = dot(u, gp), a = -dot(f, gp) / (v.tY * ug), m = -v.tX * dot(r, gp) / (v.tY * ug), hz = -f[1] / (v.tY * u[1]);
    const q = [gp[1] * gc[2] - gp[2] * gc[1], gp[2] * gc[0] - gp[0] * gc[2], gp[0] * gc[1] - gp[1] * gc[0]], o = { tilt: Math.atan(Math.abs(m) * v.hw) * D, n: 0, br: 0, l: 0 };
    for (let i = -9; i <= 9; i++) {
      const x = i / 10, y = a + m * x; if (y < hz + 0.35 * (1 - hz) || y > 0.7) continue;
      const d = [0, 1, 2].map((k) => f[k] + x * v.tX * r[k] + y * v.tY * u[k]), l = Math.atan2(dot(d, q), dot(d, gc)) * D;
      const w = 0.25 + 0.28 * (1 + Math.cos(l / D)) + 0.8 * Math.exp(-(((l - 75) / 20) ** 2)); o.n += 1 / 19; if (y < 0.6 && w > o.br) { o.br = w; o.l = l; }
    }
    return o;
  };
  const rows = [];
  for (let i = 0; i < 64; i++) {
    const seed = (i * 2654435761 + 977) >>> 0; G.J.seed = seed;
    G.SKY.seq.length = 0; G.SKY.seq.push({ id: 'milkyway', at: -10, hold: 95, move: 56 }, { id: 'aurora', at: 141, hold: 100, move: 55 }); G.SKY.dt = 0;
    const V = { seed, light: { sunAz: ((seed >>> 3) % 360) - 180 } }; G.SIM.V = V;
    const F = G.skySphere(0, V), gp = F.galPole.slice(), gc = F.galCentre.slice(), yaw = G.RNG(G.subseed(seed, 77)).r(0, 2 * Math.PI);
    for (const v of views) {
      const b = band(gp, yaw, v, gc); rows.push([seed, v.fr, b.n, b.tilt, b.l, b.br]);
      assert.ok(b.n >= 0.1 - 1e-9, `seed ${seed} (${v.fr ? 'phone' : 'desktop'}): only ${(100 * b.n).toFixed(0)}% of the band high and in frame (at least 10%: some headings allow no more)`);
      assert.ok(b.tilt <= TILT, `seed ${seed} (${v.fr ? 'phone' : 'desktop'}): the band tilts ${b.tilt.toFixed(1)} deg (at most ${TILT})`);
    }
  }
  for (const w of [0, 1]) {   // (without the pick: a median tilt of 83 deg on a desktop, the band out of frame on most)
    const t = rows.filter((x) => x[1] === w).map((x) => x[3]).sort((p, q) => p - q);
    assert.ok(t[t.length >> 1] <= 40, `${w ? 'phone' : 'desktop'}: the band's median tilt ${t[t.length >> 1].toFixed(1)} deg (at most 40)`);
    const br = rows.filter((x) => x[1] === w).map((x) => x[5]).sort((p, q) => p - q);
    const cyg = rows.filter((x) => x[1] === w && x[4] >= 55 && x[4] <= 95).length / rows.filter((x) => x[1] === w).length;
    assert.ok(cyg >= (w ? 0.5 : 0.4), `${w ? 'phone' : 'desktop'}: the Cygnus star cloud (l 55-95) in frame on ${(100 * cyg).toFixed(0)}% of the openings (at least ${w ? 50 : 40}%; the rest is the heading's: FLIGHT)`);
    if (process.env.GALBAND) console.log(w ? 'phone' : 'desktop', 'tilt median', t[t.length >> 1].toFixed(1), 'max', t[t.length - 1].toFixed(1), 'cygnus in frame', (100 * cyg).toFixed(0) + '%');
  }
});
