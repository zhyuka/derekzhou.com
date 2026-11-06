  /* ---------------------------------------------------------------- the weights' grids (KW near, KF far) */
  /* (world6; fix round) KW: KN x KN texels of KSTEP m, world-anchored (texel i at (i + 0.5) KSTEP), stored at i mod KN
     (toroidal) about the camera. KF, the far field: FN x FN texels of FSTEP m, the same way, in the texture's rows under
     KW's. Four channels each: wD and wC (raw, from the maps) and two derived from wC by construction: the cloud sea's
     level (its raw SEA_LO + RISE wC, taken from below) and the land's sink (its raw SINK wC, taken from above), each the
     L1 Lipschitz envelope of its raw values with KLIP m per m along each axis (a min-plus, or max-minus, of the texels
     within KAR of it, worked as two passes, along x then z), so neither the sea's level nor the land's sink can rise
     faster than KLIP along an axis, KLIP x sqrt 2 = 0.354 m/m (19.5 deg) in any direction, on any seed (the cubic
     B-spline of samples so bounded keeps the bound). (The step's level, raw, rose at up to 0.66 m/m: the judges' defect
     11.) Each texel is baked once (raw: every anchor that reaches it is committed long before, the director settling all
     within 15.7 km; KF's raw only within KF_RAW of the camera) and derived once all it reads is baked. The drawn weights
     (kitW4) are KW's within KN1 of the camera, eased into KF's over KN0-KN1 and those into a constant over KF0-KF1, by
     smooth weights of the distance: no edge is clamped and none moves in steps (the judges' defect 12: beyond 8 km the
     step clamped to a window edge that moved 64 m at a time, and read an unbaked texel). The CPU reads the same grids
     through the same B-spline and the same blend (kwAt) */
  var KN = 256, KSTEP = 64, FN = 64, FSTEP = 512, KLIP = 0.25, SEA_LO = -110, SEA_HI = -20, SINK = 60, RISE = SEA_HI - SEA_LO;   // (world6 step B: the sea rises around the dunes: its level from under the dunes' troughs to over their sunk crests; the land sinks 60 m, not 170: the camera's surface stays within a few tens of metres of one height)
  var KAR = Math.ceil(RISE / (KLIP * KSTEP)), FAR_R = Math.ceil(RISE / (KLIP * FSTEP));   // (13 and 2 texels: past them no texel can win)
  var KH = KN / 2 - 2, KDH = KH - KAR - 1, KSH = KDH - 3, FH = FN / 2 - 2, FDH = FH - FAR_R - 1, FSH = FDH - 3;   // (half windows: raw 126, derived 112, sampled 109 texels; KF 30, 27, 24)
  var KN0 = 5300, KN1 = 6800, KF0 = 10300, KF1 = 11800, KF_RAW = 15000, KW_FAR = [0.5, 0.5, SEA_LO + RISE * 0.5, SINK * 0.5];
  var BADK = 0x7fffffff;
  var KW = { data: new Float32Array(KN * KN * 4), ix: new Int32Array(KN * KN).fill(BADK), dx: new Int32Array(KN * KN).fill(BADK), cx: 0, cz: 0, tex: null, dirty: [], pend: 0, baked: 0, derived: 0, ok: false, i0: 0, j0: 0, qi: 0, di: 0 };
  var KG = { v: new Float32Array(KN * KN * 2), ix: new Int32Array(KN * KN).fill(BADK) };   // (the x pass of the derived channels)
  var KF = { data: new Float32Array(FN * FN * 4), ix: new Int32Array(FN * FN).fill(BADK), dx: new Int32Array(FN * FN).fill(BADK), cx: 0, cz: 0, i0: 0, j0: 0, dirty: false, baked: 0, derived: 0, ok: false };
  var KW_FRAME = 320, KD_FRAME = 400, KF_FRAME = 48;   // (texels a slice in flight: raw, derived, far raw)
  function kmod(i, n) { return ((i % n) + n) % n; }
  function kkey(i, j) { return (i * 65536 + j) | 0; }
  function kwBakeTexel(i, j) {
    var q = kmod(j, KN) * KN + kmod(i, KN), key = kkey(i, j);
    if (KW.ix[q] === key) return false;
    var k = kitAt((i + 0.5) * KSTEP, (j + 0.5) * KSTEP);
    KW.data[q * 4] = k.wD; KW.data[q * 4 + 1] = k.wC; KW.data[q * 4 + 2] = SEA_LO; KW.data[q * 4 + 3] = SINK;
    KW.ix[q] = key; KW.dx[q] = BADK; KW.baked++;
    return true;
  }
  function kgAt(i, j) {   // the x pass at (i, j): its index, or -1 while a raw texel it reads is not baked
    var n = kmod(j, KN), q = n * KN + kmod(i, KN), key = kkey(i, j);
    if (KG.ix[q] === key) return q;
    var lv = 1e9, sk = -1e9;
    for (var a = -KAR; a <= KAR; a++) {
      var qa = n * KN + kmod(i + a, KN); if (KW.ix[qa] !== kkey(i + a, j)) return -1;
      var w = KW.data[qa * 4 + 1], d = KLIP * KSTEP * Math.abs(a);
      lv = Math.min(lv, SEA_LO + RISE * w + d); sk = Math.max(sk, SINK * w - d);
    }
    KG.v[q * 2] = lv; KG.v[q * 2 + 1] = sk; KG.ix[q] = key;
    return q;
  }
  function kwDerive(i, j) {   // 1 made, 0 made already, -1 not yet (a raw texel it reads is not baked)
    var q = kmod(j, KN) * KN + kmod(i, KN), key = kkey(i, j);
    if (KW.dx[q] === key) return 0;
    if (KW.ix[q] !== key) return -1;
    var lv = 1e9, sk = -1e9;
    for (var b = -KAR; b <= KAR; b++) {
      var g = kgAt(i, j + b); if (g < 0) return -1;
      var d = KLIP * KSTEP * Math.abs(b);
      lv = Math.min(lv, KG.v[g * 2] + d); sk = Math.max(sk, KG.v[g * 2 + 1] - d);
    }
    KW.data[q * 4 + 2] = lv; KW.data[q * 4 + 3] = sk; KW.dx[q] = key; KW.derived++;
    return 1;
  }
  /* the windows follow the camera: KW's centre the camera's texel; every texel within KH baked (a slice's share in
     flight, the nearest rows first), every texel within KDH derived; the texture's rows written as they change */
  var KWQ = [], KDQ = [];
  function kwFollow(x, z, sync) {
    if (MAPS.D && MAPS.D.rest) MAPS.D.tickRest(Infinity);   // (fast500 B3: the first tick's rest, before any texel past the prefix)
    var ci = Math.floor(x / KSTEP), cj = Math.floor(z / KSTEP), h = KH, j;
    if (!KW.ok || ci !== KW.i0 || cj !== KW.j0 || sync) {
      KW.i0 = ci; KW.j0 = cj; KWQ.length = 0; KDQ.length = 0;
      for (j = cj - h; j < cj + h; j++) KWQ.push(j);
      for (j = cj - KDH; j <= cj + KDH; j++) KDQ.push(j);
      var near = function (a, b) { return Math.abs(a - cj) - Math.abs(b - cj); };
      KWQ.sort(near); KDQ.sort(near);
      KW.qi = 0; KW.di = 0;
    }
    var budget = sync ? 1e9 : KW_FRAME;
    while (KW.qi < KWQ.length && budget > 0) {
      var jj = KWQ[KW.qi], any = false;
      for (var ii = KW.i0 - h; ii < KW.i0 + h; ii++) if (kwBakeTexel(ii, jj)) { any = true; budget--; }
      if (any) KW.dirty.push(kmod(jj, KN));
      if (budget > 0 || !any) KW.qi++;
      else break;
    }
    if (KW.part && KWR && !sync && budget > 0 && !planRestDue()) budget = kwRestStep(budget);   // (world-perf lane: not while the worker's rest is due: the page bakes only what is read before it: the guards)   // (fast500 B3: the first plan's rest, by angle from its view)
    var db = sync ? 1e9 : KD_FRAME;
    while (KW.di < KDQ.length && db > 0) {
      var jd = KDQ[KW.di], made = false, wait = false;
      for (var id = KW.i0 - KDH; id <= KW.i0 + KDH; id++) { var r = kwDerive(id, jd); if (r > 0) { made = true; db--; } else if (r < 0) { wait = true; break; } }
      if (made) KW.dirty.push(kmod(jd, KN));
      if (wait) break;   // (its raw rows not yet baked: again next slice)
      if (db > 0 || !made) KW.di++;
      else break;
    }
    if (!KW.ok && KW.qi >= KWQ.length && KW.di >= KDQ.length) KW.ok = true;
    if (KW.part && KW.qi >= KWQ.length && KW.di >= KDQ.length && (sync || KW.ri >= KWR.length)) { KW.part = false; KWR = null; if (!sync) bootMark('plan: rest done (guard ' + KW.guard + ' texels in ' + KW.gf + ' frames; first view ' + (KW.fy / DEG).toFixed(1) + ' deg, half ' + (KW.fh / DEG).toFixed(1) + '; at the guard ' + (KW.gy / DEG).toFixed(1) + ', half ' + (KW.gh / DEG).toFixed(1) + ', at ' + KW.gd.toFixed(0) + ' m, ' + (KW.ga / DEG).toFixed(1) + ' deg off)'); }   // (fast500 B3: the whole window baked and derived)
    KW.cx = (KW.i0 + 0.5) * KSTEP; KW.cz = (KW.j0 + 0.5) * KSTEP;
    kfFollow(x, z, sync);
  }
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
  /* the far field (KF): raw texels within FH and KF_RAW of the camera (the director's settled reach), derived within FDH
     once their neighbours are */
  function kfFollow(x, z, sync) {
    var ci = Math.floor(x / FSTEP), cj = Math.floor(z / FSTEP), i, j, budget = sync ? 1e9 : KF_FRAME;
    KF.i0 = ci; KF.j0 = cj;
    for (var r = 0; r <= FH && budget > 0; r++) for (j = cj - r; j <= cj + r && budget > 0; j++) for (i = ci - r; i <= ci + r; i++) {   // (rings, the nearest first)
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
      var q = kmod(j, FN) * FN + kmod(i, FN), key = kkey(i, j);
      if (KF.ix[q] === key) continue;
      var tx = (i + 0.5) * FSTEP, tz = (j + 0.5) * FSTEP;
      if ((tx - x) * (tx - x) + (tz - z) * (tz - z) > KF_RAW * KF_RAW) continue;
      var k = kitAt(tx, tz);
      KF.data[q * 4] = k.wD; KF.data[q * 4 + 1] = k.wC; KF.data[q * 4 + 2] = SEA_LO; KF.data[q * 4 + 3] = SINK;
      KF.ix[q] = key; KF.dx[q] = BADK; KF.baked++; KF.dirty = true;
      if (--budget <= 0) break;
    }
    for (j = cj - FDH; j <= cj + FDH; j++) for (i = ci - FDH; i <= ci + FDH; i++) {
      var q2 = kmod(j, FN) * FN + kmod(i, FN), key2 = kkey(i, j);
      if (KF.dx[q2] === key2 || KF.ix[q2] !== key2) continue;
      var lv = 1e9, sk = -1e9, ok = true;
      for (var b = -FAR_R; b <= FAR_R && ok; b++) for (var a = -FAR_R; a <= FAR_R; a++) {
        var qa = kmod(j + b, FN) * FN + kmod(i + a, FN);
        if (KF.ix[qa] !== kkey(i + a, j + b)) { ok = false; break; }
        var w = KF.data[qa * 4 + 1], d = KLIP * FSTEP * (Math.abs(a) + Math.abs(b));
        lv = Math.min(lv, SEA_LO + RISE * w + d); sk = Math.max(sk, SINK * w - d);
      }
      if (!ok) continue;
      KF.data[q2 * 4 + 2] = lv; KF.data[q2 * 4 + 3] = sk; KF.dx[q2] = key2; KF.derived++; KF.dirty = true;
    }
    KF.ok = true;
    KF.cx = (KF.i0 + 0.5) * FSTEP; KF.cz = (KF.j0 + 0.5) * FSTEP;
  }
  var KFROWS = FN * FN / KN;   // (KF's texels in the texture's rows under KW's: 16 rows of 256)
  function kwUpload() {   // GPU: the texture made at the start; the rows baked since, written (unit 1, kept bound)
    if (!KW.tex) {
      KW.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, KW.tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, KN, KN + KFROWS);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KN, KN, gl.RGBA, gl.FLOAT, KW.data); KW.dirty.length = 0;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, KN, KN, KFROWS, gl.RGBA, gl.FLOAT, KF.data); KF.dirty = false;
      gl.activeTexture(gl.TEXTURE0); return;
    }
    if (!KW.dirty.length && !KF.dirty) return;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, KW.tex);
    var seen = {};
    for (var k = 0; k < KW.dirty.length; k++) { var r = KW.dirty[k]; if (seen[r]) continue; seen[r] = 1; gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, r, KN, 1, gl.RGBA, gl.FLOAT, KW.data, r * KN * 4); }
    if (KF.dirty) { gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, KN, KN, KFROWS, gl.RGBA, gl.FLOAT, KF.data); KF.dirty = false; }
    KW.dirty.length = 0; gl.activeTexture(gl.TEXTURE0);
  }
  function kwForget() { KW.tex = null; KW.dirty.length = 0; }   // (a lost context: the texture made again, whole, from the CPU's grids)
  /* the cubic B-spline (C2) over a grid, as the GLSL's: channel values and gradients; then the blend (kitW4's) */
  function bsw(f, o) { var f2 = f * f, f3 = f2 * f; o[0] = (1 - 3 * f + 3 * f2 - f3) / 6; o[1] = (4 - 6 * f2 + 3 * f3) / 6; o[2] = (1 + 3 * f + 3 * f2 - 3 * f3) / 6; o[3] = f3 / 6; }
  function bsd(f, o) { var f2 = f * f; o[0] = (-3 + 6 * f - 3 * f2) / 6; o[1] = (-12 * f + 9 * f2) / 6; o[2] = (3 + 6 * f - 9 * f2) / 6; o[3] = 3 * f2 / 6; }
  var BWX = [0, 0, 0, 0], BWZ = [0, 0, 0, 0], BDX = [0, 0, 0, 0], BDZ = [0, 0, 0, 0], KWO = new Float64Array(12), KBN = new Float64Array(12), KBF = new Float64Array(12);
  function bsGrid(far, x, z, out) {   // out: channel c's value, d/dx, d/dz at 3c .. 3c + 2
    var D = far ? KF.data : KW.data, N = far ? FN : KN, st = far ? FSTEP : KSTEP, cx = far ? KF.cx : KW.cx, cz = far ? KF.cz : KW.cz, hw = (far ? FSH : KSH) * st;
    var qx = clamp(x, cx - hw, cx + hw), qz = clamp(z, cz - hw, cz + hw);
    var tx = qx / st - 0.5, tz = qz / st - 0.5, ix = Math.floor(tx), iz = Math.floor(tz), fx = tx - ix, fz = tz - iz;
    if (KW.part && !far) for (var gb = -1; gb <= 2; gb++) for (var ga = -1; ga <= 2; ga++) kwEnsure(ix + ga, iz + gb);   // (fast500 B3: the CPU's reads while the first plan's rest is pending)
    bsw(fx, BWX); bsw(fz, BWZ); bsd(fx, BDX); bsd(fz, BDZ);
    out.fill(0);
    for (var b = 0; b < 4; b++) for (var a = 0; a < 4; a++) {
      var q = (kmod(iz - 1 + b, N) * N + kmod(ix - 1 + a, N)) * 4, w0 = BWX[a] * BWZ[b], wx = BDX[a] * BWZ[b] / st, wz = BWX[a] * BDZ[b] / st;
      for (var c = 0; c < 4; c++) { var v = D[q + c]; out[c * 3] += w0 * v; out[c * 3 + 1] += wx * v; out[c * 3 + 2] += wz * v; }
    }
    return out;
  }
  function sstepD(a, b, x) { var t = (x - a) / (b - a); return t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t) / (b - a); }
  /* the weights at (x, z) (KWO: wD, d/dx, d/dz; wC ...; the sea's level ...; the land's sink ...): KW near the camera,
     eased into KF and that into KW_FAR by the distance from the camera (the flight's: CS, as the GPU's is the drawn
     camera's, the same within a step) */
  function kwAt(x, z) {
    var ex = x - CS.x, ez = z - CS.z, dc = Math.sqrt(ex * ex + ez * ez), ux = dc > 1e-3 ? ex / dc : 0, uz = dc > 1e-3 ? ez / dc : 0;
    var kn = 1 - smooth(KN0, KN1, dc), kf = 1 - smooth(KF0, KF1, dc), dkn = -sstepD(KN0, KN1, dc), dkf = -sstepD(KF0, KF1, dc), c;
    if (kn >= 1) return bsGrid(false, x, z, KWO);
    for (c = 0; c < 4; c++) { KBF[c * 3] = KW_FAR[c]; KBF[c * 3 + 1] = 0; KBF[c * 3 + 2] = 0; }
    if (kf > 0) bsGrid(true, x, z, KBF);
    if (kn > 0) bsGrid(false, x, z, KBN);
    for (c = 0; c < 4; c++) {
      var vF = KBF[c * 3], vN = kn > 0 ? KBN[c * 3] : vF, vM = vF + (vN - vF) * kn;
      var gxM = KBF[c * 3 + 1] + ((kn > 0 ? KBN[c * 3 + 1] : KBF[c * 3 + 1]) - KBF[c * 3 + 1]) * kn + (vN - vF) * dkn * ux;
      var gzM = KBF[c * 3 + 2] + ((kn > 0 ? KBN[c * 3 + 2] : KBF[c * 3 + 2]) - KBF[c * 3 + 2]) * kn + (vN - vF) * dkn * uz;
      KWO[c * 3] = KW_FAR[c] + (vM - KW_FAR[c]) * kf; KWO[c * 3 + 1] = gxM * kf + (vM - KW_FAR[c]) * dkf * ux; KWO[c * 3 + 2] = gzM * kf + (vM - KW_FAR[c]) * dkf * uz;
    }
    return KWO;
  }
  /* the cloud sea's level and the land's sink, as the GLSL's (kitW4's derived channels) */
  function seaBaseAt(x, z) { return kwAt(x, z)[6]; }
  /* the climate the light reads: the cloud weight averaged over a disc of LIGHT_R about the camera (a pure function of
     where the camera is: no clock, no easing in time) */
  var LIGHT_R = [0, 350, 700], LIGHT_WT = [4, 1, 0.5];
  function lightWeight(x, z) {
    var s = 0, sw = 0;
    for (var r = 0; r < LIGHT_R.length; r++) {
      var n = r ? 8 : 1;
      for (var k = 0; k < n; k++) { var a = (k + 0.5 * r) / n * 2 * PI; s += kwAt(x + Math.sin(a) * LIGHT_R[r], z + Math.cos(a) * LIGHT_R[r])[3] * LIGHT_WT[r]; sw += LIGHT_WT[r]; }
    }
    return s / sw;
  }

