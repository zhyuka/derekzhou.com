// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/219-meteors.js", "find": "var y = M.long ? M.y : M.y * Math.sin(Math.PI * e / M.dur);", "with": "var y = M.y;", "why": "a short meteor that pops on and off at full light"}
// plant: {"file": "src/world/219-meteors.js", "find": "QUIET: 8,", "with": "QUIET: 0,", "why": "a meteor in the opening stay's first seconds: in its still"}
// plant: {"file": "src/world/219-meteors.js", "find": "      return { A: R0, n: n, th0: th0, th1: t1, thP: thP };", "with": "      return { A: R0, n: n, th0: th0, th1: th0 + 120, thP: thP };", "why": "a long one ending 120 deg on, up in the sky: a drag brings its end into view, where it vanishes at full light"}
// plant: {"file": "src/world/220-time-day.js", "find": "L:[0.62,0.01,80],glow:[0.44,0.01,80]", "with": "L:[0.62,0.01,250],glow:[0.44,0.01,250]", "why": "a blue-tinted disc merges with the blue moonlit clouds"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "\"hi-2268x1080\":[[800.6,222.2,1467.2,433.8]", "with": "\"hi-2268x1080\":[[933.2,339.4,1334.7,433.8]", "why": "the still's own name box alone: on its band's smallest window the words stand bigger, and the moon's footprint falls on them"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "var cw = Math.min(bw, bh * BD[0]), ch = Math.min(bh, bw / BD[1])", "with": "var cw = bw, ch = bh", "why": "the opening planned in the whole still: a disc near its top edge falls off a wider window of its band"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "    LATEK.creature = lk[0]; LATEK.glow = lk[1]; LATEK.beam = lk[2];\n", "with": "", "why": "the opening's cloud layout leaves a late program's flag set: it starts compiling at the opening"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float lit = smoothstep(hs - 0.5, hs + 0.5, z);", "with": "float lit = 1.0;", "why": "the far storm lit whole whatever the sun's depth: lit in the blue hour and at night"}
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "FL_SEP = 0.6,", "with": "FL_SEP = 0.36,", "why": "the flicker's flashes 0.38 s apart: three peaks inside a second (the owner's \"under 3\")"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float ANV_FK = 0.02 / 0.8966;", "with": "const float ANV_FK = 0.2 / 0.8966;", "why": "the flicker ten times brighter: a flash"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float HALO_N = 1.31;", "with": "const float HALO_N = 1.5;", "why": "the halo from glass, not ice: a 38-deg ring"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += haloAt(rd) * uMoon.w;", "with": "c += haloAt(rd);", "why": "the halo whole whatever the moon's depth: it stays as the moon sinks"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "veil: mix32(SKY.vS ^ Math.imul(seq.length + 1, 0x9e3779b9))", "with": "veil: mix32(SKY.vS)", "why": "the veil the visit's, not the stay's: every moonlit stay of a visit veiled, or none"}
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

