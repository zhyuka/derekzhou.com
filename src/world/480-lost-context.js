  /* ---------------------------------------------------------------- a lost context */
  canvas.addEventListener('webglcontextlost', onLost);
  function onLost(e) {   // (fast500 5: named, for startTake)
    e.preventDefault(); if (!gl) return;   // (fast500 5: the start file's context, lost before the boot took it: startTake tells it then)
    START = null; LOST = true; MEMN.lost++; stop(); FRUN = false; if (FRAF) cancelAnimationFrame(FRAF); FRAF = 0; shown = false; STILLTS = -1; DOMQ.hide = true; domNext(); recMark('context lost');   // (Fix 2, S10: the canvas hidden and the still marked in the next frame; round 3: the ink birds' forced loop stopped too, FCOL.on kept: restoreNow starts it again)
    BOOT.hOk = false;
    if (RESTORERAF) { cancelAnimationFrame(RESTORERAF); RESTORERAF = 0; }
  }
  /* (Fix 2 of round E1, S10) the restore's work runs in the next animation frame's callback, never in the event's
     handler (round E1 called initExtensions and resize there: GL calls outside a frame) */
  var RESTORERAF = 0;
  canvas.addEventListener('webglcontextrestored', function () {
    if (!RESTORERAF) RESTORERAF = requestAnimationFrame(function () { RESTORERAF = 0; restoreNow(); });
  });
  function restoreNow() {
    if (!gl || !LOST || gl.isContextLost()) return;   // (fast500 5: the start file's context restored before the boot took it, or before the world was told it was lost)   // (lost again before this frame: the next restore's event comes)
    // a restored context starts empty: its extensions off (asked for again first), every program, buffer and texture
    // gone; (E1) the boot's stages B to F and H run again (the measurement of G is kept): every object, every program
    // (compile all, link all, flush, status last), the noise, the warm table, the cells about the camera (the same
    // places: every cell is its seed's and its coordinates'), while the still sky shows; the flight goes on from where
    // it was
    GROUND.rd = 0; GROUND.ok = false; GROUND.got = 0; probeDropAll(); rbForget(); FREEQ.length = 0; poolReset();   // (while still marked lost: the jobs' buffers and fences died with the old context, never deleted in the new one)
    LOST = false; FBOK = {}; initExtensions();   // (E1.1: a new context asks each kind of target's completeness again, once)
    PROGS.length = 0; TG = null; PROBE_T = null; HPT = null; PROBE_PTS = []; GCT = null; GCCT = null; BAKEFB = null; QUAD = null; OUT.w = 0; GCK[0] = -1; ENG.st = 0; READY = false;
    NOISE.done = false; NOISE.t = null; WARM.list = null; WARM.done = false; WARMX.length = 0; BOOT.thumb = null;   // (fast500 step 1b: the noise's baked bytes kept; B uploads them again)
    ORDER.forEach(function (id) { REALMS[id].P = null; });
    J.visits.forEach(forgetVisit); kwForget();
    if (BIRDL && forced()) { BIRDS = BIRDL; BIRDL = null; recMark('ink birds: the boot\'s after a restore (forced colours)'); }   // (round 3: a module made late is the boot's again, as birdsLate makes it after a restore (it does not run while forced colours hold): made again below, drawn by the forced loop)
    BIRDPL.length = 0; if (BIRDS) BIRDS.lost();   // (the birds' programs died with the context: the module makes them again)
    if (!GAVEUP) DEAD = false;
    if (BIRDS && BIRDS.visit) BIRDS.visit(-1);   // (E0: the ink birds' flights ended with the canvas; they begin again from the first frame shown)
    MEMN.restored++; recMark('context restored');
    bootReset(true);
    resize();
    if (forced() && !STILLMODE) { DOMQ.fc = true; domNext(); return; }   // (round 3: forced colours hold: the ink birds' own loop again, in the next frame (domFlush, fstart), moving or its still; the world boots once they end, onForced)
    start();
  }
