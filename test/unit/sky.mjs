// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/220-time-day.js", "find": "L:[0.62,0.01,80],glow:[0.44,0.01,80]", "with": "L:[0.62,0.01,250],glow:[0.44,0.01,250]", "why": "a blue-tinted disc merges with the blue moonlit clouds"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "\"hi-2268x1080\":[[800.6,222.2,1467.2,433.8]", "with": "\"hi-2268x1080\":[[933.2,339.4,1334.7,433.8]", "why": "the still's own name box alone: on its band's smallest window the words stand bigger, and the moon's footprint falls on them"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "var cw = Math.min(bw, bh * BD[0]), ch = Math.min(bh, bw / BD[1])", "with": "var cw = bw, ch = bh", "why": "the opening planned in the whole still: a disc near its top edge falls off a wider window of its band"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "    LATEK.creature = lk[0]; LATEK.glow = lk[1]; LATEK.beam = lk[2];\n", "with": "", "why": "the opening's cloud layout leaves a late program's flag set: it starts compiling at the opening"}
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
    const { SKY } = skyWorld(7, 'night', at), s = SKY.seq[0], a = s.id === 'moonlit' ? Math.min(at, 0.6) : at;   // (a moonlit opening never past 0.6 of its hold: its moon at the cut where its still has it, the hub's review of #303)
    assert.ok(Math.abs(s.at + s.hold * a * 0.9) < 1e-9, `at ${at}: the first sky (${s.id}) starts ${s.at} (hold ${s.hold})`);
    assert.equal(SKY.landing.at, a);
  }
  for (const bad of ['x', -1, 2]) { const { SKY } = skyWorld(7, 'night', bad); assert.equal(SKY.landing.at, 0.5, `data-sky-at ${bad}: opens halfway`); }  let ml = 0; for (let sd = 1; sd < 400 && ml < 3; sd++) { const { SKY } = skyWorld(sd * 2654435761 >>> 0, 'night', 0.999); if (SKY.seq[0].id === 'moonlit') { ml++; assert.equal(SKY.landing.at, 0.6, 'a moonlit opening never past 0.6 of its hold'); } }
  assert.equal(ml, 3, 'three moonlit openings found');
});