test('physics: weather/far-anvil: the far storm hides the sky in the air\'s colour, its top lit above the Earth\'s shadow, its lightning a soft, slow flicker', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const K = +g.match(/const float ANV_K = ([\d.]+);/)[1], FK = 0.02 / 0.8966;
  assert.ok(g.includes('const float ANV_FK = 0.02 / 0.8966;'), 'the flicker\'s peak is not Y +0.02 (ANV_FK)');
  const FC = [0.85, 0.9, 1.0], Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  assert.ok(Math.abs(Y(FC) - 0.8966) < 1e-4, `the flicker colour's luminance ${Y(FC).toFixed(4)} (ANV_FK's 0.8966)`);
  const NZ = cut(WORLD, '  var NOISE = { t: null', '  /* stage B: the texture');
  const VOL = new Function(STREAMS + VEC + NZ + '\n NOISE.data = noiseData(); NOISE.d64 = new Float64Array(NOISE.data); NOISE.vol = new Uint8Array(NOISE_N * NOISE_N * NOISE_N * 4); for (var z = 0; z < NOISE_N; z++) noiseLayer(z); return NOISE.vol;')();
  const w3 = (i) => ((i % 32) + 32) % 32, na = (x, y, z) => { const X = x * 32 - 0.5, Y2 = y * 32 - 0.5, Z = z * 32 - 0.5, x0 = Math.floor(X), y0 = Math.floor(Y2), z0 = Math.floor(Z), fx = X - x0, fy = Y2 - y0, fz = Z - z0; let v = 0; for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) v += (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz) * VOL[((w3(z0 + dz) * 32 + w3(y0 + dy)) * 32 + w3(x0 + dx)) * 4 + 3]; return v / 255; };
  // anvilAt's own lines: (its cover, its lit part, its flicker), a part at a time
  const a = g.indexOf('vec3 anvilAt('), b = g.indexOf('\n}\n', a);
  let body = g.slice(g.indexOf('{', a) + 1, b).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/flash|ray/i.test(body), 'the storm throws rays or flashes (its lightning is the flicker\'s soft glow)');
  body = body.replace(/\bfloat\s+/g, 'let ').replace(/textureLod\(uN3, vec3\(([^;]*?)\), 0\.0\)\.a/g, (m, x) => 'NA(' + x + ')').replace(/\bvec3\(/g, 'V3(');
  const AN = new Function('rd', 'uAnv', 'uAnvF', 'CH', 'NA', 'const V3 = (p, q, r) => (q === undefined ? p : [p, q, r][CH]), { abs, sqrt, exp, sin, cos, tan, max, min, pow } = Math, clamp = (x, a, b) => Math.min(Math.max(x, a), b), atan = (y, x) => Math.atan2(y, x), radians = (x) => x * Math.PI / 180, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };' + body);
  const D2R = Math.PI / 180, A = 0.9, OFF = 95, sunAz = A - OFF * D2R, D = 120;
  const anv = (phi, e, sunEl, F) => { const rd = { x: Math.sin(A + phi) * Math.cos(e), y: Math.sin(e), z: Math.cos(A + phi) * Math.cos(e) }, U = { x: A, y: D, z: sunEl, w: sunAz }, UF = F || { x: 0, y: 0, z: 0, w: 1 }; return [0, 1, 2].map((ch) => AN(rd, U, UF, ch, na)); };
  // where it is lit, the sun 3 deg down: only over the Earth's shadow at the storm, R (1 / cos d - 1); its cover whole, its parts within it
  const dc = 3 * D2R - D / 6371 * Math.cos(OFF * D2R), hs = 6371 * (1 / Math.cos(dc) - 1), F1 = { x: 1, y: 3, z: 9, w: 6 };
  let lowLit = 99, cov = 0, fpk = 0;
  for (let phi = -0.6; phi <= 0.6; phi += 0.005) for (let e = -0.004; e <= 0.12; e += 0.0005) {
    const c = anv(phi, e, -3, F1);
    assert.ok(c[0] >= 0 && c[0] <= 1 + 1e-9 && c[1] >= 0 && c[1] <= c[0] + 1e-9 && c[2] >= 0 && c[2] <= c[0] + 1e-9, 'the storm\'s lit part or flicker outside its cover');
    cov = Math.max(cov, c[0]); fpk = Math.max(fpk, c[2]);
    if (c[1] > 1e-5) lowLit = Math.min(lowLit, D * Math.tan(e) + D * D / 14866);
  }
  assert.ok(cov > 0.99 && fpk > 0.5, 'the storm has no whole cover, or its flicker no light');
  assert.ok(Math.abs(lowLit - hs) < 0.8, `its lit part begins ${lowLit.toFixed(2)} km up (the Earth's shadow there: ${hs.toFixed(2)} km)`);
  for (const se of [-7, -24]) for (let phi = -0.6; phi <= 0.6; phi += 0.02) for (let e = 0; e <= 0.12; e += 0.002) assert.ok(anv(phi, e, se)[1] === 0, `the storm is lit with the sun ${se} deg down`);
  for (let phi = -0.6; phi <= 0.6; phi += 0.02) for (let e = 0; e <= 0.12; e += 0.002) assert.ok(anv(phi, e, -24)[2] === 0, 'the storm flickers with no flash on');
  // its body is the far land's own colour at its range (atmos), and at 100 km that air is whole in every realm's kit
  assert.ok(g.includes('c = mix(c, atmos(uClShade, rd, 1000.0 * uAnv.y / max(length(rd.xz), 1e-3)), aM.x);'), 'the storm\'s body is not the air at its range (atmos: the far land\'s distance haze)');
  for (const f of ['realm-dunes.js', 'realm-above.js']) { const m = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(/fog: \[([\d.e-]+), [^,]+, [^,]+, ([\d.e-]+)\]/); assert.ok(m && +m[2] * 1e5 >= 5, `${f}: the air at 100 km is not whole (its depth ${m && (+m[2] * 1e5).toFixed(1)})`); }
  // the sky behind it as the page draws it: the twilight's stops at their heights, darker away from the sun, under the ground haze
  // (the dunes' at 0.45-0.85), its body the air's colour from a little lower (fogCol), its lit top through the haze and the cap
  const { WSKY } = skyWorld(1, 'night', 0.5);
  const o2l = (L, aa, bb) => { let l = L + 0.3963377774 * aa + 0.2158037573 * bb, m = L - 0.1055613458 * aa - 0.0638541728 * bb, s = L - 0.0894841775 * aa - 1.2914855480 * bb; l **= 3; m **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map((x) => Math.max(x, 0)); };
  const lc = (s) => o2l(s[0], s[1] * Math.cos(s[2] * D2R), s[1] * Math.sin(s[2] * D2R));
  const Lof = (c) => 0.2104542553 * Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) + 0.7936177850 * Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) - 0.0040720468 * Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  assert.ok(g.includes('float yA = dot(aA, LUMA), room = max(0.118 - dot(c, LUMA), 0.0);') && g.includes('c += aA * (yA > 1e-6 ? room * (1.0 - exp(-yA / max(room, 1e-6))) / yA : 1.0);'), 'the storm\'s light is not held by the room under its cap (the lines this test models)');
  assert.ok(g.includes('vec3 aA = (vec3(1.0, 0.6, 0.46) * aM.y * ANV_K + vec3(0.85, 0.9, 1.0) * aM.z * ANV_FK) * (1.0 - hazeSky(rd));'), 'the storm\'s light is not its lit top and its flicker through the haze (the line this test models)');
  const capAdd = (c0, ad) => { const yA = Y(ad), room = Math.max(0.118 - Y(c0), 0); return ad.map((v) => v * (yA > 1e-6 ? room * (1 - Math.exp(-yA / Math.max(room, 1e-6))) / yA : 1)); };
  const E = [0, 3, 10, 26, 58];
  const skyAt = (S, e) => { const st = S.sky.map(lc); let c = st[4]; for (let i = 0; i < 4; i++) if (e <= E[i + 1]) { const t = (e - E[i]) / (E[i + 1] - E[i]); c = st[i].map((v, j) => v + (st[i + 1][j] - v) * t); break; } return c.map((v) => v * (1 - S.skyK[2] * Math.exp(-e / S.skyK[1]))); };
  const scene = (S, e, hz) => { const h = 1 - Math.exp(-1e-3 * hz * Math.exp(-24 / 30) * 30 / Math.sin(e * D2R)), hc = lc(S.hazeC), haze = (c) => c.map((v, i) => v + (hc[i] - v) * h), ep = Math.asin(Math.sin(e * D2R) * 0.45 + 0.02) / D2R; return { h, sky: haze(skyAt(S, e)), body: haze(skyAt(S, ep)) }; };
  let showMin = 9, showMax = -9;
  for (const id of ['afterglow', 'firstlight']) for (const hz of [0.45, 0.85]) for (const e of [4, 5.5, 7]) {
    const S = WSKY[id], sc = scene(S, e, hz), ad = capAdd(sc.body, [1, 0.6, 0.46].map((v) => v * K * (1 - sc.h))), c1 = sc.body.map((v, i) => v + ad[i]);
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(sc.sky)) + 1e-9, `${id}: the storm's lit top at ${e} deg reaches L ${Lof(c1).toFixed(3)} (at most 0.50, or the sky's own behind it)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the credit over the storm's lit top reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1`);
    showMin = Math.min(showMin, Lof(c1) - Lof(sc.sky)); showMax = Math.max(showMax, Lof(c1) - Lof(sc.sky));
  }
  assert.ok(showMax - showMin < 0.1, `the storm over the twilight's sky: L ${showMin.toFixed(3)} to ${showMax.toFixed(3)} (the air at its range is the horizon's own colour)`);
  // its flicker over the nights' and the blue hour's skies where it stands: Y +0.02 at most, under the cap, the credit kept
  for (const id of ['bluehour', 'moonlit', 'milkyway', 'aurora']) for (const hz of [0.45, 0.85]) for (const e of [3, 6]) {
    const S = WSKY[id]; if (!S) continue;
    const sc = scene(S, e, hz), ad = capAdd(sc.body, FC.map((v) => v * FK * (1 - sc.h))), c1 = sc.body.map((v, i) => v + ad[i]);
    assert.ok(Y(ad) <= 0.02 + 1e-9, `${id}: the flicker adds Y ${Y(ad).toFixed(4)} (at most 0.02: far under a flash's 10%)`);
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(sc.body)) + 1e-9 && (0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the flicker at ${e} deg passes L 0.50 or the credit's 4.5:1`);
  }
  // the flicker's clock: 225's own lines, over an hour in 32 visits: every flash rises and falls over 100 ms or more, never two at
  // once, never more than 3 in any second, its groups 10-40 s apart; from the read (SEEDR) only after the cut, with the sun 5 deg
  // or more down, never in reduced motion
  const FL = new Function(STREAMS + cut(WORLD, '  var FL_GAP = ', '  function anvFlashAt(') + '\nreturn { RNG, subseed, anvGroup, anvEnv, FL_GAP, FL_SUN };')();
  assert.ok(FL.FL_SUN <= -5, `the flicker plays with the sun ${FL.FL_SUN} deg down (the storm unlit: 5 or more)`);
  assert.ok(WORLD.includes('if (!SKY.anv || !AFTER || reduced()) return out;') && WORLD.includes('F.r = RNG(subseed(SEEDR, 86));') && WORLD.includes('F.g.on = anvSunEl() <= FL_SUN && anvInHold(F.g);') && WORLD.includes('return !!e && !(SKY.k > 0) && f.s + f.d <= e.at + e.hold;'), 'the flicker is not held to the storm, the read after the cut, motion, a hold and the storm unlit');
  // the sun's depth at the storm one way through a change: the change's two skies on its own clock, never a mist's waypoint (a night)
  assert.ok(WORLD.includes('var ea = anvElOf(SKY.A), eb = anvElOf(SKY.B);') && WORLD.includes('return ea + (eb - ea) * ss01(SKY.k || 0);'), 'the storm reads the sun\'s depth from the waypoint (its top goes dark and comes back between afterglow and first light)');
  // drawn in its place: before what is nearer (the 3 km veil over it), hiding what is farther (the galaxy, the aurora, the moon, the stars)
  { const iS = g.indexOf('vec3 aM = anvilAt(rd);'), iV = g.indexOf('if (uHi.x > 0.0 && rd.y > 0.01)'), iB = g.indexOf('vec3 cBA = c;'), iG = g.indexOf('#ifdef SKY_PH2\n  /* (aurora-haze)'), iT = g.indexOf('c += vec3(0.92, 0.94, 1.0) / 0.94 * min(s * sk, head);'), iR = g.indexOf('if (anvCov > 0.0) c = mix(c, cBA, anvCov);');
    assert.ok(iS > 0 && iS < iV, 'the storm is drawn after the 3 km veil (it wipes out the veil in front of it)');
    assert.ok(iB > iV && iB < iG && iB < g.indexOf('if (uNight.y > 0.0 && eS > 0.5') && iR > iT, 'the wisps, the galaxy, the aurora, the moon or the stars print over the storm\'s body'); }
  assert.ok(g.includes('D * D / 14866.0;'), 'the storm\'s place without standard refraction (R 7/6)');
  assert.ok(WORLD.includes('if (u.uAnvF) gl.uniform4fv(u.uAnvF, anvFlashAt(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt));'), 'the flicker is not uploaded at the drawn time');
  let nfl = 0, minRise = 9, maxIn1 = 0, minGap = 99, maxGap = 0, peaks = [];
  for (let k = 0; k < 32; k++) {
    const r = FL.RNG(FL.subseed((k * 2654435761 + 7) >>> 0, 86)); let t = r.r(10, 40), lastEnd = -1e9; peaks = [];
    while (t < 3600) {
      const G = FL.anvGroup(r, t), f = G.fl;
      if (lastEnd > -1e9) { minGap = Math.min(minGap, f[0].s - lastEnd); maxGap = Math.max(maxGap, f[0].s - lastEnd); }
      for (let i = 0; i < f.length; i++) {
        nfl++;
        let pk = 0, tp = f[i].s; for (let u = 0; u <= 1; u += 0.001) { const v = FL.anvEnv(f[i], f[i].s + u * f[i].d); if (v > pk) { pk = v; tp = f[i].s + u * f[i].d; } }
        assert.ok(pk <= 1 && FL.anvEnv(f[i], f[i].s) < 1e-9 && FL.anvEnv(f[i], f[i].s + f[i].d) < 1e-9, 'a flash past its peak, or not from nothing to nothing');
        minRise = Math.min(minRise, tp - f[i].s, f[i].s + f[i].d - tp); peaks.push(tp);
        if (i > 0) assert.ok(f[i].s >= f[i - 1].s + f[i - 1].d, 'two flashes at once');
        if (i > 0) assert.ok(f[i].s - f[i - 1].s >= 0.6, `two flashes ${(f[i].s - f[i - 1].s).toFixed(3)} s apart (0.6 s at least)`);
      }
      lastEnd = f[f.length - 1].s + f[f.length - 1].d; t = G.next;
    }
    for (let i = 0, j = 0; i < peaks.length; i++) { while (peaks[i] - peaks[j] >= 1) j++; maxIn1 = Math.max(maxIn1, i - j + 1); }   // (this visit's peaks, in time order)
  }
  assert.ok(minRise >= 0.13, `a flash rises or falls in ${(1000 * minRise).toFixed(0)} ms (at least 130)`);
  assert.ok(maxIn1 <= 2, `${maxIn1} flash peaks inside one second (the owner's "under 3": at most 2)`);
  assert.ok(minGap >= 10 && maxGap <= 41, `the flicker's groups ${minGap.toFixed(1)}-${maxGap.toFixed(1)} s apart (10-40)`);
  assert.ok(nfl > 32 * 3600 / 50, `only ${nfl} flashes in 32 hours`);
  // in about 3 of the 16 openings (their seeds: the bake's), 80-110 deg off the sun's bearing, 100-150 km away
  const { RNG, subseed } = new Function(STREAMS + '\nreturn { RNG, subseed };')();
  let n = 0;
  for (let k = 0; k < 16; k++) { const r = RNG(subseed((11 + k * 0x9e3779b9) >>> 0, 83)); if (r.f() < 3 / 16) n++; r.sign(); const off = r.r(80, 110), d = r.r(100, 150); assert.ok(off >= 80 && off <= 110 && d >= 100 && d <= 150, 'the storm stands outside 80-110 deg off the sun, or 100-150 km'); }
  assert.ok(n >= 2 && n <= 4, `the far storm stands in ${n} of the 16 openings (about 3)`);
  assert.ok(/var rA = RNG\(subseed\(J\.seed, 83\)\), anv = rA\.f\(\) < 3 \/ 16, side = rA\.sign\(\), off = rA\.r\(80, 110\), dist = rA\.r\(100, 150\);/.test(WORLD), 'the storm\'s draw is not the one this test models');
  // never glittering: 1x against 2x2 at a laptop's pixel across it, in display codes as shown, its lit top over the afterglow
  // and its flicker at its peak over the moonlit sky, each through the cap over the sky where it stands
  const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
  const px = 0.0578 * D2R, Ff = { x: 1, y: 3, z: 9, w: 4 };
  let worst = 0;
  for (const [id, se, F, pick] of [['afterglow', -3, null, (c) => [1, 0.6, 0.46].map((v) => v * K * c[1])], ['moonlit', -24, Ff, (c) => FC.map((v) => v * FK * c[2])]]) {
    const bg = scene(WSKY[id], 5, 0.45).body;
    for (let phi = -0.5; phi <= 0.5; phi += 0.0029) for (let e = 0; e <= 0.11; e += 0.0013) {
      const one = capAdd(bg, pick(anv(phi, e, se, F))), ref = [0, 0, 0];
      for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) capAdd(bg, pick(anv(phi + ox * px / 4, e + oy * px / 4, se, F))).forEach((v, i) => { ref[i] += v / 4; });
      worst = Math.max(worst, ...[0, 1, 2].map((i) => Math.abs(code(bg[i] + one[i]) - code(bg[i] + ref[i]))));
    }
  }
  assert.ok(worst <= 3, `the storm at 1x is ${worst.toFixed(1)} codes from 2x2 (at most 3)`);
});

