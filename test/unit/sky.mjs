// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float eb = radians(mix(-5.735, mix(6.17, 9.51, uAurB.x), uAur.x));", "with": "float eb = radians(mix(6.17, mix(6.17, 9.51, uAurB.x), uAur.x));", "why": "the aurora's sheet ignores its rise: it would show whole the moment a change began"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float g = (1.0 - uGalC.w) * 95.0 - 3.0;", "with": "float g = (1.0 - uGalC.w) * 0.0 - 3.0;", "why": "the galaxy's edge ignores its rise"}
// plant: {"file": "src/world/224-sky-blend-paint.js", "find": "    skyFxPlace(X.fx, Y.fx, q, SKY.fx, SKY.rise);\n", "with": "", "why": "the galaxy's and the aurora's amounts blended like colours: a fade"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the sky order
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const SKYORD = cut(WORLD, '  /* ---- the order (the live\'s pushSky and nextSky, on the world\'s streams) */', '  /* ---- the cycle at t');
const HEAD0 = cut(WORLD, '  function airHeading0()', '\n', true);   // (the landing's heading: the air's, 215)
function skyWorld(seed, hour, at) {   // skyInit, skyPush and skyNext as the page runs them, a fake page under them (the colours unread)
  return vm.runInThisContext('(function (SEED, HOURV, AT) {\n  \'use strict\';\n' +
    '  var DEVMODE = false, OPT = { skyScene: null, skyNext: null, skyDt: null }, HOUR = HOURV, J = { seed: SEED };\n' +
    '  function attr(n) { return n === \'data-sky-at\' ? String(AT) : null; }\n' +
    '  function lin2lab(c) { return [0, 0, 0]; } function lab2linA() { return [0, 0, 0]; } function lin2lab3() { return [0, 0, 0]; }\n' +
    '  var PI = Math.PI, DEG = Math.PI / 180;\n' + STREAMS + VEC +
    '  function lch() { return [0, 0, 0]; }\n' + SKYDEF + HEAD0 + SKYORD +
    '  skyInit({ paramsBase: new Float32Array(128) });\n' +
    '  return { SKY: SKY, WSKY: WSKY, skyNext: skyNext, skyReseed: skyReseed, SKY_RECENT: SKY_RECENT, SKY_FAR: SKY_FAR };\n})')(seed, hour, at);
}
// (the openings as a set) the cut: the order after the sky on show drawn again from the visit's own read; the opening
// (its sky, hold and place) is the opening seed's, the rest the read's, and the order's rules still hold after it
test('sky: after the cut the order is the visit\'s own read\'s, the opening kept', () => {
  const after = (read, inMove) => {
    const K = skyWorld(11, 'sunset', 0.5); K.skyNext(); K.SKY.i = 0; K.SKY.k = inMove ? 0.3 : 0;
    const open = JSON.stringify(K.SKY.seq.slice(0, inMove ? 2 : 1));
    K.skyReseed(read); for (let n = 0; n < 30; n++) K.skyNext();
    const ids = K.SKY.seq.map((x) => x.id), back = Math.min(K.SKY_RECENT, K.SKY.ids.length - 2);
    for (let i = 1; i < ids.length; i++) assert.ok(!ids.slice(Math.max(0, i - back), i).includes(ids[i]), `read ${read}: sky ${i} (${ids[i]}) is one of the last ${back}`);
    for (const id of new Set(ids)) assert.equal(K.SKY.visits[id], ids.filter((x) => x === id).length, `read ${read}: ${id}'s visits count the order`);
    return { open, head: JSON.stringify(K.SKY.seq.slice(0, inMove ? 2 : 1).map((x) => [x.id, x.at, x.hold, x.move])), rest: K.SKY.seq.slice(inMove ? 2 : 1).map((x) => x.id + ':' + x.hold.toFixed(4)).join(' ') };
  };
  for (const inMove of [false, true]) {
    const a = after(5, inMove), b = after(5 + 16, inMove), c = after(5, inMove);
    assert.equal(a.head, b.head, 'the skies on show are kept, whatever the read');
    assert.notEqual(a.rest, b.rest, 'two reads of one opening go on differently');
    assert.equal(a.rest, c.rest, 'one read, one order');
  }
});
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

