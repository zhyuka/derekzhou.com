// gen/maps.js (v2): the world's maps, a pure function of position (x east, z north, game metres), the visit's seed and
// the director's committed anchors (read through `fields.P`, never a place). No function here takes a place, a kind or
// a region; no integer is computed from a map value and branched on. v2: the climate travels (fewer, longer octaves),
// the land has form (hills, ridges, terraces and mesas, dunes, valleys, lakes and rivers, outcrops), plants of several
// forms by climate. The seed alone fixes the large-scale maps (no macro offsets); the director's anchors only bias the
// place channels.
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Hs = isNode ? require('./hash.js') : root.CWHash;
  var Nz = isNode ? require('./noise.js') : root.CWNoise;
  var mix32 = Hs.mix32, fbm = Nz.fbm, grad2 = Nz.grad2;

  function logi(t) { return 1 / (1 + Math.exp(-4.394 * t)); } // 10-90 % over t in [-0.5, 0.5]
  function L(v, c, w) { return logi((v - c) / w); }              // 10-90 over w
  function sstep(a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smax(a, b, k) { var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; } // C1 smooth max
  var TAU = 2 * Math.PI;
  function terr(q) { return q - Math.sin(TAU * q) / TAU; } // a C-infinity step: flats at integers, risers between

  // monotone cubic (Fritsch-Carlson) through knots: C1
  function monoCubic(xs, ys) {
    var n = xs.length, d = [], m = [];
    for (var i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m.push(d[0]);
    for (i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]));
    m.push(d[n - 2]);
    function f(x, out) {
      if (x <= xs[0]) { out[0] = ys[0] + m[0] * (x - xs[0]); out[1] = m[0]; return out; }
      if (x >= xs[n - 1]) { out[0] = ys[n - 1] + m[n - 1] * (x - xs[n - 1]); out[1] = m[n - 1]; return out; }
      var k = 0; while (x > xs[k + 1]) k++;
      var h = xs[k + 1] - xs[k], t = (x - xs[k]) / h, t2 = t * t, t3 = t2 * t;
      out[0] = (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
      out[1] = ((6 * t2 - 6 * t) * ys[k] + (3 * t2 - 4 * t + 1) * h * m[k] + (-6 * t2 + 6 * t) * ys[k + 1] + (3 * t2 - 2 * t) * h * m[k + 1]) / h;
      return out;
    }
    // the slope's maximum, sampled densely on every segment (+2 %: the cubic's derivative is a smooth quadratic)
    var mx = 0, oo = [0, 0];
    for (i = 0; i < n - 1; i++) for (var s = 0; s <= 200; s++) { f(xs[i] + (xs[i + 1] - xs[i]) * s / 200, oo); mx = Math.max(mx, Math.abs(oo[1])); }
    f.slopeMax = mx * 1.02; f.xs = xs; f.ys = ys; f.m = m;
    return f;
  }

  function gsum(g, n) { var s = 0, a = 1; for (var k = 0; k < n; k++) { s += a; a *= g; } return s; }
  function World(seed, K, fields, inj) {   // (fast500 F: inj, a plan made in the worker: its gradient maxima, w.mg)
    seed = seed >>> 0;
    var w = this;
    w.mg = [];
    w.seed = seed; w.K = K; w.fields = fields || null;
    var S = function (k) { return mix32(seed ^ Math.imul(k, 0x9E3779B1)); };
    var sC = S(1), sT = S(2), sP = S(3), sE = S(4), sEw = S(5), sA = S(6), sW = S(7), sV = S(8), sM = S(9), sSv = S(10),
      sFl = S(11), sWind = S(12), sH = S(13), sR = S(14), sDu = S(15), sLv = S(16), sGu = S(17), sFog = S(18), sCl = S(19),
      sRg = S(20), sRv = S(21), sOc = S(22), sBn = S(23), sBw = S(24);
    w.streams = { sBn: sBn, sBw: sBw, sC: sC, sT: sT, sP: sP, sE: sE, sEw: sEw, sA: sA, sW: sW, sV: sV, sM: sM, sSv: sSv, sFl: sFl, sWind: sWind, sH: sH, sR: sR, sDu: sDu, sLv: sLv, sGu: sGu, sFog: sFog, sCl: sCl, sRg: sRg, sRv: sRv, sOc: sOc };
    var o3 = [0, 0, 0];
    var G1 = K.G1 || 2.6;
    w.G1 = G1;
    w.origin = [0, 0];
    function maxGrad(lam, n, g, s) {   // (fast500 F: each maximum kept in w.mg, in order; with inj, the worker's own)
      if (inj) { w.mg.push(inj.mg[w.mg.length]); return w.mg[w.mg.length - 1]; }
      var mx = 0, r = Hs.splitmix32(s ^ 0xA5A5);
      for (var i = 0; i < 40000; i++) { fbm(r() * 4e5, r() * 4e5, lam, n, g, s, o3); var q = Math.hypot(o3[1], o3[2]); if (q > mx) mx = q; }
      w.mg.push(mx * 1.15); return mx * 1.15;
    }
    var B = K.bounds, M = K.macro, KK = K.kit;
    // v2: the climate's amplitudes are the design's (its range over the world), its wavelengths long enough that a
    // climate step comes every 8-12 min at cruise; the bounds (1.2 K/km, 0.16 /km) are certified by gen/test/p5.js
    w.aT = M.aT; w.aP = M.aP;
    var hb = monoCubic(K.hbase.C, K.hbase.h);
    var gCmax = maxGrad(M.lamC, M.octC, M.gC, sC);
    w.aC = Math.min(1.5, 0.85 * K.bounds.hbase / (hb.slopeMax * gCmax)); // |grad hbase| <= 85 % of its bound
    var gH = maxGrad(100000, 2, 0.5, sH);
    w.aH = 0.9 * B.sun_deg_per_km / 1000 / gH; // the hour map uses 90 % of its slope bound: the sun travels
    w.HA0 = ((K.landing_hour && K.landing_hour[String(seed)]) || 17.5) * 15 - 180;

    // ---- the macro channels: the seed's alone (no director offsets)
    w.macro = function (x, z, o) {
      fbm(x, z, M.lamC, M.octC, M.gC, sC, o3); o.C = clamp(w.aC * o3[0], -1.2, 1.25);
      fbm(x, z, M.lamT, M.octT, M.gT, sT, o3); o.T = M.T0 + w.aT * o3[0];
      fbm(x, z, M.lamP, M.octP, M.gP, sP, o3); o.lnP = M.lnP0 + w.aP * o3[0];
      fbm(x, z, 100000, 2, 0.5, sH, o3); o.HA = w.HA0 + w.aH * o3[0];
      // rock provinces (geology is crisp: logistic edges about 150 m after the warp)
      fbm(x, z, 1500, 2, 0.5, sA ^ 77, o3); var wx = 600 * o3[0];
      fbm(x + wx, z - wx, 12000, 3, 0.55, sA, o3); o.Ar = 0.07 + 0.36 * L(o3[0], 0.0, 0.08); o.ArN = o3[0];   // (world6: the rock province's raw noise, for the sand's smooth supply)
      fbm(x - wx, z + wx, 12000, 3, 0.55, sW, o3); o.Wr = L(o3[0], -0.05, 0.10);
      fbm(x + wx, z + wx, 20000, 3, 0.55, sV, o3); o.V = L(o3[0], 0.48, 0.06);
      fbm(x, z, 80000, 2, 0.5, sWind, o3); o.wind = 0.6 + 1.6 * o3[0]; // radians from north: blowing toward
      // (world6) the basin channel: the low ground the cloud sea fills, at the place's scale (warped: organic shores)
      fbm(x, z, KK.lamBw, 2, 0.5, sBw, o3); var bw = KK.aBw * o3[0];
      fbm(x + bw, z - 0.7 * bw, KK.lamB, KK.octB, 0.5, sBn, o3); o.Bn = o3[0];
      return o;
    };
    // ---- what the LIGHT reads: the climate's first octave only (90 and 80 km) and the hour. The sky, the sun, the haze,
    // the cloud cover and type and the exposure read this and nothing else (spec 3.8; v2's light rate limit, test L1)
    w.lightIn = function (x, z, o) {
      fbm(x, z, M.lamT, 1, M.gT, sT, o3); o.T = M.T0 + w.aT * o3[0] / gsum(M.gT, M.octT);
      fbm(x, z, M.lamP, 1, M.gP, sP, o3); o.lnP = M.lnP0 + w.aP * o3[0] / gsum(M.gP, M.octP);
      fbm(x, z, 100000, 2, 0.5, sH, o3); o.HA = w.HA0 + w.aH * o3[0];
      return o;
    };

    // ---- the place channels: continuous base maps plus the director's additive anchors (spec 3.3; v2: no cells)
    var po = new Float64Array(8);
    var hbo0 = [0, 0];
    w.place = function (x, z, o, mcIn) {
      if (w.fields && w.fields.P) w.fields.P(x, z, po); else po.fill(0);
      fbm(x, z, 900, 2, 0.5, sEw, o3); var ww = 500 * o3[0];
      fbm(x + ww, z + 0.7 * ww, 3000, 4, 0.80, sE, o3);
      var Eb = sstep(-0.55, 0.55, o3[0]);
      // uplands are rougher (relief follows height: Earth's slope vs height)
      var C = mcIn ? mcIn.C : (fbm(x, z, M.lamC, M.octC, M.gC, sC, o3), clamp(w.aC * o3[0], -1.2, 1.25));
      hb(C, hbo0);
      Eb = clamp(Eb * (0.75 + 0.25 * sstep(60, 500, hbo0[0])) + 0.35 * sstep(80, 700, hbo0[0]), 0, 1);
      o.Eb = Eb; o.E = clamp(Eb + po[0], 0, 1);
      o.rk = po[1];
      fbm(x, z, 1500, 3, 0.6, sM, o3); o.mb = 0.25 * o3[0]; o.m = o.mb + po[2];
      fbm(x, z, 2000, 3, 0.6, sSv, o3); o.Svb = sstep(-0.6, 0.6, o3[0]); o.Sv = clamp(o.Svb + po[3], 0, 1);
      fbm(x, z, 1000, 3, 0.6, sFl, o3); o.Flb = sstep(-0.3, 0.7, o3[0]); o.Fl = clamp(o.Flb + po[4], 0, 1);
      o.kd = po[5]; o.kx = po[6]; o.Fc = po[7];
      return o;
    };

    // ---- height (spec 3.4, v2)
    var RL = K.relief.lam, RG = K.relief.gain, NOCT = RL.length, NSM = K.relief.smooth_oct;
    var ga = [1]; for (var k = 1; k < NOCT; k++) ga.push(ga[k - 1] * RG[k]);
    var gs = 0; for (k = 0; k < NOCT; k++) gs += ga[k];
    for (k = 0; k < NOCT; k++) ga[k] /= gs;
    w.reliefAmp = ga;
    var dropped = 0; for (k = NSM; k < NOCT; k++) dropped += ga[k];
    w.dropped = dropped;
    var EA = K.Eamp;
    function Eamp(E) { return Math.exp(EA[0] + EA[1] * E + EA[2] * E * E) * 0.5; } // half the z range
    w.Eamp = Eamp;
    // the relief amplitude: the place's roughness, larger on uplands and mountains
    function ampOf(E, hbv) { return Eamp(E) * (1 + 0.8 * sstep(100, 900, hbv)); }
    w.ampOf = ampOf;
    var hbo = [0, 0];
    // R: eroded fractal noise; out: [R full, dR/dx, dR/dz, R of the first NSM octaves]
    function relief(x, z, A, nmax, fp, out) {
      var v = 0, dx = 0, dy = 0, vs = 0;
      for (var k = 0; k < nmax; k++) {
        var l = RL[k];
        var f = fp > 0 ? Nz.fpFade(1 / l, fp) : 1;
        if (f <= 0) break;
        grad2(x / l + 0.37 * k, z / l - 0.21 * k, (sR + k * 1013) >>> 0, o3);
        var s2 = (dx * dx + dy * dy) * A * A;
        var damp = 1 / (1 + K.relief.erode * s2);
        var a = ga[k] * damp * f;
        v += a * o3[0]; dx += a * o3[1] / l; dy += a * o3[2] / l;
        if (k === NSM - 1) vs = v;
      }
      if (nmax < NSM) vs = v;
      out[0] = v; out[1] = dx; out[2] = dy; out[3] = vs; return out;
    }
    w.relief = relief;
    var mc = {}, pc = {}, r4 = [0, 0, 0, 0];
    // the slow weights, a function of the macro and place channels only (the GPU bakes them)
    w.weights = function (mc, pc, o) {
      hb(mc.C, hbo);
      var hbv = hbo[0], A = ampOf(pc.E, hbv);
      var lnPd = mc.lnP + Math.log(1 + K.oro_per_m * Math.max(hbv, 0)) + pc.m;
      var Tl0 = mc.T + K.lapse_K_per_m * hbv;
      var veg0 = L(lnPd, K.cover.veg_lnP50 + 0.02 * (Tl0 - 10), K.cover.veg_w * 4.394);
      var sand = L(mc.Ar + pc.rk, 0.20, 0.08) * (1 - mc.V) * (0.5 + 0.5 * mc.Wr);
      var Kd = clamp((1 - veg0) * sand * L(-lnPd, -K.cover.dry_dune_lnP, 0.3) * (0.4 + 0.6 * L(Tl0, 12, 10)) + pc.kd, 0, 1);
      var dry = 1 - L(lnPd, Math.log(320), 0.5);
      // terraces and mesas: dry, layered rock (not sand seas, not lava), where it is rough enough to stand in tiers
      var Km = dry * L(mc.Ar + pc.rk, 0.16, 0.12) * (1 - mc.V) * (1 - 0.8 * Kd) * sstep(0.22, 0.55, pc.E);
      // ridges: rough, rocky or cold uplands
      var kr = sstep(0.45, 0.9, pc.E) * (0.5 + 0.5 * sstep(150, 700, hbv));
      // valleys (fluvial): wet enough to carve, not in sand seas
      var Kv = L(lnPd, Math.log(420), 0.6) * (1 - Kd) * (1 - 0.6 * Km);
      // lakes: the share of the land under the lake level rises with wetness and lowness
      var thrL = -1.35 + 0.9 * sstep(6.0, 7.3, lnPd) * (1 - sstep(150, 600, hbv)) + 0.15 * (pc.m / 0.4);
      var Kl = clamp(mc.V + pc.kx * 0.5, 0, 1);
      var step = K.terrace.step_min + (K.terrace.step_max - K.terrace.step_min) * sstep(0.3, 0.9, pc.E);
      o.hb = hbv; o.A = A; o.Kd = Kd; o.Km = Km; o.kr = kr; o.Kv = Kv; o.thrL = thrL; o.Kl = Kl; o.step = step; o.lnPd = lnPd; o.Tl0 = Tl0; o.sand = sand; o.dry = dry;
      return o;
    };
    var wt = {};
    w.duneK = function (mc, pc) { return w.weights(mc, pc, wt).Kd; };
    // ---- (world6) the two kits' weights, smooth functions of the maps (logistic shaping curves; no switch, no integer
    // from a map value): wD, the sand province (dry, hot, sandy, plus the director's dune offset kd); wC, the cloud sea
    // (the land falls away under a sea of cloud: the basin channel's low ground, plus the director's kx, filled the
    // more readily the wetter the climate). Both read only the macro and place channels (the director composes them)
    w.kit = function (mc, pc, o) {
      var lnPd = mc.lnP + pc.m;
      var Bq = mc.Bn + KK.kxB * pc.kx;
      var thC = KK.thC + KK.thCw * (lnPd - KK.lnPmid);
      var wC = L(thC - Bq, 0, KK.wB);
      var sandy = L(mc.ArN + KK.rkS * pc.rk, KK.ar0, KK.arW);
      var Ds = L(KK.dryP - lnPd, 0, KK.dryW) * L(mc.T, KK.T0, KK.TW) * (0.35 + 0.65 * sandy);
      o.wC = wC; o.wD = clamp(Ds + pc.kd, 0, 1); o.Bq = Bq; o.thC = thC;
      return o;
    };
    // the ridged term (C1: |n| as sqrt(n^2 + e^2)), in [-1, 0.9]
    function ridged(X, Z) { fbm(X, Z, K.ridge.lam, 2, 0.5, sRg, o3); return 1 - 2 * Math.sqrt(o3[0] * o3[0] + 0.0025); }
    // the valley field: a warped noise whose zero line is the valley's axis; returns [profile 0..1, river core 0..1]
    var vo = [0, 0];
    function valley(X, Z, out) {
      fbm(X, Z, 1100, 2, 0.5, sRv ^ 31, o3); var wv = 260 * o3[0];
      fbm(X + wv, Z - 0.8 * wv, K.valley.lam, 2, 0.5, sRv, o3);
      var q = o3[0] / K.valley.w;
      out[0] = Math.exp(-q * q); out[1] = Math.exp(-q * q * 9);
      return out;
    }
    // the full height and its parts; fp: pixel footprint (m) for band-limiting (0: all octaves)
    w.height = function (x, z, fp, o) {
      w.macro(x, z, mc); w.place(x, z, pc, mc);
      var W = w.weights(mc, pc, wt);
      var A = W.A;
      relief(x, z, A, NOCT, fp || 0, r4);
      var R = r4[0], Rs = r4[3];
      // ridges blended in where rough
      var rg = ridged(x, z);
      R = R + W.kr * K.ridge.w * (rg - 0.3 * R); Rs = Rs + W.kr * K.ridge.w * (rg - 0.3 * Rs);
      // glacial: valley floors widened into a U where it is cold
      var Kg = L(-W.Tl0, -1.0, 2.0);
      var floorv = -0.25, kk = 0.15;
      var hm = 0.5 * (R + floorv) - Math.sqrt(0.25 * (R - floorv) * (R - floorv) + kk * kk);
      R = R + Kg * 0.8 * (Math.max(hm, R - 0.6) - R);
      var y = A * R;
      // terraces and mesas: a C-infinity staircase twice over (flats and cliffs), blended in by Km
      var q = y / W.step, q2 = terr(terr(q));
      y = y + W.Km * (W.step * q2 - y);
      var h = W.hb + y;
      // dunes: transverse crests across the wind, asymmetric, broken where supply is low
      var wa = mc.wind, cx = Math.sin(wa), cz = Math.cos(wa);
      fbm(x, z, 300, 2, 0.5, sDu, o3); var dw = o3[0];
      fbm(x, z, 4000, 2, 0.5, sDu ^ 9, o3); var dl = K.dune.lam_min + (K.dune.lam_max - K.dune.lam_min) * sstep(-0.5, 0.5, o3[0]);
      var u = (x * cx + z * cz) / dl + 0.6 * dw;
      var ph = TAU * u;
      var prof = 0.5 + 0.5 * Math.sin(ph + K.dune.asym * Math.sin(ph));
      fbm(x, z, 160, 2, 0.5, sDu ^ 3, o3); var br = sstep(-0.35 + 0.6 * W.sand, 0.35 + 0.6 * W.sand, o3[0] + 0.3);
      var Hd = K.dune.h_min + (K.dune.h_max - K.dune.h_min) * sstep(-0.4, 0.6, dw * 0.5 + 0.2);
      var D = W.Kd * Hd * prof * (0.35 + 0.65 * br);
      // lava fronts
      fbm(x, z, 250, 2, 0.5, sLv ^ 5, o3); var lw = 90 * o3[0];
      fbm(x + lw, z - lw, K.lava.lam, 3, 0.55, sLv, o3);
      var Lv = W.Kl * K.lava.h * L(o3[0], 0.05, 0.12);
      // valleys: carved where wet, deepest where the land is rough (C-infinity profile)
      valley(x, z, vo);
      var Dv = W.Kv * (4 + Math.min(0.9 * A, K.valley.depth_max));
      var Va = -Dv * vo[0];
      // outcrops (tors) where the rock shows and the land is rough: ridged bumps of 20-60 m
      fbm(x, z, 140, 2, 0.5, sOc, o3); var on = o3[0];
      var Ko = (1 - L(W.lnPd, Math.log(500), 0.8)) * sstep(0.35, 0.8, pc.E) * (1 - W.Kd);
      var Oc = Ko * 9 * Math.pow(sstep(0.25, 0.75, on), 2);
      // gullies (fluvial, small) where wet
      var Kf = L(W.lnPd, Math.log(300), 0.4) * sstep(0.05, 0.5, pc.E);
      fbm(x, z, K.gully.lam, 2, 0.5, sGu, o3);
      var an = Math.sqrt(o3[0] * o3[0] + 0.01);
      var Gu = -Kf * K.gully.h * Math.pow(Math.max(0, 1 - an), 3);
      h += D + Lv + Va + Oc + Gu;
      if (o) {
        o.h = h; o.hb = W.hb; o.A = A; o.R = R; o.Rs = Rs; o.D = D; o.Kd = W.Kd; o.Lv = Lv; o.Kl = W.Kl; o.Kg = Kg; o.Gu = Gu; o.Kf = Kf; o.sand = W.sand;
        o.Km = W.Km; o.kr = W.kr; o.Kv = W.Kv; o.lnPd = W.lnPd; o.Va = Va; o.Oc = Oc; o.valley = vo[0]; o.river = vo[1]; o.thrL = W.thrL; o.Dv = Dv;
        o.mc = mc; o.pc = pc;
      }
      return h;
    };
    // the water level (smooth; far under the land where there is none): lakes in the low ground where wet, rivers in
    // the valley floors. The surface drawn is smax(h, water) (C1)
    var ho = {};
    w.water = function (x, z, hparts) {
      var P = hparts || (w.height(x, z, 0, ho), ho);
      // (where it is dry there are no lakes: the level sinks far under the land; no lakes on a desert's terraces)
      var lake = P.hb + P.A * P.thrL - 60 * (1 - sstep(5.5, 6.1, P.lnPd));
      // the river: the valley's smooth floor plus a metre, only in the channel's core and where valleys are carved
      var floor = P.hb + P.A * P.Rs - P.Dv + 1.0;
      var riv = floor - 60 * (1 - P.river) - 60 * (1 - sstep(0.15, 0.5, P.Kv));
      return smax(lake, riv, 2.0);
    };
    // the smooth height and the envelope h_env = h_smooth + rho (spec 3.4): rho bounds everything dropped
    w.env = function (x, z, o) {
      w.macro(x, z, mc); w.place(x, z, pc, mc);
      var W = w.weights(mc, pc, wt);
      var A = W.A;
      relief(x, z, A, NSM, 0, r4);
      var rg = ridged(x, z);
      var Rs = r4[0] + W.kr * K.ridge.w * (rg - 0.3 * r4[0]);
      var hs = W.hb + A * Rs;
      // rho: the dropped octaves (|n| <= 1 each; the ridge's own share of them), the terrace's deviation (<= 0.32 step),
      // the dunes, lava, outcrops, gullies (only lower) and valleys (only lower), the canopy
      var lnPd = W.lnPd;
      var canB = sstep(K.cover.tree_lnP50 - 0.85, K.cover.tree_lnP50 - 0.10, lnPd + 0.15);
      var canB2 = sstep(5.267, 5.617, lnPd);
      var rho = A * dropped * (1 + 0.3 * W.kr * K.ridge.w) + W.Km * (0.32 * W.step + A * 0.05) + W.Kd * K.dune.h_max + W.Kl * K.lava.h + 9
        + K.trees.h_max * (0.45 * canB + 0.55 * canB2) * 0.8 + 1.0;
      // the glacial U only lowers; the terrace may raise a point by its deviation (counted above)
      if (o) { o.hs = hs; o.rho = rho; o.env = hs + rho; }
      return hs + rho;
    };
    // the fog sea's top (cloud sea in basins): the inversion level plus 2-8 m domes; far under the land where none
    w.fogTop = function (x, z) {
      w.macro(x, z, mc);
      var basin = L(-mc.C, 0.30, 0.12);
      fbm(x, z, 40000, 2, 0.5, sFog, o3);
      var inv = -20 + 30 * o3[0];
      fbm(x, z, 140, 2, 0.5, sFog ^ 7, o3);
      var top = inv + 5 + 3 * o3[0];
      return top - (1 - basin) * 300;
    };

    // ---- local climate and cover (spec 3.5, v2: thresholds shift with heat; plant forms by climate)
    w.cover = function (x, z, h, gx, gz, o) {
      w.macro(x, z, mc); w.place(x, z, pc, mc);
      return w.coverWith(mc, pc, h, gx, gz, o);
    };
    w.coverWith = function (mc, pc, h, gx, gz, o) {
      var slope = Math.hypot(gx, gz);
      var sunAz = w.sunAz(mc.HA);
      var asp = -(gx * Math.sin(sunAz) + gz * Math.cos(sunAz)) / Math.max(1e-3, Math.hypot(1, slope));
      var Tl = mc.T + K.lapse_K_per_m * h + 1.5 * asp;
      var wx = Math.sin(mc.wind), wz = Math.cos(mc.wind);
      var windward = clamp(-(gx * wx + gz * wz), -0.5, 0.5);
      var lnPl = mc.lnP + Math.log(1 + K.oro_per_m * Math.max(h, 0)) + 0.15 * windward + pc.m;
      var P = Math.exp(lnPl);
      var snow = logi(-Tl / 0.6) * Math.min(1, P / 150);
      // heat raises the water plants need (evaporation): the curves' centres move with T
      var veg = L(lnPl, K.cover.veg_lnP50 + 0.02 * (Tl - 10), K.cover.veg_w * 4.394) * (1 - snow) * logi((Tl + 4) / 1.5);
      var tP = K.cover.tree_lnP50 + 0.025 * (Tl - 2);
      var closed = K.cover.tree_plateau * L(lnPl, tP, 0.16) * logi((Tl - 2) / 1.0) * (0.6 + 0.4 * sstep(0.08, 0.30, slope)) * pc.Sv;
      var open = 0.2 * L(lnPl, Math.log(260), 0.45) * L(Tl, 17, 6) * (0.5 + 0.5 * pc.Sv); // savanna: scattered trees
      var tree = closed + open * (1 - closed);
      var moss = L(lnPl, 6.2, 0.6) * L(-Tl, -8, 6) * (0.3 + 0.7 * mc.V) + 0.02;
      var shrub = (1 - L(lnPl, 5.65 + 0.02 * (Tl - 10), 0.5)) * (0.35 + sstep(0.05, 0.25, slope)) * (1 - 0.5 * pc.Sv) + 0.05;
      var grass = 1.0;
      var sw = moss + shrub + grass;
      var rest = veg * (1 - tree);
      o.snow = snow; o.tree = veg * tree; o.moss = rest * moss / sw; o.shrub = rest * shrub / sw; o.grass = rest * grass / sw;
      o.bloom = o.grass * 0.3 * pc.Fl * L(Tl, 4, 8);
      var bare = Math.max(0, 1 - snow - veg);
      var sandS = L(mc.Ar + pc.rk, 0.20, 0.08) * (1 - mc.V);
      var talus = sstep(0.55, 0.75, slope) * (0.5 + 0.5 * clamp(pc.kx + 0.5, 0, 1));
      o.sand = bare * sandS * (1 - talus); o.rock = bare - o.sand;
      o.dry = 1 - L(lnPl, 5.55 + 0.02 * (Tl - 10), 0.35);
      // plant forms (continuous weights; a site's form is its own pick against them): conifer where cold, umbrella
      // crowns (acacia, palm) where hot, broadleaf between
      var wCon = L(-Tl, -7, 7) * (0.7 + 0.3 * sstep(0.1, 0.4, slope));
      var wUmb = L(Tl, 20, 5) * (1 - wCon);
      o.wCon = wCon; o.wUmb = wUmb; o.wBro = Math.max(0, 1 - wCon - wUmb);
      o.Tl = Tl; o.lnPl = lnPl; o.slope = slope; o.Ar = mc.Ar + pc.rk; o.Wr = mc.Wr; o.V = mc.V;
      return o;
    };

    // ---- the sun from the hour map (lat 40, declination 10)
    var lat = K.sky.lat * Math.PI / 180, dec = K.sky.decl * Math.PI / 180;
    w.sunEl = function (HA) { var h = HA * Math.PI / 180; return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h)); };
    w.sunAz = function (HA) {
      var h = HA * Math.PI / 180;
      var az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
      return az + Math.PI;
    };
    w.sunDir = function (HA, out) { var e = w.sunEl(HA), a = w.sunAz(HA); out[0] = Math.cos(e) * Math.sin(a); out[1] = Math.sin(e); out[2] = Math.cos(e) * Math.cos(a); return out; };

    w.bounds = {
      T: w.aT * maxGrad(M.lamT, M.octT, M.gT, sT), lnP: w.aP * maxGrad(M.lamP, M.octP, M.gP, sP),
      hbase: hb.slopeMax * w.aC * gCmax, sunDegPerM: w.aH * gH,
      T_analytic: w.aT * Nz.fbmBound(M.lamT, M.octT, M.gT, G1), lnP_analytic: w.aP * Nz.fbmBound(M.lamP, M.octP, M.gP, G1)
    };
    w.hbFn = hb;
  }

