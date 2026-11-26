  /* ---------------------------------------------------------------- the boot, staged (E1, design-v5 14) */
  /* Everything behind the still sky, with the canvas hidden, each frame's slice of CPU work at most BOOT_MS (8 ms) at
     unit granularity, so a tap on a link always works. The boot begins at once (bootOnce) and nothing in it waits:
       A  the context and its extensions, the device's hints (boot(), in the boot's first frame);
       B  every object: the targets (resize), the engine's buffers and arrays, the noise's texture, the read-back ring,
          the warm table's targets and layouts, the ink birds' program, VAO and buffers; every program registered; and
          (Fix 3) the first program issued in the same frame;
       C  the programs, one at a time (progStep: one compiled and linked, its completion asked once a frame; Fix 3: the
          next issued in the frame after the last one's completion was read, so each boot frame carries one program's
          calls and the record names exactly one program for it), and nothing else synchronous while one is
          outstanding (no read-back until the frame after C);
       D  beside C: the first visit planned and built, its cells about the landing laid out, resolved and built
          (CPU, after the frame's GPU work, as in flight), under four times the flight's counts and the slice's time;
       E  the noise, baked on the CPU a layer a frame from the frame after B, the rest in the first frame after C, then
          uploaded with its mipmaps (fast500 step 1b: no program); the GPU's fills, once every program is: (after F) the probes, the ground's grid, the cells'
          uploads and their clouds' bakes (a bake budget that halves when the GPU falls behind: the ring's oldest fence
          unsignalled at a frame's start, and grows back by 8 a frame to 96);
       F  the warm table, after the noise and before D's GPU half (so no draw of D's is a first use): an entry that is
          its program's first use, or a heavy program's (its link took over 50 ms, or a draw of it did), alone in its
          frame, else at most five a frame (warmStep);
       G  the warm-up measurement: the real frame drawn offscreen at scene scales 0.35, 0.5, 0.7 and 1.0, ascending,
          stopping at the first over 65% of the period, five timed trials a scale, one a frame (stageG); its
          largest scale within the bar starts the governor; under the floor (21.7 ms at 0.35) the world is held (hold);
       H  the first real frame drawn into the hidden canvas and read back as a 16 x 16 thumbnail: doubted once
          (black, blank, white) it is drawn and read again; doubted twice the world declines (stageH). In the next
          frame the canvas shows, at once (a cut: no dissolve, fast500).
     A restored context runs B to F and H again (G's measurement is kept). Under reduced motion the boot is lean: no F
     and no G; they run behind the still when the preference ends, before the flight starts. */
  var BOOT_MS = 8;   // (the boot's slice of CPU work a frame)
  /* (fast500 step 10) D's slice once the GPU is free (a long task is 50 ms), the boot's bake units a frame (a slow
     start: doubled while the GPU keeps up, halved when the ring's fence lags), the most rounds a frame, the order's
     bound for the cells needed, and the metres by which the show's and the guard's distance weights look nearer */
  var BOOT_D_MS = 40, BOOT_BAKE0 = 1024, BOOT_BAKE_MAX = 8192, BOOT_ROUNDS = 64, BOOT_NEED = 19.999, BOOT_M = 30, GUARD_M = 30, BOOTVF = false;
  var BOOT = { st: 'A', marks: [], frames: 0, slices: [], sliceMax: 0, sliceOver: 0, ts: [], cDone: false, cDoneF: -1, world: false, bake: 1024, dBaked: 0, dr: 0, guarded: 0, gq: [], g0: false, hOk: false, hFails: 0, thumb: null, declined: null, restore: false, shownAt: -1, startAt: -1,
    fts: [] };   // (Fix 2: fts every boot frame's [frame, rAF time])
  var CORE_LATE = ['birds:ink', 'birds:paper', 'engine.creature'];   // (fast500 F0: the programs the first frame never draws with: research_staged-core)
  function bootMark(name) { BOOT.marks.push([name, +clockNow().toFixed(1), FRAMEN]); recMark('boot ' + name); }
  function bootReset(restore) {
    BOOT.st = 'B'; BOOT.cDone = false; BOOT.cDoneF = -1; BOOT.world = false; BOOT.bake = BOOT_BAKE0; BOOT.dBaked = 0; BOOT.gq = []; BOOT.g0 = false; BOOT.hOk = false; BOOT.hFails = 0; BOOT.restore = !!restore;
    PROGX.compiled = PROGX.linked = PROGX.finished = PROGX.broken = 0; PROGX.cur = null; PORDER = null;
  }
  function bootSlice(t0, label) {
    var ms = clockNow() - t0;
    if (ms > BOOT.sliceMax) BOOT.sliceMax = ms;
    if (ms > BOOT_MS) BOOT.sliceOver++;
    if (BOOT.slices.length < 400) BOOT.slices.push([FRAMEN, +ms.toFixed(2), label]);
  }
  /* one frame of the boot (stages B-G); READY once G is through (or skipped) */
  function bootFrame(ts) {
    var t0 = clockNow(), dl = t0 + BOOT_MS, label = BOOT.st;
    if (BOOT.fts.length < 4000) BOOT.fts.push(FRAMEN, +ts.toFixed(2));
    BOOT.frames++; if (BOOT.ts.length < 400) BOOT.ts.push(ts);
    WORK.verts = WORK.layers = WORK.layouts = WORK.uploads = WORK.resolves = 0;
    var wkWait = wkHold(t0); if (!wkWait) wkMeasure();   // (WebKit boot: no sync call while a first draw's pipeline builds; then that build timed)
    if (BOOT.st === 'B') {   // (Fix 3: and the first program issued in this frame: no frame of the boot is idle)
      bootMark('B objects'); bootObjects(); if (BIRDS && BIRDS.boot) BIRDS.boot();
      BOOT.st = 'C'; bootMark('C programs');
      var r0 = STILLHOLD ? false : progStep(false, dl); if (r0 === LOSTP) return;   // (the programs' batch waits for the opening's still on screen: STILLHOLD, 520-start)
      bootSlice(t0, 'B C' + (PROGX.cur ? ':' + PROGX.cur.name : '')); return;
    }
    // (Fix 2) the read-back only from stage E: no synchronous call while a link is outstanding (Fix 3: from the frame after C's last)
    var afterC = BOOT.cDone && BOOT.cDoneF < FRAMEN;
    if (afterC && !wkWait) { rbPoll(); if (RB.lagged) BOOT.bake = Math.max(6, BOOT.bake >> 1); else if (BOOT.dBaked >= BOOT.bake) BOOT.bake = Math.min(BOOT_BAKE_MAX, BOOT.bake * 2); BOOT.dBaked = 0; }   // (fast500 step 10: a slow start, doubled after a frame that spent it)
    // C: the programs
    if (!BOOT.cDone && !wkWait) {
      var pd = PROGX.cur, r = STILLHOLD ? false : progStep(false, dl);
      label += r === true ? ' C-done' + (pd ? '<' + pd.name : '') : (PROGX.cur && PROGX.cur !== pd ? ' C:' + PROGX.cur.name : PROGX.cur ? ' C?' + PROGX.cur.name : pd ? ' C<' + pd.name : ' C');   // (Fix 3: C:x issued, C?x asked, C<x read: one of them a frame)
      if (r === LOSTP) return;
      if (!BOOT.coreM) { var cn = 0, cm = 0; for (var ci = 0; ci < PROGS.length; ci++) { if (CORE_LATE.indexOf(PROGS[ci].name) >= 0) continue; cm++; if (PROGS[ci].st === 3) cn++; } if (cm && cn === cm) { BOOT.coreM = true; bootMark('C core done (' + cm + ' of ' + PROGS.length + ' programs)'); } }   // (fast500 F0: the first frame's programs: all but CORE_LATE)
      if (r === true) {
        BOOT.cDone = true; BOOT.cDoneF = FRAMEN; bootMark('C done (' + PROGS.length + ' programs, ' + PROGX.broken + ' broken)');
        if (!engineOk()) { decline('an engine program will not link here'); return; }
        var Vw = theWorld(); if (Vw && (linkStep(Vw.def) || realmProgs(Vw.def).st !== -1)) { /* linked */ } else if (Vw) { setAside(Vw); recMark('the world will not link here'); }
        if (!ORDER.some(function (x) { return !REALMS[x].bad; })) { decline('no realm will link here'); return; }
      }
    }
    /* E: the noise (fast500 step 1b: baked on the CPU, a layer a boot frame from the frame after B, a count and no clock
       read; the layers left all at once in the first frame after C, where D's GPU half and the cells first sample it;
       then level 0 uploaded and its mipmaps made, no draw; before gpuFree, so that frame's D can use it); then F, the
       warm table (Fix 2: before D's GPU half, so none of D's draws is a program's first use), each one's first use alone
       in its frame */
    if (!NOISE.done) { var noised = EXT.parWK ? noiseStep(false, afterC ? dl : 0) : noiseStep(afterC); label += ' noise' + NOISE.z; if (noised) bootMark('E noise baked'); }   // (noised: where links run one at a time, F's first entry waits a frame after the bake's last layers; WebKit: after C, as many layers as the slice allows, its links being through about a second sooner)
    var gpuFree = afterC && !wkWait && NOISE.done && (WARM.done || reduced());
    if ((EXT.parAll || (EXT.parWK && !noised && !wkWait)) && WARM.tg && !WARM.done && !reduced()) {   // (speed E8: each entry once its program is, beside the links; WebKit: one a frame, never in the noise's last frame)
      var wj = WARM.ms.length; warmStep(false, dl); label += ' F' + (WARM.ms.length - wj);
      if (WARM.done) bootMark('F warmed (' + WARM.list.length + ' keys)');
    } else if (!EXT.parAll && afterC && NOISE.done && !WARM.done && !reduced() && !noised) {   // (speed E10: never in the noise's frame, as before E8)
      var wi = WARM.ms.length; warmStep(false, dl); label += ' F';
      for (var wk = wi; wk < WARM.ms.length; wk++) label += (wk === wi ? ':' : ',') + WARM.ms[wk][0];   // (Fix 2: the keys drawn in the slice)
      if (WARM.done) bootMark('F warmed (' + WARM.list.length + ' keys)');
    }
    // D and E: the world about the landing (or, after a restore, about the camera)
    var V = SIM.V || worldAt(SIM.t).V;
    if (V && !BOOT.world) {
      /* (fast500 step 10) D's GPU half at its real work, not one stage a frame: once the GPU is free, rounds of the GPU's
         half and the CPU's in this frame (several stages a call), its probes and the landing's ground grid drawn and read
         at once, until the world is ready, nothing moved or the slice is spent (BOOT_D_MS);
         the cells that can be seen first (bootNeed), in the flight's own order, built whole, every one resolved; their
         uploads and bakes once every probe is read (no read waits on a bake); laid out beside C once the visit is planned */
      var dlD = gpuFree ? t0 + BOOT_D_MS : dl, rd = 0, ready = false, flew = false, idle = gpuFree && bootIdle();
      budgets(true); BAKE.left = BUD.bake; WDL = dlD;
      var h = SIM.V ? CS.psi : airHeading0(), cx = SIM.V ? CS.x : 0, cz = SIM.V ? CS.z : 0;
      do {
        WORK.verts = WORK.layers = WORK.layouts = WORK.uploads = WORK.resolves = 0;
        var p0 = bootSig(V);
        if (gpuFree) {   // (the GPU's half first, as in flight)
          freeDrain();
          visitRun(V, 'gpu');
          if (idle) { probeSync(); probeFlush(PROBE_BOOT); groundRest(); groundCache(V, cx, cz, true); }   // (probeFlush: a job probeSync leaves, in parts through the ring; groundRest: a grid a busy frame began through the ring, the rest read at once)
          else { groundRead(); groundCache(V, cx, cz, false); probeFlush(PROBE_BOOT); }   // (the GPU still on the last frame's work, a first draw's compile on a slow device: F0's ring, so that no read here waits on it, the page held)
          if (V.cellList && !bootProbing(V)) cellWork(V, false, BOOT_NEED, 4, 'gpu');
        }
        if (clockNow() < dlD) { if (gpuFree) visitRun(V, 'cpu'); else visitStep(V, false, 'cpu'); }
        if (V.st >= 1 && clockNow() < dlD) {   // (the layouts and resolves in the flight's own order, beside C too: a resolve waits for its probes, after C; then, the visit built, the needed cells' meshes)
          streamCells(V, cx, cz, Math.sin(h), Math.cos(h), false); cellWork(V, false, 0, 2, 'cpu');
          if (visitBuilt(V) && clockNow() < dlD) { BOOTVF = true; streamCells(V, cx, cz, Math.sin(h), Math.cos(h), false); BOOTVF = false; cellWork(V, false, BOOT_NEED, 4, 'cpu'); }
        }
        ready = BOOT.cDone && NOISE.done && visitBuilt(V) && bootReady(V, cx, cz);
        flew = ready && (!!SIM.V || flightIn(V));
        if (flew) break;
      } while (gpuFree && idle && ++rd < BOOT_ROUNDS && clockNow() < dlD && bootSig(V) !== p0);
      WDL = 0; BOOT.dBaked = BUD.bake - BAKE.left; BOOT.dr += rd + 1; if (BOOT.cDone) bootFence();
      label += ' D' + V.st + (rd ? ' x' + (rd + 1) : '') + (gpuFree && !idle ? ' busy' : '');
      if (ready) { if (flew) { BOOT.world = true; bootFenceDrop(); bootMark('D world ready'); } else BOOT.fwait = (BOOT.fwait || 0) + 1; }   // (fast500 F0: and, for the flight's first step, what it reads: flightIn; step 10: the show's own test, bootReady)
    }
    if (afterC) rbFence();
    // G: the measurement (once the world is ready and the table warm); first the flight's first step (its camera)
    if (BOOT.world && (WARM.done || reduced()) && lateSeenReady()) {   // (world-perf lane: and no held program of a kind laid out still unready)
      if (!SIM.V) { for (var pr = 0; pr < PREROLL; pr++) simAdvance(SIM_DT); CLK[0] = SIM.t; bootMark('flight: pre-roll done (' + SIM.steps + ' steps; the inputs in ' + (BOOT.fwait || 0) + ' frames after D)'); }   // (fast500 F0: the fixed pre-roll, PREROLL steps once flightIn)
      if (SIM.V && (reduced() || BOOT.restore || stageG())) {
        READY = true; dt0 = true; PREP0 = FRAMEN; bootMark('G done: ready'); budgets(false);
        if (REC) REC.readyAt = clockNow();
      } else label += ' G';
    }
    bootSlice(t0, label);
  }
  var dt0 = false;