// ------------------------------------------------------------------ the galaxy and the aurora come and go by place (aurora-enter-by-place)
// their amounts (fx 2, 3) are only ever 0 or 1 across every change in the order, through the mist's waypoints too;
// what moves is how far each has come in (SKY.rise), 0 to 1 with the change, and whole wherever both ends have it
const FXSTEP = cut(WORLD, '    for (j = 0; j < 8; j++) SKY.fx[j] = X.fx[j]', '    skySun(V, w, L);');
const FXPLACE = cut(WORLD, '  function skyFxPlace(', '  /* two skies\' colours blended');
const FXOF = cut(WORLD, '    var fx = S.fx || {};', '\n', true) + cut(WORLD, '    O.fx = [fx.belt', '\n', true);
test('sky: across every change the galaxy\'s and the aurora\'s amounts are 0 or 1, never between (no fades)', () => {
  const step = new Function('SKY', 'X', 'Y', 'q', 'L', 'V', 'w', 'var j; function skySun() {}\n' + FXPLACE + FXSTEP);
  const fxOf = new Function('S', 'var O = {};\n' + FXOF + 'return O.fx;');
  const way = (a, b) => a.map((x, j) => (x + b[j]) / 2 * 0.25);   // (221's waypoint: the two skies' midpoint at a quarter)
  let changes = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const K = skyWorld(seed * 2246822519 >>> 0, ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'][seed % 6], 0.5);
    for (let n = 0; n < 30; n++) K.skyNext();
    const seq = K.SKY.seq;
    for (let i = 1; i < seq.length; i++) {
      const A = { fx: fxOf(K.WSKY[seq[i - 1].id]), motes: 0 }, B = { fx: fxOf(K.WSKY[seq[i].id]), motes: 0 };
      const halves = seq[i].far || seq[i - 1].far ? [[A, { fx: way(A.fx, B.fx), motes: 0 }], [{ fx: way(A.fx, B.fx), motes: 0 }, B]] : [[A, B]];
      let last = null;
      for (const [X, Y] of halves) for (let k = 0; k <= 40; k++) {
        const S = { fx: new Float32Array(8), rise: new Float32Array(2) }, q = k / 40;
        step(S, X, Y, q, {}, null, 0);
        for (const j of [2, 3]) {
          assert.ok(S.fx[j] === 0 || S.fx[j] === 1, `seed ${seed}: ${seq[i - 1].id} -> ${seq[i].id} at q ${q}: fx ${j} is ${S.fx[j]} (only 0 or 1)`);
          assert.ok(S.rise[j - 2] >= 0 && S.rise[j - 2] <= 1, `rise ${j - 2} out of [0, 1]`);
          if (S.fx[j] && X.fx[j] > 0 && Y.fx[j] > 0) assert.equal(S.rise[j - 2], 1, 'whole while both ends have it');
        }
        if (last) for (const j of [0, 1]) assert.ok(Math.abs(S.rise[j] - last[j]) <= 1 / 40 + 1e-6, `seed ${seed}: the rise jumps (${last[j]} -> ${S.rise[j]})`);
        last = [S.rise[0], S.rise[1]];
      }
      changes++;
    }
  }
  assert.ok(changes > 500, `${changes} changes`);
  // and the shader takes the rise (uGalC.w, uAur.x) by place: its own galEdge and auroraAt base lines, run here (the
  // review: text matches alone let a shader that ignored the rise pass)
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const js = (t) => t.replace(/\bfloat\s+/g, 'let ').replace(/(\d)\.(?!\d)/g, '$1.0');
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const GE = g.match(/^float galEdge\(float e\) \{(.*)\}\s*$/m);
  assert.ok(GE, 'galEdge not found as a one-line function in sky-body.glsl');
  const galEdge = (rise, e) => new Function('uGalC', 'smoothstep', 'e', js(GE[1]))({ w: rise }, ss, e);
  const EB = g.match(/^\s*float eb = radians\((mix\(-?[\d.]+, mix\(-?[\d.]+, -?[\d.]+, uAurB\.x\), uAur\.x\))\);/m), DL = g.match(/^\s*float D = (6371\.0 \* \(acos\(cos\(eb\) \/ \(1\.0 \+ [\d.]+ \/ 6371\.0\)\) - eb\));/m);
  assert.ok(EB && DL, 'auroraAt\'s sheet (float eb = radians(mix(...)); float D = ...) not found');
  const mixf = (a, b, t) => a + (b - a) * t;
  const ebAt = (rise) => new Function('uAur', 'uAurB', 'mix', 'return ' + js(EB[1]) + ';')({ x: rise }, { x: 0 }, mixf);   // (as it comes in: its hold not begun)
  const DAt = (rise) => { const eb = ebAt(rise) * Math.PI / 180; return new Function('eb', 'cos', 'acos', 'return ' + js(DL[1]) + ';')(eb, Math.cos, Math.acos); };
  assert.ok(g.includes('float h = 6371.0 * (cos(el) / cos(ee) - 1.0)'), 'auroraAt\'s altitude is not the one this test models');
  for (let e = 0; e <= 90; e += 0.5) {
    assert.equal(galEdge(0, e), 0, `the galaxy shows at ${e} deg before it has begun to come in`);
    if (e >= 1) assert.equal(galEdge(1, e), 1, `the whole galaxy is not shown at ${e} deg once it has come in (main's)`);
    for (let r = 0; r < 1; r += 0.05) assert.ok(galEdge(r + 0.05, e) >= galEdge(r, e) - 1e-12, `the galaxy at ${e} deg goes back as it comes in (rise ${r})`);
  }
  for (let r = 0; r < 1; r += 0.05) assert.ok(DAt(r + 0.05) < DAt(r), `the aurora's sheet does not come nearer with its rise (${r})`);
  assert.ok(Math.abs(DAt(1) - 650) < 5, `the sheet, come in, is ${DAt(1).toFixed(0)} km away (650)`);
  {   // as it begins to come in (D 1950), wherever it is drawn (from 0.5 deg up, eased in over 2) it is the red's thin
    // top over 300 km, at most 2% of the green's peak (the red's is a fifth of it): nothing of it shows at once
    const D0 = DAt(0.001);
    for (let ed = 0.5; ed <= 3; ed += 0.1) {
      const e = ed * Math.PI / 180, h = 6371 * (Math.cos(e) / Math.cos(e + D0 / 6371) - 1), k = 0.2 * Math.exp(-Math.max(h - 230, 0) / 60) * ss(0.5, 2.5, ed);
      assert.ok(h > 300 && k <= 0.02, `as the aurora begins to come in, ${ed.toFixed(1)} deg up meets its sheet at ${h.toFixed(0)} km, ${(100 * k).toFixed(1)}% of the green's peak (it would show at once: over 300 km, at most 2%)`);
    }
  }
  assert.ok(g.includes('vec3 galaxyAt(vec3 rd, float e) {\n  if (uGalC.w <= 0.0) return vec3(0.0);') && g.includes('vec3 auroraAt(vec3 rd, float e) {\n  if (uAur.x <= 0.0) return vec3(0.0);'), 'the galaxy and the aurora are read before they begin to come in');
  assert.ok(/gl\.uniform4f\(u\.uGalC, [^;]*SKY\.rise\[0\]\)/.test(WORLD) && /gl\.uniform4f\(u\.uAur, SKY\.aur\.rise,/.test(WORLD), 'the rises are not passed to the sky (uGalC.w; uAur.x, the aurora\'s own: skyAur)');
});
