  /* the sand under the camera: its weight, less where the cloud sea lies (the camera's place, between its last two
     steps: smooth in time) */
  var PCOL = new Float32Array(4);
  function sandAt() { if (!KW.ok) return 1; var k = kwAt(CAM.pos[0], CAM.pos[2]); return clamp(k[0], 0, 1) * (1 - smooth(0.2, 0.6, k[3])); }
  function useTarget(T, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, T ? T.f : null); gl.viewport(0, 0, w, h); }
  var CACC = { i: 0, ok: false, w: 0, h: 0, u: -1e9, t: -1e9, ca: 1, tx: 0, ty: 0, turn: 0, mid: 0, pb: new Float64Array(9), m: new Float32Array(9) }, CLT = null;   // (the clouds' accumulation; CLT the cloud target the frame reads; the last view's basis pb and the reprojection m)
  var PVP2 = new Float32Array(16), PCAM2 = new Float32Array(3), PVK = -1, PU2 = 0, PVOK = false, MBK = 0;   // (the last frame's view, for the motes)
  var MBS = { u: -1e9, k: -1, vp: new Float32Array(16), cam: new Float32Array(3), mbk: 0 };   // (the motes' last view and share as a moment's first drawing used them)
  /* the last frame's scene (TG.sceneH) and its view: its colour and its samples' depth codes, read by the composite
     at an outline in front of a cloud, where it is reprojected by the near depth and mixed in at half; a
     frame drawn again at the same moment reads what the frame first drawn then read */
  var SHIST = { ok: false, t: -1e9, k: -1, w: 0, h: 0, vp: new Float32Array(16), cam: new Float32Array(3), use: 0, uvp: new Float32Array(16), ucam: new Float32Array(3) };
  var BDIM = new Int32Array(10);
  function drawFrame(V, u) {
    var L = V.L || V.light, DP = V.def.P;
    ST.draws = 0; ST.tris = 0; ST.inst = 0; ST.cellsDrawn = 0;
    camPose(V, u, SIM.alpha, CAM);
    if (KW.part && KWR) kwGuard(CAM.pos[0], CAM.pos[2], CAM.yaw);   // (the draw guard)
    if (SW.look) devLook(CAM, SW.look * DEG);   // (dev: the view turned aside about the vertical, the flight unchanged: looking back, P6)
    viewProj(CAM);
    if (shown && !TRIAL && V === SIM.V && SW.stream) cellGuard(V);   // (the guard, before anything of the frame is drawn)
    /* the share of the last frame's motion a mote is drawn along: the whole of it at 30 fps and faster, at most 1/30 s
       of it after a longer frame; none across a change of visit (its coordinates), a jump of the camera or a frame
       drawn again (stage G's trials, stage H) */
    /* (W7's pair) a frame drawn again at the same moment draws the motes as that moment's first drawing did (its last
       view and share): drawn as points in a redraw, W7's pair would compare the shipped frame's streaked motes with
       points (2,716-15,890 channels a film, every one at a mote) */
    if (Math.abs(u - MBS.u) <= 1e-4 && MBS.k === V.k) MBK = MBS.mbk;
    else {
      var dU = u - PU2, dC = Math.hypot(CAM.pos[0] - PCAM2[0], CAM.pos[1] - PCAM2[1], CAM.pos[2] - PCAM2[2]);
      MBK = PVOK && PVK === V.k && dU > 1e-4 && dC < Math.max(4, V.speed * 0.2) ? Math.min(1, (1 / 30) / dU) : 0;
      MBS.u = u; MBS.k = V.k; MBS.vp.set(PVP2); MBS.cam.set(PCAM2); MBS.mbk = MBK;
    }
    UT[0] = u + 40;
    if (SW.frz) { if (FRZT === null) FRZT = UT[0]; UT[0] = FRZT; } else FRZT = null;   // (dev: nothing animated: the shaders' clock held)
    if (WLOG) { WLOG.cur = WLOG.pend || []; WLOG.pend = null; wl('rung', 0, RUNGS[RUNG], 0, 1); }
    var sc = TRIALSC > 0 ? TRIALSC : RUNGS[RUNG], W = Math.max(1, Math.round(TG.W * sc)), H = Math.max(1, Math.round(TG.H * sc));   // (stage G's trials draw at their own scale)
    var w2 = Math.max(1, Math.ceil(W / 2)), h2 = Math.max(1, Math.ceil(H / 2));
    RES[0] = W; RES[1] = H;
    ST.px.scene = W * H; ST.px.half = w2 * h2; ST.px.quarter = Math.ceil(W / 4) * Math.ceil(H / 4); ST.px.out = FULL.w * FULL.h;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, GCT ? GCT.t : null); gl.activeTexture(gl.TEXTURE0);
    prof('start');
    // -------- the scene (into its samples where it has them, cleared whole so a tile GPU loads nothing)
    var MS = TG.ms;
    if (TG.sceneH) {   // (the scene's two colour textures in turn; the last frame's kept for the composite; with samples or without, TWIN0)
      var tH = SIM.t - (1 - SIM.alpha) * SIM_DT, dH = tH - SHIST.t;
      if (!(SHIST.ok && Math.abs(dH) <= 1e-4 && SHIST.w === W && SHIST.h === H)) {
        var tw = TG.scene; TG.scene = TG.sceneH; TG.sceneH = tw;
        SHIST.use = SHIST.ok && SHIST.k === V.k && SHIST.w === W && SHIST.h === H && dH > 1e-4 && dH < 0.25 ? 1 : 0;
        SHIST.uvp.set(SHIST.vp); SHIST.ucam.set(SHIST.cam);
      }
    }
    if (DP.hp && DP.surf.length && DP.surf[0].split) hpClip(V, DP.surf[0]);   // (the land's height for this frame's vertices)
    useTarget(MS || TG.scene, W, H);
    gl.depthMask(true); gl.clearDepth(1);
    if (MS) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); } else gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    var P;
    // the surfaces: rings from the camera outward
    ringPlanes(); ST.ringIdx = 0; ST.ringAll = 0;
    for (var si = 0; si < DP.surf.length; si++) {
      var S = DP.surf[si]; P = S.P; gl.useProgram(P.p); setFrameUniforms(P, V);
      gl.bindVertexArray(GRID.vao);
      for (var l = 0; l < S.levels; l++) {
        var g = S.g0 * Math.pow(2, l), cx = Math.floor(CAM.pos[0] / (2 * g)) * 2 * g, cz = Math.floor(CAM.pos[2] / (2 * g)) * 2 * g;
        var set = 0;
        if (l > 0) { var gf = g / 2, fx = Math.floor(CAM.pos[0] / (2 * gf)) * 2 * gf, fz = Math.floor(CAM.pos[2] / (2 * gf)) * 2 * gf; set = 1 + Math.round((fx - cx) / g) + 2 * Math.round((fz - cz) / g); }
        gl.uniform4f(P.u.uLev, cx - GN / 2 * g, cz - GN / 2 * g, g, GN / 2); if (S.split) gl.uniform1i(P.u.uLvl, l);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GRID.ib[set].b);
        ST.ringAll += GRID.ib[set].n;
        if (!S.yb) { dc(gl.TRIANGLES, GRID.ib[set].n, 0, true); ST.ringIdx += GRID.ib[set].n; }
        else ringDraw(GRID.ib[set], cx - GN / 2 * g, cz - GN / 2 * g, g, S.yb);
      }
    }
    prof('surfaces');
    // the landmarks: one mesh a cell, the cells in view
    var CL = V.cellList;
    if (CL) {
      P = DP.lm; gl.useProgram(P.p); setFrameUniforms(P, V); if (P.u.uScat) gl.uniform1i(P.u.uScat, 0);
      for (var ci = 0; ci < CL.length; ci++) {
        var C = CL[ci]; if (!C.mesh || !C.mesh.vao) continue;
        if (C.bound[3] > 0 && !inView(C.bound[0], C.bound[1], C.bound[2], C.bound[3])) { if (WLOG) { C.lastVis = 0; } continue; }
        if (INJ.key !== null && INJ.key === V.k + ':' + C.key && !INJ.on) continue;   // (dev: the injected pop, held)
        UF[0] = fadeCell(C, C.mborn); if (UF[0] <= 0) continue; gl.uniform1fv(P.u.uFade, UF);
        if (WLOG) { C.lastW = UF[0]; C.lastVis = 1; wl('lm', V.k + ':' + C.key, UF[0], nearDist(C, CAM.pos[0], CAM.pos[2]), 1); }
        gl.bindVertexArray(C.mesh.vao); dc(gl.TRIANGLES, C.mesh.n); ST.cellsDrawn++;
      }
    }
    // the sets' instances: one draw a set a cell (the coarse mesh past the set's `far`)
    if (CL && DP.lmi) {
      P = DP.lmi; var lmiOn = false;
      for (var ii = 0; ii < CL.length; ii++) {
        var Ci = CL[ii]; if (!Ci.inst || Ci.st < 3) continue;
        if (Ci.bound[3] > 0 && !inView(Ci.bound[0], Ci.bound[1], Ci.bound[2], Ci.bound[3])) continue;
        if (!lmiOn) { gl.useProgram(P.p); setFrameUniforms(P, V); lmiOn = true; }
        UF[0] = fadeCell(Ci, Ci.mborn); if (UF[0] <= 0) continue; gl.uniform1fv(P.u.uFade, UF);
        var farD = nearDist(Ci, CAM.pos[0], CAM.pos[2]);
        if (WLOG) wl('lmi', V.k + ':' + Ci.key, UF[0], farD, 1);
        for (var qi = 0; qi < Ci.inst.length; qi++) {
          var Q = Ci.inst[qi]; if (!Q.vaoF) continue;
          var useC = Q.vaoC && farD > Q.S.far;
          if (WLOG && Q.vaoC) wl('lod', V.k + ':' + Ci.key + ':' + qi, useC ? 0 : 1, farD, 1);
          gl.bindVertexArray(useC ? Q.vaoC : Q.vaoF); dc(gl.TRIANGLES, (useC ? Q.S.coarse : Q.S.full).n, Q.n);
        }
      }
    }
    ST.cells = CL ? CL.length : 0;
    prof('landmarks');
    // the scatter
    var SCM = V.G.scatter;
    if (SCM && SCM.length && DP.sc) {
      P = DP.sc; gl.useProgram(P.p); setFrameUniforms(P, V); if (P.u.uScat) gl.uniform1i(P.u.uScat, 1); if (P.u.uFade) gl.uniform1f(P.u.uFade, 1);   // (the scatter's stones whole: with uFade unset, FS_LANDMARK draws every stone in the air's colour 30 km off: mix(atmos(c, rd, 3e4), o, 0))
      for (var k = 0; k < SCM.length; k++) {
        var M = SCM[k]; if (!M.n) continue;
        var gq = TIER < 1 ? Math.max(8, Math.round(M.grid * Math.sqrt(TIER) / 2) * 2) : M.grid;   // (a lower tier: the same cells, nearer only)
        gl.uniform4f(P.u.uSc, M.cell, gq, M.density, M.salt);
        gl.uniform4f(P.u.uSc2, M.size[0], M.size[1], M.sink, M.tilt);
        gl.uniform4f(P.u.uSc3, 0, M.stretch, 0, 0);
        gl.bindVertexArray(M.vao); dc(gl.TRIANGLES, M.n, gq * gq);
      }
    }
    prof('scatter');
    if (!SW.noanim) drawCreatures(V);
    prof('creatures');
    // the sky, where nothing stands (its triangle on the far plane, tested against the land's depth)
    P = DP.sky || EP.sky; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4fv(P.u.uSunD, L.discK); gl.uniform4fv(P.u.uHi, SUNU.on && L === SUNU.L ? skyHi0(L) : L.hi); gl.uniform3fv(P.u.uHiC, L.hiC);   // (in a change between a twilight sky and a night, the veil at strength 0, drawn by its own block)
    skyNightUniforms(P);   // (tod: the moon, the belt, the wisps, the stars' twinkle and top)
    gl.depthMask(false); gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3); gl.depthMask(true);
    prof('sky');
    // the glow sprites: light added, depth-tested, never written (the scene's alpha, water's flag, left alone)
    if (CL) {
      var GP = EP.glow, gOn = false;
      for (var gi = 0; gi < CL.length; gi++) {
        var Cg = CL[gi], Gb = Cg.glowB; if (!Gb || !Gb.vao || Cg.st < 3) continue;
        if (!inView(Gb.bound[0], Gb.bound[1], Gb.bound[2], Gb.bound[3])) continue;
        if (!lateReady(GP)) { lateMissIf(GP, true); continue; }   // (a late program; drawn once finished)
        if (!gOn) { gl.useProgram(GP.p); setFrameUniforms(GP, V); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false); gOn = true; }
        UF[0] = fadeCell(Cg, Cg.mborn); if (UF[0] <= 0) continue; gl.uniform1fv(GP.u.uGlowK, UF);
        if (WLOG) wl('glow', V.k + ':' + Cg.key, UF[0], nearDist(Cg, CAM.pos[0], CAM.pos[2]), 1);
        gl.bindVertexArray(Gb.vao); dc(gl.TRIANGLE_STRIP, 4, Gb.n);
      }
      if (gOn) { gl.depthMask(true); gl.disable(gl.BLEND); }
      prof('glows');
    }
    // the particles: grains, motes and veils of sand (blended, no depth written)
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);
    if (V.parts && V.parts.length && DP.pt && !SW.noanim && (lateReady(DP.pt) || lateMissIf(DP.pt, latePartsWould(V)))) {
      P = DP.pt; gl.useProgram(P.p); setFrameUniforms(P, V); gl.bindVertexArray(STRIP.vaoP);
      if (P.u.uPVP2) { gl.uniformMatrix4fv(P.u.uPVP2, false, MBS.vp); gl.uniform3fv(P.u.uPCam2, MBS.cam); gl.uniform1f(P.u.uMB, MBK); }   // (the motes along their motion)
      var LL = V.L || V.light;
      for (var pi = 0; pi < V.parts.length; pi++) {
        var pa = V.parts[pi], share = 1, kd = pa.hop[3];
        if (kd > 2.5 && CLA && !claWx(CLA)) { if (!V.wxF) { V.wxF = true; fail('a particle of kind ' + kd + ' that PKINDS lacks: its program has no weather kinds (NO_PKWX)'); } continue; }   // (the weather kinds are compiled only where a realm has one)
        if (pa.areas && V.LA) { share = 0; for (var ai = 0; ai < pa.areas.length; ai++) { var ax = V.areaIx[pa.areas[ai]]; if (ax !== undefined) share += V.aw[ax]; } }
        if (pa.rainScale) share *= LL.rain;
        var sk = V.def.sandFx ? sandAt() : 1;   // (the sand's grains and motes as faint as the sand under the camera is thin: their opacity, never their count)
        if (share * sk <= 0.002) continue;
        var cnt = kd < 2.5 ? Math.round(pa.count * TIER * share) : Math.round(pa.count * TIER);
        if (cnt <= 0) continue;
        skyPart(pa, PCOL); PCOL[3] *= sk;   // (tod: the grains and veils through the sky's paint, the motes by the sky's own amount)
        gl.uniform4f(P.u.uPa, pa.box, pa.height, pa.streak, pa.width); gl.uniform3fv(P.u.uWind, pa.wind); gl.uniform4fv(P.u.uPc, PCOL); gl.uniform4fv(P.u.uPb, pa.hop);
        if (kd > 2.5) { pa.ug[2] = Math.min(share, 1); gl.uniform4fv(P.u.uPd, pa.ud); gl.uniform4fv(P.u.uPe, pa.ue); gl.uniform4fv(P.u.uPf, pa.uf); gl.uniform4fv(P.u.uPg, pa.ug); }
        dc(gl.TRIANGLE_STRIP, 4, cnt);
      }
    }
    var skR = V.def.sandFx ? sandAt() : 1;
    if (V.ribbons && V.ribbons.count && DP.rb && !SW.noanim && skR > 0.002 && (lateReady(DP.rb) || lateMissIf(DP.rb, true))) {
      var rb = V.ribbons; P = DP.rb; gl.useProgram(P.p); setFrameUniforms(P, V);
      skyPart(rb, PCOL, true); PCOL[3] *= skR;
      gl.uniform4f(P.u.uRa, rb.box, rb.length, rb.width, rb.lift); gl.uniform3fv(P.u.uWind, rb.wind); gl.uniform4fv(P.u.uPc, PCOL); gl.uniform4f(P.u.uRb, rb.gust || 9, 0, 0, 0);
      gl.bindVertexArray(STRIP.vaoR); dc(gl.TRIANGLE_STRIP, STRIP.n, rb.count);
    }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    PVP2.set(VP); PCAM2[0] = CAM.pos[0]; PCAM2[1] = CAM.pos[1]; PCAM2[2] = CAM.pos[2]; PVK = V.k; PU2 = u; PVOK = true;   // (this frame's view, the next one's motes' last)
    prof('particles');
    if (MS) { resolveMS(MS, TG.scene, W, H); prof('resolve'); }   // (the samples into the scene's texture and depth)
    // -------- the depth at half resolution
    useTarget(TG.lind, w2, h2);
    RES[0] = w2; RES[1] = h2;
    P = EP.depth; gl.useProgram(P.p); setFrameUniforms(P, V); gl.uniform2f(P.u.uScale, W - 1, H - 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d); gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.ALWAYS); gl.depthMask(true);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    gl.depthFunc(gl.LESS);
    prof('depth');
    // -------- beams: their light gathered along each pixel's ray, cut by the linear depth just made, added to the scene
    if (CL) {
      var BP = EP.beam, bOn = false;
      for (var bi = 0; bi < CL.length; bi++) {
        var Cb = CL[bi], Bb = Cb.beamB; if (!Bb || !Bb.vao || Cb.st < 3) continue;
        if (Bb.dirty) { gl.bindBuffer(gl.ARRAY_BUFFER, Bb.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, Bb.data); Bb.dirty = false; }
        if (!inView(Bb.bound[0], Bb.bound[1], Bb.bound[2], Bb.bound[3])) continue;
        if (!lateReady(BP)) { lateMissIf(BP, true); continue; }   // (a late program; drawn once finished)
        if (!bOn) {
          useTarget(TG.scene, W, H); RES[0] = W; RES[1] = H;
          gl.useProgram(BP.p); setFrameUniforms(BP, V); gl.uniform2f(BP.u.uLinS, w2 - 1, h2 - 1);
          gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
          gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
          gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); bOn = true;
        }
        gl.bindVertexArray(Bb.vao); dc(gl.TRIANGLES, 36, Bb.n);
      }
      if (bOn) { gl.disable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND); gl.depthMask(true); RES[0] = w2; RES[1] = h2; }
      prof('beams');
    }
    // -------- the clouds at half resolution
    useTarget(TG.cloud, w2, h2);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (CL && !NOOCC) {   // the clouds' opaque cores into the depth (no colour): what stands behind them is never marched
      P = EP.occ; var occOn = false;
      for (var oi = 0; oi < CL.length; oi++) {
        var Co = CL[oi]; if (!Co.occ || Co.st < 4 || fadeCell(Co, Co.born) < 0.999) continue;
        if (!inView(Co.bound[0], Co.bound[1], Co.bound[2], Co.bound[3])) continue;
        if (!occOn) { gl.useProgram(P.p); setFrameUniforms(P, V); gl.colorMask(false, false, false, false); gl.disable(gl.CULL_FACE); occOn = true; }
        gl.bindVertexArray(Co.occ.vao); dc(gl.TRIANGLES, 60, Co.occ.n);
      }
      if (occOn) gl.colorMask(true, true, true, true);
    }
    gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
    drawVolumes(V, u);
    gl.disable(gl.BLEND);
    prof('clouds');
    /* the clouds accumulated over frames (FS_CACC): this frame's share SW.cacc (0.5; 0 turns it off), the whole of it
       on the first frame, after a resize, a change of scale (stage G's trials, the governor's rungs), a frame drawn
       again at the same moment (stage H, the stills: a still is exactly its own frame) or more than a quarter second
       after the last. Measured against the 4x reference (WebKit 491x668, the cloud edge at 42 m/s): the moving
       silhouettes' excess p99 0.050 codes against 0.370 without it, the literal p99 0.128 against 0.135; nowhere worse
       but by a few hundredths */
    CLT = TG.cloud;
    if (SW.cacc > 0 && TG.ch) {
      var tA = SIM.t - (1 - SIM.alpha) * SIM_DT, dA = tA - CACC.t, src, dst, ca;
      if (CACC.ok && CACC.w === w2 && CACC.h === h2 && Math.abs(dA) <= 1e-4) {
        /* a frame drawn again at the same moment (W7's pair, stage G's and H's redraws, the stills drawn again): the
           history, share and reprojection the frame drawn first at this moment used, into the same target, so it is
           that frame bit for bit. Not reset here (the share 1): then a redraw is never the shipped frame and W7's pair
           compares redraws (the shipped frame below the words-off one in 9,476 channels in Chromium, every one the
           accumulation's) */
        ca = CACC.ca; src = TG.ch[CACC.i ^ 1]; dst = TG.ch[CACC.i];
      } else {
        ca = CACC.ok && CACC.w === w2 && CACC.h === h2 && dA > 1e-4 && dA < 0.25 && CACC.tx === FR.tanX && CACC.ty === FR.tanY ? Math.min(1, SW.cacc) : 1;   // (a frame of the next moment, within a quarter second; across a junction too, where the cloud about the eye is continuous)
        src = TG.ch[CACC.i]; dst = TG.ch[CACC.i ^ 1];
        // this frame's rays into the last frame's view: d = x tanX R + y tanY U + F, then (d.R' / tanX,
        // d.U' / tanY, d.F') (column-major: the coefficients of x, of y, of 1)
        var pb = CACC.pb, M = CACC.m, tx = FR.tanX, ty = FR.tanY, R0 = CAM.r, U0 = CAM.u, F0 = CAM.f;
        if (ca < 1) {
          M[0] = tx * (R0[0] * pb[0] + R0[1] * pb[1] + R0[2] * pb[2]) / tx; M[1] = tx * (R0[0] * pb[3] + R0[1] * pb[4] + R0[2] * pb[5]) / ty; M[2] = tx * (R0[0] * pb[6] + R0[1] * pb[7] + R0[2] * pb[8]);
          M[3] = ty * (U0[0] * pb[0] + U0[1] * pb[1] + U0[2] * pb[2]) / tx; M[4] = ty * (U0[0] * pb[3] + U0[1] * pb[4] + U0[2] * pb[5]) / ty; M[5] = ty * (U0[0] * pb[6] + U0[1] * pb[7] + U0[2] * pb[8]);
          M[6] = (F0[0] * pb[0] + F0[1] * pb[1] + F0[2] * pb[2]) / tx; M[7] = (F0[0] * pb[3] + F0[1] * pb[4] + F0[2] * pb[5]) / ty; M[8] = F0[0] * pb[6] + F0[1] * pb[7] + F0[2] * pb[8];
        } else { M[0] = 1; M[1] = 0; M[2] = 0; M[3] = 0; M[4] = 1; M[5] = 0; M[6] = 0; M[7] = 0; M[8] = 1; }
        /* and in a fast turn this frame stands alone: the share raised toward 1 (at once; eased back by at most a
           quarter a frame) as the
           window's middle moves from 1 to 3 half-resolution texels a frame (at 491 x 668 about 15-45 deg/s), so a fast
           drag shows each frame's own clouds and never a resampled history (the drag film, 69 deg/s: reprojected and
           accumulated, its flicker p99 0.277 against 0.269 alone, every other reading lower); held still, or turning
           slowly, the history reprojected */
        var mid = M[8] > 1e-4 ? Math.hypot(M[6] / M[8] * 0.5 * w2, M[7] / M[8] * 0.5 * h2) : 1e3;
        CACC.mid = Math.max(mid, CACC.mid * 0.7);   // (held through a frame in which a drag's events left the view still: the drag film's every third frame)
        var tgt = ca < 1 ? smooth(1, 3, CACC.mid) : CACC.turn;
        CACC.turn = tgt > CACC.turn ? tgt : Math.max(tgt, CACC.turn - 0.25);   // (into a turn at once: no frame of a stale history; out of it over four frames)
        if (ca < 1) ca = ca + (1 - ca) * CACC.turn;
        pb[0] = R0[0]; pb[1] = R0[1]; pb[2] = R0[2]; pb[3] = U0[0]; pb[4] = U0[1]; pb[5] = U0[2]; pb[6] = F0[0]; pb[7] = F0[1]; pb[8] = F0[2];
        CACC.tx = tx; CACC.ty = ty;
      }
      useTarget(dst, w2, h2); P = EP.cacc; gl.useProgram(P.p);
      gl.uniform4f(P.u.uCA, ca, 0, w2, h2); gl.uniformMatrix3fv(P.u.uRM, false, CACC.m); gl.uniform2f(P.u.uHS, src.w, src.h);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, TG.cloud.t); gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
      gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
      if (dst !== TG.ch[CACC.i]) { CACC.i ^= 1; CACC.t = tA; CACC.ca = ca; }
      CACC.ok = true; CACC.w = w2; CACC.h = h2; CACC.u = u; CLT = dst;
      prof('cacc');
    }
    // -------- bloom
    var E = easedLight(V, u), bl = E.bloom;
    var sUx = W / TG.W, sUy = H / TG.H, hUx = w2 / TG.cloud.w, hUy = h2 / TG.cloud.h;
    useTarget(TG.bd[0], w2, h2); RES[0] = w2; RES[1] = h2;
    P = EP.pre; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4f(P.u.uBl, bl[0], bl[1], sUx, sUy); gl.uniform4f(P.u.uBlL, sUx - 0.5 / TG.W, sUy - 0.5 / TG.H, hUx - 0.5 / TG.cloud.w, hUy - 0.5 / TG.cloud.h);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t); gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    BDIM[0] = w2; BDIM[1] = h2;
    for (var b = 1; b < 5; b++) {
      var cw = Math.max(1, Math.ceil(BDIM[(b - 1) * 2] / 2)), ch = Math.max(1, Math.ceil(BDIM[(b - 1) * 2 + 1] / 2)); BDIM[b * 2] = cw; BDIM[b * 2 + 1] = ch;
      useTarget(TG.bd[b], cw, ch); P = EP.down; gl.useProgram(P.p);
      var src0 = TG.bd[b - 1];
      gl.uniform2f(P.u.uTexel, 1 / src0.w, 1 / src0.h); gl.uniform2f(P.u.uLim, (BDIM[(b - 1) * 2] - 0.5) / src0.w, (BDIM[(b - 1) * 2 + 1] - 0.5) / src0.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, src0.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
    }
    var src = TG.bd[4], sw = BDIM[8], sh = BDIM[9];
    for (b = 3; b >= 0; b--) {
      useTarget(TG.bu[b], BDIM[b * 2], BDIM[b * 2 + 1]); P = EP.up; gl.useProgram(P.p);
      gl.uniform2f(P.u.uTexel, 1 / src.w, 1 / src.h); gl.uniform2f(P.u.uLim, (sw - 0.5) / src.w, (sh - 0.5) / src.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
      src = TG.bu[b]; sw = BDIM[b * 2]; sh = BDIM[b * 2 + 1];
    }
    prof('bloom');
    /* no light shafts: every sky's amount is 0 (the owner, 2026-11-05: "No rays at dusk/dawn"), so there are no shaft
       passes or programs; the composite's shaft term reads TG.sb, a 1 x 1 target nothing draws (0), at 0 */
    var shaftK = 0, qw = Math.ceil(W / 4), qh = Math.ceil(H / 4);
    prof('shafts');
    // -------- the composite, to the window
    useTarget(DIRECT && !TRIAL ? null : TG.win, OUT.w, OUT.h); RES[0] = W; RES[1] = H;   // (straight onto the canvas when it is the world's size; stage G's trials offscreen)
    P = EP.comp; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4f(P.u.uSc, sUx, sUy, RUNG === 0 ? SS : 1, SW.fxaa > 0 || (SW.fxaa < 0 && !MS) ? 1 : 0);   // (w, FXAA: off where the scene has its samples)
    gl.uniform4f(P.u.uClS, hUx, hUy, w2, h2);
    gl.uniform4f(P.u.uBlK, bl[2], shaftK, BDIM[0] / TG.bu[0].w, BDIM[1] / TG.bu[0].h);
    gl.uniform4f(P.u.uShK, qw / TG.sb.w, qh / TG.sb.h, E.exposure, E.sat);
    gl.uniform3fv(P.u.uShC, E.shaftC); gl.uniform3fv(P.u.uLift, E.lift); gl.uniform3fv(P.u.uGain, E.gain);
    if (P.u.uCeil) gl.uniform4f(P.u.uCeil, L.ceil === undefined ? 2 : L.ceil, CEIL_KNEE, 0, 0);   // (tod: the light ceiling, the cycle's blended value: 2 off)
    gl.uniform2f(P.u.uOut, OUT.w, OUT.h);
    if (P.u.uSSR) gl.uniform4f(P.u.uSSR, V.def.water ? 1 : 0, V.def.waterReach || 240, 0, 0);
    if (P.u.uHC) { gl.uniformMatrix4fv(P.u.uHVP, false, SHIST.uvp); gl.uniform4f(P.u.uHC, SHIST.ucam[0], SHIST.ucam[1], SHIST.ucam[2], TG.sceneH ? SHIST.use : 0); if (P.u.uStb) gl.uniform1f(P.u.uStb, SW.stb > 0 ? 1 : 0); if (P.u.uLay) gl.uniform1f(P.u.uLay, SW.lay > 0 ? 1 : 0); gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, TG.sceneH ? TG.sceneH.t : TG.scene.t); gl.activeTexture(gl.TEXTURE0); }
    if (P.u.uMi) { gl.uniform4f(P.u.uMi, 0, 0, 0, MS ? AAS : 0); }   // (w the samples a pixel)   // (the cloud about the eye coming out, brought up plainly where it stands: FS_COMP)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TG.bu[0].t);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, TG.sb.t);
    gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(FULLVAO);
    dc(gl.TRIANGLES, 3);
    if (!DIRECT && !TRIAL) {   // (put up to the canvas's own resolution: the birds' ink is drawn at it)
      useTarget(null, FULL.w, FULL.h); P = EP.blit; gl.useProgram(P.p);
      gl.uniform2f(P.u.uOut, FULL.w, FULL.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, TG.win.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
    }
    gl.bindVertexArray(null);
    prof('composite');
    LASTE = E; LASTU = u; LASTBL[0] = bl[2]; LASTBL[1] = BDIM[0] / TG.bu[0].w; LASTBL[2] = BDIM[1] / TG.bu[0].h;
    if (BIRDS && SW.birds && !SW.noanim && !TRIAL) { BIRDS.draw(); gl.bindVertexArray(null); prof('birds'); }
    ST.shaftK = shaftK;
    if (WLOG && WLOG.cur) { WLOG.frames.push({ t: +SIM.t.toFixed(4), e: WLOG.cur }); WLOG.cur = null; }
    REPTG = TG;
    if (TG.sceneH) {   // (this frame's view, the next frame's history's)
      var tH2 = SIM.t - (1 - SIM.alpha) * SIM_DT;
      if (!(SHIST.ok && Math.abs(tH2 - SHIST.t) <= 1e-4 && SHIST.w === W && SHIST.h === H)) { SHIST.vp.set(VP); SHIST.cam[0] = CAM.pos[0]; SHIST.cam[1] = CAM.pos[1]; SHIST.cam[2] = CAM.pos[2]; SHIST.t = tH2; SHIST.k = V.k; SHIST.w = W; SHIST.h = H; SHIST.ok = true; }
    }
  }
