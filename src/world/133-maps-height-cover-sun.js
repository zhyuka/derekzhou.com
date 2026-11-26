    // (132's World, continued: the fog sea's top, cover, the sun)
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

    // ---- the sun's azimuth from the hour map (lat 40, declination 10): the cover's aspect (coverWith)
    var lat = K.sky.lat * Math.PI / 180, dec = K.sky.decl * Math.PI / 180;
    w.sunAz = function (HA) {
      var h = HA * Math.PI / 180;
      var az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
      return az + Math.PI;
    };

    w.bounds = {
      T: w.aT * maxGrad(M.lamT, M.octT, M.gT, sT), lnP: w.aP * maxGrad(M.lamP, M.octP, M.gP, sP),
      hbase: hb.slopeMax * w.aC * gCmax, sunDegPerM: w.aH * gH,
      T_analytic: w.aT * Nz.fbmBound(M.lamT, M.octT, M.gT, G1), lnP_analytic: w.aP * Nz.fbmBound(M.lamP, M.octP, M.gP, G1)
    };
    w.hbFn = hb;
  }

