  /* the placements of a cell: seated, their obstacles, packed per set (20 floats an instance: place and turn; scale and
     phase; tint and emission; tilt and bob; spin) */
  function resolvePlaces(C, yOf) {
    if (!C.places.length) return;
    var sets = C.V.G && C.V.G.sets || {}, by = {}, i;
    for (i = 0; i < C.places.length; i++) {
      var q = C.places[i], S = sets[q.set];
      if (!S) { if (DEVMODE) fail('no set ' + q.set); continue; }
      q.seat = q.air ? q.y : (q.ref ? q.ref.seat + (q.dy || 0) : q.seat);
      var sc = q.scale === undefined ? [1, 1, 1] : (typeof q.scale === 'number' ? [q.scale, q.scale, q.scale] : q.scale);
      q.sc = sc; q.r = S.r * Math.max(sc[0], sc[1], sc[2]) + (q.bob ? q.bob[0] : 0); q.cy = S.cy * sc[1];
      if (q.solid) C.obst.push({ c: 1, x: q.x + (q.solid[2] || 0), z: q.z + (q.solid[3] || 0), r: q.solid[0], y0: q.seat - 30, y1: q.seat + q.solid[1] });
      if (q.sphere) C.obst.push({ c: 0, x: q.x, y: q.seat + q.sphere[0], z: q.z, r: q.sphere[1] });
      (by[q.set] = by[q.set] || []).push(q);
    }
    C.inst = [];
    for (var name in by) {
      var L = by[name], d = new Float32Array(L.length * 20);
      for (i = 0; i < L.length; i++) {
        var p = L[i], o = i * 20, t = p.tint || [1, 1, 1], tl = p.tilt || [0, 0], bob = p.bob || [0, 1];
        d[o] = p.x; d[o + 1] = p.seat; d[o + 2] = p.z; d[o + 3] = (p.yaw || 0) * DEG;
        d[o + 4] = p.sc[0]; d[o + 5] = p.sc[1]; d[o + 6] = p.sc[2]; d[o + 7] = p.phase !== undefined ? p.phase : hfl(ihash((C.key * 977 + i * 131 + 7) >>> 0));
        d[o + 8] = t[0]; d[o + 9] = t[1]; d[o + 10] = t[2]; d[o + 11] = p.glow === undefined ? 1 : p.glow;
        d[o + 12] = tl[0] * DEG; d[o + 13] = tl[1] * DEG; d[o + 14] = bob[0]; d[o + 15] = 2 * PI / Math.max(bob[1], 0.1);
        d[o + 16] = (p.spin || 0) * DEG;
      }
      C.inst.push({ set: name, n: L.length, data: d, buf: null, vaoF: null, vaoC: null });
    }
  }
  /* a cell's glow sprites, packed (16 floats a sprite: place and size; colour and least size; twinkle, pulse, rate,
     phase; drift, bob, blink, far) with their bound */
  function resolveGlows(C) {
    if (!C.glowG.length) return;
    var n = 0, i, k; for (i = 0; i < C.glowG.length; i++) n += C.glowG[i].n;
    var d = new Float32Array(n * 16), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], o = 0;
    for (i = 0; i < C.glowG.length; i++) {
      var g = C.glowG[i], base = g.ref ? g.ref.seat : 0, col = g.color || [1, 1, 1], per = col.length === g.n * 3;
      for (k = 0; k < g.n; k++, o += 16) {
        var x = g.pos[k * 3], y = g.pos[k * 3 + 1] + (g.gh ? g.gh[k] : base), z = g.pos[k * 3 + 2];
        var sz = typeof g.size === 'number' ? g.size : (g.size ? g.size[k] : 0.3);
        d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = sz;
        d[o + 4] = per ? col[k * 3] : col[0]; d[o + 5] = per ? col[k * 3 + 1] : col[1]; d[o + 6] = per ? col[k * 3 + 2] : col[2]; d[o + 7] = g.px || 1.5;
        d[o + 8] = g.twinkle || 0; d[o + 9] = g.pulse || 0; d[o + 10] = g.rate || 0.5;
        d[o + 11] = g.phase ? g.phase[k] : hfl(ihash((C.key * 7919 + o * 31 + 3) >>> 0));
        d[o + 12] = g.drift || 0; d[o + 13] = g.bob || 0; d[o + 14] = g.blink || 0; d[o + 15] = g.far || 0;
        var m = Math.abs(g.drift || 0) + (g.bob || 0) + sz, yl = g.drift < 0 ? y + g.drift : y;
        if (x - m < lo[0]) lo[0] = x - m; if (yl - m < lo[1]) lo[1] = yl - m; if (z - m < lo[2]) lo[2] = z - m;
        if (x + m > hi[0]) hi[0] = x + m; if (y + m > hi[1]) hi[1] = y + m; if (z + m > hi[2]) hi[2] = z + m;
      }
    }
    var c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    C.glowB = { n: n, data: d, buf: null, vao: null, bound: new Float32Array([c[0], c[1], c[2], Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2]) };
  }
  /* a cell's beams, packed (20 floats a beam: from and its radius; to and its radius; colour and core; dust, shimmer,
     woken at, draw-on; the fades) with their bound and their wakes */
  function resolveBeams(C) {
    if (!C.beamL.length) return;
    var n = C.beamL.length, d = new Float32Array(n * 20), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], wakes = [];
    for (var i = 0; i < n; i++) {
      var b = C.beamL[i], o = i * 20, A = b.from.slice(), Bp = b.to.slice();
      if (b.ref) { A[0] += b.ref.x; A[1] += b.ref.seat; A[2] += b.ref.z; Bp[0] += b.ref.x; Bp[1] += b.ref.seat; Bp[2] += b.ref.z; }
      else if (b.ground) { A[1] += b.seat; Bp[1] += b.seat; }
      var r = b.r === undefined ? 1 : b.r, rA = typeof r === 'number' ? r : r[0], rB = typeof r === 'number' ? r : r[1], col = b.color || [1, 1, 1], fd = b.fade || [0.3, 0.02];
      d[o] = A[0]; d[o + 1] = A[1]; d[o + 2] = A[2]; d[o + 3] = rA; d[o + 4] = Bp[0]; d[o + 5] = Bp[1]; d[o + 6] = Bp[2]; d[o + 7] = rB;
      d[o + 8] = col[0]; d[o + 9] = col[1]; d[o + 10] = col[2]; d[o + 11] = b.core === undefined ? 0.6 : b.core;
      d[o + 12] = b.dust || 0; d[o + 13] = b.shimmer || 0; d[o + 14] = b.wake ? 1e9 : -1e9; d[o + 15] = b.wake ? b.wake[2] || 2 : 1;
      d[o + 16] = fd[0]; d[o + 17] = fd[1];
      if (b.wake) wakes.push([i, A[0], A[1], A[2], b.wake[0], b.wake[1] || 0]);
      var R = Math.max(rA, rB) * 2.2;
      for (var a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], A[a] - R, Bp[a] - R); hi[a] = Math.max(hi[a], A[a] + R, Bp[a] + R); }
    }
    var c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    C.beamB = { n: n, data: d, buf: null, vao: null, wakes: wakes, dirty: false, bound: new Float32Array([c[0], c[1], c[2], Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2]) };
  }
  /* a beam wakes when the camera first comes within its reach of its start: drawn on from then (the shaders' clock:
     the visit's time + 40, as uT) */
  function beamWake(V, u) {
    var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i], B = C.beamB; if (C.st < 2 || !B || !B.wakes.length) continue;
      var dx = B.bound[0] - CS.x, dz = B.bound[2] - CS.z, R = B.bound[3] + 400;
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = B.wakes.length - 1; k >= 0; k--) {
        var w = B.wakes[k], ex = w[1] - CS.x, ey = w[2] - CS.y, ez = w[3] - CS.z;
        if (ex * ex + ey * ey + ez * ez > w[4] * w[4]) continue;
        B.data[w[0] * 20 + 14] = u + 40 + w[5]; B.dirty = true; B.wakes.splice(k, 1);
      }
    }
  }
  /* the cell's GPU side of its sets, glows and beams */
  var QUAD = null;
  function uploadInst(C) {
    var sets = C.V.G && C.V.G.sets || {};
    if (C.inst) C.inst.forEach(function (q) {
      var S = sets[q.set]; if (!S || !S.full.vb) return;
      q.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, q.buf); gl.bufferData(gl.ARRAY_BUFFER, q.data, gl.STATIC_DRAW);
      q.vaoF = pTake('inst'); gl.bindVertexArray(q.vaoF); meshAttribs(S.full); instAttribs(q.buf, 5, 5, 0);
      if (S.coarse && S.coarse.vb) { q.vaoC = pTake('inst'); gl.bindVertexArray(q.vaoC); meshAttribs(S.coarse); instAttribs(q.buf, 5, 5, 0); }
      gl.bindVertexArray(null);
      q.S = S; if (!DEVMODE) q.data = null;
    });
    if (C.glowB) {
      if (!QUAD) { QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); }
      var G = C.glowB; G.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, G.buf); gl.bufferData(gl.ARRAY_BUFFER, G.data, gl.STATIC_DRAW);
      G.vao = pTake('glow'); gl.bindVertexArray(G.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      instAttribs(G.buf, 1, 4, 0); gl.bindVertexArray(null);
      if (!DEVMODE) G.data = null;
    }
    if (C.beamB) {
      var Bm = C.beamB; Bm.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, Bm.buf); gl.bufferData(gl.ARRAY_BUFFER, Bm.data, gl.DYNAMIC_DRAW);
      Bm.vao = pTake('beam'); gl.bindVertexArray(Bm.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      instAttribs(Bm.buf, 1, 5, 0); gl.bindVertexArray(null);
      Bm.dirty = false;
    }
  }

