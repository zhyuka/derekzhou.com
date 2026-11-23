// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/220-time-day.js", "find": "post:{bloomK:0.4,shafts:0,sat:1.05,stars:1,", "with": "post:{bloomK:0.4,shafts:0,sat:1.05,stars:0.05,", "why": "the stars' amount blended between skies again (the afterglow's 0.05): the no-fades gap"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/227-night-bodies.js", "find": "{ n++; break; }", "with": "{ break; }", "why": "venusFails never counts a place on a word: the evening star planned across the words, and on a window all words"}
// plant: {"file": "src/world/220-time-day.js", "find": "L:[0.62,0.01,80],glow:[0.44,0.01,80]", "with": "L:[0.62,0.01,250],glow:[0.44,0.01,250]", "why": "a blue-tinted disc merges with the blue moonlit clouds"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "\"hi-2268x1080\":[[800.6,222.2,1467.2,433.8]", "with": "\"hi-2268x1080\":[[933.2,339.4,1334.7,433.8]", "why": "the still's own name box alone: on its band's smallest window the words stand bigger, and the moon's footprint falls on them"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "\"hi-1080x1080\":[[268.9,300.5,810.9,441.4]", "with": "\"hi-1080x1080\":[[339.2,347,740.7,441.4]", "why": "the square still's own name box alone: on 800x720 the evening star's path falls on the bigger name"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "var cw = Math.min(bw, bh * BD[0]), ch = Math.min(bh, bw / BD[1])", "with": "var cw = bw, ch = bh", "why": "the opening planned in the whole still: a disc near its top edge falls off a wider window of its band"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "    LATEK.creature = lk[0]; LATEK.glow = lk[1]; LATEK.beam = lk[2];\n", "with": "", "why": "the opening's cloud layout leaves a late program's flag set: it starts compiling at the opening"}
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

