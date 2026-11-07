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
//   verdict   .github/ci/verdict.mjs on T2's read-backs: identical, unread only (the frames decide) and differ
//   governor  the render scale's governor on synthetic frame clocks: a steady 60 Hz keeps the top rung; a cost the scale
//             fixes steps down and stays; one it cannot (a 30 fps cap) is undone and learnt as the pace; under 15 fps
//             at every rung gives up; a hidden tab's gap is no frame; a 144 Hz display is never asked to beat 60 Hz
//   framing   setFrustum and basePitchT per window shape: 72 degrees across a wide window, the horizon at the world's frame
//             (0.55 wide, 0.58 tall) raised 9 degrees from 6:5 (a step, about 72% down at 1440x900); a tall window at most
//             80 degrees tall and at least 42 across until that cap
//   drag      onMove: under 8 px a tap, from 8 px a drag (the first 8 px taken too), a vertical swipe on a touch page that
//             scrolls the page's; applyInput's gain: 90 degrees across the window's width, at any width
//   sky timing every hold 0.9-1.15 of its sky's (the moonlit sea's 190 s), changes 55-60 s back to back, and the visit
//             opening 0.9 x hold x data-sky-at into its first sky (halfway when the hour's mark is unread)
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
const SKYORD = cut(WORLD, '  /* ---- the order (the live\'s pushSky and nextSky, on the world\'s streams) */', '  /* ---- the cycle at t');
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
  '\n  G.MAPS = MAPS; G.KW = KW; G.KG = KG; G.KF = KF; G.mapsInit = mapsInit; G.kwFollow = kwFollow; G.kitAt = kitAt; G.directorStep = directorStep;' +
  '\n  G.kwAdoptFirst = kwAdoptFirst; G.kwAdoptRest = kwAdoptRest; G.kfFollow = kfFollow;\n';
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
  // the worker as the build ships it (tools/plan.mjs buildPlan: minified; from the same dev build), or site/'s while it is still committed
  const planSrc = fs.existsSync(path.join(ROOT, 'tools', 'plan.mjs'))
    ? await (async (m) => (m.buildPlan ? (await m.buildPlan(WORLD, name)).text : m.makePlan(WORLD, name).text))(await import(new URL('../tools/plan.mjs', import.meta.url)))
    : fs.readFileSync(path.join(ROOT, 'site', name), 'utf8');
  const v = (planSrc.match(/var PLANV = '([0-9a-f]+)'/) || planSrc.match(/'([0-9a-f]{12})'/) || [])[1];   // (minified: PLANV renamed, its value the first 12-hex string)
  assert.equal((WORLD.match(/var PW_V = '([0-9a-f]*)';/) || [])[1], v, 'the world\'s PW_V is the worker\'s stamp');
  for (const seed of [11, 3]) {
    // (world-perf lane) two answers: the first frame's (planFirst's: kwFirst about the landing), then the window's rest
    let listener = null; const msgs = [];
    vm.runInThisContext('(function (addEventListener, postMessage, close) {\n' + planSrc + '\n})')((k, f) => { if (k === 'message') listener = f; }, (m, tr) => { msgs.push(structuredClone(m, { transfer: tr || [] })); }, () => {});
    listener({ data: { v, seed, yaw: 0.7, half: Math.atan(Math.tan(36 * Math.PI / 180)) + 5 * Math.PI / 180 } });
    const msg = msgs[0];
    assert.ok(msg && msg.seed === seed && msg.v === v && msg.part === 1, 'the worker answered');
    assert.ok(msgs.length === (msg.first.part ? 2 : 1) && (!msg.first.part || msgs[1].part === 2), 'and then with the rest');
    const adopt = () => {   // planAdopt's lines (planVisit's kfFollow after it)
      const W = page(); W.mapsInit(seed, msg.inj);
      Object.assign(W.KW, { data: msg.kw.data.slice(), ix: msg.kw.ix.slice(), dx: msg.kw.dx.slice(), baked: msg.kw.baked, derived: msg.kw.derived, dirty: msg.kw.dirty.slice() });
      Object.assign(W.KG, { v: msg.kg.v.slice(), ix: msg.kg.ix.slice() });
      Object.assign(W.KF, { data: msg.kf.data.slice(), ix: msg.kf.ix.slice(), dx: msg.kf.dx.slice(), baked: msg.kf.baked, derived: msg.kf.derived, dirty: msg.kf.dirty });
      W.kwAdoptFirst(msg.first, msg.kwr ? msg.kwr.slice() : null); W.kfFollow(0, 0, true);
      return W;
    };
    const W = adopt(); if (msgs[1]) W.kwAdoptRest(msgs[1]);   // both answers
    const W1 = adopt();   // the first alone (the rest never came: the page bakes it, as before)
    W.kwFollow(0, 0, true); W1.kwFollow(0, 0, true);
    const P = page(); P.mapsInit(seed); P.kwFollow(0, 0, true);   // the page's own, whole
    assert.deepEqual(snap(W), snap(P), `seed ${seed}: the adopted plan is the page's`);
    assert.deepEqual(snap(W1), snap(P), `seed ${seed}: the first answer alone, the rest made here, is the page's too`);
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

// ------------------------------------------------------------------ the shaders' minifier (tools/glslmin.mjs)
test('glslmin: the same program, token for token', async () => {
  const { minGlsl, checkGlsl, tokens } = await import(new URL('../tools/glslmin.mjs', import.meta.url));
  const cases = [
    ['float a = b - -c;', 'float a=b- -c;'],
    ['float a = b + +c;', 'float a=b+ +c;'],
    ['x = y / *p;', 'x=y/ *p;'],
    ['a = b-- - c;', 'a=b---c;'],   // (b -- - c: the same tokens, maximal munch)
    ['a = b & &c;', 'a=b& &c;'],
    ['vec2 v = vec2(1.0, .5) * 1e-3;  // a comment', 'vec2 v=vec2(1.0,.5)*1e-3;'],
    ['  uniform vec3 uA; /* why */ uniform int uDbg;', ' uniform vec3 uA;uniform int uDbg;'],   // (a piece's leading space stays one space)
    ['p.xy += q.zw;', 'p.xy+=q.zw;'],
    ['uint u = 0x1Fu;', 'uint u=0x1Fu;'],
  ];
  for (const [src, want] of cases) { assert.equal(minGlsl(src), want, src); assert.equal(checkGlsl(src), null, src); }
  // preprocessor lines keep their spacing, and their own lines; every code line stays a line
  const pre = '#version 300 es\nprecision highp float;\n#define A (1.0)   // one\n#define F(x) ((x) * 2.0)\n\n// gone\nfloat f() {\n  return F(A);\n}\n';
  assert.equal(minGlsl(pre), '#version 300 es\nprecision highp float;\n#define A (1.0)\n#define F(x) ((x) * 2.0)\nfloat f(){\nreturn F(A);\n}\n');
  // a piece's own edges: what was apart stays apart
  assert.equal(minGlsl('\nvec3 a;\n'), '\nvec3 a;\n'); assert.equal(minGlsl(' vec3 a; '), ' vec3 a; ');
  // the tokenizer: numbers, words, the longest operator
  assert.deepEqual(tokens('a<<=1.5e+2u>>b'), ['a', '<<=', '1.5e+2u', '>>', 'b']);
  // a file whose text a script reads at run time is not minified (the land split finds D_Hd by its text)
  const { KEEP } = await import(new URL('../tools/glslmin.mjs', import.meta.url));
  assert.ok(KEEP.has('dunes-glsl') && WORLD.includes("g.indexOf('vec3 D_Hd(vec2 p) {')"), 'the land split still reads dunes-glsl\'s text: keep it in KEEP');
});

test('verdict: T2 read-backs, only a DIFFER stops a merge (the owner: "frames decide")', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const run = (bits, outs, cached) => {
    const needs = { static: { result: 'success' }, plan: { result: 'success', outputs: { base: 'abc', site_changed: 'true', glsl_changed: 'true' } },
      t1: { result: 'skipped' }, t2: { result: 'success', outputs: outs || Object.assign({ frames_identical: 'true', glsl_changed: 'true', csp_ok: 'true' }, bits) } };
    const out = path.join(dir, 'v.json');
    try { execFileSync(process.execPath, [fileURLToPath(new URL('../.github/ci/verdict.mjs', import.meta.url)), dir, out], { env: Object.assign({}, process.env, { NEEDS: JSON.stringify(needs), T2_CACHED: cached ? JSON.stringify(cached) : '', GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '' }), stdio: 'pipe' }); } catch {}
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  assert.equal(run({ bits_identical: 'true', bits_differ: 'false' }).frames_identical, true, 'identical');
  assert.equal(run({ bits_identical: 'false', bits_differ: 'false' }).frames_identical, true, 'unread only: the frames decide');
  assert.equal(run({ bits_identical: 'false', bits_differ: 'true' }).frames_identical, false, 'a read that differs goes to the owner');
  assert.equal(run({ bits_identical: 'false' }).frames_identical, false, 'an answer from before bits_differ: not identical counts as differ');
  assert.equal(run({ bits_identical: 'true', bits_differ: 'false', frames_identical: 'false' }).frames_identical, false, 'a changed frame goes to the owner');
  // main after a fast-forward: the frames answer is the PR's (cached), the 4090 ran only the stall visits
  const pr = { frames_identical: 'true', glsl_changed: 'true', bits_identical: 'true', bits_differ: 'false', csp_ok: 'true' };
  const m = run(null, { frames_identical: '', glsl_changed: '', bits_identical: '', bits_differ: '', csp_ok: '', stall_ok: 'false' }, pr);
  assert.equal(m.frames_identical, true, "main keeps the PR's frames answer");
  assert.equal(m.t2.stall_ok, false, "and main's own stall visits");
  assert.equal(run(null, { stall_ok: 'true' }, pr).t2.stall_ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('deploy gate: a cancelled main gate is no result; only a failure stops live', async () => {
  const { walk } = await import(new URL('../.github/ci/deploy-walk.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const run = (c, conclusion, status = 'completed') => ({ head_sha: S(c), status, conclusion, html_url: 'u' + c });
  const V = { [S('a')]: { gate_ok: true, frames_identical: true, base: S('0') }, [S('b')]: { gate_ok: true, frames_identical: true, base: S('a') },
    [S('c')]: { gate_ok: true, frames_identical: true, base: S('b') } };
  const d = (proved) => ({ verdict: async (r) => V[r.head_sha], ownerMerge: async () => false, branchIdentical: async () => proved, laterStallOk: async () => -1, say: () => {} });
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'success'), run('c', 'success')], d(true))).to, S('c'), 'all green: the newest tip');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'cancelled'), run('c', 'success')], d(true))).to, S('c'), 'cancelled in between: past it, to the newest green');
  const f = await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', 'success')], d(true));
  assert.equal(f.to, S('a'), 'failed in between: live stops before it'); assert.match(f.why, /red at b/);
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'cancelled'), run('c', 'success')], d(false))).to, S('a'), 'cancelled, frames unproved: live waits before it');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'cancelled')], d(true))).to, S('a'), 'cancelled last: nothing newer to stand on');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', null, 'in_progress')], d(true))).to, S('a'), 'running: waits');
});

