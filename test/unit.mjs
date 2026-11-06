// unit.mjs: the world's pure code, tested in Node (restructure step 6). Nothing here needs WebGL or a page: the code is
// read from the dev build (src/ assembled by tools/parts.mjs into a temporary folder, as tools/start.mjs reads it), cut
// out by its own anchors and run in a function of its own, so src/ exports nothing for the tests.
//   node --test test/unit.mjs                 run (CI: validate.yml, "The world's pure code, unit-tested")
//   node test/unit.mjs --write                write test/golden/unit.json from today's code (after a deliberate change)
// What it holds:
//   streams   splitmix32, mix32, subseed, RNG and the integer hashes (ihash, ihash2, cellHash, hfl, hk): their values
//             (golden), their ranges and their spread
//   sky       the order of the skies (skyInit, skyPush, skyNext): the landing sky is one the hour lists; never one of the
//             last few; a near sky unless the change is far, far about SKY_FAR of the time; every sky seen; the same
//             order from the same seed
//   maps      the maps and the director (mapsInit, kitAt, directorStep, kwFollow): kit weights in [0, 1] and finite, the
//             same plan and the same flight from the same seed, and their hashes (golden)
//   plan      the plan's worker (built from the world's spans: tools/build.mjs --plain) against the page's own plan:
//             answered, adopted, then flown, hash for hash
// An anchor not found fails with its text: the code moved, and the test's anchor follows it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLD = path.join(ROOT, 'test', 'golden', 'unit.json');
const WRITE = process.argv.includes('--write');

// ------------------------------------------------------------------ the code under test
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'unit-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'parts.mjs'), 'assemble', path.join(ROOT, 'src'), path.join(TMP, 'src')], { stdio: 'ignore' });
const WORLD = fs.readFileSync(path.join(TMP, 'src', 'world.js'), 'utf8');
function cut(s, a, b, withEnd = false) {   // from anchor a (included) to anchor b (excluded, or included)
  const i = s.indexOf(a);
  assert.ok(i >= 0 && s.indexOf(a, i + 1) < 0, 'anchor not found once in world.js: ' + JSON.stringify(a));
  const j = s.indexOf(b, i + a.length);
  assert.ok(j >= 0, 'end anchor not found after ' + JSON.stringify(a) + ': ' + JSON.stringify(b));
  return s.slice(i, withEnd ? j + b.length : j);
}
const STREAMS = cut(WORLD, '  /* ---------------------------------------------------------------- streams */', '  /* ---------------------------------------------------------------- colour */');
const VEC = cut(WORLD, '  /* ---------------------------------------------------------------- small vector maths (build time) */', '  var BUILD = ');

// ------------------------------------------------------------------ the golden values
const gold = WRITE ? {} : JSON.parse(fs.readFileSync(GOLD, 'utf8'));
function golden(key, value) {
  if (WRITE) { gold[key] = value; return; }
  assert.ok(key in gold, 'no golden value for ' + key + ' (node test/unit.mjs --write)');
  assert.deepEqual(value, gold[key], key + ' changed (a deliberate change: node test/unit.mjs --write, and commit test/golden/unit.json)');
}
const md5 = () => crypto.createHash('md5');
function upd(h, v) {   // a value into a hash: numbers as their 8 bytes, typed arrays as their bytes, the rest by structure
  if (v === null || v === undefined) { h.update('~' + v); return; }
  if (ArrayBuffer.isView(v)) { h.update(v.constructor.name); h.update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)); return; }
  if (typeof v === 'number') { const b = Buffer.alloc(8); b.writeDoubleLE(v); h.update(b); return; }
  if (Array.isArray(v)) { h.update('[' + v.length); v.forEach((x) => upd(h, x)); return; }
  if (typeof v === 'object') { const ks = Object.keys(v); h.update('{' + ks.join(',')); ks.forEach((k) => upd(h, v[k])); return; }
  h.update(String(v));
}
const digest = (...v) => { const h = md5(); v.forEach((x) => upd(h, x)); return h.digest('hex').slice(0, 12); };