// ------------------------------------------------------------------ the night's bodies (delight-night §1 and §4)
// 215's skySphere (AIR's sphere: its season) and 227's starLim and venusDir run here as the page runs them, a fake order under them;
// the shader's own tint and Venus constants read from sky-body.glsl
const NIGHT = cut(WORLD, '  function airSunEl(id)', '\n', true) + cut(WORLD, "  /* THE SKY'S FRAME", '  var AIR_MOOND = ') + cut(WORLD, '  var STAR_LIM =', '  function venusFails(');
function nightWorld(seed, keyAz, seq) {
  return vm.runInThisContext('(function (SEED, KEYAZ, SEQ) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, J = { seed: SEED }, AIR_SUN_NIGHT = -24, AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, SUNU = { on: false }, SKY = { seq: SEQ, dt: 0 }, SKY_RATE = 100;\n' +
    '  var SIM = { t: 0, V: { seed: SEED, light: { sunAz: KEYAZ } } };\n  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function airSkySun(V, el) { return dirAzEl(V.light.sunAz, el); }\n' + STREAMS + VEC + NIGHT +
    '  return { skySphere: skySphere, starLim: starLim, venusDir: venusDir, venusFrame: venusFrame, venusEcl: venusEcl, V: SIM.V, VEN_EL: VEN_EL, VEN_TOP_Y: VEN_TOP_Y };\n})')(seed, keyAz, seq);
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angD = (a, b) => Math.atan2(Math.hypot(...cross3(a, b)), dot3(a, b)) * 180 / Math.PI;
test('night: the evening star stands by the drawn sun (its elongation, on the ecliptic through it, east in the evening, west in the morning) and sets with it', () => {
  for (let s = 1; s <= 60; s++) for (const [morning, D0] of [[false, 3], [false, 7], [true, 3], [false, 24]]) {
    const keyAz = (s * 71) % 360, K = nightWorld(s * 2654435761 >>> 0, keyAz, []), F = K.venusFrame(K.V, morning, D0), side = morning ? -1 : 1, eps = K.VEN_EL[0] + (K.VEN_EL[1] - K.VEN_EL[0]) * ((s * 0.618) % 1);
    assert.ok(K.VEN_EL[1] <= 47 && K.VEN_EL[0] > 0, 'within 47 deg of the sun');
    const sun = (D) => [Math.sin(keyAz * Math.PI / 180) * Math.cos(-D * Math.PI / 180), Math.sin(-D * Math.PI / 180), Math.cos(keyAz * Math.PI / 180) * Math.cos(-D * Math.PI / 180)];
    assert.ok(Math.abs(Math.asin(F.P[1]) * 180 / Math.PI - 64) < 1e-9, 'the pole at AIR\'s latitude');
    const N = [F.P[0], 0, F.P[2]], E = cross3(N, [0, 1, 0]), S0 = sun(D0);
    assert.ok(side * dot3(S0, E) < 0, `seed ${s}: the drawn sun in the ${morning ? 'east' : 'west'}`);
    let prev = null;
    for (let D = Math.min(D0, 3); D <= 24; D += 0.5) {
      const v = K.venusDir(F, eps, side, D, D0, [0, 0, 0]), S = sun(D);
      assert.ok(Math.abs(angD(v, S) - eps) < 1e-6, `elongation ${angD(v, S)} (${eps})`);
      if (D === D0) {
        assert.ok(Math.abs(dot3(v, K.venusEcl(F, S0, [0, 0, 0]))) < 1e-9, 'on the ecliptic through the drawn sun at the opening\'s depth');
        assert.ok(side * dot3(v, cross3(F.P, S0)) > 0, `seed ${s}: ${morning ? 'west' : 'east'} of the sun on the sky`);
      }
      if (D0 <= 7 && D <= 7) assert.ok(v[1] > S[1], `seed ${s}: above the sun in its own twilight`);
      if (prev && v[1] > -0.3 && D > D0) { assert.ok(v[1] < prev[1] + 1e-12, `seed ${s}: it sinks as the sun does (D ${D})`); assert.ok(angD(v, prev) < 0.5 + 1e-9, `seed ${s}: no jump`); }
      prev = v;
    }
  }
});
test('night: the stars come out by the sun\'s depth, brightest first; their colours never move their light; Venus under L 0.50', () => {
  const K = nightWorld(1, 0, []), g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  for (let D = 0; D < 30; D += 0.25) assert.ok(K.starLim(D + 0.25) >= K.starLim(D), 'the limit only deepens with the sun');
  assert.ok(K.starLim(3) < 1.5 && K.starLim(6) >= 0.9 && K.starLim(6) <= 1.5 && Math.abs(K.starLim(12) - 4.5) < 1e-9 && K.starLim(18) >= 6, 'civil, nautical, astronomical');
  assert.ok(g.includes('float starMag(float b) { return 6.2 - 4.0 * log(b / 0.07) / log(10.0); }'), 'starMag');
  const mag = (b) => 6.2 - 4.0 * Math.log10(b / 0.07);
  assert.ok(mag(1.02) < mag(0.3) && mag(0.3) < mag(0.07), 'brightest first');
  assert.ok(g.includes('float bk = nightShow(starMag(b), ml);') && g.includes('float nightShow(float m, float ml) { return clamp((ml - m) / 0.5, 0.0, 1.0); }') && g.includes('float ml = nightLim(c);') && g.includes('b *= bk;'), 'each star by its own margin under the limit (the shared nightLim and nightShow)');
  assert.ok(!/uSunD\.z \* \(/.test(g) && /, sk = uSunD\.z \* smoothstep/.test(g), 'the amount is only the stars\' on/off');
  const stars = [...WORLD.matchAll(/post:\{[^}]*stars:([\d.]+)/g)].map((m) => +m[1]);
  assert.equal(stars.length, 6); assert.ok(stars.every((x) => x === 1), `every sky's stars' amount is 1 (no blend between skies): ${stars}`);
  const lab = (c) => { const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]); return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], W = [0.92 / 0.94, 1, 1 / 0.94];
  const T = g.match(/^vec3 starTint[\s\S]*?^}/m)[0], cols = [...T.matchAll(/vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)/g)].map((m) => [+m[1], +m[2], +m[3]]).filter((c) => c[0] !== 0.92);
  assert.equal(cols.length, 4);
  for (const c of cols) { const L = lab(c); assert.ok(Math.abs(Y(c) - Y(W)) < 2e-3, `tint ${c}: Y ${Y(c)}`); assert.ok(Math.abs(L[0] - lab(W)[0]) < 5e-3, `tint ${c}: L ${L[0]}`); assert.ok(Math.hypot(L[1], L[2]) <= 0.0505, `tint ${c}: pastel (C ${Math.hypot(L[1], L[2]).toFixed(4)}, at most 0.05: delight-night §4)`); }
  const vc = g.match(/return vec3\(([\d.]+), ([\d.]+), ([\d.]+)\) \* min\(v, hv\)/); assert.ok(vc, 'Venus\'s colour, capped at its head');
  const V = [+vc[1], +vc[2], +vc[3]]; assert.ok(Math.abs(Y(V) - 1) < 2e-3, 'Venus\'s colour at Y 1');
  for (const bg of [[0, 0, 0], [0.01, 0.012, 0.03], [0.05, 0.06, 0.1]]) { const hv = Math.max(K.VEN_TOP_Y - Y(bg), 0), top = bg.map((x, i) => x + V[i] * hv); assert.ok(lab(top)[0] <= 0.5, `Venus over ${bg}: L ${lab(top)[0]}`); }
});
test('night: the evening star never glitters as it slides between pixels (its light the same within 2%)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm'));
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox'), starErf = new Function(E[1].replace(/float /g, ''), js(E[2])), starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  const V = g.match(/^vec3 venusAt[\s\S]*?^}/m)[0];
  assert.ok(V.includes('sg = 0.85, F = 1.1 * SKYTAU * hv * sg * sg;') && V.includes('float v = F * starBox(d.x, sg) * starBox(d.y, sg) + 0.13 * hv * exp(-length(d) / 3.6);') && V.includes('min(v, hv)') && !/uT\b/.test(V), 'venusAt: its core, glow and cap as measured here, and no clock (steady)');
  let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (const hv of [0.02, 0.05, 0.1]) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k < 64; k++) {
      const ox = rnd() - 0.5, oy = rnd() - 0.5, F = 1.1 * 2 * Math.PI * hv * 0.7225; let sum = 0, peak = 0;
      for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) { const dx = x - ox, dy = y - oy; if (dx * dx + dy * dy > 400) continue; const v = Math.min(F * starBox(dx, 0.85) * starBox(dy, 0.85) + 0.13 * hv * Math.exp(-Math.hypot(dx, dy) / 3.6), hv); sum += v; peak = Math.max(peak, v); }
      lo = Math.min(lo, sum); hi = Math.max(hi, sum); assert.ok(peak <= hv + 1e-12);
    }
    assert.ok((hi - lo) / hi < 0.02, `head ${hv}: its light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides`);
  }
});