test('physics: weather/moon-halo: the 22 deg ring and the moon dogs, only adding light, under the ceiling, never glittering', () => {
  // sky-body.glsl's own haloDev and haloAt, made JS a channel at a time (their vec3s are colours)
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const N = +g.match(/const float HALO_N = ([\d.]+);/)[1], K = +WORLD.match(/var HALO_K = ([\d.]+);/)[1];
  const fbody = (name) => { const a = g.indexOf(name), b = g.indexOf('\n}\n', a); return g.slice(g.indexOf('{', a) + 1, b); };
  const js = (t) => t.replace(/\bfloat\s+/g, 'let ').replace(/\bvec3\s+/g, 'let ').replace(/\bvec3\(/g, 'V3(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const hdev = (n) => 2 * Math.asin(Math.min(Math.max(n * 0.5, -1), 1)) * 180 / Math.PI - 60;
  const H = new Function('rd', 'uMoon', 'uHalo', 'CH', 'HALO_N', 'haloDev', 'const V3 = (a, b, c) => (b === undefined ? a : [a, b, c][CH]), { abs, sqrt, exp, sin, cos, asin, acos, atan2, max, min } = Math, atan = (y, x) => Math.atan2(y, x), clamp = (x, a, b) => Math.min(Math.max(x, a), b), degrees = (x) => x * 180 / Math.PI, radians = (x) => x * Math.PI / 180, pow = Math.pow, mix = (a, b, t) => a + (b - a) * t, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); }, dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;' + js(fbody('vec3 haloAt(')).replace('dot(rd, uMoon.xyz)', 'dot(rd, uMoon)'));
  const halo = (rd, m) => [0, 1, 2].map((ch) => H({ x: rd[0], y: rd[1], z: rd[2] }, { x: m[0], y: m[1], z: m[2] }, { x: 1, y: K }, ch, N, hdev));
  const dirAE = (az, e) => [Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)], D2R = Math.PI / 180;
  assert.ok(Math.abs(hdev(N) - 21.84) < 0.05, `ice's minimum deviation ${hdev(N).toFixed(2)} deg (21.84)`);
  for (const me of [5, 15, 30, 45]) {
    const m = dirAE(0.4, me * D2R);
    // the ring straight above the moon (away from the dogs): its peak and its empty inside
    let best = { v: -1 };
    for (let th = 10; th <= 30; th += 0.02) { const v = halo(dirAE(0.4, (me + th) * D2R), m)[1]; if (v > best.v) best = { v, th }; if (th < 21.3) assert.ok(v === 0, `the halo brightens ${th.toFixed(1)} deg from the moon (inside its ring: nothing)`); }
    if (me + 30 < 89) assert.ok(best.th >= 21.8 && best.th <= 22.4, `moon at ${me} deg: the ring peaks ${best.th.toFixed(2)} deg out (21.8-22.4)`);
    // the dogs: at the moon's height, their azimuth offset the plates' minimum deviation (n' = sqrt(n^2 - sin^2 e) / cos e)
    const np = Math.sqrt(N * N - Math.sin(me * D2R) ** 2) / Math.cos(me * D2R), want = hdev(np);
    let bd = { v: -1 };
    for (let da = 15; da <= 55; da += 0.02) { const v = halo(dirAE(0.4 + da * D2R, me * D2R), m)[1]; if (v > bd.v) bd = { v, da }; }
    assert.ok(Math.abs(bd.da - want) <= 0.3, `moon at ${me} deg: its dog stands ${bd.da.toFixed(2)} deg off in azimuth (the plates': ${want.toFixed(2)} +-0.3)`);
  }
  // composited over the moonlit sky at its brightest place (the dog, the moon at 15 deg), saturated and under the ceiling
  const { WSKY } = skyWorld(1, 'night', 0.5), S = WSKY.moonlit;
  const o2l = (L, a, b) => { let l = L + 0.3963377774 * a + 0.2158037573 * b, mm = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b; l **= 3; mm **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s]; };
  const Lof = (c) => Math.cbrt(0.2104542553 * 0 + 0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) * 0.2104542553 + Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) * 0.7936177850 - Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]) * 0.0040720468;
  const m15 = dirAE(0.4, 15 * D2R), np15 = Math.sqrt(N * N - Math.sin(15 * D2R) ** 2) / Math.cos(15 * D2R);
  const dogAdd = halo(dirAE(0.4 + hdev(np15) * D2R, 15 * D2R), m15), ringAdd = halo(dirAE(0.4, (15 + 22.1) * D2R), m15);
  // the dog at the moon's height (the low sky's stops, 1-3), the ring's top 37 deg up (the high sky's, 3-5)
  for (const [st, add] of S.sky.slice(1, 4).map((x) => [x, dogAdd]).concat(S.sky.slice(3, 6).map((x) => [x, ringAdd]))) {
    const c0 = o2l(st[0], st[1] * Math.cos(st[2] * D2R), st[1] * Math.sin(st[2] * D2R)).map((x) => Math.max(x, 0)), c1 = c0.map((v, i) => v + add[i]);
    const L0 = Lof(c0), L1 = Lof(c1), Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];   // (unclamped: the halo itself must stay under 0.53, not the ceiling for it)
    assert.ok(L1 - L0 >= 0.02 && L1 - L0 <= 0.07, `over the moonlit sky's [${st}] the halo adds L ${(L1 - L0).toFixed(3)} (about 0.03-0.06)`);
    assert.ok(L1 <= 0.53, `the halo's brightest place reaches L ${L1.toFixed(3)} (at most 0.53)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `the credit over the halo's brightest place reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1 (at least 4.5)`);
  }
  // never glittering: 1x against 2x2 at a laptop's pixel (0.0578 deg) across the ring and a dog, in display codes of its light alone
  const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
  let worst = 0;
  for (let dx = -40; dx <= 40; dx += 0.37) for (const dy of [0, 7.3, 22.1]) {
    const at = (x, y) => halo(dirAE(0.4 + x * D2R, (15 + y) * D2R), m15);
    const one = at(dx, dy), ref = [0, 0, 0];
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(dx + ox * 0.25 * 0.0578, dy + oy * 0.25 * 0.0578).forEach((v, i) => { ref[i] += v / 4; });
    worst = Math.max(worst, ...[0, 1, 2].map((i) => Math.abs(code(one[i]) - code(ref[i]))));
  }
  assert.ok(worst <= 3, `the halo at 1x is ${worst.toFixed(1)} codes from 2x2 (at most 3)`);
  // with the moon's depth and under the haze: the line in the moon block, before the haze is laid over the moon's lights
  const mb = g.indexOf('if (uHalo.x > 0.0) c += haloAt(rd) * uMoon.w;'), hz = g.indexOf('c = c0 + (c - c0) * (1.0 - hazeSky(rd));', mb);
  assert.ok(mb > 0 && hz > mb && hz - mb < 200, 'the halo is not added with the moon\'s depth (uMoon.w) just before the haze is laid over the moon\'s lights');
  // by moonlight the eye sees the ring and the dogs near colourless: the dogs' tint the ring's own, never warmer
  const tint = (name) => (g.match(new RegExp('vec3 ' + name + ' = mix\\(vec3\\(([^)]*)\\)')) || [])[1];
  assert.ok(tint('warm') && tint('warm') === tint('warmD'), `the dogs' tint (${tint('warmD')}) is not the ring's (${tint('warm')})`);
  // the veil is the stay's: about one moonlit stay in three, across the 16 openings and after the cut; the opening's stay by
  // the opening's seed (its baked still), a stay kept at the cut keeps its veil, and the uniform reads the moon's own stay
  assert.ok(WORLD.includes('gl.uniform4f(u.uHalo, MOON.E ? MOON.E.veil : 0, HALO_K, 0, 0);'), 'the halo\'s uniform does not read the veil of the stay whose moon is up');
  let lit = 0, all = 0, mixed = 0;
  for (let k = 0; k < 16; k++) {
    const seed0 = (11 + k * 0x9e3779b9) >>> 0, W = skyWorld(seed0, 'night', 0.5), W2 = skyWorld(seed0, 'night', 0.5);
    assert.equal(W.SKY.seq[0].veil, W2.SKY.seq[0].veil, `opening ${k}: its first stay's veil is not the opening seed's`);
    for (let j = 0; j < 40; j++) W.skyNext();
    const before = W.SKY.seq.map((e) => e.veil);
    W.SKY.i = 0; W.SKY.k = 0; W.skyReseed((seed0 * 2654435761 + 977) >>> 0);
    assert.equal(W.SKY.seq[0].veil, before[0], `opening ${k}: the stay on show changed its veil at the cut`);
    for (let j = 0; j < 40; j++) W.skyNext();
    const ms = W.SKY.seq.filter((e) => e.id === 'moonlit'), v = ms.reduce((a, e) => a + e.veil, 0);
    lit += v; all += ms.length; if (v > 0 && v < ms.length) mixed++;
  }
  assert.ok(lit / all >= 0.22 && lit / all <= 0.45, `the ice veil over ${lit} of ${all} moonlit stays (about one in three)`);
  assert.ok(mixed >= 12, `only ${mixed} of 16 visits have both veiled and clear moonlit stays (the veil is each stay's own)`);
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

