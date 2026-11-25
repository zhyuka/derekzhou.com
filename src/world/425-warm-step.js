  /* stage F, a slice: up to WARM_N entries drawn (sync: all); true once the table is through. (Fix 2 of round E1) an
     entry that is its program's first use, or a heavy program's (its link took over WARM_HEAVY ms from issue to done,
     or a draw of it did), is drawn alone in its frame: on ANGLE-Metal a first draw builds its pipeline in the GPU
     process, and WebKit's cold first draws here took 0.5-3.5 s each, so five of them in one frame was one long frame.
     Each program keeps its first use's time and frame (P.firstMs, P.firstF) for the record */
  var WARM_HEAVY = 50;
  function warmHeavy(P) { return !P.warmed || P.heavy || (P.doneAt && P.issAt && P.doneAt - P.issAt > WARM_HEAVY); }
  function warmStep(sync, deadline) {
    if (WARM.done) return true;
    if (!WARM.list) { WARM.list = warmTable(); WARM.i = 0; WARM.keysF = WARM.list.length; }
    var L = WARM.list, n = 0, T = WARM.tg;
    WARM.frames++;
    gl.activeTexture(gl.TEXTURE0);
    /* (speed E8) with the parallel compile: every entry whose program has finished is drawn now, in this frame (the draws
       are queued, never waited on); the rest wait for theirs; a broken program's entries are passed over */
    if (EXT.parWK && !sync) return warmStepWK(L, T);
    if (EXT.parAll && !sync) {
      var left = 0;
      for (var q = 0; q < L.length; q++) {
        var x = L[q]; if (x.done) continue;
        if (!x.p || x.p.st !== 3) { if (!(x.p && x.p.late)) left++; continue; }   // (fast500 step 9: a late one's entry: lateWarm)
        x.done = true; if (!x.p.ok) continue;
        warmDraw(x, T);
      }
      warmReset();
      if (!left) { WARM.i = L.length; WARM.done = true; }
      return WARM.done;
    }
    while (WARM.i < L.length && (sync || EXT.parAll || (n < WARM_N && clockNow() < deadline))) {
      var e = L[WARM.i], alone = !sync && !EXT.parAll && !e.rs && warmHeavy(e.p);   // (speed E4: with the parallel compile (Chrome, Edge; not Firefox, which lacks it: draws are queued, never waited on) the table in one frame)
      if (alone && n > 0) break;   // (alone: the next frame's first)
      WARM.i++;
      if (warmDraw(e, T)) n++;
      if (alone) break;   // (nothing after it in this frame)
    }
    warmReset();
    if (WARM.i >= L.length) { WARM.done = true; return true; }
    return false;
  }
  /* (WebKit boot) one entry a frame, at the frame's end (after the links' polls), in its own final state (its target's
     formats, blend, samples, depth, cull, topology): each first draw builds its Metal pipeline on the GPU process's one
     thread, and builds in one frame add up there (a batch of them froze the owner's iPhone). An entry waits for its
     program's completion; a broken program's entries are passed over. A sync call made while a build runs waits for it
     (the Mac bench: 106-372 ms boot frames), so after a draw the boot makes none (wkHold: no polls, no read-back, no
     draw) until the build should be through: WARM.k ms a KB of the program's source, learnt from each build (wkMeasure:
     the first sync call after the hold, timed). Only when that call came back at once (WK_QFAST: the pipeline was in
     Metal's cache, a return visit) may a draw that is not its program's first use or a heavy one's follow in the same
     frame, up to WARM_N */
  var WK_QFAST = 2;
  function wkHold(now) { return !!EXT.parWK && !WARM.measured && WARM.lastAt > 0 && now - WARM.lastAt < WARM.k * WARM.lastKb; }
  function wkMeasure() {
    if (!EXT.parWK || WARM.measured || !WARM.lastP || gl.isContextLost()) return;
    var t = clockNow(); gl.getProgramParameter(WARM.lastP.p, EXT.parWK.COMPLETION_STATUS_KHR); var e = clockNow(), w = e - t, b = e - WARM.lastAt;
    WARM.measured = true; WARM.qw = w; WARM.qwF = FRAMEN; if (WARM.q.length < 200) WARM.q.push(+w.toFixed(2));
    if (w > 1) WARM.k = 0.5 * WARM.k + 0.5 * b / WARM.lastKb; else WARM.k *= 0.8;   // (waited: the build took about b; at once: the hold was long enough, try shorter)
  }
  function warmStepWK(L, T) {
    var q0 = WARM.qwF === FRAMEN ? WARM.qw : PROGX.q0F === FRAMEN ? PROGX.q0 : -1, n = 0, max = 1, left = 0, kb = 0;
    if (q0 >= 0 && q0 < WK_QFAST && WARM.lastP) max = WARM_N;
    for (var q = 0; q < L.length; q++) {
      var x = L[q]; if (x.done) continue;
      if (!x.p || x.p.st !== 3 || n >= max || (n > 0 && !x.rs && warmHeavy(x.p))) { left++; continue; }
      x.done = true; if (!x.p.ok) continue;
      if (warmDraw(x, T)) { n++; WARM.lastP = x.p; kb += x.rs ? 1 : Math.max(1, x.p.kb || 1); }
    }
    if (n) { WARM.lastAt = clockNow(); WARM.lastKb = kb; WARM.measured = false; }
    warmReset();
    if (!left) { WARM.i = L.length; WARM.done = true; }
    return WARM.done;
  }
  function warmReset() {
    gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.colorMask(true, true, true, true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(true); gl.depthFunc(gl.LESS); gl.cullFace(gl.BACK);
  }
  function warmDraw(e, T) {
      var t0 = clockNow();
      if (e.rs) { resolveMS(T.sceneMS, T.scene, 4, 4); WARM.ms.push([e.n, +(clockNow() - t0).toFixed(2), FRAMEN]); return true; }   // (E1 Fix 3: the resolve, once)
      if (e.tg === 'canvas') { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      else gl.bindFramebuffer(gl.FRAMEBUFFER, T[e.tg].f);
      gl.viewport(0, 0, 4, 4);
      gl.colorMask(!!(e.cm & 1), !!(e.cm & 2), !!(e.cm & 4), !!(e.cm & 8));
      if (e.bl) { gl.enable(gl.BLEND); gl.blendFuncSeparate(e.bl[0], e.bl[1], e.bl[2], e.bl[3]); } else gl.disable(gl.BLEND);
      if (e.dt) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(e.dt); } else gl.disable(gl.DEPTH_TEST);
      gl.depthMask(e.dw);
      if (e.cull) { gl.enable(gl.CULL_FACE); gl.cullFace(e.cull); } else gl.disable(gl.CULL_FACE);
      gl.useProgram(e.p.p); gl.bindVertexArray(e.vao);
      if (e.idx) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GRID.ib[0].b); if (e.inst) gl.drawElementsInstanced(e.mode, e.cnt, gl.UNSIGNED_SHORT, 0, 1); else gl.drawElements(e.mode, e.cnt, gl.UNSIGNED_SHORT, 0); }
      else if (e.inst) gl.drawArraysInstanced(e.mode, 0, e.cnt, 1); else gl.drawArrays(e.mode, 0, e.cnt);
      var ms = clockNow() - t0;
      WARM.ms.push([e.n, +ms.toFixed(2), FRAMEN]);
      if (!e.p.warmed) { e.p.warmed = true; e.p.firstMs = +ms.toFixed(2); e.p.firstF = FRAMEN; e.p.firstAt = +clockNow().toFixed(1); }
      if (ms > WARM_HEAVY) e.p.heavy = true;
      return true;
  }
