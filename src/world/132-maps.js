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

    var EA = K.Eamp;
    function Eamp(E) { return Math.exp(EA[0] + EA[1] * E + EA[2] * E * E) * 0.5; } // half the z range
    w.Eamp = Eamp;
    // the relief amplitude: the place's roughness, larger on uplands and mountains
    function ampOf(E, hbv) { return Eamp(E) * (1 + 0.8 * sstep(100, 900, hbv)); }
    w.ampOf = ampOf;
    var hbo = [0, 0];
    var mc = {}, pc = {};
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
