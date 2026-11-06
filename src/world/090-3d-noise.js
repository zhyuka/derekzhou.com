  /* ---------------------------------------------------------------- the 3D noise (tiling, 32 cubed, made once) */
  /* (fast500 step 1b) baked on the CPU, in round 3b's own double-precision arithmetic (noiseVoxel's, hoisted for the
     bake: noiseLayer), from round 3b's stream (18,688 numbers). E1 baked it on the GPU: a program of its own, the stream
     as a points texture, and the 258 voxels whose exact value lies within a thousandth of a code of a rounding boundary
     worked out here and written over the GPU's float32 rounding (NOISE_FIX). Every voxel is the exact one here, so the
     volume is the same byte for byte (read back on D3D11: md5 d3dcf1f9, every mip level the same), and the program, its
     link (115 ms of the compile pool's CPU; one serial link where links run one at a time) and the points texture are
     gone. A layer a boot frame (about 0.4 ms here; a count, no clock read), the layers left all at once in the first
     frame after C; then level 0 uploaded whole and the mipmaps made by generateMipmap as before (never on the CPU:
     D3D11's 3D mipmaps are not a rounded 2x2x2 mean, about one byte in four differs). NOISE.done once all of that is
     in. */
  var NOISE = { t: null, z: 0, K: 0, done: false, fixed: 0, data: null, d64: null, vol: null, ax: null };   // (z: the layers baked; vol: the bytes, kept for a restore; K and fixed 0 for the record: no draw, no fix)
  var NOISE_N = 32;
  /* round 3b's stream, in its order: the points of the Worley noise at 4, 8 and 16 cells across, then the value
     noise's lattices (all of them float32, as round 3b's Float32Arrays held them) */
  function noiseData() {
    var r = RNG(0x5eed1234), a = new Float32Array(256 * 73);
    for (var i = 0; i < 18688; i++) a[i] = r.f();
    return a;
  }
  /* round 3b's own arithmetic (double precision) for one voxel, into out[o..o+3] */
  function noiseVoxel(D, x, y, z, out, o) {
    var N = NOISE_N, u = (x + 0.5) / N, v = (y + 0.5) / N, w = (z + 0.5) / N;
    function worley(n, base) {
      var px = u * n, py = v * n, pz = w * n, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz), best = 9;
      for (var dz = -1; dz <= 1; dz++) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var cx = ix + dx, cy = iy + dy, cz = iz + dz, k = base + ((((cz % n) + n) % n * n + (((cy % n) + n) % n)) * n + (((cx % n) + n) % n)) * 3;
        var fx = cx + D[k] - px, fy = cy + D[k + 1] - py, fz = cz + D[k + 2] - pz, d = fx * fx + fy * fy + fz * fz;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    }
    function vnoise(n, base) {
      var px = u * n, py = v * n, pz = w * n, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
      var fx = px - ix, fy = py - iy, fz = pz - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
      function g(a, b, c) { return D[base + ((((c % n) + n) % n) * n + (((b % n) + n) % n)) * n + (((a % n) + n) % n)]; }
      var x00 = lerp(g(ix, iy, iz), g(ix + 1, iy, iz), fx), x10 = lerp(g(ix, iy + 1, iz), g(ix + 1, iy + 1, iz), fx);
      var x01 = lerp(g(ix, iy, iz + 1), g(ix + 1, iy, iz + 1), fx), x11 = lerp(g(ix, iy + 1, iz + 1), g(ix + 1, iy + 1, iz + 1), fx);
      return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
    }
    var vn = vnoise(4, 14016) * 0.55 + vnoise(8, 14080) * 0.3 + vnoise(16, 14592) * 0.15;
    var w4 = 1 - worley(4, 0), w8 = 1 - worley(8, 192), w16 = 1 - worley(16, 1728);
    var pw = clamp(vn * 0.55 + (w4 * 0.625 + w8 * 0.25 + w16 * 0.125) * 0.6, 0, 1);
    out[o] = Math.round(pw * 255); out[o + 1] = Math.round(clamp(w8 * 0.7 + w16 * 0.3, 0, 1) * 255); out[o + 2] = Math.round(clamp(w16, 0, 1) * 255); out[o + 3] = Math.round(clamp(vn, 0, 1) * 255);
  }
  /* (fast500 step 1b) noiseVoxel hoisted for the bake (the routes' bake.js 'fast': the same double-precision ops in the
     same order, so the same bytes; checked against noiseVoxel at every voxel, the dev hook noiseCheck). Per scale n, each
     axis's points (((x + 0.5) / 32) * n), cells, smoothsteps and wrapped neighbour cells, made once */
  function noiseAxis(n) {
    var N = NOISE_N, p = new Float64Array(N), ix = new Int32Array(N), sm = new Float64Array(N), c = new Float64Array(N * 3), w = new Int32Array(N * 3), x, d;
    for (x = 0; x < N; x++) { p[x] = ((x + 0.5) / N) * n; ix[x] = Math.floor(p[x]); var f = p[x] - ix[x]; sm[x] = f * f * (3 - 2 * f); }
    for (x = 0; x < N; x++) for (d = 0; d < 3; d++) { c[x * 3 + d] = ix[x] + d - 1; w[x * 3 + d] = (((ix[x] + d - 1) % n) + n) % n; }
    return { p: p, ix: ix, sm: sm, c: c, w: w };
  }
  function noiseWorley(D, n, base, A, x, y, z) {   // (noiseVoxel's worley)
    var px = A.p[x], py = A.p[y], pz = A.p[z], C = A.c, W = A.w, best = 9, n2 = n * n, dz, dy, dx;
    for (dz = 0; dz < 3; dz++) {
      var cz = C[z * 3 + dz], wz = W[z * 3 + dz] * n2;
      for (dy = 0; dy < 3; dy++) {
        var cy = C[y * 3 + dy], wzy = wz + W[y * 3 + dy] * n;
        for (dx = 0; dx < 3; dx++) {
          var cx = C[x * 3 + dx], k = base + (wzy + W[x * 3 + dx]) * 3;
          var fx = cx + D[k] - px, fy = cy + D[k + 1] - py, fz = cz + D[k + 2] - pz, d = fx * fx + fy * fy + fz * fz;
          if (d < best) best = d;
        }
      }
    }
    return Math.sqrt(best);
  }
  function noiseValue(D, n, base, A, x, y, z) {   // (noiseVoxel's vnoise)
    var ix = A.ix[x], iy = A.ix[y], iz = A.ix[z], fx = A.sm[x], fy = A.sm[y], fz = A.sm[z], n2 = n * n, a, b;
    var x0 = ((ix % n) + n) % n, x1 = (((ix + 1) % n) + n) % n, y0 = (((iy % n) + n) % n) * n, y1 = ((((iy + 1) % n) + n) % n) * n;
    var z0 = base + (((iz % n) + n) % n) * n2, z1 = base + ((((iz + 1) % n) + n) % n) * n2;
    a = D[z0 + y0 + x0]; b = D[z0 + y0 + x1]; var x00 = a + (b - a) * fx;
    a = D[z0 + y1 + x0]; b = D[z0 + y1 + x1]; var x10 = a + (b - a) * fx;
    a = D[z1 + y0 + x0]; b = D[z1 + y0 + x1]; var x01 = a + (b - a) * fx;
    a = D[z1 + y1 + x0]; b = D[z1 + y1 + x1]; var x11 = a + (b - a) * fx;
    var l0 = x00 + (x10 - x00) * fy, l1 = x01 + (x11 - x01) * fy;
    return l0 + (l1 - l0) * fz;
  }
  /* one layer z of the volume into NOISE.vol: noiseVoxel's arithmetic at each of its 1,024 voxels */
  function noiseLayer(z) {
    var N = NOISE_N, D = NOISE.d64, A = NOISE.ax || (NOISE.ax = [noiseAxis(4), noiseAxis(8), noiseAxis(16)]), A4 = A[0], A8 = A[1], A16 = A[2], out = NOISE.vol, o = z * N * N * 4, x, y;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++, o += 4) {
      var vn = noiseValue(D, 4, 14016, A4, x, y, z) * 0.55 + noiseValue(D, 8, 14080, A8, x, y, z) * 0.3 + noiseValue(D, 16, 14592, A16, x, y, z) * 0.15;
      var w4 = 1 - noiseWorley(D, 4, 0, A4, x, y, z), w8 = 1 - noiseWorley(D, 8, 192, A8, x, y, z), w16 = 1 - noiseWorley(D, 16, 1728, A16, x, y, z);
      var pw = clamp(vn * 0.55 + (w4 * 0.625 + w8 * 0.25 + w16 * 0.125) * 0.6, 0, 1);
      out[o] = Math.round(pw * 255); out[o + 1] = Math.round(clamp(w8 * 0.7 + w16 * 0.3, 0, 1) * 255); out[o + 2] = Math.round(clamp(w16, 0, 1) * 255); out[o + 3] = Math.round(clamp(vn, 0, 1) * 255);
    }
  }
  /* stage B: the texture (level 0 made empty, as before; noiseStep fills it), and once a page the stream and the bytes
     (a restore keeps the layers baked: noiseStep only uploads them again) */
  function noiseInit() {
    var N = NOISE_N;
    NOISE.done = false;
    NOISE.t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE.t);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_3D, null);
    if (!NOISE.vol) { NOISE.data = noiseData(); NOISE.d64 = new Float64Array(NOISE.data); NOISE.vol = new Uint8Array(N * N * N * 4); NOISE.z = 0; }
    NOISE3 = NOISE.t;
  }
  /* stage E: a layer a call (sync: every layer left), and once every layer is baked, level 0 uploaded whole and the
     mipmaps made (generateMipmap, as before); true once done. No clock read: the boot calls it once a frame */
  function noiseStep(sync, deadline) {   // (deadline, WebKit boot: after C, layers while the frame's slice lasts, not all at once)
    if (NOISE.done) return true;
    if (!NOISE.vol || !NOISE.t) return false;
    var N = NOISE_N;
    while (NOISE.z < N) { noiseLayer(NOISE.z); NOISE.z++; if (!sync && !(deadline && clockNow() < deadline)) break; }
    if (NOISE.z < N) return false;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE.t);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, N, N, N, gl.RGBA, gl.UNSIGNED_BYTE, NOISE.vol);
    gl.generateMipmap(gl.TEXTURE_3D);
    gl.bindTexture(gl.TEXTURE_3D, null);
    NOISE.done = true;
    return true;
  }
  /* (dev) the noise's level 0 read back, layer by layer (the texture as sampled) */
  function devNoiseRead() {
    var N = NOISE_N, out = new Uint8Array(N * N * N * 4), fb = gl.createFramebuffer(), lay = new Uint8Array(N * N * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    for (var z = 0; z < N; z++) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, NOISE.t, 0, z); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, lay); out.set(lay, z * N * N * 4); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
    return out;
  }
  /* (dev) round 3b's own CPU bake, whole, voxel by voxel (the check of the hoisted bake's: noiseCheck) */
  function devNoiseCPU() {
    var N = NOISE_N, D = NOISE.data || noiseData(), out = new Uint8Array(N * N * N * 4);
    for (var z = 0; z < N; z++) for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) noiseVoxel(D, x, y, z, out, ((z * N + y) * N + x) * 4);
    return out;
  }

