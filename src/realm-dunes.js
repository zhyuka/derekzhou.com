// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* realm-dunes.js — the DUNES kit: the sand province's land, rock, landmarks and light. It is not a place of its own:
   the one world (world.js) draws its land everywhere, its dunes' height by the maps' sand weight (gKD) and sunk under
   the cloud sea by theirs, its landmarks scattered by density, its light blended with the other kits' by the smoothed
   climate. It has no bays (the cloud sea is the maps'). */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('realm-dunes.js top');   // (the record bounds each script's evaluation)
  var W = window.WORLD;
  if (!W || !W.forms) return;
  var K = W.kit, F = W.forms, lch = K.lch, PI = Math.PI;
  var mesaG = F.mesaG, butteG = F.butteG, giantShard = F.giantShard, shard = F.shard, menhir = F.menhir, ruinSegment = F.ruinSegment,
    rampartSegment = F.rampartSegment, pillar = F.pillar, stupa = F.stupa, templeStepped = F.templeStepped, stairDown = F.stairDown;

  /* ------------------------------------------------------------------ DUNES: the dawn desert, endless */
  /* The land is one field over the plane: the dune sea (swells, the main dunes as an asymmetric wave across the wind,
     a smaller family across them), the areas laid out over it as regions (a jittered site per 1.5 km cell: open dunes,
     a basin with a giant shard, a field of ruins, a temple on a plateau in terraces; no
     bays: the cloud sea is the maps'), and far ridges of rock (a site per 4.5 km cell, about half of them). The sites are hashed from the
     visit's salt the same way here and in the GLSL, so the land the shaders raise and the things the cells place agree. */
  var DS = 1500, RS = 4500, A = W.air;
  var CUT_D = [77, 123, 169, 205, 256];   // the areas' shares (of 256): open, shard, ruins, temple, bay
  function dSite(ix, iz, salt) {
    var h = K.cellHash(ix, iz, salt), k = K.hk(h, 2) >>> 24, kind = 0;
    while (k >= CUT_D[kind]) kind++;
    if (kind === 4) kind = 0;   // (no bays: the cloud sea is the maps')
    return { ix: ix, iz: iz, h: h, kind: kind, x: (ix + 0.2 + 0.6 * K.hfl(h)) * DS, z: (iz + 0.2 + 0.6 * K.hfl(K.hk(h, 1))) * DS,
      r: [K.hfl(K.hk(h, 3)), K.hfl(K.hk(h, 4)), K.hfl(K.hk(h, 5)), K.hfl(K.hk(h, 6))] };
  }
  var DUNES_GLSL = `@glsl dunes-glsl`;
  /* the great formations at FORM_K of their height (mesas 35-80 m, buttes 45-90, rock needles 18-35): the flight's
     envelope climbs over every one of them on any line the visitor turns to (world.js solidEnv, 0.18 m/m from as far
     off as its height asks), so the eye rises at most about 120 m beside the tallest (at 0.45 of their height the
     flight's clearance has a median of 107 m: the low framing is lost); at full height (to 440 m) it would climb for
     minutes, and a slip cannot pass a 400 m wide mesa met after a drag (875 hard-rule pushes along one's face in a
     dragged flight) */
  var FORM_K = 0.25;
  var D_STONE = [1, 1, 1, 1], D_DARK = [0.78, 0.76, 0.84, 1], D_ROCK = [1, 1, 1, 2], D_PALE = [1, 1, 1, 3];
  var D_BIRD_L = lch(0.40, 0.04, 300), D_BIRD_S = lch(0.22, 0.035, 288);
  function sRng(s, k) { return K.RNG(K.hk(s.h, k)); }
  /* the areas' pieces. The great ones (seen kilometres off) belong to the site's own 1.5 km cell; the details (a ruin
     wall's segments, standing stones, pillars, small shards, a rampart) to whichever 375 m cell holds them */
  function dGreat(C, s) {
    var R, it, k, a, i;
    if (s.kind === 1) {   // the giant shard in its basin
      R = sRng(s, 11); var gh = R.r(34, 46), gw = R.r(7, 10);
      it = C.add({ kind: 'giantShard', x: s.x, z: s.z, foot: 9, dy: -1.5, yaw: R.r(0, 360), h: gh, w: gw, seed: K.hk(s.h, 12), solid: [gw + 0.42 * gh + 4, gh] });
      C.poi({ kind: 'shard', x: s.x, z: s.z, ref: it, dy: gh * 0.5, pass: 42 + gw });
      if (R.f() < 0.6) C.flock({ kind: 'bird', n: 10 + R.i(8), x: s.x, z: s.z, ref: it, dy: R.r(36, 62), orbit: R.r(26, 40), wheel: R.sign() * R.r(0.2, 0.32), size: R.r(1.3, 1.7), flap: 3.4, spread: R.r(6, 12), lit: D_BIRD_L, shade: D_BIRD_S });
    } else if (s.kind === 2) {   // the ruins' mesa behind them
      R = sRng(s, 31); a = s.r[2] * 2 * PI; var d = R.r(380, 700), rM = R.r(170, 260), HM = FORM_K * R.r(150, 230), mx = s.x + Math.sin(a) * d, mz = s.z + Math.cos(a) * d;
      it = C.add({ kind: 'mesa', form: true, x: mx, z: mz, foot: rM * 1.2, yaw: R.r(0, 360), rad: rM, H: HM, seed: K.hk(s.h, 32), solid: [rM * 1.3, HM * 1.42], foot2: [rM * 1.62, HM * 0.14] });
      C.poi({ kind: 'mesa', x: mx, z: mz, ref: it, dy: HM * 0.5, pass: rM + 90 });
      C.poi({ kind: 'ruins', x: s.x, z: s.z, dy: 6, pass: 36 });
    } else if (s.kind === 3) {   // the temple on its plateau, the stair up its face, two stupas at the stair's head
      R = sRng(s, 51);
      var ab = [72 + 16 * s.r[0], 150 + 28 * s.r[1]], ang = s.r[2] * PI, ca = Math.cos(ang), sa = Math.sin(ang), rise = 46 + 14 * s.r[3], yawF = 90 - ang * 180 / PI;
      var L2W = function (lx, ly) { return [s.x + ca * lx - sa * ly, s.z + sa * lx + ca * ly]; };
      var tsz = R.r(60, 72), tp = L2W(ab[0] * 0.2, R.r(-0.25, 0.25) * ab[1]);
      it = C.add({ kind: 'temple', x: tp[0], z: tp[1], foot: tsz * 0.5, yaw: yawF + R.r(-5, 5), size: tsz, seed: K.hk(s.h, 52), solid: [tsz * 0.76, tsz * 1.2] });
      var hd = L2W(-ab[0] + 5, 0);
      C.add({ kind: 'stair', x: hd[0], z: hd[1], foot: 0, yaw: yawF, drop: rise + 18, seed: K.hk(s.h, 53) });
      for (k = 0; k < 2; k++) { var q = L2W(-ab[0] + 14, (k ? 1 : -1) * R.r(14, 17)), stH = R.r(15, 19); C.add({ kind: 'stupa', x: q[0], z: q[1], foot: 4, yaw: yawF, h: stH, seed: K.hk(s.h, 54 + k), solid: [stH * 0.45, stH] }); }
      C.poi({ kind: 'temple', x: tp[0], z: tp[1], ref: it, dy: tsz * 0.4, pass: 75 });
      if (R.f() < 0.8) C.flock({ kind: 'bird', n: 12 + R.i(8), x: tp[0], z: tp[1], ref: it, dy: tsz * 1.15, orbit: R.r(55, 80), wheel: R.sign() * R.r(0.12, 0.2), size: R.r(1.4, 1.8), flap: 3.0, spread: R.r(14, 24), lit: D_BIRD_L, shade: D_BIRD_S });
    }
  }
  function dDetails(s, out) {
    var R, k, i;
    if (s.kind === 1) {   // a rampart across the basin's far side; small shards about the giant one
      R = sRng(s, 21); var a = s.r[3] * 2 * PI, d = R.r(150, 210), cx = s.x + Math.sin(a) * d, cz = s.z + Math.cos(a) * d, L = R.r(150, 240), dir = a + PI / 2 + R.r(-0.4, 0.4), rh = R.r(9, 14);
      for (var u = -L / 2, n = 0; u < L / 2; u += 26, n++) { if (R.f() < 0.15) continue; out.push({ kind: 'rampart', x: cx + Math.sin(dir) * u, z: cz + Math.cos(dir) * u, foot: 12, yaw: dir * 180 / PI + 90, h: rh * R.r(0.8, 1.1), seed: K.hk(s.h, 200 + n), solid: [16, rh + 2] }); }
      for (i = 0; i < 6; i++) { var b = R.r(0, 2 * PI), r = R.r(18, 95), shH = R.r(5, 14), shW = R.r(2.5, 6); out.push({ kind: 'shard', x: s.x + Math.cos(b) * r, z: s.z + Math.sin(b) * r, foot: 2, yaw: R.r(0, 360), tp: R.r(-25, 25), tr: R.r(-25, 25), h: shH, w: shW, seed: K.hk(s.h, 300 + i), solid: [shW + 0.3 * shH, shH] }); }
    } else if (s.kind === 2) {   // a stepped ruin wall; standing stones in a line beside it; pillars behind it
      R = sRng(s, 41); var th = s.r[0] * PI, Lw = 150 + 80 * s.r[1], segL = R.r(22, 30), layers = 4 + R.i(3), dx = Math.sin(th), dz = Math.cos(th), px = dz, pz = -dx, flip = R.f() < 0.5 ? 180 : 0;
      k = 0;
      for (var uu = -Lw / 2; uu < Lw / 2; uu += segL, k++) { if (k > 0 && R.f() < 0.12) continue; var off = R.r(-2.5, 2.5), ly = layers - (R.f() < 0.3 ? 1 : 0); out.push({ kind: 'ruin', x: s.x + dx * uu + px * off, z: s.z + dz * uu + pz * off, foot: segL * 0.5, yaw: th * 180 / PI + flip + R.r(-4, 4), len: segL * 1.06, layers: ly, seed: K.hk(s.h, 400 + k), solid: [segL * 0.62, ly * 3 + 4] }); }
      var side = R.sign(), lat = R.r(13, 20), gap = R.r(11, 17), nm = 6 + R.i(4);
      for (k = 0; k < nm; k++) { var u2 = (k - nm / 2) * gap, la = side * (lat + k * R.r(-1.5, 1.5)), mh = R.r(4, 10), mr = R.r(1.0, 1.8); out.push({ kind: 'menhir', x: s.x + dx * u2 + px * la, z: s.z + dz * u2 + pz * la, foot: 1.5, dy: -0.5, yaw: R.r(0, 360), tp: R.r(-8, 8), tr: R.r(-8, 8), h: mh, r: mr, seed: K.hk(s.h, 500 + k), solid: [mr * 1.6, mh] }); }
      var np = 3 + R.i(3);
      for (k = 0; k < np; k++) { var u3 = R.r(-0.4, 0.4) * Lw, la3 = -side * R.r(14, 26), ph2 = R.r(6, 14), pr = R.r(1.2, 1.9); out.push({ kind: 'pillar', x: s.x + dx * u3 + px * la3, z: s.z + dz * u3 + pz * la3, foot: 2, dy: -R.r(0.5, 2), yaw: R.r(0, 360), tp: R.r(-6, 6), tr: R.r(-6, 6), h: ph2, r: pr, seed: K.hk(s.h, 600 + k), solid: [pr * 1.6, ph2] }); }
    }
  }
  /* the open dunes' own: now and then a great formation (a mesa, a butte, a giant shard) clear of the areas' pieces, and
     far banks of cloud with flat bases high over the sand */
  /* the great formations by density, tall buttes and mesas along the coast: FORM_N candidate spots a cell, each with
     its own draws (the same whether kept or not), kept where its draw falls under the density there: FORM_D in the open
     sand, more (FORM_C) in the band along the cloud sea's coast (its weight 0.05-0.85 there), where they are tall
     buttes and mesas (bay), seated on the lowest ground of their footprint, so those that stand where the land has sunk
     under the sea rise out of it. Each is marked a formation (form): kept wherever the cloud sea lies (the world's
     aboveKeep passes them by) */
  var FORM_N = 6, FORM_D = 0.16, FORM_C = 0.55;
  function dForms(C, s, R) {
    for (var k = 0; k < FORM_N; k++) {
      var x = C.x0 + R.r(0.08, 0.92) * C.size, z = C.z0 + R.r(0.08, 0.92) * C.size, kp = R.f(), kind = R.f(), a1 = R.f(), a2 = R.f(), a3 = R.f(), yaw = R.r(0, 360), seed = R.seed();
      var wc = C.weights(x, z)[1], coast = K.smooth(0.05, 0.35, wc) * (1 - K.smooth(0.55, 0.85, wc));
      if (kp >= FORM_D + FORM_C * coast) continue;
      var bay = coast > 0.3, rad = bay ? 55 + 75 * a1 : (kind < 0.45 ? 150 + 150 * a1 : kind < 0.8 ? 80 + 90 * a1 : 30 + 30 * a1);
      var dx = x - s.x, dz = z - s.z, dd = Math.sqrt(dx * dx + dz * dz);
      if (s.kind > 0 && dd < 480 + rad) continue;
      var it;
      if (bay) {
        var HB = FORM_K * (260 + 180 * a2), isM = a3 < 0.5;
        it = C.add({ kind: isM ? 'mesa' : 'butte', form: true, x: x, z: z, foot: rad * (isM ? 1.45 : 1.2), yaw: yaw, rad: isM ? rad * 1.2 : rad, H: isM ? HB * 0.8 : HB, sink: 20, seed: seed, solid: [rad * (isM ? 1.55 : 1.3), HB * 1.12], foot2: [rad * (isM ? 1.95 : 1.65), HB * 0.15] });
        C.poi({ kind: 'butte', x: x, z: z, ref: it, dy: HB * 0.5, pass: rad * 1.2 + 80 });
        continue;
      }
      var H = FORM_K * (kind < 0.45 ? 140 + 180 * a2 : kind < 0.8 ? 180 + 180 * a2 : 70 + 70 * a2);
      if (kind < 0.45) it = C.add({ kind: 'mesa', form: true, x: x, z: z, foot: rad * 1.2, yaw: yaw, rad: rad, H: H, seed: seed, solid: [rad * 1.3, H * 1.42], foot2: [rad * 1.62, H * 0.14] });
      else if (kind < 0.8) it = C.add({ kind: 'butte', form: true, x: x, z: z, foot: rad * 1.2, yaw: yaw, rad: rad, H: H, seed: seed, solid: [rad * 1.3, H], foot2: [rad * 1.65, H * 0.15] });
      else it = C.add({ kind: 'gshard', form: true, x: x, z: z, foot: 30, yaw: yaw, h: H, w: rad * 0.7, seed: seed, solid: [rad * 0.7 + 0.42 * H + 6, H] });
      C.poi({ kind: 'form', x: x, z: z, ref: it, dy: H * 0.5, pass: rad * 1.2 + 80 });
    }
  }
  /* an air cell (physics: clouds/drift): the low layer's ranges, drifting with the wind and lying along it (the low
     layer's own way, cloudWind's, +- 15 deg: a cloud street); laid out where the air has carried the cell, their
     seats read there */
  function dAirDir(V) { var w = A.windAt(0, 0, A.H.clouds, 0, V); return w.x || w.z ? Math.atan2(w.x, w.z) : Math.atan2(V.wind[0], V.wind[1]); }   // (the low layer's own way, the air's at its height (cloudWind's): its veer, never a copy of it)
  function dAir(C, R) {
    if (R.f() < 0.28) C.cloud({ kind: 'range', x: C.x0 + R.r(0.2, 0.8) * C.size, z: C.z0 + R.r(0.2, 0.8) * C.size, foot: 0, dy: R.r(480, 680), dir: dAirDir(C.V) + R.r(-15, 15) * PI / 180, len: R.r(1100, 1900), w: R.r(260, 420), h: R.r(150, 240), seed: R.seed() });
  }
  /* (delight-weather 3) terrain-held clouds: a lenticular over a far ridge's lee wave on a windy visit. Orographic
     cloud is the one cloud that stands still while the air flows through it: a lens forms in the standing wave in the
     lee of a ridge when the wind over its crest is at least 7.7 m/s (about 15 kt) within 30 deg of square to it. The far
     ridges are the land's own (dunes-glsl's ridges(): a site per RS cell, about half kept, the same hashes here); a
     lens is laid out with the 1500 m cell its ridge's centre falls in, out of view, from the ridge's own hashes (no draw
     of the cell's stream moves), in the dunes kit (not under the cloud sea), at the lee wave's first crest (half a wavelength, pi U / N,
     downwind of the ridge), 1100-1700 m up.
     Its envelope is held (a world cell's); the billows in it flow at the wind at its height (b.flow). Sources:
     https://cloudatlas.wmo.int/en/clouds-species-lenticularis.html (lenticularis);
     https://www.eoas.ubc.ca/books/Practical_Meteorology/ (mountain waves: the wavelength 2 pi M / N, N about 0.01/s) */
  var HELD_V = 7.7, HELD_H = 100, HELD_SQ = 0.5, HELD_N = 0.01;   // m/s over the crest (the ridge-top flow, 100 m up); the wind within 30 deg of square (|cos| to the crest at most 0.5); the stable troposphere's buoyancy frequency (1/s)
  function dHeld(C) {
    var V = C.V; if (!V || !V.wind) return;
    var ix = Math.floor((C.x0 + C.size / 2) / RS), iz = Math.floor((C.z0 + C.size / 2) / RS), h = K.ihash(K.cellHash(ix, iz, C.salt) ^ 0x51ed27);
    if ((K.hk(h, 2) >>> 24) >= 115) return;   // (the ridge's own keep, as ridges())
    var cx = (ix + 0.25 + 0.5 * K.hfl(h)) * RS, cz = (iz + 0.25 + 0.5 * K.hfl(K.hk(h, 1))) * RS;
    if (!C.inside(cx, cz)) return;
    var half = 900 + 700 * K.hfl(K.hk(h, 3)), ang = K.hfl(K.hk(h, 5)) * PI, ax = Math.cos(ang), az = Math.sin(ang);   // (the crest along (cos, sin) in (x, z), as massif()'s l.x)
    var w = A.windAt(0, 0, HELD_H, 0, V), sp = Math.sqrt(w.x * w.x + w.z * w.z);
    if (sp < HELD_V || Math.abs((w.x * ax + w.z * az) / sp) > HELD_SQ) return;
    // the lens at the lee wave's first crest, half a wavelength downwind of the ridge: lambda = 2 pi U / N, U the wind
    // across the crest at the lens's height, N the stable troposphere's buoyancy frequency (HELD_N); at U 8-10 m/s the
    // crest stands 2.5-3.1 km downwind (a lens right behind the ridge would be a cap cloud)
    var ux = w.x / sp, uz = w.z / sp, dy = 1100 + 600 * K.hfl(K.hk(h, 22)), hw = A.windAt(0, 0, dy, 0, V), nx = -az, nz = ax;   // (n: the crest's normal in (x, z))
    var U = Math.abs(hw.x * nx + hw.z * nz), off = PI * U / HELD_N, x = cx + ux * off, z = cz + uz * off;
    if (C.weights(x, z)[1] > 0.5) return;   // (the dunes kit's where the lens stands: none over the cloud sea)
    var T = 45 + 30 * K.hfl(K.hk(h, 23)), n = 1 + (K.hk(h, 24) >>> 30 > 1 ? 2 : (K.hk(h, 24) >>> 30));
    C.cloud({ kind: 'lens', x: x, z: z, foot: 0, dy: dy, dir: Math.atan2(ax, az), len: half * (1.0 + 0.4 * K.hfl(K.hk(h, 25))), w: 380 + 320 * K.hfl(K.hk(h, 26)), t: T, n: Math.min(n, 3), flow: [hw.x, 0, hw.z], seed: K.hk(h, 27) });
  }
  /* a small cell of open dunes: a few stones of its own */
  function dSmall(C, R) {
    var f = R.f(), x = C.x0 + R.r(0.1, 0.9) * C.size, z = C.z0 + R.r(0.1, 0.9) * C.size, k, n;
    if (f < 0.2) { n = 1 + R.i(3); for (k = 0; k < n; k++) { var mh = R.r(4, 9), mr = R.r(1, 1.7); C.add({ kind: 'menhir', x: x + R.r(-9, 9), z: z + R.r(-9, 9), foot: 1.5, dy: -0.5, yaw: R.r(0, 360), tp: R.r(-10, 10), tr: R.r(-10, 10), h: mh, r: mr, seed: R.seed(), solid: [mr * 1.6, mh] }); } }
    else if (f < 0.31) { var ph = R.r(6, 13), pr = R.r(1.2, 1.9); C.add({ kind: 'pillar', x: x, z: z, foot: 2, dy: -R.r(0.5, 2), yaw: R.r(0, 360), tp: R.r(-6, 6), tr: R.r(-6, 6), h: ph, r: pr, seed: R.seed(), solid: [pr * 1.6, ph] }); }
    else if (f < 0.48) { n = 2 + R.i(3); for (k = 0; k < n; k++) { var sh2 = R.r(5, 13), sw = R.r(2.5, 5.5); C.add({ kind: 'shard', x: x + R.r(-14, 14), z: z + R.r(-14, 14), foot: 2, yaw: R.r(0, 360), tp: R.r(-25, 25), tr: R.r(-25, 25), h: sh2, w: sw, seed: R.seed(), solid: [sw + 0.3 * sh2, sh2] }); } }
    else if (f < 0.54) { var th = R.r(0, 180); for (k = 0; k < 2; k++) { var sl = R.r(20, 26), ly = 3 + R.i(2); C.add({ kind: 'ruin', x: x + Math.sin(th * PI / 180) * k * sl, z: z + Math.cos(th * PI / 180) * k * sl, foot: sl * 0.5, yaw: th, len: sl, layers: ly, seed: R.seed(), solid: [sl * 0.62, ly * 3 + 4] }); } }
  }
  W.realm({
    id: 'dunes', still: 'dunes', speed: 12, look: 90, margin: 12,   // (what worldDef reads: world.js)
    glsl: DUNES_GLSL,
    layout: { scales: [{ size: DS, radius: 5200 }, { size: 375, radius: 1300 }] },
    field: function (R, V) {
      // the wind the dunes lie across (their crests across it, their steep lee faces downwind), drawn per visit
      var wind = A.draw(R, V);   // (world.js 215: the air, its one wind)
      var hue = R.r(-8, 8);   // (a pinker or a bluer visit)
      return { params: [
        lch(0.615, 0.07, 322 + hue), lch(0.665, 0.066, 330 + hue), lch(0.56, 0.085, 284 + hue * 0.5), lch(0.50, 0.09, 276),
        lch(0.60, 0.09, 262), lch(0.50, 0.10, 260), lch(0.58, 0.045, 296), lch(0.50, 0.05, 285),
        lch(0.75, 0.05, 30, 0.3), [wind[0], wind[1], 2.2, 0], lch(0.42, 0.09, 262), lch(0.86, 0.03, 300)
      ] };
      /* the sand's shade (L 0.56, its deep 0.50) and the rock's (lit 0.60, shade 0.50, deep 0.42) set light for the
         world's own light: at the one framing the links stand over the near sand and the name beside the formations
         (with the sand's shade at 0.475 the shadows stand at OKLab L about 0.44 as drawn) */
    },
    light: function (R, V) {
      // the low sun from upwind of the dunes (their windward slopes lit, their lee faces blue), 5-14 deg up
      var up = A.upwind(V), el = R.r(A.KEY_EL[0], A.KEY_EL[1]), hz = R.r(0.45, 0.85);
      return {
        sunAz: up + R.r(-A.KEY_AZ, A.KEY_AZ), sunEl: el, sunC: lch(0.97, 0.04, 65, 3.1),
        sky: [lch(0.62, 0.08, 272), lch(0.84, 0.05, 238), lch(0.82, 0.058, 230), lch(0.79, 0.068, 225), lch(0.75, 0.078, 222), lch(0.70, 0.085, 224)],
        skyE: [3, 10, 26, 58], skyW: lch(0.88, 0.07, 45), skyK: [0.5, 8, 0.08, 0],
        glow: [0.3, 6, 0.16, 90], glowC: lch(0.95, 0.06, 65),
        fog: [2.0e-4, 1 / 220, 0, 0.6e-4], fog2: [0.45, 0.02, 0, 0], fogB: [lch(0.56, 0.12, 258), 0.8],
        haze: [1.0e-3 * hz, 30, 24, 0], hazeC: lch(0.78, 0.055, 292), hazeW: lch(0.83, 0.065, 40),
        ambU: lch(0.7, 0.1, 240), ambD: lch(0.55, 0.07, 330),
        clLit: lch(0.9, 0.055, 330), clShade: lch(0.67, 0.095, 276), clDeep: lch(0.60, 0.11, 268), clRim: lch(0.98, 0.05, 60, 0.9),
        clK: [0.86, 0.35, 0.6, 0.3], clK2: [0.12, 0.75, 0.75, 0.35], clDetail: [120, 4],
        discR: 1.9, discI: 5, stars: 0, hi: [0.22, 0.45, 0.0016, 0.004], hiC: lch(0.95, 0.03, 330),
        bloom: [1.05, 0.45, 0.16], shafts: 0.5, shaftC: lch(0.95, 0.05, 60), exposure: 1.0, sat: 1.04, lift: [0.0, 0.0, 0.004], gain: [1, 1, 1],
        cl: [7.0, 0.13, 0.0035, 1], inCloudK: 1.04
      };
    },
    air: function (C, R) { dAir(C, R); },
    cell: function (C, R, K2) {
      if (C.scale === 0) { var s = dSite(C.ix, C.iz, C.salt); dGreat(C, s); dForms(C, s, R); dHeld(C); return; }
      // a small cell: the details of the areas about it that fall in it, and its own stones
      var bx = Math.floor((C.x0 + C.size / 2) / DS), bz = Math.floor((C.z0 + C.size / 2) / DS), out = [], i, j, k;
      for (j = -1; j <= 1; j++) for (i = -1; i <= 1; i++) { var s2 = dSite(bx + i, bz + j, C.salt); if (s2.kind === 1 || s2.kind === 2) { out.length = 0; dDetails(s2, out); for (k = 0; k < out.length; k++) if (C.inside(out[k].x, out[k].z)) C.add(out[k]); } }
      var sh0 = dSite(bx, bz, C.salt), dx = C.x0 + C.size / 2 - sh0.x, dz = C.z0 + C.size / 2 - sh0.z;
      if (sh0.kind === 0 || dx * dx + dz * dz > 600 * 600) dSmall(C, R);
    },
    build: function (it, B, R) {
      switch (it.kind) {
        case 'giantShard': giantShard(B, R, it.h, it.w, D_DARK); break;
        case 'gshard': giantShard(B, R, it.h, it.w, D_ROCK); break;
        case 'mesa': return mesaG(B, R, it.rad, it.H, D_ROCK, it.sink ? { sink: it.sink } : null);   // (generators: a few rows at a time)
        case 'butte': return butteG(B, R, it.rad, it.H, D_ROCK, it.sink ? { sink: it.sink } : null);
        case 'temple': return templeStepped(B, R, it.size, D_STONE, D_PALE);   // (a generator: a part at a time)
        case 'stair': var run = it.drop / Math.tan(26 * PI / 180); stairDown(B, 16, run, it.drop, Math.round(it.drop / 1.6), D_PALE, D_STONE); break;
        case 'stupa': stupa(B, R, it.h, D_STONE, D_PALE); break;
        case 'rampart': rampartSegment(B, R, 27, it.h, D_DARK); break;
        case 'ruin': ruinSegment(B, R, it.len, it.layers, D_STONE); break;
        case 'menhir': B.xf(0, 0, 0, 0, it.tp || 0, it.tr || 0); menhir(B, R, it.h, it.r, D_STONE); break;
        case 'pillar': B.xf(0, 0, 0, 0, it.tp || 0, it.tr || 0); pillar(B, R, it.h, it.r, D_STONE); break;
        case 'shard': B.xf(0, 0, 0, 0, it.tp || 0, it.tr || 0); shard(B, R, it.h, it.w, D_DARK); break;
      }
    },
    cloud: function (cl, PF, R) {
      if (cl.kind === 'lens') { var bl = K.lens(PF, R, cl.x, cl.base, cl.z, cl.dir, cl.len, cl.w, cl.t, cl.n); bl.flow = cl.flow; return; }
      if (cl.kind === 'range') K.range(PF, R, cl.x - Math.sin(cl.dir) * cl.len / 2, cl.base, cl.z - Math.cos(cl.dir) * cl.len / 2, cl.dir, cl.len, cl.w, cl.h);
    },
    // the scatter: pebbles near, shards of dark stone farther, dark boulders half sunk in the middle distance
    scatter: [
      { mesh: function (mb, R) { K.rock(mb, R, 1, 0.6, [0.9, 0.88, 0.95, 1]); }, cell: 7, grid: 30, density: 0.32, size: [0.25, 1.2], sink: 0.35, tilt: 0.7, stretch: 1 },
      { mesh: function (mb, R) { shard(mb, R, 1, 0.35, [0.8, 0.78, 0.86, 1]); }, cell: 22, grid: 22, density: 0.09, size: [1.6, 5.5], sink: 0.1, tilt: 0.9, stretch: 1.6 },
      { mesh: function (mb, R) { K.rock(mb, R, 1, 0.7, [0.62, 0.6, 0.7, 1]); }, cell: 26, grid: 24, density: 0.2, size: [1.6, 4.6], sink: 0.32, tilt: 0.5, stretch: 1.2, salt: 7 }
    ],
    // grains blowing over the sand (now and then one glints), motes in the low sun, veils of sand off the brinks
    particles: function (V) {
      var sand = lch(0.9, 0.04, 60), mote = lch(0.96, 0.05, 70, 1.4);
      return [
        { count: 700, box: 90, height: 1.6, streak: 0.05, width: 1.0, wind: A.vec3(V, A.H.grains, 0, A.GRAIN_K), color: [sand[0], sand[1], sand[2], 0.55], hop: [0.35, 2.6, 0.12, 0] },
        { count: 160, box: 110, height: 26, streak: 0, width: 1.4, wind: A.vec3(V, A.H.motes, 0.1), color: [mote[0], mote[1], mote[2], 0.65], hop: [0, 0, 1.5, 1] }
      ];
    },
    ribbons: function (V) { var sand = lch(0.9, 0.04, 60); return { count: 20, box: 260, length: 70, width: 14, lift: 5, gust: 7, wind: A.vec3(V, A.H.veils, 0), color: [sand[0] * 0.95, sand[1] * 0.92, sand[2] * 0.95, 0.24] }; }
  });
})();
