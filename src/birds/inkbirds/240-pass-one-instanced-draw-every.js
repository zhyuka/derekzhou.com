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

  var tmp3 = {}, GW = new Float32Array(4 * 16), lastDraw = -1;
  /* every bird where it is now (between the last two steps), posed afresh every frame */
  /* (fix round) SEPARATION: two birds of one flight never touching on the window. The planner keeps them apart as it
     plans (its boxes, the whole way); what it cannot foresee there (the guard's later turns and paces, the view's own
     error, the beat's widest wings against the box's) is caught as drawn: two birds whose outlines, as last drawn, come
     within SEP_PX device px (and their pens and filters) have the farther eased aside on the window, square to the line
     of sight (over SEP_T s), held while within SEP_CLEAR px more, and let back slowly (SEP_BACK s) once clear; at most
     SEP_MAX of its span. A correction of a few px, never a steering: the planner's places are the flight's */
  var OUTL = [0, 1, 2, 8, 7, 6, 11, 10, 9, 3, 4, 5];   // (way-path: the wings' outline only)
  var SEP_PX = 3, SEP_CLEAR = 4, SEP_T = 0.35, SEP_BACK = 3, SEP_MAX = 0.6, SEP_ON = true;
  function ptSeg(px, py, ax, ay, bx, by) { var ex = bx - ax, ey = by - ay, l = ex * ex + ey * ey, h = l > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l : 0; h = h < 0 ? 0 : h > 1 ? 1 : h; var dx = px - ax - ex * h, dy = py - ay - ey * h; return Math.sqrt(dx * dx + dy * dy); }
  function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx), d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  function inOutline(D, x, y) { var c = false, n = OUTL.length; for (var i = 0, j = n - 1; i < n; j = i++) { var a = OUTL[i], b = OUTL[j], ya = D[2 * a + 1], yb = D[2 * b + 1]; if ((ya > y) !== (yb > y) && x < (D[2 * b] - D[2 * a]) * (y - ya) / (yb - ya) + D[2 * a]) c = !c; } return c; }
  /* the gap between two birds' outlines (device px; 0 where they cross or one holds the other) */
  function outlineGap(A, B) {
    var n = OUTL.length, g = 1e9, i, j;
    for (i = 0; i < n; i++) {
      var a = OUTL[i], b = OUTL[(i + 1) % n], ax = A[2 * a], ay = A[2 * a + 1], bx = A[2 * b], by = A[2 * b + 1];
      for (j = 0; j < n; j++) {
        var c = OUTL[j], d = OUTL[(j + 1) % n], cx = B[2 * c], cy = B[2 * c + 1], dx = B[2 * d], dy = B[2 * d + 1];
        if (crosses(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
        var e = Math.min(ptSeg(ax, ay, cx, cy, dx, dy), ptSeg(bx, by, cx, cy, dx, dy), ptSeg(cx, cy, ax, ay, bx, by), ptSeg(dx, dy, ax, ay, bx, by));
        if (e < g) g = e;
      }
    }
    if (inOutline(A, B[24], B[25]) || inOutline(B, A[24], A[25])) return 0;   // (one's head inside the other)
    return g;
  }
  function boxD(D, o) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (var i = 0; i < 16; i++) { var x = D[2 * i], y = D[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } o[0] = x0; o[1] = y0; o[2] = x1; o[3] = y1; return o; }
  var SBA = [0, 0, 0, 0], SBB = [0, 0, 0, 0];
  function separate(F, dt) {
    var M = F.m, i, j, sa, sb, k = VW.outW / Math.max(1, W);
    for (i = 0; i < M.length; i++) { sa = M[i].s; if (sa) { sa.pushX = 0; sa.pushY = 0; sa.pushN = 0; sa.sepHold = false; } }
    for (i = 0; i < M.length; i++) {
      sa = M[i].s; if (!sa || !sa.on || !(sa.lastOp > 0.02)) continue;
      boxD(sa.D, SBA);
      for (j = i + 1; j < M.length; j++) {
        sb = M[j].s; if (!sb || !sb.on || !(sb.lastOp > 0.02)) continue;
        var want = SEP_PX * k + 0.5 * (sa.floorPx + sb.floorPx) + sa.filt + sb.filt;
        boxD(sb.D, SBB);
        if (Math.max(SBA[0] - SBB[2], SBB[0] - SBA[2], SBA[1] - SBB[3], SBB[1] - SBA[3]) > want + SEP_CLEAR * k) continue;
        var g = outlineGap(sa.D, sb.D);
        if (g >= want + SEP_CLEAR * k) continue;
        var far = sa.n < sb.n ? sa : sb, fb = far === sa ? SBA : SBB, nb = far === sa ? SBB : SBA;
        if (g < want) {
          var vx = (fb[0] + fb[2] - nb[0] - nb[2]) / 2, vy = (fb[1] + fb[3] - nb[1] - nb[3]) / 2, vl = Math.sqrt(vx * vx + vy * vy);
          if (!(vl > 1e-3)) { vx = 0; vy = 1; vl = 1; }
          var need = (want - g) / k;
          far.pushX += vx / vl * need; far.pushY += vy / vl * need; far.pushN++;
        } else far.sepHold = true;
      }
    }
    for (i = 0; i < M.length; i++) {
      sa = M[i].s; if (!sa) continue;
      if (sa.pushN) { var e = 1 - Math.exp(-dt / SEP_T); sa.nudX = (sa.nudX || 0) + sa.pushX * e; sa.nudY = (sa.nudY || 0) + sa.pushY * e; STATS.sep = (STATS.sep || 0) + 1; }
      else if (!sa.sepHold && (sa.nudX || sa.nudY)) { var e2 = Math.exp(-dt / SEP_BACK); sa.nudX *= e2; sa.nudY *= e2; if (Math.abs(sa.nudX) + Math.abs(sa.nudY) < 0.02) sa.nudX = sa.nudY = 0; }
      var lim = SEP_MAX * (sa.spanPx || 10) / k, L = Math.sqrt((sa.nudX || 0) * (sa.nudX || 0) + (sa.nudY || 0) * (sa.nudY || 0));
      if (L > lim) { sa.nudX *= lim / L; sa.nudY *= lim / L; }
    }
  }
  function drawPaper() {
    var C = camDrawn(), al = HOST.alpha(), moving = !HOST.reduced(), tr = moving ? t - (1 - al) * STEP_DT : t, i, j, F, m, s, tau, nB = 0;
    var dt = lastDraw >= 0 && tr >= lastDraw ? Math.min(tr - lastDraw, 0.1) : 1 / 60; lastDraw = tr;
    measureIf();
    FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
    flightNow(); camEscort(moving);
    var L = FORCED ? null : HOST.light(), nGw = 0, N = FORCED ? 0 : (HOST.night ? HOST.night() : 0);
    for (var li = 0; li < 2; li++) for (i = 0; i < (li ? PLACES : flights).length; i++) {
      F = (li ? PLACES : flights)[i]; tau = tr - F.t0;
      var gone = F.gone ? clamp(1 - (tr - F.gone) / (F.goneT || GONE_T), 0, 1) : 1;
      if (moving && !FORCED && SEP_ON && F.m.length > 1) separate(F, dt);
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; s = m.s; if (!s) continue;
        where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
        var n = tmp3.n, a = fadeFor(F, n), d = s.d;
        if (!(a >= 0.02) || !(tmp3.z > 1) || !inView(tmp3.x, tmp3.y, d.hw * n, d.hh * n) || nB >= DRAW_MAX) { s.on = false; s.lastOp = 0; s.rollOk = false; s.eOk = false; continue; }
        s.kind = kindOf(F);
        if (!s.spanPx) s.spanPx = d.span * n * VW.outW / Math.max(1, W);
        var gE = -1;   // (the gift, S5 SIMULATED: each bird written on as it crosses the edge: its outline 0.7 s, the paper 0.3 s; no spark)
        if (F.gift && moving && !FORCED) { gE = s.shownT >= 0 ? tr - s.shownT : 0; s.gW = gE < GIFT_T ? 1 : clamp(1 - (gE - GIFT_T) / 0.3, 0, 1); if (gE >= GIFT_T) gE = -1; } else s.gW = 0;
        s.gE = gE;
        poseBird(F, m, tau, !moving, C, s, dt);
        if (!projectBird(s, C)) { s.on = false; s.lastOp = 0; continue; }
        s.on = true;
        var back = s.shownT >= 0 && !s.vis && s.outT > -1e8 && t - s.outT <= LEAVE_T;
        var app = moving ? (s.still ? 1 : s.shownT >= 0 && (s.vis || back) ? clamp((tr - s.shownT) / (s.appT || APPEAR_T), 0, 1) : 0) : 1;
        if (gE >= 0 || (F.gift && s.gW > 0)) app = 1;
        if (F.live) app = 1;   // (the living sky: a bird shows by crossing the window's edge or coming out of the distance, never by a fade in time)   // (the gift's write-on is its entry: no fade beside it)
        if (!moving) s.still = true;
        var op = (FORCED ? 1 : fadeFor(F, s.n)) * app * gone * (1 - ease((s.n - NEAR_FADE[0]) / (NEAR_FADE[1] - NEAR_FADE[0])));
        s.lastOp = op; s.lastApp = app; s.op = op;
        if (op <= 0.003) continue;
        lightBird(s, L, !moving, dt);
        holdTone(s, F, !moving, dt);
        cloudWeights(s, C, tr, !moving);
        var gdir = 1;
        if (gE >= 0) { var fc = s.face || F.dir || 1; gdir = (fc > 0) === (s.D[0] < s.D[12]) ? 1 : -1; }   // (written from the back tip to the front tip, on the window)
        packBird(nB, s, op, NEARMOST * d.span * MPU * MODEL_K + 2, FX.cloud, N, s.haloE, s.hold, gE, gdir, FORCED ? Math.max(s.floorPx, 1.5 * VW.outW / Math.max(1, W)) : s.floorPx);
        if (nGw < 16 && !FORCED) { GW[4 * nGw] = s.bx0; GW[4 * nGw + 1] = s.by0; GW[4 * nGw + 2] = s.bx1; GW[4 * nGw + 3] = s.by1; nGw++; }
        nB++;
      }
    }
    if (GU.list.length && !FORCED && moving) nB = drawGuests(C, dt, L, N, nB, tr);
    STATS.drawn = nB;
    if (HOST.groundWant) HOST.groundWant(GW, nGw);
    if (!nB) return;
    var P = PROG, E = HOST.grade(), tex = !FORCED && HOST.bindTextures();
    HOST.target();
    gl.useProgram(P.p); if (!FORCED) HOST.frameUniforms(P);
    RI = (RI + 1) % RING.length; VAO = RING[RI][0]; VBO = RING[RI][1];
    gl.bindVertexArray(VAO); gl.bindBuffer(gl.ARRAY_BUFFER, VBO); gl.bufferSubData(gl.ARRAY_BUFFER, 0, INST, 0, nB * NF);
    gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, BT); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PTW, nB, gl.RGBA, gl.FLOAT, BTX, 0); gl.activeTexture(gl.TEXTURE0);   // (physics: the drawn birds' rows)
    HOST.view(VW);
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
  function packBird(nB, s, op, slack, cloudOn, N, haloE, hold, gE, gdir, floor) {
    var o = nB * NF, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, r = nB * PTW * 4, D = s.D46;
    for (i = 0; i < NV; i++) { var x = D[2 * i], y = D[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; BTX[r + 4 * i] = x; BTX[r + 4 * i + 1] = y; BTX[r + 4 * i + 2] = s.IZ[i]; BTX[r + 4 * i + 3] = 0; }
    var lod = FORCED || N > 0 ? 0 : s.lod;                // (the night's one tone, its glow: no planes; forced colours flat)
    if (lod > 0) for (i = 0; i < NFAC; i++) { BTX[r + 4 * (NV + i)] = s.FE[3 * i]; BTX[r + 4 * (NV + i) + 1] = s.FE[3 * i + 1]; BTX[r + 4 * (NV + i) + 2] = s.FE[3 * i + 2]; BTX[r + 4 * (NV + i) + 3] = 0; }
    INST[o] = x0; INST[o + 1] = y0; INST[o + 2] = x1; INST[o + 3] = y1;
    INST[o + 4] = nB; INST[o + 5] = LB.flexKind(s.kind).slotted ? 1 : 0; INST[o + 6] = floor; INST[o + 7] = s.filt;
    INST[o + 8] = s.E[0]; INST[o + 9] = s.E[1]; INST[o + 10] = s.E[2]; INST[o + 11] = op;
    INST[o + 12] = s.body[0]; INST[o + 13] = s.body[1]; INST[o + 14] = s.body[2]; INST[o + 15] = slack;
    INST[o + 16] = cloudOn ? s.cw[0] : 0; INST[o + 17] = cloudOn ? s.cw[1] : 0; INST[o + 18] = cloudOn ? s.cw[2] : 0; INST[o + 19] = N;
    INST[o + 20] = haloE; INST[o + 21] = hold; INST[o + 22] = gE; INST[o + 23] = gdir;
    INST[o + 24] = lod; INST[o + 25] = 0; INST[o + 26] = 0; INST[o + 27] = 0;
  }
  var GIFT_T = 1.0;   // s: the gift's write-on, whole (outline 0.7, paper 0.3; fix round: no spark)
  var GLARE_P = [0.02, 0.09, 0.35, 0.5];   // the light wrap: the bloom's light under the bird from, to; the paper thinned by (px), lifted by
  /* (dev) one drawn bird, for the judge: read-only */
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  function sunAng(s) { var L = HOST.light(), sd = L && L.sunDir; if (!sd) return null; var l = Math.sqrt(s.body[0] * s.body[0] + s.body[1] * s.body[1] + s.body[2] * s.body[2]) || 1; return r4(Math.acos(clamp((s.body[0] * sd[0] + s.body[1] * sd[1] + s.body[2] * sd[2]) / l, -1, 1)) / DEG); }   // (deg between the line of sight to the bird and the sun: backlit under 35)

  var FLIGHT_ID = 0;
  var STATS = { drawn: 0, planned: 0, steps: 0, workMax: 0, landed: { unseen: 0, never: 0, cloud: 0, done: 0 }, fails: {}, jobs: [], costs: {}, guard: { n: 0, eased: 0, gone: 0, wheeled: 0, held: 0, paced: 0, hold: 0 }, away: 0, back: 0 };

