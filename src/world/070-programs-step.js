  function progStep(sync, deadline) {
    var i, P;
    if (gl.isContextLost()) return LOSTP;
    if (sync) {
      for (i = 0; i < PROGS.length; i++) if (PROGS[i].st === 0) progIssue(PROGS[i]);
      gl.flush();
      for (i = 0; i < PROGS.length; i++) { P = PROGS[i]; if (P.st === 2 && progDone(P) === LOSTP) return LOSTP; }
      return true;
    }
    if (!PORDER || PORDER.length !== PROGS.length) PORDER = progOrder();
    if (EXT.parWK) return progStepWK(deadline);
    /* (speed E2) with KHR_parallel_shader_compile every program is issued in one frame, the heaviest first (the probe
       and the land: the critical path), and each one's completion asked once a frame, without waiting; its status
       read as it completes. Without the extension (not WebKit) all at once too, their statuses read one a frame (EXT.issueAll);
       on WebKit all at once too, polled, and nothing else asked of a program until it is done (progStepWK) */
    if (EXT.parAll) {
      var issued = false;
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0 && !lateHeld(PORDER[i])) { progIssue(PORDER[i]); issued = true; }
      if (issued) { progFence(); gl.flush(); if (!BOOT.issuedM) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } return false; }   // (fast500 F0)
      if (!progFenced()) return false;
      var all = true; lateDecide();   // (fast500 step 9)
      for (i = 0; i < PORDER.length; i++) {
        P = PORDER[i]; if (P.st === 3) continue;
        if (P.st !== 2) { if (!(P.st === 0 && P.late)) all = false; continue; }   // (world-perf lane: a held one, late, does not hold the show)
        var tq2 = clockNow(), dn = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR);
        P.polls++; P.qms = +(P.qms + clockNow() - tq2).toFixed(2);
        if (gl.isContextLost()) return LOSTP;
        if (!dn) { if (!P.late) all = false; continue; }   // (fast500 step 9: a late one does not hold the show)
        if (progDone(P) === LOSTP) return LOSTP;
      }
      return all && (progsDone() || lateCore());
    }
    if (EXT.issueAll) {   // (lane D, Android item 1: EXT.issueAll) all issued in one frame, then one status read a frame
      var iss = false;
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) { progIssue(PORDER[i]); iss = true; }
      if (iss) { progFence(); gl.flush(); if (!BOOT.issuedM) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } return false; }
      if (!progFenced()) return false;
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 2) return progDone(PORDER[i]) === LOSTP ? LOSTP : false;
      return progsDone();
    }
    P = PROGX.cur;
    if (P) {   // the one in flight: its completion, once a frame
      if (EXT.par) {
        var tq = clockNow(), done = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR);
        P.polls++; P.qms = +(P.qms + clockNow() - tq).toFixed(2);
        if (gl.isContextLost()) return LOSTP;
        if (!done) return false;
      }
      if (progDone(P) === LOSTP) return LOSTP;
      PROGX.cur = null;
      // (Fix 3) the next one is issued in the next frame: a frame carries one program's calls (its issue, or its
      // completion read), so the record can name the one program a long frame belongs to (Fix 2 read one and issued
      // the next in the same frame, and booked the frame to both)
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) return false;
      for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false;
      return true;
    }
    for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) break;
    if (i >= PORDER.length) { for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false; return true; }
    P = PORDER[i]; progIssue(P); gl.flush(); PROGX.cur = P;
    if (!BOOT.issuedM) { for (i = 0; i < PORDER.length && PORDER[i].st !== 0; i++) { /* the next unissued */ } if (i >= PORDER.length) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } }   // (fast500 F0: the one-at-a-time path's last issue)
    return false;
  }
  /* (WebKit boot) every program issued in one frame (at most WK_FLY in flight when that is over 0), the heaviest first;
     then, once a frame, each one's COMPLETION_STATUS_KHR (a query that never waits for a link, only for the work queued
     before it) and, once it says done, its status and uniforms read (finish), as many as the frame's slice allows, one
     at least. No program is used or asked anything else before its completion. PROGX.q0 keeps the frame's first poll's
     time: what the GPU process still had queued from the last frame (a first draw's pipeline), for warmStepWK */
  var WK_FLY = 0;
  function progStepWK(deadline) {
    var i, P, fly = 0, issued = false, all = true, read = 0;
    PROGX.q0 = -1;
    for (i = 0; i < PORDER.length; i++) {
      P = PORDER[i]; if (P.st !== 2) continue;
      var tq = clockNow(), dn = gl.getProgramParameter(P.p, EXT.parWK.COMPLETION_STATUS_KHR), qm = clockNow() - tq;
      P.polls++; P.qms = +(P.qms + qm).toFixed(2); if (PROGX.q0 < 0) { PROGX.q0 = qm; PROGX.q0F = FRAMEN; }
      if (gl.isContextLost()) return LOSTP;
      if (!dn || (read > 0 && clockNow() > deadline)) { fly++; continue; }
      if (progDone(P) === LOSTP) return LOSTP;
      read++;
    }
    for (i = 0; i < PORDER.length; i++) {
      P = PORDER[i]; if (P.st !== 0) continue;
      if (WK_FLY > 0 && fly >= WK_FLY) break;
      progIssue(P); fly++; issued = true;
    }
    if (issued) {
      gl.flush();
      if (!BOOT.issuedM) { for (i = 0; i < PORDER.length && PORDER[i].st !== 0; i++) { /* the next unissued */ } if (i >= PORDER.length) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } }
    }
    for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) { all = false; break; }
    return all;
  }
  function progsDone() { for (var i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false; return true; }

