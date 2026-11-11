// gen/director.js (v2): the director composes the land ahead by ANCHORS on the place channels: two seed-fixed jittered
// lattices (big anchors, radius 1-2.2 km; small anchors, radius 0.3-0.65 km), each anchor a compact C2 bump on a
// domain-warped distance (organic outlines, varied sizes), its offset ADDED to the continuous base maps (many anchors
// are null: the base maps' own regions stand). There is no partition into cells and no place list the maps can read.
// It writes only its own append-only tables (each anchor's radius and offset, once, before it can influence anything
// in reach of the view) and keeps its own record (looks seen, for novelty). It never touches the camera, the heading or
// the time. Places are measured from the maps (gen/sim.js pacing), not from this record.
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Hs = isNode ? require('./hash.js') : root.CWHash;
  var Mp = isNode ? require('./maps.js') : root.CWMaps;
  var Nz = isNode ? require('./noise.js') : root.CWNoise;
  var mix32 = Hs.mix32, hash2 = Hs.hash2, u01 = Hs.u01;

  function phi(r) { if (r >= 1) return 0; var a = 1 - r; return a * a * a * a * (4 * r + 1); }
  // v2's anchor kernel: a plateau (flat inside 0.55 r, a C2 quintic fall to 0 at r): a place's interior is even, its
  // edge an ecotone of 0.45 r
  function plat(r) { if (r >= 1) return 0; if (r <= 0.55) return 1; var t = (1 - r) / 0.45; return t * t * t * (t * (t * 6 - 15) + 10); }
  function smax1(s) { var k = 0.5, h = Math.max(k - Math.abs(s - 1), 0) / k; return Math.max(s, 1) + h * h * k * 0.25; }
  function dphi(r) { if (r >= 1) return 0; var a = 1 - r; return -20 * r * a * a * a; }

  function Lattice(g, s) { this.g = g; this.s = s; this.dz = g * 0.8660254037844386; }
  Lattice.prototype.pos = function (i, j, out) {
    var h = hash2(i, j, this.s);
    out[0] = (i + 0.5 * (j & 1)) * this.g + (u01(h) - 0.5) * 0.4 * this.g;
    out[1] = j * this.dz + (u01(mix32(h)) - 0.5) * 0.4 * this.g;
    return out;
  };
  Lattice.prototype.each = function (x, z, r, fn) {
    var g = this.g, dz = this.dz, p = [0, 0];
    var j0 = Math.floor((z - r) / dz) - 1, j1 = Math.ceil((z + r) / dz) + 1;
    for (var j = j0; j <= j1; j++) {
      var i0 = Math.floor((x - r) / g) - 1, i1 = Math.ceil((x + r) / g) + 1;
      for (var i = i0; i <= i1; i++) {
        this.pos(i, j, p);
        var d = Math.hypot(p[0] - x, p[1] - z);
        if (d <= r) fn(i, j, p[0], p[1], d);
      }
    }
  };
  Lattice.prototype.eachNew = function (x, z, px, pz, r, fn) {
    var g = this.g, dz = this.dz, p = [0, 0], m = 0.35 * g;
    var j0 = Math.floor((z - r) / dz) - 1, j1 = Math.ceil((z + r) / dz) + 1;
    for (var j = j0; j <= j1; j++) {
      var zr = j * dz, jz = 0.2 * g + 1e-6;
      var dzc = Math.max(0, Math.abs(zr - z) - jz), hw = r * r - dzc * dzc;
      var cw = hw > 0 ? Math.sqrt(hw) : 0;
      var lo = x - cw - m - g, hi = x + cw + m + g;
      var dzp = Math.abs(zr - pz) + jz, hp = r * r - dzp * dzp, pw = hp > 0 ? Math.sqrt(hp) : -1;
      var plo = px - pw + m + g, phi_ = px + pw - m - g;
      var i0 = Math.floor(lo / g), i1 = Math.ceil(hi / g);
      for (var i = i0; i <= i1; i++) {
        var xi = (i + 0.5 * (j & 1)) * g;
        if (pw > 0 && xi > plo && xi < phi_) continue;
        this.pos(i, j, p);
        var d = Math.hypot(p[0] - x, p[1] - z);
        if (d <= r && Math.hypot(p[0] - px, p[1] - pz) > r) fn(i, j, p[0], p[1], d);
      }
    }
  };
  function key(i, j) { return i * 1048576 + j; }

  function Director(world, K, seed, inj) {   // (fast500 F: inj, a plan made in the worker: its landing and look scales)
    var D = this;
    D.world = world; D.K = K; D.seed = seed >>> 0;
    var F = K.family, NV = K.pvec.length, PB = K.pbound;
    D.NV = NV;
    D.fam = {};
    ['B', 'S', 'N'].forEach(function (n, k) {
      var f = F[n];
      // the warp of a lattice's distances (organic outlines): amplitude and wavelength scale with the anchors' size
      var wA = f.wA || 0, wL = f.wL || 1000;
      var Reff = (n === 'B' ? 1.3 : 1) * f.R + wA; // big anchors' land channels reach 1.3 R
      D.fam[n] = { name: n, g: f.g, R: f.R, D: f.D, m: f.m, p: f.p || 1, rmin: f.rmin || 1, wA: wA, wL: wL, Reff: Reff, Rc: f.D + Reff + f.m,
        lat: new Lattice(f.g, mix32(seed ^ (0x7A11 + k))), tab: new Map(), n: 0, nActive: 0, sw1: mix32(seed ^ (0x5A1 + k)), sw2: mix32(seed ^ (0x5B2 + k)) };
    });
    D.cam = null; D.t = 0; D.log = { anchors: 0, active: 0, hardMiss: 0, nullChosen: 0 };
    D.seen = [];  // looks seen: {t, look} every 5 s at the view ahead (the record; never read by the drawing)
    var o3 = [0, 0, 0], wv = [0, 0];
    function warpOf(f, x, z, out) {
      if (!f.wA) { out[0] = x; out[1] = z; return out; }
      Nz.fbm(x, z, f.wL, 2, 0.5, f.sw1, o3); var a = o3[0];
      Nz.fbm(x, z, f.wL, 2, 0.5, f.sw2, o3); var b = o3[0];
      out[0] = x + f.wA * a; out[1] = z + f.wA * b; return out;
    }
    D.warpOf = warpOf;
    // ---- the field the maps read: the sum of the anchors' bumps, softly bounded per channel (tanh: C-infinity)
    var acc = new Float64Array(8), acs = new Float64Array(8), acr = new Float64Array(8);
    // the channels that shape the land (roughness, rock mix, moisture, dunes, lava and talus) move the relief and the
    // flight's envelope: they are carried by a smooth bump (C2) over 1.3 of the anchor's radius, big anchors only, so
    // the envelope stays climbable (P5). The channels that colour and furnish a place (tree structure, bloom, cloud
    // form) are carried by the plateau (an even interior, a crisper edge), big and small anchors.
    var RELIEF = [1, 1, 1, 0, 0, 1, 1, 0], WIDE = 1.3;
    /* (fast500 B2 P2) each family's lattice about the landing in dense grids: the slots' positions (Lattice.pos, as
       computed there) and their records (the table's, kept in step by famPut), over the family's commit reach plus 6 km.
       Made once the landing is known; slots outside it take Lattice.pos and the table */
    function famCache(f) {
      if (f.C) return f.C;
      var x = D.land0[0], z = D.land0[1], ext = f.Rc + 6000, g = f.g, dz = f.lat.dz;
      var i0 = Math.floor((x - ext) / g) - 2, i1 = Math.ceil((x + ext) / g) + 2, j0 = Math.floor((z - ext) / dz) - 2, j1 = Math.ceil((z + ext) / dz) + 2;
      var ni = i1 - i0 + 1, nj = j1 - j0 + 1, PX = new Float64Array(ni * nj), PZ = new Float64Array(ni * nj), RECS = new Array(ni * nj).fill(null), p = [0, 0];
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) { f.lat.pos(i, j, p); var q = (j - j0) * ni + (i - i0); PX[q] = p[0]; PZ[q] = p[1]; }
      f.C = { i0: i0, i1: i1, j0: j0, j1: j1, ni: ni, PX: PX, PZ: PZ, RECS: RECS };
      f.tab.forEach(function (rec, k) { var ii = Math.round(k / 1048576); famPut(f, ii, k - ii * 1048576, rec); });
      return f.C;
    }
    function famPut(f, i, j, rec) { var C = f.C; if (C && i >= C.i0 && i <= C.i1 && j >= C.j0 && j <= C.j1) C.RECS[(j - C.j0) * C.ni + (i - C.i0)] = rec; }
    function addFam(f, x, z, a8, relief) {
      if (!(f.wx === x && f.wz === z)) { if (!f.wv) f.wv = [0, 0]; warpOf(f, x, z, f.wv); f.wx = x; f.wz = z; }   // (fast500 B2 P3: the warp once a point)
      var X = f.wv[0], Z = f.wv[1], sw = 0;
      a8.fill(0);
      var C = D.land0 ? famCache(f) : null, r = relief ? WIDE * f.R : f.R, g = f.g, dz = f.lat.dz, r2 = r * r * (1 + 1e-9), p = wv;
      var j0 = Math.floor((Z - r) / dz) - 1, j1 = Math.ceil((Z + r) / dz) + 1;
      for (var j = j0; j <= j1; j++) {   // (Lattice.each's order: rows, then slots along each)
        var i0 = Math.floor((X - r) / g) - 1, i1 = Math.ceil((X + r) / g) + 1;
        var inBox = !!C && j >= C.j0 && j <= C.j1 && i0 >= C.i0 && i1 <= C.i1, row = inBox ? (j - C.j0) * C.ni - C.i0 : 0;
        for (var i = i0; i <= i1; i++) {
          var a, d;
          if (inBox) {
            var qq = row + i; a = C.RECS[qq]; if (!a || !a.v) continue;
            var ex = C.PX[qq] - X, ez = C.PZ[qq] - Z; if (ex * ex + ez * ez > r2) continue;
            d = Math.hypot(C.PX[qq] - X, C.PZ[qq] - Z); if (d > r) continue;
          } else {
            f.lat.pos(i, j, p); d = Math.hypot(p[0] - X, p[1] - Z); if (d > r) continue;
            a = f.tab.get(key(i, j)); if (!a || !a.v) continue;
          }
          var q = relief ? phi(d / (WIDE * a.r)) : plat(d / a.r); if (q <= 0) continue;
          sw += q; for (var c = 0; c < NV; c++) a8[c] += q * a.v[c];
        }
      }
      var den = smax1(sw); for (var c = 0; c < NV; c++) a8[c] /= den; // where anchors overlap, their mean
      return sw;
    }
    // the field: big anchors' blend (each place's offset; the base matrix between them) plus small anchors' patches
    // (look channels only), each a mean over a smooth max of 1 (C1), so never beyond its anchors' own bounds
    D.fieldP = function (x, z, out) {
      addFam(D.fam.B, x, z, acc, false); addFam(D.fam.S, x, z, acs, false); addFam(D.fam.B, x, z, acr, true);
      for (var c = 0; c < NV; c++) out[c] = Math.max(-PB[c], Math.min(PB[c], RELIEF[c] ? acr[c] : acc[c] + acs[c]));
      return out;
    };
    world.fields = { P: D.fieldP };

    // ---- the look predictor (provisional, as v1): cover shares, the albedo mix as OKLab, roughness, dunes, bloom,
    // cloud form, rock; standardised at the landing, x sqrt 2 for the ruler's tau
    var ALB = Mp.ALB, cv = {}, wt = {}, kw = {};
    D.lookOf = function (mc, pv, out) {
      var W = world.weights(mc, pv, wt);
      var sl = Math.min(1.2, W.A * 0.0045);
      world.coverWith(mc, pv, W.hb, sl * 0.7, sl * 0.7, cv);
      var rk = Mp.rockAlb(Math.max(0.05, cv.Ar), cv.Wr);
      var gr = [0, 0, 0];
      for (var c = 0; c < 3; c++) gr[c] = ALB.grass[c] * (1 - cv.dry) + ALB.steppe[c] * cv.dry;
      var tr = cv.tree, sh = cv.shrub, gs = cv.grass, mo = cv.moss, sa = cv.sand, ro = cv.rock, sn = cv.snow;
      var al = [0, 0, 0];
      for (c = 0; c < 3; c++) al[c] = tr * (cv.wCon * ALB.conifer[c] + cv.wBro * ALB.broad[c] + cv.wUmb * ALB.acacia[c]) + sh * ALB.shrub[c] + gs * gr[c] + mo * ALB.moss[c] + sa * ALB.sand[c] + ro * rk[c] + sn * ALB.snow[c];
      var lab = Mp.linToOklab(al[0] * 2.5, al[1] * 2.5, al[2] * 2.5);
      out[0] = lab[0]; out[1] = lab[1]; out[2] = lab[2]; out[3] = tr; out[4] = gs; out[5] = sh; out[6] = sa + ro; out[7] = W.Kd;
      out[8] = Math.log(W.A); out[9] = cv.bloom; out[10] = W.Km; out[11] = W.Kv * 0.5 + 0.5 * Mp.sstep(-1.2, 0.0, W.thrL);
      world.kit(mc, pv, kw); out[12] = kw.wC; out[13] = kw.wD;   // (world6: the kits' weights are part of the look)
      return out;
    };
    D.NF = 14;
    D.scale = new Float64Array(D.NF);
    D.dist = function (a, b) { var s = 0; for (var c = 0; c < D.NF; c++) { var q = (a[c] - b[c]) / D.scale[c]; s += q * q; } return Math.sqrt(s) * Math.SQRT2; };
    // candidate offsets for an anchor at (cx, cz): Earth-first conditional draws given the climate there (spec 4.4.1)
    var mcc = {}, pcc = {}, hb2 = [0, 0];
    D.candidates = function (cx, cz, rng, n, scale) {
      world.macro(cx, cz, mcc);
      var hbv = world.hbFn(mcc.C, hb2)[0];
      var drySandy = Mp.L(mcc.Ar, 0.20, 0.08) * (1 - Mp.L(mcc.lnP, 5.3, 0.4));
      var up = Mp.sstep(20, 300, hbv), out = [new Float64Array(NV)]; // candidate 0: the null anchor (the base stands)
      for (var k = 1; k < n; k++) {
        var v = new Float64Array(NV);
        v[0] = ((rng() * 2 - 1) * 0.85 + 0.25 * up) * PB[0] * scale;
        v[1] = (rng() * 2 - 1) * PB[1] * scale;
        v[2] = (rng() * 2 - 1) * PB[2] * scale;
        v[3] = (rng() * 2 - 1) * PB[3] * scale;
        v[4] = (rng() * 2 - 1) * PB[4] * scale;
        v[5] = (rng() * 1.3 - 0.3) * PB[5] * drySandy * scale;
        v[6] = (rng() * 2 - 1) * PB[6] * scale;
        v[7] = (rng() * 2 - 1) * PB[7] * scale;
        out.push(v);
      }
      return out;
    };
    // the place vector at a point with an extra offset v added to the field's sum (for scoring a candidate)
    var pvTmp = {}, PVH = false, pvX = NaN, pvZ = NaN;   // (fast500 B2 P1: inside one anchor's commit, world.place at its point is run once)
    function placeWith(cx, cz, v, f, wgt) {
      if (!(PVH && cx === pvX && cz === pvZ)) { world.place(cx, cz, pvTmp, mcc); pvX = cx; pvZ = cz; }
      // the field already holds the committed anchors; add this candidate's bump at its weight (the soft bound is
      // ignored here: scoring only)
      var o = { E: Math.min(1, Math.max(0, pvTmp.E + wgt * v[0])), rk: pvTmp.rk + wgt * v[1], m: pvTmp.m + wgt * v[2], Sv: Math.min(1, Math.max(0, pvTmp.Sv + wgt * v[3])),
        Fl: Math.min(1, Math.max(0, pvTmp.Fl + wgt * v[4])), kd: pvTmp.kd + wgt * v[5], kx: pvTmp.kx + wgt * v[6], Fc: pvTmp.Fc + wgt * v[7] };
      return o;
    }
    // ---- the landing (v2): the world's origin for this visit, chosen once before anything is drawn, among 24 seed-fixed
    // candidates, as the one with the most kinds of land within 7 km all round (10 min of flight whichever way you go:
    // it never assumes a heading) and the widest spread of climate there. It places the visitor; it never steers.
    D.landing = function () {
      var r = Hs.splitmix32(mix32(D.seed ^ 0x1A4D)), best = [0, 0], bs = -1, mc = {}, pc = {}, W = {}, cv = {};
      for (var k = 0; k < 24; k++) {
        var x0 = (r() - 0.5) * 120000, z0 = (r() - 0.5) * 120000, kinds = {}, Ts = [], Ps = [];
        for (var ring = 0; ring <= 3; ring++) for (var q = 0; q < (ring ? 8 : 1); q++) {
          var a = (q + 0.5 * (ring & 1)) * Math.PI / 4, rr = ring * 2333, x = x0 + rr * Math.sin(a), z = z0 + rr * Math.cos(a);
          world.macro(x, z, mc); world.place(x, z, pc, mc); world.weights(mc, pc, W); world.coverWith(mc, pc, W.hb, 0.05, 0.03, cv);
          var kind = cv.snow > 0.4 ? 'snow' : W.thrL > -0.6 ? 'wet' : cv.tree > 0.35 ? (cv.wCon > 0.5 ? 'conifer' : cv.wUmb > 0.5 ? 'palm' : 'forest') : cv.tree > 0.08 ? 'wood' :
            (cv.sand + cv.rock > 0.5 ? (W.Kd > 0.25 ? 'dunes' : W.Km > 0.25 ? 'mesa' : 'bare') : cv.dry > 0.6 ? 'steppe' : W.A > 40 ? 'hills' : 'meadow');
          kinds[kind] = 1; Ts.push(mc.T); Ps.push(mc.lnP);
        }
        var sd = function (a) { var m = 0; a.forEach(function (v) { m += v / a.length; }); var s2 = 0; a.forEach(function (v) { s2 += (v - m) * (v - m) / a.length; }); return Math.sqrt(s2); };
        var sc = Object.keys(kinds).length + 0.5 * (sd(Ts) / 2 + sd(Ps) / Math.log(1.5));
        if (sc > bs) { bs = sc; best = [x0, z0]; }
      }
      D.landScore = bs;
      return best;
    };
    D.land0 = inj ? (D.landScore = inj.landScore, inj.land0.slice()) : D.landing();
    // calibrate the look scales at the landing's climate (random candidates), each floored at the smallest difference
    // that shows
    var FLOOR = [0.02, 0.006, 0.006, 0.05, 0.05, 0.03, 0.05, 0.05, 0.12, 0.02, 0.05, 0.05, 0.08, 0.08];
    if (inj) D.scale.set(inj.scale); else (function () {
      var r = Hs.splitmix32(mix32(seed ^ 0xCA11)), Ls = [], mean = new Float64Array(D.NF);
      for (var k = 0; k < 400; k++) {
        // the spread of looks the place channels make at one climate (the landing's): base maps at random points plus
        // random offsets (as v1: the climate's own travel comes on top of this)
        var x = (r() - 0.5) * 30000, z = (r() - 0.5) * 30000; world.macro(D.land0[0], D.land0[1], mcc);
        var v = D.candidates(x, z, r, 2, 1)[1]; world.macro(D.land0[0], D.land0[1], mcc);
        var pw = placeWith(x, z, v, null, 1); world.macro(D.land0[0], D.land0[1], mcc);
        var lk = D.lookOf(mcc, pw, new Float64Array(D.NF));
        Ls.push(lk); for (var c = 0; c < D.NF; c++) mean[c] += lk[c] / 400;
      }
      for (var c2 = 0; c2 < D.NF; c2++) { var s = 0; for (k = 0; k < Ls.length; k++) s += (Ls[k][c2] - mean[c2]) * (Ls[k][c2] - mean[c2]); D.scale[c2] = Math.max(FLOOR[c2], Math.sqrt(s / Ls.length)); }
    })();

    // ---- committing an anchor (spec 4.3-4.4, v2): its radius and whether it acts are the slot's own (hash); its offset
    // is chosen, aware of what has been seen and of its committed neighbours
    var lk = new Float64Array(14);
    function commitAnchor(f, i, j, sx, sz) {
      var h = hash2(i, j, mix32(D.seed ^ 0xA2C7 ^ f.g));
      var active = u01(h) < f.p;
      var r = f.R * (f.rmin + (1 - f.rmin) * u01(mix32(h ^ 0x51)));
      var rec = { v: null, r: r, t: D.t, look: null };
      D.log.anchors++;
      if (active) {
        PVH = true; pvX = NaN;   // (fast500 B2 P1: the table and mcc stay as they are until the commit's end)
        D.log.active++;
        var rng = Hs.splitmix32(mix32(h ^ 0x77));
        world.macro(sx, sz, mcc);
        var C = D.candidates(sx, sz, rng, K.K, f.name === 'B' ? 1 : 0.6);
        // neighbours' looks (committed anchors of this family within 1.8 R): pacing
        var nb = [];
        f.lat.each(sx, sz, 1.8 * f.R, function (a, b) { var q = f.tab.get(key(a, b)); if (q && q.look) nb.push(q.look); });
        // the look here as it stands (the base matrix and the anchors already committed): a place must stand apart
        // from its surroundings (big anchors: >= 0.8 tau; small ones are patches and need not)
        var baseLook = Float64Array.from(D.lookOf(mcc, placeWith(sx, sz, C[0], f, 0), lk));
        var apart = f.name === 'B' ? 0.8 * K.tau : 0;
        // looks seen: the last 20 min hard (tau), earlier ones tau / 2
        var best = 0, bs = -1e9, bestAny = 0, bMin = -1;
        for (var k = 0; k < C.length; k++) {
          D.lookOf(mcc, placeWith(sx, sz, C[k], f, 1), lk);
          var mind = 1e9, hard = true;
          for (var a = 0; a < D.seen.length; a++) {
            var e = D.seen[a], d = D.dist(lk, e.look);
            if (D.t - e.t <= K.novelty_window_s) { if (d < mind) mind = d; } else if (d < K.tau / 2) hard = false;
          }
          if (D.seen.length && mind < K.tau) hard = false;
          var dBase = D.dist(lk, baseLook);
          if (dBase < apart) hard = false;
          var s = 0.1 * Math.min(3, Math.max(0, (D.seen.length ? mind : K.tau) - K.tau)) - 0.3 * Math.max(0, dBase - 1.8 * K.tau);
          var pace = 0;
          for (a = 0; a < nb.length; a++) { var dd = D.dist(lk, nb[a]); if (dd < 0.6 * K.tau) pace += 0.6 * K.tau - dd; else if (dd > 1.6 * K.tau) pace += dd - 1.6 * K.tau; }
          s -= 0.5 * pace / Math.max(1, nb.length) * 2;
          if (hard && s > bs) { bs = s; best = k; }
          if (mind > bMin) { bMin = mind; bestAny = k; }
        }
        if (bs === -1e9) { best = bestAny; D.log.hardMiss++; }
        if (best === 0) D.log.nullChosen++;
        // quantise to 8 bits over each channel's bound (as the GPU table would hold it): exact, append-only
        var v = new Float32Array(NV);
        for (var c = 0; c < NV; c++) { var qn = Math.round((Math.max(-PB[c], Math.min(PB[c], C[best][c])) / PB[c] * 0.5 + 0.5) * 255); v[c] = (qn / 255 - 0.5) * 2 * PB[c]; }
        rec.v = v;
        D.lookOf(mcc, placeWith(sx, sz, C[best], f, 1), lk); rec.look = Float64Array.from(lk);
        f.nActive++;
        PVH = false;
      }
      f.tab.set(key(i, j), rec); famPut(f, i, j, rec);   // (fast500 B2 P2: the dense grid kept in step)
      f.n++;
    }
    function commitN(i, j) {
      var f = D.fam.N, h = hash2(i, j, mix32(D.seed ^ 0x4E4E));
      var v = new Float32Array(2), bm = -1;
      for (var k = 0; k < 4; k++) { var a = u01(mix32(h + k)), b = u01(mix32(h ^ (k * 977))); var d = Math.abs(a - D.nMean[0]) + Math.abs(b - D.nMean[1]); if (d > bm) { bm = d; v[0] = a; v[1] = b; } }
      D.nMean[0] = 0.999 * D.nMean[0] + 0.001 * v[0]; D.nMean[1] = 0.999 * D.nMean[1] + 0.001 * v[1];
      f.tab.set(key(i, j), { v: v, r: f.R, t: D.t }); f.n++;
    }
    D.nMean = [0.5, 0.5];
    D.key = key;
    // ---- the tick (spec 4.5): every uncommitted slot within its family's commit radius, nearest first
    /* (fast500 B3) the tick's radial prefix. A tick given `pre` commits a family's nearest-first list only to pre[n] m
       and keeps the rest (D.rest) for D.tickRest, which commits it in the same order, at the tick's own time, before
       anything later: the next tick finishes it first. Bit-identical when nothing committed before the rest reads it:
       an S anchor reads only its own family nearer than itself (pacing) and the field at its point (B and S within
       their reach, B committed whole first), N reads nothing of B or S, and no texel baked before the rest reaches
       beyond the prefix (the caller's rule: mapsInit's TICK_PRE) */
    D.rest = null;
    function commitList(n, f, list, k0, k1, t) {
      for (var k = k0; k < k1; k++) {
        if (n === 'N') commitN(list[k][1], list[k][2]); else commitAnchor(f, list[k][1], list[k][2], list[k][3], list[k][4]);
        if (D.onCommit) D.onCommit(n, list[k][3], list[k][4], t);
      }
    }
    D.tickRest = function (budget) {   // up to `budget` slots of the rest; true once none is left
      var R = D.rest; if (!R) return true;
      var t0 = D.t, k1 = Math.min(R.list.length, R.k + budget); D.t = R.t;
      commitList(R.n, R.f, R.list, R.k, k1, R.t); R.k = k1; D.t = t0;
      if (R.k >= R.list.length) D.rest = null;
      return !D.rest;
    };
    D.tick = function (cam, t, pre) {
      if (D.rest) D.tickRest(Infinity);   // (fast500 B3: the first tick's rest before any later commit)
      D.t = t;
      var prev = D.cam;
      D.cam = [cam[0], cam[1]];
      var n0 = D.fam.S.n + D.fam.B.n;
      ['B', 'S', 'N'].forEach(function (n) {
        var f = D.fam[n], list = [];
        var add = function (i, j, sx, sz, d) { if (!f.tab.has(key(i, j))) list.push([d, i, j, sx, sz]); };
        if (!prev) f.lat.each(cam[0], cam[1], f.Rc, add); else f.lat.eachNew(cam[0], cam[1], prev[0], prev[1], f.Rc, add);
        list.sort(function (a, b) { return a[0] - b[0]; });
        var k1 = list.length, lim = pre && pre[n] !== undefined ? pre[n] : Infinity;
        if (lim < Infinity) { k1 = 0; while (k1 < list.length && list[k1][0] <= lim) k1++; }
        commitList(n, f, list, 0, k1, t);
        if (k1 < list.length) D.rest = { n: n, f: f, list: list, k: k1, t: t };   // (one family has a prefix: S)
      });
      return D.fam.S.n + D.fam.B.n - n0;
    };
    // the record of what is seen (the sim calls it every 5 s with the look of the view ahead)
    D.see = function (t, look) { D.seen.push({ t: t, look: Float64Array.from(look) }); if (D.seen.length > 4000) D.seen.shift(); };
    D.isCommitted = function (n, i, j) { return D.fam[n].tab.has(key(i, j)); };
    /* (fast500 F) the director's state, out of the worker's plan and into the page's: each family's anchors as [key,
       record] in their insertion order (a Map keeps it), its counts, the camera, the clock, the log, the looks seen */
    D.exportState = function () {
      var fam = {};
      ['B', 'S', 'N'].forEach(function (n) { var f = D.fam[n]; fam[n] = { tab: Array.from(f.tab), n: f.n, nActive: f.nActive }; });
      return { fam: fam, cam: D.cam, t: D.t, log: D.log, seen: D.seen, nMean: D.nMean, land0: D.land0, landScore: D.landScore, scale: D.scale };
    };
    D.importState = function (q) {
      ['B', 'S', 'N'].forEach(function (n) { var f = D.fam[n], e = q.fam[n]; f.tab = new Map(e.tab); f.n = e.n; f.nActive = e.nActive; });
      D.cam = q.cam; D.t = q.t; D.log = q.log; D.seen = q.seen; D.nMean = q.nMean;
    };
  }
  var api = { Director: Director, phi: phi, dphi: dphi, plat: plat, Lattice: Lattice };
  if (isNode) module.exports = api; else root.CWDirector = api;
})(CWROOT);
