  /* the switches' meanings: order 0 the slice's GPU jobs at the start of the next drawn frame, before its draws
     (the design's), 1 after the frame's flush; fence 1 polled and made at the frame's start every frame (the design's),
     2 every second frame, 3 polled at the start and made after the flush, 0 all but off (every eighth frame); gtrial
     stage G's timed trials (0: pinned at the full scale; in development pinned unless 2); rbfix (dev) the read-back's
     arrival fixed two frames after its fence; hblack (dev) stage H's thumbnail read as black (the fallback's test);
     ab the record mode's experiment: 'e1' the five arms of the A/B pairs in rotating 20 s blocks (recArm), 'order' and
     'fence' two-minute halves, 'none' */
  var SWLIVE = { order: 1, fence: 1, birds: 1, stream: 1, words: 1, frz: 1, look: 1, noanim: 1, camhold: 1, cacc: 1, stb: 1, lay: 1, wlive: 1, wsync: 1 };   // (cacc live: the record's arm)   // (camhold, dev: the camera held, the clock running: the frozen-scene film)
  /* the programs' defines, the late programs and the folds, as the record files them (070's state) */
  function defsRec() { return CLA ? { twilight: CLA.twilight, rain: CLA.rain, water: CLA.water, dev: CLA.dev, defs: CLA.defs } : null; }
  function lateRec() {
    return { on: LATEP.on, decided: LATEP.decided, sand: LATEP.sand, R: Math.round(LATEP.R), names: LATEP.names.slice(), ready: LATEP.ready, done: LATEP.done.slice(), warmed: LATEP.warmed.slice(), miss: LATEP.miss, misses: LATEP.misses.slice(), birdWait: LATEP.birdWait, birdsAt: LATEP.birdsAt };
  }
  function foldRec() {
    var G = EP && EP.compg;
    return { on: FOLDX.on, fixed: FOLDX.fixed ? FOLDX.fixed.map(function (x) { return x[0] + ' = ' + x[1]; }) : null, prog: FOLDX.prog, absent: FOLDX.absent, B: FOLDX.B, live: FOLDX.live,
      general: G ? (G.st === 3 ? (G.ok ? (G.warmed ? 'warmed' : 'done') : 'broken') : 'pending') : 'none', used: FOLDX.used, miss: FOLDX.miss, misses: FOLDX.misses.slice() };
  }
  var REC = null, RECW = null;
  var RING = 1 << 16;
  var PHN = ['boot', 'dissolve', 'steady', 'control', 'resume', 'resize'], PH_BOOT = 0, PH_DIS = 1, PH_STEADY = 2, PH_CTL = 3, PH_RES = 4, PH_SIZE = 5;
  var TOPN = [8, 8, 20, 8, 8, 8];   // (the longest intervals kept a phase: 20 of steady flight's for D1, 8 of the others)
  function recInit() {
    REC = {
      started: clockNow(), nav0: 0,
      boot: [['world.js eval start', EVAL0]], regs: [], links: [], prog1: [], scripts: null,
      // every presented interval (ms), its phase, the tags of the frame before it, its callback's CPU (ms), sim time and sync ms
      ints: new Float32Array(RING), ph: new Uint8Array(RING), tags: new Uint8Array(RING), cpu: new Float32Array(RING), simt: new Float32Array(RING), syn: new Float32Array(RING), n: 0,
      lastTs: -1, P: 1000 / 60, k: 1,
      fr: { c0: 0, sync: 0, syncN: 0, fence: 0, poll: 0, read: 0, stage: 0, stageWhy: '', up: 0, upN: 0, layers: 0, probes: 0, gpu: 0, made: 0, rbBytes: 0 },
      tagsPrev: 0, cpuPrev: 0, syncPrev: 0, whyPrev: '',
      // the phases: each a time (rAF ms) until which an interval ending then counts as it
      dissolveUntil: -1, resumeUntil: -1, resizeUntil: -1, resumePending: false, resizePending: false, hidden: 0,
      // each synchronous call: [calls, ms] before the world shows (the boot) and [calls, ms] after
      sync: { fenceSync: [0, 0, 0, 0], clientWaitSync: [0, 0, 0, 0], getBufferSubData: [0, 0, 0, 0], readPixels: [0, 0, 0, 0], finish: [0, 0, 0, 0], getError: [0, 0, 0, 0], getParameter: [0, 0, 0, 0], getProgramParameter: [0, 0, 0, 0], getShaderParameter: [0, 0, 0, 0], checkFramebufferStatus: [0, 0, 0, 0], getUniformLocation: [0, 0, 0, 0], getActiveUniform: [0, 0, 0, 0], getSyncParameter: [0, 0, 0, 0], isContextLost: [0, 0, 0, 0], getExtension: [0, 0, 0, 0] },
      syncMaxFrame: 0, syncSumMaxFrame: 0, syncMaxBoot: 0, syncSumMaxBoot: 0,
      fenceN: 0, fenceLag: 0, fencePolls: 0, fenceNow: null,
      rbPolledLast: 0, armNow: 0,
      cac: new Uint8Array(RING), cacPrev: 0,   // (the clouds' accumulation on (1) or off (0) in the frame before each interval)
      arm: new Uint8Array(RING), syF: new Float32Array(RING), syP: new Float32Array(RING), syR: new Float32Array(RING), up: new Float32Array(RING), lay: new Uint16Array(RING), prb: new Uint16Array(RING), lagF: new Uint8Array(RING),
      armPrev: 0, syFPrev: 0, syPPrev: 0, syRPrev: 0, upPrev: 0, layPrev: 0, prbPrev: 0, lagPrev: 0, armLog: [],
      tsI: new Float64Array(RING), pass: [], passOpen: null, visitK: -1,   // (D3: each passage's intervals; tsI each interval's end)
      madeAfter: { Buffer: 0, Texture: 0, VertexArray: 0, Framebuffer: 0, Renderbuffer: 0, Program: 0, Shader: 0, Sync: 0, linkProgram: 0, compileShader: 0 },
      freedAfter: { Buffer: 0, Texture: 0, VertexArray: 0, Framebuffer: 0, Renderbuffer: 0, Program: 0, Shader: 0, Sync: 0 },
      upAfter: { clientTex: 0, clientTexBytes: 0, pboTex: 0, bufBytes: 0, bufN: 0, overCap: 0 },
      keys: { full: 0, metal: 0, fullAfter: 0, metalAfter: 0, first: [] },   // pipeline keys first drawn: in all, and after the world shows (8.2)
      perSec: { miss: new Uint16Array(1800), frames: new Uint16Array(1800) }, stageCpu: {}, profLast: 0, profName: null,
      rung: [], cadence: [], period: [], flips: [], firstFlip: null, lat: [], ori: [], oriF: [], minute: [], sw: [], ab: null,
      shownAt: -1, dissolveEnd: -1, readyAt: -1, bootStartAt: -1, course: null, halted: false, ctl: null, lowPower: null,
      hold: { n: 0, frames: 0, ms: 0, longestMs: 0, list: [] }, holdCur: null, holdFirstTs: -1, waitsAtJ: 0, heldAtJ: 0,   // (the flight's holds at junctions)
      longest: [[], [], [], [], [], []]   // a phase each: [interval ms, kP, tags, sim t, callback ms, sync ms, frame index, phase, why]
    };
    REC.nav0 = 0;   // (performance's own origin is navigation start: clockNow() is ms since it)
    for (var k in SW) REC.sw.push([0, k, SW[k]]);
    PROF = recProf;
  }
  /* the synchronous calls (each a round trip to the GPU process: timed) and the GL objects, uploads and pipeline keys
     (counted): the context's own methods wrapped on this context, so the engine's calls (and the ink birds', through
     HOST.gl) go through them. Only the synchronous calls carry a clock read; the rest keep small integers, and a draw
     builds its key as a number (no allocation but a key's first sight). Wrapped once the context is made (boot stage A) */
  var KS = { prog: 0, dfb: null, rfb: null, vao: null, blend: 0, bf: 0, be: 0x8006, cmask: 15, dt: 0, df: 1, dw: 1, cull: 0, cm: 2 };
  function recWrap() {
    if (!REC || REC.wrapped || !gl) return;
    REC.wrapped = true;
    REC.fdRaw = { getError: gl.getError, readPixels: gl.readPixels };   // (the first-draw guard's round trips, unwrapped: the record's sync counts never see them)
    var names = Object.keys(REC.sync);
    names.forEach(function (n) {
      var f = gl[n]; if (typeof f !== 'function') return;
      var S = REC.sync[n];
      gl[n] = function () {
        var a = clockNow(), r = f.apply(gl, arguments), d = clockNow() - a;
        if (shown) { S[2]++; S[3] += d; } else { S[0]++; S[1] += d; }
        if (n !== 'isContextLost' && n !== 'getExtension') { REC.fr.sync += d; REC.fr.syncN++; if (n === 'fenceSync') REC.fr.fence += d; else if (n === 'clientWaitSync') REC.fr.poll += d; else if (n === 'getBufferSubData') REC.fr.read += d; }
        return r;
      };
    });
    ['Buffer', 'Texture', 'VertexArray', 'Framebuffer', 'Renderbuffer', 'Program', 'Shader'].forEach(function (k) {
      var c = gl['create' + k], d = gl['delete' + k];
      gl['create' + k] = function () { if (shown) { REC.madeAfter[k]++; REC.fr.made++; REC.fr.stage |= 1; REC.fr.stageWhy = 'create' + k; } return c.apply(gl, arguments); };
      gl['delete' + k] = function (o) { if (shown && o) { REC.freedAfter[k]++; REC.fr.stage |= 16; REC.fr.stageWhy = 'delete' + k; } return d.call(gl, o); };   // (a free outside the fence ring is stage work too, 3.1)
    });
    var lp = gl.linkProgram, cs = gl.compileShader;
    gl.linkProgram = function (p) { if (shown) { REC.madeAfter.linkProgram++; REC.fr.stage |= 2; REC.fr.stageWhy = 'link'; } return lp.call(gl, p); };
    gl.compileShader = function (s) { if (shown) { REC.madeAfter.compileShader++; REC.fr.stage |= 2; REC.fr.stageWhy = 'compile'; } return cs.call(gl, s); };
    var ds = gl.deleteSync; gl.deleteSync = function (o) { if (shown && o) REC.freedAfter.Sync++; return ds.call(gl, o); };   // (the fence ring: exempt)
    var bd = gl.bufferData, bsd = gl.bufferSubData;
    gl.bufferData = function (t, a) { var b = typeof a === 'number' ? a : (a && a.byteLength) || 0; REC.fr.up += b; REC.fr.upN++; if (shown) { REC.upAfter.bufBytes += b; REC.upAfter.bufN++; } return bd.apply(gl, arguments); };
    gl.bufferSubData = function (t, o, a) { var b = (a && a.byteLength) || 0; REC.fr.up += b; REC.fr.upN++; if (shown) { REC.upAfter.bufBytes += b; REC.upAfter.bufN++; } return bsd.apply(gl, arguments); };
    ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D'].forEach(function (n) {
      var f = gl[n];
      gl[n] = function () {
        var a = arguments, last = a[a.length - 1], pbo = typeof last === 'number' && a.length >= 9, b = last && last.byteLength ? last.byteLength : 0;
        REC.fr.up += b; if (b || pbo) REC.fr.upN++;
        if (shown && (b || pbo)) { if (pbo) REC.upAfter.pboTex++; else { REC.upAfter.clientTex++; REC.upAfter.clientTexBytes += b; } }
        if ((n === 'texImage2D' || n === 'texImage3D') && a.length >= 3) { var x = texBound(a[0]); if (x) TEXF.set(x, a[2]); }   // (its format, for the targets' keys)
        return f.apply(gl, arguments);
      };
    });
    var up = gl.useProgram, seen = new Set();
    gl.useProgram = function (p) {
      KS.prog = p ? progId(p) : 0;
      if (p && !seen.has(p)) { seen.add(p); var nm = progName(p); REC.prog1.push([+clockNow().toFixed(1), nm, shown ? 1 : 0]); if (shown) { REC.fr.stage |= 4; REC.fr.stageWhy = 'first use ' + nm; } }
      return up.call(gl, p);
    };
    recWrapKeys();
    fdGuard();
  }
  /* the first-draw guard, the record only, keyed on the draw's pipeline key as ANGLE's D3D11 back end sees it, not
     on the program alone. Its link builds one vertex shader for the declared (float) inputs
     and one pixel shader for the first output only ([ATT0]); a draw in another layout compiles a variant synchronously
     inside the draw (the noise's eight-target draw: 2.4 s): a pixel shader per output layout (the colour attachments
     attached, enabled by drawBuffers and written), a vertex shader per input signature (an integer attribute read as
     float is converted in the shader), a geometry shader per primitive class (flat varyings under the last-vertex
     convention, sized points), stream-out, rasterizer discard. So a key is: the program; the draw framebuffer's enabled
     colour attachments with their formats, then depth and stencil (the canvas its own: a warm draw into a 1x1 target
     never stands for the canvas's); the vertex array's enabled attributes (size, type, normalized or integer, divisor)
     and any current value not float (strides and offsets are the buffers' bindings, not the layout's); the primitive
     class; the provoking vertex, transform feedback, rasterizer discard. A blit is keyed on its two framebuffers, mask,
     filter and scaling. A key's first use is timed with the real clock between two waits: before the call the GPU is
     drained (one texel of the canvas read back: a copy queued after all the work before it, waited for; its time
     kept apart), and after it a getError (the GPU process has run the call, so a variant ANGLE builds inside it is in)
     and one texel read back again (the GPU has run it too: a driver's late compile is in). WebGL's finish() is a
     flush in Chrome and waits for nothing. [key, ms, frame, shown, at, drain ms, ms to the getError] in
     REC.firstDraw.keys, and each program's first key as [program, ms, frame, shown, at] in REC.firstDraw.list (each
     program once). The record's guard (gguard.sh, kept with the development record, not in this repository) fails
     a key over 30 ms that its known list does not name */
  function fdGuard() {
    var raw = REC.fdRaw, F = REC.firstDraw = { seen: {}, list: [], keys: [], over: 0 };
    var KEYS = new Map(), OUTS = new Map(), OUTN = [''], RDS = new Map(), RDN = [''], INS = new Map(), INN = [''], CV = [], GX = { cv: 0, v: 0, rd: 0, xfb: 0, pv: 0, pack: null }, PX = new Uint8Array(4);
    var FMT = { 6407: 'RGB', 6408: 'RGBA', 32849: 'RGB8', 32856: 'RGBA8', 32857: 'RGB10_A2', 33189: 'D16', 33190: 'D24', 33321: 'R8', 33323: 'RG8', 33325: 'R16F', 33326: 'R32F', 33327: 'RG16F', 33328: 'RG32F', 34836: 'RGBA32F', 34842: 'RGBA16F', 35056: 'D24S8', 35898: 'R11G11B10F', 35907: 'SRGB8_A8', 36012: 'D32F', 36013: 'D32FS8', 36168: 'S8' };
    var TY = { 5120: 'i8', 5121: 'u8', 5122: 'i16', 5123: 'u16', 5124: 'i32', 5125: 'u32', 5126: 'f32', 5131: 'f16', 33640: 'u2_10_10_10', 36255: 'i2_10_10_10' };
    var TOPO = ['points', 'lines', 'triangles'];
    function sid(M, N, s) { var i = M.get(s); if (i === undefined) { i = N.length; N.push(s); M.set(s, i); } return i; }
    sid(OUTS, OUTN, 'canvas'); sid(RDS, RDN, 'canvas');   // (id 1: the default framebuffer, its format the context's)
    function fmtName(a) {   // (fbRec's attachment strings: 't' or 'r', the format, a renderbuffer's samples after '/')
      var p = a.slice(1).split('/'), f = +p[0];
      return (FMT[p[0]] || (f === f ? '0x' + f.toString(16) : p[0])) + (p[1] && +p[1] > 0 ? 'x' + p[1] : '');
    }
    function fbStr(fb, all) {   // (the enabled colour attachments in order, then depth and stencil; all: every attached one, a blit's source)
      if (!fb) return 'canvas';
      var r = fbRec(fb), s = [], i, a;
      for (i = 0; i < 16; i++) { a = r.att[0x8CE0 + i]; if (a && (all || (r.db >> i) & 1)) s.push('c' + i + ':' + fmtName(a)); }
      if ((a = r.att[0x821A])) s.push('ds:' + fmtName(a));
      if ((a = r.att[0x8D00])) s.push('d:' + fmtName(a));
      if ((a = r.att[0x8D20])) s.push('s:' + fmtName(a));
      return s.length ? s.join(' ') : 'none';
    }
    function outId(fb) { if (!fb) return 1; var r = fbRec(fb); if (r.fdo === undefined || r.fdov !== r.fdv) { r.fdo = sid(OUTS, OUTN, fbStr(fb, false)); r.fdov = r.fdv; } return r.fdo; }
    function rdId(fb) { if (!fb) return 1; var r = fbRec(fb); if (r.fdr === undefined || r.fdrv !== r.fdv) { r.fdr = sid(RDS, RDN, fbStr(fb, true)); r.fdrv = r.fdv; } return r.fdr; }
    function attStr(s) {   // (vaoRec's strings: 'size:type:norm:stride:offset', or 'Isize:type:stride:offset' for an integer one)
      if (!s) return '?';
      var p = s.split(':');
      return p[0].charAt(0) === 'I' ? 'I' + p[0].slice(1) + 'x' + (TY[p[1]] || p[1]) : p[0] + 'x' + (TY[p[1]] || p[1]) + (p[2] === '1' ? 'n' : '');
    }
    function vaStr(r) {
      var s = [], i;
      for (i = 0; i < 32; i++) {
        if ((r.en >> i) & 1) s.push(i + '=' + attStr(r.att[i]) + (r.div[i] ? '/d' + r.div[i] : ''));
        else if (CV[i]) s.push(i + '=cv:' + CV[i]);
      }
      return s.length ? s.join(' ') : 'none';
    }
    function inId(v) { var r = vaoRec(v); if (r.fdi === undefined || r.fdiv !== r.fdv || r.fdic !== GX.cv) { r.fdi = sid(INS, INN, vaStr(r)); r.fdiv = r.fdv; r.fdic = GX.cv; } return r.fdi; }
    // the layouts' changes (after the record's own wrappers have kept them in fbRec and vaoRec): a version each
    function after(n, fn) { var f = gl[n]; if (typeof f !== 'function') return; gl[n] = function () { var r = f.apply(gl, arguments); fn.apply(null, arguments); return r; }; }
    function fbBump(fb) { if (fb) fbRec(fb).fdv = ++GX.v; }
    function fbOf(t) { return t === 0x8CA8 ? KS.rfb : KS.dfb; }
    after('framebufferTexture2D', function (t) { fbBump(fbOf(t)); });
    after('framebufferTextureLayer', function (t) { fbBump(fbOf(t)); });
    after('framebufferRenderbuffer', function (t) { fbBump(fbOf(t)); });
    after('drawBuffers', function () { fbBump(KS.dfb); });
    ['vertexAttribPointer', 'vertexAttribIPointer', 'vertexAttribDivisor', 'enableVertexAttribArray', 'disableVertexAttribArray'].forEach(function (n) { after(n, function () { vaoRec(KS.vao).fdv = ++GX.v; }); });
    function cv(k) { return function (i) { if ((CV[i] || 0) !== k) { CV[i] = k; GX.cv++; } }; }
    ['vertexAttrib1f', 'vertexAttrib2f', 'vertexAttrib3f', 'vertexAttrib4f', 'vertexAttrib1fv', 'vertexAttrib2fv', 'vertexAttrib3fv', 'vertexAttrib4fv'].forEach(function (n) { after(n, cv(0)); });
    after('vertexAttribI4i', cv('i')); after('vertexAttribI4iv', cv('i')); after('vertexAttribI4ui', cv('u')); after('vertexAttribI4uiv', cv('u'));
    after('enable', function (c) { if (c === 0x8C89) GX.rd = 1; });
    after('disable', function (c) { if (c === 0x8C89) GX.rd = 0; });
    after('beginTransformFeedback', function () { GX.xfb = 1; }); after('resumeTransformFeedback', function () { GX.xfb = 1; });
    after('endTransformFeedback', function () { GX.xfb = 0; }); after('pauseTransformFeedback', function () { GX.xfb = 0; });
    after('bindBuffer', function (t, b) { if (t === 0x88EB) GX.pack = b || null; });   // (a pack buffer bound would make the read below a copy into it, not a wait)
    var gx = gl.getExtension;
    gl.getExtension = function (nm) {
      var x = gx.apply(gl, arguments);
      if (x && nm === 'WEBGL_provoking_vertex' && !x.fdPv) { var pv = x.provokingVertexWEBGL; x.fdPv = true; x.provokingVertexWEBGL = function (m) { GX.pv = m === 0x8E4D ? 1 : 0; return pv.call(x, m); }; }
      return x;
    };
    // a key's first use, timed: the GPU drained first, so the time is the call's own (its variant built, its work run)
    function wait() {   // (one texel of the canvas (RGBA, UNSIGNED_BYTE: always readable), read back at once)
      var pk = GX.pack, rf = KS.rfb;
      if (pk) gl.bindBuffer(0x88EB, null);
      if (rf) gl.bindFramebuffer(0x8CA8, null);
      raw.readPixels.call(gl, 0, 0, 1, 1, 0x1908, 0x1401, PX);
      if (rf) gl.bindFramebuffer(0x8CA8, rf);
      if (pk) gl.bindBuffer(0x88EB, pk);
    }
    function timed(f, a, nm, key, id) {
      var q0 = clockNow(); wait();
      var t0 = clockNow(), r = f.apply(gl, a); raw.getError.call(gl);
      var t1 = clockNow(); wait();
      var ms = +(clockNow() - t0).toFixed(2), sh = shown ? 1 : 0;
      if (F.keys.length < 8000) F.keys.push([key, ms, FRAMEN, sh, +t0.toFixed(1), +(t0 - q0).toFixed(2), +(t1 - t0).toFixed(2)]); else F.over++;
      if (id && !F.seen[id]) { F.seen[id] = 1; F.list.push([nm, ms, FRAMEN, sh, +t0.toFixed(1)]); }
      return r;
    }
    ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'].forEach(function (n) {
      var f = gl[n]; if (typeof f !== 'function') return;
      gl[n] = function (mode) {
        var id = KS.prog;
        if (!id) return f.apply(gl, arguments);
        var o = outId(KS.dfb), i = inId(KS.vao), tp = mode === 0 ? 0 : mode <= 3 ? 1 : 2, fl = GX.rd | (GX.xfb << 1) | (GX.pv << 2);
        var k = o < 4096 && i < 4096 && id < 65536 ? (((id * 4096 + o) * 4096 + i) * 4 + tp) * 8 + fl : id + ':' + o + ':' + i + ':' + tp + ':' + fl;
        if (KEYS.has(k)) return f.apply(gl, arguments);
        KEYS.set(k, 1);
        var nm = PNAMES[id] && PNAMES[id] !== '?' ? PNAMES[id] : 'unregistered';   // (unregistered: a program the boot makes and uses at once, probeFilter's)
        return timed(f, arguments, nm, nm + ' | out ' + OUTN[o] + ' | in ' + INN[i] + ' | ' + TOPO[tp] + (GX.rd ? ' discard' : '') + (GX.xfb ? ' xfb' : '') + (GX.pv ? ' first-vertex' : ''), id);
      };
    });
    var bl = gl.blitFramebuffer;
    if (typeof bl === 'function') gl.blitFramebuffer = function (a0, a1, a2, a3, b0, b1, b2, b3, mask, filt) {
      var ro = rdId(KS.rfb), o = outId(KS.dfb), sc = a2 - a0 !== b2 - b0 || a3 - a1 !== b3 - b1 ? 1 : 0, k = 'b' + ro + ':' + o + ':' + mask + ':' + filt + ':' + sc;
      if (KEYS.has(k)) return bl.apply(gl, arguments);
      KEYS.set(k, 1);
      return timed(bl, arguments, 'blit', 'blit | ' + RDN[ro] + ' to ' + OUTN[o] + ' |' + (mask & 0x4000 ? ' colour' : '') + (mask & 0x100 ? ' depth' : '') + (mask & 0x400 ? ' stencil' : '') + ' | ' + (filt === 0x2601 ? 'linear' : 'nearest') + (sc ? ' scaled' : ''), 0);
    };
  }
  /* the pipeline key of every draw (8.2), kept as the GL state that makes it: the program; the target's
     attachment formats and draw buffers; the vertex array's layout (formats, offsets, strides, divisors, enabled
     arrays); the topology class; the colour mask; the blend state; and, for the full key, depth test, function and
     writes and the cull state. Targets and layouts get small ids when they change (their strings made then, never in
     a draw); a draw packs the ids into one number and looks it up */
  var PIDS = new WeakMap(), PIDN = 0, PNAMES = [''], FBR = new WeakMap(), VAR = new WeakMap(), VDEF = { att: [], div: [], en: 0, sig: -1 }, TEXF = new WeakMap(), RBF = new WeakMap(), TEXB = [], FSIGS = new Map(), VSIGS = new Map(), BLENDS = new Map();
  var KEYF = new Set(), KEYM = new Set(), TUNIT = 0;
  function progId(p) { var i = PIDS.get(p); if (i === undefined) { i = ++PIDN; PIDS.set(p, i); PNAMES[i] = progName(p); } return i; }
  function sigId(M, s) { var i = M.get(s); if (i === undefined) { i = M.size + 1; M.set(s, i); } return i; }
  function texBound(target) { return TEXB[TUNIT * 4 + (target === 0x806F ? 1 : target === 0x8C1A ? 2 : target === 0x8513 ? 3 : 0)] || null; }
  function fbRec(fb) { var r = FBR.get(fb); if (!r) { r = { att: {}, db: 1, sig: -1 }; FBR.set(fb, r); } return r; }
  function vaoRec(v) { if (!v) return VDEF; var r = VAR.get(v); if (!r) { r = { att: [], div: [], en: 0, sig: -1 }; VAR.set(v, r); } return r; }
  function fbSig(fb) {
    if (!fb) return 0;   // (the canvas: its own format)
    var r = fbRec(fb);
    if (r.sig < 0) { var ks = Object.keys(r.att).sort(), s = 'fb'; for (var i = 0; i < ks.length; i++) if (r.att[ks[i]] !== null) s += ' ' + ks[i] + ':' + r.att[ks[i]]; r.sig = sigId(FSIGS, s + ' db' + r.db) & 255; }
    return r.sig;
  }
  function vaoSig(r) {
    if (r.sig < 0) { var s = 'va'; for (var i = 0; i < 32; i++) if ((r.en >> i) & 1) s += ' ' + i + '=' + (r.att[i] || '?') + (r.div[i] ? '/d' + r.div[i] : ''); r.sig = sigId(VSIGS, s) & 1023; }
    return r.sig;
  }
  function recWrapKeys() {
    function wrap(n, before) { var f = gl[n]; if (typeof f !== 'function') return; gl[n] = function (a, b, c, d, e, g) { before(a, b, c, d, e, g); return f.call(gl, a, b, c, d, e, g); }; }
    wrap('bindFramebuffer', function (t, fb) { if (t === 0x8D40) { KS.dfb = fb; KS.rfb = fb; } else if (t === 0x8CA9) KS.dfb = fb; else if (t === 0x8CA8) KS.rfb = fb; });
    function attFb(t) { return t === 0x8CA8 ? KS.rfb : KS.dfb; }
    wrap('activeTexture', function (u) { TUNIT = u - 0x84C0; });
    wrap('bindTexture', function (t, x) { TEXB[TUNIT * 4 + (t === 0x806F ? 1 : t === 0x8C1A ? 2 : t === 0x8513 ? 3 : 0)] = x; });
    wrap('texStorage2D', function (t, l, f) { var x = texBound(t); if (x) TEXF.set(x, f); });
    wrap('texStorage3D', function (t, l, f) { var x = texBound(t); if (x) TEXF.set(x, f); });
    var rbNow = null;
    wrap('bindRenderbuffer', function (t, r) { rbNow = r; });
    wrap('renderbufferStorage', function (t, f) { if (rbNow) RBF.set(rbNow, f); });
    wrap('renderbufferStorageMultisample', function (t, s, f) { if (rbNow) RBF.set(rbNow, f + '/' + s); });
    wrap('framebufferTexture2D', function (t, a, tt, x) { var fb = attFb(t); if (!fb) return; var r = fbRec(fb); r.att[a] = x ? 't' + (TEXF.get(x) || '?') : null; r.sig = -1; });
    wrap('framebufferTextureLayer', function (t, a, x) { var fb = attFb(t); if (!fb) return; var r = fbRec(fb); r.att[a] = x ? 't' + (TEXF.get(x) || '?') : null; r.sig = -1; });
    wrap('framebufferRenderbuffer', function (t, a, rt, rb) { var fb = attFb(t); if (!fb) return; var r = fbRec(fb); r.att[a] = rb ? 'r' + (RBF.get(rb) || '?') : null; r.sig = -1; });
    wrap('drawBuffers', function (list) { if (!KS.dfb || !list) return; var r = fbRec(KS.dfb), m = 0; for (var i = 0; i < list.length; i++) if (list[i] !== 0) m |= 1 << i; if (r.db !== m) { r.db = m; r.sig = -1; } });
    wrap('bindVertexArray', function (v) { KS.vao = v; });
    var arrNow = null;
    wrap('bindBuffer', function (t, b) { if (t === 0x8892) arrNow = b; });
    wrap('vertexAttribPointer', function (i, n, ty, nm, st, off) { var r = vaoRec(KS.vao), s = n + ':' + ty + ':' + (nm ? 1 : 0) + ':' + st + ':' + (off || 0); if (r.att[i] !== s) { r.att[i] = s; r.sig = -1; } });
    wrap('vertexAttribIPointer', function (i, n, ty, st, off) { var r = vaoRec(KS.vao), s = 'I' + n + ':' + ty + ':' + st + ':' + (off || 0); if (r.att[i] !== s) { r.att[i] = s; r.sig = -1; } });
    wrap('vertexAttribDivisor', function (i, d) { var r = vaoRec(KS.vao); if ((r.div[i] || 0) !== d) { r.div[i] = d; r.sig = -1; } });
    wrap('enableVertexAttribArray', function (i) { var r = vaoRec(KS.vao); if (!((r.en >> i) & 1)) { r.en |= 1 << i; r.sig = -1; } });
    wrap('disableVertexAttribArray', function (i) { var r = vaoRec(KS.vao); if ((r.en >> i) & 1) { r.en &= ~(1 << i); r.sig = -1; } });
    wrap('enable', function (c) { if (c === 0x0BE2) KS.blend = 1; else if (c === 0x0B71) KS.dt = 1; else if (c === 0x0B44) KS.cull = 1; });
    wrap('disable', function (c) { if (c === 0x0BE2) KS.blend = 0; else if (c === 0x0B71) KS.dt = 0; else if (c === 0x0B44) KS.cull = 0; });
    function bf(code) { var i = BLENDS.get(code); if (i === undefined) { i = BLENDS.size + 1; BLENDS.set(code, i); } return i & 63; }
    function fct(x) { return x <= 1 ? x : x >= 0x8001 ? x - 0x8001 + 12 : x - 0x300 + 2; }   // (a blend factor in 4 bits)
    wrap('blendFunc', function (s, d) { KS.bf = bf(fct(s) * 4096 + fct(d) * 256 + fct(s) * 16 + fct(d)); });
    wrap('blendFuncSeparate', function (a, b, c, d) { KS.bf = bf(fct(a) * 4096 + fct(b) * 256 + fct(c) * 16 + fct(d)); });
    wrap('blendEquation', function (e) { KS.be = e; });
    wrap('colorMask', function (r, g, b, a) { KS.cmask = (r ? 1 : 0) | (g ? 2 : 0) | (b ? 4 : 0) | (a ? 8 : 0); });
    wrap('depthFunc', function (f) { KS.df = (f - 0x200) & 7; });
    wrap('depthMask', function (m) { KS.dw = m ? 1 : 0; });
    wrap('cullFace', function (m) { KS.cm = m === 0x404 ? 1 : m === 0x405 ? 2 : 3; });
    function draw(mode) {
      var topo = mode === 0 ? 0 : mode <= 3 ? 1 : 2;
      var mk = (((((KS.prog & 255) * 256 + fbSig(KS.dfb)) * 1024 + vaoSig(vaoRec(KS.vao))) * 4 + topo) * 256 + (KS.blend ? 1 + (KS.bf & 63) + ((KS.be || 0x8006) === 0x8006 ? 0 : 64) : 0)) * 16 + KS.cmask;   // (40 bits: a double holds it exactly)
      var fk = mk * 256 + (KS.dt ? (1 | (KS.df << 1) | (KS.dw << 4)) : 0) * 8 + (KS.cull ? (1 | (KS.cm << 1)) : 0);
      if (KEYF.has(fk)) return;
      KEYF.add(fk); var K = REC.keys, nm = !KEYM.has(mk);
      if (nm) { KEYM.add(mk); K.metal++; if (shown) K.metalAfter++; }
      K.full++;
      if (shown) { K.fullAfter++; REC.fr.stage |= 8; REC.fr.stageWhy = nm ? 'metal key ' + PNAMES[KS.prog] : 'key ' + PNAMES[KS.prog]; }
      if (K.first.length < 120) K.first.push([+clockNow().toFixed(1), PNAMES[KS.prog] || '?', shown ? 1 : 0, nm ? 1 : 0, FRAMEN]);
    }
    wrap('drawArrays', draw); wrap('drawElements', draw); wrap('drawArraysInstanced', draw); wrap('drawElementsInstanced', draw); wrap('drawRangeElements', draw);
  }
  function progName(p) { for (var i = 0; i < PROGS.length; i++) if (PROGS[i].p === p) return PROGS[i].name; return '?'; }
  /* each pass's CPU, summed a second (the engine's prof() marks, on when the record is) */
  function recProf(name) {
    var now = clockNow();
    if (name !== 'frame' && REC.profName !== null) {
      var sec = Math.floor((now - REC.started) / 1000);
      if (sec >= 0 && sec < 1800) { var A = REC.stageCpu[name] || (REC.stageCpu[name] = new Float32Array(1800)); A[sec] += now - REC.profLast; }
    }
    REC.profName = name; REC.profLast = now;
  }
  function recMark(name) { if (REC) REC.boot.push([name, +clockNow().toFixed(1)]); }
  function recLink(P, ok) { if (REC) REC.links.push([P.name, +clockNow().toFixed(1), ok ? 1 : 0, shown ? 1 : 0]); }
  /* which phase an interval ending at ts falls in */
  function recPhase(ts) {
    var R = REC;
    if (R.halted) return PH_CTL;
    if (!shown) return PH_BOOT;
    if (ts <= R.resumeUntil) return PH_RES;
    if (ts <= R.resizeUntil) return PH_SIZE;
    if (ts <= R.dissolveUntil) return PH_DIS;
    return PH_STEADY;
  }
  /* the start of a frame: the interval that ends here closes with the tags of the frame before; the frame fence (the
     switch: every frame, every second frame, off) is polled once, and made again once it has signalled */
  var TAGN = ['cpu', 'stage', 'sync', 'stream', 'gpu', 'hold'];   // (hold: a frame in which the flight held at a junction for the next visit's build)
  function recStart(ts) {
    var R = REC, f = R.fr;
    f.c0 = clockNow();
    if (R.resumePending) { R.resumePending = false; R.lastTs = -1; R.resumeUntil = ts + 2000; }   // (a hidden tab or an app switch: the gap is not an interval)
    if (R.resizePending) { R.resizePending = false; R.resizeUntil = ts + 1000; }
    if (R.dissolveUntil === -2) R.dissolveUntil = ts + 2000;   // (the world shown in the frame before: its dissolve, from its first presented frame)
    if (R.lastTs >= 0) {
      var d = ts - R.lastTs, i = R.n & (RING - 1), ph = recPhase(ts);
      R.ints[i] = d; R.ph[i] = ph; R.tags[i] = R.tagsPrev; R.cpu[i] = R.cpuPrev; R.simt[i] = SIM.t; R.syn[i] = R.syncPrev; R.n++;
      R.cac[i] = R.cacPrev; R.arm[i] = R.armPrev; R.syF[i] = R.syFPrev; R.syP[i] = R.syPPrev; R.syR[i] = R.syRPrev; R.up[i] = R.upPrev; R.lay[i] = R.layPrev; R.prb[i] = R.prbPrev; R.lagF[i] = R.lagPrev; R.tsI[i] = ts;
      if (R.passOpen) { if (ts <= R.passOpen.at + 4000 && ph !== PH_CTL) recPassAdd(R.passOpen, d); else { R.passOpen.waitsAfter = SIM.waits - R.passOpen.waits; R.passOpen.at = undefined; R.passOpen = null; } }
      if (R.tagsPrev & 32) { R.hold.ms += d; if (R.holdCur) { R.holdCur.ms += d; if (R.holdCur.ms > R.hold.longestMs) R.hold.longestMs = +R.holdCur.ms.toFixed(1); } }   // (a held frame's interval)
      var P = R.P, sec = Math.floor((f.c0 - R.started) / 1000);
      if (sec >= 0 && sec < 1800) { R.perSec.frames[sec]++; if (d > 1.5 * R.k * P) R.perSec.miss[sec]++; }
      var L = R.longest[ph], top = TOPN[ph];
      if (L.length < top || d > L[L.length - 1][0]) {
        L.push([+d.toFixed(1), +(d / (R.k * P)).toFixed(2), tagStr(R.tagsPrev), +SIM.t.toFixed(2), +R.cpuPrev.toFixed(2), +R.syncPrev.toFixed(2), R.n - 1, PHN[ph], R.whyPrev]);
        L.sort(function (a, b) { return b[0] - a[0]; }); if (L.length > top) L.length = top;
      }
    }
    R.lastTs = ts;
    recPassage(ts);
    f.waits0 = SIM.waits || 0;
    f.sync = 0; f.syncN = 0; f.fence = 0; f.poll = 0; f.read = 0; f.stage = 0; f.stageWhy = ''; f.up = 0; f.upN = 0; f.gpu = 0; f.made = 0; f.rbBytes = 0; f.probes = 0; f.layers = 0;
    /* no fence of the record's own: the engine's read-back ring makes the frame's one fence (S3: at most one a
       frame) and its poll says whether the GPU was behind (recEnd: the gpu tag) */
    recCourse(f.c0);
    if (INP.evT0 === undefined) INP.evT0 = 0;
    REC.latPending = INP.evT0 && (INP.dx !== 0 || INP.dy !== 0) ? INP.evT0 : 0;
  }
  /* (D3 "over ten passages: no interval over 3P") each passage the record sees while the world shows: the visit
     changing under the flight; the intervals from 2 s before it to 4 s after, their longest in kP, how many over 3 kP,
     the arm in force, the flight's waits for the next visit's build at the junction (the build streamed: there is no
     synchronous fallback) */
  function recPassAdd(J, d) { var R = REC, x = d / (R.k * R.P); J.n++; if (x > J.maxKP) J.maxKP = +x.toFixed(2); if (x > 3) J.over3++; if (x > 1.5) J.misses++; }
  function recPassage(ts) {
    var R = REC; if (!shown || R.halted || !SIM.V) return;
    var vk = SIM.V.k; if (R.visitK < 0) { R.visitK = vk; return; }
    if (vk === R.visitK) return;
    R.visitK = vk; if (R.pass.length >= 60) return;
    if (R.passOpen) { R.passOpen.waitsAfter = SIM.waits - R.passOpen.waits; R.passOpen.at = undefined; }
    /* the flight holds before the visit changes (simStep waits at the junction): the waits are counted since the last
       passage (counted only after the change, junctionWaits would be 0 by construction), with the held frames' wall
       time, and the window looks back to the hold's start */
    var J = { visit: vk, realm: SIM.V.id, sim: +SIM.t.toFixed(2), wallS: +((clockNow() - R.started) / 1000).toFixed(1), arm: R.armNow ? ARMS[R.armNow - 1].id : null, phase: PHN[recPhase(ts)], n: 0, maxKP: 0, over3: 0, misses: 0, waits: SIM.waits, waitsAfter: 0, at: ts,
      waitsBefore: SIM.waits - R.waitsAtJ, heldMs: +(R.hold.ms - R.heldAtJ).toFixed(1), raise: 0, raiseFrames: 0 };   // (the next visit's largest bake budget raised before this passage, and its frames)
    var back = Math.min(ts - 2000, R.holdFirstTs >= 0 ? R.holdFirstTs : ts);
    for (var q = 1; q <= Math.min(R.n, RING, 20000); q++) { var ii = (R.n - q) & (RING - 1); if (R.tsI[ii] <= back) break; if (R.ph[ii] !== PH_CTL) recPassAdd(J, R.ints[ii]); }
    R.waitsAtJ = SIM.waits; R.heldAtJ = R.hold.ms; R.holdFirstTs = -1;
    R.pass.push(J); R.passOpen = J;
  }
  function tagStr(m) { var o = []; for (var i = 0; i < TAGN.length; i++) if (m & (1 << i)) o.push(TAGN[i]); return o.join('+'); }
  /* the end of a frame: its tags */
  var UPCAP = 256 * 1024;   // (the high tier's upload cap a frame, 5.4: an upload over it is stage work)
  function recEnd(ts) {
    var R = REC, f = R.fr, cpu = clockNow() - f.c0, P = R.P, t = 0;
    if (f.up > UPCAP) { f.stage |= 32; f.stageWhy = 'upload ' + Math.round(f.up / 1024) + ' KB'; if (shown) R.upAfter.overCap++; }
    if (cpu > 0.5 * R.k * P) t |= 1;
    if (f.stage) t |= 2;
    if (f.sync >= 1) t |= 4;
    if (f.up > RECALLOW.bytes || WORK.layers > RECALLOW.layers || f.upN > RECALLOW.calls) t |= 8;
    if (RB.lagged && shown) { f.gpu = 1; R.fenceLag++; }
    if (shown && RB.polled !== R.rbPolledLast) { R.fencePolls++; R.rbPolledLast = RB.polled; }
    R.fenceN = RB.made;
    if (f.gpu) t |= 16;
    /* the flight held in this frame at a junction (SIM.waits grew): tagged hold, counted (frames, wall ms, each
       hold apart) and carried to the passage it ends in (recPassage: junctionWaits, heldMs, its window from the hold's
       start). A hold is the flight stopped in the cloud: it fails the run here and on the phone */
    if ((SIM.waits || 0) > f.waits0 && shown && !R.halted) {
      t |= 32; R.hold.frames++;
      if (!R.holdCur) { R.holdCur = { at: +SIM.t.toFixed(2), wallS: +((clockNow() - R.started) / 1000).toFixed(1), frames: 0, ms: 0 }; R.hold.n++; if (R.holdFirstTs < 0) R.holdFirstTs = R.lastTs; if (R.hold.list.length < 60) R.hold.list.push(R.holdCur); }
      R.holdCur.frames++;
    } else if (R.holdCur && !((SIM.waits || 0) > f.waits0)) R.holdCur = null;
    R.tagsPrev = t; R.cpuPrev = cpu; R.syncPrev = f.sync; R.whyPrev = f.stage ? f.stageWhy : '';
    R.cacPrev = SW.cacc > 0 ? 1 : 0; R.armPrev = R.armNow || 0; R.syFPrev = f.fence; R.syPPrev = f.poll; R.syRPrev = f.read; R.upPrev = f.up; R.layPrev = Math.min(WORK.layers, 65535); R.prbPrev = Math.min(f.probes, 65535); R.lagPrev = f.gpu ? 1 : 0;
    if (shown && !R.halted) { if (f.syncN > R.syncMaxFrame) R.syncMaxFrame = f.syncN; if (f.sync > R.syncSumMaxFrame) R.syncSumMaxFrame = f.sync; }
    else { if (f.syncN > R.syncMaxBoot) R.syncMaxBoot = f.syncN; if (f.sync > R.syncSumMaxBoot) R.syncSumMaxBoot = f.sync; }
    if (f.stage && shown) { if (!R.stageEv) R.stageEv = []; if (R.stageEv.length < 200) R.stageEv.push([+SIM.t.toFixed(2), f.stageWhy]); }
    if (R.latPending && INP.dx === 0 && INP.dy === 0) { if (R.lat.length < 4000) R.lat.push(+(ts - R.latPending).toFixed(1)); INP.evT0 = 0; }
    // the period: learnt as the governor learns it (its median of a second's frames, held under a cap it finds)
    R.P = GOVN[13] > 0 ? GOVN[13] : 1000 / 60;
    if (!R.rung.length || R.rung[R.rung.length - 1][1] !== RUNG) R.rung.push([+SIM.t.toFixed(2), RUNG]);
    var p = +R.P.toFixed(1); if (!R.period.length || R.period[R.period.length - 1][1] !== p) R.period.push([+SIM.t.toFixed(2), p]);
    if (MOTION.on && R.oriF.length < 6000 && FRAMEN % 2 === 0) R.oriF.push([+ts.toFixed(1), +(MOTION.sy / DEG).toFixed(2), +(MOTION.sp / DEG).toFixed(2), +(MOTION.yaw / DEG).toFixed(2), +(MOTION.pitch / DEG).toFixed(2)]);
    var m = Math.floor((clockNow() - R.started) / 60000);
    if (R.minute.length <= m) R.minute.push(recSnap());
  }
  var RECALLOW = { bytes: 256 * 1024, layers: 24, calls: 6 };   // (the stream tag's allowance: provisional, for the A/B on the phone to set)
  function recSnap() {
    var mm = devMem();
    return { t: +((clockNow() - REC.started) / 1000).toFixed(0), sim: +SIM.t.toFixed(1), realm: SIM.V ? SIM.V.id : null, visit: SIM.V ? SIM.V.k : -1, rung: RUNG, period: +REC.P.toFixed(1),
      cells: mm.cells, vols: mm.vols, volMB: mm.volMB, meshMB: mm.meshMB, probes: mm.probesInFlight, gln: null, frames: REC.n, words: WORDCOL };
  }
  /* the record mode: a scripted course while the owner leaves the phone. The A/B halves alternate a live switch in two
     minutes at a time (ABAB, then the last two minutes A, with the owner's own drags if any). The course flies
     straight, with no synthetic drags, so the view turns only when the visitor drags, and the input's latency (D6) is
     measured from the visitor's own drags alone (course.drags stays 0) */
  /* the five arms of the A/B pairs (4.3, 7.5, 3.6): A the design's frame (the GPU jobs before the
     draws, the fence at the frame's start every frame), B the jobs after the flush (the order's pair: A against B), C
     the fence every second frame, D the fence after the flush, E the read-back all but off (the fence's pairs: A
     against C, D and E). In blocks of BLOCK_S (20 s), a rotation of the five a cycle (block b: arm (b + cycle) mod 5),
     so in a ten-minute course each arm runs six blocks, two minutes, each once in every place of the cycle; every
     interval is tagged with the arm in force when its frame began, and the record sums each arm apart (recArms) */
  var ARMS = [{ id: 'A', order: 0, fence: 1, what: 'jobs before the draws; fence at the start, every frame (the design)' }, { id: 'B', order: 1, fence: 1, what: 'jobs after the flush' },
    { id: 'C', order: 0, fence: 2, what: 'fence every second frame' }, { id: 'D', order: 0, fence: 3, what: 'fence after the flush' }, { id: 'E', order: 0, fence: 0, what: 'read-back all but off (every eighth frame)' }];
  var BLOCK_S = 20, CACC_ON = 0.5;   // (the accumulation's share when on in the course)
  function recArmAt(s) { var b = Math.floor(s / BLOCK_S), c = Math.floor(b / ARMS.length); return (b + c) % ARMS.length; }
  function recCourse(now) {
    var C = REC.course; if (!C || !shown || REC.halted) return;
    var s = (now - C.t0) / 1000;
    if (C.e1) {
      if (C.ended) return;
      var a = recArmAt(s);
      if (REC.armNow !== a + 1) { REC.armNow = a + 1; recSet('order', ARMS[a].order, 'arm ' + ARMS[a].id); recSet('fence', ARMS[a].fence, 'arm ' + ARMS[a].id); REC.armLog.push([+s.toFixed(2), ARMS[a].id]); }
      // the clouds' accumulation off in every second cycle of the five (three of the six a course), so each
      // arm runs three blocks with it and three without: the record sums them apart (rec.arms[k].cacc, rec.cacc)
      var cy = Math.floor(Math.floor(s / BLOCK_S) / ARMS.length), cw = cy % 2 ? 0 : CACC_ON;
      if (SW.cacc !== cw) { recSet('cacc', cw, 'cacc arm'); REC.armLog.push([+s.toFixed(2), 'cacc ' + cw]); }
    } else if (C.ab) {
      var half = Math.floor(s / 120), want = half >= 4 ? C.ab[0] : C.ab[half % 2];
      if (SW[C.name] !== want) recSet(C.name, want, 'course');
    }
    C.last = now;
  }
  function recSet(k, v, why) {
    if (!(k in SW)) return false;
    var nv = typeof SW[k] === 'number' ? (+v || 0) : String(v);
    if (SW[k] === nv) return true;
    if (!SWLIVE[k] && READY && !(k === 'ab' && !shown)) return false;   // (a boot-time switch: next load; the A/B arm until the course begins, as the world shows)
    SW[k] = nv; if (REC) REC.sw.push([+((clockNow() - REC.started) / 1000).toFixed(2), k, nv, why || 'set']);
    if (k === 'birds' && !nv && BIRDS && BIRDS.visit) BIRDS.visit(-1);   // (the module's sky cleared: it begins again when they return)
    return true;
  }
  function recShown() {
    if (!REC) return;
    REC.shownAt = clockNow(); REC.dissolveEnd = REC.shownAt + 2000; REC.dissolveUntil = -2; recMark('shown (dissolve begins)');
    if (!REC.course && SW.course) REC.course = { t0: REC.shownAt, last: -1, down: false, n: 0, e1: SW.ab === 'e1', name: SW.ab === 'fence' ? 'fence' : SW.ab === 'order' ? 'order' : null, ab: SW.ab === 'fence' ? [1, 2] : SW.ab === 'order' ? [0, 1] : null };
    if (REC.course && !REC.course.name) REC.course.ab = null;
  }
  /* the window was resized or rotated (its second is not steady flight), or the page came back from a hidden
     tab or an app switch (diag tells: the world has no visibility listener, 18.5): the interval across the gap is
     dropped and the next 2 s are the resume's */
  function recResized() { if (REC) REC.resizePending = true; }
  function recVisibility(hidden) { if (!REC) return; if (hidden) REC.hidden++; else REC.resumePending = true; }
  /* the record, as diag reads it (plain numbers; the rings cut to what was recorded). The gates' numbers are steady
     flight's; each other phase is summarised apart */
  function phaseStats(vals, n, misses, tagged, over3, byTag, P, k) {
    vals.sort(function (a, b) { return a - b; });
    function q(x) { return vals.length ? +vals[Math.min(vals.length - 1, Math.floor(x * vals.length))].toFixed(2) : null; }
    return { frames: n, p50: q(0.5), p90: q(0.9), p99: q(0.99), p999: q(0.999), max: q(1), misses: misses, missesTagged: tagged, over3kP: over3, missesByTag: byTag };
  }
  /* the samples' plan with the memory facts: the samples asked and made, the targets' MB,
     the context's losses and restores, samples the driver would not make, and the governor's give-up, so a record
     that shows memory pressure on the phone can bring the question back */
  function memRec() {
    var o = {}, k; if (MEMP) for (k in MEMP) o[k] = MEMP[k];
    o.aaNow = AAS; o.msMade = !!(TG && TG.ms); o.lost = MEMN.lost; o.restored = MEMN.restored; o.msFail = MEMN.msFail; o.gaveUp = !!GAVEUP;
    return o;
  }
  function recGet(full) {
    var R = REC, n = Math.min(R.n, RING), P = R.P, kP = R.k * P, i, j, hist = new Array(64).fill(0), ints = [], cbs = [], phs = [], sts = [], ars = [];
    var start = R.n - n, vals = [[], [], [], [], [], []], mis = [0, 0, 0, 0, 0, 0], tg = [0, 0, 0, 0, 0, 0], o3 = [0, 0, 0, 0, 0, 0], bt = [];
    for (j = 0; j < 6; j++) bt.push({ cpu: 0, stage: 0, sync: 0, stream: 0, gpu: 0, hold: 0, none: 0 });
    for (j = 0; j < n; j++) {
      i = (start + j) & (RING - 1);
      var d = R.ints[i], ph = R.ph[i];
      vals[ph].push(d);
      if (ph === PH_STEADY) hist[Math.min(63, Math.floor(d / kP * 10))]++;
      if (d > 1.5 * kP) { mis[ph]++; var t = R.tags[i]; if (t) tg[ph]++; else bt[ph].none++; for (var b2 = 0; b2 < TAGN.length; b2++) if (t & (1 << b2)) bt[ph][TAGN[b2]]++; }
      if (d > 3 * kP) o3[ph]++;
      if (full) { ints.push(+d.toFixed(1)); cbs.push(+R.cpu[i].toFixed(3)); phs.push(ph); sts.push(+R.simt[i].toFixed(3)); ars.push(R.arm[i]); }
    }
    var S = phaseStats(vals[PH_STEADY], vals[PH_STEADY].length, mis[PH_STEADY], tg[PH_STEADY], o3[PH_STEADY], bt[PH_STEADY], P, R.k), phases = {};
    for (j = 0; j < 6; j++) if (j !== PH_STEADY) { var st = phaseStats(vals[j], vals[j].length, mis[j], tg[j], o3[j], bt[j], P, R.k); st.longest = R.longest[j]; phases[PHN[j]] = st; }
    var cpuS = {}; for (var k in R.stageCpu) { var A = R.stageCpu[k], o = []; var last = Math.min(1800, Math.ceil((clockNow() - R.started) / 1000)); for (j = 0; j < last; j++) o.push(+A[j].toFixed(1)); cpuS[k] = o; }
    var secs = Math.min(1800, Math.ceil((clockNow() - R.started) / 1000)), missS = [], frS = [];
    for (j = 0; j < secs; j++) { missS.push(R.perSec.miss[j]); frS.push(R.perSec.frames[j]); }
    // low power, inferred: a steady 2P (33 ms) with short callbacks and fences signalled (steady flight's)
    var med = S.p50, cpuMed = 0; if (n) { var cc = []; for (j = Math.max(0, n - 3600); j < n; j++) { i = (start + j) & (RING - 1); if (R.ph[i] === PH_STEADY) cc.push(R.cpu[i]); } cc.sort(function (a, b) { return a - b; }); cpuMed = cc[Math.floor(cc.length / 2)] || 0; }
    var lp = med !== null && med > 30 && med < 36.5 && cpuMed < 8 && R.fencePolls > 0 && R.fenceLag / R.fencePolls < 0.05;
    var syncOut = {}; for (k in R.sync) if (R.sync[k][0] || R.sync[k][2]) syncOut[k] = { boot: [R.sync[k][0], +R.sync[k][1].toFixed(2)], world: [R.sync[k][2], +R.sync[k][3].toFixed(2)] };
    return {
      d8: recD8(),   // (the world's first frame from navigation start, raw, first in the record)
      v: 'E1', round: 'E1.1', fix: 3, build: BUILD, period: +P.toFixed(2), k: R.k, frames: R.n, kept: n,   // (build: world.js's md5 prefix as built before the tag was written in: records of two builds can be told apart)
      arms: recArms(), cacc: REC.course && REC.course.e1 ? recCaccSplit(0) : null, armDefs: ARMS, armLog: R.armLog.slice(0, 200),
      passages: R.pass.map(function (J) { return { visit: J.visit, realm: J.realm, sim: J.sim, wallS: J.wallS, arm: J.arm, phase: J.phase, frames: J.n, maxKP: J.maxKP, over3kP: J.over3, misses: J.misses, junctionWaits: J.waitsBefore + J.waitsAfter, waitsBefore: J.waitsBefore, waitsAfter: J.waitsAfter, heldMs: J.heldMs, bakeRaise: J.raise, bakeRaiseFrames: J.raiseFrames }; }),   // (D3: each passage's window, 2 s before it (or from its hold's start) to 4 s after; its waits counted before the change)
      holds: { n: R.hold.n, frames: R.hold.frames, ms: +R.hold.ms.toFixed(1), longestMs: R.hold.longestMs, list: R.hold.list },   // (every hold at a junction while the world shows; expected none)
      // the gates' numbers: steady flight only (3.1; D1-D3)
      steadyFrames: S.frames, percentiles: { p50: S.p50, p90: S.p90, p99: S.p99, p999: S.p999, max: S.max }, hist10thKP: hist, misses: S.misses, missesTagged: S.missesTagged, over3kP: S.over3kP, missesByTag: S.missesByTag,
      longest: R.longest[PH_STEADY], phases: phases,   // (boot, dissolve (D3), control, resume, resize: each with its own percentiles, misses, tags and longest)
      missPerSec: missS, framesPerSec: frS, cpuPerSec: cpuS,
      sync: syncOut, syncCallsMaxFrame: R.syncMaxFrame, syncMsMaxFrame: +R.syncSumMaxFrame.toFixed(2), syncCallsMaxBootFrame: R.syncMaxBoot, syncMsMaxBootFrame: +R.syncSumMaxBoot.toFixed(2),
      fence: { made: R.fenceN, polled: R.fencePolls, lagged: R.fenceLag, frac: R.fencePolls ? +(R.fenceLag / R.fencePolls).toFixed(4) : null },
      cadence: [[0, 1]], rung: R.rung, periodTrace: R.period, panics: 0,
      boot: R.boot, scripts: R.regs, scriptEval: recScripts(), links: R.links, progFirstUse: R.prog1, pipelineKeys: R.keys,
      bootStages: { marks: BOOT.marks, frames: BOOT.frames, sliceMaxMs: +BOOT.sliceMax.toFixed(2), slicesOver8: BOOT.sliceOver, longestSlices: BOOT.slices.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 12), declined: BOOT.declined,
        G: { pinned: GS.pinned, period: GS.P ? +GS.P.toFixed(2) : null, roundTripMs: GS.rt.map(function (x) { return +x.toFixed(2); }), trialsMs: GS.tr, mediansMs: GS.med, scales: GS.sc, pick: GS.pick, rung: GS.rung },
        H: { ok: BOOT.hOk, fails: BOOT.hFails, thumb: BOOT.thumbStat || null }, warm: { keys: WARM.list ? WARM.list.length : 0, frames: WARM.frames, ms: WARM.ms.slice(0, 80).map(function (w) { return [w[0], w[1], w[2], recFrameMs(w[2])]; }) },   // ([key, draw call ms, frame, that frame's interval ms])
        programs: { n: PROGS.length, broken: PROGX.broken, par: !!EXT.par, parAll: !!EXT.parAll, each: PROGS.map(function (P) { return [P.name, P.kb || 0, P.cms || 0, P.lms || 0, P.fms || 0, P.doneAt || null]; }), one: recProgs() },
        waits: { flight: BOOT.fwait || 0 }, defs: defsRec(), noise: { K: NOISE.K, fixed: NOISE.fixed }, late: lateRec(), folds: foldRec(), firstDraw: REC.firstDraw ? REC.firstDraw.list : null, firstKeys: REC.firstDraw ? { keys: REC.firstDraw.keys, over: REC.firstDraw.over } : null },   // (every pipeline key's first use)   // (the flight's inputs' wait, the first-draw guard)
      readback: { bakeAIMD: { layers: FBAKE.n, lagged: FBAKE.lagged, halvings: FBAKE.halvings, late: FBAKE.late }, nextDeadline: null, fencesMade: RB.made, polls: RB.polled, reads: RB.reads, readKB: Math.round(RB.readBytes / 1024), slotSkips: RB.skipped, fenceSkips: RB.fenceSkipped, lagged: RB.lagN, forcedReads: RB.forced || 0, probes: PSTAT, junctionWaits: SIM.waits },   // (forcedReads: the dev harness's unconditional reads; 0 in a live visit)
      madeAfterShown: R.madeAfter, freedAfterShown: R.freedAfter, uploadsAfterShown: R.upAfter, stageEvents: R.stageEv || [],
      pools: R.minute, objPools: { pre: POOL_PRE, cap: POOL_CAP, madeShown: POOL.madeShown, made: POOL.made, reused: POOL.reused, peakLive: POOL.peakLive, deleted: POOL.deleted, free: (function () { var o = {}; POOL_KINDS.forEach(function (k) { o[k] = POOL.lists[k].length; }); return o; })() },   // (the cells' and visits' object pools)
      flips: R.flips, firstFlipAfterDissolve: R.firstFlip,
      tod: recTod(R),   // (tod: the cycle each second (t, sky, next, k, q, q again where the structure's own clock stood, group, words, ceiling), the landing, the bars' writes, the ceiling's engaged share, the boot's thumbnail)
      keepout: null, contrast: null,   // (the keep-out and the statistics pass do not exist yet)
      inputLatencyMs: R.lat, orientRaw: R.ori, orientFiltered: R.oriF,
      device: { renderer: EXT.renderer, floatRT: FLOAT_RT, f32: FLOAT32_RT, aa: AAS, memPlan: memRec(), vol16: VOL16, filtErr: +FILTERR.toFixed(5), par: !!EXT.par, out: [OUT.w, OUT.h, +OUT.dpr.toFixed(3)], full: [FULL.w, FULL.h, +FULL.dpr.toFixed(3)], css: [Math.round(OUT.cssW), Math.round(OUT.cssH)], dpr: window.devicePixelRatio || 1, mem: navigator.deviceMemory || null, cores: navigator.hardwareConcurrency || null, classGuess: null, hints: DEVHINT, warmup: { pinned: GS.pinned, mediansMs: GS.med, rung: GS.rung, period: GS.P ? +GS.P.toFixed(2) : null } },
      context: { top: recTop(), touch: TOUCHMODE, motion: MOTION.st, viewport: [window.innerWidth, window.innerHeight], reduced: reduced(), forced: forced(), lost: LOST, dead: DEAD, gaveUp: GAVEUP, ready: READY, shown: shown, hiddenTimes: R.hidden, error: FAILMSG ? String(FAILMSG).slice(0, 2000) : null },
      switches: SW, switchLog: R.sw, course: R.course ? { drags: R.course.n, ab: R.course.name, halves: R.course.ab } : null, control: R.ctl,
      lowPowerInferred: lp, callbackMedianMs: +cpuMed.toFixed(2), state: { t: +SIM.t.toFixed(1), realm: SIM.V ? SIM.V.id : null, visit: SIM.V ? SIM.V.k : -1, words: WORDCOL },
      ints: full ? ints : undefined, callbackMs: full ? cbs : undefined, intPhases: full ? phs : undefined, intSimT: full ? sts : undefined, intArms: full ? ars : undefined
    };
  }
  function recTod(R) {   // (tod; the record's unit test runs the record alone, without the cycle: null there)
    if (typeof SKY === 'undefined') return null;
    return { cycle: R.cycle || [], landing: SKY.landing || null, theme: { writes: THEME.n, last: THEME.hex }, ceilEngaged: R.cycle ? +(R.cycle.filter(function (c) { return c[8] < 1.5; }).length / Math.max(1, R.cycle.length)).toFixed(3) : 0, thumb: BOOT.thumbStat || null };
  }
  /* each arm's own numbers, from steady flight's intervals tagged with it: what settles the frame's order and the
     fence's place (4.3, 7.5): the interval percentiles and histogram in tenths of kP
     (D2), the misses with their tags (D1), the intervals over 3 kP (D3), the synchronous calls' ms a frame, each of
     fenceSync, the poll and the read (D9), the fence's lag, and the frames and misses by the GPU jobs' size in the frame
     before (the stream tag's allowance: bytes uploaded, bake units, probe points) */
  function recArms() {
    var R = REC; if (!R.course || !R.course.e1) return null;
    var n = Math.min(R.n, RING), start = R.n - n, kP = R.k * R.P, out = [], a, j, i;
    var UPB = [0, 16384, 65536, 262144], LYB = [0, 8, 16, 24], PRB = [0, 512, 2048];
    function bin(x, edges) { var b = 0; for (var q = 0; q < edges.length; q++) if (x > edges[q]) b = q + 1; return b; }
    for (a = 0; a < ARMS.length; a++) {
      var vals = [], hist = new Array(64).fill(0), mis = 0, tg = 0, o3 = 0, bt = { cpu: 0, stage: 0, sync: 0, stream: 0, gpu: 0, hold: 0, none: 0 }, sF = 0, sP = 0, sR = 0, sMax = 0, lag = 0, fr = 0;
      var up = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], ly = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], pr = [[0, 0], [0, 0], [0, 0], [0, 0]];
      for (j = 0; j < n; j++) {
        i = (start + j) & (RING - 1);
        if (R.ph[i] !== PH_STEADY || R.arm[i] !== a + 1) continue;
        var d = R.ints[i], miss = d > 1.5 * kP ? 1 : 0;
        vals.push(d); hist[Math.min(63, Math.floor(d / kP * 10))]++; fr++;
        if (miss) { mis++; var t = R.tags[i]; if (t) tg++; else bt.none++; for (var b2 = 0; b2 < TAGN.length; b2++) if (t & (1 << b2)) bt[TAGN[b2]]++; }
        if (d > 3 * kP) o3++;
        var s3 = R.syF[i] + R.syP[i] + R.syR[i]; sF += R.syF[i]; sP += R.syP[i]; sR += R.syR[i]; if (s3 > sMax) sMax = s3;
        lag += R.lagF[i];
        var ub = up[bin(R.up[i], UPB)]; ub[0]++; ub[1] += miss; var lb = ly[bin(R.lay[i], LYB)]; lb[0]++; lb[1] += miss; var pb = pr[bin(R.prb[i], PRB)]; pb[0]++; pb[1] += miss;
      }
      var st = phaseStats(vals, fr, mis, tg, o3, bt, R.P, R.k), cs = recCaccSplit(a + 1);
      out.push({ cacc: cs, arm: ARMS[a].id, what: ARMS[a].what, order: ARMS[a].order, fence: ARMS[a].fence, frames: fr, p50: st.p50, p90: st.p90, p99: st.p99, p999: st.p999, max: st.max, hist10thKP: hist, misses: mis, missesTagged: tg, missesByTag: bt, over3kP: o3,
        syncMsPerFrame: fr ? { fence: +(sF / fr).toFixed(4), poll: +(sP / fr).toFixed(4), read: +(sR / fr).toFixed(4), all: +((sF + sP + sR) / fr).toFixed(4), maxFrame: +sMax.toFixed(2) } : null,
        fenceLagFrac: fr ? +(lag / fr).toFixed(4) : null,
        jobs: { uploadBytes: { edges: UPB, framesMisses: up }, bakeUnits: { edges: LYB, framesMisses: ly }, probePoints: { edges: PRB, framesMisses: pr } } });
    }
    return out;
  }
  /* steady flight's intervals of one arm (0: every arm) with the clouds' accumulation on and off: frames,
     percentiles, misses with their tags (gpu: the fence still unsignalled at the next frame), the fence's lag: what the
     accumulation's pass costs on this device */
  function recCaccSplit(arm) {
    var R = REC, n = Math.min(R.n, RING), start = R.n - n, kP = R.k * R.P, out = {}, c, j, i;
    for (c = 0; c < 2; c++) {
      var vals = [], mis = 0, tg = 0, o3 = 0, bt = { cpu: 0, stage: 0, sync: 0, stream: 0, gpu: 0, hold: 0, none: 0 }, lag = 0, fr = 0;
      for (j = 0; j < n; j++) {
        i = (start + j) & (RING - 1);
        if (R.ph[i] !== PH_STEADY || R.cac[i] !== c || (arm && R.arm[i] !== arm) || !R.arm[i]) continue;
        var d = R.ints[i]; vals.push(d); fr++; lag += R.lagF[i];
        if (d > 1.5 * kP) { mis++; var t = R.tags[i]; if (t) tg++; else bt.none++; for (var b2 = 0; b2 < TAGN.length; b2++) if (t & (1 << b2)) bt[TAGN[b2]]++; }
        if (d > 3 * kP) o3++;
      }
      var st = phaseStats(vals, fr, mis, tg, o3, bt, R.P, R.k);
      out[c ? 'on' : 'off'] = { frames: fr, p50: st.p50, p90: st.p90, p99: st.p99, misses: mis, missesByTag: bt, over3kP: o3, fenceLagFrac: fr ? +(lag / fr).toFixed(4) : null };
    }
    return out;
  }
  /* (D8) the world's first frame from navigation start, raw (3.2 D8's ceiling is 3.0 s) */
  /* each program one at a time, in the order stage C made them: when it was issued (its compile and
     link given: clock ms from navigation, and the frame), when it was found done (the same), the frame interval
     containing each (from that boot frame's rAF to the next one's: a frame that carried its link or its first draw),
     its completion queries (how many, their time on the main thread: a query that waits shows here), the main thread's
     compile, link and status calls, and its first use (the warm table's draw, or the noise's first layers) with that
     frame's interval. The record can then say which program is slow on the phone */
  function recFrameMs(f) {   // the interval from boot frame f's rAF to the next one's, or null
    var A = BOOT.fts; if (!A || f === undefined || f === null) return null;
    for (var i = 0; i + 2 < A.length; i += 2) if (A[i] === f) return +(A[i + 3] - A[i + 1]).toFixed(1);
    return null;
  }
  function recProgs() {
    var L = PORDER || PROGS, out = [];
    for (var i = 0; i < L.length; i++) {
      var P = L[i];
      out.push({ name: P.name, kb: P.kb || 0, issueAt: P.issAt === undefined ? null : P.issAt, issueF: P.issF === undefined ? null : P.issF, issueFrameMs: recFrameMs(P.issF),
        doneAt: P.doneAt || null, doneF: P.doneF === undefined ? null : P.doneF, doneFrameMs: recFrameMs(P.doneF), wallMs: P.doneAt && P.issAt !== undefined ? +(P.doneAt - P.issAt).toFixed(1) : null,
        polls: P.polls || 0, pollMs: P.qms || 0, compileMs: P.cms || 0, linkMs: P.lms || 0, statusMs: P.fms || 0, ok: !!P.ok,
        firstAt: P.firstAt || null, firstF: P.firstF === undefined ? null : P.firstF, firstMs: P.firstMs === undefined ? null : P.firstMs, firstFrameMs: recFrameMs(P.firstF), heavy: !!P.heavy });
    }
    return out;
  }
  function recD8() {   // (judged raw, as 3.2 defines it; no yield to net out)
    var R = REC, st = -1, i, b;
    for (i = 0; i < R.boot.length; i++) { b = R.boot[i]; if (b[0].indexOf('boot start') === 0 && st < 0) st = b[1]; }
    var shown = R.shownAt >= 0 ? R.shownAt : -1;
    return { firstFrameMs: shown >= 0 ? +shown.toFixed(1) : null, ceilingMs: 3000, within: shown >= 0 ? shown <= 3000 : null, from: 'navigation start',
      bootStartMs: st >= 0 ? +st.toFixed(1) : null };
  }
  /* (D8's "each script's evaluation") every script's evaluation, bounded by what can be known without reading a
     clock inside it: world.js stamps its own start and end; each realm file and the ink birds stamp their top and
     register as their last statement (exact); the kit's end is the next file's top; a deferred script before world.js
     with no stamp of its own (diag on staging) starts no sooner than both its response's end and the parse's end
     (domInteractive) and ends no later than world.js's start; the parser-blocking hour.v2.js and site.js lie between their response's end and the parse's
     end. Each: { name, how: 'exact' | 'bounds', start, end (or startMin, endMax), ms (or msMax) } in ms from navigation */
  function recScripts() {
    var out = [], nav = null, res = {}, st = {}, i, k;
    try { nav = performance.getEntriesByType('navigation')[0] || null; (performance.getEntriesByType('resource') || []).forEach(function (e) { var m = /\/([^\/?#]+)(?:[?#].*)?$/.exec(e.name); if (m) res[m[1]] = e; }); } catch (e) { /* no timing */ }
    var di = nav ? nav.domInteractive : -1, R = REC, DIAGEV = /** @type {any} */ (null), afterDiag = false;
    for (i = 0; i < R.regs.length; i++) st[R.regs[i][0]] = R.regs[i][1];
    for (i = 0; i < R.boot.length; i++) if (R.boot[i][0] === 'world.js eval start' || R.boot[i][0] === 'world.js eval end') st[R.boot[i][0]] = R.boot[i][1];
    var scripts; try { scripts = /** @type {NodeListOf<HTMLScriptElement>} */ (document.querySelectorAll('script[src]')); } catch (e) { return { error: 'no document' }; }
    var order = []; for (i = 0; i < scripts.length; i++) { var m2 = /(?:^|\/)([^\/?#]+)(?:[?#].*)?$/.exec(scripts[i].getAttribute('src') || ''); if (m2) order.push({ name: m2[1], defer: scripts[i].defer }); }   // (a bare relative src too: the preview's)
    function r1(x) { return x === null || x < 0 ? null : +x.toFixed(1); }
    function base(n) { return n.replace(/\.v\d+(?=\.js$)/, ''); }   // (production's versioned names: world.v1.js stamps as world.js)
    function regOf(n) { var b = base(n); if (b === 'inkbirds.js') return st.inkbirds; var m3 = /^realm-(\w+)\.js$/.exec(b); return m3 ? st['realm ' + m3[1]] : undefined; }
    for (i = 0; i < order.length; i++) {
      var o = order[i], b = base(o.name), e = res[o.name], rEnd = e ? e.responseEnd : -1, top = st[b + ' top'], reg = regOf(o.name), x = { name: o.name, responseEnd: r1(rEnd) };
      if (b === 'world.js' && st['world.js eval start'] !== undefined && st['world.js eval end'] !== undefined) { x.how = 'exact'; x.start = r1(st['world.js eval start']); x.end = r1(st['world.js eval end']); x.ms = r1(x.end - x.start); }
      else if (b === 'diag.js' && DIAGEV) { x.how = 'exact'; x.start = r1(DIAGEV[0]); x.end = r1(DIAGEV[1]); x.ms = r1(DIAGEV[1] - DIAGEV[0]); afterDiag = true; }   // (staging and the preview: diag.js stamps its own evaluation)
      else if (top !== undefined && reg !== undefined) { x.how = 'exact'; x.start = r1(top); x.end = r1(reg); x.ms = r1(reg - top); }
      else if (top !== undefined) {   // (the kit: its end is the next file's top)
        var nx = null; for (k = i + 1; k < order.length && nx === null; k++) { var bt = st[base(order[k].name) + ' top']; if (bt !== undefined) nx = bt; }
        x.how = 'bounds'; x.start = r1(top); x.endMax = r1(nx); x.msMax = nx !== null ? r1(nx - top) : null;
      } else if (o.defer && st['world.js eval start'] !== undefined && order.slice(i + 1).some(function (q) { return base(q.name) === 'world.js'; })) {   // (diag on staging: deferred, before world.js, no stamp of its own)
        var s0 = Math.max(rEnd, di, afterDiag ? DIAGEV[1] : -1); x.how = 'bounds'; x.startMin = r1(s0); x.endMax = r1(st['world.js eval start']); x.msMax = s0 >= 0 ? r1(st['world.js eval start'] - s0) : null;
        x.note = 'with the deferred scripts after it and before world.js';
      } else if (!o.defer) { x.how = 'bounds'; x.startMin = r1(rEnd); x.endMax = r1(di); x.msMax = rEnd >= 0 && di >= 0 ? r1(di - rEnd) : null; x.note = 'parser-blocking: between its response and the parse\'s end'; }
      else { x.how = 'unknown'; }
      out.push(x);
    }
    return { domInteractive: r1(di), domContentLoaded: nav ? r1(nav.domContentLoadedEventStart) : null, loadEvent: nav ? r1(nav.loadEventStart) : null, scripts: out };
  }
  function recTop() { try { return window.top === window ? 'top' : 'framed'; } catch (e) { return 'framed'; } }
  /* the control tail: the world stopped and hidden (the still sky, no birds planned), so diag can record an empty
     clearing canvas in the same viewer and session; then the world again. Neither gap is an interval of the world's
     (the first frame after the tail does not measure ts - lastTs across it), and the 2 s after it (the canvas dissolving
     back in) are the resume's */
  function recHalt(on) {
    if (!REC) return false;
    if (on && !REC.halted) {
      /* the course ends where the control tail begins: the arms stop (arm A's switches, the design's, back in
         force; the intervals after it carry no arm), so the tail's fence and whatever flight follows it count in no arm */
      var C = REC.course; if (C && C.e1 && !C.ended) { C.ended = true; REC.armNow = 0; recSet('order', ARMS[0].order, 'course end'); recSet('fence', ARMS[0].fence, 'course end'); REC.armLog.push([+((clockNow() - C.t0) / 1000).toFixed(2), 'end']); recSet('cacc', CACC_ON, 'course end'); }
      REC.halted = true; REC.lastTs = -1; stop(); canvas.classList.remove('on'); if (shown) markStill(); recMark('control: world halted'); return true;
    }
    if (!on && REC.halted) {
      REC.halted = false; REC.lastTs = -1;
      if (DEAD || LOST) { recMark('control: the world stays stopped (' + (LOST ? 'lost' : 'gave up') + ')'); return true; }   // (a dead or lost world's canvas is never put back: the page stays black)
      REC.resumePending = true; if (shown) canvas.classList.add('on'); CLK[1] = -1; start(); recMark('control: world resumed'); return true;
    }
    return false;
  }
  /* (the switches' own effects live where they act: order and fence in frame(), birds in the step and draw, stream in
     frame(), dpr1 in resize(), wrap in w13, words in the composite) */