// ------------------------------------------------------------------ the opening's moon in frame (the hub's ask, NIGHT lane)
// 225's moon route (MOON-ROUTE, pure functions) planned as the page plans an opening's moonlit stay (I.land, the cut's
// sky time), on the windows the stills are baked at, the words' boxes as the page lays them out there (measured in
// Chromium, CSS px x the device's): at the cut the moon is ahead, in frame, its whole disc under the top edge, its
// footprint (4.5 deg) clear of every box's outline; after it, it only moves on and is set behind the sea before its stay ends
const MARG = {};
test('night: an opening\'s moon stands in frame at the cut, clear of the words, on every baked window shape', () => {
  const R = cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END');
  const M = vm.runInThisContext('(function () {' + R + ' return { moonPlan, moonAt, mrCam, mrProj, mrPix, mrRay, mrAng, MRK }; })')();
  const WIN = [   // [name, css w, css h, dpr, tanY, pitch, boxes (css px)], measured at 01:00 on opening 1
    ['lo-1080x1080', 393, 393, 3, 0.727, 4.2, [[24, 64, 369, 147], [24, 162, 369, 241], [24, 257, 369, 277], [20, 356, 55, 377], [79, 356, 134, 377]]],
    ['lo-1350x1080', 491, 393, 3, 0.582, 12.3, [[44, 57, 448, 154], [44, 169, 426, 248], [44, 264, 448, 284], [20, 356, 55, 377], [79, 356, 134, 377]]],
    ['lo-1920x1080', 699, 393, 3, 0.408, 11.3, [[148, 57, 552, 154], [148, 169, 530, 248], [148, 264, 552, 284], [21, 356, 56, 377], [80, 356, 134, 377]]],
  ];
  for (const [name, w, h, d, tanY, p, boxes] of WIN) for (const sigma of [1, -1]) {
    const W = w * d, H = h * d, I = { psi: 37, pN: p, pL: p, tanX: 0.727, tanY, W, H, boxes: boxes.map((b) => b.map((v) => v * d)), keepPx: 12 * d, coarse: true, noRoom: false, keyAz: 37 + 160, side: 1, sigma, lift: 0, t0: -143, t1: -85.5, t2: 104.5, t3: 162.5, land: 0 };
    const P = M.moonPlan(I), C = M.mrCam(I.psi, p), o = { d: [0, 0, 0] };
    assert.ok(P.caseA && P.Hc === I.psi, `${name}: ahead`);
    M.moonAt(P, 0, o);
    const q = M.mrProj(C, I, o.d), x = (q[0] + 1) / 2, y = (1 - q[1]) / 2;
    assert.ok(q[2] > 0 && x > 0 && x < 1 && y > 0 && y < 1, `${name} sigma ${sigma}: in frame at the cut (${x.toFixed(3)}, ${y.toFixed(3)})`);
    const top = M.mrRay(C, I, Math.max(-1, Math.min(1, q[0])), 1);
    assert.ok(M.mrAng(o.d, top) >= M.MRK.R, `${name}: its whole disc under the top edge (${M.mrAng(o.d, top).toFixed(2)} deg from it; keep x${P.landKeep}, margin ${P.landMg}${P.landSide ? ', beside the words' : ''})`); MARG[name + sigma] = [+(M.mrAng(o.d, top) - M.MRK.R).toFixed(2), P.landKeep, P.landMg, !!P.landSide, +x.toFixed(3)];
    let foot = 180; for (const B of I.boxes) for (let i = 0; i <= 40; i++) for (const [px, py] of [[B[0] + (B[2] - B[0]) * i / 40, B[1]], [B[0] + (B[2] - B[0]) * i / 40, B[3]], [B[0], B[1] + (B[3] - B[1]) * i / 40], [B[2], B[1] + (B[3] - B[1]) * i / 40]]) foot = Math.min(foot, M.mrAng(o.d, M.mrPix(C, I, px, py)));
    assert.ok(foot >= M.MRK.FOOT, `${name} sigma ${sigma}: the footprint ${foot.toFixed(2)} deg from a word box (4.5)`);
    for (const B of I.boxes) assert.ok(!(x * W >= B[0] && x * W <= B[2] && y * H >= B[1] && y * H <= B[3]), `${name}: the moon's centre inside a word box`);
    let px0 = q[0];
    for (let t = 1; t < 162.5; t += 1) { M.moonAt(P, t, o); const qq = M.mrProj(C, I, o.d); if (qq[2] > 0 && Math.abs(qq[0]) < 1.5 && o.el > 0) { assert.ok((qq[0] - px0) * Math.sign(q[0] || 1) >= -1e-9, `${name}: it only moves on, out (t ${t})`); px0 = qq[0]; } }
    M.moonAt(P, 162.4, o); assert.ok(o.el < -M.MRK.R, `${name}: set before the stay ends (${o.el.toFixed(1)} deg)`);
  }  console.log('# opening moon [top margin past the disc, keep share, margin, beside, x]: ' + JSON.stringify(MARG));
});

