  /* ---------------- the weather (=rand()): the engine's streams, never any other ---------------- */

  function sm32(a) {
    return function () {
      a = (a + 0x9e3779b9) | 0;
      var t = a ^ (a >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  }
  var visitSeed = 0;
  /* the visit's streams, by number (1 the noise table; 8000+ clicks, 8800 the population): each from the visit's one seed */
  function vstream(n) { return sm32((visitSeed ^ Math.imul(n + 1, 0x9E3779B9)) >>> 0); }
  var NOISE_N = 4096;
  var noise = new Float32Array(NOISE_N);
  /* the visit's seed, and its noise table */
  function weather() {
    visitSeed = Math.floor(HOST.rng(0xB1D5)() * 4294967296) >>> 0;
    var r = vstream(1), i; for (i = 0; i < NOISE_N; i++) noise[i] = r() * 2 - 1;
  }
  function nz(i) { return noise[(i | 0) & (NOISE_N - 1)]; }
  /* a slow wave in [-1, 1]: two sines, the second 0.618 as fast, their phases from the table (never a jolt) */
  function wave(key, x) { return 0.6 * Math.sin(TAU * x + Math.PI * nz(key)) + 0.4 * Math.sin(TAU * 0.618 * x + Math.PI * nz(key + 1)); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function mix(r, lo, hi) { return lo + (hi - lo) * r; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function pick(r, a) { return mix(r(), a[0], a[1]); }
  function weighted(r, list) {
    var tot = 0, i, u;
    for (i = 0; i < list.length; i++) tot += list[i][1];
    u = r() * tot;
    for (i = 0; i < list.length; i++) { u -= list[i][1]; if (u < 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / TAU) * TAU; return d; }

