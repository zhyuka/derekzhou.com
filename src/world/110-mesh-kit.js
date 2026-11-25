  /* ---------------------------------------------------------------- the mesh kit (landmarks, scatter) */
  /* A builder takes triangles in local space (y up, the base at y = 0) through the current transform and colour,
     straight into a growing vertex buffer (no array per vertex). Vertex, 24 bytes: position (3 floats, the world's),
     normal (3 signed bytes), its emission (a byte: B.emit, 0 .. 16 in sixteenths: the surface's own light, its colour
     times this, added after the shade: a lamp's window, a crystal, a flame), colour (3 bytes, half the value: 0..2) and
     the realm's material code (a byte), the height over the item's seat (a float; 100 for a piece in the air). The
     engine places each item (place: its point, its seat on the ground, its turn) before the realm's builder draws it;
     the builder keeps each item's bounds. B.emit is 0 at each item's start: set it before the emissive parts, and back
     to 0 after them. */
  var VSTRIDE = 24;
  function Builder(cap) {
    this.cap = cap || 2048; this.ab = new ArrayBuffer(this.cap * VSTRIDE);
    this.F = new Float32Array(this.ab); this.I8 = new Int8Array(this.ab); this.U8 = new Uint8Array(this.ab); this.n = 0;
    this.M = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.N = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.T = [0, 0, 0]; this.col = [0.2, 0.2, 0.25, 1]; this.stack = [];
    this.seatY = 0; this.air = false; this.lod = 0; this.emit = 0;   // (lod 1: a far cell's coarse build: lathes and grids at about half their segments)
    this.lo = [1e9, 1e9, 1e9]; this.hi = [-1e9, -1e9, -1e9];   // the current item's bounds
  }
  Builder.prototype = {
    /* an item's frame: at (x, y, z), turned yaw deg about the vertical; y is its seat (seated) or its height (air) */
    place: function (x, y, z, yaw, air) {
      var a = (yaw || 0) * DEG, c = Math.cos(a), s = Math.sin(a);
      this.M = [c, 0, s, 0, 1, 0, -s, 0, c]; this.T = [x, y, z]; this.stack.length = 0; this.normalMat();
      this.seatY = y; this.air = !!air; this.emit = 0;
      this.lo[0] = this.lo[1] = this.lo[2] = 1e9; this.hi[0] = this.hi[1] = this.hi[2] = -1e9;
      return this;
    },
    push: function () { this.stack.push([this.M.slice(), this.T.slice()]); return this; },
    pop: function () { var s = this.stack.pop(); this.M = s[0]; this.T = s[1]; this.normalMat(); return this; },
    // apply a local transform: translate (x, y, z), then yaw (deg, about y), pitch (about x), roll (about z), scale s (number or [sx, sy, sz])
    xf: function (x, y, z, yaw, pitch, roll, s) {
      var a = (yaw || 0) * DEG, b = (pitch || 0) * DEG, c = (roll || 0) * DEG;
      var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
      // R = Ry(a) * Rx(b) * Rz(c), row-major 3x3
      var Ry = [ca, 0, sa, 0, 1, 0, -sa, 0, ca], Rx = [1, 0, 0, 0, cb, -sb, 0, sb, cb], Rz = [cc, -sc, 0, sc, cc, 0, 0, 0, 1];
      var R = mm3(mm3(Ry, Rx), Rz), S = s === undefined ? [1, 1, 1] : (typeof s === 'number' ? [s, s, s] : s);
      R = [R[0] * S[0], R[1] * S[1], R[2] * S[2], R[3] * S[0], R[4] * S[1], R[5] * S[2], R[6] * S[0], R[7] * S[1], R[8] * S[2]];
      var M = this.M, t = [M[0] * x + M[1] * y + M[2] * z + this.T[0], M[3] * x + M[4] * y + M[5] * z + this.T[1], M[6] * x + M[7] * y + M[8] * z + this.T[2]];
      this.M = mm3(this.M, R); this.T = t; this.normalMat();
      return this;
    },
    normalMat: function () {   // normals by the inverse transpose (the cofactors; scale may be non-uniform)
      var M = this.M, a = M[0], b = M[1], c = M[2], d = M[3], e = M[4], f = M[5], g = M[6], h = M[7], i = M[8], N = this.N;
      N[0] = e * i - f * h; N[1] = -(d * i - f * g); N[2] = d * h - e * g; N[3] = -(b * i - c * h); N[4] = a * i - c * g; N[5] = -(a * h - b * g); N[6] = b * f - c * e; N[7] = -(a * f - c * d); N[8] = a * e - b * d;
    },
    grow: function () {
      var cap = this.cap * 2, ab = new ArrayBuffer(cap * VSTRIDE); new Uint8Array(ab).set(this.U8.subarray(0, this.n * VSTRIDE));
      this.cap = cap; this.ab = ab; this.F = new Float32Array(ab); this.I8 = new Int8Array(ab); this.U8 = new Uint8Array(ab);
    },
    /* one vertex: local position (px, py, pz), local normal (nx, ny, nz), colour (rgb + code) */
    v: function (px, py, pz, nx, ny, nz, col) {
      if (this.n >= this.cap) this.grow();
      var M = this.M, T = this.T, N = this.N, o = this.n * 6, ob = this.n * VSTRIDE;
      var x = M[0] * px + M[1] * py + M[2] * pz + T[0], y = M[3] * px + M[4] * py + M[5] * pz + T[1], z = M[6] * px + M[7] * py + M[8] * pz + T[2];
      var mx = N[0] * nx + N[1] * ny + N[2] * nz, my = N[3] * nx + N[4] * ny + N[5] * nz, mz = N[6] * nx + N[7] * ny + N[8] * nz, l = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      this.F[o] = x; this.F[o + 1] = y; this.F[o + 2] = z;
      this.I8[ob + 12] = Math.round(mx / l * 127); this.I8[ob + 13] = Math.round(my / l * 127); this.I8[ob + 14] = Math.round(mz / l * 127);
      this.U8[ob + 15] = this.emit > 0 ? Math.min(255, Math.round(this.emit * 16)) : 0;
      var c = col || this.col;
      this.U8[ob + 16] = Math.round(clamp(c[0] * 0.5, 0, 1) * 255); this.U8[ob + 17] = Math.round(clamp(c[1] * 0.5, 0, 1) * 255); this.U8[ob + 18] = Math.round(clamp(c[2] * 0.5, 0, 1) * 255); this.U8[ob + 19] = c[3] | 0;
      this.F[o + 5] = this.air ? 100 : y - this.seatY;
      if (x < this.lo[0]) this.lo[0] = x; if (y < this.lo[1]) this.lo[1] = y; if (z < this.lo[2]) this.lo[2] = z;
      if (x > this.hi[0]) this.hi[0] = x; if (y > this.hi[1]) this.hi[1] = y; if (z > this.hi[2]) this.hi[2] = z;
      this.n++;
    },
    vert: function (p, n, col) { this.v(p[0], p[1], p[2], n[0], n[1], n[2], col); },
    tri: function (a, b, c, col) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      this.v(a[0], a[1], a[2], nx, ny, nz, col); this.v(b[0], b[1], b[2], nx, ny, nz, col); this.v(c[0], c[1], c[2], nx, ny, nz, col);
    },
    triOut: function (a, b, c, ctr, col) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      if (nx * (a[0] - ctr[0]) + ny * (a[1] - ctr[1]) + nz * (a[2] - ctr[2]) < 0) this.tri(a, c, b, col); else this.tri(a, b, c, col);
    },
    quadOut: function (a, b, c, d, ctr, col) { this.triOut(a, b, c, ctr, col); this.triOut(a, c, d, ctr, col); },
    triN: function (a, b, c, na, nb, nc, col) { this.v(a[0], a[1], a[2], na[0], na[1], na[2], col); this.v(b[0], b[1], b[2], nb[0], nb[1], nb[2], col); this.v(c[0], c[1], c[2], nc[0], nc[1], nc[2], col); },
    count: function () { return this.n; },
    bytes: function () { return new Uint8Array(this.ab, 0, this.n * VSTRIDE); }
  };
  function mm3(A, B) {
    var C = new Array(9);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return C;
  }
  var KIT = {
    /* a box from (x0,y0,z0) to (x1,y1,z1), its edges chamfered by bev */
    box: function (B, x0, y0, z0, x1, y1, z1, bev, col) {
      var c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], h = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2];
      bev = Math.min(bev || 0, h[0] * 0.45, h[1] * 0.45, h[2] * 0.45);
      function P(ax, sx, sy, sz) {   // the corner (sx,sy,sz)'s point on the face of axis ax
        return [c[0] + sx * (h[0] - (ax === 0 ? 0 : bev)), c[1] + sy * (h[1] - (ax === 1 ? 0 : bev)), c[2] + sz * (h[2] - (ax === 2 ? 0 : bev))];
      }
      var s = [-1, 1], a, b, k;
      for (a = 0; a < 2; a++) {   // the six faces
        var sg = s[a];
        B.quadOut(P(0, sg, -1, -1), P(0, sg, 1, -1), P(0, sg, 1, 1), P(0, sg, -1, 1), c, col);
        B.quadOut(P(1, -1, sg, -1), P(1, 1, sg, -1), P(1, 1, sg, 1), P(1, -1, sg, 1), c, col);
        B.quadOut(P(2, -1, -1, sg), P(2, 1, -1, sg), P(2, 1, 1, sg), P(2, -1, 1, sg), c, col);
      }
      if (bev <= 0) return;
      for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) {   // the twelve chamfers
        var sa = s[a], sb = s[b];
        B.quadOut(P(0, sa, sb, -1), P(1, sa, sb, -1), P(1, sa, sb, 1), P(0, sa, sb, 1), c, col);   // x-y edges along z
        B.quadOut(P(0, sa, -1, sb), P(2, sa, -1, sb), P(2, sa, 1, sb), P(0, sa, 1, sb), c, col);   // x-z edges along y
        B.quadOut(P(1, -1, sa, sb), P(2, -1, sa, sb), P(2, 1, sa, sb), P(1, 1, sa, sb), c, col);   // y-z edges along x
      }
      for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) for (k = 0; k < 2; k++) B.triOut(P(0, s[a], s[b], s[k]), P(1, s[a], s[b], s[k]), P(2, s[a], s[b], s[k]), c, col);
    },
    /* a prism: polygon (convex, [x,z] pairs) from y0 up to per-vertex tops (number or array), the top scaled and shifted */
    prism: function (B, poly, y0, tops, topScale, dx, dz, col, noBottom) {
      var n = poly.length, i, ctr = [0, 0, 0], top = [], bot = [];
      for (i = 0; i < n; i++) { ctr[0] += poly[i][0] / n; ctr[2] += poly[i][1] / n; }
      var ty = 0;
      for (i = 0; i < n; i++) {
        var yt = typeof tops === 'number' ? tops : tops[i]; ty += yt / n;
        bot.push([poly[i][0], y0, poly[i][1]]);
        top.push([ctr[0] + (poly[i][0] - ctr[0]) * (topScale || 1) + (dx || 0), yt, ctr[2] + (poly[i][1] - ctr[2]) * (topScale || 1) + (dz || 0)]);
      }
      ctr[1] = (y0 + ty) / 2;
      for (i = 0; i < n; i++) { var j = (i + 1) % n; B.quadOut(bot[i], bot[j], top[j], top[i], ctr, col); }
      var tc = [0, 0, 0]; for (i = 0; i < n; i++) tc = add(tc, mul(top[i], 1 / n));
      for (i = 0; i < n; i++) B.triOut(tc, top[i], top[(i + 1) % n], add(tc, [0, -10, 0]), col);
      if (!noBottom) { var bc = [ctr[0], y0, ctr[2]]; for (i = 0; i < n; i++) B.triOut(bc, bot[i], bot[(i + 1) % n], add(bc, [0, 10, 0]), col); }
    },
    /* a surface of revolution: profile [[r, y], ...] from the bottom up, seg sides; flat (faceted) or smooth */
    lathe: function (B, prof, seg, flat, col, phase) {
      var i, j, ring = [], nrm = [];
      if (B.lod) seg = Math.max(5, Math.round(seg * 0.4));
      for (i = 0; i < prof.length; i++) {
        var r = prof[i][0], y = prof[i][1], pr = prof[Math.max(i - 1, 0)], nx = prof[Math.min(i + 1, prof.length - 1)];
        var tr = nx[0] - pr[0], ty = nx[1] - pr[1], nr = ty, ny = -tr, l = Math.sqrt(nr * nr + ny * ny) || 1; nr /= l; ny /= l;
        var R1 = [], N1 = [];
        for (j = 0; j <= seg; j++) { var a = (j / seg + (phase || 0)) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); R1.push([r * ca, y, r * sa]); N1.push([nr * ca, ny, nr * sa]); }
        ring.push(R1); nrm.push(N1);
      }
      for (i = 0; i + 1 < prof.length; i++) for (j = 0; j < seg; j++) {
        var a0 = ring[i][j], a1 = ring[i][j + 1], b0 = ring[i + 1][j], b1 = ring[i + 1][j + 1];
        var mid = [0, (prof[i][1] + prof[i + 1][1]) / 2, 0];
        if (flat) { if (prof[i][0] > 1e-4) B.triOut(a0, a1, b1, mid, col); if (prof[i + 1][0] > 1e-4) B.triOut(a0, b1, b0, mid, col); }
        else {
          // wind outward: ring order is counter-clockwise seen from above
          if (prof[i][0] > 1e-4) B.triN(a0, b1, a1, nrm[i][j], nrm[i + 1][j + 1], nrm[i][j + 1], col);
          if (prof[i + 1][0] > 1e-4) B.triN(a0, b0, b1, nrm[i][j], nrm[i + 1][j], nrm[i + 1][j + 1], col);
        }
      }
    },
    /* a rough rock: a deformed octahedron subdivided once (for scatter and rubble) */
    rock: function (B, rng, r, flatten, col) {
      var V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], F = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
      var mid = {}, i;
      function m(a, b) { var k = a < b ? a + '_' + b : b + '_' + a; if (mid[k] === undefined) { V.push(norm(mul(add(V[a], V[b]), 0.5))); mid[k] = V.length - 1; } return mid[k]; }
      var F2 = [];
      for (i = 0; i < F.length; i++) { var a = F[i][0], b = F[i][1], c = F[i][2], ab = m(a, b), bc = m(b, c), ca = m(c, a); F2.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); }
      var P = V.map(function (p) { var k = r * (0.75 + 0.5 * rng.f()); return [p[0] * k, p[1] * k * (flatten || 1), p[2] * k]; });
      for (i = 0; i < F2.length; i++) B.triOut(P[F2[i][0]], P[F2[i][1]], P[F2[i][2]], [0, 0, 0], col);
    }
  };

