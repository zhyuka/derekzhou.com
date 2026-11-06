  /* ---------------- the pass: one instanced draw, every bird a quad about its paper ---------------- */

  /* (physics) drawn after the composite, at the canvas's own resolution (the ink's slot; RENDER.md 2): 7 instance
     attributes (28 floats) a bird, and its row of the points' texture (its 46 points on the window, device px, with their
     1/depth; its 30 facets' light). The coverage is worked out per fragment, exactly, over the flexing form's 58
     triangles (the outline antialiased by a box filter, the edges the mesh shares inside the bird hard), the nearest
     facet by its depth (1/depth is affine on the window for a plane) taking the colour: the one tone mixed with the
     facet's own light by lodK (0 at true size: the one tone, as before); the pen floor along the leading edge's M (the
     form's chain); at night the halo about the outline's own edges. The two topologies (one surface: gull, swallow,
     finch; slotted fingers: goose, heron, ibis, crow, stork) are written into the shader from labbird's flexKind */
  var PASS_TOPO = (function () {
    function topo(kind) {
      var F = LB.flexKind(kind), T = F.tri, nT = T.length / 3, E = {}, i, j, out = [], bnd = [];
      function key(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
      for (i = 0; i < nT; i++) for (j = 0; j < 3; j++) { var k = key(T[3 * i + j], T[3 * i + (j + 1) % 3]); E[k] = (E[k] || 0) + 1; }
      for (i = 0; i < nT; i++) {
        var inn = 0;
        for (j = 0; j < 3; j++) if (E[key(T[3 * i + j], T[3 * i + (j + 1) % 3])] > 1) inn |= 1 << j;
        out.push('ivec4(' + T[3 * i] + ', ' + T[3 * i + 1] + ', ' + T[3 * i + 2] + ', ' + (F.tf[i] + 256 * inn) + ')');
      }
      for (var k2 in E) if (E[k2] === 1) { var ab = k2.split('_'); bnd.push('ivec2(' + ab[0] + ', ' + ab[1] + ')'); }
      return { n: nT, tri: out.join(', '), nb: bnd.length, bnd: bnd.join(', ') };
    }
    var a = topo('gull'), b = topo('goose');
    return { n: a.n, src: 'const ivec4 TRI0[' + a.n + '] = ivec4[' + a.n + '](' + a.tri + ');\nconst ivec4 TRI1[' + b.n + '] = ivec4[' + b.n + '](' + b.tri + ');\n' +
      'const ivec2 BE0[' + a.nb + '] = ivec2[' + a.nb + '](' + a.bnd + ');\nconst ivec2 BE1[' + b.nb + '] = ivec2[' + b.nb + '](' + b.bnd + ');\n' +
      'const int NBE0 = ' + a.nb + ', NBE1 = ' + b.nb + ', NTRI = ' + a.n + ';\nconst int CH[7] = int[7](' + CHAIN.join(', ') + ');\n' };
  })();
  var GRADE_GLSL = `@glsl grade-glsl`;
  var VS_PAPER = HOST.glsl.HEAD + HOST.glsl.FRAME_U + (HOST.glsl.AIR || HOST.glsl.LIB) + `@glsl vs-paper` + GRADE_GLSL + `@glsl vs-paper-2`;
  var FS_PAPER = HOST.glsl.HEAD + HOST.glsl.FRAME_U + `@glsl fs-paper` + PASS_TOPO.src + GRADE_GLSL + `@glsl fs-paper-2`;
  var NF = 28, PTW = NV + NFAC + 4, BTX = new Float32Array(MAXP * PTW * 4), BT = null, PTS_UNIT = 6;   // (physics: 7 vec4 a bird; its 46 points and 30 facet lights a row of the points' texture, unit 6)
  var PROG = null, BROKEN = false, VAO = null, VBO = null, RING = null, RI = 0, INST = new Float32Array(MAXP * NF), UGR = new Float32Array(4), USC = new Float32Array(4), UCL = new Float32Array(2), ULAND = new Float32Array(3), UBL = new Float32Array(4), UGL = new Float32Array(4), UMODE = new Float32Array(4), UINKF = new Float32Array(3);
  /* the paper's program: asked for as the module is made (the engine links it while its still sky shows, never in
     flight); drawn once it is linked */
  function makeProgram() { if (!PROG && !BROKEN) PROG = HOST.program(VS_PAPER, FS_PAPER, 'paper'); }
  /* the instance ring: three buffers, each with its own VAO (14 vec4 attributes, 224 B a bird, MAXP birds), made at
     the boot's stage B and warmed with the engine's table; a frame writes the next buffer, one last drawn three frames
     ago, so no buffer the GPU may still read is written and no VAO is made or pointed again in flight */
  function bootRing() {
    if (RING) return;
    RING = [];
    for (var k = 0; k < 3; k++) {
      var vao = gl.createVertexArray(), vbo = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, INST.byteLength, gl.DYNAMIC_DRAW);
      for (var i = 0; i < 7; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, NF * 4, i * 16); gl.vertexAttribDivisor(i, 1); }
      RING.push([vao, vbo]);
    }
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
    /* (physics) the points' texture: a row a bird (46 points: device px, 1/depth; 30 facets' light), RGBA32F, read by
       texelFetch only (no filtering) */
    BT = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, BT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, PTW, MAXP); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    VAO = RING[0][0]; VBO = RING[0][1]; RI = 0;
    if (HOST.warm && PROG) HOST.warm({ n: 'birds.paper', p: PROG, vao: VAO, mode: gl.TRIANGLE_STRIP, cnt: 4, inst: 1, bl: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE] });
  }
  var SAMPLERS = false;
  function ready() {
    if (BROKEN) return false;
    makeProgram();
    var r = HOST.linked(PROG);
    if (r === 'lost' || r === false) { if (r === false && PROG.u && !PROG.ok) BROKEN = true; return false; }
    if (!RING) bootRing();   // (the harness's stills and forced colours, which have no boot: made at the first draw)
    if (!SAMPLERS) {   // (the samplers' units, once: uDepth 2, uCloud 4, uBloom 5, uHz 14)
      gl.useProgram(PROG.p); var u = PROG.u;
      if (u.uDepth) gl.uniform1i(u.uDepth, 2); if (u.uCloud) gl.uniform1i(u.uCloud, 4); if (u.uBloom) gl.uniform1i(u.uBloom, 5);
      if (u.uHz) gl.uniform1i(u.uHz, 14); if (u.uPts) gl.uniform1i(u.uPts, PTS_UNIT);
      SAMPLERS = true;
    }
    return true;
  }

  var tmp3 = {}, DRAWQ = [], DQD = [], TONE_AT = 0;
  /* every bird of the world the window can show, posed afresh every frame: the nearest MAXP (a speck past them changes
     no pixel: far off, the air leaves nothing of it). No opacity but the world's own air (in the pass): no fade in
     time, at an edge, near or far */
  function drawPaper() {
    var C = camDrawn(), al = HOST.alpha(), moving = !HOST.reduced(), back = moving ? (1 - al) * STEP_DT : 0, i, b, s, nB = 0;
    measureIf();
    var L = FORCED ? null : HOST.light(), N = FORCED ? 0 : (HOST.night ? HOST.night() : 0), fcss = (W / 2) / VW.tanX;
    lightFrame(L);
    var ft = t - back, fdt = clamp(ft - TONE_AT, 0, 0.25); TONE_AT = ft;   // the time since the last frame drawn, from the steps' clock: the tone eases the same at any frame rate
    DRAWQ.length = 0; DQD.length = 0;
    for (i = 0; i < BIRDS.length; i++) {
      b = BIRDS[i];
      var px = b.p[0] - b.v[0] * back, py = b.p[1] - b.v[1] * back, pz = b.p[2] - b.v[2] * back;
      projReal(px, py, pz, C, tmp3);
      if (!(tmp3.z > 1)) continue;
      var rpx = 0.75 * b.sz * fcss / Math.max(tmp3.z, 1) + 8;
      if (tmp3.z > 1 && !inView(tmp3.x, tmp3.y, rpx, rpx)) continue;
      if (b.st === 'fly' && (unseen(b) || hidden(b))) continue;
      DRAWQ.push(b); DQD.push(tmp3.z);
    }
    if (DRAWQ.length > MAXP) { var ord = DRAWQ.map(function (q, k) { return k; }).sort(function (x, y) { return DQD[x] - DQD[y]; }); DRAWQ = ord.slice(0, MAXP).map(function (k) { return DRAWQ[k]; }); }
    for (i = 0; i < slots.length; i++) slots[i].used = false;
    for (i = 0; i < DRAWQ.length; i++) { b = DRAWQ[i]; if (b.s) b.s.used = true; }
    for (i = 0; i < slots.length; i++) { s = slots[i]; if (s.busy && !s.used) { if (s.bird) s.bird.s = null; s.busy = false; s.bird = null; } }
    for (i = 0; i < DRAWQ.length && nB < MAXP; i++) {
      b = DRAWQ[i];
      if (!b.s) { for (var q = 0; q < slots.length; q++) if (!slots[q].busy) { s = slots[q]; s.busy = true; s.bird = b; b.s = s; dress(s, null); s.bT0 = -1; s.bFrom = null; break; } if (!b.s) break; }
      s = b.s; s.kind = FP.kinds[b.kind] && KMD[b.kind] ? b.kind : 'gull';
      if (!s.X46) slotArrays(s);
      if (!s.d) s.d = { span: 0, model: 0 }; s.d.span = b.sz / MODEL_K / MPU; s.d.model = b.sz / MPU;
      if (b.st === 'land') restProbe(b, C, s);
      if (s.st !== b.st) { if (s.st && ((s.st === 'land' && b.st === 'perch') || (s.st === 'perch' && b.st === 'fly'))) blendFrom(s, s.st === 'land' ? BLEND_T[0] : BLEND_T[1]); s.st = b.st; }
      var ok = b.st === 'perch' ? posePerch(b, C, s) : poseFly(b, C, s, !moving, back);
      if (!ok || !projectBird(s, C, N)) { s.on = false; continue; }
      s.on = true; s.op = 1; s.lastOp = 1;
      lightBird(s, !moving, fdt);
      cloudWeights(s, C);
      packBird(nB, s, 1, NEARMOST * b.sz + 2, FX.cloud, N, s.haloE, -1, 1, FORCED ? Math.max(s.floorPx, 1.5 * VW.outW / Math.max(1, W)) : s.floorPx);
      nB++;
    }

    if (!nB) return;
    var P = PROG, E = HOST.grade(), tex = !FORCED;   // (the hook bound the textures before the draw)
    HOST.target();
    gl.useProgram(P.p); if (!FORCED) HOST.frameUniforms(P);
    RI = (RI + 1) % RING.length; VAO = RING[RI][0]; VBO = RING[RI][1];
    gl.bindVertexArray(VAO); gl.bindBuffer(gl.ARRAY_BUFFER, VBO); gl.bufferSubData(gl.ARRAY_BUFFER, 0, INST, 0, nB * NF);
    gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, BT); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PTW, nB, gl.RGBA, gl.FLOAT, BTX, 0); gl.activeTexture(gl.TEXTURE0);   // (physics: the drawn birds' rows)
    UGR[0] = E ? E.exposure : 1; UGR[1] = E ? E.sat : 1; UGR[2] = 0; UGR[3] = FX.air ? 1 : 0;
    USC[0] = VW.sUx; USC[1] = VW.sUy; USC[2] = VW.hUx; USC[3] = VW.hUy;
    UCL[0] = VW.hUx - 0.5 / Math.max(1, VW.outW / 2); UCL[1] = VW.hUy - 0.5 / Math.max(1, VW.outH / 2);
    ULAND[0] = FX.land && tex ? 1 : 0; ULAND[1] = FX.cloud && tex ? 1 : 0; ULAND[2] = clamp((VW.ddpr || VW.dpr) / Math.max(VW.dpr, 0.5), 1, 2) > 1 ? 1 / clamp((VW.ddpr || VW.dpr) / Math.max(VW.dpr, 0.5), 1, 2) : 1;
    UBL[0] = VW.bUx || 1; UBL[1] = VW.bUy || 1; UBL[2] = VW.bloom || 0; UBL[3] = FX.glare && tex ? 1 : 0;
    UGL[0] = GLARE_P[0]; UGL[1] = GLARE_P[1]; UGL[2] = GLARE_P[2]; UGL[3] = GLARE_P[3];
    var fc = FORCED && HOST.forced ? HOST.forced() : null;
    UMODE[0] = FORCED ? 1 : 0; UMODE[1] = GLOW_ENC; UMODE[2] = HALO_A; UMODE[3] = 0;
    if (fc) { UINKF[0] = fc.ink[0]; UINKF[1] = fc.ink[1]; UINKF[2] = fc.ink[2]; }
    var u = P.u;
    gl.uniform2f(u.uOut, VW.outW, VW.outH); gl.uniform4fv(u.uGr, UGR);
    gl.uniform3fv(u.uLift, E ? E.lift : [0, 0, 0]); gl.uniform3fv(u.uGain, E ? E.gain : [1, 1, 1]);
    gl.uniform4fv(u.uSc, USC); gl.uniform2fv(u.uCl, UCL); gl.uniform3fv(u.uLand, ULAND);
    gl.uniform4fv(u.uBl, UBL); gl.uniform4fv(u.uGl, UGL); gl.uniform4fv(u.uMode, UMODE); gl.uniform3fv(u.uInkF, UINKF);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nB);
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.bindVertexArray(null);
    if (tex) { gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); }   // (TG.hz off unit 14 again: the clouds' accumulation binds its own there)
    gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    HOST.count(1, nB);
  }
  /* (physics) one bird's instance (7 vec4) and its row of the points' texture (its 46 points, device px and 1/depth;
     its 30 facets' light, linear, when its planes show) */
  function packBird(nB, s, op, slack, cloudOn, N, haloE, gE, gdir, floor) {
    var o = nB * NF, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, r = nB * PTW * 4, D = s.D46;
    for (i = 0; i < NV; i++) { var x = D[2 * i], y = D[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; BTX[r + 4 * i] = x; BTX[r + 4 * i + 1] = y; BTX[r + 4 * i + 2] = s.IZ[i]; BTX[r + 4 * i + 3] = 0; }
    var lod = FORCED || N > 0 ? 0 : s.lod;                // (the night's one tone, its glow: no planes; forced colours flat)
    if (lod > 0) for (i = 0; i < NFAC; i++) { BTX[r + 4 * (NV + i)] = s.FE[3 * i]; BTX[r + 4 * (NV + i) + 1] = s.FE[3 * i + 1]; BTX[r + 4 * (NV + i) + 2] = s.FE[3 * i + 2]; BTX[r + 4 * (NV + i) + 3] = 0; }
    INST[o] = x0; INST[o + 1] = y0; INST[o + 2] = x1; INST[o + 3] = y1;
    INST[o + 4] = nB; INST[o + 5] = LB.flexKind(s.kind).slotted ? 1 : 0; INST[o + 6] = floor; INST[o + 7] = s.filt;
    INST[o + 8] = s.E[0]; INST[o + 9] = s.E[1]; INST[o + 10] = s.E[2]; INST[o + 11] = op;
    INST[o + 12] = s.body[0]; INST[o + 13] = s.body[1]; INST[o + 14] = s.body[2]; INST[o + 15] = slack;
    INST[o + 16] = cloudOn ? s.cw[0] : 0; INST[o + 17] = cloudOn ? s.cw[1] : 0; INST[o + 18] = cloudOn ? s.cw[2] : 0; INST[o + 19] = N;
    INST[o + 20] = haloE; INST[o + 21] = 1; INST[o + 22] = gE; INST[o + 23] = gdir;   // ([21], aM.y: the light's scale, 1 for every bird (fast500's deep sweep, 2026-11-05: the hold that scaled it down on its ground is gone; it never ran))
    INST[o + 24] = lod; INST[o + 25] = 0; INST[o + 26] = 0; INST[o + 27] = 0;
  }
  var GLARE_P = [0.02, 0.09, 0.35, 0.5];   // the light wrap: the bloom's light under the bird from, to; the paper thinned by (px), lifted by


