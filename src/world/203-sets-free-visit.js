  /* ---------------------------------------------------------------- the world's build: freeing a visit */
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
    V.G = null; V.st = 0; V.ribbons = null; V.scB = null;
    V.pois = null; V.oq = null; V.rng = null; V.rng2 = null; V.ready = false; V.field = null;
  }
  function forgetVisit(V) {   // (after a lost context the objects are gone already)
    if (V.cells) V.cells.forEach(function (C) { C.gone = true; }); V.cells = null; V.cellList = null;
    V.G = null; V.st = 0; V.ribbons = null; V.ready = false; V.scB = null;
  }
