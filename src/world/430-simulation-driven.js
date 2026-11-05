  /* ---------------------------------------------------------------- the simulation, driven */
  function simStepOnce() {
    copyState(CS, CSP); SIM.junction = false;
    var ok = simStep();
    if (ok) {   // the camera's travel (for the cloud it is in: continuous across the change of realm, wrapped on the noise's period)
      var V = SIM.V, v = V.speed;
      if (BIRDS && SW.birds && (STILLMODE || (SHOWNT >= 0 && SIM.t >= SHOWNT && lateBirds()))) { BIRDB.at = clockNow(); BIRDS.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; }   // (the birds' clock and planning: a fixed step, as the flight's; timed for their budget. E0: from the first frame shown)
    }
    return ok;
  }
  /* the live loop: fixed steps covering the frame's time (at most 0.1 s of it), drawn between the last two */
  /* (dev: data-dtmax lets a slow harness's frames carry more of the flight, so its streaming is that of real time;
     E1, dev: data-tscale multiplies the frame's time, so a slow harness flies a long course in less of its own) */
  var DTMAX = DEVMODE && OPT.dtmax && +OPT.dtmax > 0 ? Math.min(+OPT.dtmax, 2) : 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2;
  var TSCALE = 1;
  function simAdvance(dt) {
    SIM.acc += Math.min(dt, DTMAX);
    var n = 0;
    while (SIM.acc >= SIM_DT && n < NMAX) { if (!simStepOnce()) { SIM.acc = 0; break; } SIM.acc -= SIM_DT; n++; }
    if (n >= NMAX) SIM.acc = 0;
    SIM.alpha = clamp(SIM.acc / SIM_DT, 0, 1);
  }
  /* the harness: stepped until t, each step's ground and the cells about the camera made at once (their solids and
     places: the flight needs them; their meshes and clouds only for the frame drawn at the end) */
  function simTo(t) {
    if (!SIM.V || t < SIM.t - 1e-9) simReset();
    var guard = 0;
    while (SIM.t + SIM_DT <= t + 1e-9 && guard++ < 2e6) {
      if (!SIM.V) { var V0 = worldAt(0).V; visitStep(V0, true); groundCache(V0, 0, 0, true); }
      if (!simStepOnce()) break;
      var V = SIM.V;
      groundCache(V, CS.x, CS.z, true);
      streamCells(V, CS.x, CS.z, Math.sin(CS.psi), Math.cos(CS.psi), false);
      kwFollow(CS.x, CS.z, true); kwUpload();   // (world6: the weights' grid kept about the camera)
      cellWork(V, true, 0.85, 2);   // (every cell that can hold a place the autopilot may choose, 2 km: a still is the same drawn alone or in a film)
    }
    SIM.alpha = 1; SIM.acc = 0;
    freeDrain();
  }
  /* the world, built (world6: every stage; there is no passage bake) */
  function visitBuilt(V) { return V.st >= VSTAGES.length; }
