  /* the sand under the camera: its weight, less where the cloud sea lies (the camera's place, between its last two
     steps: smooth in time) */
  var PCOL = new Float32Array(4);
  function sandAt() { if (!KW.ok) return 1; var k = kwAt(CAM.pos[0], CAM.pos[2]); return clamp(k[0], 0, 1) * (1 - smooth(0.2, 0.6, k[3])); }
  function useTarget(T, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, T ? T.f : null); gl.viewport(0, 0, w, h); }
  var CACC = { i: 0, ok: false, w: 0, h: 0, u: -1e9, t: -1e9, ca: 1, tx: 0, ty: 0, turn: 0, mid: 0, pb: new Float64Array(9), m: new Float32Array(9) }, CLT = null;   // (the clouds' accumulation; CLT the cloud target the frame reads; the last view's basis pb and the reprojection m)
  var PVP2 = new Float32Array(16), PCAM2 = new Float32Array(3), PVK = -1, PU2 = 0, PVOK = false, MBK = 0;   // (the last frame's view, for the motes)
  var MBS = { u: -1e9, k: -1, vp: new Float32Array(16), cam: new Float32Array(3), mbk: 0, dt: 0 };   // (the motes' last view and share as a moment's first drawing used them)
  /* the last frame's scene (TG.sceneH) and its view: its colour and its samples' depth codes, read by the composite
     at an outline in front of a cloud, where it is reprojected by the near depth and mixed in at half; a
     frame drawn again at the same moment reads what the frame first drawn then read */
  var SHIST = { ok: false, t: -1e9, k: -1, w: 0, h: 0, vp: new Float32Array(16), cam: new Float32Array(3), use: 0, uvp: new Float32Array(16), ucam: new Float32Array(3) };
  var BDIM = new Int32Array(10);
  /* the frame values the passes share, set by drawFrame for this frame (its sizes, the light, the cells, the bloom) */
  var DFR = { W: 0, H: 0, w2: 0, h2: 0, L: null, DP: null, MS: null, CL: null, E: null, bl: null, sUx: 0, sUy: 0, hUx: 0, hUy: 0, shaftK: 0, qw: 0, qh: 0 };
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
      MBS.u = u; MBS.k = V.k; MBS.vp.set(PVP2); MBS.cam.set(PCAM2); MBS.mbk = MBK; MBS.dt = dU > 0 ? dU : 0;
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
    DFR.W = W; DFR.H = H; DFR.w2 = w2; DFR.h2 = h2; DFR.L = L; DFR.DP = DP;
    drawScene(V, u); drawHalfDepth(V, u); drawBeams(V, u); drawClouds(V, u); drawBloom(V, u); drawComposite(V, u);
    var E = DFR.E, bl = DFR.bl, shaftK = DFR.shaftK;
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
