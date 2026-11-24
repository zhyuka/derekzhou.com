  /* ---------------------------------------------------------------- programs */
  /* (E1, design-v5 8.4) every program the page will ever draw with is registered before the world shows, and the boot's
     stage C makes them, one at a time (Fix 2: progStep). After the world shows nothing is compiled, linked or asked (S1, S3;
     fast500 step 9: with the parallel compile the late ones, issued with the rest, have their completion asked after it: lateStep):
     compile() then fails loudly (dev: throws), and the programs' uniforms are the ones read once at the link.
     A context lost under a query is reported as such (LOSTP), never as a broken program. */
  var PROGS = [];   // (every program, in the order registered)
  var PROGX = { compiled: 0, linked: 0, finished: 0, broken: 0, cur: null };   // (stage C's progress, for the boot's timeline; cur: the program in flight, Fix 2)
  function compile(vs, fs, name) {
    if (shown && !STILLMODE) { fail('program ' + name + ' asked for after the world showed (S1)'); if (DEVMODE) throw new Error('S1: program ' + name + ' after show'); }
    var P = { p: null, name: name, u: null, ok: false, vs: vs, fs: fs, v: null, f: null, st: 0 };   // st: 0 registered, 1 compiled, 2 linked (status not asked), 3 finished
    PROGS.push(P);
    return P;
  }
  /* stage C (Fix 2 of round E1: one program at a time). Round E1 first compiled every shader and linked every program
     in as few slices as the calls allowed and then asked their status a frame at a time; but a deadline cannot split a
     call, and where the calls are messages to a GPU process (WebKit, iOS) that was all of them at once: the owner's
     first iPhone record shows one boot frame of 20,442 ms and fifteen programs stamped done within 3 ms of each other
     (round E0's batch). Now one program is in flight at a time: its two shaders given and compiled and the program
     linked, one flush; then nothing else synchronous is asked while it is outstanding (the boot's read-back waits for
     stage E) but its own completion, once a frame (with KHR_parallel_shader_compile a query that never waits for the
     link; without it the link status itself, a frame after the link went out: a wait for that one program alone); the
     next is issued only once it has reported done, in the next frame (Fix 3). The order: the volume programs (vdens, vlight,
     vbody), then the realms' surfaces and landmarks, then the rest as registered. Each program keeps when it was issued
     and when it was found done (clock and frame), its completion queries and their time, so the record can say which
     program is slow (rec.bootStages.programs.one). sync (the harness's stills, a context restored under them): every
     program at once, as before. Returns true once every program is finished, false while not yet, LOSTP if the
     context went; a broken program (its link failed) is finished with ok false and named in fail() */
  var PORDER = null, VOLP = ['engine.vdens', 'engine.vlight', 'engine.vbody'];
  function progOrder() {
    var a = [], b = [], c = [], i, n;
    for (i = 0; i < PROGS.length; i++) {
      n = PROGS[i].name;
      if (VOLP.indexOf(n) >= 0) a.push(PROGS[i]);
      else if (n.indexOf('engine.') !== 0 && n.indexOf('birds:') !== 0 && /\.(surface\d+|landmark|landmarkInst)$/.test(n)) b.push(PROGS[i]);
      else c.push(PROGS[i]);
    }
    a.sort(function (x, y) { return VOLP.indexOf(x.name) - VOLP.indexOf(y.name); });
    if (EXT.parAll || EXT.parWK) {   // (speed E2: all at once, the heaviest first: the probe and the land's first surface; WebKit too)
      var h = [], r = [], all = a.concat(b, c);
      for (i = 0; i < all.length; i++) (/\.(probe|surface0|hp\.\w+)$/.test(all[i].name) ? h : r).push(all[i]);
      h.sort(function (x, y) { return /** @type {any} */ (/probe$/.test(y.name)) - /** @type {any} */ (/probe$/.test(x.name)); });
      /* (load-perf, 2026-11-15) the programs the show never waits for (LATE_ALWAYS: 073) last: a GPU that compiles the
         batch one program after another (the lab's phones) has the show's done that much sooner */
      var lt = [], rr = [];
      for (i = 0; i < r.length; i++) (LATE_ALWAYS.indexOf(r[i].name) >= 0 ? lt : rr).push(r[i]);
      return h.concat(rr, lt);
    }
    return a.concat(b, c);
  }
  function progIssue(P) {
    var tc = clockNow();
    foldIssue(P);   // (fast500 lane E: the folds, before the text is given)
    var dx = DEFS + defsA(); P.vs = glslPrune(P.vs, dx); P.fs = glslPrune(P.fs, dx);   // (load-perf: the functions main never reaches left out: 071)
    P.kb = Math.round((P.vs.length + P.fs.length) / 1024);
    P.p = gl.createProgram();
    P.v = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(P.v, P.vs.replace('#version 300 es\n', '#version 300 es\n' + DEFS + defsA())); gl.compileShader(P.v);
    P.f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(P.f, P.fs.replace('#version 300 es\n', '#version 300 es\n' + DEFS + defsA())); gl.compileShader(P.f);
    P.vs = P.fs = null; P.st = 1; PROGX.compiled++;
    P.cms = +(clockNow() - tc).toFixed(2);   // (the main thread's share of its compile)
    var tl = clockNow(); gl.attachShader(P.p, P.v); gl.attachShader(P.p, P.f); gl.linkProgram(P.p); P.st = 2; PROGX.linked++; P.lms = +(clockNow() - tl).toFixed(2);
    P.issAt = +tc.toFixed(1); P.issF = FRAMEN; P.polls = 0; P.qms = 0;
  }
  /* (fast500 lane E, class A: e8.py E8z) the page's constant modes as defines, computed once from its own data at the
     first issue and given after DEFS to every program the boot issues (never set by hand; negative, so a program
     compiled without them keeps today's text): NO_TWILIGHT (no two skies' words differ; every sky's words are light, so
     the twilight's low mist in lib-air.glsl, and uTwM, are compiled out: their text stays so that no vertex shader's
     changes), NO_RAIN (no sky's post.rain, no kit's rain), NO_WATER (no realm's GLSL calls waterShade). CLA.dev marks real dev use (DBG, SS > 1 or the dev switch dbg at load;
     never DEVMODE alone, so the audits compile the shipped text): without it uDbg is folded to 0 (foldFixed).
     Restores reuse them (the same text) */
  var CLA = null;
  function claScan(o, d, st) {   // a number > 0 under a key 'rain' anywhere in a kit (its lights, areas, kits)
    if (!o || typeof o !== 'object' || d > 8 || ArrayBuffer.isView(o) || st.seen.indexOf(o) >= 0) return false;
    st.seen.push(o);
    for (var k in o) {
      if (++st.n > 50000) return true;   // (too big to read: taken as raining)
      var v = o[k];
      if (k === 'rain' && typeof v === 'number' && v > 0) return true;
      if (v && typeof v === 'object' && claScan(v, d + 1, st)) return true;
    }
    return false;
  }
  function claCompute() {
    var c = { twilight: false, rain: false, water: false, dev: false }, id, ws = {}, nw = 0, st = { seen: [], n: 0 }, i;
    for (id in WSKY) { var S = WSKY[id]; if (!ws[S.w]) { ws[S.w] = 1; nw++; } if (S.post && S.post.rain) c.rain = true; }
    c.twilight = nw > 1;
    for (id in KITS) if (!c.rain && claScan(KITS[id], 0, st)) c.rain = true;
    for (i = 0; i < ORDER.length; i++) {
      var d = REALMS[ORDER[i]]; if (!d) continue;
      if (/\bwaterShade\s*\(/.test(d.glsl || '')) c.water = true;
    }
    c.dev = !!DEVMODE && (DBG !== 0 || SS > 1 || /(^|[\s,;])dbg(=|[\s,;]|$)/.test(String(OPT.sw || '')));
    return c;
  }
  function defsA() {
    if (!CLA) { CLA = claCompute(); CLA.defs = (CLA.twilight ? '' : '#define NO_TWILIGHT\n') + (CLA.rain ? '' : '#define NO_RAIN\n') + (CLA.water ? '' : '#define NO_WATER\n'); }
    return CLA.defs;
  }
  function progDone(P) {   // its status read (and its uniforms): true linked, false broken, LOSTP
    var tf = clockNow(), r = finish(P);
    if (r === LOSTP) return LOSTP;
    P.fms = +(clockNow() - tf).toFixed(2); P.doneAt = +clockNow().toFixed(1); P.doneF = FRAMEN;
    PROGX.finished++; if (!r) PROGX.broken++;
    return r;
  }
  /* (load-perf, the audit's boot-fence-gated-poll, 2026-11-14) a fence behind the batch, and no status asked of any
     program until it signals. A program's first status read (COMPLETION_STATUS_KHR, or LINK_STATUS without the
     extension) waits in the renderer for the GPU process to have run the batch; where a driver compiles the batch
     serially, that is the whole batch (the lab's phones: the main thread frozen 2.4-2.7 s in one read, no frame, no
     tap). The fence's status is the GPU process's answer, read without waiting, so the frames go on while the batch
     compiles and the first read comes once there is nothing left to wait for. Not under the hold (its frames run in one
     task, where no fence can signal: bootFence's rule), nor past PFENCE_MAX frames (a fence that never answers never
     holds the boot) */
  var PFENCE = null, PFENCE_F = 0, PFENCE_G = -1, PFENCE_MAX = 600;   // (PFENCE_G: the context it was made in; a restored context's boot never reads the lost one's)
  /* (the hub's review, 2026-11-14) every later issue (a program unheld after the batch, the late ink birds') puts a new
     fence behind it in place of one still pending, and every status read waits for it: the late birds' too (birdsLate) */
  function progFence() { if (HOLD.on) return; if (PFENCE && PFENCE_G === MEMN.restored) gl.deleteSync(PFENCE); PFENCE = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); PFENCE_F = FRAMEN; PFENCE_G = MEMN.restored; }
  function progFenced() {
    if (PFENCE && PFENCE_G !== MEMN.restored) PFENCE = null;
    if (!PFENCE) return true;
    if (gl.getSyncParameter(PFENCE, gl.SYNC_STATUS) !== gl.SIGNALED && FRAMEN - PFENCE_F < PFENCE_MAX) return false;
    gl.deleteSync(PFENCE); PFENCE = null; return true;
  }
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