// ------------------------------------------------------------------ streams and hashes
const S = vm.runInThisContext('(function () {\n  \'use strict\';\n' + STREAMS +
  '\n  return { mix32: mix32, splitmix32: splitmix32, subseed: subseed, RNG: RNG, ihash: ihash, ihash2: ihash2, cellHash: cellHash, hfl: hfl, hk: hk };\n})')();

test('streams: values', () => {
  const f = S.splitmix32(0), g = S.splitmix32(12345);
  golden('streams.splitmix32', { s0: Array.from({ length: 6 }, f), s12345: Array.from({ length: 6 }, g) });
  golden('streams.mix32', [0, 1, 2, 41, 0xffffffff, 123456789].map(S.mix32));
  golden('streams.subseed', [[0, 41], [0, 42], [7, 41], [123456789, 77], [0xdeadbeef, 79]].map(([s, k]) => S.subseed(s, k)));
  golden('streams.ihash', { ihash: [0, 1, 2, 1e9, 0xffffffff].map(S.ihash), ihash2: [[0, 0], [1, 0], [0, 1], [-1, -1], [1000, -2000]].map(([a, b]) => S.ihash2(a, b)), cellHash: [[0, 0, 1], [3, 4, 5], [-7, 9, 0x1234]].map(([a, b, c]) => S.cellHash(a, b, c)) });
});
test('streams: ranges and spread', () => {
  const f = S.splitmix32(41); let sum = 0, lo = 1, hi = 0;
  for (let i = 0; i < 200000; i++) { const x = f(); assert.ok(x >= 0 && x < 1); sum += x; lo = Math.min(lo, x); hi = Math.max(hi, x); }
  assert.ok(Math.abs(sum / 200000 - 0.5) < 0.005, 'mean ' + sum / 200000);
  assert.ok(lo < 1e-4 && hi > 1 - 1e-4);
  const a = S.splitmix32(99), b = S.splitmix32(99);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b(), 'the same seed, the same stream');
  const salts = new Set(); for (let k = 0; k < 200; k++) salts.add(S.subseed(12345, k));
  assert.equal(salts.size, 200, 'every salt its own stream');
  const r = S.RNG(5), arr = ['a', 'b', 'c'];
  for (let i = 0; i < 5000; i++) {
    const x = r.r(2, 3), n = r.i(7), p = r.pick(arr), s = r.sign(), z = r.seed(), g = r.n();
    assert.ok(x >= 2 && x < 3 && Number.isInteger(n) && n >= 0 && n < 7 && arr.includes(p) && (s === 1 || s === -1) && Number.isInteger(z) && z >= 0 && z < 4294967296 && Number.isFinite(g));
  }
  for (let i = 0; i < 20000; i++) { const h = S.ihash(i * 2654435761); assert.ok(h >>> 0 === h); const v = S.hfl(h); assert.ok(v >= 0 && v < 1); }
  assert.notEqual(S.cellHash(0, 0, 1), S.cellHash(1, 0, 1)); assert.notEqual(S.cellHash(0, 0, 1), S.cellHash(0, 1, 1)); assert.notEqual(S.cellHash(0, 0, 1), S.cellHash(0, 0, 2));
  assert.equal(S.hk(77, 3), S.ihash(80));
});