// the opening's moon on each band's smallest window (the hub's round-4 and round-5 reviews): planned as the page plans
// it, in the part of the still every window of its band shows (226's stillFrame) against 226's STILL_WORDS (the union
// of the bake's boxes and the smallest window's); every place moonClear may choose (each height of MOON_UPS, each
// x of MOON_XS: 226's moonPlaceS) is then walked in the smallest window, as the still is shown there at the cut (cover)
// and in that window's own view (226's stillView: its frustum and pitch), against that window's own boxes
// (test/golden/still-words.json): the disc whole in the window and its footprint clear of every box, or the test fails
test('night: every place the opening moon may take is whole and clear of the words on each band\'s smallest window', () => {
  const R = cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END');
  const M = vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180, MOON = {}; function clockNow() { return 0; }\n' + R + cut(WORLD, '  var MOON_VEIL = 5,', '  function moonShown(t, out) {') +
    ' return { moonPlan, moonAt, mrCam, mrProj, mrPix, mrRay, mrAng, MRK, moonBandDir, moonPlaceS, MOON_XS, MOON_UPS }; })')();
  const SF = vm.runInThisContext('(function () { var DEG = Math.PI / 180, CAMUP = ' + /var CAMUP = ([\d.]+);/.exec(WORLD)[1] + ', FOV_LONG = ' + /var FOV_LONG = ([\d.]+);/.exec(WORLD)[1] + ', MOON_KEEP = ' + /MOON_KEEP = ([\d.]+)/.exec(WORLD)[1] +
    '; function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); } function lerp(a, b, t) { return a + (b - a) * t; }\n' +
    cut(WORLD, '  function frustumFor(', '  function setFrustum(') + cut(WORLD, '  var STILL_MIN = ', '  function stillInputs(') + ' return { stillFrame, stillView }; })')();
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'golden', 'still-words.json'), 'utf8'));
  const foot = (C, I, d, boxes) => { let f = 180; for (const B of boxes) for (let i = 0; i <= 40; i++) for (const [px, py] of [[B[0] + (B[2] - B[0]) * i / 40, B[1]], [B[0] + (B[2] - B[0]) * i / 40, B[3]], [B[0], B[1] + (B[3] - B[1]) * i / 40], [B[2], B[1] + (B[3] - B[1]) * i / 40]]) f = Math.min(f, M.mrAng(d, M.mrPix(C, I, px, py))); return f; };
  const whole = (C, I, d) => { const q = M.mrProj(C, I, d); if (!(q[2] > 0 && Math.abs(q[0]) < 1 && Math.abs(q[1]) < 1)) return -1; return Math.min(M.mrAng(d, M.mrRay(C, I, q[0], 1)), M.mrAng(d, M.mrRay(C, I, q[0], -1)), M.mrAng(d, M.mrRay(C, I, 1, q[1])), M.mrAng(d, M.mrRay(C, I, -1, q[1]))) - M.MRK.R; };
  let n = 0, least = 180, edge = 180;
  for (const key of Object.keys(G)) {
    const [tier, sh] = key.split('-'), [w0, h0] = sh.split('x').map(Number), F = SF.stillFrame(tier, w0, h0, [0.4, 0.6]), [sw, shh] = G[key].min;
    assert.ok(F, key + ': in the tables');
    const c = Math.max(sw / F.bw, shh / F.bh);   // (the still as cover shows it in that window)
    const vS = SF.stillView(F.bw, F.bh, [0.4, 0.6], {}), cv = { W: sw, H: shh, tanX: vS.tanX * (sw / c) / F.bw, tanY: vS.tanY * (shh / c) / F.bh }, vL = SF.stillView(sw, shh, [0.4, 0.6], {}), own = { W: sw, H: shh, tanX: vL.tanX, tanY: vL.tanY };
    for (const sigma of [1, -1]) for (const psi of [37, 151]) for (const up of M.MOON_UPS) {
      const I = { psi, pN: F.pN, pL: F.pN, tanX: F.tanX, tanY: F.tanY, W: F.W, H: F.H, boxes: F.boxes, keepPx: F.keepPx, coarse: F.coarse, noRoom: false, keyAz: psi + 160, side: 1, sigma, lift: 0, t0: -143, t1: -85.5, t2: 104.5, t3: 162.5, land: 0, landX: M.MRK.LANDX, landUp: up };
      const P = M.moonPlan(I);
      if (!(P.room || P.landRoom)) continue;
      for (const x of P.landSide ? [P.landX] : M.MOON_XS) {
        const d = M.moonBandDir(P, M.moonPlaceS(P, I, x), [0, 0, 0]);
        for (const [view, V, pN] of [['at the cut', cv, F.pN], ['in its own view', own, vL.pN]]) {
          const C = M.mrCam(psi, pN), e = whole(C, V, d), f = foot(C, V, d, G[key].small); n++; least = Math.min(least, f); edge = Math.min(edge, e);
          assert.ok(e >= -1e-6, `${key} at ${sw}x${shh} ${view} (sigma ${sigma}, heading ${psi}, height ${up}, x ${x.toFixed(3)}): the disc not whole in the window (${e.toFixed(2)} deg)`);
          assert.ok(f >= M.MRK.FOOT - 1e-9, `${key} at ${sw}x${shh} ${view} (sigma ${sigma}, heading ${psi}, height ${up}, x ${x.toFixed(3)}): the footprint ${f.toFixed(2)} deg from a word box (4.5)`);
        }
      }
    }
  }
  assert.ok(n >= 1000, `${n} places walked (the test is not empty)`);
  console.log(`# opening moon on the bands' smallest windows: ${n} places, the nearest box ${least.toFixed(2)} deg, the disc ${edge.toFixed(2)} deg inside the edge at least`);
});