// ------------------------------------------------------------------ the meteors (delight-night §2)
// 219's own plan and stroke run here (meteorList, meteorPlan, meteorShape): the counts a stay over 10^4 stays; a long one
// from under 2 deg up or out of the view to out of it, its wake rigid, its light constant, at most 2.7 px a frame at 60 Hz
// on a laptop; a short one 0.3-1 s at 3-25 deg/s, its light rising and falling softly (one of the owner's two exceptions to
// no-fades, quoted in RULES.json), its stroke over each frame's own path; none in a twilight; none under reduced motion;
// sky-body.glsl's meteorAt keeps its light within 2% as it slides between pixels
const METEORS = cut(WORLD, '  var METEOR = {', '  function meteorStep(');
const metWorld = () => vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180;\n' + STREAMS + VEC + METEORS + ' return { meteorList, meteorPlan, meteorShape, meteorAt3, meteorFrom, METEOR }; })')();
test('night: meteors, long grazers crossing the view and short soft ones, on the night skies only', () => {
  const K = metWorld(), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
  const tanX = Math.tan(36 * Math.PI / 180), tanY = tanX / 1.6, pxDeg = 900 / (2 * Math.atan(tanY) * 180 / Math.PI);   // (1440x900)
  const inView = (d, psi, pitch) => { const a = psi * Math.PI / 180, b = pitch * Math.PI / 180, f = [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)], r = [Math.cos(a), 0, -Math.sin(a)], u = [-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b)], z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]; if (z <= 0) return false; return Math.abs((d[0] * r[0] + d[2] * r[2]) / z / tanX) < 1 && Math.abs((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / tanY) < 1; };
  for (const id of ['afterglow', 'bluehour', 'firstlight']) assert.equal(K.meteorList({ id, n: 3, at: 0, hold: 100 }, 7, 4, 100).length, 0, id + ': no meteor in a twilight');
  const N = 10000, cnt = { milkyway: [0, 0], aurora: [0, 0], moonlit: [0, 0] };
  for (const id of Object.keys(cnt)) for (let s = 1; s <= N; s++) {
    const L = K.meteorList({ id, n: s % 9, at: 0, hold: id === 'moonlit' ? 190 : 100 }, s * 2654435761 >>> 0, 4, id === 'moonlit' ? 190 : 100);
    let t = -Infinity;
    for (const M of L) {
      cnt[id][M.long ? 0 : 1]++;
      assert.ok(M.at >= 4 && M.at + M.dur <= (id === 'moonlit' ? 190 : 100) + 1e-9 && M.at >= t, `${id}: in its stay, in turn, apart`); t = M.at + M.dur + K.METEOR.GAP - 1e-9;
      if (id === 'moonlit') assert.ok(M.y >= K.METEOR.BRIGHT, 'the moonlit sky: bright ones only');
      if (!M.long) assert.ok(M.dur >= 0.3 && M.dur <= 1 && M.w >= 3 && M.w <= 25, 'a short one: 0.3-1 s at 3-25 deg/s');
    }
  }
  const mean = (id, k) => cnt[id][k] / N;
  assert.ok(mean('milkyway', 0) > 0.85 && mean('milkyway', 0) < 1.15, `about one long one a stay (${mean('milkyway', 0).toFixed(2)})`);
  assert.ok(mean('aurora', 1) > 1.5 && mean('aurora', 1) <= 3, `1-3 short ones a stay (${mean('aurora', 1).toFixed(2)})`);
  assert.ok(mean('moonlit', 0) < 0.6 && mean('moonlit', 1) <= 0.6, `the moonlit sky's fewer (${mean('moonlit', 0).toFixed(2)}, ${mean('moonlit', 1).toFixed(2)})`);
  let worst = 0; const spans = [];
  for (let s = 1; s <= 400; s++) for (const long of [true, false]) {
    const R = ((x) => () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32))(s), w = long ? 3 + 2 * R() : 3 + 22 * R(), M = { long, w, dur: long ? 0 : 0.3 + 0.7 * R(), y: 0.08, u: [R(), R(), R(), R()], at: 0, plan: null };
    if (long) { const P0 = K.meteorPlan(M, 0, 0, 1, 1); M.dur = (P0.th1 - P0.th0) / w; spans.push(P0.th1 - P0.th0); }
    const psi = 360 * R(), pitch = 6; M.plan = K.meteorPlan(M, psi, pitch, tanX, tanY);
    const a = K.meteorShape(M, 0, 1 / 60), b = K.meteorShape(M, M.dur - 1e-6, 1 / 60);
    if (long) {
      assert.ok(a.head[1] <= Math.sin(2.05 * Math.PI / 180) || !inView(a.head, psi, pitch), `seed ${s}: a long one starts under 2 deg up or out of the view`);
      assert.ok(b.head[1] <= Math.sin(2.05 * Math.PI / 180), `seed ${s}: and ends under 2 deg up again (${(Math.asin(b.head[1]) * 180 / Math.PI).toFixed(2)}), so no drag shows it ending in the open sky`);
      for (let t = 1; t < M.dur - 1; t += 0.7) { const p = K.meteorShape(M, t, 1 / 60), q = K.meteorShape(M, t + 1 / 60, 1 / 60); assert.ok(Math.abs(ang(p.head, p.tail) - K.METEOR.WAKE) < 1e-6 && p.y === M.y, 'rigid, its light constant'); worst = Math.max(worst, ang(p.head, q.head) * pxDeg); }
    } else {
      assert.ok(a.y < 1e-4 && b.y < 1e-3, 'a short one rises from nothing and falls to nothing');
      const m = K.meteorShape(M, M.dur / 2, 1 / 60); assert.ok(Math.abs(m.y - M.y) < 1e-9, 'its light at its height mid-way');
      const p = K.meteorShape(M, 0.2, 1 / 60), q = K.meteorShape(M, 0.2 + 1 / 60, 1 / 60); if (p && q) assert.ok(ang(q.head, q.tail) >= ang(p.head, q.head) - 1e-9, 'its stroke covers the frame\'s own path');
      const el0 = Math.asin(a.head[1]) * 180 / Math.PI; assert.ok(el0 >= 20 - 1e-6 && el0 <= 55 + 1e-6, `a short one starts mid-sky (${el0.toFixed(1)} deg up)`);
    }
  }
  assert.ok(worst <= 2.7, `a long one moves ${worst.toFixed(2)} px a frame at 60 Hz (1440x900; at most 2.7)`);
  const S = fs.readFileSync(path.join(ROOT, 'src', 'world', '219-meteors.js'), 'utf8');
  assert.ok(S.includes('var E = SKY.seq[SKY.i]; if (!E || reduced() || !SIM.V) return;') && S.includes("if (E && E.met && !reduced())"), 'none under reduced motion');
  for (const [at, t] of [[0, 0], [0, 3.5], [-20, 1], [5, 2]]) { assert.ok(K.meteorFrom({ at }, t, true) >= t + 8, `the opening stay's none before 8 s after its first step (${at}, ${t})`); assert.ok(K.meteorFrom({ at }, t, false) >= at + 4, 'another stay\'s none in its first 4 s'); }
  assert.ok(S.includes('E.met = meteorList(E, AFTER && !first ? SEEDR : J.seed, meteorFrom(E, t, first), E.at + E.hold);'), 'the opening stay\'s from its seed, every later one from the visit\'s own read (as the halo\'s veils)');
  const RJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'RULES.json'), 'utf8')), NF = (RJ.rules || RJ).find((r) => r.id === 'no-fades');
  assert.ok(NF.rule.includes('short shooting stars') && NF.source.some((q) => q.quote === 'Allow short ones too' && q.date === '2026-11-15'), 'no-fades names the short meteors\' exception, quoting the owner');
  console.log(`# meteors a stay: milky way ${mean('milkyway', 0).toFixed(2)} long + ${mean('milkyway', 1).toFixed(2)} short, moonlit ${mean('moonlit', 0).toFixed(2)} + ${mean('moonlit', 1).toFixed(2)}; a long one ${worst.toFixed(2)} px a frame, its path ${Math.min(...spans).toFixed(0)}-${Math.max(...spans).toFixed(0)} deg`);
});
test('night: a meteor\'s stroke keeps its light as it slides between pixels (no glitter)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm'));
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox'), starErf = new Function(E[1].replace(/float /g, ''), js(E[2])), starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  assert.ok(g.includes('float v = uMetH.w * (starBox(d, sg) * along * tap + SKYTAU * sg * sg * starBox(dh.x, sg) * starBox(dh.y, sg));'), 'meteorAt\'s light as measured here');
  const shown = (Ax, Ay, Bx, By, sg) => { const L = Math.hypot(Bx - Ax, By - Ay), ax = (Bx - Ax) / L, ay = (By - Ay) / L, k = 0.70710678 / sg; let sum = 0;
    for (let y = -40; y <= 40; y++) for (let x = -60; x <= 60; x++) { const fx = x - Ax, fy = y - Ay, s = fx * ax + fy * ay, d = Math.abs(fx * ay - fy * ax), along = 0.5 * (starErf(s * k) - starErf((s - L) * k)), tap = 0.2 + 0.8 * Math.min(Math.max(s / L, 0), 1);
      sum += starBox(d, sg) * along * tap + 2 * Math.PI * sg * sg * starBox(x - Bx, sg) * starBox(y - By, sg); } return sum; };
  let lo = Infinity, hi = 0, seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let k = 0; k < 48; k++) { const ox = rnd() - 0.5, oy = rnd() - 0.5, v = shown(-20 + ox, -6 + oy, 20 + ox, 6 + oy, 0.75); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok((hi - lo) / hi < 0.02, `its light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides (at most 2%)`);
});