// ------------------------------------------------------------------ the governor, on synthetic frame clocks
// (dev-speed item 5) governor() cut from the world as it ships, run against frame times made here: the render scale's
// ladder (RUNG over RUNGS), its steps down and back up, the pace it learns, and the floor that gives up
const GOV = cut(WORLD, '  var GOVD = new Float32Array(120)', '  /* too slow even so: the world steps aside');
function governed(rungs = [1, 0.85, 0.72, 0.6, 0.5]) {
  return vm.runInThisContext('(function (RUNGS) {\n  \'use strict\';\n  var STILLMODE = false, OPT = {}, RUNG = 0, gave = 0;\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function giveUp() { gave++; }\n' + GOV +
    '\n  return { step: governor, rung: function () { return RUNG; }, pace: function () { return GOVN[13]; }, gave: function () { return gave; } };\n})')(rungs);
}
function play(G, seconds, frameMs, log) {   // frames at frameMs(rung, t) for `seconds` of their own time; log: the rung each second
  let t = 0, next = 1000;
  while (t < seconds * 1000) { const d = frameMs(G.rung(), t); G.step(d); t += d; if (log && t >= next) { log.push(G.rung()); next += 1000; } }
}
test('governor: a steady 60 Hz frame keeps the top rung and never gives up', () => {
  const G = governed(); play(G, 120, () => 1000 / 60);
  assert.equal(G.rung(), 0); assert.equal(G.gave(), 0); assert.ok(Math.abs(G.pace() - 1000 / 60) < 1e-9);
});
test('governor: a cost the scale fixes steps down within about four seconds and stays down', () => {
  const G = governed(), log = [];
  play(G, 120, (r) => (r === 0 ? 30 : 12), log);   // (30 ms at the full scale, 12 ms a rung down)
  const first = log.findIndex((r) => r > 0);
  assert.ok(first >= 0 && first <= 5, `first step down at ${first} s`);
  const top = log.slice(30).filter((r) => r === 0).length;
  assert.ok(top <= 10, `back at the slow top rung ${top} of the last 90 s (each try up costs a slow second or few)`);
  assert.equal(G.gave(), 0);
});
test('governor: a cost the scale cannot touch (a 30 fps cap) is undone and learnt as the pace', () => {
  const G = governed(); play(G, 60, () => 1000 / 30);
  assert.equal(G.rung(), 0, 'both steps undone');
  assert.ok(Math.abs(G.pace() - 1000 / 30) < 0.5, `pace ${G.pace()}`);
  const before = G.rung(); play(G, 60, () => 1000 / 30);
  assert.equal(G.rung(), before, 'no more steps at the learnt pace'); assert.equal(G.gave(), 0);
});
test('governor: under 15 fps that no rung helps gives up; a steady 22 fps is kept as the pace', () => {
  const G = governed(); play(G, 120, () => 80);   // (12.5 fps at every rung: the pace learnt hits its 50 ms ceiling)
  assert.ok(G.gave() >= 1, 'the still sky stays');
  const H = governed(); play(H, 120, () => 45);   // (22 fps at every rung: learnt as the pace, flown)
  assert.equal(H.gave(), 0); assert.ok(Math.abs(H.pace() - 45) < 0.5, `pace ${H.pace()}`);
});
test('governor: a hidden tab\'s gap (over a second) is not a frame', () => {
  const G = governed(); play(G, 30, () => 1000 / 60); G.step(5000); G.step(30000); play(G, 30, () => 1000 / 60);
  assert.equal(G.rung(), 0); assert.equal(G.gave(), 0);
});
test('governor: a 144 Hz display is never asked to beat 60 Hz', () => {
  const G = governed(); play(G, 60, () => 1000 / 144);
  assert.equal(G.rung(), 0); assert.ok(Math.abs(G.pace() - 1000 / 60) < 1e-9);
});

