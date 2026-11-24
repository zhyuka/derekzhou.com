  /* the length of the segment (CBS: its start, its direction, its length) within a sphere (no closure a call); CBH the
     bodies a bird's segments may meet (cell, body) */
  var CBS = new Float64Array(7), CBH = new Int32Array(256), CBO = new Float64Array(3), CBP = new Float64Array(3), CBZ = new Float64Array(3);   // (CBO, CBP: an air cell's carry; CBZ: none)
  function cbSet(ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    CBS[0] = ax; CBS[1] = ay; CBS[2] = az; CBS[3] = dx / len; CBS[4] = dy / len; CBS[5] = dz / len; CBS[6] = len;
  }
  function cbChord(cx, cy, cz, r) {
    var ox = cx - CBS[0], oy = cy - CBS[1], oz = cz - CBS[2], tc = ox * CBS[3] + oy * CBS[4] + oz * CBS[5], d2 = ox * ox + oy * oy + oz * oz - tc * tc;
    if (d2 >= r * r) return 0;
    var h = Math.sqrt(r * r - d2), t0 = Math.max(tc - h, 0), t1 = Math.min(tc + h, CBS[6]);
    return t1 > t0 ? t1 - t0 : 0;
  }
  var BIRDF = null;
  function registerBirds(factory) {
    if (REC) REC.regs.push(['inkbirds', +clockNow().toFixed(1)]);   // (E0: the ink birds' file, the last deferred script, ends here)
    HW.boxes = WORDS;
    if (BIRDS || BIRDF || typeof factory !== 'function') return;
    BIRDF = factory;
    if (gl && STILLMODE) makeBirds();   // (fast500 4a: otherwise made in the next frame, birdsLate: never GL calls in a script's task)
    bootSoon();   // (E0: the last deferred script has run: the boot, a frame on)
    if (booted && !FRUN && forced()) { DOMQ.fc = true; domNext(); }   // (round 2: forced colours, the boot already past their start: the ink birds' own loop asked for in the next frame, now there is a module to make: domFlush, fstart)
  }
  /* (Fix 2) the module made once the context is (boot stage A): its factory compiles its programs through HOST */
  function makeBirds() {
    if (BIRDS || BIRDL || !BIRDF || !gl || LATEB.dead) return;
    HOST.gl = gl;
    var late = BOOT.st === 'C' && !STILLMODE, M = null;   // (fast500 4a: from stage C on the boot's programs are in hand: the module's are made beside them)
    LATEB.on = late; LATEB.P.length = 0; LATEB.W.length = 0;
    try { M = BIRDF(HOST) || null; if (M && late && M.boot) M.boot(); } catch (e) { M = null; fail('birds: ' + (e && e.message)); }
    LATEB.on = false;
    if (!M) { LATEB.dead = true; INKWAIT = false; return; }
    if (late) { BIRDL = M; LATEB.gen = MEMN.restored; recMark('ink birds: made late (' + (shown ? 'after the show' : 'in the boot') + ')'); }
    else BIRDS = M;
  }
  /* (fast500 4a) the ink birds' file loads last, at low priority, and the boot no longer waits for it. Made before the
     boot's stage C, the module is the boot's as before (stage A or B: its program in stage C, its ring and warm entry in
     B). Made later (BIRDL, during C or after the world shows: the owner's "finish code after show: only programs for
     things not in view"), its programs are kept off the boot's list (PROGS: the boot's order and stages are unchanged)
     and worked here, once a frame: issued (the boot's progIssue, the same sources), each one's completion asked once a
     frame without waiting (KHR_parallel_shader_compile; without it, read LATE_WAIT frames after the link went out), its
     status and uniforms read once complete (finish), then, the next frame, drawn once into a 1x1 viewport of the warm
     table's RGBA8 target with the module's own VAO, mode and blend (its first draw, which D3D11 pays for, off the
     canvas: nothing drawn that is seen, no frame changed), and only the frame after that does the module fly (BIRDS:
     its clock, its planning, its draws). Its flights then come as the first ink flight always does, from the
     first frame of a world already shown: planned whole before a bird enters, from beyond an edge or out of the
     distance. Under reduced motion it waits (its still sky would gain birds); a context lost meanwhile makes it the
     boot's again (the restore's stages B and C). INKWAIT: the realms' bird flocks stand aside while the ink birds are
     there or still to come (until 'load' with none); one that stood aside never shows (inkAside), so none vanishes
     when the ink birds come and none pops in if they never do */
  var BIRDL = /** @type {BirdsModule} */ (null), LATEB = { on: false, P: [], W: [], dead: false, gen: 0, fin: -1, wf: -1 }, INKWAIT = true, LATE_WAIT = 30;
  function inkAside(f) { if (BIRDS) return true; if (BIRDL || INKWAIT) { f.ia = 1; return true; } return f.ia === 1; }
  function lateProg(vs, fs, name) { var P = { p: null, name: name, u: null, ok: false, vs: vs, fs: fs, v: null, f: null, st: 0, late: true }; LATEB.P.push(P); return P; }
  /* (load-perf, the lab's run 22, 2026-11-14) a module made late while the programs' batch still waits for the opening's
     still (STILLHOLD, 520-start) issues nothing until it ends: its own flush would beat the still to the GPU too */
  function birdsLate() {
    if (!BIRDL) { makeBirds(); if (!BIRDL) return; }
    if (LOST || gl.isContextLost()) return;
    if (LATEB.gen !== MEMN.restored) { var M = BIRDL; BIRDL = null; BIRDS = M; BIRDPL.length = 0; if (M.lost) M.lost(); recMark('ink birds: the boot\'s after a restore'); return; }   // (its objects died with the old context: made again with the boot's own, stages B and C)
    var i, P, n = LATEB.P.length, done = 0;
    for (i = 0; i < n; i++) {
      P = LATEB.P[i];
      if (P.st === 0) { if (STILLHOLD) continue; var c0 = PROGX.compiled, l0 = PROGX.linked; progIssue(P); PROGX.compiled = c0; PROGX.linked = l0; progFence(); gl.flush(); continue; }
      if (P.st === 2) {
        if (!progFenced()) continue;   // (no status read before the fence behind what was issued signals: progFenced, 070)
        if (EXT.par) { var tq = clockNow(), dn = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR); P.polls++; P.qms = +(P.qms + clockNow() - tq).toFixed(2); if (gl.isContextLost()) return; if (!dn) continue; }
        else if (FRAMEN - P.issF < LATE_WAIT) continue;
        var tf = clockNow(), r = finish(P);
        if (r === LOSTP) return;
        P.fms = +(clockNow() - tf).toFixed(2); P.doneAt = +clockNow().toFixed(1); P.doneF = FRAMEN; LATEB.fin = FRAMEN;
        if (!r) { LATEB.dead = true; BIRDL = null; INKWAIT = false; recMark('ink birds: ' + P.name + ' will not link here'); return; }
        continue;
      }
      if (P.st === 3) done++;
    }
    if (done < n) return;
    if (LATEB.wf < 0) { if (FRAMEN > LATEB.fin) { lateWarm(); LATEB.wf = FRAMEN; } return; }
    if (FRAMEN <= LATEB.wf || reduced()) return;
    BIRDS = BIRDL; BIRDL = null; recMark('ink birds: linked late, warmed, flying');
  }
  function lateWarm() {
    var T = WARM.tg && WARM.tg.rgba8, i, e, t0;
    if (!T) return;
    for (i = 0; i < LATEB.W.length; i++) {
      e = LATEB.W[i]; if (!e.p || e.p.st !== 3 || !e.p.ok) continue;
      t0 = clockNow();
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.viewport(0, 0, 1, 1); gl.colorMask(true, true, true, true);
      if (e.bl) { gl.enable(gl.BLEND); gl.blendFuncSeparate(e.bl[0], e.bl[1], e.bl[2], e.bl[3]); } else gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.useProgram(e.p.p); gl.bindVertexArray(e.vao);
      if (e.inst) gl.drawArraysInstanced(e.mode, 0, e.cnt, 1); else gl.drawArrays(e.mode, 0, e.cnt);
      if (!e.p.warmed) { e.p.warmed = true; e.p.firstMs = +(clockNow() - t0).toFixed(2); e.p.firstF = FRAMEN; e.p.firstAt = +clockNow().toFixed(1); }
    }
    warmReset();
  }
