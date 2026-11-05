/* start.v4.js: the start file: the world's context and its first frame's programs, issued once the page has painted
   (fast500 step 5). MADE by tools/start.mjs from src/ (the world's scripts as written, run in a fake browser): never edit it
   by hand; CI makes it again and fails on any difference. A new text needs a new name (start.vN+1.js, its table
   start-table.vN+1.js): both are cached as immutable. The programs are in start-table.v4.js, loaded after the first paint.
   The world (getGL, progIssue) adopts the context and every program whose text it would issue itself; it frees the rest. */
(function () {
  'use strict';
  var HP = function (r) { return /^ANGLE \(NVIDIA[,\s]/.test(r || '') && /Direct3D11/.test(r || ''); };   // (the split height's devices: their own set, HPSPLIT in their DEFS: the world's HP_DEV)
  var d = document, canvas = d.querySelector('canvas.sky');
  if (!canvas || typeof WebGL2RenderingContext === 'undefined' || window.WORLD_START !== undefined) return;   // (none, or the world's getGL has run: it leaves WORLD_START false)
  var A = d.documentElement.attributes || [], i;
  for (i = 0; i < A.length; i++) if (/^data-/.test(A[i].name) && !/^data-sky(-at)?$/.test(A[i].name)) return;   // (a harness attribute: the dev pages keep the world's own path)
  try { if (window.matchMedia && window.matchMedia('(forced-colors: active)').matches) return; } catch (e) { return; }
  var ua = navigator.userAgent || '';   // (the world's WebKit test: there links are synchronous, so the world issues one at a time)
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua))) return;
  /* (after the first paint) nothing more until the page's first contentful paint is reported (two frames where paint
     timing is missing): then the table (the programs' GLSL, its own file: parsed before the first paint, its 1 MB held
     it back on a slow phone) is read by a worker (its script: no DOM, no fetch), and when its sources are in the
     programs are issued here; issued at once, their compiles
     held the first frame on a starved GPU process (FCP 0.07 -> 1.08 s on 4 cores). The world asking for its context
     first (its getContext, wrapped once here): issued just before it takes the context if the table is in, else the
     start file stands aside and the world compiles its own, as without it */
  var pc = canvas.getContext, done = 0, asked = 0, TB = null;
  canvas.getContext = function (t, o) { asked = 1; go(); return pc.call(this, t, o); };
  function go() {
  if (done || (!TB && !asked)) return;
  done = 1; canvas.getContext = pc;
  if (!TB || window.WORLD_START !== undefined) return;   // (the world first, before the table: its own path)
  var Q = TB.Q, T = TB.T, TH = TB.TH;
  var gl = pc.call(canvas, 'webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' });   // (the world's boot attributes, as shipped)
  if (!gl) return;
  var S = window.WORLD_START = { gl: gl, defs: null, progs: {}, lost: 0 };
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); S.lost = 1; });   // (lost before the world listens: it may still be restored)
  var cbf = gl.getExtension('EXT_color_buffer_float'), cbh = cbf ? null : gl.getExtension('EXT_color_buffer_half_float'), par = gl.getExtension('KHR_parallel_shader_compile');
  var dbg = gl.getExtension('WEBGL_debug_renderer_info'), ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER) || '');
  if (!par || /SwiftShader|llvmpipe|Software/i.test(ren)) return;   // (one at a time, or the still sky: the world's own path)
  var hp = !!(HP && cbf && HP(ren)), TT = hp ? TH : T;   // (the world's EXT.hp: its split height's devices issue their own set)
  var V = '#version 300 es\n', W = V + (S.defs = (cbf || cbh ? '' : '#define LIND_PACKED\n') + (cbf ? '' : '#define GC_PACKED\n') + (hp ? '#define HPSPLIT\n' : '')), P = S.progs;   // (the world's DEFS)
  for (i = 0; i < TT.length; i += 2) {
    if (S.lost || gl.isContextLost()) return;
    var vs = Q[TT[i]].replace(V, W), fs = Q[TT[i + 1]].replace(V, W), p = gl.createProgram(), v = gl.createShader(gl.VERTEX_SHADER), f;
    gl.shaderSource(v, vs); gl.compileShader(v);
    f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(f, fs); gl.compileShader(f);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    var k = vs + '\u0000' + fs; (P[k] || (P[k] = [])).push({ p: p, v: v, f: f });   // (keyed by the text as issued: the world adopts only a program whose text it would issue itself)
  }
  gl.flush();
  }
  function load() {   // (the table read off the main thread and off the DOM: the worker's script posts the sources and closes)
    if (done || typeof Worker !== 'function') return;
    try { var w = new Worker('/start-table.v4.js'); w.addEventListener('message', function (e) { try { w.terminate(); } catch (x) {} if (e.data && e.data.Q && e.data.T) { TB = e.data; go(); } }); } catch (x) { /* no worker: the world's own path */ }
  }
  var PO = window.PerformanceObserver, two = function () { requestAnimationFrame(function () { requestAnimationFrame(load); }); };
  if (PO && PO.supportedEntryTypes && PO.supportedEntryTypes.indexOf('paint') >= 0) {
    try { new PO(function (l, o) { if (l.getEntriesByName('first-contentful-paint').length) { o.disconnect(); load(); } }).observe({ type: 'paint', buffered: true }); } catch (e) { two(); }
  } else two();
})();
