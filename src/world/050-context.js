  /* ---------------------------------------------------------------- the context */
  var gl = null, EXT = {}, FLOAT_RT = false, FLOAT32_RT = false, HALF = 0, LOST = false, DEFS = '', AAS = 0, AASUP = [];   // (AAS, E1 Fix 3: the scene's samples a pixel; AASUP, E1.1: the counts the context offers, up to the switch aa)
  var STILLMODE = false;                                    // (the shipped page: no harness drives the time)
  var DEVMODE = false;                                      // (and no dev hooks)
  function getGL() {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: DEVMODE, powerPreference: 'default' });
    if (!gl) return false;
    initExtensions();
    return true;
  }
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

