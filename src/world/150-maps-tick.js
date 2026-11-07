  /* ---------------------------------------------------------------- the maps in the world: mapsInit, kitAt and the director's tick */
  var MAPS = { w: null, D: null, ox: 0, oz: 0, t: 0, lastTick: -1e9, lastSee: -1e9, mc: {}, pc: {}, kw: {}, look: null };
  /* (fast500 B3) the first tick's prefix: S anchors to 15.65 km; the rest (S's 15.65-16.27 km, about 7% of its slots)
     in the next slice. What the first plan bakes reads S within: KF's raw texels to KF_RAW (15 km, whole, as today)
     + S's reach (R 450 + warp 120 = 570 m) = 15.57 km, with 80 m for the camera's travel before the rest is in
     (it is committed in the first slice's kwFollow, before kfFollow, and by any tick first). B is whole: an S anchor
     scores against B within B's reach (2.125 km), and every texel reads B too: B's prefix would be 17.7 of 17.8 km */
  var TICK_PRE = { S: 15650 };
  function mapsInit(seed, inj) {   // (fast500 F: inj, the worker's plan: World and Director made from it, the tick's commits imported)
    var K = CW.K, w = new CW.M.World(seed >>> 0, K, null, inj && inj.W), D = new CW.D.Director(w, K, seed >>> 0, inj && inj.D);
    MAPS.w = w; MAPS.D = D; MAPS.ox = D.land0[0]; MAPS.oz = D.land0[1]; MAPS.look = new Float64Array(D.NF);
    MAPS.lastTick = -1e9; MAPS.lastSee = -1e9;
    if (inj) D.importState(inj.D); else D.tick([MAPS.ox, MAPS.oz], 0, TICK_PRE);   // (the boot's commit about the landing: everything within reach of the first view; fast500 B3: S to TICK_PRE first; fast500 F: the worker's, imported)
  }
  // the kits' weights at a point of the world (engine coordinates: the landing at the origin), straight from the maps
  function kitAt(x, z) {
    var w = MAPS.w, X = x + MAPS.ox, Z = z + MAPS.oz;
    w.macro(X, Z, MAPS.mc); w.place(X, Z, MAPS.pc, MAPS.mc);
    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);
  }
  /* the director's tick (every DIR_DT s of the flight: the anchors coming into its reach, 15 km and more ahead, nearest
     first) and its record of what has been seen (every DIR_SEE s: the look of the land within 250 m all round). It
     never steers: it touches only its own tables */
  var DIR_DT = 0.5, DIR_SEE = 5, SEERING = [[0, 0]];
  (function () { for (var r = 120; r <= 250; r += 130) for (var k = 0; k < 6; k++) { var a = (k + (r > 200 ? 0.5 : 0)) * Math.PI / 3; SEERING.push([r * Math.sin(a), r * Math.cos(a)]); } })();
  function directorStep(t) {
    var D = MAPS.D; if (!D) return;
    if (t - MAPS.lastTick >= DIR_DT) { MAPS.lastTick = t; D.tick([CS.x + MAPS.ox, CS.z + MAPS.oz], t); }
    if (t - MAPS.lastSee >= DIR_SEE) {
      MAPS.lastSee = t;
      var L = MAPS.look, lk = new Float64Array(D.NF), w = MAPS.w, i, c; L.fill(0);
      for (i = 0; i < SEERING.length; i++) { var X = CS.x + MAPS.ox + SEERING[i][0], Z = CS.z + MAPS.oz + SEERING[i][1]; w.macro(X, Z, MAPS.mc); w.place(X, Z, MAPS.pc, MAPS.mc); D.lookOf(MAPS.mc, MAPS.pc, lk); for (c = 0; c < D.NF; c++) L[c] += lk[c] / SEERING.length; }
      D.see(t, L);
    }
  }

