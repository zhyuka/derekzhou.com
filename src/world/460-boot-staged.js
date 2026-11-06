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
          largest scale within the bar starts the governor; under the floor (21.7 ms at 0.35) the still sky stays;
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
  var CORE_LATE = ['birds:ink'];   // (fast500 F0: the programs the first frame never draws with: research_staged-core)
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
    if (BOOT.st === 'B') {   // (Fix 3: and the first program issued in this frame: no frame of the boot is idle)
      bootMark('B objects'); bootObjects(); if (BIRDS && BIRDS.boot) BIRDS.boot();
      BOOT.st = 'C'; bootMark('C programs');
      var r0 = progStep(false, dl); if (r0 === LOSTP) return;
      bootSlice(t0, 'B C' + (PROGX.cur ? ':' + PROGX.cur.name : '')); return;
    }
    // (Fix 2) the read-back only from stage E: no synchronous call while a link is outstanding (Fix 3: from the frame after C's last)
    var afterC = BOOT.cDone && BOOT.cDoneF < FRAMEN;
    if (afterC) { rbPoll(); if (RB.lagged) BOOT.bake = Math.max(6, BOOT.bake >> 1); else if (BOOT.dBaked >= BOOT.bake) BOOT.bake = Math.min(BOOT_BAKE_MAX, BOOT.bake * 2); BOOT.dBaked = 0; }   // (fast500 step 10: a slow start, doubled after a frame that spent it)
    // C: the programs
    if (!BOOT.cDone) {
      var pd = PROGX.cur, r = progStep(false, dl);
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
    if (!NOISE.done) { var noised = noiseStep(afterC); label += ' noise' + NOISE.z; if (noised) bootMark('E noise baked'); }   // (noised: where links run one at a time, F's first entry waits a frame after the bake's last layers)
    var gpuFree = afterC && NOISE.done && (WARM.done || reduced());
    if (EXT.parAll && WARM.tg && !WARM.done && !reduced()) {   // (speed E8: each entry once its program is, beside the links)
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
      var h = SIM.V ? CS.psi : heading0(), cx = SIM.V ? CS.x : 0, cz = SIM.V ? CS.z : 0;
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
          if (V.st >= 8 && clockNow() < dlD) { BOOTVF = true; streamCells(V, cx, cz, Math.sin(h), Math.cos(h), false); BOOTVF = false; cellWork(V, false, BOOT_NEED, 4, 'cpu'); }
        }
        ready = BOOT.cDone && NOISE.done && visitBuilt(V) && V.st >= 8 && bootReady(V, cx, cz);
        flew = ready && (!!SIM.V || flightIn(V));
        if (flew) break;
      } while (gpuFree && idle && ++rd < BOOT_ROUNDS && clockNow() < dlD && bootSig(V) !== p0);
      WDL = 0; BOOT.dBaked = BUD.bake - BAKE.left; BOOT.dr += rd + 1; if (BOOT.cDone) bootFence();
      label += ' D' + V.st + (rd ? ' x' + (rd + 1) : '') + (gpuFree && !idle ? ' busy' : '');
      if (ready) { if (flew) { BOOT.world = true; bootFenceDrop(); bootMark('D world ready'); } else BOOT.fwait = (BOOT.fwait || 0) + 1; }   // (fast500 F0: and, for the flight's first step, what it reads: flightIn; step 10: the show's own test, bootReady)
    }
    if (afterC) rbFence();
    // G: the measurement (once the world is ready and the table warm); first the flight's first step (its camera)
    if (BOOT.world && (WARM.done || reduced())) {
      if (!SIM.V) { for (var pr = 0; pr < PREROLL; pr++) simAdvance(SIM_DT); CLK[0] = SIM.t; bootMark('flight: pre-roll done (' + SIM.steps + ' steps; the inputs in ' + (BOOT.fwait || 0) + ' frames after D)'); }   // (fast500 F0: the fixed pre-roll, PREROLL steps once flightIn)
      if (SIM.V && (reduced() || BOOT.restore || stageG())) {
        READY = true; dt0 = true; PREP0 = FRAMEN; bootMark('G done: ready'); budgets(false);
        if (REC) REC.readyAt = clockNow();
      } else label += ' G';
    }
    bootSlice(t0, label);
  }
  var dt0 = false;
  /* G: the warm-up measurement, one timed trial a frame (design-v5 14: drawn m = 2 times, then one blocking 1-pixel
     read, timed by clockNow from before the draws to after the read; the same read after a clear alone gives the round
     trip, subtracted; five trials a scale, the median). Pinned (no trials: the scale the harness asks, data-rung or
     the full one) in development and with the switch gtrial=0 */
  var GS = { sc: [0.35, 0.5, 0.7, 1], i: 3, rt: [], tr: [[], [], [], []], med: [null, null, null, null], m: 2, done: false, pick: -1, P: 0, pinned: false, ms: null, rung: 0, px: new Uint8Array(4) };
  /* (fast500 step 10) the rung stage G is pinned at, by the device's memory tier (memTier: each tier's ladder is its
     own, so 0 is the tier's top, which the timed trials picked on every arm timed); the governor steps it after the show */
  var GPIN = { desktop: 0, full: 0, low: 0, lowA: 0 };
  function gFloor() {   // (fast500 step 10: stage G's floor, shared by the timed trials and H's one trial)
    if (GS.pick < 0 && GS.med[0] > 0.65 * 33.34) { bootMark('G floor not met: ' + GS.med[0] + ' ms at 0.35'); decline('stage G: the frame at scale 0.35 takes ' + GS.med[0] + ' ms (over 21.7)'); return false; }
    return true;
  }
  /* (fast500 step 10, S10e) G pinned: the one timed trial left at load, in H's frame: the frame at 0.35 of today's size
     (GS.sc[0]) drawn GS.m times and read, G's way (two round trips timed, their median subtracted); over the floor,
     once more (a first draw at a size can carry a one-off cost); over it both times the boot declines, as stage G's
     floor did (the still sky stays). Not under reduced motion, after a restore, in development or when G ran trials */
  function hTrial() {
    if (GS.hT || !GS.pinned || BOOT.restore || reduced() || DEVMODE) return true;
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
    var s = GS.pick < 0 ? GS.sc[0] : GS.sc[GS.pick], ru = RUNGS.length - 1;   // (stage2 quality Q3: the lowest trial is 0.35 of today's size)
    for (var k = 0; k < RUNGS.length; k++) if (RUNGS[k] <= s + 1e-6) { ru = k; break; }
    RUNG = ru; GS.rung = ru;
    bootMark('G measured: scale ' + s + ' (rung ' + ru + '), medians ' + GS.med.join('/') + ' ms, period ' + GS.P.toFixed(1));
    return true;
  }
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
    var dt = CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; FRAMEN++;
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

