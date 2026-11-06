  /* ---------------------------------------------------------------- start */
  /* the words moved (a scroll, a reflow the ResizeObserver catches, the fonts arriving): the veil is measured again;
     a still frame (reduced motion) is drawn again on the next animation frame, so the veil is where the words are */
  function layoutChanged() {   // (E1.1 Fix 2, S10: only stored; measured, and a still drawn again, in the next frame: domFlush)
    DOMQ.words = true; if (!running) domNext();
  }
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
  function bootSoon() { if (!booted && !bootRaf) bootRaf = requestAnimationFrame(bootOnce); }
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
