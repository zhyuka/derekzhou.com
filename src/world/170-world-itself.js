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

