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
      field: V.field, sun: keyAt(V),
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
