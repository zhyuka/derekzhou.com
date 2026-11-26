// tools/visit/ruler.mjs: the visit ruler. A 2-hour visit for each opening, headless, in seconds: the world's own maps,
// director, kits and sky order (cut from the dev build, as test/unit/*.mjs cut them), flown as the flight flies left
// alone (the landing's heading held, 12 m/s: a ray from the landing; the slip's few metres and the height's spring do
// not change what is passed). It measures the visit's shape (delight-visit §4-5.1):
//   - the places passed (the kits' points of interest: shard, ruins and their mesa, temple, canyon, towers, islands,
//     isle), when and how near, and the stretch between one place and the next;
//   - the first near pass (a place within NEAR m of the way) and the first place in sight (within SIGHT m);
//   - the flocks passed (the sites' bird flocks, kept by density as the kits keep them);
//   - the crossings between the dune sea and the cloud sea (the maps' cloud weight wC through 0.5, with a margin);
//   - the sky's order (the opening's, then the read's from the cut): its changes and the time to the first;
//   - the look runs (the director's own look every 5 s, its land read as one of a few kinds);
//   - the longest stretch with no reward (a place passed, a flock passed, a sky's change).
//   - the land at the cut (the director's look within 250 m of the landing): the cloud weight wC, the sand province's
//     weight wD (the dunes' height is the dunes kit's by wD: 140), the dune landform Kd and the sand's share of cover;
//     the main dunes' most height there (duneH) and whether the land opens over dunes (onDunes: DUNE_MIN); the opening
//     sky's mist depth at full moisture (mistAtCut, once AIR's weather is in the world).
//   node tools/visit/ruler.mjs [--reads N] [--secs S] [--k 0,1] [--hours dawn,day] [--json FILE]
// What it cannot see (no GPU): the ground's height (the places' seats, the ABOVE kit's gate on the land under it,
// aboveKeep: approximated by its density alone) and the cloud sea's drawn weight (kwAt: the raw maps' kitAt instead).
// The ink birds' flocks after the cut follow the read and are not measured; the sites' flocks are the land's.
import { WORLD, STREAMS, VEC, cut, TMP } from '../../test/unit-lib.mjs';
import { mainAt } from '../physics/dune-census.mjs';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { pathToFileURL } from 'node:url';

export const HOURS = ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'];
export const NEAR = 150, SIGHT = 600, FLOCK = 400, REF_STRETCH = [63, 98, 179];

// ------------------------------------------------------------------ the world's code, cut
const A1 = '  var CW = (function () {\n', A2 = '  var MAPS = {', A3 = '  var KN = 256, KSTEP = 64,';
const E1 = '\n  })();\n', E2 = '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', E3 = '  var KFROWS = FN * FN / KN;';
const DS0 = '  var DIR_DT = 0.5, DIR_SEE = 5,', DE0 = '  /* ---------------------------------------------------------------- the weights\' grids';
const PLAN = cut(WORLD, A1, E1, true) + cut(WORLD, A2, E2, true) + cut(WORLD, A3, E3) + cut(WORLD, DS0, DE0);
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const SKYORD = cut(WORLD, '  /* ---- the order (the live\'s pushSky and nextSky, on the world\'s streams) */', '  /* ---- the cycle at t');
const HEAD0 = cut(WORLD, '  function airHeading0()', '\n', true)   // (and the air's equatorial axes and galactic pole and centre: the sky order places the galaxy by them)
  + cut(WORLD, '  var AIR_LAT = ', '\n', true) + cut(WORLD, '  function airEq(', '\n', true)
  + '  function keyAt(V) { return [0, 0.5, 0.866]; }\n';   // (a stub: the aurora's sheet faces the key; the ruler reads no light)
