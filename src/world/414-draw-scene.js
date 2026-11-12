  /* (drawFrame's pass) the scene: the surfaces, the landmarks, the sets, the scatter, the creatures, the sky, the glows, the particles */
  function drawScene(V, u) {
    var W = DFR.W, H = DFR.H, DP = DFR.DP, L = DFR.L;
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
    DFR.MS = MS; DFR.CL = CL;
  }