// ------------------------------------------------------------------ the sky order
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const SKYORD = cut(WORLD, '  /* ---- the order (the live\'s pushSky and nextSky, on the world\'s streams) */', '  /* ---- the quick crossing');
function skyWorld(seed, hour, at) {   // skyInit, skyPush and skyNext as the page runs them, a fake page under them (the colours unread)
  return vm.runInThisContext('(function (SEED, HOURV, AT) {\n  \'use strict\';\n' +
    '  var DEVMODE = false, OPT = { skyScene: null, skyNext: null, skyDt: null }, HOUR = HOURV, J = { seed: SEED };\n' +
    '  function attr(n) { return n === \'data-sky-at\' ? String(AT) : null; }\n' +
    '  function lin2lab(c) { return [0, 0, 0]; } function lab2linA() { return [0, 0, 0]; } function lin2lab3() { return [0, 0, 0]; }\n' +
    '  var PI = Math.PI, DEG = Math.PI / 180;\n' + STREAMS + VEC +
    '  function lch() { return [0, 0, 0]; }\n' + SKYDEF + SKYORD +
    '  skyInit({ paramsBase: new Float32Array(128) });\n' +
    '  return { SKY: SKY, WSKY: WSKY, skyNext: skyNext, SKY_RECENT: SKY_RECENT, SKY_FAR: SKY_FAR };\n})')(seed, hour, at);
}
test('sky: the order\'s rules', () => {
  const hours = ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'];
  let far = 0, steps = 0; const K0 = skyWorld(1, 'day', 0.5);
  for (let seed = 1; seed <= 120; seed++) {
    const hour = hours[seed % hours.length], K = skyWorld(seed * 2654435761 >>> 0, hour, (seed % 10) / 10), { SKY, WSKY } = K;
    const land = SKY.land[hour] || SKY.land.day;
    assert.ok(land.includes(SKY.seq[0].id), `seed ${seed}: the landing sky ${SKY.seq[0].id} is not one ${hour} lists (${land})`);
    assert.equal(SKY.landing.sky, SKY.seq[0].id);
    for (let n = 0; n < 40; n++) K.skyNext();
    const seen = new Set(SKY.seq.map((x) => x.id));
    assert.equal(seen.size, SKY.ids.length, `seed ${seed}: every sky seen in 40 changes (${[...seen]})`);
    const back = Math.min(K.SKY_RECENT, SKY.ids.length - 2);
    for (let i = 1; i < SKY.seq.length; i++) {
      const id = SKY.seq[i].id, prev = SKY.seq[i - 1];
      assert.ok(SKY.ids.includes(id));
      assert.ok(!SKY.seq.slice(Math.max(0, i - back), i).some((x) => x.id === id), `seed ${seed}: sky ${i} (${id}) is one of the last ${back}`);
      if (!prev.far) assert.ok(WSKY[prev.id].near.includes(id), `seed ${seed}: ${prev.id} -> ${id} is not near, but not marked far`);
      else far++;
      steps++;
      assert.ok(SKY.seq[i].at > prev.at && SKY.seq[i].hold > 0 && SKY.seq[i].move >= 55 && SKY.seq[i].move < 60);
    }
  }
  assert.ok(far > 0 && far / steps < K0.SKY_FAR, `far changes ${(far / steps).toFixed(3)} of ${steps} (some, and fewer than SKY_FAR's draws: a far draw may still land on a near sky)`);
});
test('sky: the same seed, the same order (golden)', () => {
  const order = (seed) => { const K = skyWorld(seed, 'night', 0.5); for (let n = 0; n < 30; n++) K.skyNext(); return K.SKY.seq.map((x) => x.id + ':' + x.hold.toFixed(6) + ':' + x.move.toFixed(6)); };
  assert.deepEqual(order(424242), order(424242));
  assert.notDeepEqual(order(424242), order(424243));
  golden('sky.order', { 424242: digest(order(424242)), 7: digest(order(7)) });
});