// ------------------------------------------------------------------ the camera's framing, per window shape
// (dev-speed item 5b) setFrustum and basePitchT cut from the world as it ships; the field of view, the frame and the
// wide windows' tilt read from the world too (FOV_LONG, CAMUP, the world's frame: [wide, tall])
const FRUSTUM = cut(WORLD, '  function setFrustum(snap) {', '  function easeFrustum(');
const PITCH = cut(WORLD, '  function basePitchT(V) {', '\n', true);
const num = (re) => { const m = re.exec(WORLD); assert.ok(m, 'not found in world.js: ' + re); return m.slice(1).map(Number); };
const [FOV] = num(/var FOV_LONG = (\d+(?:\.\d+)?);/), [UP] = num(/var CAMUP = (\d+(?:\.\d+)?);/), FRAME = num(/frame: \[([\d.]+), ([\d.]+)\]/);
function framing(w, h) {   // the frustum and the base pitch for a window w x h; the horizon's place, 0 the top, 1 the bottom
  const F = vm.runInThisContext('(function (W, H, FOV_LONG, CAMUP, FRAME) {\n  \'use strict\';\n  var DEG = Math.PI / 180, OUT = { w: W, h: H }, FRT = {}, FR = {}, TALLK = 0, WIDEK = 1, WIDEKT = 1;\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
    '  function lerp(a, b, t) { return a + (b - a) * t; }\n  function wideWin() { return W * 5 >= H * 6; }\n' + FRUSTUM + PITCH +
    '\n  setFrustum(true); var p = basePitchT({ def: { frame: FRAME } });\n  return { tanX: FRT.tanX, tanY: FRT.tanY, pitch: p, wide: WIDEKT, tall: TALLK };\n})')(w, h, FOV, UP, FRAME);
  const deg = (t) => (2 * Math.atan(t) * 180) / Math.PI;
  return { across: deg(F.tanX), tall: deg(F.tanY), pitch: (F.pitch * 180) / Math.PI, wide: F.wide, horizon: 0.5 + Math.tan(F.pitch) / (2 * F.tanY) };
}
test('framing: 72 degrees across a wide window, the horizon at the frame raised 9 degrees (1440x900: about 72% down)', () => {
  assert.equal(FOV, 72); assert.equal(UP, 9); assert.deepEqual(FRAME, [0.55, 0.58]);
  for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1080], [1280, 1024]]) {
    const f = framing(w, h);
    assert.ok(Math.abs(f.across - 72) < 1e-9, `${w}x${h}: ${f.across} across`); assert.equal(f.wide, 1, `${w}x${h} is wide`);
    const flat = 0.5 + (2 * FRAME[0] - 1) / 2, raised = 0.5 + Math.tan(Math.atan((2 * FRAME[0] - 1) * Math.tan(f.tall * Math.PI / 360)) + 9 * Math.PI / 180) / (2 * Math.tan(f.tall * Math.PI / 360));
    assert.ok(Math.abs(f.horizon - raised) < 1e-9 && f.horizon > flat, `${w}x${h}: horizon ${f.horizon}`);
  }
  const h = framing(1440, 900).horizon; assert.ok(h > 0.70 && h < 0.74, `1440x900: horizon ${h} (about 72% down)`);
});
test('framing: a tall window at most 80 degrees tall and at least 42 across until that cap, the horizon 58% down, no tilt', () => {
  for (const [w, h] of [[393, 852], [360, 800], [412, 915], [320, 1000], [768, 1024]]) {
    const f = framing(w, h);
    assert.ok(f.tall <= 80 + 1e-9, `${w}x${h}: ${f.tall} tall`);
    assert.ok(f.across >= 42 - 1e-9 || Math.abs(f.tall - 80) < 1e-9, `${w}x${h}: ${f.across} across with ${f.tall} tall (the 80-degree cap is the only thing that narrows it)`);
    assert.equal(f.wide, 0, `${w}x${h} is not wide`);
    if (h / w >= 1.75) assert.ok(Math.abs(f.horizon - FRAME[1]) < 1e-9, `${w}x${h}: horizon ${f.horizon} (the tall frame ${FRAME[1]})`);
  }
});
test('framing: the 9-degree tilt is a step at 6:5, never a share of it', () => {
  const a = framing(1200, 1000), b = framing(1199, 1000);
  assert.equal(a.wide, 1); assert.equal(b.wide, 0);
  assert.ok(Math.abs(a.pitch - b.pitch - 9) < 0.01, `the tilt across the step: ${a.pitch - b.pitch}`);
});

