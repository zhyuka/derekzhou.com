  /* the flight's fixed pre-roll: the flight's first step (the boot's PREROLL steps behind the still) is
     taken only once what it reads is in: the landing's ground grid (groundCache(V, 0, 0), both halves landed) and
     the obstacles (C.st 2) of every cell within the flight's reach of the landing (the envelope's solids, SOL_R;
     the slip's look ahead and its climbs, nearObstaclesAt(.., max(SLIP_T x speed, SLIP_REACH) + 320); each cell's
     own size; and FLIGHT_REACH_T s of flight more). Then its every step is the same whatever the boot's length or
     shape: a boot that ended before them would change the spring's history for good */
  var PREROLL = 1, FLIGHT_REACH_T = 30;
  function flightIn(V) {
    var g0 = -GCN / 2 * GCCELL;   // (the boot's own grid about the landing: x0 = z0 = floor(0 / 16) x 16 - 320)
    if (!GROUND.ok || GROUND.V !== V || GROUND.x0 !== g0 || GROUND.z0 !== g0) return false;
    var L = V.cellList; if (!L) return false;
    var R = Math.max(SOL_R, Math.max(V.speed * SLIP_T, SLIP_REACH) + 320) + V.speed * FLIGHT_REACH_T;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st >= 2) continue; var r = R + C.bound[3]; if (C.bound[0] * C.bound[0] + C.bound[2] * C.bound[2] <= r * r) return false; }
    return true;
  }
  /* the boot's helpers. visitRun: the visit's stages of one kind, as many as are ready, in one call.
     probeSync: the boot's waiting probes drawn and read at once (the canvas is hidden; the read waits on the GPU, never
     on a frame): every job not yet begun, batched by visit and mode, PROBE_CAP points a batch, as probeRun draws them
     for the stills; the heights are the bytes the ring would bring two frames later. bootSig: what a round moved */
  function visitRun(V, kind) {
    var s0 = -1;
    while (V.st < VSTAGES.length && V.st !== s0 && VKIND[V.st] === kind) { s0 = V.st; visitStep(V, false, kind); }
  }
  function probeSync() {
    for (var g = 0; g < 64; g++) {
      var V = null, mode = 0, jobs = [], n = 0, i, J;
      for (i = 0; i < PJOBS.length; i++) { J = PJOBS[i]; if (J.cancel || J.sent > 0 || J.n > PROBE_CAP) continue; if (!V) { V = J.V; mode = J.mode; } if (J.V !== V || J.mode !== mode) continue; if (n + J.n > PROBE_CAP) break; jobs.push(J); n += J.n; }
      if (!jobs.length || !V.def.P || V.def.P.st !== 2 || !NOISE.done || !V.paramsFlat || !KW.tex) return;
      probeRun(jobs, true);
      for (i = PJOBS.length - 1; i >= 0; i--) if (PJOBS[i].done || PJOBS[i].cancel) PJOBS.splice(i, 1);
      PSTAT.batches++; PSTAT.points += n; if (n > PSTAT.maxPts) PSTAT.maxPts = n;
    }
  }
  /* bootFence, bootIdle: a fence after each of the boot's frames from C's last on (the noise, the warm table and D's own
     draws before it), kept in order until it is passed (a fence's state reaches the page a frame or two after the GPU
     passes it: one remade every frame is never seen passed). D reads at once (probeSync, the ground grid) only once
     the first is passed (C's own frame: a slow device's first draws' compiles) and every one but the last frame's, so a
     read waits on one frame's work at most, never on a queue of the GPU's (the ring until then, the page never held) */
  /* (first-paint preview) in the hold, one task, WebGL 2 changes no fence's status: no fence is made, the GPU counts as
     idle and the boot reads at once (each read waits for its own data) */
  function bootFence() { if (HOLD.on) return; var f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); if (f) BOOT.gq.push(f); }
  function bootIdle() {
    if (HOLD.on) return true;
    var q = BOOT.gq;
    while (q.length && gl.getSyncParameter(q[0], gl.SYNC_STATUS) === gl.SIGNALED) { gl.deleteSync(q.shift()); BOOT.g0 = true; }
    return BOOT.g0 && q.length <= 1;
  }
  function bootFenceDrop() { while (BOOT.gq.length) gl.deleteSync(BOOT.gq.shift()); }
  /* groundRest: the landing's grid begun through the ring in a busy frame (groundCache, not at once: the grid drawn and
     its first half read into the ring), its halves not all read out of the target when the GPU turns idle. Only
     groundRead reads the next half, and the read-at-once branch never calls it, while groundCache(.., true) returns on
     the grid's key, so without it the second half is never read: GROUND.ok never comes, flightIn never holds and the
     boot waits for ever (1 of 6 visits: where the noise is done by C's end, so D's first frame is C's next, still busy).
     The rest read at once, the whole target (it is not drawn again until both halves are read: the same bytes the
     ring brings), and the halves already in the ring dropped (their generation passed: groundHalf) */
  function groundRest() {
    if (GROUND.rd <= 0 || !GCCT) return;
    var px = new Uint8Array(GCN * GCN * 4), P = GROUND.P;
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCCT.f); gl.readPixels(0, 0, GCN, GCN, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    GROUND.rd = 0; GROUND.got = 0; GROUND.gen++; P.gen = GROUND.gen;
    groundLand(px, P.V, P.x0, P.z0);
  }
  function bootProbing(V) {   // a cell not yet laid out, or one whose probes probeSync has still to read
    var L = V.cellList; if (!L) return true;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st === 0) return true; if (C.st === 1 && C.job && !C.job.done && !C.job.cancel && !C.job.sent && C.job.n <= PROBE_CAP) return true; }
    return false;
  }
  function bootSig(V) {
    var L = V.cellList || [], a = 0, b = 0, c = 0;
    for (var i = 0; i < L.length; i++) { a += L[i].st; b += L[i].bi; c += L[i].vi || 0; }
    return [V.st, L.length, a, b, c, PJOBS.length, GROUND.gen2 || 0, WORK.layouts + WORK.resolves + WORK.verts + WORK.uploads + WORK.layers].join(',');
  }
  /* bootNeed: a distance weight over 0 about (cx, cz), the cell's own or one of its cloud bodies' (known once it is
     resolved), m metres nearer. bootReady: the show's test: every cell of the wanted set resolved, every needed
     one (BOOT_M nearer: the pre-roll's step and rounding) whole, no full rebuild waiting */
  function bootNeed(V, C, cx, cz, m) {
    if (distFadeAt(V, C.sc, Math.max(nearDist(C, cx, cz) - m, 0)) > 0) return true;
    for (var k = 0; k < C.vols.length; k++) { var o = C.vols[k].out, dx = o.c[0] - cx, dz = o.c[2] - cz; if (distFadeAt(V, C.sc, Math.max(Math.sqrt(dx * dx + dz * dz) - o.r - m, 0)) > 0) return true; }
    return false;
  }
  function bootReady(V, cx, cz) {
    var L = V.cellList; if (!L || !L.length) return false;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st < 2) return false; if ((C.st < 4 || C.RB) && bootNeed(V, C, cx, cz, BOOT_M)) return false; }
    return true;
  }
  /* the guard: a cell in the view, not yet whole, whose distance weight (its own or one of its
     cloud bodies') will be over 0 within GUARD_M m, built at once before the frame that would show it (cellNow: every
     stage, its probes read at once). A cell already over its weight when built so is late (lateBorn) */
  function cellNow(C) {
    if (C.st === 0) cellLayout(C, true);
    if (C.st === 1 && C.job && !C.job.done) { var J = C.job; J.cancel = true; C.job = probeJob(C.V, J.pts, J.n, J.mode, true); }
    if (C.st === 1) cellResolve(C);
    if (C.st === 2) { if (C.B && C.bi < C.items.length) cellMesh(C, 1e9); cellUpload(C); }
    if (C.st === 3) cellBake(C, 1e9);
  }
  function cellGuard(V) {
    var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st >= 4) continue;
      if (C.st >= 2 && C.bound[3] <= 0) continue;   // (nothing of it to draw)
      if (!inView(C.bound[0], C.bound[1], C.bound[2], C.bound[3] > 0 ? C.bound[3] : C.size)) continue;
      if (!bootNeed(V, C, CAM.pos[0], CAM.pos[2], GUARD_M)) continue;
      cellNow(C); BOOT.guarded++;
    }
  }
