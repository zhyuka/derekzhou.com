// gen/noise.js: gradient noise 2D (value and analytic gradient), quintic fade (C2), 16 fixed unit gradients chosen by
// the hash (so the gradient set is finite and the bound G1 certifiable), octave sums with per-octave gains, and the
// footprint fade used by shading. One unit octave has wavelength 1 (lattice spacing 1). Values are scaled by NORM so
// a unit octave spans about [-1, 1].
(function (root) {
  'use strict';
  var Hs = (typeof module !== 'undefined' && module.exports) ? require('./hash.js') : root.CWHash;
  var hash2 = Hs.hash2;
  var GX = new Float64Array(16), GY = new Float64Array(16);
  for (var k = 0; k < 16; k++) { var a = (k + 0.5) * Math.PI / 8; GX[k] = Math.cos(a); GY[k] = Math.sin(a); }
  var NORM = 1.4142135623730951;
  // returns [v, dv/dx, dv/dy] in lattice units, written into out (length 3)
  function grad2(x, y, s, out) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var h00 = hash2(ix, iy, s) & 15, h10 = hash2(ix + 1, iy, s) & 15, h01 = hash2(ix, iy + 1, s) & 15, h11 = hash2(ix + 1, iy + 1, s) & 15;
    var n00 = GX[h00] * fx + GY[h00] * fy, n10 = GX[h10] * (fx - 1) + GY[h10] * fy;
    var n01 = GX[h01] * fx + GY[h01] * (fy - 1), n11 = GX[h11] * (fx - 1) + GY[h11] * (fy - 1);
    var ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    var dux = 30 * fx * fx * (fx * (fx - 2) + 1), duy = 30 * fy * fy * (fy * (fy - 2) + 1);
    var k0 = n00, k1 = n10 - n00, k2 = n01 - n00, k3 = n00 - n10 - n01 + n11;
    var v = k0 + k1 * ux + k2 * uy + k3 * ux * uy;
    // gradient: the corner gradients' interpolation plus the fade's derivative times the corner values
    var gx = GX[h00] + (GX[h10] - GX[h00]) * ux + (GX[h01] - GX[h00]) * uy + (GX[h00] - GX[h10] - GX[h01] + GX[h11]) * ux * uy + (k1 + k3 * uy) * dux;
    var gy = GY[h00] + (GY[h10] - GY[h00]) * ux + (GY[h01] - GY[h00]) * uy + (GY[h00] - GY[h10] - GY[h01] + GY[h11]) * ux * uy + (k2 + k3 * ux) * duy;
    out[0] = v * NORM; out[1] = gx * NORM; out[2] = gy * NORM;
    return out;
  }
  var tmp = [0, 0, 0];
  function n2(x, y, s) { return grad2(x, y, s, tmp)[0]; }
  // octave sum: longest wavelength lam (m), n octaves, gain per octave g; normalised by the sum of gains.
  // returns value (about [-1,1]) and gradient per metre into out; also its analytic slope bound per metre, given G1
  function fbm(x, y, lam, n, g, s, out) {
    var v = 0, dx = 0, dy = 0, a = 1, sa = 0, l = lam;
    for (var k = 0; k < n; k++) {
      grad2(x / l + 0.5 * k, y / l - 0.3 * k, (s + k * 1013) >>> 0, tmp);
      v += a * tmp[0]; dx += a * tmp[1] / l; dy += a * tmp[2] / l; sa += a; a *= g; l *= 0.5;
    }
    out[0] = v / sa; out[1] = dx / sa; out[2] = dy / sa;
    return out;
  }
  function fbmBound(lam, n, g, G1) { var b = 0, a = 1, sa = 0, l = lam; for (var k = 0; k < n; k++) { b += a * G1 / l; sa += a; a *= g; l *= 0.5; } return b / sa; }
  // footprint fade for an octave of frequency f (1/m) at a pixel footprint fp (m): 1 - smoothstep(0.25, 0.5, f*fp)
  function fpFade(f, fp) { var t = Math.min(1, Math.max(0, (f * fp - 0.25) / 0.25)); return 1 - t * t * (3 - 2 * t); }
  var N = { grad2: grad2, n2: n2, fbm: fbm, fbmBound: fbmBound, fpFade: fpFade, NORM: NORM, GX: GX, GY: GY };
  if (typeof module !== 'undefined' && module.exports) module.exports = N; else root.CWNoise = N;
})(CWROOT);