// moonLobes lays out cells the streamer has not reached (the hub's round-4 nit): a layout only, so the late programs'
// flags it may set through the cell's own api (230's flock, glows, beam) are put back as they were: none starts compiling
// at the opening. 226's own moonLobes runs here on a stub cell whose layout sets every flag; the flags come out as they went in
test('night: laying out the opening\'s cloud lobes leaves the late programs\' flags as they were', () => {
  const F = cut(WORLD, '  function moonLobes(', '  function moonVeil(');
  for (const before of [[0, 0, 0], [1, 0, 1]]) {
    const K = vm.runInThisContext('(function (B) { var DEG = Math.PI / 180, KITAPI = {}, LATEK = { creature: B[0], glow: B[1], beam: B[2] }, MOON_VEIL_AZ = 60, laid = 0;\n' +
      'function angd(a, b) { var d = ((a - b) % 360 + 540) % 360 - 180; return d; } function RNG() { return {}; }\n' +
      'function Cell(V, sc, ix, iz) { this.cx = ix * 100; this.cz = iz * 100; this.clouds = []; }\n' +
      'function cellApi(C) { return { hash: 1, flock: function () { LATEK.creature = 1; }, glows: function () { LATEK.glow = 1; }, beam: function () { LATEK.beam = 1; } }; }\n' + F +
      ' var V = { def: { layout: { scales: [{ radius: 200, size: 100 }] }, cell: function (api) { laid++; api.flock({}); api.glows({ n: 1 }); api.beam({}); } } };\n' +
      ' var out = moonLobes(V, 0, 0, 0); return { L: [LATEK.creature, LATEK.glow, LATEK.beam], laid: laid, out: out }; })')(before);
    assert.ok(K.laid > 0, 'the stub laid out some cells');
    assert.deepEqual(K.L, before, `the late programs' flags after the layout (${K.L}; before ${before})`);
  }
});

// 226's moonClear (the opening moon's place off the clouds) on the route's own plan and synthetic lobes: with no cloud
// it keeps LANDX at the plan's own height in 2 plans; with a cloud body over that place it takes another whose disc is
// clear, still in frame and clear of the words, in at most 4 plans; the same lobes, the same place (no device in it)
test('night: the opening moon\'s place is kept off a cloud body, from the lobes alone, in at most 4 plans', () => {
  const R = cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END') + cut(WORLD, '  var CBS = new Float64Array(7)', '  var BIRDF = null;') + cut(WORLD, '  var MOON_VEIL = 5,', '  function moonShown(t, out) {');
  const M = vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180, MOON = {}; function clockNow() { return 0; }\n' + R + ' return { moonPlan, moonAt, moonClear, moonVeil, moonBandDir, mrCam, mrProj, mrPix, mrAng, MRK, MOON }; })')();
  const d = 1, boxes = [[758, 340, 1160, 435], [758, 468, 1090, 545], [758, 578, 1062, 597], [40, 1018, 75, 1040], [99, 1018, 153, 1040]];
  const mk = () => ({ psi: 0, pN: 6, pL: 6, tanX: 0.7265, tanY: 0.4087, W: 1920, H: 1080, boxes, keepPx: 12, coarse: false, noRoom: false, keyAz: 160, side: 1, sigma: 1, lift: 0, t0: -143, t1: -85.5, t2: 104.5, t3: 162.5, land: 0 });
  const eye = [0, 20, 0], E0 = {}, P0 = M.moonClear(E0, mk(), { lob: [], bnd: [] }, eye);
  assert.equal(E0.landX, 1 / 3); assert.equal(E0.landUp, null); assert.ok(M.MOON.landPlans <= 2, `no cloud: ${M.MOON.landPlans} plans`);
  const o = { d: [0, 0, 0] }; M.moonAt(P0, 0, o);
  const at = [eye[0] + o.d[0] * 2500, eye[1] + o.d[1] * 2500, eye[2] + o.d[2] * 2500], cloud = { lob: [at[0], at[1], at[2], 180], bnd: [at[0], at[1], at[2], 180, 0, 4] };
  assert.ok(M.moonVeil(cloud, o.d, M.MRK.R, ...eye) > 100, 'the cloud stands over the plain place');
  const E1 = {}, P1 = M.moonClear(E1, mk(), cloud, eye);
  assert.ok(M.MOON.landPlans <= 4, `${M.MOON.landPlans} plans`);
  M.moonAt(P1, 0, o);
  assert.ok(M.MOON.veil < 5 && M.moonVeil(cloud, o.d, M.MRK.R, ...eye) < 5, `the disc clear of the cloud (${M.MOON.veil})`);
  const C = M.mrCam(0, 6), q = M.mrProj(C, mk(), o.d), x = (q[0] + 1) / 2 * 1920, y = (1 - q[1]) / 2 * 1080;
  assert.ok(q[2] > 0 && x > 0 && x < 1920 && y > 0 && y < 1080, 'in frame');
  for (const B of boxes) { assert.ok(!(x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3]), 'not in a word box'); for (let i = 0; i <= 20; i++) for (const [px, py] of [[B[0] + (B[2] - B[0]) * i / 20, B[1]], [B[0] + (B[2] - B[0]) * i / 20, B[3]]]) assert.ok(M.mrAng(o.d, M.mrPix(C, mk(), px, py)) >= M.MRK.FOOT, 'its footprint clear'); }
  const E2 = {}; M.moonClear(E2, mk(), cloud, eye); assert.deepEqual([E2.landX, E2.landUp], [E1.landX, E1.landUp], 'the same lobes, the same place');
});

