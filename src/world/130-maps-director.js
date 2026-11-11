  /* ---------------------------------------------------------------- the maps and the director (world6: gen/, wrapped by mkmaps.js) */
  var CW = (function () {
    var module = undefined, CWROOT = {};
// gen/hash.js: the world's 32-bit integer hash and splitmix32 (bit-exact with GLSL's uint arithmetic: maps.glsl's
// mix32 / hash2 / hash3 are the same lines). Plain ES5, usable in node and in a page.
(function (root) {
  'use strict';
  function mix32(x) {
    x = x >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
  }
  // lattice corner (ix, iy) of stream s: ints may be negative (two's complement, as GLSL's uint(int))
  function hash2(ix, iy, s) { return mix32(((ix | 0) ^ mix32(((iy | 0) ^ mix32(s >>> 0)) >>> 0)) >>> 0); }
  function hash3(ix, iy, iz, s) { return mix32(((ix | 0) ^ mix32(((iy | 0) ^ mix32(((iz | 0) ^ mix32(s >>> 0)) >>> 0)) >>> 0)) >>> 0); }
  function u01(h) { return (h >>> 8) / 16777216; } // 24 bits -> [0,1), exact in float32
  // splitmix32: a stream from a seed (the director's and the place's own streams)
  function splitmix32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x9e3779b9) >>> 0;
      var z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      z = (z ^ (z >>> 16)) >>> 0;
      return z / 4294967296;
    };
  }
  var H = { mix32: mix32, hash2: hash2, hash3: hash3, u01: u01, splitmix32: splitmix32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = H; else root.CWHash = H;
})(CWROOT);
