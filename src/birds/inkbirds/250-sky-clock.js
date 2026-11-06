  /* ---------------- the sky's clock (the engine's fixed steps; no clock is read) ---------------- */

  var t = 0, STEPS = 0, STEP_DT = 1 / 60, STILL_T = 24, STILL_Q = 600;
  function measureIf() { if (dirty || changed()) relayout(); }
  /* one fixed step: every bird of the world, and the perches */
  function step(dt) {
    STEP_DT = dt;
    forcedCheck();
    var C = camStep(); if (!C) return;   // (no camera: no flight yet)
    measureIf();
    STEPS++;
    if (HOST.reduced()) return;
    t += dt;
    pointerStep(dt, C);   // (the pointer read first: a bird on its tip stands where the tip is this frame, no lag)
    birdsStep(C, dt);
    perchesStep(C, dt);
  }
  /* forced colours came or went: the other view, the same visit's sky begun again in it */
  function forcedCheck() {
    var f = !!(HOST.forced && HOST.forced().on);
    if (f === FORCED) return;
    FORCED = f; dirty = true; clearAll();
  }
  /* the window changed shape, or the words moved: measured again (the birds are the world's: nothing about them moves) */
  function relayout() { measure(); if (FORCED) forcedCam(); PW.ledges = null; }
  /* the sky begins again (a visit, a reset) */
  function clearAll() { birdsClear(); STILL.done = false; STILL.t = 0; }
  /* reduced motion: one still frame, the world's own birds as they are a little way into the visit: the same visit
     flown forward STILL_T s from its start (a share a call: the engine asks prepare() each frame while its still sky
     shows), then held */
  var STILL = { done: false, t: 0 };
  function stillStep(quota) {
    if (STILL.done) return true;
    forcedCheck(); measure(); if (FORCED) forcedCam();
    var C = camStep(); if (!C) return false;
    var dt = 1 / 20, n = 0;
    while (STILL.t < STILL_T && n * Math.max(1, BIRDS.length) < quota) { t += dt; STILL.t += dt; STEPS++; birdsStep(C, dt); n++; if (HOST.budget && HOST.budget() <= 0) break; }
    if (STILL.t >= STILL_T) STILL.done = true;
    return STILL.done;
  }
  function stillSky() { for (var g = 0; g < 400 && !stillStep(1e9); g++); }
