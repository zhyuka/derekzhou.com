// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(dot(dv, uCamR) / pa, sg) * starBox(dot(dv, uCamU) / pa, sg);", "with": "  return b * exp(-dot(dv, dv) / (2.0 * 0.1764 * pa * pa));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
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

// ------------------------------------------------------------------ the light ceiling's knee (night contrast A)
// fs-comp's own ceiling line, with 225's knee: never past the ceiling (W8), continuous and rising, and a highlight up to
// 0.06 under the ceiling passed as it is (the knee narrowed: a night keeps its highlights' contrast)
test('sky: the light ceiling keeps every pixel under it and passes highlights to within 0.06 of it', () => {
  const comp = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'fs-comp.glsl'), 'utf8');
  assert.ok(comp.includes('if (Lk > Kc) c *= pow((Kc + uCeil.y * (1.0 - exp(-(Lk - Kc) / uCeil.y))) / Lk, 3.0);'), 'fs-comp\'s light ceiling is not the line this test models');
  const knee = +WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1], ceil = 0.525, Kc = ceil - knee;
  const out = (L) => (L > Kc ? Kc + knee * (1 - Math.exp(-(L - Kc) / knee)) : L);
  let prev = 0;
  for (let L = 0; L <= 1.5; L += 0.0005) {
    const o = out(L);
    assert.ok(o <= ceil + 1e-12, `L ${L.toFixed(4)} leaves the ceiling at ${o} (W8: at most ${ceil})`);
    assert.ok(o >= prev - 1e-12 && o <= L + 1e-12, `the ceiling's curve at L ${L.toFixed(4)} goes back or brightens`);
    prev = o;
  }
  assert.ok(Math.abs(out(ceil - 0.06) - (ceil - 0.06)) < 1e-12, `a highlight 0.06 under the ceiling is changed (the knee ${knee}: at most 0.06)`);
});

