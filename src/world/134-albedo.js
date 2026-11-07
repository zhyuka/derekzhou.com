  // ---- albedo per cover (linear RGB), from OKLab (L, C, hue) at the x2.5 reflectance scale (spec 2.3 / 3.6); v2 hues
  // and chroma toward the reference's colour script (teal greens, warm sand)
  function oklabToLin(Lk, a, b) {
    var l_ = Lk + 0.3963377774 * a + 0.2158037573 * b, m_ = Lk - 0.1055613458 * a - 0.0638541728 * b, s_ = Lk - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function linToOklab(r, g, b) {
    var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function alb(Lk, C, hdeg) { var h = hdeg * Math.PI / 180, c = oklabToLin(Lk, C * Math.cos(h), C * Math.sin(h)); return [Math.max(0, c[0]) / 2.5, Math.max(0, c[1]) / 2.5, Math.max(0, c[2]) / 2.5]; }
  var ALB = {
    sand: alb(0.83, 0.075, 68), steppe: alb(0.74, 0.060, 82), grass: alb(0.60, 0.075, 140), shrub: alb(0.55, 0.050, 118),
    conifer: alb(0.50, 0.050, 165), broad: alb(0.60, 0.075, 138), moss: alb(0.62, 0.065, 120), snow: [0.86, 0.87, 0.90],
    litter: alb(0.50, 0.035, 70), bloomW: alb(0.95, 0.02, 90), bloomY: alb(0.90, 0.15, 95), bloomP: alb(0.82, 0.11, 350), bloomV: alb(0.72, 0.13, 300),
    acacia: alb(0.60, 0.065, 118), water: alb(0.35, 0.04, 210)
  };
  function rockAlb(A, Wr) { var Lk = Math.cbrt(Math.max(A, 0.03) * 2.5), C = 0.02 + 0.10 * Wr, h = 38 + 37 * (1 - Wr); return alb(Lk, C, h); }

  var api = { World: World, logi: logi, L: L, sstep: sstep, clamp: clamp, smax: smax, terr: terr, oklabToLin: oklabToLin, linToOklab: linToOklab, alb: alb, ALB: ALB, rockAlb: rockAlb, monoCubic: monoCubic };
  if (isNode) module.exports = api; else root.CWMaps = api;
})(CWROOT);
