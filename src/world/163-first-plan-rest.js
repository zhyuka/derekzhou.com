  /* (fast500 B3, PLAN500 step 3) the first plan bakes the first frame's texels first. Every KW texel is a pure function
     of its position and of the anchors within about 2.2 km of it (B's relief 1.3 R + warp 500 m), all committed by the
     first tick's prefix (the window's farthest raw texel is 11.4 km out: B whole, S to 15.65 km), and a derived texel
     of the raw ones within KAR; so any order of baking gives the same texels, and the completed grid is today's. The
     first pass (kwFirst) bakes the view's wedge (to KN1 plus the spline, within the frustum's half-width plus
     KW_MARGIN of the first view's yaw) and the disc the cells and kits read all round (KW_DISC: their solids are held
     3.8-5.2 km out), dilated by KAR + 2 texels (the derived window and the B-spline), raw and derived; the rest (KWR),
     ordered by angle from that yaw (2 deg buckets, rows within), goes in flight through kwFollow's own budget, and the
     derived rows from the nearest as before. Two guards hold every read to today's values while the rest is
     pending (KW.part): bsGrid derives any of the 4 x 4 KW texels it reads that is not yet (the CPU's reads: the
     cells, the ground, the light), and drawFrame, before a frame, derives every texel inside the frustum's wedge (the
     drawn camera's yaw, the half-width plus KW_MARGIN, to KN1 + 3 texels) or within KW_DISC of it, and uploads them:
     the land is never wrong; at worst a hard turn in the first second is a hitch (KW.guard counts the texels) */
  var KW_DISC = 5200, KW_DIL = KAR + 2, KW_MARGIN = 5 * DEG, KWR = null;
  function kwAng(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / (2 * Math.PI)) * 2 * Math.PI; return d; }   // (angDiff's body, here so the plan's worker has it: its spans)
  /* (world-perf lane) THE FIRST PLAN, one entry point: the maps and the director about the landing (mapsInit), then
     the weights' texels the first frame reads (kwFirst: the view's wedge and the disc). The plan's worker makes it
     and answers with it at once, then bakes the rest and answers again; the page makes it itself when the worker
     has not answered (planVisit; the first-paint hold the same way) */
  function planFirst(seed, x, z, yaw, half) { mapsInit(seed); kwFirst(x, z, yaw, half); }
  function kwFirst(x, z, yaw, half) {
    var ci = Math.floor(x / KSTEP), cj = Math.floor(z / KSTEP), h = KH, W2 = 2 * h, j, i, ii, jj, q, any;
    KW.i0 = ci; KW.j0 = cj; KWQ.length = 0; KDQ.length = 0;
    for (j = cj - h; j < cj + h; j++) KWQ.push(j);
    for (j = cj - KDH; j <= cj + KDH; j++) KDQ.push(j);
    var near = function (a, b) { return Math.abs(a - cj) - Math.abs(b - cj); };
    KWQ.sort(near); KDQ.sort(near);
    var M = new Uint8Array(W2 * W2), T = new Uint8Array(W2 * W2), AN = new Float32Array(W2 * W2), rr = KN1 + 2 * KSTEP, last;
    for (jj = 0; jj < W2; jj++) for (ii = 0; ii < W2; ii++) {
      var tx = (ci - h + ii + 0.5) * KSTEP - x, tz = (cj - h + jj + 0.5) * KSTEP - z, d = Math.sqrt(tx * tx + tz * tz), an = Math.abs(kwAng(Math.atan2(tx, tz), yaw));
      q = jj * W2 + ii; AN[q] = an;
      if (d <= KW_DISC || (d <= rr && an <= half)) M[q] = 1;
    }
    for (jj = 0; jj < W2; jj++) {   // (the dilation by KW_DIL, square: along x into T, then along z back into M)
      for (last = -1e9, ii = 0; ii < W2; ii++) { q = jj * W2 + ii; if (M[q]) last = ii; if (ii - last <= KW_DIL) T[q] = 1; }
      for (last = 1e9, ii = W2 - 1; ii >= 0; ii--) { q = jj * W2 + ii; if (M[q]) last = ii; if (last - ii <= KW_DIL) T[q] = 1; }
    }
    M.fill(0);
    for (ii = 0; ii < W2; ii++) {
      for (last = -1e9, jj = 0; jj < W2; jj++) { q = jj * W2 + ii; if (T[q]) last = jj; if (jj - last <= KW_DIL) M[q] = 1; }
      for (last = 1e9, jj = W2 - 1; jj >= 0; jj--) { q = jj * W2 + ii; if (T[q]) last = jj; if (last - jj <= KW_DIL) M[q] = 1; }
    }
    var nr = 0, NB = 90, BC = new Int32Array(NB + 1);
    for (jj = 0; jj < W2; jj++) {
      for (any = false, ii = 0; ii < W2; ii++) { q = jj * W2 + ii; if (M[q]) { if (kwBakeTexel(ci - h + ii, cj - h + jj)) any = true; } else { nr++; BC[Math.min(NB - 1, Math.floor(AN[q] / PI * NB)) + 1]++; } }
      if (any) KW.dirty.push(kmod(cj - h + jj, KN));
    }
    for (var k = 0; k < KDQ.length; k++) {
      var jd = KDQ[k]; jj = jd - (cj - h);
      for (any = false, i = ci - KDH; i <= ci + KDH; i++) if (M[jj * W2 + i - (ci - h)] && kwDerive(i, jd) > 0) any = true;
      if (any) KW.dirty.push(kmod(jd, KN));
    }
    for (k = 1; k <= NB; k++) BC[k] += BC[k - 1];
    KWR = new Int32Array(nr);
    for (q = 0; q < W2 * W2; q++) if (!M[q]) KWR[BC[Math.min(NB - 1, Math.floor(AN[q] / PI * NB))]++] = q;
    KW.qi = KWQ.length; KW.di = 0; KW.ri = 0; KW.ri0 = ci - h; KW.rj0 = cj - h; KW.guard = 0; KW.gf = 0; KW.fy = yaw; KW.fh = half; KW.gy = KW.gh = KW.gd = KW.ga = NaN; KW.first = W2 * W2 - nr;
    KW.part = nr > 0; KW.ok = true; if (!KW.part) KWR = null;
    KW.cx = (KW.i0 + 0.5) * KSTEP; KW.cz = (KW.j0 + 0.5) * KSTEP;
    kfFollow(x, z, true);
  }
  function kwAdoptFirst(f, kwr) {   // KW's state as kwFirst(f.x, f.z, f.yaw, f.half) leaves it (its texels adopted already)
    var ci = f.i0, cj = f.j0, h = KH, j;
    KW.i0 = ci; KW.j0 = cj; KWQ.length = 0; KDQ.length = 0;
    for (j = cj - h; j < cj + h; j++) KWQ.push(j);
    for (j = cj - KDH; j <= cj + KDH; j++) KDQ.push(j);
    var near = function (a, b) { return Math.abs(a - cj) - Math.abs(b - cj); };
    KWQ.sort(near); KDQ.sort(near);
    KW.qi = KWQ.length; KW.di = 0; KW.ri = 0; KW.ri0 = ci - h; KW.rj0 = cj - h; KW.guard = 0; KW.gf = 0; KW.fy = f.fy; KW.fh = f.fh; KW.gy = KW.gh = KW.gd = KW.ga = NaN; KW.first = f.first;
    KW.part = f.part; KW.ok = true; KWR = f.part ? kwr : null;
    KW.cx = (KW.i0 + 0.5) * KSTEP; KW.cz = (KW.j0 + 0.5) * KSTEP;
  }
  /* the worker's rest: each KW texel and KG pass the page has not made itself, taken (a slot holding another place's
     texel, the window moved since, is the page's and stays) */
  function kwAdoptRest(m) {   // returns the texels taken
    if (!KW.part || !KWR) return 0;
    var D = m.kw.data, IX = m.kw.ix, DX = m.kw.dx, n = KN * KN, rows = new Uint8Array(KN), q, k, c, got = 0;
    for (q = 0; q < n; q++) {
      k = IX[q]; if (k === BADK) continue;
      if (KW.ix[q] === BADK) { for (c = 0; c < 4; c++) KW.data[q * 4 + c] = D[q * 4 + c]; KW.ix[q] = k; KW.dx[q] = DX[q]; KW.baked++; if (DX[q] === k) KW.derived++; rows[(q / KN) | 0] = 1; got++; }
      else if (KW.ix[q] === k && KW.dx[q] !== k && DX[q] === k) { KW.data[q * 4 + 2] = D[q * 4 + 2]; KW.data[q * 4 + 3] = D[q * 4 + 3]; KW.dx[q] = k; KW.derived++; rows[(q / KN) | 0] = 1; got++; }
    }
    for (q = 0; q < n; q++) if (KG.ix[q] === BADK && m.kg.ix[q] !== BADK) { KG.v[q * 2] = m.kg.v[q * 2]; KG.v[q * 2 + 1] = m.kg.v[q * 2 + 1]; KG.ix[q] = m.kg.ix[q]; }
    for (q = 0; q < KN; q++) if (rows[q]) KW.dirty.push(q);
    KW.ri = KWR.length;   // (the rest made: kwFollow ends KW.part once its queues are through)
    return got;
  }
  /* while the plan's worker is baking the rest (the page's hook: KWDUE; never in the worker), kwFollow bakes none of it */
  var KWDUE = null;
  function planRestDue() { return KWDUE ? KWDUE() : false; }
  function kwRestStep(budget) {   // the rest's raw texels, by its order, while in the window (one that left it is never read)
    var W2 = 2 * KH, lr = -1;
    while (KW.ri < KWR.length && budget > 0) {
      var p = KWR[KW.ri++], i = KW.ri0 + p % W2, j = KW.rj0 + ((p / W2) | 0);
      if (i < KW.i0 - KH || i >= KW.i0 + KH || j < KW.j0 - KH || j >= KW.j0 + KH) continue;
      if (kwBakeTexel(i, j)) { budget--; var r = kmod(j, KN); if (r !== lr) { KW.dirty.push(r); lr = r; } }
    }
    return budget;
  }
  function kwEnsure(i, j) {   // texel (i, j) derived now, its raw texels baked first (within KDH of the window's centre)
    var q = kmod(j, KN) * KN + kmod(i, KN);
    if (KW.dx[q] === kkey(i, j)) return false;
    for (var b = -KAR; b <= KAR; b++) { var any = false; for (var a = -KAR; a <= KAR; a++) if (kwBakeTexel(i + a, j + b)) any = true; if (any) KW.dirty.push(kmod(j + b, KN)); }
    if (kwDerive(i, j) > 0) KW.dirty.push(kmod(j, KN));
    return true;
  }
  function kwGuard(cx, cz, yaw) {   // before a frame: every texel the frustum can read, derived and uploaded
    var W2 = 2 * KH, half = Math.atan(FRT.tanX) + KW_MARGIN, rr = (KN1 + 3 * KSTEP) * (KN1 + 3 * KSTEP), dd = KW_DISC * KW_DISC, n = 0;
    for (var k = 0; k < KWR.length; k++) {
      var p = KWR[k], i = KW.ri0 + p % W2, j = KW.rj0 + ((p / W2) | 0);
      if (i < KW.i0 - KDH || i > KW.i0 + KDH || j < KW.j0 - KDH || j > KW.j0 + KDH) continue;
      if (KW.dx[kmod(j, KN) * KN + kmod(i, KN)] === kkey(i, j)) continue;
      var tx = (i + 0.5) * KSTEP - cx, tz = (j + 0.5) * KSTEP - cz, d2 = tx * tx + tz * tz;
      if (d2 > rr || (d2 > dd && Math.abs(angDiff(Math.atan2(tx, tz), yaw)) > half)) continue;
      if (kwEnsure(i, j)) { if (!n && !KW.gf) { KW.gy = yaw; KW.gh = half; KW.gd = Math.sqrt(d2); KW.ga = angDiff(Math.atan2(tx, tz), yaw); } n++; }
    }
    if (n) { KW.guard += n; KW.gf++; kwUpload(); }
  }
  function kwProbeGuard(n) {   // (fast500 B3) every KW texel a probe point in PSCR reads (the B-spline's 4 x 4, as bsGrid; within KN1 of the camera, past which the GPU reads no KW), derived and uploaded
    var hw = KSH * KSTEP, lim = (KN1 + 4 * KSTEP) * (KN1 + 4 * KSTEP), m = 0;
    for (var p = 0; p < n; p++) {
      var x = PSCR[p * 2], z = PSCR[p * 2 + 1], ex = x - CS.x, ez = z - CS.z, ey = x - CAM.pos[0], ew = z - CAM.pos[2];
      if (ex * ex + ez * ez > lim && ey * ey + ew * ew > lim) continue;
      var tx = clamp(x, KW.cx - hw, KW.cx + hw) / KSTEP - 0.5, tz = clamp(z, KW.cz - hw, KW.cz + hw) / KSTEP - 0.5, ix = Math.floor(tx), iz = Math.floor(tz);
      for (var gb = -1; gb <= 2; gb++) for (var ga = -1; ga <= 2; ga++) if (kwEnsure(ix + ga, iz + gb)) m++;
    }
    if (m) { KW.guard += m; KW.pg = (KW.pg || 0) + m; kwUpload(); }
  }
