  /* ---------------------------------------------------------------- the weights' grids (KW near, KF far) */
  /* (world6; fix round) KW: KN x KN texels of KSTEP m, world-anchored (texel i at (i + 0.5) KSTEP), stored at i mod KN
     (toroidal) about the camera. KF, the far field: FN x FN texels of FSTEP m, the same way, in the texture's rows under
     KW's. Four channels each: wD and wC (raw, from the maps) and two derived from wC by construction: the cloud sea's
     level (its raw SEA_LO + RISE wC, taken from below) and the land's sink (its raw SINK wC, taken from above), each the
     L1 slope-bounded envelope of its raw values with KLIP m per m along each axis (a min-plus, or max-minus, of the texels
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
