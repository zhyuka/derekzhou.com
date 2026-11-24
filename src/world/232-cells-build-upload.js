  /* ---------------------------------------------------------------- cells: building, uploading, baking, freeing */
  /* the landmarks built into a builder until the vertex budget is spent (an item whose build is a generator, a great
     temple, is built a part at a time, across frames); returns the vertices made. full: the rebuild in full detail
     of a coarse cell come near (its own builder, index and generator) */
  function buildItems(C, full, budget) {
    var V = C.V, B = full ? C.RB : C.B, k = full ? C.rbi : C.bi, gen = full ? C.rgen : C.gen, made = 0;
    while (B && k < C.items.length && made < budget) {
      var it = C.items[k], n0 = B.n, done = true;
      if (!gen) {
        B.place(it.x, it.seat, it.z, it.yaw || 0, !!it.air);
        var g = V.def.build(it, B, RNG(it.seed || ((C.key + k * 104729) >>> 0)), KITAPI);
        if (DEVMODE) it.nv = 0;
        if (g && typeof g.next === 'function') gen = g;
      }
      var parts = 0;
      if (gen) { done = false; while (made + B.n - n0 < budget) { parts++; if (gen.next().done) { done = true; gen = null; break; } } }
      made += B.n - n0; if (DEVMODE) { it.nv += B.n - n0; if (B.n - n0 > 2000) WORK.big = (WORK.big || '') + it.kind + (full ? '*' : '') + ':' + (B.n - n0) + '/' + parts + '/' + budget + ' '; }
      if (done) k++;
    }
    if (full) { C.rbi = k; C.rgen = gen; } else { C.bi = k; C.gen = gen; }
    return made;
  }
  function cellMesh(C, budget) { return buildItems(C, false, budget); }
  function cellUpload(C) {
    if (C.B && C.B.n) {
      C.mesh = uploadMesh(C.B, null);
      if (DEVMODE && DEVKEEP) C.pts = C.B.F.slice(0, C.B.n * 6);   // (dev: the vertices kept, for the clearance check)
    }
    C.B = null;
    // the opaque cores of its clouds: what stands behind them is never marched
    var occ = [];
    for (var i = 0; i < C.vols.length; i++) { var o = C.vols[i].out; if (!o.kind) for (var j = 0; j < o.cores.length; j++) occ.push(o.cores[j]); }
    if (occ.length) {
      C.occ = { vao: pTake('occ'), b: pTake('buf'), n: occ.length / 4 };
      gl.bindVertexArray(C.occ.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, C.occ.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(occ), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
      gl.bindVertexArray(null);
    }
    uploadInst(C);
    C.st = 3; C.vi = 0;
    C.mborn = lateBorn(C.V, cellDistFade(C));
  }
  function cellBake(C, budget) {   // bakes its clouds; returns the layer draws made
    var made = 0;
    while (C.vi < C.vols.length && made < budget) {
      var vb = C.vols[C.vi];
      if (!vb.done) { made += volBake(vb, C.V, budget - made); if (!vb.done) break; var vf = volDistFade(vb.out); vb.out.born = lateBorn(C.V, vf); if (vb.out.born > -1e8) LATE.vols++; }
      C.vi++;
    }
    if (C.vi >= C.vols.length) { C.st = 4; C.born = lateBorn(C.V, cellDistFade(C)); }
    return made;
  }
  function freeCell(C) {
    if (!C || C.gone) return;
    C.gone = true;
    if (!LOST) {   // (queued, deleted among the next frame's GPU jobs: freeDrain)
      if (C.mesh && C.mesh.vao) { glFree('VertexArray', C.mesh.vao); glFree('Buffer', C.mesh.vb); }
      if (C.occ) { glFree('VertexArray', C.occ.vao); glFree('Buffer', C.occ.b); }
      for (var i = 0; i < C.vols.length; i++) glFree('Texture', C.vols[i].out.t);
      if (C.inst) C.inst.forEach(function (q) { if (q.buf) glFree('Buffer', q.buf); if (q.vaoF) glFree('VertexArray', q.vaoF); if (q.vaoC) glFree('VertexArray', q.vaoC); });
      if (C.glowB && C.glowB.buf) { glFree('Buffer', C.glowB.buf); glFree('VertexArray', C.glowB.vao); }
      if (C.beamB && C.beamB.buf) { glFree('Buffer', C.beamB.buf); glFree('VertexArray', C.beamB.vao); }
    }
    if (C.job) C.job.cancel = true;
    C.mesh = null; C.occ = null; C.lift = null; C.liftN = null; C.liftT = undefined; C.vols = []; C.items = []; C.clouds = []; C.flocks = []; C.pois = []; C.obst = []; C.B = null; C.RB = null; C.gen = null; C.rgen = null; C.pts = null; C.soft = null; C.softB = null;
    C.places = []; C.glowG = []; C.beamL = []; C.inst = null; C.glowB = null; C.beamB = null;
    if (C.V) C.V.poiGen = (C.V.poiGen || 0) + 1;
  }
  var DEVKEEP = false;

