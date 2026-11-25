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
