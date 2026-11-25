  /* G: the warm-up measurement, one timed trial a frame (design-v5 14: drawn m = 2 times, then one blocking 1-pixel
     read, timed by clockNow from before the draws to after the read; the same read after a clear alone gives the round
     trip, subtracted; five trials a scale, the median). Pinned (no trials: the scale the harness asks, data-rung or
     the full one) in development and with the switch gtrial=0 */
  var GS = { sc: [0.35, 0.5, 0.7, 1], i: 3, rt: [], tr: [[], [], [], []], med: [null, null, null, null], m: 2, done: false, pick: -1, P: 0, pinned: false, ms: null, rung: 0, px: new Uint8Array(4) };
  /* (fast500 step 10) the rung stage G is pinned at, by the device's memory tier (memTier: each tier's ladder is its
     own, so 0 is the tier's top, which the timed trials picked on every arm timed); the governor steps it after the show */
  var GPIN = { desktop: 0, full: 0, low: 0, lowA: 0 };
  function gFloor() {   // (fast500 step 10: stage G's floor, shared by the timed trials and H's one trial)
    if (GS.pick < 0 && GS.med[0] > 0.65 * 33.34) { bootMark('G floor not met: ' + GS.med[0] + ' ms at 0.35'); hold('stage G: the frame at scale 0.35 takes ' + GS.med[0] + ' ms (over 21.7)'); }
    return true;
  }
  /* (fast500 step 10, S10e) G pinned: the one timed trial left at load, in H's frame: the frame at 0.35 of today's size
     (GS.sc[0]) drawn GS.m times and read, G's way (two round trips timed, their median subtracted); over the floor,
     once more (a first draw at a size can carry a one-off cost); over it both times the world is held (hold), as at
     stage G's floor. Not under reduced motion, after a restore, in development or when G ran trials */
  function hTrial() {
    if (GS.hT || !GS.pinned || BOOT.restore || reduced() || DEVMODE || HELD) return true;
    GS.hT = true;
    var V = SIM.V, t0, ms, k, q;
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.win.f); gl.viewport(0, 0, 1, 1);
    for (k = 0; k < 2; k++) { t0 = clockNow(); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GS.px); GS.rt.push(clockNow() - t0); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (k = 0; k < 2; k++) {
      TRIALSC = GS.sc[0]; TRIAL = true; t0 = clockNow();
      for (q = 0; q < GS.m; q++) drawFrame(V, SIM.u);
      gl.bindFramebuffer(gl.FRAMEBUFFER, TG.win.f); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GS.px);
      ms = (clockNow() - t0 - median(GS.rt)) / GS.m;
      TRIALSC = 0; TRIAL = false; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      GS.tr[0].push(+ms.toFixed(2));
      if (ms <= 0.65 * 33.34) break;
    }
    GS.med[0] = +Math.min.apply(null, GS.tr[0]).toFixed(2); GS.pick = GS.med[0] <= 0.65 * 33.34 ? 0 : -1;
    bootMark('G trial in H: ' + GS.med[0] + ' ms at ' + GS.sc[0]);
    return gFloor();
  }
  var TRIALSC = 0, TRIAL = false, G_TRIALS = 3;   // (speed E5: three timed trials a scale, were five)
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[b.length >> 1] : 0; }
  function bootPeriod() {   // the display's period from the boot's own frames (their quickest quarter: the boot's long frames aside)
    var d = []; for (var i = 1; i < BOOT.ts.length; i++) { var x = BOOT.ts[i] - BOOT.ts[i - 1]; if (x > 4 && x < 200) d.push(x); }
    if (d.length < 4) return 1000 / 60;
    d.sort(function (a, b) { return a - b; });
    return clamp(d[Math.floor(d.length * 0.25)], 6.9, 34);
  }
  function stageG() {
    if (GS.done) return true;
    if (!SW.gtrial || (DEVMODE && SW.gtrial < 2)) { if (!DEVMODE) RUNG = Math.min(GPIN[memTier()] | 0, RUNGS.length - 1); GS.done = true; GS.pinned = true; GS.rung = RUNG; bootMark('G pinned (rung ' + RUNG + ')'); return true; }   // (fast500 step 10: pinned by the device tier, GPIN, no timed trials at load; development keeps the rung it asks)
    if (!GS.P) { GS.P = bootPeriod(); bootMark('G period ' + GS.P.toFixed(2) + ' ms'); }
    var V = SIM.V, t0, ms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.win.f); gl.viewport(0, 0, 1, 1);
    if (GS.rt.length < 3) {   // the round trip: a clear and the read alone
      t0 = clockNow(); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GS.px); GS.rt.push(clockNow() - t0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return false;
    }
    var sc = GS.sc[GS.i];
    TRIALSC = sc; TRIAL = true;
    t0 = clockNow();
    for (var q = 0; q < GS.m; q++) drawFrame(V, SIM.u);
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.win.f); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GS.px);
    ms = (clockNow() - t0 - median(GS.rt)) / GS.m;
    TRIALSC = 0; TRIAL = false; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    GS.tr[GS.i].push(+ms.toFixed(2));
    if (GS.tr[GS.i].length < G_TRIALS && !(GS.i > 0 && GS.tr[GS.i].length >= 2 && Math.min(ms, GS.tr[GS.i][GS.tr[GS.i].length - 2]) > 2 * 0.65 * GS.P)) return false;   // (speed E11: two trials running far over the bar need no third; one alone may be the visit's first full-size draw, a one-off cost)
    var med = median(GS.tr[GS.i]); GS.med[GS.i] = +med.toFixed(2);
    // (speed E5) from the full scale down: the first scale within the bar is the largest (ascending took the last before the
    // first over it: the same for a cost that grows with the scale); none within it, the floor's test as before
    if (med <= 0.65 * GS.P) GS.pick = GS.i;
    else if (GS.i > 0) { GS.i--; return false; }
    else GS.pick = -1;
    GS.done = true;
    if (!gFloor()) return false;
    if (HELD) { RUNG = 0; GS.rung = 0; return true; }   // (held: drawn once at the tier's top)
    var s = GS.pick < 0 ? GS.sc[0] : GS.sc[GS.pick], ru = RUNGS.length - 1;   // (stage2 quality Q3: the lowest trial is 0.35 of today's size)
    for (var k = 0; k < RUNGS.length; k++) if (RUNGS[k] <= s + 1e-6) { ru = k; break; }
    RUNG = ru; GS.rung = ru;
    bootMark('G measured: scale ' + s + ' (rung ' + ru + '), medians ' + GS.med.join('/') + ' ms, period ' + GS.P.toFixed(1));
    return true;
  }