// the stars out in order (delight-night §4, the hub's review of #301): over a change from the blue hour into a night
// (the sun from 7 to 24 deg down on the change's own ease, 58 s), each star's first frame of light against its
// brightness ranks them brightest first (rank correlation >= 0.9, the sky's light by place included: brighter toward the
// glow), and no star's share changes by more than 2% in a frame at 60 Hz; no Venus on a visit with no clear path
test('night: the stars come out brightest first (rank correlation >= 0.9) and never change more than 2% a frame', () => {
  const K = nightWorld(1, 0, []), g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const NL = g.match(/^float nightLim\(vec3 c\) \{ float y = max\(dot\(c, LUMA\), 1e-4\); return (.*); \}$/m);
  assert.ok(NL, 'nightLim as measured here');
  const nightLim = (y, zx, zy) => Math.min(zx - 2.5 * Math.log10(Math.max(y / Math.max(zy, 1e-4), 1)), 7.9 - 2.5 * Math.log10(y / 0.016));
  assert.ok(NL[1] === 'min(uStarM.x - 2.5 * log(max(y / max(uStarM.y, 1e-4), 1.0)) / log(10.0), 7.9 - 2.5 * log(y / 0.016) / log(10.0))', 'nightLim\'s own line: ' + NL[1]);
  const mag = (b) => 6.2 - 4.0 * Math.log10(b / 0.07), show = (m, ml) => Math.min(Math.max((ml - m) / 0.5, 0), 1);
  let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const stars = []; for (let i = 0; i < 400; i++) { const b = Math.pow(rnd(), 6) * 0.95 + 0.07, glow = rnd(); stars.push({ b, glow, first: Infinity }); }   // (glow: 0 the zenith's light, 1 three times it near the glow)
  const ss = (x) => x * x * (3 - 2 * x), zy = 0.02; let worst = 0;
  const prev = stars.map(() => 0);
  for (let f = 0; f <= 58 * 60; f++) {
    const D = 7 + 17 * ss(f / (58 * 60)), zx = K.starLim(D);
    stars.forEach((st, i) => { const v = show(mag(st.b), nightLim(zy * (1 + 2 * st.glow), zx, zy)); if (v > 0 && st.first === Infinity) st.first = f; worst = Math.max(worst, Math.abs(v - prev[i])); prev[i] = v; });
  }
  const out = stars.filter((st) => st.first < Infinity);
  assert.ok(out.length > 300, `${out.length} stars out by the night`);
  const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
  const ra = rank(out.map((st) => st.first)), rb = rank(out.map((st) => -st.b)), n = out.length;
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2;
  const rho = 1 - 6 * d2 / (n * (n * n - 1));
  assert.ok(rho >= 0.9, `the rank correlation ${rho.toFixed(3)} (at least 0.9)`);
  assert.ok(worst <= 0.02, `a star's share changes ${(100 * worst).toFixed(2)}% in a frame (at most 2%)`);
  const N = fs.readFileSync(path.join(ROOT, 'src', 'world', '227-night-bodies.js'), 'utf8');
  assert.ok(N.includes('NIGHTB.none = NIGHTB.eps < 0;') && N.includes('if (venusFails(I, F, e, NIGHTB.side, D0) || (I2 && venusFails(I2, F, e, NIGHTB.side, D0))) continue;') && N.includes('NIGHTB.seed === J.seed && !NIGHTB.none'), 'no clear path down: no Venus');
  console.log(`# stars out in order: rank correlation ${rho.toFixed(3)}, the fastest change ${(100 * worst).toFixed(2)}% a frame`);
});
// the evening star's plan on the still's own window (the hub's round-3 review of #301): 227's venusPlan and venusFails
// and 225's camera run here as the page runs them, on the lo phone still's window and its words' boxes (226's
// STILL_WORDS); the path the plan keeps is walked again here, apart from venusFails: nothing of it on a box (grown by
// the keep and its glow); a window all words has no Venus
const VPLAN = cut(WORLD, '  var MRD = Math.PI', '  function mrSamples(') + cut(WORLD, '  var STAR_LIM =', "  /* (the hub's round-3 review of #301) planned");
function venusWorld(seed, keyAz, landing) {
  return vm.runInThisContext('(function (SEED, KEYAZ, LANDING) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, J = { seed: SEED }, AIR_SUN_NIGHT = -24, AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, SUNU = { on: false }, SKY = { seq: [], dt: 0, landing: LANDING }, SKY_RATE = 100, MOON_KEEP = 12;\n' +
    '  var SIM = { t: 0, V: { seed: SEED, light: { sunAz: KEYAZ } } };\n  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function airSkySun(V, el) { return dirAzEl(V.light.sunAz, el); }\n  function airSunEl(id) { var e = AIR_SUN_EL[id]; return e === undefined ? null : e; }\n' + STREAMS + VEC + cut(WORLD, '  function airSunEl(id)', '\n', true).replace(/function airSunEl\(id\)/, 'function airSunEl0(id)') + cut(WORLD, "  /* THE SKY'S FRAME", '  var AIR_MOOND = ') + VPLAN +
    '  return { venusPlan: venusPlan, venusDir: venusDir, venusFrame: venusFrame, mrCam: mrCam, mrProj: mrProj, NIGHTB: NIGHTB, V: SIM.V, VEN_GLOW: VEN_GLOW };\n})')(seed, keyAz, landing);
}
test('night: the evening star\'s plan on the lo still\'s window keeps its whole path down off the words; a window all words has none', () => {
  const SW = JSON.parse(/var STILL_WORDS = (\{.*?\});/.exec(WORLD)[1]), boxes = SW['lo-393x861'];
  assert.ok(boxes && boxes.length === 5, 'the lo phone still\'s boxes');
  const tanY = Math.tan(32 * Math.PI / 180), win = (bx) => ({ W: 393, H: 861, tanY, tanX: tanY * 393 / 861, pN: 8, pL: 8, keepPx: 12, boxes: bx });
  let planned = 0, onWords = 0;
  for (let s = 1; s <= 80; s++) for (const sky of ['afterglow', 'bluehour', 'firstlight']) {
    const keyAz = (s * 53) % 360, K = venusWorld(s * 2654435761 >>> 0, keyAz, { sky });
    const I = Object.assign(win(boxes), { psi: keyAz + (sky === 'firstlight' ? 1 : -1) * (10 + (s * 7) % 40) });
    assert.ok(K.venusPlan(K.V, I));
    if (K.NIGHTB.none) continue;
    planned++;
    const N = K.NIGHTB, F = K.venusFrame(K.V, N.morning, N.D0), C = K.mrCam(I.psi, I.pN), grow = 12 + K.VEN_GLOW;
    for (let D = N.D0; D <= 24 + 1e-9; D += 0.5) {
      const d = K.venusDir(F, N.eps, N.side, D, N.D0, [0, 0, 0]); if (d[1] <= 0) break;
      const q = K.mrProj(C, I, d); if (q[2] <= 0 || Math.abs(q[0]) > 1.05 || Math.abs(q[1]) > 1.05) continue;
      const x = (q[0] + 1) / 2 * I.W, y = (1 - q[1]) / 2 * I.H;
      if (boxes.some((B) => x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow)) { onWords++; break; }
    }
    const A = venusWorld(s * 2654435761 >>> 0, keyAz, { sky });
    const T80 = Math.tan(80 * Math.PI / 180);   // (a window toward the sun wide enough to hold every place of every try: each one's path crosses the words)
    assert.ok(A.venusPlan(A.V, Object.assign(win([[-1000, -1000, 2000, 2000]]), { psi: keyAz, pN: 0, tanX: T80, tanY: T80 })) && A.NIGHTB.none, `seed ${s} ${sky}: a window all words still has an evening star`);
  }
  assert.ok(planned > 60, `${planned} of 240 visits with an evening star (the test is not empty)`);
  assert.equal(onWords, 0, `${onWords} planned paths cross the words`);
});
// the evening star on each band's smallest window (the hub's round-4 and round-5 reviews: on 1024x768 under the
// 1350x1080 still it stood on the name; at 1280x800@2 its glow touched the credit): planned as the page plans it, in
// the part of the still every window of its band shows (226's stillFrame: its keep the smallest window's, scaled)
// against 226's STILL_WORDS, then its whole path down walked in the smallest window, as the still is shown there at
// the cut (cover) and in that window's own view (226's stillView), against that window's own boxes
// (test/golden/still-words.json): no place of it within the keep and its glow (12 + VEN_GLOW px) of a word
test('night: the evening star and its glow keep off the words on each band\'s smallest window', () => {
  const SF = vm.runInThisContext('(function () { var DEG = Math.PI / 180, CAMUP = ' + /var CAMUP = ([\d.]+);/.exec(WORLD)[1] + ', FOV_LONG = ' + /var FOV_LONG = ([\d.]+);/.exec(WORLD)[1] + ', MOON_KEEP = ' + /MOON_KEEP = ([\d.]+)/.exec(WORLD)[1] +
    '; function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); } function lerp(a, b, t) { return a + (b - a) * t; }\n' +
    cut(WORLD, '  function frustumFor(', '  function setFrustum(') + cut(WORLD, '  var STILL_MIN = ', '  function stillInputs(') + ' return { stillFrame, stillView }; })')();
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'golden', 'still-words.json'), 'utf8'));
  let planned = 0, onWords = 0, nearest = Infinity; const where = [];
  for (const key of Object.keys(G)) {
    const [tier, sh] = key.split('-'), [w0, h0] = sh.split('x').map(Number), Fr = SF.stillFrame(tier, w0, h0, [0.4, 0.6]), [sw, shh] = G[key].min, small = G[key].small;
    const c = Math.max(sw / Fr.bw, shh / Fr.bh), vS = SF.stillView(Fr.bw, Fr.bh, [0.4, 0.6], {}), vL = SF.stillView(sw, shh, [0.4, 0.6], {});
    const views = [['at the cut', { W: sw, H: shh, tanX: vS.tanX * (sw / c) / Fr.bw, tanY: vS.tanY * (shh / c) / Fr.bh }, Fr.pN], ['in its own view', { W: sw, H: shh, tanX: vL.tanX, tanY: vL.tanY }, vL.pN]];
    for (let s = 1; s <= 6; s++) for (const sky of ['afterglow', 'bluehour', 'firstlight']) for (const off of [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]) {   // (headings across the glow: the evening star anywhere over the words)
      const keyAz = (s * 53) % 360, K = venusWorld(s * 2654435761 >>> 0, keyAz, { sky }), psi = keyAz + (sky === 'firstlight' ? 1 : -1) * 30 + off, grow = 12 + K.VEN_GLOW;
      const I = { W: Fr.W, H: Fr.H, tanX: Fr.tanX, tanY: Fr.tanY, pN: Fr.pN, pL: Fr.pN, keepPx: Fr.keepPx, boxes: Fr.boxes.map((b) => b.slice()), psi };
      const I2 = { W: sw, H: shh, tanX: vL.tanX, tanY: vL.tanY, pN: vL.pN, pL: vL.pN, keepPx: 12, boxes: small.map((b) => b.slice()), psi };   // (the live window's own view and words: the night after the cut)
      assert.ok(K.venusPlan(K.V, I, I2));
      if (K.NIGHTB.none) continue;
      planned++;
      const N = K.NIGHTB, F = K.venusFrame(K.V, N.morning, N.D0);
      for (const [view, Lw, pN] of views) {
        const C = K.mrCam(psi, pN);
        for (let D = N.D0; D <= 24 + 1e-9; D += 0.5) {
          const d = K.venusDir(F, N.eps, N.side, D, N.D0, [0, 0, 0]); if (d[1] <= 0) break;
          const q = K.mrProj(C, Lw, d); if (q[2] <= 0 || Math.abs(q[0]) > 1 || Math.abs(q[1]) > 1) continue;
          const x = (q[0] + 1) / 2 * sw, y = (1 - q[1]) / 2 * shh;
          for (const B of small) nearest = Math.min(nearest, Math.hypot(Math.max(B[0] - x, 0, x - B[2]), Math.max(B[1] - y, 0, y - B[3])));
          if (small.some((B) => x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow)) { onWords++; where.push(`${key} at ${sw}x${shh} ${view}, seed ${s} ${sky} heading ${psi}, D ${D}`); break; }
        }
      }
    }
  }
  assert.ok(planned > 150, `${planned} evening stars planned (the test is not empty)`);
  assert.equal(onWords, 0, `paths within the keep and glow of the words in the smallest windows: ${where.slice(0, 6).join('; ')}`);
  console.log(`# evening star on the bands' smallest windows: ${planned} planned, none within 12 + glow px of a word (the nearest ${nearest.toFixed(1)} px)`);
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
