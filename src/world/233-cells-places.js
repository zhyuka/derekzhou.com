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
  /* the cell's GPU side of its sets */
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
  }

