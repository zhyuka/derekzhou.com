  /* ---------------------------------------------------------------- the world itself (one V for the page's life) */
  var J = { seed: SEED0, V: null, visits: [], base: 0 };
  function theWorld() {
    if (J.V) return J.V;
    var def = REALMS.world; if (!def || def.bad) return null;
    var r = RNG(subseed(J.seed, 1000));
    J.V = { k: 0, id: 'world', def: def, seed: r.seed(), D: Infinity, t0: 0, u0: 0, t1: Infinity, st: 0, cells: null, failed: false };
    J.visits = [J.V];
    return J.V;
  }
  var JA = { V: null, u: 0 };
  function worldAt(t) { JA.V = theWorld(); JA.u = t; return JA; }
  function worldReset(seed) { if (J.V) freeVisit(J.V); J.V = null; J.visits = []; J.seed = seed; MAPS.w = null; KW.ok = false; KW.part = false; KWR = null; KW.ix.fill(BADK); KW.dx.fill(BADK); KG.ix.fill(BADK); KF.ok = false; KF.ix.fill(BADK); KF.dx.fill(BADK); }

