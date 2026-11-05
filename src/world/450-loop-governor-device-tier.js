  /* ---------------------------------------------------------------- the loop, the governor, the device tier */
  var PREP0 = 0;   // (round 3: the frame the reduced motion's still sky began planning on)
  var STILLTS = -1;   // (Fix 2: the rAF time the reduced motion's still was first drawn; it is drawn again for a tenth of a second: WebKit's unpreserved buffer)
  var SHOWNT = -1;
  var TIER = 1, CLK = new Float64Array([0, -1]), running = false, rafId = 0, shown = false, NEEDSIZE = false, SKYMARK = null, DEAD = false, GAVEUP = false, READY = false, FRAMEN = 0;
  /* the governor: every frame's time in a ring (two seconds); each second, the median. Never asked to beat 60 Hz.
     Three slow seconds in a row (median over 1.35 frames of the period) step the render scale down a rung; three
     seconds later, if the step did not help, one more rung is tried (a cost quantised by the display's sync needs two
     steps to show its knee); if neither helped, both are undone and the frame time they could not beat is learnt as
     the period (a 30 fps cap is then simply the pace). No step is taken while one is on trial. Twenty seconds at ease
     step back up. The floor: ten seconds at under half the pace at the last rung, or under 15 fps with the period
     learnt at its 50 ms ceiling (a cost the scale cannot touch: vertex work, the CPU, the driver) at any rung, give
     up: the loop stops and the still sky stays. */
  var GOVD = new Float32Array(120), GOVS = new Float32Array(120), GOVN = new Float64Array(18), FRAME60 = 1000 / 60;
  /* (stage2 quality Q5) the first ascent: QUP[0] the governor's seconds since the world showed, QUP[1] 1 until its first
     step down; while both hold (the first QUP_S s), QUP_EASE s at ease step up a rung (else GOVN[11], 20 s) */
  var QUP = new Float64Array([0, 1]), QUP_S = 20, QUP_EASE = 3;
  function govReset() { GOVN.fill(0); GOVN[10] = 60; GOVN[11] = 20; GOVN[12] = 1e9; GOVN[13] = FRAME60; QUP[0] = 0; QUP[1] = 1; }
  govReset();
  function governor(dtMs, force) {
    if ((STILLMODE || OPT.nogov) && !force) return;
    if (!(dtMs > 0) || dtMs > 1000) return;   // (a hidden tab's gap)
    GOVD[GOVN[1]] = dtMs; GOVN[1] = (GOVN[1] + 1) % 120; GOVN[0] = Math.min(GOVN[0] + 1, 120);
    GOVN[5] += dtMs;
    if (GOVN[5] < 1000 || GOVN[0] < 20) return;
    GOVN[5] = 0;
    var n = GOVN[0], i;
    for (i = 0; i < 120; i++) GOVS[i] = i < n ? GOVD[(GOVN[1] - 1 - i + 240) % 120] : 1e9;   // the last n samples
    GOVS.sort();
    var p50 = GOVS[Math.floor(n * 0.5)], p10 = GOVS[Math.floor(n * 0.1)]; GOVN[2] = p50;
    GOVN[8] += 1; GOVN[12] += 1; if (GOVN[6] > 0) GOVN[6] -= 1; QUP[0] += 1;
    if (GOVN[13] > FRAME60 && p10 < GOVN[13] * 0.8) { GOVN[15] += 1; if (GOVN[15] >= 5) { GOVN[13] = Math.max(FRAME60, p50); GOVN[15] = 0; } } else GOVN[15] = 0;
    var PER = GOVN[13];
    var stuck = (RUNG === RUNGS.length - 1 && p50 > 2 * PER) || (PER >= 49.9 && p50 > 1.3 * PER);   // (under 15 fps that the scale cannot help)
    if (stuck) { GOVN[14] += 1; if (GOVN[14] >= 10) { GOVN[14] = force ? -1e9 : 0; if (!force) giveUp(); return; } } else if (GOVN[14] > 0) GOVN[14] = 0;
    if (GOVN[9] === 1 && GOVN[8] >= 3) {
      GOVN[9] = 0;
      if (p50 > GOVN[7] * 0.85 && RUNG > 0) {
        if (GOVN[16] === 0 && RUNG < RUNGS.length - 1) { GOVN[16] = 1; RUNG++; GOVN[3] = 0; GOVN[8] = 0; GOVN[9] = 1; GOVN[0] = 0; return; }
        RUNG = Math.max(RUNG - 1 - GOVN[16], 0); GOVN[16] = 0;
        GOVN[6] = GOVN[10]; GOVN[10] = Math.min(GOVN[10] * 2, 960); GOVN[13] = clamp(Math.max(GOVN[7], p50), FRAME60, 50); GOVN[0] = 0; return;
      }
      GOVN[16] = 0; GOVN[10] = 60;
    }
    if (p50 > PER * 1.35) {
      GOVN[3] += 1; GOVN[4] = 0;
      if (GOVN[3] >= 3 && GOVN[6] <= 0 && GOVN[9] === 0 && RUNG < RUNGS.length - 1) {   // (never while a step is on trial)
        if (GOVN[12] < 10) GOVN[11] = Math.min(GOVN[11] * 2, 160);
        GOVN[7] = p50; RUNG++; GOVN[3] = 0; GOVN[8] = 0; GOVN[9] = 1; GOVN[0] = 0; GOVN[16] = 0; QUP[1] = 0;
      }
    } else {
      GOVN[3] = 0;
      if (p50 < PER * 1.12) { GOVN[4] += 1; if (GOVN[4] >= (QUP[1] && QUP[0] <= QUP_S ? QUP_EASE : GOVN[11]) && RUNG > 0 && GOVN[6] <= 0) { RUNG--; GOVN[4] = 0; GOVN[0] = 0; GOVN[12] = 0; } } else GOVN[4] = 0;
    }
  }
  /* too slow even so: the world steps aside for the stylesheet's still sky (the words to its colours) */
  /* (Fix 3, W4) the still sky under the canvas is the hour's until the canvas hides: data-sky is never written while
     the canvas shows (nor at boot: the hour's still sky snapped to the realm's in one frame, rain's grey-green to
     ABOVE's blue at 0.6-2.0 s, verify-regress-2's lose and rm runs); when it hides (a lost context, the world giving up,
     forced colours, the record's quiet tail) the realm it was drawing is marked, once, so the words the stylesheet then
     gives (the realm's, dark) are the words that were showing */
  function markStill() { if (SKYMARK && root.getAttribute('data-sky') !== SKYMARK) root.setAttribute('data-sky', SKYMARK); skyThemeStill(SKYMARK || root.getAttribute('data-sky')); }   // (tod: the browser's bar takes the still's top; never shown, the hour's group's still)
  function giveUp() { DEAD = true; GAVEUP = true; stop(); shown = false; canvas.classList.remove('on'); markStill(); clearWords(); recMark('gave up'); }
  /* (E1) the boot declines (stage G's floor not met, a first frame doubted twice, a broken engine program): the canvas
     never shows; the hour's still sky stays */
  function decline(why) { DEAD = true; GAVEUP = true; BOOT.declined = why; stop(); shown = false; canvas.classList.remove('on'); markStill(); clearWords(); recMark('declined: ' + why); fail('declined: ' + why); }
  function render() {
    if (LOST || DEAD || gl.isContextLost() || !TG) return false;
    var V = SIM.V; if (!V || !visitBuilt(V) || !V.def.P || V.def.P.st !== 2) return false;
    TIER = RUNGS[RUNG] < 0.65 * QK ? 0.6 : 1;   // (stage2 quality Q3, review 1: keyed on today's size, QK; the rungs are rounded to 4 places)
    var ur = SIM.u - (1 - SIM.alpha) * SIM_DT;   // (Fix 3: between the last two steps at the junction too)
    setWords(INK);   // (stage2: the words are always light: the root's text and selection; world6 fix: before the frame, so its adaptive greys and floors (agUpdate) are the first frame's too)
    if (!shown) inkRestart(true);   // (ink fix: the words' reading begins with the first frame shown: the boot's hidden check frame (stage H), a restored world's too, is never taken)
    lateStep(); lateWarm();   // (fast500 step 9: before the frame, so its composite covers the canvas's warm corner)
    drawFrame(V, ur);
    SKYMARK = SKYI.group || V.def.still;   // (tod: the current sky's time of day, the world's still sky for it, marked only when the canvas hides: markStill; Fix 3)
    skyTheme(false);   // (tod: the browser's bars follow the drawn sky)
    if (!shown) { shown = true; canvas.classList.add('on'); SHOWNT = SIM.t; recShown(); BOOT.shownAt = clockNow(); AG.w0 = BOOT.shownAt; }   // (ink fix: AG.w0, the moment the canvas shows: the take waits INK_TAKE s from it, however long the first frame took)   // (fast500, no fades: the canvas shows at once, a cut, this frame drawn whole)
    return true;
  }
  /* at the start the engine, the first visit and its cells about the origin are built a step a frame while the
     stylesheet's still sky shows; the journey's clock starts with the first frame drawn */
  function heading0() { return RNG(subseed(J.seed, 77)).r(0, 2 * PI); }

