  /* ---------------------------------------------------------------- the clipmap grid (one grid, five index sets) */
  /* the triangles in column strips of 16 cells, row after row inside a strip: a vertex is shaded about once (its row's
     neighbours still in the post-transform cache when the next row reuses them) where a row-major order over the whole
     grid shaded every vertex twice */
  var GN = 96;   // cells across a ring (even, divisible by 4)
  function makeGrid() {
    var G = { vao: gl.createVertexArray(), ib: [] }, n = GN + 1, v = new Float32Array(n * n * 2), i, j;   // (speed S0: floats, not unnormalised bytes: ANGLE-D3D11 would convert those in the vertex shader, a second compile of the terrain's vertex program at its first draw; the same integers)
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) { v[(j * n + i) * 2] = i; v[(j * n + i) * 2 + 1] = j; }
    gl.bindVertexArray(G.vao);
    G.vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, G.vb); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // set 0: the full grid (the finest ring); sets 1-4: the grid with the finer ring's hole at offset (ox, oy) in {0,1}^2
    for (var set = 0; set < 5; set++) {
      var idx = [], ox = (set - 1) & 1, oy = ((set - 1) >> 1) & 1, q4 = GN / 4, h0x = q4 + ox, h0y = q4 + oy;
      for (var s0 = 0; s0 < GN; s0 += 16) for (j = 0; j < GN; j++) for (i = s0; i < Math.min(s0 + 16, GN); i++) {
        if (set > 0 && i >= h0x && i < h0x + GN / 2 && j >= h0y && j < h0y + GN / 2) continue;
        var a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        if (((i + j) & 1) === 0) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b);
      }
      var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      G.ib.push({ b: ib, n: idx.length });
    }
    gl.bindVertexArray(null);
    return G;
  }

