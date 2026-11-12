  /* ---------------------------------------------------------------- stats (draw calls, triangles, instances, pixels) */
  var ST = { draws: 0, tris: 0, inst: 0, px: { scene: 0, half: 0, quarter: 0, out: 0 }, cells: 0, cellsDrawn: 0, ringIdx: 0, ringAll: 0, vols: 0, flocks: 0, gc: 0, volFrag: 0 }, PROF = null;
  function prof(name) { if (PROF) PROF(name); }
  function dc(mode, count, inst, idx) {
    ST.draws++; var tri = mode === gl.TRIANGLES ? count / 3 : Math.max(count - 2, 0); ST.tris += tri * (inst || 1); ST.inst += inst || 0;
    if (idx) { if (inst) gl.drawElementsInstanced(mode, count, gl.UNSIGNED_SHORT, 0, inst); else gl.drawElements(mode, count, gl.UNSIGNED_SHORT, 0); }
    else if (inst) gl.drawArraysInstanced(mode, 0, count, inst); else gl.drawArrays(mode, 0, count);
  }

