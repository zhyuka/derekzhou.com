  /* dev: GL objects counted as made and freed (the harness checks they stay bounded); wrapped once the context is made
     (devGL, boot stage A) */
  var GLN = { Buffer: 0, Texture: 0, VertexArray: 0, Framebuffer: 0, Program: 0, Renderbuffer: 0, Sync: 0 };
  function devGL() {
    if (DEVMODE) Object.keys(GLN).forEach(function (k) {
      var c = 'create' + k, d = 'delete' + k, fc = gl[c], fd = gl[d];
      if (k === 'Sync') { c = 'fenceSync'; fc = gl.fenceSync; }
      if (!fc || !fd) return;
      gl[c] = function () { GLN[k]++; return fc.apply(gl, arguments); };
      gl[d] = function (o) { if (o) GLN[k]--; return fd.apply(gl, arguments); };
    });
    if (SW.wrap) WRAPF = devWrapFull();
  }
  function finishCellsNear() {   // the harness's frame: every cell about the camera whole (meshes, clouds)
    var V = SIM.V; if (!V) return;
    streamCells(V, CS.x, CS.z, Math.sin(CS.psi), Math.cos(CS.psi), true);
    cellWork(V, true, 9);
    groundCache(V, CS.x, CS.z, true);
    // (world6 fix, the judges' defect 7) the cells' births as the live loop's: the harness's first frame is the boot's
    // (bornNow: nothing yet shown, everything simply there); a cloud or a cell made for a later frame comes in out of the
    // haze from that frame on, as in flight (the step set every birth to long ago, so a cloud baked between two frames
    // of a film showed at once: frame 154's pop)
  }
  var DEVLIN = null;   // (dev: sRGB codes to linear, for the pair's block means)
  var DEVSNAP = null;   // (Fix 3, dev: targets read back under a tag)
  function devB64(px) {   // (dev: bytes to base64, in chunks: no giant argument lists)
    var s = '', i, CH = 0x8000;
    for (i = 0; i < px.length; i += CH) s += String.fromCharCode.apply(null, px.subarray(i, Math.min(px.length, i + CH)));
    return btoa(s);
  }
  /* (E0) the full wrapped context: every call counted by kind and frame; the synchronous ones timed; GL objects made and
     freed (the fence ring exempt); links; every draw's pipeline key (ANGLE-Metal's: program, vertex layout, topology,
     attachment formats, write mask, blend, depth attachment, samples; and the full key: with depth func, test, write
     and cull, 8.2), each first use's time and whether the world showed; each buffer's and texture's last draw and the
     writes into one used in the last 3 frames (S5); texture uploads by source (S9). On in development with data-wrap,
     and in a structural record (data-dev-switch wrap=1): never in a pacing record, which wraps only the synchronous
     calls (3.2). */
  var WRAPF = null;
  function devWrapFull() {
    var P = {}, W = { calls: {}, frameCalls: [], frameSync: [], keys: {}, mkeys: {}, first: [], objs: {}, links: 0, linksAfter: 0, s5buf: 0, s5tex: 0, s5ev: [], up: { client: 0, pbo: 0, dom: 0, clientAfter: 0, pboAfter: 0, domAfter: 0 }, fr: -1, fc: 0, fs: 0 };
    var S = { prog: null, fb: null, vao: null, blend: false, bf: '', cmask: '1111', dt: false, df: 0x201, dm: true, cull: false, cm: 0x405, tex: new Map(), rb: new Map(), fbAtt: new Map(), vaoAtt: new Map(), vaoBuf: new Map(), arr: null, unit: 0, units: [], lastDrawBuf: new Map(), lastDrawTex: new Map(), boundTex: new Map(), pack: null, unpack: null };
    var pid = 0, pname = new Map();
    var SYNC = { fenceSync: 1, clientWaitSync: 1, getBufferSubData: 1, readPixels: 1, finish: 1, getError: 1, getParameter: 1, getProgramParameter: 1, getShaderParameter: 1, checkFramebufferStatus: 1, getUniformLocation: 1, getActiveUniform: 1, getSyncParameter: 1, getShaderInfoLog: 1, getProgramInfoLog: 1 };
    // (each frame's calls and synchronous calls, and whether the world was shown when the frame began; after it shows,
    // each synchronous call's largest count in one frame, by kind)
    W.frameShown = []; W.sh = 0; W.fsk = {}; W.syncKMax = {};
    function roll() {
      if (W.fr !== FRAMEN) {
        if (W.fr >= 0 && W.frameCalls.length < 200000) { W.frameCalls.push(W.fc); W.frameSync.push(W.fs); W.frameShown.push(W.sh); }
        if (W.sh) for (var kk in W.fsk) if (W.fsk[kk] > (W.syncKMax[kk] || 0)) W.syncKMax[kk] = W.fsk[kk];
        W.fr = FRAMEN; W.fc = 0; W.fs = 0; W.fsk = {}; W.sh = shown ? 1 : 0;
      }
    }
    function att(a, v) { var m = S.fbAtt.get(S.fb) || {}; m[a] = v; S.fbAtt.set(S.fb, m); }
    function key(mode) {
      var fa = S.fb ? (S.fbAtt.get(S.fb) || {}) : { def: 'default' }, va = S.vao ? (S.vaoAtt.get(S.vao) || {}) : {};
      var topo = (mode === 0) ? 'p' : (mode >= 1 && mode <= 3) ? 'l' : 't';
      var metal = [pname.get(S.prog), JSON.stringify(va), topo, JSON.stringify(fa), 'm' + S.cmask, S.blend ? 'B' + S.bf : 'b-'].join(' | ');
      return [metal, metal + ' | ' + (S.dt ? 'D' + S.df : 'd-') + (S.dm ? 'w' : 'r') + ' | ' + (S.cull ? 'C' + S.cm : 'c-')];
    }
    Object.getOwnPropertyNames(WebGL2RenderingContext.prototype).forEach(function (n) {
      var f = gl[n]; if (typeof f !== 'function' || n === 'constructor') return;
      var sync = !!SYNC[n];
      gl[n] = function () {
        roll(); W.fc++; W.calls[n] = (W.calls[n] || 0) + 1;
        var h = P[n]; if (h) h.apply(null, arguments);
        if (sync) { W.fs++; W.fsk[n] = (W.fsk[n] || 0) + 1; }
        var r = f.apply(gl, arguments);
        var hr = P['>' + n]; if (hr) hr(r, arguments);
        return r;
      };
    });
    P['>createProgram'] = function (r) { pname.set(r, 'p' + (pid++)); };
    ['Buffer', 'Texture', 'VertexArray', 'Framebuffer', 'Renderbuffer', 'Program', 'Shader'].forEach(function (k) {
      P['>create' + k] = (function (prev) { return function (r) { if (prev) prev(r); var o = W.objs[k] || (W.objs[k] = [0, 0, 0, 0]); o[0]++; if (shown) o[2]++; }; })(P['>create' + k]);
      P['delete' + k] = function (x) { if (!x) return; var o = W.objs[k] || (W.objs[k] = [0, 0, 0, 0]); o[1]++; if (shown) o[3]++; };
    });
    P.linkProgram = function () { W.links++; if (shown) W.linksAfter++; };
    P.useProgram = function (p) { S.prog = p; };
    P.bindFramebuffer = function (t, f) { if (t === 0x8D40 || t === 0x8CA9) S.fb = f; };
    P.activeTexture = function (u) { S.unit = u - 0x84C0; };
    P.bindTexture = function (t, x) { S.units[S.unit] = x; };
    function texOf() { return S.units[S.unit]; }
    function texUpload(n, a) {
      var x = texOf(), last = a[a.length - 1], pbo = !!S.unpack && typeof last === 'number', dom = last && typeof last === 'object' && !last.byteLength && last.nodeType !== undefined;
      if (n === 'texImage2D' || n === 'texImage3D' || n === 'texStorage2D' || n === 'texStorage3D') if (x) S.tex.set(x, a[2]);
      if (n.indexOf('Storage') >= 0) return;
      if (pbo) { W.up.pbo++; if (shown) W.up.pboAfter++; } else if (dom) { W.up.dom++; if (shown) W.up.domAfter++; } else if (last && last.byteLength) { W.up.client++; if (shown) W.up.clientAfter++; }
      var ld = x ? S.lastDrawTex.get(x) : undefined;
      if (ld !== undefined && FRAMEN - ld < 3 && (n === 'texSubImage2D' || n === 'texSubImage3D' || n === 'texImage2D' || n === 'texImage3D')) { W.s5tex++; if (W.s5ev.length < 200) W.s5ev.push(['tex', n, FRAMEN - ld, shown ? 1 : 0]); }
    }
    ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'texStorage2D', 'texStorage3D'].forEach(function (n) { P[n] = function () { texUpload(n, arguments); }; });
    var curRb = null; P.bindRenderbuffer = function (t, r) { curRb = r; }; P.renderbufferStorage = function (t, ifmt) { if (curRb) S.rb.set(curRb, ifmt); };
    P.framebufferTexture2D = function (t, a, tt, x) { att(a, x ? 't' + (S.tex.get(x) || '?') : null); };
    P.framebufferTextureLayer = function (t, a, x) { att(a, x ? 't' + (S.tex.get(x) || '?') : null); };
    P.framebufferRenderbuffer = function (t, a, rt, r) { att(a, r ? 'r' + (S.rb.get(r) || '?') : null); };
    P.bindVertexArray = function (v) { S.vao = v; };
    P.bindBuffer = function (t, b) { if (t === 0x8892) S.arr = b; else if (t === 0x88EB) S.pack = b; else if (t === 0x88EC) S.unpack = b; else if (t === 0x8893 && S.vao) { var bs = S.vaoBuf.get(S.vao) || []; if (bs.indexOf(b) < 0) bs.push(b); S.vaoBuf.set(S.vao, bs); } };
    P.vertexAttribPointer = function (i, n, ty, norm, st, off) { var m = S.vaoAtt.get(S.vao) || {}; m[i] = n + ':' + ty + ':' + (norm ? 1 : 0) + ':' + st + ':' + (off || 0); S.vaoAtt.set(S.vao, m); var bs = S.vaoBuf.get(S.vao) || []; if (S.arr && bs.indexOf(S.arr) < 0) bs.push(S.arr); S.vaoBuf.set(S.vao, bs); };
    P.vertexAttribIPointer = function (i, n, ty, st, off) { var m = S.vaoAtt.get(S.vao) || {}; m[i] = 'I' + n + ':' + ty + ':' + st + ':' + (off || 0); S.vaoAtt.set(S.vao, m); var bs = S.vaoBuf.get(S.vao) || []; if (S.arr && bs.indexOf(S.arr) < 0) bs.push(S.arr); S.vaoBuf.set(S.vao, bs); };
    P.vertexAttribDivisor = function (i, d) { var m = S.vaoAtt.get(S.vao) || {}; m[i] = (m[i] || '') + '/d' + d; S.vaoAtt.set(S.vao, m); };
    P.enable = function (c) { if (c === 0x0BE2) S.blend = true; if (c === 0x0B71) S.dt = true; if (c === 0x0B44) S.cull = true; };
    P.disable = function (c) { if (c === 0x0BE2) S.blend = false; if (c === 0x0B71) S.dt = false; if (c === 0x0B44) S.cull = false; };
    P.blendFunc = function (a, b) { S.bf = [a, b, a, b].join(','); };   // (E1: one notation for one blend state, as the record's and the independent counter's keys)
    P.blendFuncSeparate = function (a, b, c, d) { S.bf = [a, b, c, d].join(','); };   // (E1.1: back in force; E1 had left it inside the comment above, so a separate blend state was keyed as the last blendFunc's)
    P.colorMask = function (r, g, b, a) { S.cmask = '' + (+r) + (+g) + (+b) + (+a); };
    P.depthFunc = function (f) { S.df = f; }; P.depthMask = function (m) { S.dm = !!m; }; P.cullFace = function (m) { S.cm = m; };
    function bufWrite(n) { var b = S.arr; if (!b) return; var ld = S.lastDrawBuf.get(b); if (ld !== undefined && FRAMEN - ld < 3) { W.s5buf++; if (W.s5ev.length < 200) W.s5ev.push(['buf', n, FRAMEN - ld, shown ? 1 : 0]); } }
    P.bufferData = function () { bufWrite('bufferData'); }; P.bufferSubData = function () { bufWrite('bufferSubData'); };
    function draw(mode) {
      var k = key(mode), t = clockNow();
      if (!W.keys[k[1]]) { W.keys[k[1]] = 1; W.first.push([+t.toFixed(1), k[1].slice(0, 400), shown ? 1 : 0, FRAMEN]); } else W.keys[k[1]]++;
      W.mkeys[k[0]] = (W.mkeys[k[0]] || 0) + 1;
      var bs = S.vao ? S.vaoBuf.get(S.vao) : null; if (bs) for (var i = 0; i < bs.length; i++) S.lastDrawBuf.set(bs[i], FRAMEN);
      for (var u = 0; u < S.units.length; u++) if (S.units[u]) S.lastDrawTex.set(S.units[u], FRAMEN);
    }
    P.drawArrays = function (m) { draw(m); }; P.drawElements = function (m) { draw(m); }; P.drawArraysInstanced = function (m) { draw(m); }; P.drawElementsInstanced = function (m) { draw(m); };
    W.report = function () {
      var fc = W.frameCalls.slice().sort(function (a, b) { return a - b; }), fs = W.frameSync.slice().sort(function (a, b) { return a - b; });
      function q(a, x) { return a.length ? a[Math.min(a.length - 1, Math.floor(x * a.length))] : null; }
      var fcS = W.frameCalls.filter(function (x, i) { return W.frameShown[i]; }).sort(function (a, b) { return a - b; }), fsS = W.frameSync.filter(function (x, i) { return W.frameShown[i]; }).sort(function (a, b) { return a - b; });
      return { frames: fc.length, callsP50: q(fc, 0.5), callsP90: q(fc, 0.9), callsMax: q(fc, 1), syncP50: q(fs, 0.5), syncMax: q(fs, 1),
        shownFrames: fcS.length, shownCallsP50: q(fcS, 0.5), shownCallsP90: q(fcS, 0.9), shownCallsMax: q(fcS, 1), shownSyncP50: q(fsS, 0.5), shownSyncMax: q(fsS, 1), shownSyncKindMax: W.syncKMax, calls: W.calls, fullKeys: Object.keys(W.keys).length, metalKeys: Object.keys(W.mkeys).length, firstUse: W.first, objects: W.objs, links: W.links, linksAfter: W.linksAfter, s5buf: W.s5buf, s5tex: W.s5tex, s5ev: W.s5ev, uploads: W.up };
    };
    W.reset = function () { W.frameCalls = []; W.frameSync = []; W.frameShown = []; W.syncKMax = {}; W.calls = {}; };
    return W;
  }
  /* dev: the clearance about the camera: to the nearest landmark vertex (cells kept with set({ keep: true })), and to
     every solid and cloud core (signed: < 0 inside) */
  var DEVWORST = { vert: 1e9, solid: 1e9, core: 1e9, n: 0 };
  function devClearance() {
      if (!DEVMODE || !SIM.V) return null;
      var V = SIM.V, best = 1e9, bo = 1e9, bc = 1e9, x = CS.x, y = CS.y, z = CS.z;
      (V.cellList || []).forEach(function (C) {
        var dx = C.bound[0] - x, dz = C.bound[2] - z; if (Math.sqrt(dx * dx + dz * dz) > C.bound[3] + 300) return;
        if (C.pts) for (var i = 0; i < C.pts.length; i += 6) { var ex = C.pts[i] - x, ey = C.pts[i + 1] - y, ez = C.pts[i + 2] - z, d = ex * ex + ey * ey + ez * ez; if (d < best) best = d; }
        C.obst.forEach(function (o) {
          var dd;
          if (o.c) { var hx = Math.sqrt((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z)) - o.r, vy = y > o.y1 ? y - o.y1 : (y < o.y0 ? o.y0 - y : 0); dd = hx > 0 ? Math.sqrt(hx * hx + vy * vy) : (vy > 0 ? vy : Math.max(hx, -vy)); if (dd < bo) bo = dd; }
          else { dd = Math.sqrt((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) + (o.z - z) * (o.z - z)) - o.r; if (dd < bc) bc = dd; }
        });
      });
      return { vert: Math.sqrt(best), solid: bo, core: bc };
  }
  /* dev: how deep the camera stands in the nearest cloud's visible lobes (m; > 0 inside) */
  function devInsideLobes() {
      if (!DEVMODE || !SIM.V) return null;
      var best = -1e9, x = CS.x, y = CS.y, z = CS.z;
      (SIM.V.cellList || []).forEach(function (C) { if (!C.soft) return; for (var i = 0; i < C.soft.length; i += 4) { var dx = C.soft[i] - x, dy = C.soft[i + 1] - y, dz = C.soft[i + 2] - z, d = C.soft[i + 3] - Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > best) best = d; } });
      return best;
  }
  function devMem() {
    var vb = 0, mb = 0, cells = 0, vols = 0;
    J.visits.forEach(function (V) {
      if (V.cellList) V.cellList.forEach(function (C) { cells++; if (C.mesh && C.mesh.n) mb += C.mesh.n * VSTRIDE; for (var i = 0; i < C.vols.length; i++) { vols++; vb += C.vols[i].out.bytes; } });
      if (V.pass) V.pass.forEach(function (o) { vb += o.bytes; vols++; });
    });
    return { cells: cells, vols: vols, volMB: +(vb / 1048576).toFixed(2), meshMB: +(mb / 1048576).toFixed(2), visits: J.visits.length, probesInFlight: RB.fences.length, probeJobs: PJOBS.length };
  }

