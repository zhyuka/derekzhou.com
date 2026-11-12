  /* (drawFrame's pass) the linear depth at half resolution */
  function drawHalfDepth(V, u) {
    var MS = DFR.MS, W = DFR.W, H = DFR.H, w2 = DFR.w2, h2 = DFR.h2, P;
    // -------- the depth at half resolution
    useTarget(TG.lind, w2, h2);
    RES[0] = w2; RES[1] = h2;
    P = EP.depth; gl.useProgram(P.p); setFrameUniforms(P, V); gl.uniform2f(P.u.uScale, W - 1, H - 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d); gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.ALWAYS); gl.depthMask(true);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    gl.depthFunc(gl.LESS);
    prof('depth');
  }
  /* (drawFrame's pass) the beams, cut by the half depth */
  function drawBeams(V, u) {
    var CL = DFR.CL, W = DFR.W, H = DFR.H, w2 = DFR.w2, h2 = DFR.h2;
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
  }
  /* (drawFrame's pass) the clouds at half resolution, and their accumulation over frames */
  function drawClouds(V, u) {
    var w2 = DFR.w2, h2 = DFR.h2, CL = DFR.CL, P;
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
        var pb = CACC.pb, M = /** @type {any} */ (CACC.m), tx = FR.tanX, ty = FR.tanY, R0 = CAM.r, U0 = CAM.u, F0 = CAM.f;
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
  }