const SEED0OF = /var SEED0 = (\(11 \+ \(SEEDR % OPENN\) \* 0x9e3779b9\) >>> 0)/.exec(WORLD), OPENN = /var OPENN = (\d+)/.exec(WORLD);   // (010: SEED0 from the read)
const VSEED = /var r = (RNG\(subseed\(J\.seed, \d+\)\));\n\s*J\.V = \{ k: 0, id: 'world', def: def, seed: r\.seed\(\)/.exec(WORLD);   // (170: the visit's seed, the cells' salt's parent)
const VSALT = /V\.salt = (subseed\(V\.seed, \d+\) >>> 0);/.exec(WORLD);   // (200: the cells' salt)
// (180) what a cell keeps: the kits' densities by the raw maps and the pieces' own hash, as the world has them, and the
// salt each kit's pieces are picked with (kitApi's keep); the layout's order (the ABOVE kit's scale after the dunes')
const DENS = cut(WORLD, '  function densD(x, z)', '  /* (world6 fix, the judges\' defect 4)');
const PICK = cut(WORLD, '  function pickOf(o, salt', '\n', true);
const KSALT = /function keep\(o\) \{ return pickOf\(o, kit === 'above' \? (0x[0-9a-f]+) : (0x[0-9a-f]+)(?:, ox, oz)?\) < dens\(o\.x(?: - ox)?, o\.z(?: - oz)?\); \}/.exec(WORLD);   // (an air cell's keep takes its carry, ox and oz: a world cell's is 0)
const LAYOUT = /layout: \{ scales: \[KD\.layout\.scales\[0\], KD\.layout\.scales\[1\], KA\.layout\.scales\[0\][\],]/.test(WORLD);   // (the world cells' three first; the air cells' scales, if any, after)
const SPEED0 = /speed: KD\.speed \|\| (\d+(?:\.\d+)?),/.exec(WORLD);   // (worldDef: the world's one speed)
// the main dunes' height at full sand weight (dunes-glsl: the S1 dune's height, by amp and the sand weight wD), and AIR's
// mist depth by sky (215, once AIR's weather lands: null before)
const DUNE_GLSL = fs.readFileSync(new URL('../../src/glsl/dunes-glsl.glsl', import.meta.url), 'utf8');
const DUNE_H = /duneS1\(ph, ([\d.]+) \* dMul\(amp, gKD\)/.exec(DUNE_GLSL);
const MIST = /var AIR_MIST = (\{[^}]*\});/.exec(WORLD);
export const MIST_BY_SKY = MIST ? Function('return ' + MIST[1])() : null;
// (215, with AIR's weather) the visit's moisture: its U10 (airU10, from the visit's seed) through airMoist, cut as written
const MOIST = MIST ? cut(WORLD, '  var AIR_U10 = ', '\n', true) + cut(WORLD, '  function airEase(a, b, y) {', '\n', true) +
  cut(WORLD, '  function airU10(seed) {', '\n  }\n', true) + cut(WORLD, '  function u10Of(V) {', '\n', true) +
  cut(WORLD, '  var AIR_MOIST = ', '\n', true) + cut(WORLD, '  function airMoist(V) {', '\n', true) : '';
// (200) the visit's own stream, whose first draw is the wind's direction (215 airDraw, as the dunes kit draws it)
const VRNG = /V\.rng = (RNG\(subseed\(V\.seed, \d+\)\));/.exec(WORLD);
// (the decision, FLIGHT for the hub, Nov 23) a land opens over dunes when the cloud sea is not over the landing (wC under
// 0.5) and its main dunes stand DUNE_MIN m or more there: the S1 dune's height as dunes() draws it (32 m by amp, 0.25-1,
// by the visit's wind: dune-census's mainAt, the same model in JS) by the sand weight wD
export const DUNE_MIN = 8;
const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const ABOVE = fs.readFileSync(path.join(TMP, 'src', 'realm-above.js'), 'utf8');
// (the destination, delight-visit 5.3) where it stands (217 destOf: the seed's alone) and the kit's forms its dest measures by
// (realm-kit outline and flutes: dDest reads the rock's reach, bornReach)
const DESTSEC = cut(WORLD, '  /* ---------------------------------------------------------------- the destination (delight-visit 5) */', '\n  }\n', true);
// (the first landmark, 217 firstOf: on the five lands whose heading passes nothing near by 90 s; its side is the key sun's,
// which the ruler does not read: either side is passed as near)
const FIRSTSEC = cut(WORLD, "  var FIRST = { 0: 'isle'", '    return FIRSTP.kind ? FIRSTP : null;\n  }\n', true);
const KITSRC = fs.readFileSync(path.join(TMP, 'src', 'realm-kit.js'), 'utf8');
const FORMSRC = cut(KITSRC, '  function outline(R, n, rad, squash) {', '  // a cap over a ring');
const FORMS = vm.runInThisContext('(function () { var PI = Math.PI;\n' + FORMSRC + '\n  return { outline: outline, flutes: flutes }; })')();
let DEST_NOW = null, FIRST_NOW = null;   // (the land's destination while its kit's dest runs: WORLD.dest)
if (!SEED0OF || !OPENN || !VSEED || !VSALT) throw new Error('ruler: the visit\'s seed or the cells\' salt not found in world.js');
if (!KSALT || !LAYOUT || !SPEED0 || !DUNE_H || !VRNG) throw new Error('ruler: the kits\' keep salts, the layout\'s order or the world\'s speed (180), or the dunes\' height (dunes-glsl) not found');

// the land of an opening k: its seed, the maps and the director about its landing, its heading, its cells' salt
function landOf(k) {
  const G = vm.runInThisContext('(function (G, CS, READ) {\n  \'use strict\';\n' +
    '  var PI = Math.PI, DEG = Math.PI / 180, FRT = { tanX: Math.tan(36 * DEG), tanY: 1 }; function bootMark() {}\n' +
    '  function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / (2 * Math.PI)) * 2 * Math.PI; return d; }\n' +
    '  var document = { documentElement: { getAttribute: function (n) { return n === \'data-seed\' ? String(READ) : null; } } };\n' +
    STREAMS + VEC + '  var OPENN = ' + OPENN[1] + ', SEEDR = READ >>> 0, SEED0 = ' + SEED0OF[1] + ';\n' + PLAN +
    '  var J = { seed: SEED0 };\n' + HEAD0 + DESTSEC + FIRSTSEC + DENS + PICK +
    '  var V = {}; V.seed = ' + VSEED[1] + '.seed(); V.salt = ' + VSALT[1] + ';\n' +
    '  var SIM = {};\n' + MOIST + '  G.mistQ = ' + (MIST ? 'airMoist({ u10: airU10(V.seed) })' : 'null') + '; G.windAz = ' + VRNG[1].replace('V.seed', 'V.seed') + '.r(0, 2 * PI);\n' +
    '  G.SEED0 = SEED0; G.salt = V.salt >>> 0; G.MAPS = MAPS; G.mapsInit = mapsInit; G.kitAt = kitAt; G.directorStep = directorStep; G.heading = airHeading0(); G.densD = densD; G.densA = densA; G.pickOf = pickOf; G.seed = V.seed; G.destOf = destOf; G.firstOf = firstOf;\n' +
    '  G.STREAMS = { cellHash: cellHash, hk: hk, hfl: hfl, ihash: ihash, RNG: RNG, subseed: subseed };\n})');
  const g = {}, CS = { x: 0, z: 0 }; G(g, CS, k); g.CS = CS;
  g.mapsInit(g.SEED0);
  return g;
}

// the kits' cell code on a stub cell: what a cell keeps (its points of interest and flocks), by the kits' own density
const KITS = (() => {
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const reg = (src, S) => {
    let def = null;
    const kit = { lch: (l, c, h, kk) => [l, c, h, kk === undefined ? 1 : kk], cellHash: S.cellHash, hk: S.hk, hfl: S.hfl, ihash: S.ihash, RNG: S.RNG, smooth, range: () => {}, rock: () => {} };
    const air = new Proxy({}, { get: (_, k) => k === 'H' ? { clouds: 800, deck: 3000 } : k === 'windAt' ? () => ({ x: 0, y: 0, z: 0 }) : () => [0, 0, 0] });   // (an air cell's kit reads the wind's way: still here, so V.wind's)
    vm.runInThisContext('(function (window) {\n' + src + '\n})')({ WORLD: { kit, forms: FORMS, air, dest: () => DEST_NOW, first: () => FIRST_NOW, realm: (d) => { def = d; } } });
    return def;
  };
  return (S) => ({ dunes: reg(DUNES, S), above: reg(ABOVE, S) });
})();
function cellPlaces(L, kits, kind, ix, iz, size, air) {
  const S = L.STREAMS, out = { pois: [], flocks: [] }, dens = kind === 'above' ? L.densA : L.densD;
  const salt = +(kind === 'above' ? KSALT[1] : KSALT[2]), keep = (o) => L.pickOf(o, salt) < dens(o.x, o.z);
  const C = {
    scale: air ? (kind === 'above' ? 4 : 3) : kind === 'above' ? kits.dunes.layout.scales.length : 0, air: !!air, dL: air ? [0, 0] : null, ix, iz, x0: ix * size, z0: iz * size, size, salt: L.salt, V: { light: { sunEl: 5 }, wind: [Math.sin(L.windAz), Math.cos(L.windAz)] },
    inside: (x, z) => x >= ix * size && x < (ix + 1) * size && z >= iz * size && z < (iz + 1) * size,
    add: (it) => { if (!keep(it)) it._drop = true; return it; },
    cloud: (cl) => { if (!keep(cl)) cl._drop = true; return cl; },
    poi: (p) => { if (!(p.ref && p.ref._drop) && keep(p)) out.pois.push({ kind: p.kind, x: p.x, z: p.z, pass: p.pass || 0, r: p.r, top: p.top }); return p; },   // (r, top: a destination's, delight-visit 5.3)
    flock: (f) => { if (f.kind === 'bird' && !(f.ref && f.ref._drop) && keep(f)) out.flocks.push({ x: f.x, z: f.z }); return f; },
    place: (set, x, z, o) => o || {},
    weights: (x, z) => { const k = L.kitAt(x, z); return [k.wD, k.wC]; }
  };
  const R = S.RNG(S.cellHash(ix, iz, ((air ? S.subseed(L.seed, 47) : L.salt) ^ (C.scale * 0x9e3779b9)) >>> 0)), K = kind === 'above' ? kits.above : kits.dunes;
  if (!air) K.cell(C, R, {}); else if (K.air) K.air(C, R, {});
  return out;
}
// (physics: clouds/drift) the free clouds' places are in air cells (230: their own stream, subseed 47; scales 3 and 4
// in 180's layout), laid out here as they stand at the opening, carried 0. They drift with the low layer's wind (at most
// a few km in a 10-minute visit), which the ruler does not follow: their passes are read where they were laid out
function cellPlacesBoth(L, kits, kind, ix, iz, size) {
  const a = cellPlaces(L, kits, kind, ix, iz, size), b = cellPlaces(L, kits, kind, ix, iz, size, true);
  return { pois: a.pois.concat(b.pois), flocks: a.flocks.concat(b.flocks) };
}

// the sky's order for an opening and a read: the opening's sky and hold, the read's order from the cut on
function skyOrder(seed0, hour, at, read, secs) {
  const W = vm.runInThisContext('(function (SEED, HOURV, AT) {\n  \'use strict\';\n' +
    '  var DEVMODE = false, OPT = { skyScene: null, skyNext: null, skyDt: null }, HOUR = HOURV, J = { seed: SEED }, SEED0 = SEED;\n' +
    '  function attr(n) { return n === \'data-sky-at\' ? String(AT) : null; }\n' +
    '  function lin2lab(c) { return [0, 0, 0]; } function lab2linA() { return [0, 0, 0]; } function lin2lab3() { return [0, 0, 0]; }\n' +
    '  var PI = Math.PI, DEG = Math.PI / 180;\n' + STREAMS + VEC + '  function lch() { return [0, 0, 0]; }\n' + SKYDEF + HEAD0 + SKYORD +
    '  skyInit({ paramsBase: new Float32Array(128) });\n  return { SKY: SKY, skyNext: skyNext, skyReseed: skyReseed };\n})')(seed0, hour, at);
  W.skyReseed(read >>> 0);
  const seq = W.SKY.seq;
  while (seq[seq.length - 1].at < secs && seq.length < 400) W.skyNext();
  return seq.map((s) => ({ name: s.id, at: s.at, hold: s.hold, move: s.move }));
}

// the director's look, read as a kind: the cloud sea, or the land's strongest (dunes, mesa, forest, meadow, scrub, bare)
function lookKind(lk, wC, duneH) {   // (duneH: the main dunes' drawn height there, m; 'dunes' by the same rule as the cut's)
  if (wC > 0.5) return 'sea';
  if (duneH >= DUNE_MIN) return 'dunes';   // (before the mesa: a land on dunes by the cut's rule is read as dunes)
  if (lk[10] > 0.5) return 'mesa';
  const c = [['forest', lk[3]], ['meadow', lk[4]], ['scrub', lk[5]], ['bare', lk[6]]];
  return c.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
const q = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

// one land: the flight's ray for secs, the director replayed along it; the places and flocks beside it
// the land's own first heading, its stream's draw (airHeading0's, where the curated table leaves it null), rad
const HEAD_SALT = /RNG\(subseed\(J\.seed, (\d+)\)\)\.r\(0, 2 \* PI\)/.exec(HEAD0);
export function streamHeading(k) { const L = landOf(k); return L.STREAMS.RNG(L.STREAMS.subseed(L.SEED0, +HEAD_SALT[1])).r(0, 2 * Math.PI); }
export function flyLand(k, secs = 7200, heading = null) {   // (heading: another first heading than the land's own, rad)
  const L = landOf(k), kits = KITS(L.STREAMS), V_MS = kits.dunes.speed || +SPEED0[1], psi = heading === null ? L.heading : heading, hx = Math.sin(psi), hz = Math.cos(psi), len = V_MS * secs;
  FIRST_NOW = L.firstOf({ light: { sunAz: 0 } });   // (WORLD.first for this land's cells)
  const looks = [], sea = []; let cut0 = null;   // (cut0: the land at the cut, the director's look within 250 m of the landing)
  const az = Math.atan2(Math.cos(L.windAz), Math.sin(L.windAz));   // (the wind toward (sin, cos) in (x, z), as mainAt's (cos a, sin a))
  const duneHAt = (x, z, wD) => mainAt(x, z, az).H / 32 * +DUNE_H[1] * wD;   // (the S1 dune's height, 32 amp, by the sand weight)
  for (let t = 0, i = 0; t <= secs; t += 0.5, i++) {   // (the director's tick, 0.5 s; its look every 5 s)
    L.CS.x = hx * V_MS * t; L.CS.z = hz * V_MS * t; L.directorStep(t);
    if (i % 10 === 0) {
      const D = L.MAPS.D, s = D.seen[D.seen.length - 1], w = L.kitAt(L.CS.x, L.CS.z).wC;
      sea.push({ t, wC: w }); if (s) looks.push({ t, kind: lookKind(s.look, w, duneHAt(L.CS.x, L.CS.z, L.kitAt(L.CS.x, L.CS.z).wD)) });
      const wD = L.kitAt(L.CS.x, L.CS.z).wD, dH = duneHAt(L.CS.x, L.CS.z, wD);
      if (t === 0 && s) cut0 = { wC: +w.toFixed(3), wD: +wD.toFixed(3), Kd: +s.look[7].toFixed(3), sandRock: +s.look[6].toFixed(3), duneH: +dH.toFixed(1), onDunes: w < 0.5 && dH >= DUNE_MIN, kind: lookKind(s.look, w, dH), mistQ: L.mistQ === null ? null : +L.mistQ.toFixed(3) };
    }
  }
  // the cells within reach of the way (1.6 km aside: a place is passed within SIGHT, a cell's site up to 0.8 of it off)
  const pois = [], flocks = [], seen = new Set(), reach = 1600;
  for (const [kind, size] of [['dunes', kits.dunes.layout.scales[0].size], ['above', kits.above.layout.scales[0].size]]) {
    for (let s = -reach; s <= len + reach; s += size / 2) for (let l = -reach; l <= reach; l += size / 2) {
      const x = hx * s - hz * l, z = hz * s + hx * l, ix = Math.floor(x / size), iz = Math.floor(z / size), key = kind + ix + ',' + iz;
      if (seen.has(key)) continue; seen.add(key);
      const c = cellPlacesBoth(L, kits, kind, ix, iz, size);
      for (const p of c.pois) pois.push({ realm: kind, site: key, ...p });
      flocks.push(...c.flocks);
    }
  }
  // the destination: its own layout scale's one cell (180, scale 5), the dunes kit's dest, kept whatever the density draws
  // (the above kit has no dest yet: over the cloud sea too it is the dunes kit's rock)
  if (kits.dunes.dest) {
    DEST_NOW = L.destOf(); const dc = { inside: () => true, add: (it) => it, poi: (p) => { pois.push({ realm: 'dunes', site: 'dest', kind: p.kind, x: p.x, z: p.z, pass: p.pass || 0, r: p.r, top: p.top }); return p; } };
    kits.dunes.dest(dc, null); DEST_NOW = null;
  }
  const pass = (o) => { const sx = o.x * hx + o.z * hz, d = Math.abs(-o.x * hz + o.z * hx); return { t: sx / V_MS, d }; };
  const P = pois.map((p) => ({ ...p, ...pass(p) })).filter((p) => p.t >= 0 && p.t <= secs).sort((a, b) => a.t - b.t);
  const F = flocks.map((f) => pass(f)).filter((f) => f.t >= 0 && f.t <= secs && f.d <= FLOCK).sort((a, b) => a.t - b.t);
  return { k, seed0: L.SEED0, heading: psi, speed: V_MS, cut: cut0, looks, sea, places: P, flocks: F };
}

// an opening's measures: its land's places with its sky's order
export function measure(land, hour, read, at, secs = 7200) {
  const sky = skyOrder(land.seed0, hour, at, read, secs);
  const changes = sky.map((s) => s.at + s.hold).filter((t) => t > 0 && t <= secs);   // (a change begins as its sky's hold ends)
  const passed = land.places.filter((p) => p.d <= SIGHT), near = land.places.find((p) => p.d <= NEAR);
  // the places passed, one a site (a site's points of interest, as the ruins and their mesa, count once: its first)
  const sites = [], had = new Set(); for (const p of passed) if (!had.has(p.site)) { had.add(p.site); sites.push(p); }
  const stretch = sites.slice(1).map((p, i) => p.t - sites[i].t);
  // crossings: wC through 0.5, with 0.1 either side
  let state = land.sea[0].wC > 0.5, cross = [];
  for (const s of land.sea) { if (state && s.wC < 0.4) { state = false; cross.push(s.t); } else if (!state && s.wC > 0.6) { state = true; cross.push(s.t); } }
  // look runs
  const runs = []; let r0 = land.looks[0];
  for (let i = 1; i <= land.looks.length; i++) { const L = land.looks[i]; if (!L || L.kind !== r0.kind) { runs.push(((L ? L.t : secs) - r0.t)); r0 = L; } }
  // rewards: a place passed, a flock passed, a sky's change; the longest stretch without one
  const rewards = [0, ...sites.map((p) => p.t), ...land.flocks.map((f) => f.t), ...changes, secs].filter((t) => t >= 0 && t <= secs).sort((a, b) => a - b);
  let gap = 0, gapAt = 0; for (let i = 1; i < rewards.length; i++) if (rewards[i] - rewards[i - 1] > gap) { gap = rewards[i] - rewards[i - 1]; gapAt = rewards[i - 1]; }
  return {
    k: land.k, heading: land.heading, hour, read, cut: land.cut, sky0: sky[0].name,
    mistAtCut: land.cut && land.cut.mistQ !== null && MIST_BY_SKY ? +(land.cut.mistQ * (MIST_BY_SKY[sky[0].name] ?? 0)).toFixed(2) : null, /* (the opening sky's mist depth on this visit, m: its depth by sky times the visit's moisture, 215) */ firstChange: changes[0] ?? null, skyChanges: changes.length,
    firstNear: near ? +near.t.toFixed(1) : null, firstNearKind: near ? near.kind : null, firstSight: passed.length ? +passed[0].t.toFixed(1) : null,
    places: sites.length, placesPerHour: +(sites.length / (secs / 3600)).toFixed(1), stretch: stretch.length ? [q(stretch, 0.1), q(stretch, 0.5), q(stretch, 0.9)].map((x) => +x.toFixed(0)) : null,
    flocks: land.flocks.length, crossings: cross.length, firstCrossing: cross[0] ?? null,
    lookRun: runs.length ? [q(runs, 0.1), q(runs, 0.5), q(runs, 0.9)] : null, maxGap: +gap.toFixed(0), maxGapAt: +gapAt.toFixed(0)
  };
}

// the visits summed: a row a land (its hours and reads together), then the bars over every visit
export const BARS = { firstNear: 40, maxGap: 180 };
export function report(rows, secs = 7200) {
  const by = new Map(); for (const r of rows) { if (!by.has(r.k)) by.set(r.k, []); by.get(r.k).push(r); }
  const f = (x, d = 0) => (x === null || x === undefined || Number.isNaN(x) ? '-' : (+x).toFixed(d));
  const L = ['k   heading  1st near  kind     1st sight  places/h  stretch p10/50/90  flocks/h  cross/h  1st cross  sky chg  1st chg p50  max gap p50 (worst)'];
  for (const [k, R] of by) {
    const r = R[0], gaps = R.map((x) => x.maxGap), chg = R.map((x) => x.firstChange).filter((x) => x !== null);
    L.push([String(k).padEnd(3), f(r.heading * 180 / Math.PI).padStart(7), f(r.firstNear, 1).padStart(9), String(r.firstNearKind || '-').padEnd(8), f(r.firstSight, 1).padStart(10), f(r.placesPerHour, 1).padStart(9),
      String(r.stretch ? r.stretch.join('/') : '-').padStart(18), f(r.flocks / (secs / 3600), 1).padStart(9), f(r.crossings / (secs / 3600), 1).padStart(8), f(r.firstCrossing).padStart(10),
      f(R.reduce((a, x) => a + x.skyChanges, 0) / R.length, 1).padStart(8), f(q(chg, 0.5)).padStart(12), (f(q(gaps, 0.5)) + ' (' + f(Math.max(...gaps)) + ')').padStart(20)].join(' '));
  }
  const lands = [...by.values()].map((R) => R[0]);
  const nearOk = lands.filter((r) => r.firstNear !== null && r.firstNear <= BARS.firstNear).length, gapOk = rows.filter((r) => r.maxGap <= BARS.maxGap).length;
  const st = lands.filter((r) => r.stretch).map((r) => r.stretch[1]);
  L.push('', `bars: a near pass (within ${NEAR} m) by ${BARS.firstNear} s on ${nearOk} of ${lands.length} lands (the first near pass's median ${f(q(lands.map((r) => r.firstNear ?? Infinity), 0.5))} s);`,
    `      the longest stretch with no reward under ${BARS.maxGap} s on ${gapOk} of ${rows.length} visits;`,
    `      the place stretch: the lands' medians' median ${f(q(st, 0.5))} s (the reference: p10/50/90 ${REF_STRETCH.join('/')} s)`,
    `the cut: ${lands.filter((r) => r.cut && r.cut.onDunes).length} of ${lands.length} lands open over dunes (main dunes ${DUNE_MIN} m or more, no cloud sea): ${lands.filter((r) => r.cut && r.cut.onDunes).map((r) => 'k' + r.k + ' ' + r.cut.duneH + ' m').join(', ') || 'none'}`);
  return L.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {   // (run, not imported)
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
  const reads = +arg('--reads', 3), secs = +arg('--secs', 7200), ks = arg('--k', null), hs = arg('--hours', null), out = arg('--json', null);
  const K = ks ? ks.split(',').map(Number) : [...Array(16).keys()], H = hs ? hs.split(',') : HOURS, rows = [], t0 = Date.now();
  for (const k of K) {
    const land = flyLand(k, secs);
    for (const hour of H) for (let j = 0; j < reads; j++) {
      const read = (k + 16 * (1 + j * 7919)) >>> 0, at = ((read * 2654435761) >>> 0) / 4294967296 * 0.999;   // (a read whose opening is k; its place in the hour)
      rows.push(measure(land, hour, read, at, secs));
    }
    process.stderr.write(`k${k}: ${land.places.filter((p) => p.d <= SIGHT).length} places in sight, ${land.flocks.length} flocks (${((Date.now() - t0) / 1000).toFixed(1)} s)\n`);
  }
  if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  console.log(report(rows, secs));
  console.log(`\n${rows.length} visits (${K.length} lands x ${H.length} hours x ${reads} reads, ${secs} s each) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