// ------------------------------------------------------------------ the stars never glitter as they slide (stars-flux)
// sky-body.glsl's own starErf and starBox run here (their GLSL lines, made JS); a star at a random place between the pixel
// centres, its pixels each min(its share, the head) as the shader adds them: the light it puts on the screen is the
// same wherever it stands (within 2%), and no pixel passes the head, bright stars included
test('sky: a star\'s light on the screen is the same wherever it stands between pixels (no glitter)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => { const m = g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm')); assert.ok(m, name + ' not found as a one-line function in sky-body.glsl'); return m; };
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox');
  const starErf = new Function(E[1].replace(/float /g, ''), js(E[2]));
  const starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  const STF = +g.match(/const float STF = ([\d.]+);/)[1];
  assert.ok(g.includes('return F * starBox(d.x, sg) * starBox(d.y, sg);'), 'starAt does not integrate its bell over the pixel (starBox on both axes)');
  const PX = g.match(/^\s*vec2 d = gl_FragCoord\.xy - (.*);\s*$/m);
  assert.ok(PX, 'starAt does not measure the star from the pixel in screen pixels (vec2 d = gl_FragCoord.xy - ...)');
  assert.ok(g.includes('sg = clamp(sqrt(F / cp), 0.5, 0.7);') && g.includes('F = min(F, cp * sg * sg);'), 'starAt does not cap the star (at most 0.7 px wide, its flux cut to fit)');
  assert.ok(!/head \* \(1\.0 - exp\(-s/.test(g), 'the stars still go through the pixel\'s saturating cap');
  const shown = (b, head, ox, oy) => {   // the star's light on the screen, its pixels each capped as the shader caps them
    const cp = 2 * Math.PI * Math.max(head, 1e-5), sg = Math.min(Math.max(Math.sqrt(b * STF / cp), 0.5), 0.7), F = Math.min(b * STF, cp * sg * sg);
    let sum = 0, peak = 0, half = 0;
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const v = Math.min(F * starBox(x - ox, sg) * starBox(y - oy, sg), head); sum += v; peak = Math.max(peak, v); }
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (Math.min(F * starBox(x - ox, sg) * starBox(y - oy, sg), head) >= peak / 2) half++;
    return { sum, peak, half };
  };
  {   // the shader's own projection (its vec2 d line, made JS) on a tall window (393 x 852, 60 deg up): a star's pixel offset
    // is the true one at the centre and at the side (a step of one pixel moves it 1 +- 0.01 pixel), so the box is the footprint
    const V = (a, b, c) => [a, b, c], dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
    const uRes = [393, 852], ty = Math.tan(Math.PI / 6), uProj = [ty * 393 / 852, ty], uCamR = V(1, 0, 0), uCamU = V(0, 1, 0), uCamF = V(0, 0, 1);
    const expr = PX[1].replace(/vec2\(([^,]+), ([^)]*\))\) \* 0\.5 \+ 0\.5\) \* uRes/, '[($1) * 0.5 + 0.5, ($2) * 0.5 + 0.5]');
    const proj = (sd) => { const zf = Math.max(dotv(sd, uCamF), 1e-4); return [((dotv(sd, uCamR) / (zf * uProj[0])) * 0.5 + 0.5) * uRes[0], ((dotv(sd, uCamU) / (zf * uProj[1])) * 0.5 + 0.5) * uRes[1]]; };
    assert.ok(/zf \* uProj\.x/.test(PX[1]) && /zf \* uProj\.y/.test(PX[1]) && /\* uRes$/.test(PX[1].trim()), 'the star\'s screen place is not main\'s projection inverted (dot(sd, uCamR) / (zf * uProj.x) ... * uRes): ' + expr);
    const rdAt = (x, y) => nrm([uCamF[0] + uCamR[0] * (x / uRes[0] * 2 - 1) * uProj[0], uCamF[1] + uCamU[1] * (y / uRes[1] * 2 - 1) * uProj[1], 1]);
    for (const [x, y] of [[196.5, 426.5], [10.5, 840.5], [380.5, 20.5]]) {
      const a = proj(rdAt(x, y)), b = proj(rdAt(x + 1, y)), c = proj(rdAt(x, y + 1));
      assert.ok(Math.abs(a[0] - x) < 1e-6 && Math.abs(a[1] - y) < 1e-6, `the pixel (${x}, ${y})'s own direction projects to (${a})`);
      assert.ok(Math.abs(b[0] - a[0] - 1) < 0.01 && Math.abs(c[1] - a[1] - 1) < 0.01, `at (${x}, ${y}) a pixel's step is ${(b[0] - a[0]).toFixed(3)}, ${(c[1] - a[1]).toFixed(3)} pixels (1)`);
    }
  }
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (const b of [0.07, 0.3, 1.02]) for (const head of [0.02, 0.05, 0.09]) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k < 64; k++) { const r = shown(b, head, rnd() - 0.5, rnd() - 0.5); lo = Math.min(lo, r.sum); hi = Math.max(hi, r.sum); assert.ok(r.peak <= head + 1e-9, `b ${b}, head ${head}: a pixel at ${r.peak} passes the head`);
      assert.ok(r.half <= 6, `b ${b}, head ${head}: ${r.half} pixels at half its peak (a point: at most 6)`); }
    assert.ok((hi - lo) / hi < 0.02, `b ${b}, head ${head}: the star's light swings ${(100 * (hi - lo) / hi).toFixed(1)}% as it slides (at most 2%)`);
  }
});

// ------------------------------------------------------------------ the sky's lights behind its haze (aurora-haze)
// the galaxy and the aurora are behind the haze, as the moon is: each term scaled by what the haze lets through
test('sky: the galaxy and the aurora are seen through the haze (1 - hazeSky), never over it', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const m = g.match(/float (\w+) = 1\.0 - hazeSky\(rd\);\s*vec3 (\w+) = \1 \*/);
  assert.ok(m, 'the haze\'s transmittance (1.0 - hazeSky(rd)) and its tint are not worked out before the galaxy and the aurora');
  for (const f of ['galaxyAt', 'auroraAt']) {
    const uses = g.split('\n').filter((l) => l.includes('c += ' + f + '('));
    assert.ok(uses.length >= 1, f + ' is not added to the sky');
    for (const l of uses) assert.ok(l.includes(f + '(rd, eS) * ' + m[2]), f + ' is added without the haze over it: ' + l.trim());
  }
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
