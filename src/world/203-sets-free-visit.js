  /* ---------------------------------------------------------------- the world's build: the instanced sets, freeing a visit */
  /* the realm's instanced sets: each a mesh built once a visit (and a coarse one, the same draws at the far cells'
     detail), placed by the cells as many times as they like (C.place): one draw a set a cell */
  function vsSets(V) {   // (the sets' meshes built here, CPU; uploaded by vsSetsUp, GPU)
    var S = V.def.sets; V.setB = [];
    if (!S) return true;
    var names = Object.keys(S);
    for (var k = 0; k < names.length; k++) {
      var d = S[names[k]], seed = subseed(V.seed, 500 + k);
      var B = new Builder(1024); B.place(0, 0, 0, 0, false); d.mesh(B, RNG(seed), KITAPI);
      var B2 = null;
      if (d.coarse !== false) { B2 = new Builder(512); B2.lod = 1; B2.place(0, 0, 0, 0, false); d.mesh(B2, RNG(seed), KITAPI); if (!(B2.n && B2.n < B.n * 0.9)) B2 = null; }
      V.setB.push([names[k], d, B, B2]);
    }
    return true;
  }
  function vsSetsUp(V) {
    V.G.sets = {};
    var L = V.setB || [];
    for (var k = 0; k < L.length; k++) {
      var d = L[k][1], B = L[k][2], B2 = L[k][3];
      var full = uploadMesh(B, V.G); full.lo = B.lo.slice(); full.hi = B.hi.slice();
      var coarse = B2 ? uploadMesh(B2, V.G) : null;
      var r = 0; for (var a = 0; a < 3; a++) r = Math.max(r, Math.abs(full.lo[a]), Math.abs(full.hi[a]));
      V.G.sets[L[k][0]] = { full: full, coarse: coarse, far: d.far || 900, r: r, cy: (full.lo[1] + full.hi[1]) / 2 };
    }
    V.setB = null;
    return true;
  }
  /* the world's GL objects and its cells' freed (a reset or a lost context; the programs stay) */
  function freeVisit(V) {
    if (!V) return;
    if (V.cells) { V.cells.forEach(function (C) { freeCell(C); }); V.cells = null; V.cellList = null; }
    var G = V.G;
    if (G && !LOST) {
      G.bufs.forEach(function (b) { glFree('Buffer', b); });   // (deleted among the next frame's GPU jobs)
      G.vaos.forEach(function (v) { glFree('VertexArray', v); });
      G.texs.forEach(function (t) { glFree('Texture', t); });
    }
    V.G = null; V.st = 0; V.ribbons = null; V.scB = null; V.setB = null;
    V.pois = null; V.oq = null; V.rng = null; V.rng2 = null; V.ready = false; V.field = null;
  }
  function forgetVisit(V) {   // (after a lost context the objects are gone already)
    if (V.cells) V.cells.forEach(function (C) { C.gone = true; }); V.cells = null; V.cellList = null;
    V.G = null; V.st = 0; V.ribbons = null; V.ready = false; V.scB = null; V.setB = null;
  }
