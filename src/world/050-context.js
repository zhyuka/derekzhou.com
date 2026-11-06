  /* ---------------------------------------------------------------- the context */
  var gl = null, EXT = {}, FLOAT_RT = false, FLOAT32_RT = false, HALF = 0, LOST = false, DEFS = '', AAS = 0, AASUP = [];   // (AAS, E1 Fix 3: the scene's samples a pixel; AASUP, E1.1: the counts the context offers, up to the switch aa)
  var STILLMODE = false;                                    // (the shipped page: no harness drives the time)
  var DEVMODE = false;                                      // (and no dev hooks)
  function getGL() {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: DEVMODE, powerPreference: 'default' });
    if (!gl) return false;
    initExtensions();
    startTake();   // (fast500 5: the start file's context, and its programs for progIssue)
    return true;
  }
  /* (fast500 step 5) the start file (start.v1.js, async right after the canvas; tools/start.mjs makes it from this
     file) may have made this canvas's context already, with the attributes above as shipped, and issued on it every
     program stage C issues, from the table its build recorded (each text as progIssue hands it to shaderSource, the
     device's DEFS put in as progIssue puts them): getContext gave that same context. Its programs are adopted by
     progIssue (startProg: exactly the text it would issue, its defines and folds and all, or not at all); what stage
     C's issue leaves is freed (startDone). Never in the harness (DEVMODE, the switches: those pages
     keep F0's path), and never once that context was lost (its programs died with it): a context still lost here is
     told to the world's own listener, as if its event came now (onLost: F0's lost path, then its restore). WORLD_START
     is left false, so a start file arriving after this does nothing */
  var START = null;
  function startTake() {
    var S = window.WORLD_START; window.WORLD_START = false;
    if (!S || S.gl !== gl) return;
    if (S.lost || gl.isContextLost()) {
      if (gl.isContextLost()) Promise.resolve().then(function () { if (!LOST) onLost({ preventDefault: function () {} }); });
      bootMark('start: lost before adoption'); return;
    }
    var n = 0, k; for (k in S.progs) n += S.progs[k].length;
    if (DEVMODE || OPT.sw !== null || S.defs !== DEFS) { startFree(S.progs); bootMark('start: declined (' + n + ' programs freed)'); return; }
    START = S.progs; bootMark('start: taken (' + n + ' programs issued by the start file)');
  }
  function startProg(P) {   // (keyed by the text progIssue would give shaderSource: DEFS, then any computed defines, after the version line. A change to what progIssue puts in must be made here too: start.mjs --test fails on no adoption)
    var V = '#version 300 es\n', X = V + DEFS + (typeof defsA === 'function' ? defsA() : ''), a = START[P.vs.replace(V, X) + '\u0000' + P.fs.replace(V, X)];
    return a && a.length ? a.shift() : null;
  }
  function startFree(T) { for (var k in T) for (var i = 0; i < T[k].length; i++) { gl.deleteProgram(T[k][i].p); gl.deleteShader(T[k][i].v); gl.deleteShader(T[k][i].f); } }
  function startDone() { var T = START; START = null; startFree(T); }
  /* the extensions are the context's: a restored context has them all off again, so they are asked for at start and
     after every restore (float render targets, parallel compiles), and the shaders' defines follow them */
  function initExtensions() {
    EXT.cbf = gl.getExtension('EXT_color_buffer_float');
    EXT.cbh = EXT.cbf ? null : gl.getExtension('EXT_color_buffer_half_float');
    EXT.par = gl.getExtension('KHR_parallel_shader_compile');
    FLOAT_RT = !!(EXT.cbf || EXT.cbh); FLOAT32_RT = !!EXT.cbf;
    HALF = FLOAT_RT ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    EXT.renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER) || '');
    /* (speed E10) WebKit (every browser on iOS and iPadOS; Safari on the Mac) has KHR_parallel_shader_compile, but a
       query waits for what is queued before it and its first draws build their pipelines at once: its own path, below */
    var wkUA = navigator.userAgent || '', wkIs = /iPhone|iPad|iPod/.test(wkUA) || (/Macintosh/.test(wkUA) && navigator.maxTouchPoints > 1) || (/AppleWebKit/.test(wkUA) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(wkUA));
    EXT.parAll = EXT.par && !wkIs ? EXT.par : null;
    /* (WebKit boot) on WebKit the extension puts the compiles and links on a pool of threads, one a core, but a link is
       touched (useProgram, a uniform's location, its status) only once its completion says done, and every first draw
       builds its Metal pipeline at once on the GPU process's one thread: so there every program is issued at once and
       polled (progStepWK), and the warm table's first draws go one a frame, after the frame's polls (warmStepWK) */
    EXT.parWK = EXT.par && wkIs ? EXT.par : null;
    /* (lane D, Android item 1) no KHR_parallel_shader_compile and not WebKit (Android's ANGLE-Vulkan, older drivers):
       every program issued in one frame and flushed, so the GPU process links them while the page goes on; their
       statuses read one a frame from the next frame on (each read waits only for what is left of its own link).
       ANGLE-Vulkan, phone viewport, CPU 4x, 11 runs: the world shown 1294 -> 1186 ms */
    EXT.issueAll = !EXT.par && !wkIs;
    // without float targets the linear depth and the ground's height are packed into the bytes of an RGBA8 texel
    DEFS = (FLOAT_RT ? '' : '#define LIND_PACKED\n') + (FLOAT32_RT ? '' : '#define GC_PACKED\n');
    if (wkIs) DEFS += '#define PLAIN_LOOPS\n';   // (WebKit boot: the loops' bounds without uZ, UZ; the start file never serves WebKit, so its tables are as before)
    EXT.hp = !!(EXT.cbf && EXT.parAll && HP_DEV(EXT.renderer)); if (EXT.hp) DEFS += '#define HPSPLIT\n';   // (fast500 lane G: the split height's devices)
    /* (round E1 Fix 3, G0) the scene drawn with 4 samples a pixel (MSAA) where the scene's colour format and its depth
       both allow it: the scene's hard edges (a floating rock, a standing stone, a dune's crest, a far mesa's outline)
       stepped a whole pixel from one frame to the next at 1 sample (FXAA only), which the 4x reference does not; four
       samples resolve each edge pixel to its covered share, so an edge sliding across the pixels moves in fifths. The
       samples are resolved (blitFramebuffer) into the scene's own texture and depth before the depth pass, and are never
       stored (invalidated after the resolve: a tile GPU keeps them on chip). Switch aa (boot): 4 (default), 2, or 0 off.
       Asked once at the context's start (and after a restore): getInternalformatParameter is a boot-time query */
    AAS = 0; AASUP = [];
    try {
      var want = SW.aa | 0;
      if (want > 1) {
        var sc = gl.getInternalformatParameter(gl.RENDERBUFFER, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.SAMPLES), sd = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.SAMPLES);
        for (var i = 0; sc && i < sc.length; i++) if (sc[i] <= want && sd && Array.prototype.indexOf.call(sd, sc[i]) >= 0) AASUP.push(sc[i]);
      }
    } catch (e) { AASUP = []; }
    AAS = memPlanAA();   // (E1.1, item 5: the samples the memory allows, w10_engine.js)
  }
  /* (Fix 2, T4) the context is made in the boot's first frame (stage A, design-v5 14), not at this script's top level:
     WebGL2's context and its extensions took about 210 of world.js's 276 ms of evaluation here (trace x1), which no
     cut of world.js into parts would have removed; the scripts' top levels now only define */

  var FAILMSG = null;
  function fail(msg) { FAILMSG = msg; }   // (the shipped page: kept here, never put on window or logged)
  var LOSTP = 'lost';   // what a stage returns when the context was lost under it (never a failure of the realm's)

