  /* ---------------------------------------------------------------- drawing a frame */
  function viewProj(c) {
    var A = (FAR + NEAR) / (NEAR - FAR), Bq = 2 * FAR * NEAR / (NEAR - FAR), sx = 1 / FR.tanX, sy = 1 / FR.tanY;
    VP[0] = c.r[0] * sx; VP[4] = c.r[1] * sx; VP[8] = c.r[2] * sx; VP[12] = 0;
    VP[1] = c.u[0] * sy; VP[5] = c.u[1] * sy; VP[9] = c.u[2] * sy; VP[13] = 0;
    VP[2] = -A * c.f[0]; VP[6] = -A * c.f[1]; VP[10] = -A * c.f[2]; VP[14] = Bq;
    VP[3] = c.f[0]; VP[7] = c.f[1]; VP[11] = c.f[2]; VP[15] = 0;
    CPOS[0] = c.pos[0]; CPOS[1] = c.pos[1]; CPOS[2] = c.pos[2];
    CR[0] = c.r[0]; CR[1] = c.r[1]; CR[2] = c.r[2]; CU[0] = c.u[0]; CU[1] = c.u[1]; CU[2] = c.u[2]; CF[0] = c.f[0]; CF[1] = c.f[1]; CF[2] = c.f[2];
    PROJ[0] = FR.tanX; PROJ[1] = FR.tanY; PROJ[2] = NEAR; PROJ[3] = FAR;
  }
  /* a ring drawn as the runs of its 16 x GBR blocks in view. A block is left out only when every point of
     its box (its vertices' x, z as the land's vertex stage places them, morphed by up to a cell toward the ring's
     origin, and any height the surface can take: yb) is outside one of the six sides of this frame's clip volume, as
     uVP itself gives them (VP, relative to the eye): none of its triangles can then put a sample on the screen or a
     depth in the scene, so the frame is the same, and the triangles kept are drawn in the same order */
  var RR = { st: new Int32Array(GBS), n: new Int32Array(GBS) }, RPL = new Float64Array(24);
  function ringPlanes() {
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
      var w = VP[c * 4 + 3], a = VP[c * 4 + r];
      RPL[r * 8 + c] = w + a; RPL[r * 8 + 4 + c] = w - a;
    }
  }
  function ringDraw(I, ox, oz, g, yb) {
    var B = I.blk, k = 0, pe = -1, ey = CAM.pos[1], y0 = yb[0] - ey, y1 = yb[1] - ey;
    for (var bi = 0; bi < GBS; bi++) {
      var cnt = B[bi * 2 + 1]; if (!cnt) continue;
      var i0 = ((bi / GBN) | 0) * 16, j0 = (bi % GBN) * GBR;
      var x0 = ox + (i0 - 1) * g - CAM.pos[0], x1 = ox + (i0 + 16) * g - CAM.pos[0], z0 = oz + (j0 - 1) * g - CAM.pos[2], z1 = oz + (j0 + GBR) * g - CAM.pos[2], out = false;
      for (var q = 0; q < 6 && !out; q++) {
        var a = RPL[q * 4], b = RPL[q * 4 + 1], c = RPL[q * 4 + 2], d = RPL[q * 4 + 3];
        var v = (a > 0 ? a * x1 : a * x0) + (b > 0 ? b * y1 : b * y0) + (c > 0 ? c * z1 : c * z0) + d;
        var m = Math.abs(a) * Math.max(-x0, x1) + Math.abs(b) * Math.max(-y0, y1) + Math.abs(c) * Math.max(-z0, z1) + Math.abs(d);
        if (v < -1e-4 * m) out = true;   // (a margin far over fp32's rounding of the GPU's own product)
      }
      if (out) continue;
      var st = B[bi * 2];
      if (k && st === pe) RR.n[k - 1] += cnt; else { RR.st[k] = st; RR.n[k] = cnt; k++; }
      pe = st + cnt;
    }
    /* one drawElements a run: WEBGL_multi_draw draws the same runs a code apart on ANGLE-D3D11 (114-168 frames of a
       film within the noise bounds, none without it) */
    for (var e = 0; e < k; e++) { ST.ringIdx += RR.n[e]; ST.draws++; ST.tris += RR.n[e] / 3; gl.drawElements(gl.TRIANGLES, RR.n[e], gl.UNSIGNED_SHORT, RR.st[e] * 2); }
  }
  /* a sphere in view (the frustum's four sides, in front of the eye, within the far distance) */
  function inView(x, y, z, R) {
    var dx = x - CAM.pos[0], dy = y - CAM.pos[1], dz = z - CAM.pos[2];
    var zc = dx * CAM.f[0] + dy * CAM.f[1] + dz * CAM.f[2];
    if (zc < -R || zc > FAR + R) return false;
    var xc = dx * CAM.r[0] + dy * CAM.r[1] + dz * CAM.r[2], yc = dx * CAM.u[0] + dy * CAM.u[1] + dz * CAM.u[2];
    if (Math.abs(xc) > zc * FR.tanX + R * Math.sqrt(1 + FR.tanX * FR.tanX)) return false;
    if (Math.abs(yc) > zc * FR.tanY + R * Math.sqrt(1 + FR.tanY * FR.tanY)) return false;
    return true;
  }
  /* no fades in time: a late arrival is drawn at once (LATE counts it, a gate failure); what fades an arrival is its
     distance alone. The born arguments are unused (kept for the callers and the merge) */
  function fadeOf(born) { return 1; }
  function fadeCell(C, born) { return cellDistFade(C); }   // (by distance)
  /* (dev) the weight log (gate C2): every drawn weight of a frame (a cell's fade, a set's coarse or full mesh, a
     cloud body's fade and march steps, a flock among the drawn eight, a glow, the governor's scale) and the events
     that swap or drop a drawn thing (a coarse mesh rebuilt in full, a cell freed), each with its distance; and the
     injected pop (gate C3's calibration): a chosen cell held undrawn, then drawn at full weight in one frame */
  var WLOG = null, WID = 0, INJ = { key: null, on: true };
  function wl(kind, id, w, d, vis) {   // (events between frames, a swap or a free in the frame's jobs, wait for the next frame's entry)
    if (!WLOG) return;
    var tgt = WLOG.cur || WLOG.pend || (WLOG.pend = []);
    if (tgt.length < 30000) tgt.push([kind, id, +w.toFixed(4), Math.round(d), vis ? 1 : 0]);
  }
  var VOLS = [], VKEY = new Float32Array(512), VORD = new Int32Array(512), FLK = [], UF = new Float32Array(1);
  function pushVol(B) {
    var n = VOLS.length; if (n >= 512) return;
    var dx = B.c[0] - CAM.pos[0], dy = B.c[1] - CAM.pos[1], dz = B.c[2] - CAM.pos[2], d = dx * dx + dy * dy + dz * dz;
    if (d > (32000 + B.r) * (32000 + B.r) || !inView(B.c[0], B.c[1], B.c[2], B.r)) return;
    VOLS.push(B); VKEY[n] = d; VORD[n] = n;
  }
  function drawVolumes(V, u) {
    var n, i, j; MISTMAX = 0;
    VOLS.length = 0;
    /* deep in a cloud or under a whole cover no body is drawn; the state below is put back either way, so the in-cloud
       and cover passes after it never run depth-tested (LESS against the half-res depth) with the depth writes off: a
       pipeline state no other frame draws with, which cuts the cloud about the eye where the land is near */
    /* only while the view is whole: going in, the cloud whole (lateClose reaches 0.93 about 0.07 s before the whole,
       with the scene still showing through); coming out, until the clearing's first holes open (open 0.1). Bodies left
       out from 0.93 would, coming out, be left out 0.25 s after the first holes open */
    var push = pushVol;
    var L = V.cellList;
    if (L) for (i = 0; i < L.length; i++) { var C = L[i]; if (C.st < 3) continue; for (j = 0; j < C.vols.length; j++) { var o = C.vols[j].out; if (o.ready) { o.fade = volDistFade(o) * fadeOf(o.born); if (o.fade > 0) push(o); } } }
    n = VOLS.length;
    for (i = 1; i < n; i++) { var vv = VORD[i], kv = VKEY[vv]; j = i - 1; while (j >= 0 && VKEY[VORD[j]] < kv) { VORD[j + 1] = VORD[j]; j--; } VORD[j + 1] = vv; }
    var P = EP.vbody; gl.useProgram(P.p); setFrameUniforms(P, V);
    var VSTEPS = memTier() === 'desktop' && TIER >= 1 ? 48 : 32;   // (the band's steps a ray: the desktop's top tier 48, the rest 32)
    gl.uniform1f(P.u.uVK, memTier() === 'desktop' && TIER >= 1 ? 12 : 4);   // (the edge band's most pieces a segment: the desktop's 12 at its top tier, the rest 4)
    // one pipeline state on both sides of a box's faces: its back faces, untested (the march itself starts where the
    // ray enters the box, or at the eye, and ends at the land's depth), so crossing a face changes nothing on the screen;
    // front faces tested outside and back faces inside would be a switch on the camera's position
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(VCUBE.vao);
    var m = 0;
    for (i = 0; i < n; i++) {
      var B = VOLS[VORD[i]], d = Math.sqrt(VKEY[VORD[i]]), c2 = B.c;
      var steps = VSTEPS;   // (one budget a tier, not by distance: a far tower's 24 steps forced its band 12 m apart)
      if (WLOG) { if (!B.wid) B.wid = ++WID; wl('vol', B.wid, B.fade === undefined ? 1 : B.fade, d, 1); wl('steps', B.wid, steps / 48, d, 1); }
      // the lit mist about the eye: a continuous weight of the eye's distance to the body's nearest lobe (1 within 20 m
      // of its surface, none from 80 m), so coming near a cloud, going in or out, is a fade the flight drives, never 0 or
      // 1 on the camera's position (a one-frame flash of 50 grey levels)
      var mk = mistK(B); if (mk > MISTMAX) MISTMAX = mk;
      var ceil = 1e5;
      B.u4a[0] = VSIGMA; B.u4a[1] = steps; B.u4a[2] = B.det[0]; B.u4a[3] = B.det[1];   // (the body's own, from volPrep)
      B.u4b[0] = B.range; B.u4b[1] = B.band; B.u4b[2] = ceil; B.u4b[3] = B.kind ? V.speed * 4 : 0;
      B.u4c[0] = B.reach; B.u4c[1] = B.fade; B.u4c[2] = mk; B.u4c[3] = B.base !== undefined ? B.base : -1e5;   // (w, the flat base's height)
      gl.uniform3fv(P.u.uVC, B.c); gl.uniform3fv(P.u.uVH, B.h); gl.uniform2fv(P.u.uVY, B.yaw); gl.uniform4fv(P.u.uVR, B.u4a); gl.uniform4fv(P.u.uVS, B.u4b); gl.uniform4fv(P.u.uVR2, B.u4c); gl.uniform1f(P.u.uVVox, B.vox);
      gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_3D, B.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 36); m++;
    }
    gl.disable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    ST.vols = m;
  }
  var MIST_IN = 20, MIST_OUT = 80, MISTMAX = 0;   // (dev: the most mist about the eye drawn since the last state read)
  function mistK(B) {   // 1 - smoothstep(20, 80, the eye's distance to the surface of the body's nearest lobe)
    var sb = B.soft; if (!sb || !B.cell || !B.cell.soft) return 0;
    var S = B.cell.soft, x = CAM.pos[0], y = CAM.pos[1], z = CAM.pos[2];
    var bx = sb[0] - x, by = sb[1] - y, bz = sb[2] - z;
    if (Math.sqrt(bx * bx + by * by + bz * bz) - sb[3] > MIST_OUT) return 0;   // (the body's bound: no lobe within reach)
    var dm = 1e9;
    for (var i = sb[4]; i < sb[5]; i += 4) { var dx = S[i] - x, dy = S[i + 1] - y, dz = S[i + 2] - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) - S[i + 3]; if (d < dm) dm = d; }
    return 1 - smooth(MIST_IN, MIST_OUT, dm);
  }
  /* the flocks about the camera: the cells' (within 1.6 km and in view) and the events' crossing ahead; the nearest
     eight are drawn (birds, rays, moths and caps as solid forms; jellies after them, their light added) */
  var FLKD = new Float32Array(64), FLKO = new Int32Array(64), FLK_IN = 1150, FLK_FAR = 1600;   // (a flock comes in out of the air's far colour over FLK_IN .. FLK_FAR m)
  function drawCreatures(V) {
    FLK.length = 0;
    var L = V.cellList, i, k, n = 0;
    if (L) for (i = 0; i < L.length; i++) { var C = L[i]; if (C.st < 2) continue; for (k = 0; k < C.flocks.length; k++) { var f = C.flocks[k].set; if (f.kind === 1 && (!WORLD_FLYERS || inkAside(f))) continue; var dx = f.a[0] - CAM.pos[0], dz = f.a[2] - CAM.pos[2], d2 = dx * dx + dz * dz; if (d2 < FLK_FAR * FLK_FAR && inView(f.a[0], f.a[1], f.a[2], f.b[2] + 60)) { f.fd = 1 - smooth(FLK_IN, FLK_FAR, Math.sqrt(d2)); FLK.push(f); } } }
    if (V.flocksEv) for (i = 0; i < V.flocksEv.length; i++) if (!(V.flocksEv[i].kind === 1 && inkAside(V.flocksEv[i]))) FLK.push(V.flocksEv[i]);   // (the ink birds stand for the realms' birds)
    ST.flocks = FLK.length;
    if (!FLK.length) return;
    n = Math.min(FLK.length, 64);
    for (i = 0; i < n; i++) { var F0 = FLK[i], ex = F0.a[0] - CAM.pos[0], ey = F0.a[1] - CAM.pos[1], ez = F0.a[2] - CAM.pos[2]; FLKD[i] = ex * ex + ey * ey + ez * ez; FLKO[i] = i; }
    if (n > 8) for (i = 1; i < n; i++) { var oi = FLKO[i], dv = FLKD[oi]; k = i - 1; while (k >= 0 && FLKD[FLKO[k]] > dv) { FLKO[k + 1] = FLKO[k]; k--; } FLKO[k + 1] = oi; }
    if (!lateReady(EP.creature)) { lateMissIf(EP.creature, true); return; }   // (a late program; drawn once finished)
    var P = EP.creature; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.bindVertexArray(CREATURE.vao);
    var m8 = Math.min(n, 8), adds = 0;
    if (WLOG) for (i = 0; i < n; i++) { var Fw = FLK[n > 8 ? FLKO[i] : i]; if (!Fw.wid) Fw.wid = ++WID; wl('flk', Fw.wid, i < m8 ? 1 : 0, Math.sqrt(FLKD[n > 8 ? FLKO[i] : i]), 1); }
    for (var pass = 0; pass < 2; pass++) {
      if (pass === 1) { if (!adds) break; gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false); }
      for (i = 0; i < m8; i++) {
        var F = FLK[n > 8 ? FLKO[i] : i];
        if ((F.kind === 4) !== (pass === 1)) { if (F.kind === 4) adds++; continue; }
        var m = F.kind === 2 ? CREATURE.ray : F.kind === 3 ? CREATURE.moth : F.kind === 4 ? CREATURE.jelly : F.kind === 5 ? CREATURE.cap : CREATURE.bird;
        if (P.u.uCrF) gl.uniform1f(P.u.uCrF, F.fd === undefined ? 1 : F.fd);   // (out of the haze, never popped in)
        gl.uniform4fv(P.u.uFa, F.a); gl.uniform4fv(P.u.uFb, F.b); gl.uniform4fv(P.u.uFc, F.c); var Fc = skyFlock(F); gl.uniform3fv(P.u.uCrL, Fc.lit); gl.uniform3fv(P.u.uCrS, Fc.shade);   // (tod: through the sky's paint)
        if (P.u.uFd) gl.uniform4fv(P.u.uFd, F.d); if (P.u.uFe) gl.uniform4fv(P.u.uFe, F.e); if (P.u.uCrE) gl.uniform3fv(P.u.uCrE, F.glow); if (P.u.uCrA) gl.uniform1f(P.u.uCrA, pass);
        ST.draws++; ST.tris += m[1] / 3 * F.n; ST.inst += F.n;
        gl.drawArraysInstanced(gl.TRIANGLES, m[0], m[1], F.n);
      }
    }
    if (adds) { gl.disable(gl.BLEND); gl.depthMask(true); }
  }
