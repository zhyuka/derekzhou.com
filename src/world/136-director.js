// gen/director.js (v2): the director composes the land ahead by ANCHORS on the place channels: two seed-fixed jittered
// lattices (big anchors, radius 1-2.2 km; small anchors, radius 0.3-0.65 km), each anchor a compact C2 bump on a
// domain-warped distance (organic outlines, varied sizes), its offset ADDED to the continuous base maps (many anchors
// are null: the base maps' own regions stand). There is no partition into cells and no place list the maps can read.
// It writes only its own append-only tables (each anchor's radius and offset, once, before it can influence anything
// in reach of the view) and keeps its own record (looks seen, for novelty). It never touches the camera, the heading or
// the time. Places are measured from the maps (gen/sim.js pacing), not from this record.
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Hs = isNode ? require('./hash.js') : root.CWHash;
  var Mp = isNode ? require('./maps.js') : root.CWMaps;
  var Nz = isNode ? require('./noise.js') : root.CWNoise;
  var mix32 = Hs.mix32, hash2 = Hs.hash2, u01 = Hs.u01;

  function phi(r) { if (r >= 1) return 0; var a = 1 - r; return a * a * a * a * (4 * r + 1); }
  // v2's anchor kernel: a plateau (flat inside 0.55 r, a C2 quintic fall to 0 at r): a place's interior is even, its
  // edge an ecotone of 0.45 r
  function plat(r) { if (r >= 1) return 0; if (r <= 0.55) return 1; var t = (1 - r) / 0.45; return t * t * t * (t * (t * 6 - 15) + 10); }
  function smax1(s) { var k = 0.5, h = Math.max(k - Math.abs(s - 1), 0) / k; return Math.max(s, 1) + h * h * k * 0.25; }
  function dphi(r) { if (r >= 1) return 0; var a = 1 - r; return -20 * r * a * a * a; }

  function Lattice(g, s) { this.g = g; this.s = s; this.dz = g * 0.8660254037844386; }
  Lattice.prototype.pos = function (i, j, out) {
    var h = hash2(i, j, this.s);
    out[0] = (i + 0.5 * (j & 1)) * this.g + (u01(h) - 0.5) * 0.4 * this.g;
    out[1] = j * this.dz + (u01(mix32(h)) - 0.5) * 0.4 * this.g;
    return out;
  };
  Lattice.prototype.each = function (x, z, r, fn) {
    var g = this.g, dz = this.dz, p = [0, 0];
    var j0 = Math.floor((z - r) / dz) - 1, j1 = Math.ceil((z + r) / dz) + 1;
    for (var j = j0; j <= j1; j++) {
      var i0 = Math.floor((x - r) / g) - 1, i1 = Math.ceil((x + r) / g) + 1;
      for (var i = i0; i <= i1; i++) {
        this.pos(i, j, p);
        var d = Math.hypot(p[0] - x, p[1] - z);
        if (d <= r) fn(i, j, p[0], p[1], d);
      }
    }
  };
  Lattice.prototype.eachNew = function (x, z, px, pz, r, fn) {
    var g = this.g, dz = this.dz, p = [0, 0], m = 0.35 * g;
    var j0 = Math.floor((z - r) / dz) - 1, j1 = Math.ceil((z + r) / dz) + 1;
    for (var j = j0; j <= j1; j++) {
      var zr = j * dz, jz = 0.2 * g + 1e-6;
      var dzc = Math.max(0, Math.abs(zr - z) - jz), hw = r * r - dzc * dzc;
      var cw = hw > 0 ? Math.sqrt(hw) : 0;
      var lo = x - cw - m - g, hi = x + cw + m + g;
      var dzp = Math.abs(zr - pz) + jz, hp = r * r - dzp * dzp, pw = hp > 0 ? Math.sqrt(hp) : -1;
      var plo = px - pw + m + g, phi_ = px + pw - m - g;
      var i0 = Math.floor(lo / g), i1 = Math.ceil(hi / g);
      for (var i = i0; i <= i1; i++) {
        var xi = (i + 0.5 * (j & 1)) * g;
        if (pw > 0 && xi > plo && xi < phi_) continue;
        this.pos(i, j, p);
        var d = Math.hypot(p[0] - x, p[1] - z);
        if (d <= r && Math.hypot(p[0] - px, p[1] - pz) > r) fn(i, j, p[0], p[1], d);
      }
    }
  };
  function key(i, j) { return i * 1048576 + j; }

