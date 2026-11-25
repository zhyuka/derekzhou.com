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
