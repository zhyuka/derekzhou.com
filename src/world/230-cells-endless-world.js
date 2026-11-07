  /* ---------------------------------------------------------------- cells: the endless world */
  /* A realm's things are generated per world cell, at one or two scales (a realm's layout.scales: [{ size, radius }]),
     each cell from the visit's salt and its own coordinates (the same cell is the same place whenever it is made). The
     streamer keeps the cells within each scale's radius about the camera (those ahead first), and frees those past
     1.3 radii (a cell is not made and freed again as the camera wanders at its edge). A cell's way to the screen:
       0  laid out: the realm's cell() places its items (landmarks), clouds, flocks and points of interest;
       1  probed: the ground under every item's footprint, read back (a pixel buffer and a fence: a few frames);
       2  resolved: each item seated on the lowest ground of its footprint; the clouds' lobes laid out on their seats;
          the obstacles (items' solids, the clouds' opaque cores) and the points of interest known (the flight and the
          autopilot read them from here on);
       3  meshed and uploaded (the items built a vertex budget a frame, one buffer a cell);
       4  ready: its clouds baked (a few dozen layers a frame), each fading in from the haze as it lands.
     Nothing is built in a frame past its budget, and a frame never waits on the GPU. */
  var VERT_BUDGET = 2500, LAYOUT_BUDGET = 2, RESOLVE_BUDGET = 2, CELLS_MAX = 220, VOL_BYTES_MAX = 24e6;
  /* detail: a big cell whose nearest point is farther than LOD_FAR when its landmarks are built gets the coarse build
     (lathes and grids at about half their segments, the same forms); within LOD_NEAR it is built again in full (the
     coarse mesh drawn until the full one is up) */
  var LOD_FAR = 1800, LOD_NEAR = 1500;
  function nearDist(C, x, z) { var dx = Math.max(Math.abs(x - C.cx) - C.size / 2, 0), dz = Math.max(Math.abs(z - C.cz) - C.size / 2, 0); return Math.sqrt(dx * dx + dz * dz); }
  function cellKey(sc, ix, iz) { return (sc * 65536 + (ix + 32768)) * 65536 + (iz + 32768); }
  function Cell(V, sc, ix, iz) {
    var L = V.def.layout.scales[sc];
    this.V = V; this.sc = sc; this.ix = ix; this.iz = iz; this.size = L.size; this.x0 = ix * L.size; this.z0 = iz * L.size;
    this.cx = this.x0 + L.size / 2; this.cz = this.z0 + L.size / 2; this.key = cellKey(sc, ix, iz);
    this.st = 0; this.items = []; this.clouds = []; this.flocks = []; this.pois = []; this.obst = []; this.vols = []; this.mesh = null; this.occ = null;
    this.places = []; this.glowG = []; this.beamL = []; this.inst = null; this.glowB = null; this.beamB = null;
    this.bound = new Float32Array([this.cx, 0, this.cz, L.size]); this.soft = null; this.softB = null; this.born = -1; this.prio = 0; this.job = null; this.bi = 0; this.B = null; this.gone = false;
    this.lod = 0; this.RB = null; this.rbi = 0; this.gen = null; this.rgen = null;
  }
  /* the cell handed to the realm's cell(): where it is, its stream, and the means to place things */
  function cellApi(C) {
    var V = C.V;
    return {
      V: V, scale: C.sc, ix: C.ix, iz: C.iz, x0: C.x0, z0: C.z0, size: C.size, salt: V.salt, hash: cellHash(C.ix, C.iz, (V.salt ^ (C.sc * 0x9e3779b9)) >>> 0),
      field: V.field, sun: V.light.sunDir,
      inside: function (x, z) { return x >= C.x0 && x < C.x0 + C.size && z >= C.z0 && z < C.z0 + C.size; },
      // a landmark: { kind, x, z, yaw (deg), foot (m: the footprint seated on its lowest ground), dy (m), air (y given),
      //   y, solid: [radius, height] (an obstacle: a cylinder over its seat), seed, ...the realm's own fields }
      add: function (it) { C.items.push(it); return it; },
      // a cloud: { kind, x, z, foot (to seat its base on the ground) or y (its base), ...the realm's fields }
      cloud: function (cl) { C.clouds.push(cl); return cl; },
      // creatures: { kind: 'bird' | 'ray', n, x, z, y or dy over the ground (or ref: an item, over its seat), orbit,
      //   wheel, size, flap, spread, drift [x, z], lit, shade }
      flock: function (f) { C.flocks.push(f); if ((FKIND[f.kind] || 1) !== 1 || WORLD_FLYERS) LATEK.creature = 1; return f; },   // (a flock the creatures' draw takes: drawCreatures passes over the birds (kind 1) while WORLD_FLYERS is off)
      // a point of interest (the ink birds' places, HOST.pois): { x, z, y or dy (or ref), kind, pass (m beside it) }; nothing
      //   reads a point's interest, via, alt or approach
      poi: function (p) { C.pois.push(p); return p; },
      // an instance of one of the realm's sets (def.sets[set]: one mesh built once a visit), as many as the cell likes:
      //   { yaw (deg), scale (number or [x, y, z]), tilt: [about x, about z] (deg), dy (m), foot (m: seated on the
      //   lowest ground of a ring this wide; 0: the ground at its centre), air: true and y (in the air), ref (an item or a
      //   placement: over its seat), tint: [r, g, b], glow (its emission x this, default 1), bob: [m, period s], spin
      //   (deg/s), phase (0-1), solid: [radius, height, dx, dz] (an obstacle over its seat), sphere: [dy, radius] }
      place: function (set, x, z, o) { var q = o || {}; q.set = set; q.x = x; q.z = z; C.places.push(q); return q; },
      // glow sprites, a group of n: { n, pos: [x, y, z, ...] (y over the ground under each when ground is set, over the
      //   seat of ref when it is given, else the world's), size (m; a number or an array of n), color ([r, g, b] linear,
      //   HDR, or an array of 3n), px (the least size, px; 1.5), twinkle, pulse (0-1), rate (Hz), phase (array of n; else
      //   from the hash), drift (m; < 0: a fall down through that many m at rate m/s, again and again: a fall of light, a
      //   drip), bob (m), blink (the share of a cycle lit), far (m) }
      glows: function (g) { g.n = g.n || (g.pos ? g.pos.length / 3 : 0); if (g.n > 0) { C.glowG.push(g); LATEK.glow = 1; } return g; },
      glow: function (o) { var g = { n: 1, pos: [o.x, o.y !== undefined ? o.y : (o.dy || 0), o.z], ground: o.y === undefined && !o.ref, ref: o.ref }; for (var k in o) if (!(k in g) && k !== 'x' && k !== 'y' && k !== 'z' && k !== 'dy') g[k] = o[k]; C.glowG.push(g); LATEK.glow = 1; return g; },
      // a beam: { from: [x, y, z], to: [x, y, z] (the world's; or over the seat of ref, offsets from its place; or y over
      //   the ground at from's place when ground is set), r: radius (m) or [at from, at to], color [r, g, b] (linear,
      //   HDR), core (0-1), dust, shimmer (0-1), fade: [the share faded at its far end, at its start], wake: [radius m,
      //   delay s, draw-on s] (lit when the camera first comes within radius of from: drawn on from it) }
      beam: function (b) { C.beamL.push(b); LATEK.beam = 1; return b; }
    };
  }
  /* the ground points to probe: each item's (and cloud's, flock's, poi's, placement's with a foot) centre and a ring at
     its footprint (9 points), a placement's or a beam's centre alone (1), each grounded glow sprite (1) */
  function anchorsOf(C) {
    var list = [], n = 0, i;
    function want(o, k) {
      if (o.landQ) { o.ai = n; o.an = 9; o.lq = true; list.push(o); n += 9; return; }   // (the land under a cloud-sea piece's footprint, for aboveKeep)
      if (o.air || o.y !== undefined || o.ref) return; o.ai = n; o.an = k; list.push(o); n += k;
    }
    for (i = 0; i < C.items.length; i++) want(C.items[i], 9);
    for (i = 0; i < C.clouds.length; i++) want(C.clouds[i], 9);
    for (i = 0; i < C.flocks.length; i++) want(C.flocks[i], 9);
    for (i = 0; i < C.pois.length; i++) want(C.pois[i], 9);
    for (i = 0; i < C.places.length; i++) want(C.places[i], C.places[i].foot > 0 ? 9 : 1);
    for (i = 0; i < C.glowG.length; i++) { var g = C.glowG[i]; if (g.ground && !g.ref) { g.ai = n; g.an = g.n; g.isG = true; list.push(g); n += g.n; } }
    for (i = 0; i < C.beamL.length; i++) { var bm = C.beamL[i]; if (bm.ground && !bm.ref) { bm.ai = n; bm.an = 1; bm.x = bm.from[0]; bm.z = bm.from[2]; list.push(bm); n += 1; } }
    var pts = new Float32Array(n * 2), q = 0;
    for (i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.isG) { for (var k = 0; k < o.n; k++) { pts[q++] = o.pos[k * 3]; pts[q++] = o.pos[k * 3 + 2]; } continue; }
      var r = o.lq ? o.landQ : (o.foot || 0); pts[q++] = o.x; pts[q++] = o.z;
      if (o.an === 9) for (var j = 0; j < 8; j++) { var a = j / 8 * 2 * PI; pts[q++] = o.x + Math.cos(a) * r; pts[q++] = o.z + Math.sin(a) * r; }
    }
    C.alist = list;
    return pts;
  }
  function cellLayout(C, sync) {
    var V = C.V, api = cellApi(C);
    V.def.cell(api, RNG(api.hash), KITAPI);
    var pts = anchorsOf(C);
    C.job = pts.length ? probeJob(V, pts, pts.length / 2, 0, sync) : { done: true, h: new Float32Array(0) };
    C.st = 1;
  }
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
        var vb = volPrep(PF, bi, null, PF.bodies[bi].res || V.def.layout.volRes || 48); vb.out.kind = PF.bodies[bi].kind || 0; C.vols.push(vb);
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
  /* the landmarks built into a builder until the vertex budget is spent (an item whose build is a generator, a great
     temple, is built a part at a time, across frames); returns the vertices made. full: the rebuild in full detail
     of a coarse cell come near (its own builder, index and generator) */
  function buildItems(C, full, budget) {
    var V = C.V, B = full ? C.RB : C.B, k = full ? C.rbi : C.bi, gen = full ? C.rgen : C.gen, made = 0;
    while (B && k < C.items.length && made < budget) {
      var it = C.items[k], n0 = B.n, done = true;
      if (!gen) {
        B.place(it.x, it.seat, it.z, it.yaw || 0, !!it.air);
        var g = V.def.build(it, B, RNG(it.seed || ((C.key + k * 104729) >>> 0)), KITAPI);
        if (DEVMODE) it.nv = 0;
        if (g && typeof g.next === 'function') gen = g;
      }
      var parts = 0;
      if (gen) { done = false; while (made + B.n - n0 < budget) { parts++; if (gen.next().done) { done = true; gen = null; break; } } }
      made += B.n - n0; if (DEVMODE) { it.nv += B.n - n0; if (B.n - n0 > 2000) WORK.big = (WORK.big || '') + it.kind + (full ? '*' : '') + ':' + (B.n - n0) + '/' + parts + '/' + budget + ' '; }
      if (done) k++;
    }
    if (full) { C.rbi = k; C.rgen = gen; } else { C.bi = k; C.gen = gen; }
    return made;
  }
  function cellMesh(C, budget) { return buildItems(C, false, budget); }
  function cellUpload(C) {
    if (C.B && C.B.n) {
      C.mesh = uploadMesh(C.B, null);
      if (DEVMODE && DEVKEEP) C.pts = C.B.F.slice(0, C.B.n * 6);   // (dev: the vertices kept, for the clearance check)
    }
    C.B = null;
    // the opaque cores of its clouds: what stands behind them is never marched
    var occ = [];
    for (var i = 0; i < C.vols.length; i++) { var o = C.vols[i].out; if (!o.kind) for (var j = 0; j < o.cores.length; j++) occ.push(o.cores[j]); }
    if (occ.length) {
      C.occ = { vao: pTake('occ'), b: pTake('buf'), n: occ.length / 4 };
      gl.bindVertexArray(C.occ.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, C.occ.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(occ), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
      gl.bindVertexArray(null);
    }
    uploadInst(C);
    C.st = 3; C.vi = 0;
    C.mborn = lateBorn(C.V, cellDistFade(C));
  }
  function cellBake(C, budget) {   // bakes its clouds; returns the layer draws made
    var made = 0;
    while (C.vi < C.vols.length && made < budget) {
      var vb = C.vols[C.vi];
      if (!vb.done) { made += volBake(vb, C.V, budget - made); if (!vb.done) break; var vf = volDistFade(vb.out); vb.out.born = lateBorn(C.V, vf); if (vb.out.born > -1e8) LATE.vols++; }
      C.vi++;
    }
    if (C.vi >= C.vols.length) { C.st = 4; C.born = lateBorn(C.V, cellDistFade(C)); }
    return made;
  }
  function freeCell(C) {
    if (!C || C.gone) return;
    C.gone = true;
    if (!LOST) {   // (queued, deleted among the next frame's GPU jobs: freeDrain)
      if (C.mesh && C.mesh.vao) { glFree('VertexArray', C.mesh.vao); glFree('Buffer', C.mesh.vb); }
      if (C.occ) { glFree('VertexArray', C.occ.vao); glFree('Buffer', C.occ.b); }
      for (var i = 0; i < C.vols.length; i++) glFree('Texture', C.vols[i].out.t);
      if (C.inst) C.inst.forEach(function (q) { if (q.buf) glFree('Buffer', q.buf); if (q.vaoF) glFree('VertexArray', q.vaoF); if (q.vaoC) glFree('VertexArray', q.vaoC); });
      if (C.glowB && C.glowB.buf) { glFree('Buffer', C.glowB.buf); glFree('VertexArray', C.glowB.vao); }
      if (C.beamB && C.beamB.buf) { glFree('Buffer', C.beamB.buf); glFree('VertexArray', C.beamB.vao); }
    }
    if (C.job) C.job.cancel = true;
    C.mesh = null; C.occ = null; C.vols = []; C.items = []; C.clouds = []; C.flocks = []; C.pois = []; C.obst = []; C.B = null; C.RB = null; C.gen = null; C.rgen = null; C.pts = null; C.soft = null; C.softB = null;
    C.places = []; C.glowG = []; C.beamL = []; C.inst = null; C.glowB = null; C.beamB = null;
    if (C.V) C.V.poiGen = (C.V.poiGen || 0) + 1;
  }
  var DEVKEEP = false;

