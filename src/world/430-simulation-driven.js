  /* ---------------------------------------------------------------- the simulation, driven */
  function simStepOnce() {
    copyState(CS, CSP); SIM.junction = false;
    var ok = simStep();
    if (ok) {   // the camera's travel (for the cloud it is in: continuous across the change of realm, wrapped on the noise's period)
      var V = SIM.V, v = V.speed;
      if (BIRDS && SW.birds && (STILLMODE || (SHOWNT >= 0 && SIM.t >= SHOWNT && lateBirds()))) { BIRDB.at = clockNow(); BIRDS.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; }   // (the birds' clock and planning: a fixed step, as the flight's; timed for their budget; from the first frame shown)
    }
    return ok;
  }
  /* the live loop: fixed steps covering the frame's time (at most 0.1 s of it), drawn between the last two */
  /* (dev: data-dtmax lets a slow harness's frames carry more of the flight, so its streaming is that of real time;
     data-tscale multiplies the frame's time, so a slow harness flies a long course in less of its own) */
  var DTMAX = DEVMODE && OPT.dtmax && +OPT.dtmax > 0 ? Math.min(+OPT.dtmax, 2) : 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2;
  var TSCALE = 1;
  function simAdvance(dt) {
    inputFrame(dt);   // (the view's own motion, the drag and the release's coast, drawn in this frame: both states turned by it)
    SIM.acc += Math.min(dt, DTMAX);
    var n = 0;
    while (SIM.acc >= SIM_DT && n < NMAX) { if (!simStepOnce()) { SIM.acc = 0; break; } SIM.acc -= SIM_DT; n++; }
    if (n >= NMAX) SIM.acc = 0;
    SIM.alpha = clamp(SIM.acc / SIM_DT, 0, 1);
  }
  /* the world, built (every stage; there is no passage bake) */
  function visitBuilt(V) { return V.st >= VSTAGES.length; }
