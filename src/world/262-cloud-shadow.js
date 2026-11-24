  /* ---------------------------------------------------------------- the clouds' shadows on the land */
  /* (physics: light/cloud-shadow; the owner, 2026-11-15: "No, natural light is fine": the world's own cast shadows are
     free under the light ceiling, and nothing is darkened for the words) Every cloud body's lobes (its cells' soft
     spheres, where its layer's wind has carried them: cellOff on the clouds' clock) cast the key's light off the land
     along the live key (uSun: the sun, or on the moonlit sky the moon's disc). One pass a frame draws each lobe as the
     ellipse it throws on one level plane (CSH_Y, the ground under the camera), its light's transmittance there
     exp(-k chord) (the chord the key's ray through the lobe cuts, softened over the key's own angular size: the
     penumbra), the lobes multiplied together (exp of the summed depth). The land reads it where its own point, carried
     along the same key, meets that plane, and takes it off the key's direct light alone: a shadow is never darker than
     the land's own shade, the sky's light is untouched. CSH_E m about the camera (CSH_N texels); past 3/4 of it the
     shadow eases off with the distance (a place's, never the clock's) */
  var CSH_N = 1024, CSH_E = 20000, CSH_K = 0.05, CSH_SUN = 0.0046, CSH_MAX = 32768;   // (texels; the half extent, m: past the land the eye sees, so the shadow's easing-off falls under the far haze, never across the near land; the lobes' extinction, 1/m: the march's VSIGMA 0.19 over the lobes' eroded fill, about a quarter; the key's angular radius, rad: the sun's 0.53 deg disc, the moon's alike; the most lobes)
  var CSH = { T: null, vao: null, buf: null, a: new Float32Array(CSH_MAX * 4), n: 0, ok: false };
  var CSHU = new Float32Array(4), CSHO = new Float64Array(3);   // (uCShP: the map's origin x, z (texel-snapped, the JS's doubles), its half extent, the plane's height)
  var VS_CSH = `@glsl vs-cshadow`;
  var FS_CSH = `@glsl fs-cshadow`;
  function cshInit() {   // (with the engine's programs: the lobes' instance buffer and its layout)
    CSH.buf = gl.createBuffer(); CSH.vao = gl.createVertexArray();
    gl.bindVertexArray(CSH.vao); gl.bindBuffer(gl.ARRAY_BUFFER, CSH.buf); gl.bufferData(gl.ARRAY_BUFFER, CSH.a.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);
  }
  /* the lobes about the camera, relative to the map's origin, their height over the plane: [x, y, z, R] */
  function cshLobes(V, s) {
    var L = V.cellList, n = 0, a = CSH.a, t = cloudT(), ox = CSHU[0], oz = CSHU[1], E = CSH_E, yg = CSHU[3], i, j;
    var sy = Math.max(s[1], 0.02), kx = s[0] / sy, kz = s[2] / sy;   // (a lobe's shadow on the plane: its centre less s.xz y / s.y)
    if (L) for (i = 0; i < L.length && n < CSH_MAX; i++) {
      var C = L[i]; if (C.st < 3 || !C.soft || !C.softB) continue;
      var off = cellOff(C, t, CSHO), S = C.soft;
      for (j = 0; j < C.softB.length && n < CSH_MAX; j++) {
        var b = C.softB[j], by = b[1] + off[2] - yg, bx = b[0] + off[0] - by * kx - ox, bz = b[2] + off[1] - by * kz - oz, br = b[3] / sy;
        if (by + b[3] < 0 || Math.abs(bx) > E + br || Math.abs(bz) > E + br) continue;   // (the body's bound: under the plane, or its shadow off the map)
        for (var q = b[4]; q < b[5] && n < CSH_MAX; q += 4) {
          var y = S[q + 1] + off[2] - yg; if (y + S[q + 3] <= 0) continue;
          a[n * 4] = S[q] + off[0] - ox; a[n * 4 + 1] = y; a[n * 4 + 2] = S[q + 2] + off[1] - oz; a[n * 4 + 3] = S[q + 3]; n++;
        }
      }
    }
    return n;
  }
  function cshPass(V) {
    CSH.ok = false;
    if (!V.def.cloudShadow || !EP.cshadow || !EP.cshadow.ok) return;
    var s = airLightDir(V.L || V.light);
    if (!(s[1] > 0.02)) return;   // (the key at or under the horizon: no direct light to take off)
    if (!CSH.T) CSH.T = target(CSH_N, CSH_N, 'rgba8');
    var cell = 2 * CSH_E / CSH_N;
    CSHU[0] = Math.floor(CAM.pos[0] / cell) * cell; CSHU[1] = Math.floor(CAM.pos[2] / cell) * cell; CSHU[2] = CSH_E; CSHU[3] = groundAt(V, CAM.pos[0], CAM.pos[2]);
    var n = cshLobes(V, s); CSH.n = n;
    gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    useTarget(CSH.T, CSH_N, CSH_N); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false); gl.colorMask(true, true, true, true);
    gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.clearColor(0, 0, 0, 0);
    if (n > 0) {
      var P = EP.cshadow; gl.useProgram(P.p);
      gl.uniform3fv(P.u.uSun, s); gl.uniform4fv(P.u.uCShP, CSHU); gl.uniform2f(P.u.uCShK, CSH_K, CSH_SUN);
      gl.bindVertexArray(CSH.vao); gl.bindBuffer(gl.ARRAY_BUFFER, CSH.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, CSH.a, 0, n * 4);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);   // (each lobe's transmittance multiplied in)
      dc(gl.TRIANGLE_STRIP, 4, n);
      gl.disable(gl.BLEND); gl.bindVertexArray(null);
    }
    gl.depthMask(true);
    CSH.ok = true;
  }
