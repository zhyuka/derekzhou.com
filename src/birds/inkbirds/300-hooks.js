  /* ---------------- the hooks ---------------- */

  weather();
  window.WORLD.birds.feed = feed;   // (the score's read of the birds: 266, read only)
  makeProgram();   // (asked for now: the engine links it while its still sky shows)
  return {
    step: step,
    /* reduced motion: the still sky planned a share a call while the engine's still sky shows; true once done */
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
    after: function (s) { afterCut(s >>> 0); },   // (the host, the frame after the cut: the visit's own read)
    lost: function () { PROG = null; VAO = null; VBO = null; RING = null; BT = null; BROKEN = false; SAMPLERS = false; makeProgram(); },
    boot: function () { makeProgram(); bootRing(); prebuild(); }   // the boot's stage B: the instance ring, its warm entry, the tables a landing needs
  };
  });
})();
