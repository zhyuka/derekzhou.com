  /* the streamer: which cells a visit wants about a point (heading hx, hz), made in order of need, freed far behind */
  var SCAN = new Float64Array(4);
  function streamCells(V, cx, cz, hx, hz, sync, focusOnly) {
    if (!V.cells) { V.cells = new Map(); V.cellList = []; V.scanAt = [1e9, 1e9]; }
    var sc, L, scales = V.def.layout.scales, i;
    // the wanted set, scanned again when the point has moved 24 m (or at once when asked)
    var dx = cx - V.scanAt[0], dz = cz - V.scanAt[1];
    if (sync || dx * dx + dz * dz > 576) {
      V.scanAt[0] = cx; V.scanAt[1] = cz;
      for (sc = 0; sc < scales.length; sc++) {
        L = scales[sc]; var R = L.radius, n = Math.ceil(R / L.size) + 1, bx = Math.floor(cx / L.size), bz = Math.floor(cz / L.size);
        for (var jz = -n; jz <= n; jz++) for (var jx = -n; jx <= n; jx++) {
          var ix = bx + jx, iz = bz + jz, ccx = (ix + 0.5) * L.size - cx, ccz = (iz + 0.5) * L.size - cz, d = Math.sqrt(ccx * ccx + ccz * ccz);
          if (d > R + L.size * 0.5) continue;
          var key = cellKey(sc, ix, iz);
          if (!V.cells.has(key)) { var C = new Cell(V, sc, ix, iz); V.cells.set(key, C); V.cellList.push(C); }
        }
      }
      // coarse cells come near: built again in full (one still building starts over at full detail)
      for (i = 0; i < V.cellList.length; i++) {
        var Cl = V.cellList[i];
        if (Cl.lod !== 1 || nearDist(Cl, cx, cz) > LOD_NEAR) continue;
        if (Cl.st === 2) { Cl.lod = 0; if (Cl.B) { Cl.B = new Builder(4096); Cl.bi = 0; Cl.gen = null; } }
        else if (Cl.st >= 3 && !Cl.RB) { Cl.RB = new Builder(4096); Cl.rbi = 0; }
      }
      // free the cells far behind (past 1.3 radii)
      for (i = V.cellList.length - 1; i >= 0; i--) {
        var Cf = V.cellList[i], Lf = scales[Cf.sc], fx = Cf.cx - cx, fz = Cf.cz - cz;
        if (Math.sqrt(fx * fx + fz * fz) > Lf.radius * 1.3 + Lf.size * 0.5) {
          if (WLOG && Cf.mesh && V === SIM.V) wl('free', V.k + ':' + Cf.key, Cf.lastW || 0, nearDist(Cf, CAM.pos[0], CAM.pos[2]), Cf.lastVis);   // (dev: a drawn cell dropped)
          freeCell(Cf); V.cells.delete(Cf.key); V.cellList.splice(i, 1);
        }
      }
    }
    // priorities: nearer first, ahead before behind
    var list = V.cellList, hl = Math.sqrt(hx * hx + hz * hz) || 1;
    for (i = 0; i < list.length; i++) {
      var Cp = list[i], px = Cp.cx - cx, pz = Cp.cz - cz, pd = Math.sqrt(px * px + pz * pz) || 1, ahead = (px * hx + pz * hz) / (pd * hl);
      Cp.prio = pd * (1 - 0.35 * ahead) / scales[Cp.sc].radius;
      if (BOOTVF && !bootNeed(V, Cp, cx, cz, BOOT_M)) Cp.prio += 20;   // (the boot's order: what can be seen first, in the flight's own order; the cells out in the haze after)
    }
    return list;
  }
  /* one step of the cells' work for a visit, within the frame's budgets (sync: everything for the cells within
     `near` of the point, at once) */
  var WORK = { verts: 0, layers: 0, layouts: 0, uploads: 0, resolves: 0 };
  var PEND = [];
  function byPrio(a, b) { return a.prio - b.prio; }
  function bornNow(V) { return (V === SIM.V && shown) ? SIM.t : -1e9; }   // (a cell ready before its visit is seen is simply there)
  /* every arrival a function of distance alone: a cell's (or a cloud body's) opacity is 1 - smooth(FD_FULL, FD_ZERO,
     its nearest distance from the eye), FD_ZERO inside the radius it is made in (its scale's radius less a reach the
     streamer is ahead by: 0.1 R + 100 m) and the fade 0.12 R wide (at 12 m/s, 26-52 s for the great cells: it comes
     out of the haze), so nothing appears on a clock. A cell or body ready only once it should already show (late) is
     drawn at once, never eased in on a clock, and counted (LATE: a gate failure, as it pops) */
  var LATE = { n: 0, vols: 0, worst: 0 };
  function fadeZ(V, sc) { var R = V.def.layout.scales[sc].radius; return R - (0.1 * R + 100); }
  function distFadeAt(V, sc, d) { var R = V.def.layout.scales[sc].radius, z = fadeZ(V, sc); return 1 - smooth(z - 0.12 * R, z, d); }
  function cellDistFade(C) { return distFadeAt(C.V, C.sc, nearDist(C, CAM.pos[0], CAM.pos[2])); }
  function volDistFade(o) { var C = o.cell; if (!C) return 1; var dx = o.c[0] - CAM.pos[0], dz = o.c[2] - CAM.pos[2]; return distFadeAt(C.V, C.sc, Math.max(Math.sqrt(dx * dx + dz * dz) - o.r, 0)); }
  function lateBorn(V, f) { var b = bornNow(V); if (b < -1e8 || f <= 0.001) return -1e9; LATE.n++; if (f > LATE.worst) LATE.worst = f; return b; }   // (ready while it should already show: counted, born its time, for the record; drawn at once)
  /* kind 'cpu' (the slice after the frame's flush): layouts, resolves and builds, no GL call;
     kind 'gpu' (the jobs at the start of the next drawn frame): uploads and bakes; sync or no kind: everything */
  function cellWork(V, sync, nearOnly, upTo, kind) {
    var list = V.cellList; if (!list) return true;
    upTo = upTo || 4;
    var cpu = sync || kind !== 'gpu', gpuW = sync || kind !== 'cpu';
    var i, done = true, pend = PEND; pend.length = 0;
    for (i = 0; i < list.length; i++) if (list[i].st < 4) pend.push(list[i]);
    pend.sort(byPrio);
    for (i = 0; i < pend.length; i++) {
      var C = pend[i];
      if (nearOnly && C.prio > nearOnly) continue;
      if (C.st === 0) { if (!cpu || (!sync && WORK.layouts >= BUD.layouts)) { done = false; continue; } prof('c.gap'); cellLayout(C, sync); WORK.layouts++; prof('c.layout'); }
      if (C.st === 1) { if (!cpu || !C.job.done || (!sync && WORK.resolves >= BUD.resolves)) { done = false; continue; } prof('c.gap'); cellResolve(C); WORK.resolves++; prof('c.resolve'); }
      if (upTo <= 2) continue;
      if (C.st === 2) {
        if (C.B && C.bi < C.items.length) { if (!cpu) { done = false; continue; } prof('c.gap'); var m = cellMesh(C, sync ? 1e9 : Math.max(BUD.verts - WORK.verts, 0)); WORK.verts += m; prof('c.mesh'); if (C.bi < C.items.length) { done = false; continue; } }
        if (!gpuW || (!sync && WORK.uploads >= BUD.uploads)) { done = false; continue; }
        prof('c.gap'); cellUpload(C); WORK.uploads++; prof('c.upload');
      }
      if (C.st === 3) { if (!gpuW) { done = false; continue; } prof('c.gap'); var bl = sync ? 1e9 : Math.max(BAKE.left, 0), l = cellBake(C, bl); WORK.layers += l; if (!sync) BAKE.left -= l; prof('c.bake'); if (C.st < 4) { done = false; continue; } }
    }
    // the coarse cells come near, built again in full (their coarse meshes drawn meanwhile): built in the CPU's slice,
    // the swap (an upload) among the GPU's jobs
    if (upTo > 2) for (i = 0; i < list.length; i++) {
      var Cr = list[i]; if (!Cr.RB || Cr.st < 3) continue;
      if (Cr.rbi < Cr.items.length) { if (cpu) WORK.verts += buildItems(Cr, true, sync ? 1e9 : Math.max(BUD.verts - WORK.verts, 0)); }
      if (Cr.rbi < Cr.items.length || !gpuW || (!sync && WORK.uploads >= BUD.uploads)) { done = false; continue; }
      var old = Cr.mesh; Cr.mesh = uploadMesh(Cr.RB, null); WORK.uploads++;
      if (WLOG) wl('swap', V.k + ':' + Cr.key, 1, nearDist(Cr, CAM.pos[0], CAM.pos[2]), Cr.lastVis);   // (dev: the coarse mesh replaced in one frame)
      if (old && old.vao) { glFree('VertexArray', old.vao); glFree('Buffer', old.vb); }
      if (DEVMODE && DEVKEEP) Cr.pts = Cr.RB.F.slice(0, Cr.RB.n * 6);
      Cr.RB = null; Cr.lod = 0;
    }
    return done;
  }
  /* the frame's budgets for the cells (the *_BUDGET counts; the boot's larger while the still sky shows) and the one
     bake budget every bake shares (the cells' clouds) */
  var BUD = { layouts: LAYOUT_BUDGET, resolves: RESOLVE_BUDGET, verts: VERT_BUDGET, uploads: 1, bake: 24 };
  var BAKE = { left: 0 };
  /* GL objects let go by the CPU's slice (a cell freed far behind) are deleted among the next frame's GPU jobs */
  var FREEQ = [];
  function glFree(kind, o) { if (o && !LOST) FREEQ.push(kind, o); }
  /* nothing new in flight: the GL objects of cells and visits are kept for the next instead of deleted, and made
     ahead at stage B: a free list per kind (buffers; vertex arrays by their layout, so a draw's vertex layout and
     pipeline key never change with reuse; the clouds' 3D textures), each object given back by freeDrain with its
     storage shrunk to nothing and taken again by the next upload or bake, which re-specifies it (bufferData,
     texImage3D). An object is made in flight only when its list has run dry (the record counts them by kind:
     rec.pools.madeShown; without the lists, 600 s runs make 709-816 buffers and VAOs and 84-201 3D textures after the
     world shows). There are no size classes or sub-allocation: a reused object's storage is re-specified at its new
     size. POOL_PRE: made at stage B, from the peaks of 600 s presented runs with streaming, both engines, with room
     to spare (rec.pools.peakLive); POOL_CAP: never more kept than this a kind */
  var POOL_KINDS = ['buf', 'tex3', 'mesh', 'inst', 'occ', 'glow', 'beam'];
  var POOL_PRE = { buf: 192, tex3: 192, mesh: 128, inst: 64, occ: 96, glow: 16, beam: 16 }, POOL_CAP = 512;
  var POOL = { lists: {}, made: {}, madeShown: {}, reused: {}, live: {}, peakLive: {}, deleted: {} };
  function poolReset() { POOL_KINDS.forEach(function (k) { POOL.lists[k] = []; POOL.made[k] = 0; POOL.madeShown[k] = 0; POOL.reused[k] = 0; POOL.live[k] = 0; POOL.peakLive[k] = 0; POOL.deleted[k] = 0; }); }
  poolReset();
  function poolMake(k) { var o = k === 'buf' ? gl.createBuffer() : k === 'tex3' ? gl.createTexture() : gl.createVertexArray(); o.__pk = k; POOL.made[k]++; return o; }
  function poolPre() { POOL_KINDS.forEach(function (k) { var L = POOL.lists[k]; while (L.length < POOL_PRE[k]) { var o = poolMake(k); POOL.made[k]--; L.push(o); } }); }   // (stage B: not counted as made)
  function pTake(k) {
    var L = POOL.lists[k], o = L.pop();
    if (o) POOL.reused[k]++; else { o = poolMake(k); if (shown) POOL.madeShown[k]++; }
    if (++POOL.live[k] > POOL.peakLive[k]) POOL.peakLive[k] = POOL.live[k];
    return o;
  }
  function pGive(o) {   // true: kept (its storage let go); false: not a pooled object
    var k = o.__pk; if (!k) return false;
    POOL.live[k]--;
    var L = POOL.lists[k]; if (L.length >= POOL_CAP) { POOL.deleted[k]++; return false; }
    if (k === 'buf') { gl.bindBuffer(gl.ARRAY_BUFFER, o); gl.bufferData(gl.ARRAY_BUFFER, 16, gl.STATIC_DRAW); }
    else if (k === 'tex3') { gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_3D, o); gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, 1, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, null); gl.bindTexture(gl.TEXTURE_3D, null); gl.activeTexture(gl.TEXTURE0); }
    L.push(o); return true;
  }
  function freeDrain() {
    if (LOST) { FREEQ.length = 0; return; }
    var any = false;
    for (var i = 0; i < FREEQ.length; i += 2) {
      var k = FREEQ[i], o = FREEQ[i + 1]; any = true;
      if (pGive(o)) continue;
      if (k === 'Buffer') gl.deleteBuffer(o); else if (k === 'VertexArray') gl.deleteVertexArray(o); else if (k === 'Texture') gl.deleteTexture(o);
    }
    if (any) gl.bindBuffer(gl.ARRAY_BUFFER, null);
    FREEQ.length = 0;
  }
