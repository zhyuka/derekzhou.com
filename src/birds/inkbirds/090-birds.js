  /* ---------------- a bird's drawing record (its own for life, made at its first draw) ---------------- */

  /* what a drawn bird keeps between frames: its pose and basis, its points in the world and on the window, its light,
     its eased tone and the cloud before it */
  function drawRec(b) {
    return { kind: 'gull', st: b.st, seenF: -1, d: { span: 0, model: 0 }, P22: FP.pose(), B3: new Float64Array(3), G22: new Float64Array(22), gKind: '', F46: new Float64Array(3 * NV), B: new Float64Array(9), bT0: -1, bFrom: null, bTT: 0,
      V46: new Float64Array(3 * NV), X46: new Float64Array(3 * NV), D46: new Float32Array(2 * NV), IZ: new Float32Array(NV), X16: new Float64Array(48), body: new Float64Array(3),
      NZ: new Float64Array(3 * NFAC), FE: new Float64Array(3 * NFAC), FA: new Float64Array(NFAC), VZ: new Float64Array(3 * NV), E: new Float64Array(3), eOk: false,
      cw: new Float64Array(3), XF22: new Float64Array(22), LP22: new Float64Array(22), xT0: -1, xKey: -1, lod: 0, n: 1, spanPx: 0, floorPx: 1, filt: 1, halo: 0, haloE: 3, flapW: 0, hold: false, ldt: 0, HB: new Float64Array(3) };
  }
