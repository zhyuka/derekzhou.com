  /* ---------------------------------------------------------------- streams */
  function mix32(a) { a = (a + 0x9e3779b9) | 0; var t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); return (t ^ (t >>> 15)) >>> 0; }
  function splitmix32(seed) {
    var s = seed | 0;
    return function () { s = (s + 0x9e3779b9) | 0; var t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); return ((t ^ (t >>> 15)) >>> 0) / 4294967296; };
  }
  function subseed(seed, salt) { return mix32((seed ^ mix32(salt * 0x632be5ab + 0x1b873593)) | 0); }
  function RNG(seed) {   // a stream with helpers (handed to the realms)
    var f = splitmix32(seed);
    return {
      f: f,
      r: function (a, b) { return a + (b - a) * f(); },
      i: function (n) { return Math.floor(f() * n); },
      pick: function (a) { return a[Math.floor(f() * a.length)]; },
      n: function () { var u = Math.max(f(), 1e-9), v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); },
      sign: function () { return f() < 0.5 ? -1 : 1; },
      seed: function () { return (f() * 4294967296) >>> 0; }
    };
  }
  /* integer hashes, the same in JS and GLSL bit for bit (the layout of a realm's areas is read on both sides: the
     shaders raise the land from it, the cells place things by it) */
  function ihash(x) { x = x >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16; return x >>> 0; }
  function ihash2(ix, iz) { return ihash((Math.imul(ix >>> 0, 0x8da6b343) ^ ihash(((iz >>> 0) + 0x68e31da4) >>> 0)) >>> 0); }
  function cellHash(ix, iz, salt) { return ihash((ihash2(ix, iz) ^ salt) >>> 0); }
  function hfl(h) { return (h >>> 8) / 16777216; }   // [0, 1) from a hash, as GLSL's hf()
  function hk(h, k) { return ihash((h + k) >>> 0); }  // the k-th hash after h, as GLSL's ih(h + k)

