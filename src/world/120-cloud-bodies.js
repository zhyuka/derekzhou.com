  /* ---------------------------------------------------------------- cloud bodies */
  /* a body's lobes (centre, radius; 12 floats each, the rest spare), laid out by the kit's generators; each body is
     baked into a volume (volPrep, volBake) */
  function Puffs() { this.a = []; this.bodies = []; }
  Puffs.prototype = {
    body: function () { this.bodies.push({ i0: this.a.length / 12, cx: 0, cy: 0, cz: 0, y0: 0, y1: 1 }); return this.bodies[this.bodies.length - 1]; },
    add: function (x, y, z, R, seed, op) { this.a.push(x, y, z, R, 1, 1, seed, op === undefined ? 1 : op, 0, 1, 0, 0.5); },
    count: function () { return this.a.length / 12; }
  };
  /* a cumulus tower: a flat base, a body of lobes over a bulging, narrowing envelope, a crown of big domes */
  function cumulus(PF, rng, x, y0, z, W, H, o) {
    o = o || {};
    var b = PF.body(); b.cx = x; b.cz = z; b.y0 = y0; b.y1 = y0 + H; b.cy = y0 + H * 0.4; b.vol = !o.puffs; b.seed = rng.f() * 10;
    if (o.erode !== undefined) b.erode = o.erode; if (o.billow !== undefined) b.billow = o.billow; if (o.noise) b.noise = o.noise; if (o.band) b.band = o.band;
    var big = o.puff || 1, n = Math.round(clamp(o.n || 12 + 16 * H / W + W / 60, 14, 72)), i;
    function env(h) { return W * 0.5 * (0.82 + 0.25 * Math.sin(Math.PI * Math.min(h * 1.1, 1))) * (1 - 0.5 * h * h); }
    var lean = o.lean || [0, 0];
    for (i = 0; i < n; i++) {   // lobes on the body's surface, smaller toward the top
      var h = Math.pow(rng.f(), 0.75), th = rng.f() * Math.PI * 2, R = W * (0.14 + 0.1 * rng.f()) * (1 - 0.35 * h) * big;
      var e = env(h), rr = Math.max(e - R * 0.55, 0) * (0.75 + 0.25 * rng.f());
      var py = y0 + Math.max(h * (H - R * 0.5), R * 0.5);
      PF.add(x + Math.cos(th) * rr + lean[0] * h * H, py, z + Math.sin(th) * rr + lean[1] * h * H, R, rng.f(), 1);
    }
    var nc = 3 + rng.i(3);
    for (i = 0; i < nc; i++) {   // the crown: domes of mixed size at different heights
      var a = rng.f() * Math.PI * 2, d = W * 0.22 * Math.sqrt(rng.f()), R2 = W * (0.15 + 0.12 * rng.f()) * big;
      PF.add(x + Math.cos(a) * d + lean[0] * H, y0 + H - R2 * (0.55 + 0.5 * rng.f()), z + Math.sin(a) * d + lean[1] * H, R2, rng.f(), 1);
    }
    var ni = Math.round(2 + W / 120);
    for (i = 0; i < ni; i++) {   // a few inside, so the body is never hollow
      PF.add(x + rng.r(-0.15, 0.15) * W, y0 + H * rng.r(0.15, 0.6), z + rng.r(-0.15, 0.15) * W, W * 0.3 * big, rng.f(), 1);
    }
    var nb = Math.round(3 + W / 90);
    for (i = 0; i < nb; i++) {   // the base: wide and flat
      var a2 = rng.f() * Math.PI * 2, d2 = W * 0.34 * Math.sqrt(rng.f()), R3 = W * (0.2 + 0.08 * rng.f()) * big;
      PF.add(x + Math.cos(a2) * d2, y0 + R3 * 0.35, z + Math.sin(a2) * d2, R3, rng.f(), 1);
    }
    return b;
  }
  /* a range: a long, low bank of heaped cloud lying along a line (from x0,z0 toward dir), the base flat, the tops
     heaped in mounds of different heights */
  function range(PF, rng, x0, y0, z0, dir, len, W, H, o) {
    o = o || {};
    var b = PF.body(); b.vol = true; b.seed = rng.f() * 10; b.erode = 0.85; b.yaw = dir;
    var dx = Math.sin(dir), dz = Math.cos(dir), px = -dz, pz = dx;
    b.cx = x0 + dx * len / 2; b.cz = z0 + dz * len / 2; b.cy = y0 + H * 0.3; b.y0 = y0; b.y1 = y0 + H;
    var n = Math.round(clamp(len / W * 9, 16, 80)), mounds = [];
    for (var m = 0; m < 4; m++) mounds.push([rng.f(), rng.r(0.5, 1), rng.r(0.08, 0.22)]);
    for (var i = 0; i < n; i++) {
      var u = rng.f(), lat = rng.r(-0.5, 0.5) * W, prof = 0.35;
      for (m = 0; m < 4; m++) { var q = (u - mounds[m][0]) / mounds[m][2]; prof = Math.max(prof, mounds[m][1] * Math.exp(-q * q)); }
      var R = W * rng.r(0.22, 0.4) * (0.6 + 0.4 * prof), y = y0 + R * 0.5 + rng.f() * Math.max(H * prof - R, 0);
      PF.add(x0 + dx * u * len + px * lat, y, z0 + dz * u * len + pz * lat, R, rng.f(), 1);
    }
    return b;
  }
  /* a wall: a long, tall bank of cloud (a canyon's side), its billows stacked in shelves, each shelf's run along
     the wall shorter toward the top (a skyline of mounds), the face bulging toward one side (face: +1 to the right of
     dir, -1 to the left, 0 both) */
  function wall(PF, rng, x0, y0, z0, dir, len, thick, H, o) {
    o = o || {};
    var b = PF.body(); b.vol = true; b.seed = rng.f() * 10; b.erode = o.erode === undefined ? 0.8 : o.erode;
    b.squash = o.squash || 0.8; b.blend = o.blend || 0.6; b.billow = o.billow || 0.95; b.yaw = dir; if (o.noise) b.noise = o.noise; if (o.band) b.band = o.band;
    var dx = Math.sin(dir), dz = Math.cos(dir), px = dz, pz = -dx, face = o.face || 0, m;
    b.cx = x0 + dx * len / 2; b.cz = z0 + dz * len / 2; b.y0 = y0; b.y1 = y0 + H; b.cy = y0 + H * 0.4;
    var shelves = Math.max(2, Math.round(H / (thick * 0.5))), mounds = [];
    for (m = 0; m < 3; m++) mounds.push([rng.r(-0.1, 1.1), rng.r(0.55, 1), rng.r(0.18, 0.4)]);
    for (var k = 0; k < shelves; k++) {
      var f = k / Math.max(shelves - 1, 1), R = thick * (0.52 - 0.2 * f) * rng.r(0.9, 1.1), y = y0 + R * 0.55 + f * Math.max(H - R * 1.1, 0);
      var step = R * 1.2, u = rng.r(0, 0.6) * step;
      while (u < len && PF.count() - b.i0 < 96) {
        var uu = u / len, prof = 0.3;
        for (m = 0; m < 3; m++) { var q = (uu - mounds[m][0]) / mounds[m][2]; prof = Math.max(prof, mounds[m][1] * Math.exp(-q * q)); }
        if (f <= prof + 0.08) {
          var lat = (rng.r(-0.3, 0.3) + face * 0.16 * (1 - f)) * thick;
          PF.add(x0 + dx * u + px * lat, y + rng.r(-0.15, 0.15) * R, z0 + dz * u + pz * lat, R * rng.r(0.72, 1.25), rng.f(), 1);
        }
        u += step * rng.r(0.75, 1.15);
      }
    }
    return b;
  }
  /* a bank: a heap of lobes over a round footprint (the cloud a passage goes through): a flat base, mounds on top */
  /* a lenticular (delight-weather 3, terrain-held clouds): smooth lens plates stacked one to three over a ridge's lee
     wave, their long axis along the crest (dir), each plate over the one below smaller; edges smooth and crisp (little
     erosion, small billows, a narrow band). Its envelope stands still (a world cell's: held); only the billows in it
     flow, at the wind at its height (o.flow on every plate: 410 moves their offset, the shader reads no clock).
     Each plate is a body of its own, a grid of up to 96 lobes (PC GPU, 2026-11-23: 48 lobes 100-210 m apart left a rim
     of loose beads, and lobes widened to the spacing a flat slab with square ends): the lobes at cosine-spaced nodes
     (x = cos(pi (2k + 1) / 2n)) along the plate and across each row, the rows as wide as the plate's ellipse there,
     so the spacing shrinks toward the rim with the plate's half-width; each lobe 0.8 of its own spacing, so it
     overlaps its neighbours, smaller toward the
     rim; squashed so the plate is T * 0.52 high at its centre, and so thinner toward its rim, as a lens; a light blend,
     so the union does not swell the plate; and only low-frequency texture on it (the hub, 2026-11-23: the top plate's edge
     scalloped at about 5 m): the bake's erosion half a cumulus's (0.15), and 410's flowing billows a quarter of the kit's depth */
  function lens(PF, rng, x, y0, z, dir, len, W, T, n, o) {
    o = o || {};
    var dx = Math.sin(dir), dz = Math.cos(dir), px = dz, pz = -dx, b0 = null, k, i, j;
    for (k = 0; k < n; k++) {
      var sk = 1 - 0.24 * k, yk = y0 + T * 0.5 + k * T * 1.6, L = len * sk, Wk = W * sk;
      var nu = Math.max(6, Math.min(24, Math.round(Math.sqrt(96 * L * 0.5 / (Wk * 0.45))))), nv = Math.max(2, Math.min(8, Math.floor(96 / nu)));
      var sa = L * 0.5 * Math.PI / nu, sc = Wk * 0.45 * Math.PI / nv, Rc = 0.8 * Math.max(sa, sc);   // (the spacing at the plate's centre, along and across; the centre's lobe)
      var b = PF.body(); b.vol = true; b.seed = rng.f() * 10; b.yaw = dir; if (o.flow) b.flow = o.flow;
      b.erode = 0.15; b.billow = 0.35; b.squash = 0.52 * T / Rc; b.blend = 0.3; b.band = 0.035; b.noise = 6;
      b.cx = x; b.cz = z; b.y0 = yk - T * 0.5; b.y1 = yk + T * 0.5; b.cy = yk;
      if (!b0) b0 = b;
      for (i = 0; i < nu; i++) {
        var u = -Math.cos(Math.PI * (i + 0.5) / nu), hu = Math.sqrt(1 - u * u);
        for (j = 0; j < nv; j++) {
          var v = -Math.cos(Math.PI * (j + 0.5) / nv), hv = Math.sqrt(1 - v * v);
          var R = Math.max(0.8 * Math.max(sa * hu, sc * hu * hv), 0.15 * Rc) * rng.r(0.95, 1.05);
          PF.add(x + dx * u * L * 0.5 + px * v * hu * Wk * 0.45, yk + rng.r(-0.04, 0.04) * T, z + dz * u * L * 0.5 + pz * v * hu * Wk * 0.45, R, rng.f(), 1);
        }
      }
    }
    return b0;
  }
  function bank(PF, rng, x, y, z, W, H, D, R0, n) {
    var b = PF.body(); b.cx = x; b.cy = y; b.cz = z; b.y0 = y - H * 0.5; b.y1 = y + H * 0.5; b.vol = true; b.seed = rng.f() * 10;
    for (var i = 0; i < n; i++) {
      var u = rng.f() * 2 - 1, v = rng.f() * 2 - 1, w = rng.f() * 2 - 1, R = R0 * (0.7 + 0.6 * rng.f());
      PF.add(x + u * W * 0.5, y + v * H * 0.5, z + w * D * 0.5, R, rng.f(), 1);
    }
    return b;
  }
