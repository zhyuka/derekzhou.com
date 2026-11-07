  /* ---------------------------------------------------------------- probes: the realm's ground, read back */
  /* The realm's height function evaluated at points on the GPU (the same function the land is drawn with), packed into
     the bytes of an RGBA8 target and read back through the ring. Jobs from the cells are batched, one batch a frame of
     at most PROBE_FRAME points (the high tier's 2,048; 8,192 while the boot runs behind the still sky); a job
     larger than that goes in parts and is done when its last part lands. (A still drawn for the harness reads its
     points at once.) The points go up through a ring of three textures, so no texture a frame in flight samples is
     written */
  var PROBE_W = 256, PROBE_H = 64, PROBE_CAP = PROBE_W * PROBE_H, PROBE_FRAME = 2048, PROBE_BOOT = 8192;
  var PROBE_T = null, PROBE_PTS = [], PROBE_PI = 0, PSCR = new Float32Array(PROBE_CAP * 2);
  var PJOBS = [], PPARTS = [], PSTAT = { batches: 0, points: 0, maxPts: 0, waits: 0 };
  function probeJob(V, pts, n, mode, sync) {
    var job = { V: V, pts: pts, n: n, mode: mode, h: null, done: false, cancel: false, sent: 0, landed: 0 };
    if (sync) {
      if (n > PROBE_CAP) { fail('probe: ' + n + ' points, over the ' + PROBE_CAP + ' a batch holds'); job.n = n = PROBE_CAP; }   // (loudly: never a silent clamp)
      probeRun([job], true);
    } else { job.h = new Float32Array(n); PJOBS.push(job); }
    return job;
  }
  function probeDec(px, n) { var b = n * 4; return ((px[b] / 255 + px[b + 1] / 65025 + px[b + 2] / 16581375 + px[b + 3] / 4228250625) * 8192) - 4096; }
  /* the realm's probe program, with its uniforms: a frame's uniforms for the visit, and the mode (0 land at points,
     1 the camera's ground at points, 2 the land on a grid, 3 the camera's ground on a grid, packed) */
  function probeProg(V, mode, gx, gz, gcell) {
    var P = V.def.P.pr; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4f(P.u.uGCw, gx || 0, gz || 0, gcell || 0, 0); gl.uniform1i(P.u.uPm, mode);
    return P;
  }
  function probeTargets() {
    if (PROBE_T) return;
    PROBE_T = target(PROBE_W, PROBE_H, 'rgba8');
    gl.activeTexture(gl.TEXTURE7);
    PROBE_PTS = []; for (var i = 0; i < 3; i++) PROBE_PTS.push(tex2d(PROBE_W, PROBE_H, gl.RG32F, gl.RG, gl.FLOAT, gl.NEAREST));
    gl.activeTexture(gl.TEXTURE0);
  }
  /* the split height's targets and passes: two sets of five RGBA32F textures (the clipmap's: 97 x 970, a texel a vertex
     of the ten levels; the probe's: 256 x 160, its points' batch or the ground's grid), bound to units 16-20 by the run
     that fills them, so the draw after it reads them. P0 kit (wD, lv), P1 kit (sk, wC), P2 the dunes' h, P3 the sites'
     h, P4 the ridges (+ A_Hd's value) */
  var HPT = null, HPLA = new Float32Array(40);
  function hpSet(w, h) {
    var S = { w: w, h: h, t: [], f: [] }, k, A = [[0, 1], [2], [3], [4]];
    for (k = 0; k < 5; k++) { gl.activeTexture(gl.TEXTURE16 + k); S.t.push(tex2d(w, h, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST)); }
    gl.activeTexture(gl.TEXTURE0);
    for (k = 0; k < 4; k++) {
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      for (var a = 0; a < A[k].length; a++) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + a, gl.TEXTURE_2D, S.t[A[k][a]], 0);
      gl.drawBuffers(A[k].length > 1 ? [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1] : [gl.COLOR_ATTACHMENT0]);
      S.f.push(f);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return S;
  }
  function hpTargets() { if (!HPT) HPT = { clip: HP_LAND ? hpSet(GN + 1, (GN + 1) * 10) : null, pr: hpSet(PROBE_W, GCN) }; }
  function hpRun(V, src, w, h, LA, gx, gz, gcell) {   // (src 0 the clipmap, 1 the probe's points in uTex, 2 a grid)
    hpTargets();
    var S = src === 0 ? HPT.clip : HPT.pr, hp = V.def.P.hp, k, P, ord = src === 0 ? [0, 1, 2, 3] : HP_PORD;   // (the probe: its .x-only sites and ridges)
    if (w > S.w || h > S.h) { fail('split height: ' + w + ' x ' + h + ' over its targets'); return; }
    for (k = 0; k < 5; k++) { gl.activeTexture(gl.TEXTURE16 + k); gl.bindTexture(gl.TEXTURE_2D, S.t[k]); }
    gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true); gl.bindVertexArray(FULLVAO);
    for (k = 0; k < 4; k++) {
      P = hp[ord[k]]; if (!P.ok) continue;
      gl.useProgram(P.p); setFrameUniforms(P, V);
      if (P.u.uHsrc) gl.uniform1i(P.u.uHsrc, src);
      if (LA && P.u.uLevA) gl.uniform4fv(P.u.uLevA, LA);
      if (src === 2 && P.u.uGCw) gl.uniform4f(P.u.uGCw, gx, gz, gcell, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.f[k]); gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }
  function hpClip(V, S) {   // the frame's clipmap vertices of the land, placed as the draw's rings place them
    for (var l = 0; l < 10; l++) {
      var g = S.g0 * Math.pow(2, l), cx = Math.floor(CAM.pos[0] / (2 * g)) * 2 * g, cz = Math.floor(CAM.pos[2] / (2 * g)) * 2 * g;
      HPLA[l * 4] = cx - GN / 2 * g; HPLA[l * 4 + 1] = cz - GN / 2 * g; HPLA[l * 4 + 2] = g; HPLA[l * 4 + 3] = GN / 2;
    }
    hpRun(V, 0, GN + 1, (GN + 1) * 10, HPLA);
  }
  function probeDraw(V, mode, n) {   // the points in PSCR, n of them, drawn into PROBE_T (rows as needed)
    if (KW.part && KWR && mode < 2) kwProbeGuard(n);   // (the probes' reads while the first plan's rest is pending)
    probeTargets();
    var rows = Math.max(1, Math.ceil(n / PROBE_W));
    PROBE_PI = (PROBE_PI + 1) % PROBE_PTS.length;   // (the ring: this texture was last sampled three batches ago)
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, PROBE_PTS[PROBE_PI]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PROBE_W, rows, gl.RG, gl.FLOAT, PSCR, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, PROBE_T.f); gl.viewport(0, 0, PROBE_W, rows);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true);
    if (V.def.P.hp) { hpRun(V, 1, PROBE_W, rows); gl.bindFramebuffer(gl.FRAMEBUFFER, PROBE_T.f); gl.viewport(0, 0, PROBE_W, rows); }
    probeProg(V, mode);
    gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
    return rows;
  }
  function probeRun(jobs, sync) {   // (the harness's stills: jobs of one visit and one mode, drawn and read at once)
    var V = jobs[0].V, mode = jobs[0].mode, n = 0, i, k, offs = [];
    for (i = 0; i < jobs.length; i++) { offs.push(n); var J0 = jobs[i]; for (k = 0; k < J0.n * 2; k++) PSCR[n * 2 + k] = J0.pts[k]; n += J0.n; }
    var rows = probeDraw(V, mode, n);
    var px = new Uint8Array(PROBE_W * rows * 4); gl.readPixels(0, 0, PROBE_W, rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (i = 0; i < jobs.length; i++) {
      var J1 = jobs[i], h = new Float32Array(J1.n);
      for (k = 0; k < J1.n; k++) h[k] = probeDec(px, offs[i] + k);
      J1.h = h; J1.done = true; J1.sent = J1.landed = J1.n;
    }
  }
  /* a frame's batch: up to `cap` points of the jobs waiting (one visit and mode: the first waiting job's), drawn and
     read into the ring's slot. Needs the realm's programs and the noise */
  function probeFlush(cap) {
    var i, n = 0, V = null, mode = 0, J0;
    while (PJOBS.length && PJOBS[0].cancel) PJOBS.shift();
    if (!PJOBS.length) return;
    V = PJOBS[0].V; mode = PJOBS[0].mode;
    if (!V.def.P || V.def.P.st !== 2 || !NOISE.done || !V.paramsFlat || !KW.tex) return;   // (as groundCache)
    var want = 0; for (i = 0; i < PJOBS.length && want < cap; i++) { J0 = PJOBS[i]; if (!J0.cancel && J0.V === V && J0.mode === mode) want += J0.n - J0.sent; }
    want = Math.min(want, cap);
    var S = rbSlot(Math.ceil(want / PROBE_W) * PROBE_W * 4);
    if (!S) { PSTAT.waits++; return; }
    var parts = [];
    for (i = 0; i < PJOBS.length && n < cap; i++) {
      J0 = PJOBS[i]; if (J0.cancel || J0.V !== V || J0.mode !== mode) continue;
      var m = Math.min(J0.n - J0.sent, cap - n);
      for (var k = 0; k < m * 2; k++) PSCR[n * 2 + k] = J0.pts[J0.sent * 2 + k];
      parts.push(J0, J0.sent, m, n);
      J0.sent += m; n += m;
    }
    for (i = PJOBS.length - 1; i >= 0; i--) if (PJOBS[i].cancel || PJOBS[i].sent >= PJOBS[i].n) PJOBS.splice(i, 1);
    if (!n) return;
    var rows = probeDraw(V, mode, n);
    rbRead(S, 0, 0, PROBE_W, rows, { k: 'probe', parts: parts });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    PSTAT.batches++; PSTAT.points += n; if (n > PSTAT.maxPts) PSTAT.maxPts = n;
    if (REC) REC.fr.probes += n;
  }
  function probeLand(e) {
    var P = e.parts, px = RB.buf, base = e.off / 4;
    for (var i = 0; i < P.length; i += 4) {
      var J0 = P[i], j0 = P[i + 1], m = P[i + 2], o = P[i + 3];
      if (J0.cancel) continue;
      for (var k = 0; k < m; k++) J0.h[j0 + k] = probeDec(px, base + o + k);
      J0.landed += m; if (J0.landed >= J0.n) J0.done = true;
    }
  }
  function probeDropAll() {   // (a lost context, a journey reset: the jobs are gone with it; their owners ask again)
    PJOBS.forEach(function (j) { j.cancel = true; }); PJOBS = [];
    if (!LOST) RB.fences.forEach(function (F) { gl.deleteSync(F.s); });
    RB.fences = []; RB.slots.forEach(function (S) { S.st = 0; S.used = 0; S.ents.length = 0; });
  }

