  /* ---------------- the hooks ---------------- */

  weather(); r2 = vstream(2); r2x = r2(); r2y = r2(); errInit(); roostPsi = TAU * vstream(7001)();
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
    visit: function () { clearAll(); guestReset(); CVH.n = 0; CVH.i = 0; },
    reset: function () { roostPsi = TAU * vstream(7001)(); roostCls = ''; roostK = 0; LPEND = null; guestReset(); t = 0; flightNo = 0; crowdN = 0; HIDJOB = -1e9; weather(); r2 = vstream(2); r2k = 0; r2x = r2(); r2y = r2(); WK[20] = -1; dirty = true; clearAll(); errInit(); CH.n = 0; CH.i = 0; GVT = -1; calmOn = -1; STILL.on = false; CVH.n = 0; CVH.i = 0; },
    lost: function () { PROG = null; VAO = null; VBO = null; RING = null; BT = null; BROKEN = false; SAMPLERS = false; makeProgram(); },
    boot: function () { makeProgram(); bootRing(); }   // (E1: the boot's stage B: the instance ring and its warm entry)
  };
  });
})();