// ------------------------------------------------------------------ the maps, the director, the weights' grids
// (the spans the plan's worker copies, the director's step after them; the page's globals they read stubbed)
const A1 = '  var CW = (function () {\n', A2 = '  var MAPS = {', A3 = '  var KN = 256, KSTEP = 64,';
const E1 = '\n  })();\n', E2 = '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', E3 = '  var KFROWS = FN * FN / KN;';
const DS = '  var DIR_DT = 0.5, DIR_SEE = 5,', DE = '  /* ---------------------------------------------------------------- the weights\' grids';
const PLANCODE = cut(WORLD, A1, E1, true) + cut(WORLD, A2, E2, true) + cut(WORLD, A3, E3) + cut(WORLD, DS, DE);
const PRE = '  var PI = Math.PI, DEG = Math.PI / 180, FRT = { tanX: Math.tan(36 * DEG), tanY: 1 }; function bootMark() {}\n' +
  '  function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / (2 * Math.PI)) * 2 * Math.PI; return d; }\n';
const EXPOSE = '\n  G.kwFirst = typeof kwFirst === \'function\' ? kwFirst : null; G.HALF = typeof KW_MARGIN === \'number\' ? Math.atan(FRT.tanX) + KW_MARGIN : 0;' +
  '\n  G.MAPS = MAPS; G.KW = KW; G.KG = KG; G.KF = KF; G.mapsInit = mapsInit; G.kwFollow = kwFollow; G.kitAt = kitAt; G.directorStep = directorStep;\n';
const pageFn = vm.runInThisContext('(function (G, CS) {\n  \'use strict\';\n' + PRE + PLANCODE + EXPOSE + '})');
function page() { const G = {}, CS = { x: 0, z: 0 }; pageFn(G, CS); G.CS = CS; return G; }
function snap(G) {   // the plan's state, hashed: the anchors, the director, the grids, and 400 kit and field samples about the camera
  const D = G.MAPS.D, KW = G.KW, KF = G.KF, KG = G.KG, out = {};
  let h = md5(); ['B', 'S', 'N'].forEach((n) => { const f = D.fam[n]; h.update(n); upd(h, [f.n, f.nActive]); for (const [k, r] of f.tab) { upd(h, k); upd(h, r); } }); out.anchors = h.digest('hex').slice(0, 12);
  out.dir = digest([D.cam, D.t, D.log, D.seen, D.nMean, D.land0, D.landScore, D.scale, G.MAPS.w.aC, G.MAPS.w.aH, G.MAPS.ox, G.MAPS.oz]);
  out.kw = digest([KW.data, KW.ix, KW.dx, KG.v, KG.ix, KW.baked, KW.derived, KW.i0, KW.j0, KW.qi, KW.di, KW.ok, KW.cx, KW.cz]);
  out.kf = digest([KF.data, KF.ix, KF.dx, KF.baked, KF.derived, KF.i0, KF.j0, KF.ok, KF.cx, KF.cz]);
  h = md5(); const o = new Float64Array(8);
  for (let k = 0; k < 400; k++) { const a = k * 2.399963, r = 40 * Math.sqrt(k), x = G.CS.x + r * Math.cos(a), z = G.CS.z + r * Math.sin(a); const w = G.kitAt(x, z); upd(h, [w.wD, w.wC]); D.fieldP(x + G.MAPS.ox, z + G.MAPS.oz, o); upd(h, o); }
  out.samples = h.digest('hex').slice(0, 12);
  return out;
}
function fly(G, seconds) {   // a slow turn at 30 m/s: the director's step and the grids' follow every 1/60 s
  const dt = 1 / 60; let t = G.t || 0, psi = 0.7;
  for (let k = 0; k < seconds * 60; k++) { t += dt; psi += 0.0004 * Math.sin(t / 40); G.CS.x += 30 * dt * Math.sin(psi); G.CS.z += 30 * dt * Math.cos(psi); G.directorStep(t); G.kwFollow(G.CS.x, G.CS.z, false); }
  G.t = t;
}
test('maps: kit weights in [0, 1], finite', () => {
  const G = page(); G.mapsInit(11); G.kwFollow(0, 0, true);
  for (let k = 0; k < 3000; k++) {
    const a = k * 2.399963, r = 60 * Math.sqrt(k), w = G.kitAt(r * Math.cos(a), r * Math.sin(a));
    assert.ok(Number.isFinite(w.wD) && Number.isFinite(w.wC) && w.wD >= 0 && w.wD <= 1 && w.wC >= 0 && w.wC <= 1, `kitAt sample ${k}: ${JSON.stringify(w)}`);
  }
});
test('maps: the same seed, the same plan and flight (golden)', () => {
  const run = (seed) => { const G = page(); G.mapsInit(seed); G.kwFollow(0, 0, true); const a = snap(G); fly(G, 15); return { plan: a, flight: snap(G) }; };
  const a = run(11), b = run(11), c = run(3);
  assert.deepEqual(a, b, 'the same seed, the same plan and flight');
  assert.notDeepEqual(a.plan, c.plan, 'another seed, another plan');
  golden('maps.seed11', a); golden('maps.seed3', c);
});

