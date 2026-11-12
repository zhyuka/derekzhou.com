// test/unit/maps.mjs: the maps and the director, the plan's stamp, and the plan's worker against the page's own plan
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

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

// ------------------------------------------------------------------ the plan's stamp reads code, not comments
test('plan: the stamp is blind to comments and spacing', async () => {
  const { spans, stamp } = await import(new URL('../../tools/plan.mjs', import.meta.url));
  const acorn = (await import('acorn'));
  const sp = spans(WORLD), cut = sp.map((s) => {   // each span with every comment and blank run cut (its lines kept)
    const cs = []; acorn.parse('(function () {\n' + s + '\n})', { ecmaVersion: 'latest', onComment: (b, t, a, e) => cs.push([a - 15, e - 15]) });
    let out = '', at = 0; for (const [a, e] of cs) { out += s.slice(at, a); at = e; } return (out + s.slice(at)).replace(/[ \t]+\n/g, '\n');
  });
  assert.ok(cut.join('').length < sp.join('').length, 'the spans hold comments to cut');
  assert.equal(stamp(cut), stamp(sp), 'PW_V is the same with every comment out of the spans');
  assert.notEqual(stamp(sp.map((s, i) => (i === 3 ? s.replace('KSTEP = 64', 'KSTEP = 65') : s))), stamp(sp), 'and moves with the code');
});

// ------------------------------------------------------------------ the plan's worker against the page's own plan
test('plan: the worker\'s plan, adopted, is the page\'s', async () => {
  const name = (WORLD.match(/new Worker\((['"])\/(plan[^'"]*\.js)\1\)/) || [])[2];
  assert.ok(name, 'the world starts no plan worker');
  // the worker as the build ships it (tools/plan.mjs buildPlan: minified; from the same dev build), or site/'s while it is still committed
  const planSrc = fs.existsSync(path.join(ROOT, 'tools', 'plan.mjs'))
    ? await (async (m) => (m.buildPlan ? (await m.buildPlan(WORLD, name)).text : m.makePlan(WORLD, name).text))(await import(new URL('../../tools/plan.mjs', import.meta.url)))
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
