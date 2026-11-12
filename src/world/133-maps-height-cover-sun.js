    // (132's World, continued: the height and its parts, the water, the envelope, the fog sea's top, cover, the sun)
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

