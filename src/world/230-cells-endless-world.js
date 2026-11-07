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

  /* the placements of a cell: seated, their obstacles, packed per set (20 floats an instance: place and turn; scale and
     phase; tint and emission; tilt and bob; spin) */
  function resolvePlaces(C, yOf) {
    if (!C.places.length) return;
    var sets = C.V.G && C.V.G.sets || {}, by = {}, i;
    for (i = 0; i < C.places.length; i++) {
      var q = C.places[i], S = sets[q.set];
      if (!S) { if (DEVMODE) fail('no set ' + q.set); continue; }
      q.seat = q.air ? q.y : (q.ref ? q.ref.seat + (q.dy || 0) : q.seat);
      var sc = q.scale === undefined ? [1, 1, 1] : (typeof q.scale === 'number' ? [q.scale, q.scale, q.scale] : q.scale);
      q.sc = sc; q.r = S.r * Math.max(sc[0], sc[1], sc[2]) + (q.bob ? q.bob[0] : 0); q.cy = S.cy * sc[1];
      if (q.solid) C.obst.push({ c: 1, x: q.x + (q.solid[2] || 0), z: q.z + (q.solid[3] || 0), r: q.solid[0], y0: q.seat - 30, y1: q.seat + q.solid[1] });
      if (q.sphere) C.obst.push({ c: 0, x: q.x, y: q.seat + q.sphere[0], z: q.z, r: q.sphere[1] });
      (by[q.set] = by[q.set] || []).push(q);
    }
    C.inst = [];
    for (var name in by) {
      var L = by[name], d = new Float32Array(L.length * 20);
      for (i = 0; i < L.length; i++) {
        var p = L[i], o = i * 20, t = p.tint || [1, 1, 1], tl = p.tilt || [0, 0], bob = p.bob || [0, 1];
        d[o] = p.x; d[o + 1] = p.seat; d[o + 2] = p.z; d[o + 3] = (p.yaw || 0) * DEG;
        d[o + 4] = p.sc[0]; d[o + 5] = p.sc[1]; d[o + 6] = p.sc[2]; d[o + 7] = p.phase !== undefined ? p.phase : hfl(ihash((C.key * 977 + i * 131 + 7) >>> 0));
        d[o + 8] = t[0]; d[o + 9] = t[1]; d[o + 10] = t[2]; d[o + 11] = p.glow === undefined ? 1 : p.glow;
        d[o + 12] = tl[0] * DEG; d[o + 13] = tl[1] * DEG; d[o + 14] = bob[0]; d[o + 15] = 2 * PI / Math.max(bob[1], 0.1);
        d[o + 16] = (p.spin || 0) * DEG;
      }
      C.inst.push({ set: name, n: L.length, data: d, buf: null, vaoF: null, vaoC: null });
    }
  }
  /* a cell's glow sprites, packed (16 floats a sprite: place and size; colour and least size; twinkle, pulse, rate,
     phase; drift, bob, blink, far) with their bound */
  function resolveGlows(C) {
    if (!C.glowG.length) return;
    var n = 0, i, k; for (i = 0; i < C.glowG.length; i++) n += C.glowG[i].n;
    var d = new Float32Array(n * 16), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], o = 0;
    for (i = 0; i < C.glowG.length; i++) {
      var g = C.glowG[i], base = g.ref ? g.ref.seat : 0, col = g.color || [1, 1, 1], per = col.length === g.n * 3;
      for (k = 0; k < g.n; k++, o += 16) {
        var x = g.pos[k * 3], y = g.pos[k * 3 + 1] + (g.gh ? g.gh[k] : base), z = g.pos[k * 3 + 2];
        var sz = typeof g.size === 'number' ? g.size : (g.size ? g.size[k] : 0.3);
        d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = sz;
        d[o + 4] = per ? col[k * 3] : col[0]; d[o + 5] = per ? col[k * 3 + 1] : col[1]; d[o + 6] = per ? col[k * 3 + 2] : col[2]; d[o + 7] = g.px || 1.5;
        d[o + 8] = g.twinkle || 0; d[o + 9] = g.pulse || 0; d[o + 10] = g.rate || 0.5;
        d[o + 11] = g.phase ? g.phase[k] : hfl(ihash((C.key * 7919 + o * 31 + 3) >>> 0));
        d[o + 12] = g.drift || 0; d[o + 13] = g.bob || 0; d[o + 14] = g.blink || 0; d[o + 15] = g.far || 0;
        var m = Math.abs(g.drift || 0) + (g.bob || 0) + sz, yl = g.drift < 0 ? y + g.drift : y;
        if (x - m < lo[0]) lo[0] = x - m; if (yl - m < lo[1]) lo[1] = yl - m; if (z - m < lo[2]) lo[2] = z - m;
        if (x + m > hi[0]) hi[0] = x + m; if (y + m > hi[1]) hi[1] = y + m; if (z + m > hi[2]) hi[2] = z + m;
      }
    }
    var c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    C.glowB = { n: n, data: d, buf: null, vao: null, bound: new Float32Array([c[0], c[1], c[2], Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2]) };
  }
  /* a cell's beams, packed (20 floats a beam: from and its radius; to and its radius; colour and core; dust, shimmer,
     woken at, draw-on; the fades) with their bound and their wakes */
  function resolveBeams(C) {
    if (!C.beamL.length) return;
    var n = C.beamL.length, d = new Float32Array(n * 20), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], wakes = [];
    for (var i = 0; i < n; i++) {
      var b = C.beamL[i], o = i * 20, A = b.from.slice(), Bp = b.to.slice();
      if (b.ref) { A[0] += b.ref.x; A[1] += b.ref.seat; A[2] += b.ref.z; Bp[0] += b.ref.x; Bp[1] += b.ref.seat; Bp[2] += b.ref.z; }
      else if (b.ground) { A[1] += b.seat; Bp[1] += b.seat; }
      var r = b.r === undefined ? 1 : b.r, rA = typeof r === 'number' ? r : r[0], rB = typeof r === 'number' ? r : r[1], col = b.color || [1, 1, 1], fd = b.fade || [0.3, 0.02];
      d[o] = A[0]; d[o + 1] = A[1]; d[o + 2] = A[2]; d[o + 3] = rA; d[o + 4] = Bp[0]; d[o + 5] = Bp[1]; d[o + 6] = Bp[2]; d[o + 7] = rB;
      d[o + 8] = col[0]; d[o + 9] = col[1]; d[o + 10] = col[2]; d[o + 11] = b.core === undefined ? 0.6 : b.core;
      d[o + 12] = b.dust || 0; d[o + 13] = b.shimmer || 0; d[o + 14] = b.wake ? 1e9 : -1e9; d[o + 15] = b.wake ? b.wake[2] || 2 : 1;
      d[o + 16] = fd[0]; d[o + 17] = fd[1];
      if (b.wake) wakes.push([i, A[0], A[1], A[2], b.wake[0], b.wake[1] || 0]);
      var R = Math.max(rA, rB) * 2.2;
      for (var a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], A[a] - R, Bp[a] - R); hi[a] = Math.max(hi[a], A[a] + R, Bp[a] + R); }
    }
    var c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    C.beamB = { n: n, data: d, buf: null, vao: null, wakes: wakes, dirty: false, bound: new Float32Array([c[0], c[1], c[2], Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2]) };
  }
  /* a beam wakes when the camera first comes within its reach of its start: drawn on from then (the shaders' clock:
     the visit's time + 40, as uT) */
  function beamWake(V, u) {
    var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i], B = C.beamB; if (C.st < 2 || !B || !B.wakes.length) continue;
      var dx = B.bound[0] - CS.x, dz = B.bound[2] - CS.z, R = B.bound[3] + 400;
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = B.wakes.length - 1; k >= 0; k--) {
        var w = B.wakes[k], ex = w[1] - CS.x, ey = w[2] - CS.y, ez = w[3] - CS.z;
        if (ex * ex + ey * ey + ez * ez > w[4] * w[4]) continue;
        B.data[w[0] * 20 + 14] = u + 40 + w[5]; B.dirty = true; B.wakes.splice(k, 1);
      }
    }
  }
  /* the cell's GPU side of its sets, glows and beams */
  var QUAD = null;
  function uploadInst(C) {
    var sets = C.V.G && C.V.G.sets || {};
    if (C.inst) C.inst.forEach(function (q) {
      var S = sets[q.set]; if (!S || !S.full.vb) return;
      q.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, q.buf); gl.bufferData(gl.ARRAY_BUFFER, q.data, gl.STATIC_DRAW);
      q.vaoF = pTake('inst'); gl.bindVertexArray(q.vaoF); meshAttribs(S.full); instAttribs(q.buf, 5, 5, 0);
      if (S.coarse && S.coarse.vb) { q.vaoC = pTake('inst'); gl.bindVertexArray(q.vaoC); meshAttribs(S.coarse); instAttribs(q.buf, 5, 5, 0); }
      gl.bindVertexArray(null);
      q.S = S; if (!DEVMODE) q.data = null;
    });
    if (C.glowB) {
      if (!QUAD) { QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); }
      var G = C.glowB; G.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, G.buf); gl.bufferData(gl.ARRAY_BUFFER, G.data, gl.STATIC_DRAW);
      G.vao = pTake('glow'); gl.bindVertexArray(G.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      instAttribs(G.buf, 1, 4, 0); gl.bindVertexArray(null);
      if (!DEVMODE) G.data = null;
    }
    if (C.beamB) {
      var Bm = C.beamB; Bm.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, Bm.buf); gl.bufferData(gl.ARRAY_BUFFER, Bm.data, gl.DYNAMIC_DRAW);
      Bm.vao = pTake('beam'); gl.bindVertexArray(Bm.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      instAttribs(Bm.buf, 1, 5, 0); gl.bindVertexArray(null);
      Bm.dirty = false;
    }
  }

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
  /* the flight's fixed pre-roll: the flight's first step (the boot's PREROLL steps behind the still) is
     taken only once what it reads is in: the landing's ground grid (groundCache(V, 0, 0), both halves landed) and
     the obstacles (C.st 2) of every cell within the flight's reach of the landing (the envelope's solids, SOL_R;
     the slip's look ahead and its climbs, nearObstaclesAt(.., max(SLIP_T x speed, SLIP_REACH) + 320); each cell's
     own size; and FLIGHT_REACH_T s of flight more). Then its every step is the same whatever the boot's length or
     shape: a boot that ended before them would change the spring's history for good */
  var PREROLL = 1, FLIGHT_REACH_T = 30;
  function flightIn(V) {
    var g0 = -GCN / 2 * GCCELL;   // (the boot's own grid about the landing: x0 = z0 = floor(0 / 16) x 16 - 320)
    if (!GROUND.ok || GROUND.V !== V || GROUND.x0 !== g0 || GROUND.z0 !== g0) return false;
    var L = V.cellList; if (!L) return false;
    var R = Math.max(SOL_R, Math.max(V.speed * SLIP_T, SLIP_REACH) + 320) + V.speed * FLIGHT_REACH_T;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st >= 2) continue; var r = R + C.bound[3]; if (C.bound[0] * C.bound[0] + C.bound[2] * C.bound[2] <= r * r) return false; }
    return true;
  }
  /* the boot's helpers. visitRun: the visit's stages of one kind, as many as are ready, in one call.
     probeSync: the boot's waiting probes drawn and read at once (the canvas is hidden; the read waits on the GPU, never
     on a frame): every job not yet begun, batched by visit and mode, PROBE_CAP points a batch, as probeRun draws them
     for the stills; the heights are the bytes the ring would bring two frames later. bootSig: what a round moved */
  function visitRun(V, kind) {
    var s0 = -1;
    while (V.st < VSTAGES.length && V.st !== s0 && VKIND[V.st] === kind) { s0 = V.st; visitStep(V, false, kind); }
  }
  function probeSync() {
    for (var g = 0; g < 64; g++) {
      var V = null, mode = 0, jobs = [], n = 0, i, J;
      for (i = 0; i < PJOBS.length; i++) { J = PJOBS[i]; if (J.cancel || J.sent > 0 || J.n > PROBE_CAP) continue; if (!V) { V = J.V; mode = J.mode; } if (J.V !== V || J.mode !== mode) continue; if (n + J.n > PROBE_CAP) break; jobs.push(J); n += J.n; }
      if (!jobs.length || !V.def.P || V.def.P.st !== 2 || !NOISE.done || !V.paramsFlat || !KW.tex) return;
      probeRun(jobs, true);
      for (i = PJOBS.length - 1; i >= 0; i--) if (PJOBS[i].done || PJOBS[i].cancel) PJOBS.splice(i, 1);
      PSTAT.batches++; PSTAT.points += n; if (n > PSTAT.maxPts) PSTAT.maxPts = n;
    }
  }
  /* bootFence, bootIdle: a fence after each of the boot's frames from C's last on (the noise, the warm table and D's own
     draws before it), kept in order until it is passed (a fence's state reaches the page a frame or two after the GPU
     passes it: one remade every frame is never seen passed). D reads at once (probeSync, the ground grid) only once
     the first is passed (C's own frame: a slow device's first draws' compiles) and every one but the last frame's, so a
     read waits on one frame's work at most, never on a queue of the GPU's (the ring until then, the page never held) */
  /* (first-paint preview) in the hold, one task, WebGL 2 changes no fence's status: no fence is made, the GPU counts as
     idle and the boot reads at once (each read waits for its own data) */
  function bootFence() { if (HOLD.on) return; var f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); if (f) BOOT.gq.push(f); }
  function bootIdle() {
    if (HOLD.on) return true;
    var q = BOOT.gq;
    while (q.length && gl.getSyncParameter(q[0], gl.SYNC_STATUS) === gl.SIGNALED) { gl.deleteSync(q.shift()); BOOT.g0 = true; }
    return BOOT.g0 && q.length <= 1;
  }
  function bootFenceDrop() { while (BOOT.gq.length) gl.deleteSync(BOOT.gq.shift()); }
  /* groundRest: the landing's grid begun through the ring in a busy frame (groundCache, not at once: the grid drawn and
     its first half read into the ring), its halves not all read out of the target when the GPU turns idle. Only
     groundRead reads the next half, and the read-at-once branch never calls it, while groundCache(.., true) returns on
     the grid's key, so without it the second half is never read: GROUND.ok never comes, flightIn never holds and the
     boot waits for ever (1 of 6 visits: where the noise is done by C's end, so D's first frame is C's next, still busy).
     The rest read at once, the whole target (it is not drawn again until both halves are read: the same bytes the
     ring brings), and the halves already in the ring dropped (their generation passed: groundHalf) */
  function groundRest() {
    if (GROUND.rd <= 0 || !GCCT) return;
    var px = new Uint8Array(GCN * GCN * 4), P = GROUND.P;
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCCT.f); gl.readPixels(0, 0, GCN, GCN, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    GROUND.rd = 0; GROUND.got = 0; GROUND.gen++; P.gen = GROUND.gen;
    groundLand(px, P.V, P.x0, P.z0);
  }
  function bootProbing(V) {   // a cell not yet laid out, or one whose probes probeSync has still to read
    var L = V.cellList; if (!L) return true;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st === 0) return true; if (C.st === 1 && C.job && !C.job.done && !C.job.cancel && !C.job.sent && C.job.n <= PROBE_CAP) return true; }
    return false;
  }
  function bootSig(V) {
    var L = V.cellList || [], a = 0, b = 0, c = 0;
    for (var i = 0; i < L.length; i++) { a += L[i].st; b += L[i].bi; c += L[i].vi || 0; }
    return [V.st, L.length, a, b, c, PJOBS.length, GROUND.gen2 || 0, WORK.layouts + WORK.resolves + WORK.verts + WORK.uploads + WORK.layers].join(',');
  }
  /* bootNeed: a distance weight over 0 about (cx, cz), the cell's own or one of its cloud bodies' (known once it is
     resolved), m metres nearer. bootReady: the show's test: every cell of the wanted set resolved, every needed
     one (BOOT_M nearer: the pre-roll's step and rounding) whole, no full rebuild waiting */
  function bootNeed(V, C, cx, cz, m) {
    if (distFadeAt(V, C.sc, Math.max(nearDist(C, cx, cz) - m, 0)) > 0) return true;
    for (var k = 0; k < C.vols.length; k++) { var o = C.vols[k].out, dx = o.c[0] - cx, dz = o.c[2] - cz; if (distFadeAt(V, C.sc, Math.max(Math.sqrt(dx * dx + dz * dz) - o.r - m, 0)) > 0) return true; }
    return false;
  }
  function bootReady(V, cx, cz) {
    var L = V.cellList; if (!L || !L.length) return false;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st < 2) return false; if ((C.st < 4 || C.RB) && bootNeed(V, C, cx, cz, BOOT_M)) return false; }
    return true;
  }
  /* the guard: a cell in the view, not yet whole, whose distance weight (its own or one of its
     cloud bodies') will be over 0 within GUARD_M m, built at once before the frame that would show it (cellNow: every
     stage, its probes read at once). A cell already over its weight when built so is late (lateBorn) */
  function cellNow(C) {
    if (C.st === 0) cellLayout(C, true);
    if (C.st === 1 && C.job && !C.job.done) { var J = C.job; J.cancel = true; C.job = probeJob(C.V, J.pts, J.n, J.mode, true); }
    if (C.st === 1) cellResolve(C);
    if (C.st === 2) { if (C.B && C.bi < C.items.length) cellMesh(C, 1e9); cellUpload(C); }
    if (C.st === 3) cellBake(C, 1e9);
  }
  function cellGuard(V) {
    var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st >= 4) continue;
      if (C.st >= 2 && C.bound[3] <= 0) continue;   // (nothing of it to draw)
      if (!inView(C.bound[0], C.bound[1], C.bound[2], C.bound[3] > 0 ? C.bound[3] : C.size)) continue;
      if (!bootNeed(V, C, CAM.pos[0], CAM.pos[2], GUARD_M)) continue;
      cellNow(C); BOOT.guarded++;
    }
  }
  /* creatures: a flock's uniforms from its description: { kind: 'bird' | 'ray' | 'moth' | 'jelly' | 'cap', n (<= 32), at,
     u0, drift [x, z] (m/s), orbit (m), wheel (rad/s), size (m), flap (Hz: the beat, the flutter, a jelly's pulse),
     spread (m: heights), lit, shade (colours), glow ([r, g, b], linear HDR: its own light; moths, jellies, caps),
     bob: [m, period s], layout: 'orbit' | 'helix' | 'still', helix: [radius m, step deg, rise m a step, turn deg/s] } */
  var FKIND = { bird: 1, ray: 2, moth: 3, jelly: 4, cap: 5 };
  /* what of the creatures, the glow sprites and the beams any cell or event has laid out this visit:
     until one is, its program is held to after the show (lateHeld); once one is, it is issued at once, and the show
     waits for it (lateSeenReady, stage G) */
  var LATEK = { creature: 0, glow: 0, beam: 0 };
  function flockOf(f) {
    var kd = FKIND[f.kind] || 1, hx = f.helix || [4, 40, 5, 0], bob = f.bob || [0, 1];
    return { ray: kd === 2, kind: kd, n: Math.min(f.n || 12, 32), a: new Float32Array([f.at[0], f.at[1], f.at[2], f.u0 || 0]), b: new Float32Array([f.drift ? f.drift[0] : 0, f.drift ? f.drift[1] : 0, f.orbit || 30, kd]),
      c: new Float32Array([f.wheel || 0.3, f.size || 1.3, f.flap || 3, f.spread || 8]), lit: new Float32Array(f.lit || [1, 1, 1]), shade: new Float32Array(f.shade || [0.6, 0.6, 0.7]), life: f.life || null,
      d: new Float32Array([bob[0], 2 * PI / Math.max(bob[1], 0.1), f.layout === 'helix' ? 1 : f.layout === 'still' ? 2 : 0, 0]), e: new Float32Array([hx[0], hx[1] * DEG, hx[2], (hx[3] || 0) * DEG]), glow: new Float32Array(f.glow || [0, 0, 0]) };
  }

