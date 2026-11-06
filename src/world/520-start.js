  /* ---------------------------------------------------------------- start */
  /* the words moved (a scroll, a reflow the ResizeObserver catches, the fonts arriving): the veil is measured again;
     a still frame (reduced motion) is drawn again on the next animation frame, so the veil is where the words are */
  function layoutChanged() {   // (E1.1 Fix 2, S10: only stored; measured, and a still drawn again, in the next frame: domFlush)
    DOMQ.words = true; if (!running) domNext();
  }
  var SLOW_GPU = /Adreno \(TM\) 619\b/;   // (phone lane: the GPUs the lab measured too slow for the world, by WebGL's renderer string)
  function boot() {
    bootMark('start: run');   // (fast500 F0)
    if (!ORDER.length) { fail('no realms'); return; }
    /* (Fix 2) stage A: the context and its extensions (then the record's and the harness's wrappers, then the ink
       birds' module, which compiles through HOST); without a context the still sky stays */
    if (!gl) {
      recMark('boot: context');
      if (!getGL()) { DEAD = true; markStill(); fail('no WebGL2 context'); return; }   // (tod: the bar takes the hour's still's top)
      recWrap(); devGL(); recMark('boot: context made'); bootMark('start: context');   // (fast500 F0)
      deviceHints();
    }
    makeBirds();
    if (OPT.realm && !REALMS[OPT.realm]) fail('unknown realm ' + OPT.realm);
    if (OPT.ss) SS = Math.max(1, Math.min(4, +OPT.ss | 0));
    // the realm the journey opens on (its still sky is marked only if the canvas, once shown, hides again: markStill)
    var V0 = worldAt(0).V;
    SKYMARK = SKYTOP[HOUR] ? HOUR : 'day';   // (tod fix3, problem 4: the hour's group, never the realm's own still ('dunes'): this stylesheet has a still sky and words for each time of day and none for a realm, so a boot declined before the first frame (a slow device) left a night visitor on the daylight still with black words; Fix 3: not written: the hour's still sky stays until the canvas hides, markStill)
    // a renderer on the CPU keeps that still sky (the world would run at a frame or two a second)
    if (!DEVMODE && /SwiftShader|llvmpipe|Software/i.test(EXT.renderer)) { DEAD = true; return; }
    /* (phone lane) and a GPU measured too slow keeps it before any program is compiled: stage G declined it on every
       real run (the Android lab, Firebase Test Lab, 2026-11-06: a OnePlus Nord CE 3 Lite's Adreno 619, Chrome 117 and
       159, cold and return, 124-159 ms a frame at scale 0.35 against 21.7, after a 4.37 s compile frame). Only GPUs
       declined every time are named; one on the line (the Galaxy A15's Mali-G57 MC2, shown or declined run to run)
       keeps the trial */
    if (!DEVMODE && SLOW_GPU.test(EXT.renderer)) { DEAD = true; return; }
    resize();
    if (typeof ResizeObserver !== 'undefined') { var ro = new ResizeObserver(layoutChanged); ro.observe(document.querySelector('main')); var ft = document.querySelector('footer'); if (ft) ro.observe(ft); ro.observe(canvas); }
    window.addEventListener('resize', function () { NEEDSIZE = true; if (!(running || FRUN || !READY || LOST)) stillNext(); if (!FRUN && forced()) { DOMQ.fc = true; domNext(); } });   // (E1.1, S10: only stored; the window measured and drawn in the next frame; round 2: forced colours' still drawn again there, fstart)
    window.addEventListener('scroll', layoutChanged, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutChanged);
    if (MQ) { if (MQ.addEventListener) MQ.addEventListener('change', onMotionPref); else if (MQ.addListener) MQ.addListener(onMotionPref); }
    if (FC) { if (FC.addEventListener) FC.addEventListener('change', onForced); else if (FC.addListener) FC.addListener(onForced); }
    if (window.matchMedia) ['(prefers-color-scheme: dark)', '(prefers-contrast: more)'].forEach(function (q) { var m = window.matchMedia(q); if (m.addEventListener) m.addEventListener('change', onPalette); else if (m.addListener) m.addListener(onPalette); });   // (round 3: a contrast theme changed while forced colours hold: onPalette)
    inputInit();
    if (forced()) { bootReset(false); fstart(); return; }   // (round 2: forced colours from the load: the world not drawn, the ink birds alone in CanvasText on the system's Canvas colour, their own loop, fstart (their file still to come: registerBirds asks for it); the boot waits for forced colours to end: onForced)
    if (DEVMODE && SW.rbfix) RB.fix = true;   // (dev: the read-back's arrival fixed in frames; the stills' harness too: jwfast's ticks)
    bootReset(false);
    start();   // (the staged boot, then the flight; under reduced motion the loop builds, draws one still frame and stops)
  }
  /* (E0, design-v5 14; fast500 4a) the boot starts in the first animation frame after the realms register (bootSoon:
     registerRealm; registerBirds and 'load' ask too), or at load if a file failed to arrive; the scripts' top levels
     only define, and nothing runs before the boot but them. Nothing waits: the boot begins at once */
  var booted = false, bootRaf = 0;
  function bootOnce() {
    bootRaf = 0;
    if (booted) return;
    booted = true; BOOT.startAt = clockNow();
    recMark('boot start');
    boot();
  }
  function bootSoon() {
    if (booted || bootRaf) return;
    if (!DEVMODE && document.readyState === 'loading' && holdLink()) { holdRun(); return; }   // (first-paint preview: the last realm registered while the page is still parsing)
    bootRaf = requestAnimationFrame(bootOnce);
  }
  /* (first-paint preview) THE HOLD: the page does not paint until the world's first frame is drawn (the head's link
     rel=expect blocking=render, for Chromium; elsewhere the parser itself, busy in this task). The world, the kit and
     the realms are parser-blocking after the words, so the last realm's registration lands here while the page is
     still parsing: the boot runs at once, its staged frames one after another in this one task (no animation frame:
     each a hold frame of HOLD_P, the boot's own logic unchanged), until the canvas shows. The parser then ends and the
     page paints once, the words and the world together. The visit's plan is made here, beside the compiles (the
     worker's answer cannot arrive inside this task). Past the device's deadline (holdMs) the hold returns: the link
     is taken out and today's path goes on (the still sky and the words, then the cut). The deadline is a budget read
     from the one clock, never what is drawn; the first animation frame after the hold steps one hold frame (dt
     HOLD_P), as the frame after a 60 Hz show would */
  var HOLD_P = 68267 / 4096, HOLD = { on: false, ms: 0, why: '', n: 0, took: -1, shown: false };   // (a 60 Hz frame, exact in binary)
  function holdLink() { return document.querySelector('link[rel="expect"][blocking="render"]'); }
  function holdOff(why) { HOLD.why = why; var l = holdLink(); if (l) l.remove(); bootMark('hold: off (' + why + ')'); }
  /* the deadline by device (0: no hold). Chromium blanks a tab after about 4 s with no new frame, so never near that;
     no hold without parallel compiles, on a phone's GPU by name, or on 4 or fewer cores (hour.js has taken out the
     rest: reduced motion, forced colours, Firefox, Android, iOS) */
  function holdMs() {
    var cores = navigator.hardwareConcurrency || 0;
    if (!EXT.par) { HOLD.why = 'no parallel compiles'; return 0; }
    if (/Mali|Adreno|PowerVR|Immortalis|Xclipse|Apple GPU/.test(EXT.renderer) && !/Macintosh/.test(navigator.userAgent || '')) { HOLD.why = 'a phone GPU'; return 0; }
    if (cores <= 4) { HOLD.why = cores + ' cores'; return 0; }
    if (!EXT.parAll) return 1500;   // (WebKit on the Mac: its links one at a time)
    return cores >= 8 ? 2000 : 1500;
  }
  function holdRun() {
    var t0 = clockNow();
    bootOnce();   // (stage A: the context, the device; the loop's first animation frame asked for)
    if (!gl || DEAD || !running || reduced() || forced() || document.visibilityState === 'hidden') { holdOff(!gl || DEAD ? 'no world here' : 'not running'); return; }
    var ms = holdMs(); if (!ms) { holdOff(HOLD.why); return; }
    HOLD.ms = ms; bootMark('hold: on (' + ms + ' ms)');
    if (PW.st === 1) planWorkerOff();   // (the plan made here, beside the compiles)
    var ts = 0, n = 0; HOLD.on = true;
    while (running && !shown && !DEAD && !LOST && n < 1e6 && clockNow() - t0 < ms) {
      ts += HOLD_P; n++;
      domFlush(); if (BIRDF && !BIRDS && !LATEB.dead) birdsLate();
      frameBody(ts);
    }
    HOLD.on = false; CLK[1] = -2; HOLD.n = n; HOLD.took = +(clockNow() - t0).toFixed(1); HOLD.shown = shown;
    bootMark('hold: ' + (shown ? 'shown' : 'deadline') + ' after ' + n + ' frames, ' + HOLD.took + ' ms');
    if (!shown) holdOff('deadline');
  }
  /* (E1, stage A) the device's hints, read once (each getter a round trip on Safari: never in a frame): the renderer,
     the screen and its density, an iPad behind a Mac user agent, WebGPU's presence, the cores and the memory, the draw
     buffers. The record keeps them; the class itself is E7's */
  var DEVHINT = null;
  function deviceHints() {
    try {
      var nav = navigator, sc = window.screen || {};
      DEVHINT = { renderer: EXT.renderer, screen: [sc.width || 0, sc.height || 0], dpr: window.devicePixelRatio || 1, touch: nav.maxTouchPoints || 0, ipadMac: /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints || 0) > 1,
        gpu: !!nav.gpu, cores: nav.hardwareConcurrency || null, mem: nav.deviceMemory || null, drawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS), par: !!EXT.par, f32: FLOAT32_RT };
    } catch (e) { DEVHINT = { error: String(e) }; }
  }
  planWorker();   // (fast500 F: the first plan, in the worker, from here: the seed is final)
  if (REC) recMark('world.js eval end');
  function loaded() { if (!BIRDF) INKWAIT = false; bootSoon(); }   // (fast500 4a: 'load' without the ink birds: their file is not coming; the realms' new bird flocks may show)
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded);
})();
