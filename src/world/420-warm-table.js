  /* ---------------------------------------------------------------- the warm table (E1, design-v5 8.2) */
  /* Every pipeline the world will draw with is drawn once at boot (stage F), behind the still sky, so no first use of a
     pipeline ever happens in flight: on ANGLE-Metal a first draw builds its MTLRenderPipelineState in the GPU process
     inside that frame (and its PrepareForDisplay waits for it); on ANGLE over Vulkan without extended dynamic state the
     depth function, test and write and the colour mask are pipeline state too (a 565 ms first draw in the audit's
     re-run). So the table holds each draw site's full key: its program, its vertex layout (the real VAO's, or one of
     the very same layout), its topology, the target's attachment formats and draw buffers, the write mask, the blend
     state, and the depth function, test and write and the cull mode. The table is generated from the draw code's own
     sites (warmTable: the sites of drawFrame, the bakes, the probes, the birds, each with the state it draws in), and
     each entry is drawn once (3 vertices, one instance) into a 4 x 4 target of exactly its formats, at most WARM_N a
     frame and fewer if the frame runs long; the canvas's keys into the hidden canvas itself. A restored context runs
     the same table. The record counts every key first drawn after the world shows (S1's test: expected 0) and how many
     distinct Metal keys the table holds (S2: 48 binds from E4; round 3b's per-realm programs come to about 45 here). */
  var WARM = { list: null, i: 0, done: false, ms: [], tg: null, vao: null, frames: 0, keysF: 0 };
  var WARM_N = 5;
  /* stage B: the 4 x 4 targets of every format a draw site writes, and VAOs of the layouts that are made per cell in
     flight (the landmarks' meshes, the sets' instances, the glows, the beams, the clouds' cores) */
  function warmInit() {
    var T = {}, rb;
    T.scene = target(4, 4, 'hdr', true);
    T.lind = target(4, 4, 'r16'); T.cloud = target(4, 4, 'hdr');
    rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 4, 4);
    [T.lind, T.cloud].forEach(function (X) { gl.bindFramebuffer(gl.FRAMEBUFFER, X.f); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); });
    T.rb = rb;
    T.hdr = target(4, 4, 'hdr'); T.rgba8 = target(4, 4, 'rgba8');
    T.r32f = { f: gl.createFramebuffer() }; T.r32f.t = tex2d(4, 4, FLOAT32_RT ? gl.R32F : gl.RGBA8, FLOAT32_RT ? gl.RED : gl.RGBA, FLOAT32_RT ? gl.FLOAT : gl.UNSIGNED_BYTE, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.r32f.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.r32f.t, 0);
    if (FLOAT32_RT) { T.hp1 = { f: gl.createFramebuffer() }; T.hp1.t = tex2d(4, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST); gl.bindFramebuffer(gl.FRAMEBUFFER, T.hp1.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.hp1.t, 0);
      T.hp2 = { f: gl.createFramebuffer() }; T.hp2.t = tex2d(4, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST); T.hp2.t2 = tex2d(4, 4, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST); gl.bindFramebuffer(gl.FRAMEBUFFER, T.hp2.f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.hp2.t, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, T.hp2.t2, 0); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); }   // (fast500 lane G: the split height's passes)
    T.rg8 = { f: gl.createFramebuffer() }; T.rg8.t = tex2d(4, 4, gl.RG8, gl.RG, gl.UNSIGNED_BYTE, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.rg8.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.rg8.t, 0);
    // (E1 Fix 3) the clouds' bakes at 16 bits where the hotfix's probe asks for them (VOL16: the scratch volume RG16F, the
    // body's volume RGBA16F, the 'hdr' target's own format), and the scene's samples (AAS a pixel, as TG.ms)
    if (FLOAT_RT) { T.rg16f = { f: gl.createFramebuffer() }; T.rg16f.t = tex2d(4, 4, gl.RG16F, gl.RG, gl.HALF_FLOAT, gl.NEAREST); gl.bindFramebuffer(gl.FRAMEBUFFER, T.rg16f.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.rg16f.t, 0); }
    if (AAS > 1) T.sceneMS = targetMS(4, 4, AAS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    WARM.tg = T;
    // the layouts made per cell in flight, each on a VAO of its own over small buffers (the same formats, offsets,
    // strides and divisors as uploadMesh, uploadInst and cellUpload give them)
    var A = {}, mb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mb); gl.bufferData(gl.ARRAY_BUFFER, 64 * VSTRIDE, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, 8 * 80, gl.STATIC_DRAW);
    var M = { vb: mb };
    A.mesh = gl.createVertexArray(); gl.bindVertexArray(A.mesh); meshAttribs(M);
    A.lmi = gl.createVertexArray(); gl.bindVertexArray(A.lmi); meshAttribs(M); instAttribs(ib, 5, 5, 0);
    A.glow = gl.createVertexArray(); gl.bindVertexArray(A.glow); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); instAttribs(ib, 1, 4, 0);
    A.beam = gl.createVertexArray(); gl.bindVertexArray(A.beam); gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); instAttribs(ib, 1, 5, 0);
    A.occ = gl.createVertexArray(); gl.bindVertexArray(A.occ); gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
    A.bufs = [mb, ib];
    WARM.vao = A; WARM.list = null; WARM.i = 0; WARM.done = false; WARM.ms = []; WARM.frames = 0;
  }
  /* the table, from the draw sites (built once every program is finished: stage F's start). Each entry: name, program,
     VAO, mode, vertex count, instanced, indexed, target, colour mask, blend (null or [src, dst, srcA, dstA]), depth (0
     off, else its function) and its writes, cull (0 off, else the face) */
  var BL_ADD = null, BL_OVER = null, BL_PRE = null;
  function warmTable() {
    var L = [], T = gl.TRIANGLES, TS = gl.TRIANGLE_STRIP, LE = gl.LEQUAL, A = WARM.vao;
    var SC = AAS > 1 && WARM.tg.sceneMS ? 'sceneMS' : 'scene';   // (E1 Fix 3: the scene pass's draws, into its samples)
    BL_ADD = [gl.ONE, gl.ONE, gl.ZERO, gl.ONE]; BL_OVER = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE]; BL_PRE = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    function E(n, P, vao, mode, cnt, inst, idx, tg, bl, dt, dw, cull, cm) { if (P && (P.ok || (EXT.parAll && P.st !== 3))) L.push({ n: n, p: P, vao: vao, mode: mode, cnt: cnt, inst: inst, idx: idx, tg: tg, bl: bl || null, dt: dt || 0, dw: dw !== false, cull: cull || 0, cm: cm === undefined ? 15 : cm }); }
    // the realms' sites, every built realm's (any may come into view)
    for (var k = 0; k < ORDER.length; k++) {
      var d = REALMS[ORDER[k]]; if (d.bad || !d.P || (d.P.st !== 2 && !EXT.parAll)) continue;   // (speed E8: with the parallel compile the table is made before the realms' links are through)
      var P = d.P, id = d.id;
      for (var si = 0; si < P.surf.length; si++) E(id + '.surface' + si, P.surf[si].P, GRID.vao, T, 3, 0, true, SC, null, LE, true);
      E(id + '.landmark', P.lm, A.mesh, T, 3, 0, false, SC, null, LE, true);
      E(id + '.landmarkInst', P.lmi, A.lmi, T, 3, 1, false, SC, null, LE, true);
      E(id + '.scatter', P.sc, A.mesh, T, 3, 1, false, SC, null, LE, true);
      E(id + '.particle', P.pt, STRIP.vaoP, TS, 4, 1, false, SC, BL_OVER, LE, false);
      E(id + '.ribbon', P.rb, STRIP.vaoR, TS, 4, 1, false, SC, BL_OVER, LE, false);
      E(id + '.sky', P.sky, FULLVAO, T, 3, 0, false, SC, null, LE, false);
      E(id + '.probe', P.pr, FULLVAO, T, 3, 0, false, 'rgba8');
      E(id + '.probe.grid', P.pr, FULLVAO, T, 3, 0, false, 'r32f');
      if (P.hp) for (var hk = 0; hk < P.hp.length; hk++) E(P.hp[hk].name, P.hp[hk], FULLVAO, T, 3, 0, false, hk ? 'hp1' : 'hp2');   // (fast500 lane G)
    }
    // the engine's sites, in drawFrame's order
    E('creature', EP.creature, CREATURE.vao, T, 3, 1, false, SC, null, LE, true);
    E('creature.add', EP.creature, CREATURE.vao, T, 3, 1, false, SC, BL_ADD, LE, false);
    E('sky', EP.sky, FULLVAO, T, 3, 0, false, SC, null, LE, false);
    E('glow', EP.glow, A.glow, TS, 4, 1, false, SC, BL_ADD, LE, false);
    if (SC === 'sceneMS') L.push({ n: 'resolve', rs: true, p: EP.blit });   // (the samples' resolve: ANGLE-Metal makes a pipeline of its own for it)
    E('depth', EP.depth, FULLVAO, T, 3, 0, false, 'lind', null, gl.ALWAYS, true);
    E('beam', EP.beam, A.beam, T, 3, 1, false, 'scene', BL_ADD, 0, false, gl.FRONT);
    E('occ', EP.occ, A.occ, T, 3, 1, false, 'cloud', null, gl.LESS, true, 0, 0);
    E('occ.nodepth', EP.occ, A.occ, T, 3, 1, false, 'cloud', null, 0, true, 0, 0);   // (after a frame's beams, which leave the depth test off)
    E('vbody', EP.vbody, VCUBE.vao, T, 3, 0, false, 'cloud', BL_PRE, LE, false, gl.BACK);
    E('vbody.inside', EP.vbody, VCUBE.vao, T, 3, 0, false, 'cloud', BL_PRE, 0, false, gl.FRONT);
    E('cacc', EP.cacc, FULLVAO, T, 3, 0, false, 'hdr');   // (E1 Fix 3: the clouds' accumulation)
    E('pre', EP.pre, FULLVAO, T, 3, 0, false, 'hdr');
    E('down', EP.down, FULLVAO, T, 3, 0, false, 'hdr');
    E('up', EP.up, FULLVAO, T, 3, 0, false, 'hdr');
    E('smask', EP.smask, FULLVAO, T, 3, 0, false, 'hdr');
    E('sblur', EP.sblur, FULLVAO, T, 3, 0, false, 'hdr');
    E('inkkeep', EP.inkkeep, FULLVAO, T, 3, 0, false, 'rgba8');
    E('comp.win', EP.comp, FULLVAO, T, 3, 0, false, 'rgba8');
    E('comp', EP.comp, FULLVAO, T, 3, 0, false, 'canvas');
    E('blit', EP.blit, FULLVAO, T, 3, 0, false, 'canvas');
    E('vdens', EP.vdens, FULLVAO, T, 3, 0, false, VOL16 ? 'rg16f' : 'rg8');   // (E1 Fix 3: the bakes' 16-bit formats where the probe makes them so: the scratch RG16F, the body RGBA16F, 'hdr')
    E('vlight', EP.vlight, FULLVAO, T, 3, 0, false, VOL16 ? 'hdr' : 'rgba8');
    // the ink birds' (their real VAO, made at boot: HOST.warm)
    for (var b = 0; b < WARMX.length; b++) { var W = WARMX[b]; E(W.n, W.p, W.vao, W.mode, W.cnt, W.inst, false, 'canvas', W.bl, 0, false); }
    return L;
  }
  var WARMX = [];   // (entries the ink birds' module gives through HOST.warm)
  /* stage F, a slice: up to WARM_N entries drawn (sync: all); true once the table is through. (Fix 2 of round E1) an
     entry that is its program's first use, or a heavy program's (its link took over WARM_HEAVY ms from issue to done,
     or a draw of it did), is drawn alone in its frame: on ANGLE-Metal a first draw builds its pipeline in the GPU
     process, and WebKit's cold first draws here took 0.5-3.5 s each, so five of them in one frame was one long frame.
     Each program keeps its first use's time and frame (P.firstMs, P.firstF) for the record */
  var WARM_HEAVY = 50;
  function warmHeavy(P) { return !P.warmed || P.heavy || (P.doneAt && P.issAt && P.doneAt - P.issAt > WARM_HEAVY); }
  function warmStep(sync, deadline) {
    if (WARM.done) return true;
    if (!WARM.list) { WARM.list = warmTable(); WARM.i = 0; WARM.keysF = WARM.list.length; }
    var L = WARM.list, n = 0, T = WARM.tg;
    WARM.frames++;
    gl.activeTexture(gl.TEXTURE0);
    /* (speed E8) with the parallel compile: every entry whose program has finished is drawn now, in this frame (the draws
       are queued, never waited on); the rest wait for theirs; a broken program's entries are passed over */
    if (EXT.parAll && !sync) {
      var left = 0;
      for (var q = 0; q < L.length; q++) {
        var x = L[q]; if (x.done) continue;
        if (!x.p || x.p.st !== 3) { if (!(x.p && x.p.late)) left++; continue; }   // (fast500 step 9: a late one's entry: lateWarm)
        x.done = true; if (!x.p.ok) continue;
        warmDraw(x, T);
      }
      warmReset();
      if (!left) { WARM.i = L.length; WARM.done = true; }
      return WARM.done;
    }
    while (WARM.i < L.length && (sync || EXT.parAll || (n < WARM_N && clockNow() < deadline))) {
      var e = L[WARM.i], alone = !sync && !EXT.parAll && !e.rs && warmHeavy(e.p);   // (speed E4: with the parallel compile (Chrome, Firefox: draws are queued, never waited on) the table in one frame)
      if (alone && n > 0) break;   // (alone: the next frame's first)
      WARM.i++;
      if (warmDraw(e, T)) n++;
      if (alone) break;   // (nothing after it in this frame)
    }
    warmReset();
    if (WARM.i >= L.length) { WARM.done = true; return true; }
    return false;
  }
  function warmReset() {
    gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.colorMask(true, true, true, true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(true); gl.depthFunc(gl.LESS); gl.cullFace(gl.BACK);
  }
  function warmDraw(e, T) {
      var t0 = clockNow();
      if (e.rs) { resolveMS(T.sceneMS, T.scene, 4, 4); WARM.ms.push([e.n, +(clockNow() - t0).toFixed(2), FRAMEN]); return true; }   // (E1 Fix 3: the resolve, once)
      if (e.tg === 'canvas') { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      else gl.bindFramebuffer(gl.FRAMEBUFFER, T[e.tg].f);
      gl.viewport(0, 0, 4, 4);
      gl.colorMask(!!(e.cm & 1), !!(e.cm & 2), !!(e.cm & 4), !!(e.cm & 8));
      if (e.bl) { gl.enable(gl.BLEND); gl.blendFuncSeparate(e.bl[0], e.bl[1], e.bl[2], e.bl[3]); } else gl.disable(gl.BLEND);
      if (e.dt) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(e.dt); } else gl.disable(gl.DEPTH_TEST);
      gl.depthMask(e.dw);
      if (e.cull) { gl.enable(gl.CULL_FACE); gl.cullFace(e.cull); } else gl.disable(gl.CULL_FACE);
      gl.useProgram(e.p.p); gl.bindVertexArray(e.vao);
      if (e.idx) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GRID.ib[0].b); if (e.inst) gl.drawElementsInstanced(e.mode, e.cnt, gl.UNSIGNED_SHORT, 0, 1); else gl.drawElements(e.mode, e.cnt, gl.UNSIGNED_SHORT, 0); }
      else if (e.inst) gl.drawArraysInstanced(e.mode, 0, e.cnt, 1); else gl.drawArrays(e.mode, 0, e.cnt);
      var ms = clockNow() - t0;
      WARM.ms.push([e.n, +ms.toFixed(2), FRAMEN]);
      if (!e.p.warmed) { e.p.warmed = true; e.p.firstMs = +ms.toFixed(2); e.p.firstF = FRAMEN; e.p.firstAt = +clockNow().toFixed(1); }
      if (ms > WARM_HEAVY) e.p.heavy = true;
      return true;
  }
