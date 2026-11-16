  /* ---------------------------------------------------------------- start */
  /* the words moved (a scroll, a reflow the ResizeObserver catches, the fonts arriving): the veil is measured again;
     a still frame (reduced motion) is drawn again on the next animation frame, so the veil is where the words are */
  function layoutChanged() {   // (only stored; measured, and a still drawn again, in the next frame: domFlush)
    DOMQ.words = true; if (!running) domNext();
  }
  var SLOW_GPU = /Adreno \(TM\) 619\b/;   // (the GPUs the lab measured too slow for the world, by WebGL's renderer string)
  function boot() {
    bootMark('start: run');
    if (!ORDER.length) { fail('no realms'); return; }
    /* stage A: the context and its extensions (then the record's and the harness's wrappers, then the ink birds'
       module, which compiles through HOST); without a context the still sky stays */
    if (!gl) {
      recMark('boot: context');
      if (!getGL()) { DEAD = true; markStill(); fail('no WebGL2 context'); return; }   // (the bar takes the hour's still's top)
      recWrap(); devGL(); recMark('boot: context made'); bootMark('start: context');
      deviceHints();
    }
    makeBirds();
    if (OPT.realm && !REALMS[OPT.realm]) fail('unknown realm ' + OPT.realm);
    if (OPT.ss) SS = Math.max(1, Math.min(4, +OPT.ss | 0));
    // the realm the journey opens on (its still sky is marked only if the canvas, once shown, hides again: markStill)
    var V0 = worldAt(0).V;
    SKYMARK = SKYTOP[HOUR] ? HOUR : 'day';   // (the hour's group, never the realm's own still ('dunes'): this stylesheet has a still sky and words for each time of day and none for a realm, so a boot declined before the first frame (a slow device) would leave a night visitor on the daylight still with black words; not written: the hour's still sky stays until the canvas hides, markStill)
    // a renderer on the CPU keeps that still sky (the world would run at a frame or two a second)
    if (!DEVMODE && /SwiftShader|llvmpipe|Software/i.test(EXT.renderer)) { DEAD = true; return; }
    /* a GPU measured too slow is held from the start (hold: the world drawn once and held, the ink birds flying over it;
       the owner, 2026-11-12), with no trial: stage G's floor is missed on every real run (the
       Android lab, Firebase Test Lab: a OnePlus Nord CE 3 Lite's Adreno 619, Chrome 117 and 159, cold and return,
       124-159 ms a frame at scale 0.35 against 21.7, after a 4.37 s compile frame). Only GPUs over the floor every time are
       named; one on the line (the Galaxy A15's Mali-G57 MC2, moving or held run to run) keeps the trial */
    if (!DEVMODE && SLOW_GPU.test(EXT.renderer)) hold('a GPU measured too slow (' + EXT.renderer + ')');   // (held from the start: no trial; drawn once, however slow)
    var tz = clockNow(); resize(); BOOT.resize0 = clockNow() - tz;   // (the first resize: where a new context's first wait on the GPU process falls, timed apart for the hold's forecast)
    if (typeof ResizeObserver !== 'undefined') { var ro = new ResizeObserver(layoutChanged); ro.observe(document.querySelector('main')); var ft = document.querySelector('footer'); if (ft) ro.observe(ft); ro.observe(canvas); }
    window.addEventListener('resize', function () { NEEDSIZE = true; if (!(running || FRUN || !READY || LOST)) stillNext(); if (!FRUN && forced()) { DOMQ.fc = true; domNext(); } });   // (only stored; the window measured and drawn in the next frame; forced colours' still drawn again there, fstart)
    window.addEventListener('scroll', layoutChanged, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutChanged);
    if (MQ) { if (MQ.addEventListener) MQ.addEventListener('change', onMotionPref); else if (MQ.addListener) MQ.addListener(onMotionPref); }
    if (FC) { if (FC.addEventListener) FC.addEventListener('change', onForced); else if (FC.addListener) FC.addListener(onForced); }
    if (window.matchMedia) ['(prefers-color-scheme: dark)', '(prefers-contrast: more)'].forEach(function (q) { var m = window.matchMedia(q); if (m.addEventListener) m.addEventListener('change', onPalette); else if (m.addListener) m.addListener(onPalette); });   // (a contrast theme changed while forced colours hold: onPalette)
    inputInit();
    if (forced()) { bootReset(false); fstart(); return; }   // (forced colours from the load: the world not drawn, the ink birds alone in CanvasText on the system's Canvas colour, their own loop, fstart (their file still to come: registerBirds asks for it); the boot waits for forced colours to end: onForced)
    if (DEVMODE && SW.rbfix) RB.fix = true;   // (dev: the read-back's arrival fixed in frames; the stills' harness too: jwfast's ticks)
    bootReset(false);
    start();   // (the staged boot, then the flight; under reduced motion the loop builds, draws one still frame and stops)
  }
  /* the boot starts in the first animation frame after the realms register (bootSoon: registerRealm; registerBirds
     and 'load' ask too), or at load if a file failed to arrive; the scripts' top levels only define, and nothing runs
     before the boot but them. Nothing waits: the boot begins at once */
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
    if (!DEVMODE && document.readyState === 'loading' && holdLink()) { holdRun(); return; }   // (the hold: the last realm registered while the page is still parsing)
    /* (load-perf, the owner 2026-11-12: "make the world boot after the first paint") without the hold (every phone),
       the boot waits until the page has painted: the browser's own paint record (a paint entry, observed), so the
       words and the still sky are on screen before stage A (the context, a GPU process start that takes seconds on
       some phones) and the rest. On a return visit the scripts come from cache and the boot used to run in the first
       frame, before any paint: the words waited for it. A page that painted already (a cold visit, the paint while the
       scripts came) boots at once; no paint record within PAINT_WAIT, or no observer, boots anyway */
    bootRaf = requestAnimationFrame(function () { afterPaint(function () { STILLHOLD = true; afterStill(function () { STILLHOLD = false; }); bootOnce(); }); });
  }
  var PAINT_WAIT = 1000;   // (ms: the boot never waits longer than this for the paint record)
  /* (load-perf, the lab's run 20, 2026-11-14) the still on screen before the batch too: the words' paint comes first
     (on a Nord 1.09-1.22 s), the still's (the opening's sky, an image the stylesheet shows) some 0.4-0.7 s later, and
     the boot's batch of programs ends in one flush that holds the GPU process's main thread 2.6-2.7 s: a still not yet
     uploaded waited behind it, to 5.75 s (3 of 4 cold visits) instead of about 3 s. So on a page with a still (the
     preload hour.js addressed) the boot waits for the still's file (its resource entry), then STILL_SHOW ms for its
     decode (60-133 ms there, off the main thread) and two frames for its paint and upload; or for its paint record (a
     largest-contentful-paint entry for its address, where the browser makes one), whichever is first. Never longer
     than STILL_WAIT past the moment the boot would have begun: a still that is lost or late never holds the world */
  var STILL_WAIT = 1000, STILL_SHOW = 150;   // (ms)
  /* (load-perf, the lab's run 21, 2026-11-14) the boot itself no longer waits: stages A and B (the context, the objects,
     the filter probe) run at the words' paint, beside the still's landing; only the programs' batch, issued with its one
     flush (progStep, from bootFrame), waits while STILLHOLD. Run 21's gap from the still's upload to that flush (Nord 438-637 ms, A15
     474-1002) was stages A and B done after the still, not the wait */
  var STILLHOLD = false;
  function afterStill(f) {
    var l = /** @type {HTMLLinkElement} */ (document.querySelector('link.still')), u = l && l.href;
    if (!u) { f(); return; }
    var done = false, seen = false, obs = [], go = function () { if (done) return; done = true; obs.forEach(function (o) { o.disconnect(); }); f(); };
    var shown = function () { if (seen) return; seen = true; setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(go); }); }, STILL_SHOW); };
    var watch = function (type, then) {
      var o = new PerformanceObserver(function (list) { if (list.getEntries().some(function (e) { return e.name === u || e.url === u; })) then(); });
      o.observe({ type: type, buffered: true }); obs.push(o);
    };
    try {
      if (performance.getEntriesByName(u).length) shown();
      else watch('resource', shown);
      watch('largest-contentful-paint', go);
    } catch (e) { go(); return; }
    setTimeout(go, STILL_WAIT);
  }
  function afterPaint(f) {
    var done = false, po = null, go = function () { if (done) return; done = true; if (po) po.disconnect(); f(); };
    try {
      if (performance.getEntriesByType('paint').length) { go(); return; }
      po = new PerformanceObserver(go); po.observe({ type: 'paint' });
    } catch (e) { go(); return; }
    setTimeout(go, PAINT_WAIT);
  }
  /* THE HOLD: the page does not paint until the world's first frame is drawn (the head's link
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
  /* (the slow CPU's net) the hold foretold, twice, from work the boot does anyway, on the main thread like the plan
     that follows: first stage A (the context and the boot's setup: about HOLD_KA x A + HOLD_CA ms; the 4090, Chrome's
     CPU throttled 1x to 6x: A 19-23 ms at 1x -> 0.6 s, 38-48 at 3x -> 1.3-1.45 s, 46-51 at 4x -> 1.6-1.8 s, 59 and over
     at 5x past 2 s); then the first hold frame (stage B and every program issued, its CPU work: about the filter probe's ms + HOLD_K x
     the rest + HOLD_C ms: 11-12 ms at 1x -> 0.68 s, 28-32 at 2x -> 1.07-1.29, 46-56 at 3x -> 1.59-1.77). The owner's rule ("Hold up to ~1 s"): a
     hold only where it foretells the world shown within HOLD_WORLD ms of the navigation's start (the clock's origin);
     either foretelling later: no hold, the link out at once, the boot going on as today's (the words first on the
     still sky, then the world). The deadline (holdMs) stays the last net */
  var HOLD_KA = 38, HOLD_CA = -150, HOLD_K = 24, HOLD_C = 425, HOLD_WORLD = 1000, HOLD_A_CUT = 1.3;
  function holdLink() { return document.querySelector('link[rel="expect"][blocking="render"]'); }
  function holdOff(why) { HOLD.why = why; var l = holdLink(); if (l) l.remove(); bootMark('hold: off (' + why + ')'); }
  /* the deadline by device, the last net (0: no hold). Chromium blanks a tab after about 4 s with no new frame, so
     never near that; no hold without parallel compiles (WebKit's links one at a time included: Safari keeps today's
     path until a real Mac's film sets its deadline), on a phone's GPU by name, or on 4 or fewer cores (hour.js has
     taken out the rest: reduced motion, forced colours, low memory, Firefox, Safari, Android, iOS) */
  function holdMs() {
    var cores = navigator.hardwareConcurrency || 0;
    if (!EXT.par) { HOLD.why = 'no parallel compiles'; return 0; }
    if (/Mali|Adreno|PowerVR|Immortalis|Xclipse|Apple GPU/.test(EXT.renderer) && !/Macintosh/.test(navigator.userAgent || '')) { HOLD.why = 'a phone GPU'; return 0; }
    if (cores <= 4) { HOLD.why = cores + ' cores'; return 0; }
    if (EXT.parWK) { HOLD.why = 'WebKit (no Mac film yet)'; return 0; }   // (WebKit boot: its own path, all at once, but no hold until a real Mac's film sets its deadline)
    if (!EXT.parAll) { HOLD.why = 'links one at a time'; return 0; }
    return cores >= 8 ? 2000 : 1500;
  }
  function holdRun() {
    var t0 = clockNow();
    bootOnce();   // (stage A: the context, the device; the loop's first animation frame asked for)
    if (!gl || DEAD || !running || reduced() || forced() || document.visibilityState === 'hidden') { holdOff(!gl || DEAD ? 'no world here' : 'not running'); return; }
    var ms = holdMs(); if (!ms) { holdOff(HOLD.why); return; }
    HOLD.a = +(clockNow() - t0).toFixed(1);
    HOLD.rz = +(BOOT.resize0 || 0).toFixed(1); HOLD.ac = Math.max(0, HOLD.a - HOLD.rz);   // (stage A's CPU work: the first resize, which waits on the GPU process starting (100-130 ms cold on a busy PC), counted once as itself, not as CPU speed)
    if (t0 + HOLD.rz + HOLD_KA * HOLD.ac + HOLD_CA > HOLD_A_CUT * HOLD_WORLD) { holdOff('a slow CPU: stage A ' + HOLD.a + ' ms'); return; }   // (only a clearly slow stage A skips here: it swings 15-45 ms at 1x on the 4090, cold; a close one is the first hold frame's to judge, against HOLD_WORLD)
    HOLD.ms = ms; bootMark('hold: on (' + ms + ' ms)');
    var ts = 0, n = 0, f0; HOLD.on = true;
    while (running && !shown && !DEAD && !LOST && n < 1e6 && clockNow() - t0 < ms) {
      ts += HOLD_P; n++; f0 = clockNow();
      domFlush(); if (BIRDF && !BIRDS && !LATEB.dead) birdsLate();
      frameBody(ts);
      if (n === 1) {   // (the slow CPU's net: the first hold frame, stage B and every program issued, foretells the hold)
        HOLD.f1 = +(clockNow() - f0).toFixed(1); HOLD.pf = +(BOOT.probe0 || 0).toFixed(1); HOLD.f1c = Math.max(0, HOLD.f1 - HOLD.pf);   // (its CPU work: the filter probe's link and read-back, which wait on the GPU (5-8 ms on the 4090, cold), counted once as themselves, as stage A's first resize is)
        if (t0 + HOLD.pf + HOLD_K * HOLD.f1c + HOLD_C > HOLD_WORLD) { HOLD.on = false; CLK[1] = -2; holdOff('a slow CPU: the first hold frame ' + HOLD.f1 + ' ms'); return; }
        if (PW.st === 1) planWaitOff();   // (the plan made here, beside the compiles: the worker's first answer cannot come inside this task; frame 1, stage B, makes none of it; the worker kept, its rest still taken when it comes)
      }
    }
    HOLD.on = false; CLK[1] = -2; HOLD.n = n; HOLD.took = +(clockNow() - t0).toFixed(1); HOLD.shown = shown;
    bootMark('hold: ' + (shown ? 'shown' : 'deadline') + ' after ' + n + ' frames, ' + HOLD.took + ' ms');
    if (!shown) holdOff('deadline');
  }
  /* (stage A) the device's hints, read once (each getter a round trip on Safari: never in a frame): the renderer,
     the screen and its density, an iPad behind a Mac user agent, WebGPU's presence, the cores and the memory, the draw
     buffers. The record keeps them */
  var DEVHINT = null;
  function deviceHints() {
    try {
      var nav = navigator, sc = /** @type {Screen | {width?: number, height?: number}} */ (window.screen || {});
      DEVHINT = { renderer: EXT.renderer, screen: [sc.width || 0, sc.height || 0], dpr: window.devicePixelRatio || 1, touch: nav.maxTouchPoints || 0, ipadMac: /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints || 0) > 1,
        gpu: !!nav.gpu, cores: nav.hardwareConcurrency || null, mem: nav.deviceMemory || null, drawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS), par: !!EXT.par, f32: FLOAT32_RT };
    } catch (e) { DEVHINT = { error: String(e) }; }
  }
  /* (the hold, cold visits) the context made here, as world.js ends and the kits come, when a hold may run: a new
     context starts the GPU process, which the boot's stage A otherwise waits on in resize() (100-130 ms on the 4090,
     cold, world-perf's measure) and reads as a slow CPU. getGL is handed this same context (the boot's attributes) */
  if (!DEVMODE && document.readyState === 'loading' && holdLink()) { try { canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' }); } catch (e) { /* getGL tries again */ } }
  planWorker();   // (the first plan, in the worker, from here: the seed is final)
  if (REC) recMark('world.js eval end');
  function loaded() { if (!BIRDF) INKWAIT = false; bootSoon(); }   // ('load' without the ink birds: their file is not coming; the realms' new bird flocks may show)
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded);
})();
