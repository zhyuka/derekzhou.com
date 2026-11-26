  /* ---- the browser's bars (theme-color): the drawn sky's colour on the window's top-centre ray, worked out on the CPU
     from the blended light as skyGrad and skyCol draw it (words-free), written into the page's own meta (an attribute:
     no DOM built) when it moves by 2 codes or more, at most twice a second of the flight's clock; at the first paint the
     hour's script's colour stands; when the canvas hides, the still sky's top (markStill) */
  var THEME = { t: -1e9, rgb: [-9, -9, -9], meta: null, n: 0, hex: '', f: [0, 0, 0], c: [0, 0, 0], h: [0, 0, 0], v: [0, 0, 0], cs: 0, cn: 0 }, LUMA3 = [0.2126, 0.7152, 0.0722];
  function skyGmix(o, s, j, t) { for (var i = 0; i < 3; i++) o[i] += (s[j * 3 + i] - o[i]) * t; }
  function skyGradCPU(L, e, o) {
    var s = L.skyFlat, E = L.skyE, i;
    for (i = 0; i < 3; i++) o[i] = s[3 + i];
    if (e < 0) { skyGmix(o, s, 0, smooth(0, 14, -e)); return o; }
    skyGmix(o, s, 2, smooth(0, E[0], e)); skyGmix(o, s, 3, smooth(E[0], E[1], e)); skyGmix(o, s, 4, smooth(E[1], E[2], e)); skyGmix(o, s, 5, smooth(E[2], E[3], e));
    return o;
  }
  /* skyCol on the CPU (lib-air.glsl): the gradient, the sun's side, the glow; THEME.cs and .cn its cosines to the sun and the night's key */
  function skyColCPU(L, d0, d1, d2, c) {
    var e = Math.asin(clamp(d1, -1, 1)) / DEG, S = L.skyS || L.sunDir, sn = SUNU.on && L === SUNU.L, K = sn ? SUNU.k0 : L.skyK;   // (the sun's change as the shaders draw it, the same arithmetic)
    skyGradCPU(L, e, c);
    var hl = Math.sqrt(d0 * d0 + d2 * d2) || 1, sl = Math.sqrt(S[0] * S[0] + S[2] * S[2]) || 1, side = 0.5 + 0.5 * (d0 * S[0] + d2 * S[2]) / (hl * sl), low = Math.exp(-Math.max(e, 0) / K[1]), j;
    for (j = 0; j < 3; j++) { c[j] += (L.skyW[j] - c[j]) * K[0] * side * side * low; c[j] *= 1 - K[2] * (1 - side) * low; }
    if (sn) skyThemeWarm(c, e, side);
    var cs = Math.max(d0 * S[0] + d1 * S[1] + d2 * S[2], 0), g = L.glow[0] * Math.pow(cs, L.glow[1]) + L.glow[2] * Math.pow(cs, L.glow[3]), gC = sn ? SUNU.glowS : L.glowC, cn = 0;
    for (j = 0; j < 3; j++) c[j] += gC[j] * g;
    if (sn) { cn = Math.max(d0 * SUNU.n[0] + d1 * SUNU.n[1] + d2 * SUNU.n[2], 0); var gn = L.glow[0] * Math.pow(cn, L.glow[1]) + L.glow[2] * Math.pow(cn, L.glow[3]); for (j = 0; j < 3; j++) c[j] += SUNU.glowN[j] * gn; }
    THEME.cs = cs; THEME.cn = cn; return c;
  }
  function skyTheme(force) {
    var V = SIM.V; if (!V || !V.L) return;
    var cf = CAM.f[0] * THEME.f[0] + CAM.f[1] * THEME.f[1] + CAM.f[2] * THEME.f[2];
    if (!force && SIM.t - THEME.t < 0.5 && THEME.n && cf > 0.9994) return;   // (at most twice a second of the flight's clock, or the view turned 2 deg)
    THEME.t = SIM.t; THEME.f[0] = CAM.f[0]; THEME.f[1] = CAM.f[1]; THEME.f[2] = CAM.f[2];
    if (THEME.meta === null) THEME.meta = document.querySelector('meta[name="theme-color"]') || false;
    if (!THEME.meta) return;
    var L = V.L, ty = FR.tanY, d0 = CAM.f[0] + CAM.u[0] * ty, d1 = CAM.f[1] + CAM.u[1] * ty, d2 = CAM.f[2] + CAM.u[2] * ty, n = Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2) || 1;
    d0 /= n; d1 /= n; d2 /= n;
    var S = L.skyS || L.sunDir, sn = SUNU.on && L === SUNU.L, c = skyColCPU(L, d0, d1, d2, THEME.c), cs = THEME.cs, cn = THEME.cn, j;
    // the ground haze over the sky (hazeSky, hazeCol: the sky's own light toward the horizon, fogCol) and the high veil's even paleness (veilMean), as SKY_BODY lays them
    var H = L.haze, hs = H[0] > 0 ? 1 - Math.exp(-H[0] * Math.exp(-H[2] / H[1]) * H[1] / Math.max(d1, 2e-3)) : 0;
    if (hs > 0) { var F = L.fog2, fy = Math.max(d1, 0) * F[0] + F[1], fl = Math.sqrt(d0 * d0 + fy * fy + d2 * d2) || 1, f = skyColCPU(L, d0 / fl, fy / fl, d2 / fl, THEME.h); for (j = 0; j < 3; j++) c[j] += (f[j] - c[j]) * hs; }
    if (L.hi[0] > 0 && d1 > 0.01) { var vm = smooth(0.55 - L.hi[0], 0.95 - L.hi[0], 0.692) * L.hi[1] * smooth(0.01, 0.12, d1) * smooth(0, 0.05, L.hi[0]), fs = sn ? 1 + 1.5 * (Math.pow(Math.max(cs, 0), 6) * SUNU.band + Math.pow(cn, 6) * SUNU.QN) : 1 + 1.5 * Math.pow(Math.max(cs, 0), 6); for (j = 0; j < 3; j++) c[j] += (L.hiC[j] * fs - c[j]) * vm; }
    var y0 = 0, rgb = THEME.v, hx = '#';
    for (j = 0; j < 3; j++) { c[j] *= L.exposure; y0 += c[j] * LUMA3[j]; }
    for (j = 0; j < 3; j++) rgb[j] = Math.round(clamp(agL2s(Math.max(y0 + (c[j] - y0) * L.sat, 0)), 0, 1) * 255);
    if (Math.max(Math.abs(rgb[0] - THEME.rgb[0]), Math.abs(rgb[1] - THEME.rgb[1]), Math.abs(rgb[2] - THEME.rgb[2])) < 2) return;
    for (j = 0; j < 3; j++) { THEME.rgb[j] = rgb[j]; hx += (rgb[j] < 16 ? '0' : '') + rgb[j].toString(16); }
    THEME.hex = hx; THEME.n++;
    THEME.meta.setAttribute('content', hx);
  }
  function skyThemeStill(group) { if (THEME.meta === null) THEME.meta = document.querySelector('meta[name="theme-color"]') || false; if (THEME.meta && SKYTOP[group]) { THEME.meta.setAttribute('content', stillTop(group)); THEME.rgb[0] = THEME.rgb[1] = THEME.rgb[2] = -9; THEME.hex = stillTop(group); } }