// ------------------------------------------------------------------ the drag: where it starts, how far it turns
// (dev-speed item 5c) onMove cut from the world as it ships (the start: 8 px, the first 8 px taken too; a vertical swipe
// on a touch page that scrolls left to the page), and applyInput's gain line (90 degrees across the window's width)
const MOVE = cut(WORLD, '  function onMove(e) {', '  function onUp(e) {');
const GAIN = /\n(\s*var G = \(PI \/ 2\) \/ Math\.max\(OUT\.cssW \|\| 800, 240\),)/.exec(WORLD);
function dragging(type = 'mouse', mode = 'none') {
  return vm.runInThisContext('(function (TYPE, MODE) {\n  \'use strict\';\n  var DRAG = { id: 1, x0: 100, y0: 100, x: 100, y: 100, on: false, type: TYPE }, TOUCHMODE = MODE, DOMQ = {}, running = true, REC = null,\n' +
    '    INP = { dx: 0, dy: 0, down: false }, root = { setPointerCapture: function () {} };\n  function domNext() {}\n' + MOVE +
    '\n  return { move: function (x, y) { onMove({ pointerId: 1, clientX: x, clientY: y, timeStamp: 0 }); }, on: function () { return DRAG.on; }, inp: INP };\n})')(type, mode);
}
test('drag: under 8 px is still a tap; from 8 px it steers, the first 8 px taken too', () => {
  const D = dragging(); D.move(104, 104); D.move(105.6, 105.6);   // (7.9 px from the press)
  assert.equal(D.on(), false, 'under 8 px: a tap'); assert.equal(D.inp.dx, 0);
  D.move(108, 100);   // (8 px across)
  assert.equal(D.on(), true, '8 px: a drag'); assert.equal(D.inp.dx, 8, 'the first 8 px steer too'); assert.equal(D.inp.down, true);
  D.move(130, 90); assert.equal(D.inp.dx, 30); assert.equal(D.inp.dy, -10);
});
test('drag: a vertical swipe on a touch page that scrolls is the page\'s; across it steers', () => {
  const V = dragging('touch', 'scroll'); V.move(103, 140); assert.equal(V.on(), false, 'vertical: the page scrolls');
  const H = dragging('touch', 'scroll'); H.move(140, 103); assert.equal(H.on(), true, 'across: it steers');
});
test('drag: across the window\'s width the view turns 90 degrees, on any width', () => {
  assert.ok(GAIN, 'applyInput\'s gain line not found in world.js');
  const g = (w) => vm.runInThisContext('(function (OUT) { var PI = Math.PI, INP = {};' + GAIN[1].replace(/,$/, ';') + ' return G; })')({ cssW: w });
  for (const w of [1440, 393, 800, 2560, 240]) assert.ok(Math.abs(g(w) * w - Math.PI / 2) < 1e-12, `${w} px: ${(g(w) * w * 180) / Math.PI} degrees`);
  assert.ok(Math.abs(g(100) * 240 - Math.PI / 2) < 1e-12, 'a window under 240 px turns as one of 240');
  assert.ok(Math.abs(g(0) * 800 - Math.PI / 2) < 1e-12, 'a window not yet measured turns as one of 800');
});

