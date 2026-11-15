  /* ---------------------------------------------------------------- cells: resolving a probed cell (stage 2) */
  function cellResolve(C) {
    var V = C.V, h = C.job.h, i, j;
    for (i = 0; i < C.alist.length; i++) {
      var o = C.alist[i], b = o.ai, m = h[b];
      if (o.isG) { o.gh = h.subarray(b, b + o.n); continue; }
      if (o.lq) { var mx = m; for (j = 1; j < 9; j++) mx = Math.max(mx, h[b + j]); o.landMax = mx; o.ground = h[b]; continue; }
      if (o.an === 9 && o.foot > 0) for (j = 1; j < 9; j++) m = Math.min(m, h[b + j]);
      o.seat = m + (o.dy || 0); o.ground = h[b];
    }
    C.job = null; C.alist = null;
    function yOf(o) { return o.y !== undefined ? o.y : o.ref ? o.ref.seat + (o.dy || 0) : o.seat; }
    // the cloud sea's pieces only where its sea is up about them (aboveKeep)
    // (what is kept is the place's, whatever line is flown: no corridor held about a line; the floating pieces raised
    // over the flight band)
    if (C.items.length) C.items = C.items.filter(function (it) { if (it.form) return true; if (!it.lq) return true; return aboveKeep(it); });
    for (i = 0; i < C.items.length; i++) {
      var ia = C.items[i]; if (!ia.air || !ia.spheres) continue;
      var lowS = 1e9; for (j = 0; j < ia.spheres.length; j += 4) lowS = Math.min(lowS, ia.spheres[j + 1] - ia.spheres[j + 3]);
      var btI = bandTopAt(ia.x, ia.z, ia.landMax), dI = btI - (ia.y + lowS);
      if (dI > 0) { ia.y += dI; BAND.isles++; }
    }
    if (C.pois.length) C.pois = C.pois.filter(function (p) { return !(p.ref && p.ref._drop); });
    if (C.flocks.length) C.flocks = C.flocks.filter(function (f) { return !(f.ref && f.ref._drop); });
    if (C.clouds.length) C.clouds = C.clouds.filter(function (cl) { return !cl.lq || aboveKeep(cl); });
    // obstacles: each solid item a cylinder over its seat
    for (i = 0; i < C.items.length; i++) {
      var it = C.items[i]; it.seat = it.air ? it.y : yOf(it);
      if (it.solid) C.obst.push({ c: 1, x: it.x + (it.solid[2] || 0), z: it.z + (it.solid[3] || 0), r: it.solid[0], y0: it.seat - 30, y1: it.seat + it.solid[1] });
      if (it.foot2) C.obst.push({ c: 1, x: it.x, z: it.z, r: it.foot2[0], y0: it.seat - 30, y1: it.seat + it.foot2[1] });   // (a rock's talus foot)
      if (it.spheres) for (j = 0; j < it.spheres.length; j += 4) C.obst.push({ c: 0, x: it.x + it.spheres[j], y: it.seat + it.spheres[j + 1], z: it.z + it.spheres[j + 2], r: it.spheres[j + 3] });
    }
    // clouds: their lobes laid out on their seats, prepared for baking; their cores are obstacles
    if (C.clouds.length) {
      var PF = new Puffs(), bodyCl = [];
      for (i = 0; i < C.clouds.length; i++) { var cl = C.clouds[i], nb0 = PF.bodies.length; cl.base = yOf(cl); V.def.cloud(cl, PF, RNG(cl.seed || (C.key + i * 7919) >>> 0), KITAPI); for (j = nb0; j < PF.bodies.length; j++) bodyCl[j] = cl; }
      // each body kept (not empty), its volume prepared and its cores obstacles; its
      // visible body (its lobes) kept for the slip (a cost) and the mist about the eye (mistK), in the volumes' order
      var soft = [], softB = [];
      for (var bi = 0; bi < PF.bodies.length; bi++) {
        var bj0 = PF.bodies[bi].i0, bj1 = bi + 1 < PF.bodies.length ? PF.bodies[bi + 1].i0 : PF.count();
        if (bj0 >= bj1) continue;
        // the body lifted whole over the flight band (its lowest lobe's billows at the band's
        // top): its shape kept, its base floating over the sea as a cumulus's over a deck; never cut by the line flown
        var clb = bodyCl[bi], lowB = 1e9, cxB = 0, czB = 0;
        for (j = bj0; j < bj1; j++) { lowB = Math.min(lowB, PF.a[j * 12 + 1] - 1.3 * PF.a[j * 12 + 3]); cxB += PF.a[j * 12]; czB += PF.a[j * 12 + 2]; }
        cxB /= (bj1 - bj0); czB /= (bj1 - bj0);
        var btB = bandTopAt(cxB, czB, clb ? (clb.landMax !== undefined ? clb.landMax : clb.ground) : undefined), dB = btB - lowB;
        if (dB > 0) { for (j = bj0; j < bj1; j++) PF.a[j * 12 + 1] += dB; var Bb = PF.bodies[bi]; Bb.y0 += dB; Bb.y1 += dB; Bb.cy += dB; BAND.lifted++; BAND.liftM = Math.max(BAND.liftM, dB); }
        // its base flat at its lowest lobe's centre: seen from under it a cloud floats on its condensation level,
        // never on a hanging fringe of lobes (a range's lobes would hang over the dunes like a bunch)
        var ycB = 1e9; for (j = bj0; j < bj1; j++) ycB = Math.min(ycB, PF.a[j * 12 + 1]); PF.bodies[bi].base = ycB;
        var vb = volPrep(PF, bi, null, PF.bodies[bi].res || V.def.layout.volRes || 48, V); vb.out.kind = PF.bodies[bi].kind || 0; C.vols.push(vb);
        var cores = vb.out.cores;
        for (j = 0; j < cores.length; j += 4) C.obst.push({ c: 0, x: cores[j], y: cores[j + 1], z: cores[j + 2], r: cores[j + 3], cloud: true });
        var s0 = soft.length, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
        for (var q = bj0; q < bj1; q++) { soft.push(PF.a[q * 12], PF.a[q * 12 + 1], PF.a[q * 12 + 2], PF.a[q * 12 + 3]); for (var a3 = 0; a3 < 3; a3++) { lo[a3] = Math.min(lo[a3], PF.a[q * 12 + a3] - PF.a[q * 12 + 3]); hi[a3] = Math.max(hi[a3], PF.a[q * 12 + a3] + PF.a[q * 12 + 3]); } }
        var rb = Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2;
        var sbd = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2, rb, s0, soft.length];
        softB.push(sbd); vb.out.soft = sbd; vb.out.cell = C;
      }
      C.soft = new Float32Array(soft); C.softB = softB;
    }
    // creatures and points of interest at their heights
    for (i = 0; i < C.flocks.length; i++) { var f = C.flocks[i]; f.at = [f.x, yOf(f), f.z]; f.set = flockOf(f); }
    for (i = 0; i < C.pois.length; i++) { var p = C.pois[i]; p.y = yOf(p); p.cell = C; p.id = C.key * 64 + i; }
    // the placements of the realm's sets (their seats, obstacles), the glow sprites and the beams, packed for the GPU
    resolvePlaces(C, yOf); resolveGlows(C); resolveBeams(C);
    // the cell's bound (for the frustum): its items' and clouds' extents
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    function grow(x, y, z, r) { lo[0] = Math.min(lo[0], x - r); lo[1] = Math.min(lo[1], y - r); lo[2] = Math.min(lo[2], z - r); hi[0] = Math.max(hi[0], x + r); hi[1] = Math.max(hi[1], y + r); hi[2] = Math.max(hi[2], z + r); }
    for (i = 0; i < C.items.length; i++) { var q = C.items[i], rr = Math.max(q.foot || 0, q.solid ? q.solid[0] : 0, q.reach || 0, 20); grow(q.x, q.seat + (q.solid ? q.solid[1] * 0.5 : 0), q.z, rr + (q.solid ? q.solid[1] * 0.6 : 30)); }
    for (i = 0; i < C.vols.length; i++) { var o2 = C.vols[i].out; grow(o2.c[0], o2.c[1], o2.c[2], o2.r); }
    for (i = 0; i < C.places.length; i++) { var pl = C.places[i]; grow(pl.x, pl.seat + pl.cy, pl.z, pl.r); }
    if (C.glowB) { var gb = C.glowB.bound; grow(gb[0], gb[1], gb[2], gb[3]); }
    if (C.beamB) { var bb = C.beamB.bound; grow(bb[0], bb[1], bb[2], bb[3]); }
    if (lo[0] < 1e8) { C.bound[0] = (lo[0] + hi[0]) / 2; C.bound[1] = (lo[1] + hi[1]) / 2; C.bound[2] = (lo[2] + hi[2]) / 2; C.bound[3] = Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2; }
    else C.bound[3] = 0;
    C.st = 2;
    C.B = C.items.length ? new Builder(4096) : null; C.bi = 0;
    var sa = V.scanAt || [0, 0]; C.lod = C.sc === 0 && nearDist(C, sa[0], sa[1]) > LOD_FAR ? 1 : 0;
    if (C.B) C.B.lod = C.lod;
    V.poiGen = (V.poiGen || 0) + 1;
  }