// ------------------------------------------------------------------ the plan's worker against the page's own plan
test('plan: the worker\'s plan, adopted, is the page\'s', async () => {
  const name = (WORLD.match(/new Worker\((['"])\/(plan[^'"]*\.js)\1\)/) || [])[2];
  assert.ok(name, 'the world starts no plan worker');
  // the worker as the build makes it (tools/plan.mjs, from the same dev build), or site/'s while it is still committed
  const planSrc = fs.existsSync(path.join(ROOT, 'tools', 'plan.mjs'))
    ? (await import(new URL('../tools/plan.mjs', import.meta.url))).makePlan(WORLD, name).text
    : fs.readFileSync(path.join(ROOT, 'site', name), 'utf8');
  const v = (planSrc.match(/var PLANV = '([0-9a-f]+)'/) || [])[1];
  assert.equal((WORLD.match(/var PW_V = '([0-9a-f]*)';/) || [])[1], v, 'the world\'s PW_V is the worker\'s stamp');
  for (const seed of [11, 3]) {
    let listener = null, msg = null;
    vm.runInThisContext('(function (addEventListener, postMessage, close) {\n' + planSrc + '\n})')((k, f) => { if (k === 'message') listener = f; }, (m, tr) => { msg = structuredClone(m, { transfer: tr || [] }); }, () => {});
    listener({ data: { v, seed } });
    assert.ok(msg && msg.seed === seed && msg.v === v, 'the worker answered');
    const W = page(); W.mapsInit(seed, msg.inj);   // planAdopt's lines
    Object.assign(W.KW, { data: msg.kw.data, ix: msg.kw.ix, dx: msg.kw.dx, baked: msg.kw.baked, derived: msg.kw.derived, dirty: msg.kw.dirty, ok: true });
    Object.assign(W.KG, { v: msg.kg.v, ix: msg.kg.ix });
    Object.assign(W.KF, { data: msg.kf.data, ix: msg.kf.ix, dx: msg.kf.dx, baked: msg.kf.baked, derived: msg.kf.derived, dirty: msg.kf.dirty });
    W.kwFollow(0, 0, true);
    const P = page(); P.mapsInit(seed); P.kwFollow(0, 0, true);   // the page's own, whole
    assert.deepEqual(snap(W), snap(P), `seed ${seed}: the adopted plan is the page's`);
    fly(W, 10); fly(P, 10);
    assert.deepEqual(snap(W), snap(P), `seed ${seed}: and so is the flight after it`);
  }
});

if (WRITE) {
  process.on('beforeExit', () => {
    fs.mkdirSync(path.dirname(GOLD), { recursive: true });
    const sorted = Object.fromEntries(Object.keys(gold).sort().map((k) => [k, gold[k]]));
    fs.writeFileSync(GOLD, JSON.stringify(sorted, null, 1) + '\n');
    console.log('unit: wrote ' + path.relative(ROOT, GOLD) + ' (' + Object.keys(gold).length + ' values)');
  });
}
