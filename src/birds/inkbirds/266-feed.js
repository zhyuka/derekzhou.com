  /* ---------------- the score's read of the birds (read only: copies, never steering) ---------------- */
  /* WORLD.birds.feed(o): what the score may hear of the birds, written into o (the caller's own arrays: nothing made here),
     read from the world and changing nothing in it (delight-sound: far calls of the world's own flocks, wings at landings):
       o.f  Float32Array(8 * 6): the nearest flocks, nearest first, o.n of them: kind (FKIND's index), range (m), bearing
            (rad, + to the right of the eye's way), elevation (rad), radial speed (m/s, + going away), count
       o.w  Float32Array(4 * 6): the nearest birds, o.m of them: state (0 flying, 1 coming in, 2 landing, 3 perched,
            4 leaving), beat (Hz; 0 gliding or unseen), phase in its beat (0 the downstroke's start), bearing, range, span (px)
     The kinds' order is o.kinds, filled once */
  var FKIND = Object.keys(SORTS), FD = new Float64Array(8), FI = new Int32Array(8), WD = new Float64Array(4), WI = new Int32Array(4), FA = new Float64Array(4);
  function nearIns(D, I, n, cap, d, k) {   // (a nearest-first list kept by insertion: its new length)
    var j = n < cap ? n : cap - 1; if (n >= cap && d >= D[j]) return n;
    while (j > 0 && D[j - 1] > d) { D[j] = D[j - 1]; I[j] = I[j - 1]; j--; }
    D[j] = d; I[j] = k; return n < cap ? n + 1 : cap;
  }
  function feedAt(o, i, p, v) {   // (range, bearing, elevation and radial speed of a point and its motion from the eye)
    var dx = p[0] - LVC.x, dy = p[1] - LVC.y, dz = p[2] - LVC.z, h = Math.sqrt(dx * dx + dz * dz), r = Math.sqrt(h * h + dy * dy) || 1;
    o[i] = r; o[i + 1] = Math.atan2(dx * LVC_R[0] + dz * LVC_R[2], dx * LVC_F[0] + dz * LVC_F[2]); o[i + 2] = Math.atan2(dy, h);
    o[i + 3] = ((v[0] - LVC.vx) * dx + (v[1] - LVC.vy) * dy + (v[2] - LVC.vz) * dz) / r;
  }
  function eyeD2(b) { var x = b.p[0] - LVC.x, y = b.p[1] - LVC.y, z = b.p[2] - LVC.z; return x * x + y * y + z * z; }
  var FST = { fly: 0, appr: 1, round: 1, land: 2, perch: 3 };
  function feed(o) {
    if (!o) return o;
    if (!o.kinds) o.kinds = FKIND;
    var i, n = 0, m = 0, q, b, f = o.f, w = o.w;
    for (i = 0; i < FLOCKS.length; i++) { b = FLOCKS[i].lead; if (b) n = nearIns(FD, FI, n, 8, eyeD2(b), i); }
    for (i = 0; i < BIRDS.length; i++) m = nearIns(WD, WI, m, 4, eyeD2(BIRDS[i]), i);
    if (f) for (i = 0; i < n; i++) { var F = FLOCKS[FI[i]]; q = 6 * i; feedAt(FA, 0, F.lead.p, F.lead.v); f[q] = FKIND.indexOf(F.kind); f[q + 1] = FA[0]; f[q + 2] = FA[1]; f[q + 3] = FA[2]; f[q + 4] = FA[3]; f[q + 5] = F.m.length; }
    if (w) for (i = 0; i < m; i++) {
      b = BIRDS[WI[i]]; q = 6 * i; var on = !b.wOff && b.flap && b.w && b.w.wing;
      w[q] = b.st === 'perch' && b.P && b.P.leaving ? 4 : FST[b.st] || 0; w[q + 1] = on ? b.w.wing.f : 0; w[q + 2] = on ? b.WS.ph - Math.floor(b.WS.ph) : 0;
      feedAt(FA, 0, b.p, b.v); w[q + 3] = FA[1]; w[q + 4] = FA[0]; w[q + 5] = b.s ? b.s.spanPx : 0;
    }
    o.n = f ? n : 0; o.m = w ? m : 0;
    return o;
  }
