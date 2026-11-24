  /* ---------------------------------------------------------------- the world's build: the veils' set, meshes and their attributes */
  /* (physics: air/particles-seen) the particle sets are gone (no realm draws one: docs/world.md); particleSet
     shapes the veils' set */
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

