  /* ---------------------------------------------------------------- the ground about the camera */
  /* Two grids of the realm's ground, 160 x 160 at 4 m (640 m across), drawn when the camera has moved 16 m: the land's
     height for the scatter, the particles and the veils of sand (a float target where the context can); and the
     camera's own ground (the realm's camGround: over a bay of cloud, the cloud's top), packed and read back for the
     flight. The camera's grid is 100 KB of bytes, so it comes back in two halves of 80 rows (50 KB each, each in one
     frame's slot beside the frame's probes); the grid is not drawn again until both halves are read out of it.
     The flight reads the last grid that has landed: a few frames late, always about the camera. */
  var GCN = 160, GCCELL = 4, GCT = null, GCCT = null, GCU = new Float32Array(4), GCK = new Float64Array([-1, 0, 0, 0]);
  var GROUND = { V: null, x0: 0, z0: 0, cell: GCCELL, n: GCN, h: new Float32Array(GCN * GCN), e: new Float32Array(GCN * GCN), ok: false, rd: 0, gen: 0, got: 0, P: { V: null, x0: 0, z0: 0, gen: 0 }, nx: 0, nz: 0, nV: null };
  var GPX = new Uint8Array(GCN * GCN * 4), GHALF = GCN / 2;
  function groundCache(V, cx, cz, sync) {
    if (!V.def.P || V.def.P.st !== 2 || !NOISE.done || !V.paramsFlat || !KW.tex) return;   // (and the visit planned (its field's parameters) and its weights' grid on the GPU (vsKW))
    if (!sync && GROUND.rd > 0) return;   // (the last grid's halves not yet read out of the target)
    var x0 = Math.floor(cx / 16) * 16 - GCN / 2 * GCCELL, z0 = Math.floor(cz / 16) * 16 - GCN / 2 * GCCELL;
    if (GCK[0] === V.k && GCK[1] === x0 && GCK[2] === z0 && GCK[3] === J.seed) return;
    GCK[0] = V.k; GCK[1] = x0; GCK[2] = z0; GCK[3] = J.seed;
    if (!GCT) {
      GCT = { f: gl.createFramebuffer() }; gl.activeTexture(gl.TEXTURE11); GCT.t = tex2d(GCN, GCN, FLOAT32_RT ? gl.R32F : gl.RGBA8, FLOAT32_RT ? gl.RED : gl.RGBA, FLOAT32_RT ? gl.FLOAT : gl.UNSIGNED_BYTE, gl.NEAREST); gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, GCT.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, GCT.t, 0);
      GCCT = target(GCN, GCN, 'rgba8');
    }
    GCU[0] = x0; GCU[1] = z0; GCU[2] = GCCELL; GCU[3] = GCN;
    gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true); gl.bindVertexArray(FULLVAO);
    if (V.def.P.hp) hpRun(V, 2, GCN, GCN, null, x0, z0, GCCELL);   // (both of the grid's draws read it)
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCT.f); gl.viewport(0, 0, GCN, GCN); probeProg(V, 2, x0, z0, GCCELL); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCCT.f); gl.viewport(0, 0, GCN, GCN); probeProg(V, 3, x0, z0, GCCELL); gl.drawArrays(gl.TRIANGLES, 0, 3);
    ST.gc++;
    if (sync) {
      var px = new Uint8Array(GCN * GCN * 4); gl.readPixels(0, 0, GCN, GCN, gl.RGBA, gl.UNSIGNED_BYTE, px);
      groundLand(px, V, x0, z0);
    } else {
      GROUND.gen++; GROUND.P.V = V; GROUND.P.x0 = x0; GROUND.P.z0 = z0; GROUND.P.gen = GROUND.gen; GROUND.got = 0; GROUND.rd = 1;
      groundRead();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /* the next half of the camera's grid into this frame's slot (if it has room) */
  function groundRead() {
    if (GROUND.rd <= 0 || !GCCT) return;
    var S = rbSlot(GCN * GHALF * 4); if (!S) return;
    var half = GROUND.rd - 1;
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCCT.f);
    rbRead(S, 0, half * GHALF, GCN, GHALF, { k: 'ground', half: half, gen: GROUND.P.gen, V: GROUND.P.V, x0: GROUND.P.x0, z0: GROUND.P.z0 });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    GROUND.rd = half === 0 ? 2 : 0;
  }
  function groundHalf(e) {
    if (e.gen !== GROUND.P.gen) return;   // (a grid since replaced: a restore, a reset)
    GPX.set(RB.buf.subarray(e.off, e.off + e.bytes), e.half * GCN * GHALF * 4);
    GROUND.got |= 1 << e.half;
    if (GROUND.got === 3) { GROUND.got = 0; groundLand(GPX, e.V, e.x0, e.z0); }
  }
  function groundLand(px, V, x0, z0) {
    var h = GROUND.h, n = GCN * GCN;
    for (var i = 0; i < n; i++) { var b = i * 4; h[i] = ((px[b] / 255 + px[b + 1] / 65025 + px[b + 2] / 16581375 + px[b + 3] / 4228250625) * 8192) - 4096; }
    groundEnv(h, GROUND.e);
    GROUND.V = V; GROUND.x0 = x0; GROUND.z0 = z0; GROUND.ok = true; GROUND.gen2 = (GROUND.gen2 || 0) + 1;
  }
  /* the surface the flight follows: the camera's ground's upper envelope at ENV_K m per m, E(p) = max over q of H(q) - ENV_K |p - q| (a cone dilation, worked as two chamfer passes over the
     grid: 4 m straight, 4 sqrt 2 diagonal, so E is within ENV_K x 1.082 = 0.195 m/m in every direction). E is never
     under the ground (so the hard rule's floor holds over it) and never steeper than the climb the flight can make (2.6
     m/s at 12 m/s: 0.217), on any line the visitor turns to: a rise is climbed from as far off as its height asks, and
     a crest, a terrace, a heap or the coast's rise never meets the camera faster than it can climb. A function of the
     ground alone (no heading, no path); the land's taller features are bounded by construction (realm-dunes.js: the
     ridges at 30-60 m, the terraces at 46-60) so their cones lie within the grid's 320 m */
  var ENV_K = 0.18, ENV_S = ENV_K * GCCELL, ENV_D = ENV_K * GCCELL * Math.SQRT2;
  function groundEnv(h, e) {
    var N = GCN, i, j, q, v;
    for (i = 0; i < N * N; i++) e[i] = h[i];
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {   // forward: from the left, below-left, below, below-right
      q = j * N + i; v = e[q];
      if (i > 0 && e[q - 1] - ENV_S > v) v = e[q - 1] - ENV_S;
      if (j > 0) { if (e[q - N] - ENV_S > v) v = e[q - N] - ENV_S; if (i > 0 && e[q - N - 1] - ENV_D > v) v = e[q - N - 1] - ENV_D; if (i < N - 1 && e[q - N + 1] - ENV_D > v) v = e[q - N + 1] - ENV_D; }
      e[q] = v;
    }
    for (j = N - 1; j >= 0; j--) for (i = N - 1; i >= 0; i--) {   // backward
      q = j * N + i; v = e[q];
      if (i < N - 1 && e[q + 1] - ENV_S > v) v = e[q + 1] - ENV_S;
      if (j < N - 1) { if (e[q + N] - ENV_S > v) v = e[q + N] - ENV_S; if (i < N - 1 && e[q + N + 1] - ENV_D > v) v = e[q + N + 1] - ENV_D; if (i > 0 && e[q + N - 1] - ENV_D > v) v = e[q + N - 1] - ENV_D; }
      e[q] = v;
    }
  }
  /* the formations in the envelope too: each solid standing on the land (a cell's cylinder: a mesa, a shard, a slab, a
     ruin's wall, a talus foot) raises the surface flown by its own cone, its top plus SOL_M less ENV_K per metre beyond
     its radius, worked analytically from the solids within SOL_R of the camera (refreshed every step: ENV_SOL), so
     whatever line the visitor turns to, a formation is climbed over from as far off as its height asks, never met: the
     slip passes beside what it can, the hard rule is never needed (without the solids, a mesa's face met after a drag
     has the hard rule slide the camera along it, 875 pushes) */
  var SOL_M = 10, SOL_R = 1700, ENV_SOL = [];
  function envSolids(V, x, z) {
    ENV_SOL.length = 0; var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st < 2 || !C.obst.length) continue;
      var dx = C.bound[0] - x, dz = C.bound[2] - z, R = SOL_R + C.bound[3];
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = 0; k < C.obst.length; k++) { var o = C.obst[k]; if (o.c && !o.cloud) ENV_SOL.push(o); }
    }
  }
  function solidEnv(x, z, v) {
    for (var i = 0; i < ENV_SOL.length; i++) { var o = ENV_SOL[i], dx = x - o.x, dz = z - o.z, d = Math.sqrt(dx * dx + dz * dz) - o.r, e = o.y1 + SOL_M - ENV_K * Math.max(d, 0); if (e > v) v = e; }
    return v;
  }
  /* the camera's ground at a point: bilinear, or (conservative) the highest of the 4 x 4 texels about it (no crest
     between samples is missed); the envelope's unless raw is asked */
  function groundAt(V, x, z, cons, raw) {
    var G = GROUND;
    if (G.V !== V || !G.ok) return V.g0max !== undefined ? V.g0max : 0;
    var fx = (x - G.x0) / G.cell - 0.5, fz = (z - G.z0) / G.cell - 0.5, n = G.n;
    fx = clamp(fx, 1, n - 3); fz = clamp(fz, 1, n - 3);
    var ix = Math.floor(fx), iz = Math.floor(fz), h = raw ? G.h : G.e;
    if (cons) {
      var m = -1e9;
      for (var j = iz - 1; j <= iz + 2; j++) for (var i = ix - 1; i <= ix + 2; i++) { var v = h[j * n + i]; if (v > m) m = v; }
      return raw ? m : solidEnv(x, z, m);
    }
    var wx = fx - ix, wz = fz - iz, a = h[iz * n + ix], b = h[iz * n + ix + 1], c = h[(iz + 1) * n + ix], d = h[(iz + 1) * n + ix + 1];
    var bl = (a * (1 - wx) + b * wx) * (1 - wz) + (c * (1 - wx) + d * wx) * wz;
    return raw ? bl : solidEnv(x, z, bl);
  }

