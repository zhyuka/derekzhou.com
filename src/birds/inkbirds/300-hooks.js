  /* ---------------- the hooks ---------------- */

  weather();
  makeProgram();   // (asked for now: the engine links it while its still sky shows)
  return {
    step: step,
    /* (round 3) reduced motion: the still sky planned a share a call while the engine's still sky shows; true once done */
    prepare: function () { forcedCheck(); if (!HOST.reduced()) return true; return stillStep(STILL_Q); },
    draw: function () {
      forcedCheck();
      if (!ready()) return;
      if (!FORCED && !HOST.bindTextures()) return;
      if (HOST.reduced()) stillSky();
      if (FORCED) { HOST.view(VW); forcedCam(); }
      drawPaper();
    },
    visit: function () { clearAll(); },
    reset: function () { t = 0; weather(); dirty = true; clearAll(); },
    lost: function () { PROG = null; VAO = null; VBO = null; RING = null; BT = null; BROKEN = false; SAMPLERS = false; makeProgram(); },
    boot: function () { makeProgram(); bootRing(); prebuild(); }   // the boot's stage B: the instance ring, its warm entry, the tables a landing needs
  };
  });
})();
