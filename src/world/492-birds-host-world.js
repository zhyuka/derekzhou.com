    /* how much cloud stands between a point a and each of three points a + P[0..2], a + P[3..5] (the middle one),
       a + P[6..8]: the length (m) of each segment inside the visible lobes of the clouds about the camera (each lobe a
       sphere). The bodies' bounds are tested once, against the middle segment padded by the others' reach from it (so
       every body either of them meets is kept), then each segment against those bodies' bounds and lobes only */
    cloudBetween3: function (ax, ay, az, P, out) {
      var V = SIM.V, L = V && V.cellList, i, k, q, h, n = 0;
      out[0] = out[1] = out[2] = 0;
      if (!L) return out;
      var pad = 0;
      for (q = 0; q < 9; q += 3) { var ex = P[q] - P[3], ey = P[q + 1] - P[4], ez = P[q + 2] - P[5]; pad = Math.max(pad, Math.sqrt(ex * ex + ey * ey + ez * ez)); }
      pad = pad * 1.001 + 0.01;   // (a margin for rounding: a body kept too many is harmless)
      cbSet(ax, ay, az, ax + P[3], ay + P[4], az + P[5]);
      for (i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 3 || !C.soft || !C.softB) continue;
        var off = cellOff(C, cloudT(), CBO);   // (physics: clouds/drift: an air cell's lobes where the air has carried them)
        for (k = 0; k < C.softB.length; k++) {
          var B = C.softB[k]; if (!cbChord(B[0] + off[0], B[1] + off[2], B[2] + off[1], B[3] + pad)) continue;
          if (n + 2 > CBH.length) { var G = new Int32Array(2 * CBH.length); G.set(CBH); CBH = G; }
          CBH[n++] = i; CBH[n++] = k;
        }
      }
      for (q = 0; q < 3; q++) {
        if (!n) break;
        cbSet(ax, ay, az, ax + P[3 * q], ay + P[3 * q + 1], az + P[3 * q + 2]);
        var tot = 0;
        for (h = 0; h < n; h += 2) {
          var C2 = L[CBH[h]], B2 = C2.softB[CBH[h + 1]], o2 = cellOff(C2, cloudT(), CBO); if (!cbChord(B2[0] + o2[0], B2[1] + o2[2], B2[2] + o2[1], B2[3])) continue;
          for (var l = B2[4]; l < B2[5]; l += 4) tot += cbChord(C2.soft[l] + o2[0], C2.soft[l + 1] + o2[2], C2.soft[l + 2] + o2[1], C2.soft[l + 3]);
        }
        out[q] = tot;
      }
      return out;
    },
    /* the cover over the view: the cloud about the eye (a passage), a passage's dark or light */
    cover: function () { return Math.max(CAM.inCloud || 0, CAM.cover || 0); },
    ground: function (x, z) { var V = SIM.V; return V ? groundAt(V, x, z, false) : 0; },
    /* (one bird) the camera's ground grid's reach (m from its centre: groundAt is exact within it), and the cloud sea at
       any point from the raw maps: o.w its weight (0 sand, 1 the sea of cloud), o.lv its raw level (the drawn sea's top
       lies at or under it), so a bird can rise out of the sea or go down into it where no one can see it come or go */
    groundReach: function () { return GROUND.ok ? (GCN / 2 - 3) * GCCELL : 0; },
    seaAt: function (x, z, o) { if (!MAPS.w) { o.w = 0; o.lv = -1e9; return o; } var k = kitAt(x, z); o.w = k.wC; o.lv = SEA_LO + RISE * k.wC; return o; },
    /* the realm's places with birds (its cells' bird flocks, within r of the camera): centre, height, orbit, wheel */
    places: function (r, out) {
      out.length = 0; var V = SIM.V, L = V && V.cellList; if (!L) return out;
      for (var i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 2) continue;
        var fo = cellOff(C, cloudT(), CBO);   // (an air cell's flocks ride with it)
        for (var k = 0; k < C.flocks.length; k++) {
          var f = C.flocks[k]; if (f.kind !== 'bird' || !f.at) continue;
          var dx = f.at[0] + fo[0] - CS.x, dz = f.at[2] + fo[1] - CS.z; if (dx * dx + dz * dz > r * r) continue;
          out.push({ x: f.at[0] + fo[0], y: f.at[1] + fo[2], z: f.at[2] + fo[1], orbit: f.orbit || 40, wheel: f.wheel || 0.2, n: f.n || 8, size: f.size || 1.5, key: (C.ix * 73856093 ^ C.iz * 19349663 ^ k * 83492791 ^ C.sc * 2654435761) >>> 0 });
        }
      }
      return out;
    },
    /* (birds3d) the night: 0 by day, 1 at night. The world has no night yet (the time of day's work will give it): the
       zenith sky's luminance after the exposure, 1 - smooth(0.04, 0.12, Y) */
    night: function () {
      var V = SIM.V, L = V && (V.L || V.light), E = LASTE; if (!L) return 0;
      var z = L.skyFlat || (L.sky && L.sky[0]), y = z && z.length >= 3 ? 0.2126 * z[0] + 0.7152 * z[1] + 0.0722 * z[2] : 1;
      y *= E ? E.exposure : 1;
      return 1 - smooth(0.04, 0.12, y);
    },
    /* randomness: a stream from the visit's weather (the journey's seed and a salt): never any other */
    rng: function (salt) { return splitmix32(subseed(AFTER ? SEEDR : J.seed, salt)); },   // (after the cut: the visit's own read)
    reduced: function () { return reduced() && !STILLMODE; },
    dev: DEVMODE,
    count: function (draws, inst) { ST.draws += draws; ST.inst += inst; ST.tris += 2 * inst; }
  };
