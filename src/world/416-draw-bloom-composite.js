  /* (drawFrame's pass) the bloom (and the shafts' unused term) */
  function drawBloom(V, u) {
    var W = DFR.W, H = DFR.H, w2 = DFR.w2, h2 = DFR.h2, P;
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
    DFR.E = E; DFR.bl = bl; DFR.sUx = sUx; DFR.sUy = sUy; DFR.hUx = hUx; DFR.hUy = hUy; DFR.shaftK = shaftK; DFR.qw = qw; DFR.qh = qh;
  }
  /* (drawFrame's pass) the composite, to the window */
  function drawComposite(V, u) {
    var W = DFR.W, H = DFR.H, P, sUx = DFR.sUx, sUy = DFR.sUy, MS = DFR.MS, hUx = DFR.hUx, hUy = DFR.hUy, w2 = DFR.w2, h2 = DFR.h2, bl = DFR.bl, shaftK = DFR.shaftK, qw = DFR.qw, qh = DFR.qh, E = DFR.E, L = DFR.L;
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
  }
