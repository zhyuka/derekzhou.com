  /* ---------------------------------------------------------------- the world's build: particles, meshes and their attributes */
  /* a particle set as the realm gives it: { kind: 'grain' | 'mote' | 'mote2' (about the camera's height) | 'rain' |
     'drift' | 'drift2' (about the camera's height) (or hop[3]: 0-5), count, box (m), height (m), streak (s), width
     (px), wind [x, y, z] (m/s), color [r, g, b, opacity], hop [m, rate, lift m, kind] (grains), lift (m over the
     ground); rain: fall (m/s), splash (s), gusts (0-1); drifting: rise (m/s; < 0 sinks), life (s), wander (m/s),
     tumble (Hz), colors [[r, g, b, share], [r, g, b, share]] (a second and third colour), blink (the share of a cycle
     lit), flicker (0-1); areas: [names] (drawn in proportion to those areas' shares), rainScale (by the light's
     rain) } */
  var PKIND = { grain: 0, mote: 1, mote2: 2, rain: 3, drift: 4, drift2: 5 };
  function partPrep(o) {
    var q = {}, k;
    for (k in o) if (k !== 'colors' && k !== 'areas' && k !== 'kind') q[k] = o[k];
    var pa = particleSet(q, { hop: [0, 0, 0.2, 0] });
    if (o.kind !== undefined) pa.hop[3] = typeof o.kind === 'number' ? o.kind : PKIND[o.kind];
    if (o.lift !== undefined) pa.hop[2] = o.lift;
    var kd = pa.hop[3];
    pa.ud = new Float32Array(kd === 3 ? [o.fall || 8.5, o.splash || 0.25, o.gusts || 0, 0] : [o.rise || 0, o.life || 8, o.wander === undefined ? 0.3 : o.wander, o.tumble || 0]);
    pa.ue = new Float32Array(o.colors && o.colors[0] || [0, 0, 0, 0]); pa.uf = new Float32Array(o.colors && o.colors[1] || [0, 0, 0, 0]);
    pa.ug = new Float32Array([o.blink || 0, o.flicker || 0, 1, 0]);
    pa.areas = o.areas || null; pa.rainScale = !!o.rainScale;
    if (pa.streak === undefined) pa.streak = kd === 3 ? 0.06 : 0;
    if (pa.width === undefined) pa.width = 1.2;
    if (pa.height === undefined) pa.height = 20;
    if (!pa.wind) pa.wind = new Float32Array([0, 0, 0]);
    return pa;
  }
  function particleSet(o, def) {
    if (!o) return null;
    var r = {}, k;
    for (k in o) r[k] = (o[k] && o[k].length !== undefined && typeof o[k] !== 'string') ? new Float32Array(o[k]) : o[k];
    for (k in def) if (!r[k]) r[k] = new Float32Array(def[k]);
    return r;
  }
  function uploadMesh(B, G) {
    var M = { n: B.count(), vao: null, vb: null };
    if (!M.n) return M;
    M.vao = pTake('mesh'); if (G) G.vaos.push(M.vao);   // (from the pools)
    M.vb = pTake('buf'); if (G) G.bufs.push(M.vb);
    gl.bindVertexArray(M.vao); gl.bindBuffer(gl.ARRAY_BUFFER, M.vb); gl.bufferData(gl.ARRAY_BUFFER, B.bytes(), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, VSTRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VSTRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, VSTRIDE, 15);   // (its emission)
    gl.bindVertexArray(null);
    return M;
  }
  /* a mesh's attributes (0-4) on a VAO of its own, with an instance buffer's (from location `at`, `n` vec4s each,
     stride n x 16 bytes, from byte `off`) */
  function meshAttribs(M) {
    gl.bindBuffer(gl.ARRAY_BUFFER, M.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, VSTRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VSTRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, VSTRIDE, 15);
  }
  function instAttribs(buf, at, n, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (var i = 0; i < n; i++) { gl.enableVertexAttribArray(at + i); gl.vertexAttribPointer(at + i, 4, gl.FLOAT, false, n * 16, off + i * 16); gl.vertexAttribDivisor(at + i, 1); }
  }

