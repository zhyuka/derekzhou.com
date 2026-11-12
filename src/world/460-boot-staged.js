  /* H: the first real frame, drawn into the hidden canvas and read back small (sky.v2's rule): true once it looks like
     a sky; a frame doubted twice declines */
  function stageH() {
    if (BOOT.hOk) return true;
    var V = SIM.V; if (!V || !TG) return false;
    if (V.LA && !SKY.e) return false;   // (fast500 no-fades: the first frame checked once the cycle has stepped: a moonlit landing has its plan and its moon in it)
    if (!hTrial()) return false;   // (fast500 step 10: G's one trial left, in this frame)
    var ur = SIM.u - (1 - SIM.alpha) * SIM_DT;   // (Fix 3: between the last two steps at the junction too)
    drawFrame(V, ur);
    if (!BOOT.thumb) BOOT.thumb = target(16, 16, 'rgba8');
    var T = BOOT.thumb, px = new Uint8Array(16 * 16 * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, DIRECT ? null : TG.win.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.f);
    gl.blitFramebuffer(0, 0, OUT.w, OUT.h, 0, 0, 16, 16, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (DEVMODE && SW.hblack) px.fill(0);   // (dev: a forced-black first frame, the fallback's test)
    var sum = 0, same = true, i, lo = 255, hi = 0;
    for (i = 0; i < 256; i++) { var y = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]; sum += y; if (y < lo) lo = y; if (y > hi) hi = y; if (px[i * 4] !== px[0] || px[i * 4 + 1] !== px[1] || px[i * 4 + 2] !== px[2]) same = false; }
    var mean = sum / 256, doubt = mean < 3 || mean > 252 || same;
    BOOT.thumbStat = { mean: +mean.toFixed(1), lo: +lo.toFixed(1), hi: +hi.toFixed(1), same: same };
    if (!doubt) { BOOT.hOk = true; bootMark('H first frame looks like a sky (mean ' + mean.toFixed(1) + ')'); return true; }
    BOOT.hFails++; bootMark('H first frame doubted (' + BOOT.hFails + ': mean ' + mean.toFixed(1) + (same ? ', blank' : '') + ')');
    if (BOOT.hFails >= 2) decline('the first frame doubted twice');
    return false;
  }
  /* (E1.1 Fix 2, S10: verify-gates-1 defect 8, verify-regress-1 defect 10) a handler reads no layout and writes no DOM:
     what it would write (the canvas hidden, the still sky marked, the words' colours cleared,
     data-steer, the selection cleared) and what it would read (the words' boxes, the touch mode) is stored here
     and done at the start of the next animation frame: the loop's own (frameBody), or, the loop stopped, a frame of its
     own (domNext) */
  var DOMQ = { hide: false, fc: false, words: false, touch: false, steer: -1, unsel: false }, DOMRAF = 0;
  function domNext() { if (!DOMRAF) DOMRAF = requestAnimationFrame(function () { DOMRAF = 0; domFlush(); }); }
  function domFlush() {
    if (DOMQ.hide) { DOMQ.hide = false; if (!shown) { canvas.classList.remove('on'); markStill(); clearWords(); } }
    if (DOMQ.fc) { DOMQ.fc = false; if (forced() && !LOST && !DEAD) fstart(); }
    if (DOMQ.steer >= 0) { if (DOMQ.steer) root.setAttribute('data-steer', ''); else root.removeAttribute('data-steer'); DOMQ.steer = -1; }
    if (DOMQ.unsel) { DOMQ.unsel = false; var sel = window.getSelection ? window.getSelection() : null; if (sel && sel.removeAllRanges) sel.removeAllRanges(); }
    if (DOMQ.touch) { DOMQ.touch = false; touchMode(); }
    if (DOMQ.words) {
      DOMQ.words = false; measureWords(); touchMode();
      if (!running && !LOST && shown && READY && !forced()) { resize(); render(); }   // (a still frame (reduced motion) drawn again, so the veil is where the words are)
    }
  }
  function frame(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    domFlush();
    if (REC) recStart(ts);
    if (BIRDF && !BIRDS && !LATEB.dead) birdsLate();   // (fast500 4a: the ink birds' module made, and if late linked and warmed, here)
    frameBody(ts);
    if (REC) recEnd(ts);
  }
  /* (E1) the read-back's rhythm (the switch fence): 1 at the frame's start every frame (the design's), 2 every second
     frame, 3 polled at the start and fenced after the flush, 0 all but off (every eighth frame: the flight on its last
     ground) */
  function fenceDue() { var f = SW.fence; return f === 1 || f === 3 ? true : f === 2 ? FRAMEN % 2 === 0 : FRAMEN % 8 === 0; }
  /* (E1) the rest of the boot behind the still, once reduced motion ends (F and G), and a restore's own end */
  function bootTail() {
    if (!WARM.done) { warmStep(false, clockNow() + BOOT_MS); if (WARM.done) bootMark('F warmed (after the still)'); if (!represent()) render(); return false; }   // (the canvas's keys were drawn into its corner: the still put back over them)
    if (!GS.done) { var ok = stageG(); if (!represent()) render(); return ok; }
    return true;
  }
  function frameBody(ts) {
    var dt = CLK[1] === -2 ? HOLD_P : CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; FRAMEN++;   // (first-paint preview: -2, the first animation frame after the hold, one hold frame on)
    var dtRaw = dt;   // (the interval itself, for the bake's learning)
    if (TSCALE !== 1) dt *= TSCALE;
    if (SUPPRESS && FRAMEN > SUPPRESS_F + 3) SUPPRESS = false;   // (a drag's click comes at once, or never)
    if (gl.isContextLost()) return;
    prof('frame');
    if (!READY && !TG) resize();   // (speed E12: a canvas not laid out at boot() made no targets: made in the first frame it is; fast500's deep sweep: so are a boot's or a restore's under forced colours, which make none, once they end)
    if (!READY) { if (REC && REC.bootStartAt < 0) { REC.bootStartAt = clockNow(); recMark('boot: first frame'); } bootFrame(ts); prof('boot'); if (!READY || reduced()) return; }   // (fast500 step 10: once READY, on to stage H in this frame; the show the next)
    if (dt0) { dt0 = false; dt = 0; }
    if (reduced() && !STILLMODE) {   // one still frame (round 3: the birds' still sky planned first, a share a frame, while the still sky shows)
      var fresh = false; if (NEEDSIZE) { NEEDSIZE = false; resize(); fresh = true; if (REC) recResized(); } if (!SIM.V) simAdvance(SIM_DT);
      if (STILLTS < 0 && BIRDS && BIRDS.prepare) {   // (round 3, second part: each call timed against the birds' budget, BIRDB.prep ms of it: nothing else runs in these frames)
        BIRDB.spent = BIRDB.ms - BIRDB.prep; BIRDB.at = clockNow(); var prepared = BIRDS.prepare(); BIRDB.at = 0; BIRDB.spent = 0;
        if (!prepared && FRAMEN - PREP0 < 120) return;
      }
      if (!shown && !stageH()) return;   // (E1: stage H for the still too)
      /* (Fix 2) the still is drawn again, the same still (no time passes), every frame for a tenth of a
         second, then the loop stops: a browser may present the canvas after any frame that
         drew at all, and WebKit, its drawing buffer not preserved, put up a cleared one (a black
         page, the black name gone). sky.v2's own rule (fadeUntil). After the first, the frame is put up again
         (represent: the composite or its copy, and the birds' ink), not drawn whole, unless the window changed */
      if (STILLTS < 0 || fresh || !represent()) { if (!render()) return; }
      if (STILLTS < 0) STILLTS = ts;
      if (ts - STILLTS >= 100) { STILLTS = -1; stop(); }
      return;
    }
    STILLTS = -1;
    if (HELD) {   // the world held (hold): stage H's check, the frame drawn whole once, then put up again with the ink birds moving over it
      if (!shown && !BOOT.hOk) { stageH(); return; }
      var hf = HDRAW; HDRAW = false;
      if (NEEDSIZE) { NEEDSIZE = false; resize(); hf = true; if (REC) recResized(); }
      if (shown && BIRDS && SW.birds && !SW.noanim && lateBirds()) {
        HACC += Math.min(dt, 100) / 1000; var hn = 0; BIRDB.spent = 0;
        while (HACC >= SIM_DT && hn < NMAX) { BIRDB.at = clockNow(); BIRDS.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; HACC -= SIM_DT; hn++; }
        if (hn >= NMAX) HACC = 0;
        HALPHA = clamp(HACC / SIM_DT, 0, 1);
      }
      if (!shown || hf) render(); else { lateStep(); lateWarmProgs(); if (!represent()) render(); }
      gl.flush();
      return;
    }
    if (shown && (!WARM.done || !GS.done)) { bootTail(); return; }   // (reduced motion ended: F and G behind the still, then the flight)
    // the read-back and the frame's fence (design-v5 4.3 steps 2-3, 7.5)
    var fd = fenceDue();
    if (fd) rbPoll();
    if (shown) bakeLearn(fd, dtRaw);
    if (fd && SW.fence !== 3) rbFence();
    prof('poll');
    /* (E1) stage H: the first frame checked in the hidden canvas; the canvas shows in the next frame */
    if (!shown && !BOOT.hOk) { if (stageH()) recMark('H passed (the world shows next frame)'); return; }
    governor(dt);
    if (NEEDSIZE) { NEEDSIZE = false; resize(); if (REC) recResized(); }
    easeFrustum(Math.min(dt, 100) / 1000);
    moonEase(Math.min(dt, 100) / 1000);   // (fast500 no-fades: a height-only re-plan's offset, the frustum's own constant)
    WORK.verts = WORK.layers = WORK.layouts = WORK.uploads = WORK.resolves = 0;
    BIRDB.spent = 0;
    SIM.fdt = Math.min(dt / 1000, DTMAX);   // (the flight's time a frame, for the next visit's deadline)
    if (SW.order === 0) { gpuJobs(); prof('jobs'); }
    simAdvance(dt / 1000); prof('sim');
    CLK[0] = SIM.t;
    render(); prof('end');
    gl.flush();
    if (SW.order === 1) { gpuJobs(); gl.flush(); prof('jobs'); }
    if (fd && SW.fence === 3) rbFence();
    cpuSlice(); prof('slice');
  }
  function start() {
    if (running || LOST || DEAD || forced()) return;
    running = true; CLK[1] = -1; rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
  /* (E1.1, S10) a still drawn again (reduced motion's, the loop stopped): in the next animation frame, the window
     measured there if a handler marked it (NEEDSIZE); handlers only store */
  var STILLRAF = 0;
  function stillNext() {
    if (STILLRAF) return;
    STILLRAF = requestAnimationFrame(function () { STILLRAF = 0; if (running || LOST || DEAD || !READY || forced()) return; if (NEEDSIZE || !TG) { NEEDSIZE = false; resize(); } render(); });
  }
  var SUPPRESS_F = 0;
  /* (pointer) the birds' play's two listeners: on while motion and colours allow it and some pointer hovers, off
     (and the pointer gone) otherwise; called at start and whenever reduced motion or forced colours change */
  function hoverSync() {
    var want = !inert() && !forced() && !!window.matchMedia && window.matchMedia('(any-hover: hover)').matches;
    if (want && !HOVERON) { HOVERON = true; window.addEventListener('pointermove', onHover, { capture: true, passive: true }); window.addEventListener('pointerout', onHoverOut, { capture: true, passive: true }); }
    else if (!want && HOVERON) { HOVERON = false; window.removeEventListener('pointermove', onHover, { capture: true, passive: true }); window.removeEventListener('pointerout', onHoverOut, { capture: true, passive: true }); }
    if (!want) HOVER.gone = true;
  }

