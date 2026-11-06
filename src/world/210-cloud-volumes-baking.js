  /* ---------------------------------------------------------------- cloud volumes: baking */
  var VOL_LAYERS = 24, VSIGMA = 0.19;
  function tex3params() {
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  }
  /* a cloud body: its box from its lobes (in its own frame, turned about the vertical by its yaw, so a wall's box is
     tight along it), its voxels (res across its longest side), its texture; then baked: the density into the scratch
     volume a layer per draw, then the final volume (the distance, the optical depth toward the sun and the sky) */
  function volPrep(PF, bi, G, res) {
    var B = PF.bodies[bi], a = PF.a, i0 = B.i0, i1 = bi + 1 < PF.bodies.length ? PF.bodies[bi + 1].i0 : PF.count(), i, k;
    var rs = []; for (i = i0; i < Math.min(i1, i0 + 96); i++) rs.push(a[i * 12 + 3]); rs.sort(function (x, y) { return x - y; });
    var Rm = rs[rs.length >> 1] || 10, mg = Rm * ((B.billow || 0.8) * 0.45 + 0.12);   // the median lobe; room for the billows and fillets
    var cy = Math.cos(B.yaw || 0), sy = Math.sin(B.yaw || 0), n = Math.min(i1 - i0, 96), LP = new Float32Array(n * 3);
    for (i = 0; i < n; i++) { var ax = a[(i0 + i) * 12], az = a[(i0 + i) * 12 + 2]; LP[i * 3] = cy * ax - sy * az; LP[i * 3 + 1] = a[(i0 + i) * 12 + 1]; LP[i * 3 + 2] = sy * ax + cy * az; }
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (i = 0; i < n; i++) for (k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], LP[i * 3 + k] - a[(i0 + i) * 12 + 3] - mg); hi[k] = Math.max(hi[k], LP[i * 3 + k] + a[(i0 + i) * 12 + 3] + mg); }
    var cl = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], h = [(hi[0] - lo[0]) / 2 * 1.06, (hi[1] - lo[1]) / 2 * 1.06, (hi[2] - lo[2]) / 2 * 1.06];
    var c = [cy * cl[0] + sy * cl[2], cl[1], -sy * cl[0] + cy * cl[2]];   // the centre in the world
    if (DEVMODE && SW.volres > 0) res = SW.volres;   // (E1, dev: the structural harness's long flights with small bodies: the same calls, a fraction of SwiftShader's bake time)
    var vox = Math.max(h[0], h[1], h[2]) * 2 / (res || 52), dims = [0, 0, 0];
    for (k = 0; k < 3; k++) dims[k] = clamp(Math.ceil(h[k] * 2 / vox), 6, 64);
    var L = new Float32Array(96 * 4);
    for (i = 0; i < n; i++) { L[i * 4] = LP[i * 3] - cl[0]; L[i * 4 + 1] = LP[i * 3 + 1] - cl[1]; L[i * 4 + 2] = LP[i * 3 + 2] - cl[2]; L[i * 4 + 3] = a[(i0 + i) * 12 + 3]; }
    var T3 = null;   // (E1: the texture is made by the body's first bake, GPU work: volTex)
    var erode = B.erode === undefined ? 0.75 : B.erode, bil = B.billow || 0.8;
    // the opaque cores: an icosahedron inside each lobe, past its billows and 25 m of cloud
    var inward = erode * bil * Rm * 0.42 + 4 + 25, cores = [];
    for (i = i0; i < i1; i++) { var rc = a[i * 12 + 3] * Math.min(B.squash || 0.9, 1) - inward; if (rc > 6) cores.push(a[i * 12], a[i * 12 + 1], a[i * 12 + 2], rc); }
    return { G: G || null, L: L, n: n, h: h, dims: dims, vox: vox, Rm: Rm, cy: cy, sy: sy, B: { seed: B.seed || 0.37, erode: erode, noise: B.noise || 3.6, blend: B.blend || 0.5, squash: B.squash || 0.9, billow: bil }, pass: 0, z: 0, done: false,
      out: { t: T3, c: new Float32Array(c), h: new Float32Array(h), yaw: new Float32Array([cy, sy]), dims: dims, r: Math.sqrt(h[0] * h[0] + h[1] * h[1] + h[2] * h[2]), range: Rm * 4, band: Math.max(Rm * (B.band || 0.07), 3),
        reach: erode * Rm * bil * 0.5 + 2, kind: B.kind || 0, vox: vox, y0: lo[1], y1: hi[1], base: B.base !== undefined ? B.base : -1e5, fade: 0, ready: false, cores: cores, bytes: dims[0] * dims[1] * dims[2] * (VOL16 ? 8 : 4),
        u4a: new Float32Array(4), u4b: new Float32Array(4), u4c: new Float32Array(4) } };
  }
  /* up to budget units of this body's baking; returns the units spent. A unit is a 44 x 44 layer of 48 lobes (the
     density pass: its pixels times its lobes; the light pass: its pixels, half again), so a great wall of 64 x 64 and
     96 lobes takes about 4 units a layer, and a frame's baking stays about the same work whatever the body */
  function volTex(vb) {   // (E1) the body's texture, at its first bake
    var d = vb.dims, T3 = pTake('tex3'); if (vb.G) vb.G.texs.push(T3);   // (E1 Fix 3: from the pool, re-specified below)
    gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_3D, T3);
    // (hotfix G0, pass 2) half floats where this GPU filters an 8-bit texture at 8 bits (VOL16, probeFilter): there the
    // RGBA8 volume came back in terraces of the soft band (about four and a half codes wide) that the march's samples
    // crossed as the view moved, and the clouds' edges blinked in half-resolution blobs at 3-4x the 4x reference (WebKit
    // here). The values are the same (each channel clamped to 0 .. 1 as the bytes were); filtered in float the field is
    // smooth. Twice the bytes and the bandwidth, so only where it is needed
    gl.texImage3D(gl.TEXTURE_3D, 0, VOL16 ? gl.RGBA16F : gl.RGBA8, d[0], d[1], d[2], 0, gl.RGBA, VOL16 ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null); tex3params();
    gl.activeTexture(gl.TEXTURE0);
    vb.out.t = T3;
  }
  function volBake(vb, V, budget) {
    if (!vb.out.t) volTex(vb);
    var P, d = vb.dims, made = 0, B = vb.B, px = d[0] * d[1] / 1936, uD = Math.max(1, px * vb.n / 48), uL = Math.max(1, px * 1.5);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    if (vb.pass === 0) {
      P = EP.vdens; gl.useProgram(P.p); setFrameUniforms(P, V);
      gl.uniform4fv(P.u.uLobe, vb.L); gl.uniform1i(P.u.uLobeN, vb.n); gl.uniform3fv(P.u.uHalf, vb.h); gl.uniform3f(P.u.uDims, d[0], d[1], d[2]);
      gl.uniform4f(P.u.uVK, B.seed, B.erode, vb.Rm * B.noise, vb.Rm * B.blend);
      gl.uniform4f(P.u.uVK2, 0, B.squash, vb.Rm * 4, vb.Rm * B.billow);
      gl.bindFramebuffer(gl.FRAMEBUFFER, VTMP.f); gl.viewport(0, 0, d[0], d[1]); gl.bindVertexArray(FULLVAO);
      while (vb.z < d[2] && made < budget) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, VTMP.t, 0, vb.z); gl.uniform1f(P.u.uLayer, vb.z); gl.drawArrays(gl.TRIANGLES, 0, 3); vb.z++; made += uD; }
      if (vb.z < d[2]) return made;
      vb.pass = 1; vb.z = 0;
    }
    if (made >= budget) return made;
    P = EP.vlight; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_3D, VTMP.t); gl.activeTexture(gl.TEXTURE0);
    gl.uniform3fv(P.u.uHalf, vb.h); gl.uniform3f(P.u.uDims, d[0], d[1], d[2]); gl.uniform3f(P.u.uScale, d[0] / 64, d[1] / 64, d[2] / 64);
    var sd = V.light.sunDir, cy = vb.cy, sy = vb.sy;
    gl.uniform3f(P.u.uSunL, cy * sd[0] - sy * sd[2], sd[1], sy * sd[0] + cy * sd[2]); gl.uniform2f(P.u.uYawCS, cy, sy);
    gl.uniform1f(P.u.uSigma, VSIGMA); gl.uniform1f(P.u.uSD, vb.Rm * 4 / (vb.vox * 2.2)); gl.uniform1f(P.u.uVox, vb.vox);
    gl.bindFramebuffer(gl.FRAMEBUFFER, BAKEFB); gl.viewport(0, 0, d[0], d[1]); gl.bindVertexArray(FULLVAO);
    while (vb.z < d[2] && made < budget) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, vb.out.t, 0, vb.z); gl.uniform1f(P.u.uLayer, vb.z); gl.drawArrays(gl.TRIANGLES, 0, 3); vb.z++; made += uL; }
    if (vb.z >= d[2]) { vb.done = true; vb.L = null; vb.out.ready = true; }
    return made;
  }
