// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* realm-kit.js — the builders the realms share (see world.js for the engine, notes.md "Realm API v3" and "Realm API
   v3, features" for the whole contract).

   THE REALM FILES. Every realm is its own classic deferred script (site/realm-<id>.js), loaded after world.js and this
   file, in this order: world.js, realm-kit.js, realm-dunes.js, realm-above.js, realm-isles.js, realm-forest.js,
   realm-tower.js (then realm-test.js, which registers only in the dev harness with data-realm="test"). Deferred
   scripts run in document order before DOMContentLoaded, and the engine boots on DOMContentLoaded, so every realm has
   registered by then. Registration order is the journey's realm order (ORDER): keep it.

   What a realm file may rely on:
   - window.WORLD, set by world.js: WORLD.realm(def) registers a realm (once per id; a second registration of the same
     id is ignored), WORLD.kit the engine's kit (Builder, box, prism, lathe, rock, cumulus, range, wall, mound, bank,
     lch, lab, hex, lum, dirAzEl, vector helpers, clamp, smooth, lerp, RNG, the integer hashes mirrored from the GLSL:
     cellHash, ihash, hfl, hk; angDiff, E_IN, X_OUT; and the round 3b helpers: glowBake). WORLD is undefined when the
     page has no WebGL2 or no canvas.sky: a realm file then does nothing (the first lines of every file check it).
   - window.WORLD.forms, set here: the shared form builders below (rock in strata, great rocks, shards, stones, ruins,
     stupas, spires, temples, stairs, floating islands, an island's temple) and their generator forms (...G: built a
     part at a time under the frame's vertex budget; return the generator from a realm's build()).
   - Nothing else: no globals, no DOM building, no network, no workers, no modules, no storage, no URL hooks, no clock
     and no entropy of its own (the site's CI greps the realm files for all of them, as it does world.js): every random
     draw comes from the RNG streams the engine hands to field(), light(), cell(), build(), cloud(), event(),
     particles() and the scatter's mesh() (all made from the visit's one draw of entropy and the cell's coordinates).
   - A realm file wraps itself in a function (function () { 'use strict'; var W = window.WORLD; if (!W || !W.forms)
     return; ... W.realm({...}); })(); and keeps its names inside it.
   - A realm that is not built yet registers nothing (its file is a stub); the hour's landing then falls back to the
     realms that are (notes.md, feature 11). */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('realm-kit.js top');   // (E0 Fix 3: the record bounds each script's evaluation)
  var W = window.WORLD;
  if (!W) return;
  var K = W.kit, PI = Math.PI;
  function sh(R, a) { for (var i = a.length - 1; i > 0; i--) { var j = R.i(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ------------------------------------------------------------------ shared: forms */
  // a surface from a grid of points (rows i upward, columns j around, wrapped): smooth normals from the neighbours.
  // A generator: it yields every few rows, so a great rock is built across frames under the vertex budget
  function* gridSurfG(B, P, col, wrap) {
    if (B.lod && P[0].length >= 16) {   // a far cell's coarse build: every other column, every other row (the ends kept)
      P = P.filter(function (r, i) { return i === 0 || i === P.length - 1 || P.length <= 8 || i % 2 === 0; })
        .map(function (r) { return r.filter(function (q, j) { return j % 2 === 0 || (!wrap && j === r.length - 1); }); });
    }
    var nI = P.length, nJ = P[0].length, i, j, N = [];
    for (i = 0; i < nI; i++) {
      var row = [];
      for (j = 0; j < nJ; j++) {
        var iu = Math.min(i + 1, nI - 1), id = Math.max(i - 1, 0), jr = wrap ? (j + 1) % nJ : Math.min(j + 1, nJ - 1), jl = wrap ? (j - 1 + nJ) % nJ : Math.max(j - 1, 0);
        var U = P[iu][j], D = P[id][j], Rr = P[i][jr], Ll = P[i][jl];
        var ax = U[0] - D[0], ay = U[1] - D[1], az = U[2] - D[2], bx = Rr[0] - Ll[0], by = Rr[1] - Ll[1], bz = Rr[2] - Ll[2];
        var cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx, l = Math.sqrt(cx * cx + cy * cy + cz * cz);
        row.push(l > 1e-9 ? [cx / l, cy / l, cz / l] : [0, 1, 0]);
      }
      N.push(row);
    }
    var nj = wrap ? nJ : nJ - 1;
    for (i = 0; i + 1 < nI; i++) {
      for (j = 0; j < nj; j++) {
        var j2 = (j + 1) % nJ;
        B.triN(P[i][j], P[i + 1][j], P[i + 1][j2], N[i][j], N[i + 1][j], N[i + 1][j2], col);
        B.triN(P[i][j], P[i + 1][j2], P[i][j2], N[i][j], N[i + 1][j2], N[i][j2], col);
      }
      if (i % 5 === 4) yield;
    }
  }
  function runG(g) { while (!g.next().done) { /* through */ } }
  function gridSurf(B, P, col, wrap) { runG(gridSurfG(B, P, col, wrap)); }
  // a flat ring (or disc: inner null) at height y between two outlines, facing up
  function ledge(B, outer, inner, y, col) {
    var n = outer.length, up = [0, 1, 0];
    for (var j = 0; j < n; j++) {
      var j2 = (j + 1) % n, a = [outer[j][0], y, outer[j][1]], b = [outer[j2][0], y, outer[j2][1]];
      if (!inner) { B.triN(a, [0, y, 0], b, up, up, up, col); continue; }
      var c = [inner[j][0], y, inner[j][1]], d = [inner[j2][0], y, inner[j2][1]];
      B.triN(a, c, d, up, up, up, col); B.triN(a, d, b, up, up, up, col);
    }
  }
  // an irregular outline: a squashed circle with lobes
  function outline(R, n, rad, squash) {
    var ph = [R.r(0, 6.28), R.r(0, 6.28), R.r(0, 6.28), R.r(0, 6.28)], am = [R.r(0.06, 0.14), R.r(0.04, 0.1), R.r(0.03, 0.06), R.r(0.015, 0.035)], o = [];
    for (var j = 0; j < n; j++) {
      var a = j / n * 2 * PI, r = rad * (1 + am[0] * Math.sin(2 * a + ph[0]) + am[1] * Math.sin(3 * a + ph[1]) + am[2] * Math.sin(5 * a + ph[2]) + am[3] * Math.sin(9 * a + ph[3]));
      o.push([Math.cos(a) * r, Math.sin(a) * r * squash]);
    }
    return o;
  }
  function scaleOl(ol, s) { return ol.map(function (q) { return [q[0] * s, q[1] * s]; }); }
  /* the grooves of a great rock, column by column (erosion runs down its walls): a radial factor about 1 */
  function flutes(R, n, amp) {
    var f = [], ph = R.r(0, 6.28), k1 = 5 + R.i(6), k2 = 12 + R.i(10), j;
    for (j = 0; j < n; j++) { var a = j / n * 2 * PI; f.push(amp * (0.5 * Math.sin(a * k1 + ph) + 0.3 * Math.sin(a * k2 + 2 * ph) + R.r(-0.6, 0.6))); }
    return f.map(function (v, j) { return 1 + (f[(j - 1 + n) % n] + 2 * v + f[(j + 1) % n]) / 4; });
  }
  // a cap over a ring (a fan to its centre, a little domed), facing up
  function cap(B, ring, rise, col) {
    var n = ring.length, c = [0, 0, 0], j;
    for (j = 0; j < n; j++) { c[0] += ring[j][0] / n; c[1] += ring[j][1] / n; c[2] += ring[j][2] / n; }
    c[1] += rise;
    for (j = 0; j < n; j++) { var a = ring[j], b2 = ring[(j + 1) % n], nn = K.norm(K.cross(K.sub(b2, a), K.sub(c, a))); if (nn[1] < 0) nn = K.mul(nn, -1); B.triN(a, c, b2, [nn[0] * 0.3, 1, nn[2] * 0.3], [0, 1, 0], [nn[0] * 0.3, 1, nn[2] * 0.3], col); }
  }
  /* a mesa: a great block of rock with a flat top: a talus apron at its foot, cliffs grooved by erosion and banded by
     strata (each band a little proud or recessed), a cap rock with a ledge under it, its rim broken; now and then a
     smaller tier on top */
  /* rock in strata: bands 30-60 m deep, each its own setback (a ledge where the band above stands back), rows at each
     band's foot and top so the ledges stay crisp; clefts (deep vertical notches) and flutes (erosion's grooves) cut into
     the outline */
  function clefts(R, k0, k1) { var c = [], n = k0 + R.i(k1 - k0 + 1); for (var k = 0; k < n; k++) c.push([R.r(0, 2 * PI), R.r(0.1, 0.22), R.r(0.06, 0.16)]); return c; }
  function cleftK(cl, a) { var m = 1; for (var k = 0; k < cl.length; k++) { var da = Math.atan2(Math.sin(a - cl[k][0]), Math.cos(a - cl[k][0])); m -= cl[k][2] * Math.exp(-da * da / (cl[k][1] * cl[k][1])); } return m; }
  function bandsOf(R, H, lo, hi) { var b = [], y = 0; while (y < H) { var h = R.r(lo, hi); b.push({ y0: y, y1: Math.min(y + h, H), s: R.r(-0.05, 0.015) }); y += h; } return b; }
  function bandAt(bands, y) { for (var k = bands.length - 1; k >= 0; k--) if (y >= bands[k].y0) return bands[k]; return bands[0]; }
  function strataYs(bands, sink) {
    var ys = [-sink, -sink * 0.5, 0];
    for (var k = 0; k < bands.length; k++) { var b = bands[k], h = b.y1 - b.y0; ys.push(b.y0 + Math.min(1.5, h * 0.05), b.y0 + h * 0.5, b.y1 - Math.min(1.5, h * 0.05)); }
    return ys;
  }
  /* a mesa: a great block of rock with a flat top: a talus apron at its foot, cliffs in strata (ledges where the bands
     step back), clefts and grooves, a cap rock with its rim broken; now and then a smaller tier on top */
  function* mesaG(B, R, rad, H, col, o) {
    o = o || {};
    var n = 44, ol = outline(R, n, rad, o.squash || R.r(0.55, 0.9)), fl = flutes(R, n, R.r(0.04, 0.08)), sink = o.sink || 60;
    var bands = bandsOf(R, H * 0.9, 30, 62), cl = clefts(R, 2, 4), jag = [], rows = [], i, j;
    for (j = 0; j < n; j++) jag.push(R.r(-0.07, 0.012) - (R.f() < 0.1 ? R.r(0.05, 0.12) : 0));
    var ys = strataYs(bands, sink); ys.push(H * 0.9 + 1, H * 0.955, H);
    for (i = 0; i < ys.length; i++) {
      var y = ys[i], hn = y / H, row = [];
      var base = y < 0 ? 1.34 - 0.12 * (y + sink) / sink : (hn < 0.12 ? 1.22 - 1.8 * hn : 1.004);
      var st = y >= H * 0.9 ? (y > H * 0.95 ? 0.955 : 1.0) : 1 + bandAt(bands, y).s;
      var fw = K.smooth(0.0, 0.15, hn) * (1 - K.smooth(0.9, 1.0, hn));
      for (j = 0; j < n; j++) {
        var a = j / n * 2 * PI, r = base * st * (1 + (fl[j] - 1) * fw) * (y > 0 ? cleftK(cl, a) : 1), yy = i === ys.length - 1 ? y + jag[j] * H : y;
        row.push([ol[j][0] * r, yy, ol[j][1] * r]);
      }
      rows.push(row);
    }
    yield* gridSurfG(B, rows, col, true);
    cap(B, rows[rows.length - 1], H * 0.012, o.top || col);
    if (o.tier !== false && R.f() < 0.45) { B.push(); B.xf(R.r(-0.2, 0.2) * rad, H * 0.96, R.r(-0.2, 0.2) * rad); yield* mesaG(B, R, rad * R.r(0.32, 0.52), H * R.r(0.22, 0.4), col, { sink: H * 0.06, tier: false }); B.pop(); }
  }
  function mesa(B, R, rad, H, col, o) { runG(mesaG(B, R, rad, H, col, o)); }
  /* a butte: a great rock standing alone: a talus apron, steep walls in strata with clefts and grooves, a cap domed in
     tiers; its base runs on into the ground */
  function* butteG(B, R, rad, H, col, o) {
    o = o || {};
    var n = 44, ol = outline(R, n, 1, o.squash || R.r(0.6, 0.95)), fl = flutes(R, n, R.r(0.05, 0.09)), sink = o.sink || 60, rows = [], i, j;
    var wall = R.r(0.55, 0.75), capP = R.r(2.4, 3.6), bands = bandsOf(R, H, 28, 56), cl = clefts(R, 2, 4), lean = [R.r(-0.08, 0.08), R.r(-0.08, 0.08)];
    var ys = strataYs(bands, sink).filter(function (y) { return y < H * wall || y <= 0; });
    for (var q = 0; q <= 5; q++) ys.push(H * (wall + (1 - wall) * Math.pow(q / 5, 0.8)));
    for (i = 0; i < ys.length; i++) {
      var y = ys[i], hn = Math.max(y, 0) / H, row = [];
      var prof = hn < wall ? 1 - 0.1 * hn / wall : 0.9 * Math.pow(Math.max(1 - Math.pow((hn - wall) / (1 - wall), capP), 0), 1 / capP);
      var talus = 1 + 0.3 * (1 - K.smooth(0.0, 0.14, hn)), st = 1 + bandAt(bands, Math.max(y, 0)).s * (hn < wall ? 1 : 0.5);
      var fw = 1 - K.smooth(0.75, 0.98, hn);
      for (j = 0; j < n; j++) {
        var a = j / n * 2 * PI, r = rad * Math.max(prof, 0.012) * talus * st * (1 + (fl[j] - 1) * fw) * (y > 0 ? cleftK(cl, a) : 1);
        row.push([ol[j][0] * r + lean[0] * Math.max(y, 0), y, ol[j][1] * r + lean[1] * Math.max(y, 0)]);
      }
      rows.push(row);
    }
    yield* gridSurfG(B, rows, col, true);
  }
  function butte(B, R, rad, H, col, o) { runG(butteG(B, R, rad, H, col, o)); }
  /* a rock spire: a tall pinnacle (a narrowing, leaning column with a few shelves) */
  function* rockSpireG(B, R, rad, H, col) {
    var n = 20, ol = outline(R, n, 1, R.r(0.6, 0.9)), fl = flutes(R, n, 0.06), rows = [], NR = 16, lean = [R.r(-0.15, 0.15), R.r(-0.15, 0.15)], i, j;
    for (i = 0; i <= NR; i++) {
      var f = i / NR, y = -30 + (H + 30) * f, shelf = 1 + 0.1 * Math.max(Math.sin(f * 17.0), 0), r = rad * Math.max(1 - Math.pow(Math.max(y, 0) / H, 1.6), 0.02) * shelf * (1 + 0.2 * (1 - K.smooth(0, 0.12, Math.max(y, 0) / H))), row = [];
      for (j = 0; j < n; j++) row.push([ol[j][0] * r * fl[j] + lean[0] * Math.max(y, 0), y, ol[j][1] * r * fl[j] + lean[1] * Math.max(y, 0)]);
      rows.push(row);
    }
    yield* gridSurfG(B, rows, col, true);
  }
  function rockSpire(B, R, rad, H, col) { runG(rockSpireG(B, R, rad, H, col)); }
  // a cluster of spires on a low base (a skyline like a ruined cathedral's)
  function spireCluster(B, R, rad, H, col) {
    mesa(B, R, rad, H * 0.18, col, { tier: false });
    var n = 3 + R.i(5);
    for (var k = 0; k < n; k++) { var a = R.r(0, 6.28), d = rad * Math.sqrt(R.f()) * 0.7; B.push(); B.xf(Math.cos(a) * d, H * 0.1, Math.sin(a) * d); rockSpire(B, R, rad * R.r(0.12, 0.24), H * R.r(0.45, 1.0), col); B.pop(); }
  }
  // a stone shard: a tall blade of an irregular section, its top broken on a slant, leaning
  function shard(B, R, h, w, col) {
    var n = 4 + R.i(2), poly = [], i;
    for (i = 0; i < n; i++) { var a = (i / n) * PI * 2 + R.r(-0.25, 0.25); poly.push([Math.cos(a) * w * R.r(0.7, 1.1), Math.sin(a) * w * 0.6 * R.r(0.7, 1.2)]); }
    var tops = [], sl = R.r(0.25, 0.75), dir = R.r(0, PI * 2);
    for (i = 0; i < n; i++) tops.push(h * (1 - sl * (0.5 + 0.5 * Math.cos(Math.atan2(poly[i][1], poly[i][0]) - dir))));
    K.prism(B, poly, -h * 0.3, tops, R.r(0.35, 0.7), R.r(-0.2, 0.2) * w, R.r(-0.1, 0.1) * w, col);
  }
  /* a giant shard: a monolith of dark stone, broken and leaning (a slab of a fallen monument), a fragment of its top
     fallen beside it, a low block at its foot */
  function giantShard(B, R, h, w, col) {
    var n = 6, poly = [], tops = [], i, dir = R.r(0, PI * 2), sl = R.r(0.35, 0.6);
    for (i = 0; i < n; i++) { var a = (i / n) * PI * 2 + R.r(-0.2, 0.2); poly.push([Math.cos(a) * w * R.r(0.85, 1.1), Math.sin(a) * w * 0.42 * R.r(0.8, 1.15)]); }
    for (i = 0; i < n; i++) tops.push(h * (1 - sl * (0.5 + 0.5 * Math.cos(Math.atan2(poly[i][1], poly[i][0]) - dir))) + R.r(-0.04, 0.04) * h);
    B.push(); B.xf(0, 0, 0, 0, R.r(-6, 6), R.sign() * R.r(14, 24));
    K.prism(B, poly, -h * 0.35, tops, R.r(0.55, 0.75), R.r(-0.15, 0.15) * w, 0, col);
    B.pop();
    B.push(); B.xf(R.sign() * w * R.r(1.3, 1.9), 0, R.r(-0.6, 0.6) * w, R.r(0, 360), R.r(-30, 30), R.r(55, 80)); shard(B, R, h * R.r(0.3, 0.45), w * 0.45, col); B.pop();
    B.push(); B.xf(R.r(-0.5, 0.5) * w, 0, R.sign() * w * R.r(0.9, 1.3), R.r(0, 360), 0, R.r(-8, 8)); K.box(B, -w * 0.9, -2, -w * 0.35, w * 0.9, w * 0.32, w * 0.35, 0.4, col); B.pop();
  }
  // a standing stone: a faceted pillar with a rounded, uneven top
  function menhir(B, R, h, r, col) {
    var prof = [[r * 1.05, -1.5], [r, h * 0.15], [r * R.r(0.85, 1.0), h * 0.55], [r * R.r(0.75, 0.9), h * 0.82], [r * 0.55, h * 0.96], [r * 0.15, h]];
    K.lathe(B, prof, 6 + R.i(3), true, col, R.f());
  }
  /* a segment of a stepped ruin wall: long slabs stacked, each stepping back from the one under it, the upper ones
     broken; its face toward local -x (the way) */
  function ruinSegment(B, R, L, layers, col) {
    var y = -4, back = 0, depth = R.r(9, 13);
    for (var k = 0; k < layers; k++) {
      var th = R.r(2.0, 3.4), d = depth * (1 - k / (layers + 1.5));
      if (k < 2 || R.f() > 0.25 * (k - 1)) {
        var l0 = -L / 2 + (k > 1 ? R.r(0, 0.25) * L : 0), l1 = L / 2 - (k > 1 ? R.r(0, 0.25) * L : 0);
        K.box(B, back, y, l0, back + d, y + th, l1, 0.35, col);
        if (k >= 2 && R.f() < 0.3) { var bx = R.r(l0, l1); K.box(B, back - 1.5, y + th, bx - 1.6, back + 1.8, y + th + R.r(1.5, 3.5), bx + 1.6, 0.25, col); }
      }
      y += th * R.r(0.85, 1.0); back += R.r(1.6, 3.2);
    }
  }
  // a segment of a rampart: a long dark wall with a flat cap, its top broken here and there
  function rampartSegment(B, R, L, H, col) {
    var t = R.r(4, 6);
    K.box(B, -t / 2, -6, -L / 2, t / 2, H * R.r(0.85, 1.0), L / 2, 0.4, col);
    K.box(B, -t / 2 - 0.8, H * 0.92, -L / 2 + 1, t / 2 + 0.8, H * 1.02, L / 2 - 1, 0.3, col);
  }
  // a broken pillar: a drum on a plinth, its top snapped on a slant
  function pillar(B, R, h, r, col) {
    K.box(B, -r * 1.35, -1.5, -r * 1.35, r * 1.35, r * 0.7, r * 1.35, r * 0.15, col);
    var n = 9, poly = [], tops = [], dir = R.r(0, 6.28), sl = R.r(0.1, 0.35);
    for (var i = 0; i < n; i++) { var a = i / n * PI * 2; poly.push([Math.cos(a) * r, Math.sin(a) * r]); tops.push(h * (1 - sl * (0.5 + 0.5 * Math.cos(a - dir))) + R.r(-0.3, 0.3)); }
    K.prism(B, poly, r * 0.6, tops, 0.92, 0, 0, col, true);
  }
  /* a stupa: a square plinth in two steps, a bell, a square harmika, a spire of rings to a point (the bell and the
     spire pale) */
  function stupa(B, R, h, col, cap) {
    var b = h * 0.4;
    K.box(B, -b, -4, -b, b, h * 0.08, b, 0.35, col);
    K.box(B, -b * 0.8, h * 0.08, -b * 0.8, b * 0.8, h * 0.15, b * 0.8, 0.25, col);
    K.lathe(B, [[b * 0.62, h * 0.15], [b * 0.67, h * 0.21], [b * 0.65, h * 0.31], [b * 0.57, h * 0.42], [b * 0.42, h * 0.51], [b * 0.2, h * 0.56], [0.001, h * 0.575]], 20, false, cap);
    K.box(B, -b * 0.17, h * 0.555, -b * 0.17, b * 0.17, h * 0.625, b * 0.17, 0.06, col);
    K.lathe(B, [[b * 0.11, h * 0.625], [b * 0.1, h * 0.69], [b * 0.135, h * 0.7], [b * 0.085, h * 0.77], [b * 0.11, h * 0.78], [b * 0.06, h * 0.86], [b * 0.075, h * 0.87], [0.001, h]], 12, false, cap);
  }
  // a spire: drum, bell, a long cone, a finial
  function spire(B, R, h, r, col, flat) {
    var prof = [[r * 1.0, -1], [r * 1.0, h * 0.12], [r * 0.82, h * 0.14], [r * 0.82, h * 0.2], [r * 0.95, h * 0.27], [r * 0.9, h * 0.36], [r * 0.62, h * 0.44],
      [r * 0.42, h * 0.48], [r * 0.38, h * 0.6], [r * 0.24, h * 0.78], [r * 0.12, h * 0.9], [r * 0.16, h * 0.92], [r * 0.05, h * 0.98], [0, h]];
    K.lathe(B, prof, flat ? 8 : 14, !!flat, col);
  }
  /* a temple of stepped terraces: square tiers, each smaller, a stair up its front (local -z), small stupas at the
     corners of the tiers, a great stupa on the top and two tall spires either side of it */
  function* templeStepped(B, R, size, col, hi) {   // (a generator: built a part at a time under the frame's budget)
    var tiers = 4 + R.i(2), w = size, y = 0, i, cs = [];
    for (i = 0; i < tiers; i++) {
      var h = size * R.r(0.075, 0.095);
      K.box(B, -w / 2, y - (i === 0 ? 30 : 0), -w / 2, w / 2, y + h, w / 2, h * 0.12, col);
      K.box(B, -w / 2 - 0.6, y + h - 0.8, -w / 2 - 0.6, w / 2 + 0.6, y + h + 0.4, w / 2 + 0.6, 0.2, hi);   // a cornice
      if (i > 0 && i < tiers - 1) cs.push([w / 2 - size * 0.04, y + h, size * 0.06]);
      y += h; w *= R.r(0.74, 0.8);
    }
    yield;
    // the stair up the front, from the ground to the top
    var st = B.lod ? 6 : 18, sw = size * 0.13, run = size * 0.5 - w / 2, rise = y / st;
    for (i = 0; i < st; i++) K.box(B, -sw / 2, -2, -size / 2 - 4 + i * run / st, sw / 2, rise * (i + 1), -size / 2 - 4 + (i + 1) * run / st + 0.5, 0.15, hi);
    K.box(B, -sw / 2 - 2.2, -2, -size / 2 - 4, -sw / 2, y * 0.98, -w / 2, 0.3, col);
    K.box(B, sw / 2, -2, -size / 2 - 4, sw / 2 + 2.2, y * 0.98, -w / 2, 0.3, col);
    yield;
    // stupas at the tiers' corners (far off: none)
    var Q = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    if (!B.lod) for (var c = 0; c < cs.length; c++) for (var q = 0; q < 4; q++) { B.push(); B.xf(Q[q][0] * cs[c][0], cs[c][1], Q[q][1] * cs[c][0]); stupa(B, R, cs[c][2] * 2.2, col, hi); B.pop(); yield; }
    // the top: a great stupa, two spires
    B.push(); B.xf(0, y, 0); stupa(B, R, size * R.r(0.36, 0.44), col, hi); B.pop();
    var sh = size * R.r(0.5, 0.62);
    B.push(); B.xf(-w * 0.36, y, w * 0.1); spire(B, R, sh, size * 0.045, hi); B.pop();
    B.push(); B.xf(w * 0.36, y, w * 0.1); spire(B, R, sh * R.r(0.9, 1.0), size * 0.045, hi); B.pop();
  }
  /* a stair down a slope: from the top (local origin) outward along local -z, n steps, side walls */
  function stairDown(B, w, run, drop, n, col, wall) {
    if (B.lod) n = Math.max(4, Math.round(n / 3));   // (far off: a third of the steps)
    for (var i = 0; i < n; i++) {
      var z0 = -(i + 1) * run / n, z1 = -i * run / n + 0.4, yt = -i * drop / n;
      K.box(B, -w / 2, yt - drop / n - 14, z0, w / 2, yt, z1, 0.12, col);
    }
    var a = Math.atan2(drop, run) * 180 / PI, L = Math.hypot(run, drop);
    [-1, 1].forEach(function (sd) { B.push(); B.xf(sd * (w / 2 + 1.2), 0, 0, 0, -a, 0); K.box(B, -1.3, -12, -L, 1.3, 2.2, 1.5, 0.25, wall); B.pop(); });
  }


  /* ------------------------------------------------------------------ islands in the air (ABOVE; the isles and the tower may reuse) */
  /* a floating island: a rock hanging under a green top (an irregular inverted cone, grooved, with ledges), moss over
     its lip */
  function* floatIslandG(B, R, r, depth, rock, grass) {
    var n = 44, ol = outline(R, n, 1, R.r(0.72, 0.95)), fl = flutes(R, n, 0.1), NR = 14, rows = [], i, j;
    var lobes = []; for (i = 0; i < 4; i++) lobes.push([R.r(0, 6.28), R.r(0.25, 0.6), R.r(0.18, 0.4)]);
    for (i = 0; i <= NR; i++) {
      var f = i / NR, y = -depth * Math.pow(1 - f, 1.4), row = [];
      for (j = 0; j < n; j++) {
        var a = j / n * 2 * PI, bulge = 0;
        for (var k = 0; k < lobes.length; k++) { var da = Math.atan2(Math.sin(a - lobes[k][0]), Math.cos(a - lobes[k][0])); bulge += lobes[k][2] * Math.exp(-da * da / 0.25) * Math.sin(f * PI) ; }
        var rr = r * Math.pow(f, 0.55) * (1 + bulge * 0.5) * (1 + (fl[j] - 1) * (1 - f * 0.5)) * (1 + 0.05 * Math.sin(f * 13.0 + j));
        row.push([ol[j][0] * rr, y + (i > 0 && i < NR ? R.r(-0.02, 0.02) * depth : 0), ol[j][1] * rr]);
      }
      rows.push(row);
    }
    yield* gridSurfG(B, rows, rock, true);
    var lip = rows[NR].map(function (q) { return [q[0] * 1.015, 1.8, q[2] * 1.015]; });
    yield* gridSurfG(B, [rows[NR].map(function (q) { return [q[0], -r * 0.02, q[2]]; }), lip], grass, true);
    cap(B, lip, r * 0.04, grass);
    // rocks hanging under it
    var nh = 2 + R.i(3);
    for (k = 0; k < nh; k++) { var ha = R.r(0, 6.28), hd = r * R.r(0.25, 0.6); B.push(); B.xf(Math.cos(ha) * hd, -depth * R.r(0.25, 0.5), Math.sin(ha) * hd, R.r(0, 360), 180, 0); yield* rockSpireG(B, R, r * R.r(0.1, 0.2), depth * R.r(0.3, 0.6), rock); B.pop(); yield; }
  }
  function floatIsland(B, R, r, depth, rock, grass) { runG(floatIslandG(B, R, r, depth, rock, grass)); }
  /* the island's temple: a stepped plinth (three tiers), terraces with stupas at their corners and along their edges,
     a great bell in the middle under a tall spire, two spires beside it (a silhouette against the disc) */
  function* isleTemple(B, R, size, col, hi) {   // (a generator: built a part at a time under the frame's budget)
    var w = size, y = 0, i, k, q, tiers = 3, SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (i = 0; i < tiers; i++) {
      var h = size * R.r(0.09, 0.12);
      K.box(B, -w / 2, y - (i === 0 ? 12 : 0), -w / 2, w / 2, y + h, w / 2, h * 0.1, col);
      K.box(B, -w / 2 - 0.8, y + h - 1.2, -w / 2 - 0.8, w / 2 + 0.8, y + h + 0.5, w / 2 + 0.8, 0.3, hi);
      var ns = i === 0 ? 2 : 1;
      for (k = -ns; k <= ns; k++) for (q = 0; q < 4; q++) {
        var Sd = SIDES[q], a = k / (ns + 0.6) * w / 2, x = Sd[0] ? Sd[0] * (w / 2 - size * 0.04) : a, z = Sd[1] ? Sd[1] * (w / 2 - size * 0.04) : a;
        if (Sd[0] && Math.abs(a) > w * 0.42) continue;
        if (B.lod && (i > 0 || Math.abs(k) !== ns)) continue;   // (far off: the lowest tier's outer ones only)
        B.push(); B.xf(Sd[0] ? x : a, y + h, Sd[1] ? z : a); stupa(B, R, size * (0.11 - i * 0.015), col, hi); B.pop();
        yield;
      }
      y += h; w *= R.r(0.68, 0.76);
    }
    B.push(); B.xf(0, y, 0); stupa(B, R, size * R.r(0.62, 0.74), col, hi); B.pop();
    var sh = size * R.r(0.55, 0.7);
    B.push(); B.xf(-w * 0.42, y, 0); spire(B, R, sh, size * 0.035, hi); B.pop();
    B.push(); B.xf(w * 0.42, y, 0); spire(B, R, sh * R.r(0.88, 1.0), size * 0.035, hi); B.pop();
  }

  W.forms = {
    shuffle: sh, gridSurfG: gridSurfG, gridSurf: gridSurf, runG: runG, ledge: ledge, outline: outline, scaleOl: scaleOl, flutes: flutes, cap: cap,
    clefts: clefts, cleftK: cleftK, bandsOf: bandsOf, bandAt: bandAt, strataYs: strataYs,
    mesaG: mesaG, mesa: mesa, butteG: butteG, butte: butte, rockSpireG: rockSpireG, rockSpire: rockSpire, spireCluster: spireCluster,
    shard: shard, giantShard: giantShard, menhir: menhir, ruinSegment: ruinSegment, rampartSegment: rampartSegment, pillar: pillar,
    stupa: stupa, spire: spire, templeStepped: templeStepped, stairDown: stairDown, floatIslandG: floatIslandG, floatIsland: floatIsland, isleTemple: isleTemple
  };
})();