// ------------------------------------------------------------------ the sky's hold and change timing
// (dev-speed item 5d) skyInit and skyPush as the page runs them (skyWorld above): every hold 0.9-1.15 of its sky's own
// (the moonlit sea's 190 s among them), each change 55-60 s, each sky starting as the last change ends, and the visit
// opening as far through its first hold as the hour's data-sky-at says (0.9 of the hold at the most; 0.5 when unread)
test('sky timing: holds 0.9-1.15 of their sky\'s, changes 55-60 s, each sky as the last change ends', () => {
  let moon = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const K = skyWorld(seed * 40503 >>> 0, ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'][seed % 6], 0.3); const { SKY, WSKY } = K;
    for (let n = 0; n < 30; n++) K.skyNext();
    SKY.seq.forEach((s, i) => {
      const own = WSKY[s.id].hold;
      assert.ok(s.hold >= 0.9 * own - 1e-9 && s.hold < 1.15 * own + 1e-9, `seed ${seed}, sky ${i} (${s.id}): hold ${s.hold} against its ${own}`);
      assert.ok(s.move >= 55 && s.move < 60, `seed ${seed}, sky ${i}: change ${s.move} s`);
      if (i) { const p = SKY.seq[i - 1]; assert.equal(s.at, p.at + p.hold + p.move, `seed ${seed}, sky ${i} starts as the last change ends`); }
      if (s.id === 'moonlit') { moon++; assert.ok(s.hold >= 171, `the moonlit sea's hold ${s.hold} (190 x 0.9 at the least)`); }
    });
  }
  assert.ok(moon > 0, 'the moonlit sea came in 60 visits');
});
test('sky timing: the visit opens as far through its first hold as data-sky-at says', () => {
  for (const at of [0, 0.25, 0.5, 0.999, 1]) {
    const { SKY } = skyWorld(7, 'night', at), s = SKY.seq[0];
    assert.ok(Math.abs(s.at + s.hold * at * 0.9) < 1e-9, `at ${at}: the first sky starts ${s.at} (hold ${s.hold})`);
    assert.equal(SKY.landing.at, at);
  }
  for (const bad of ['x', -1, 2]) { const { SKY } = skyWorld(7, 'night', bad); assert.equal(SKY.landing.at, 0.5, `data-sky-at ${bad}: opens halfway`); }
});