// the moon's disc against the moonlit clouds (the hub's round-3 ruling, 2026-11-16 04:19): the clouds are never darkened
// to make room, so the disc stands at the ceiling's L (its table L through fs-comp's shoulder, CEIL_KNEE), parts from the
// clouds by hue (at least 60 deg from their lit colour's) with low chroma (neutral to faintly warm, C <= 0.015), and
// its glow adds its own light up to its luminance (no per-channel max of a blue sky and a warm glow, which read olive)
test('night: the moon\'s disc stands at the ceiling, by hue apart from the moonlit clouds, low in chroma; its glow never olive', () => {
  const m = /moonlit: \{[^\n]*?clLit:\[([\d.]+),([\d.]+),([\d.]+)\][^\n]*?fx:\{moon:\{r:[\d.]+,L:\[([\d.]+),([\d.]+),([\d.]+)\],glow:\[([\d.]+),([\d.]+),([\d.]+)\][^\n]*?ceil:([\d.]+)/.exec(WORLD);
  assert.ok(m, 'the moonlit sky\'s clLit, fx.moon and ceil');
  const [cl, disc, glow, ceil] = [m.slice(1, 4), m.slice(4, 7), m.slice(7, 10), [m[10]]].map((a) => a.map(Number)), k = +/var CEIL_KNEE = ([\d.]+)/.exec(WORLD)[1];
  const shown = (L) => { const Kc = ceil[0] - k; return L > Kc ? Kc + k * (1 - Math.exp(-(L - Kc) / k)) : L; };
  assert.ok(Math.abs(shown(disc[0]) - ceil[0]) <= 0.01, `the disc shown at L ${shown(disc[0]).toFixed(3)}, the ceiling ${ceil[0]}`);
  const dh = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  assert.ok(dh(disc[2], cl[2]) >= 60, `the disc's hue ${disc[2]} within 60 deg of the clouds' ${cl[2]}`);
  assert.ok(disc[1] <= 0.015 && glow[1] <= 0.015, `the disc's chroma ${disc[1]}, its glow's ${glow[1]} (at most 0.015)`);
  assert.ok(dh(glow[2], cl[2]) >= 60, 'the glow\'s hue apart from the clouds\' too');
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  assert.ok(g.includes('c += uMoonG / max(gy, 1e-5) * max(gy - dot(c, LUMA), 0.0) * gk;') && !g.includes('max(c, uMoonG)'), 'the glow adds its own light up to its luminance, never a per-channel max');
  assert.ok(g.includes('smoothstep(mr - max(mpx * 0.8, 0.04), mr + max(mpx * 0.8, 0.04), ma)'), 'the disc\'s edge crisp: about a pixel either side');
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
