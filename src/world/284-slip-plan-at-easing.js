  /* ---------------------------------------------------------------- the slip: a plan at one easing, the controller's way */
  /* a plan at the easing ak (x the speed a second): its cost (the plan in hand's if kept); arrive: the arrival's line
     may be chosen (the first pass only) */
  function slipPlanA(V, S, ak, arrive) {
    var v = V.speed, a = ak * v, i, k, K = slipGather(V, S, 0), T = K * SLIP_DT;
    var e0 = S.latT - S.lat, dstop = S.sv * Math.abs(S.sv) / (2 * a * 0.72);
    if (!SPN) { if (Math.abs(e0) > Math.abs(dstop) + 0.5) S.latT = S.lat + dstop; S.latT2 = S.latT; S.tsw = -1; return 0; }   // (nothing on the way: the slip eased out where it is)
    // (the arrival: a line that meets a solid's own zone, and the view still wholly covered (the cloud or cover a visit
    // begins in, or the landing before its first frame): the camera comes out of it on the nearest clear line instead)
    if (arrive && S === CS && arrivalCovered(V)) {
      for (k = 0; k <= K; k++) SPX[k] = dstop * Math.min(1, k * SLIP_DT / 4);
      if (slipCost(V, K, 1e18) >= SLIP_WIN * 0.5) {
        var bo = 0, bc = 1e18, lad2 = SLIP_LAD2;
        K = slipGather(V, S, 430);   // (gathered once, wide; each line tried by its offset, SPOFF)
        for (k = 0; k <= K; k++) SPX[k] = 0;
        var O2 = nearObstaclesAt(V, S.x, S.z, 520, SLIP_O2);
        for (var j = 0; j < lad2.length * 2; j++) {
          var off = (j & 1 ? -1 : 1) * lad2[j >> 1]; SPOFF = off;
          if (solidAt(O2, S.x - Math.cos(S.psi) * off, S.y, S.z + Math.sin(S.psi) * off, 6)) continue;   // (never into a solid, even one it would climb)
          var cc = slipCost(V, K, bc) + Math.abs(off) * 2;
          if (cc < bc) { bc = cc; bo = off; }
          if (cc < SLIP_WIN * 0.01 + Math.abs(off) * 2) break;
        }
        SPOFF = 0;
        if (bo) { var rx = -Math.cos(S.psi) * bo, rz = Math.sin(S.psi) * bo; S.x += rx; S.z += rz; CSP.x += rx; CSP.z += rz; SIM.reseat = (SIM.reseat || 0) + 1; if (BIRDS) BIRDS.visit(V.k); }   // (the birds' sky begins again about the camera, as at the arrival)
        K = slipGather(V, S, 0); dstop = 0; S.sv = 0; S.latT = S.latT2 = S.lat; S.tsw = -1;
      }
    }
    // the candidates: the line held, the slip stopped, each constraint's two edges, a ladder
    var nc = 0; SPC[nc++] = e0; SPC[nc++] = dstop;
    var lad = SLIP_LAD;
    for (k = 0; k < lad.length; k++) { SPC[nc++] = lad[k]; SPC[nc++] = -lad[k]; }
    // (each edge of the SLIP_NC constraints met soonest, never two candidates within 4 m: the plan's work bounded)
    slipOrder(SPN); var ord = SPORD;
    for (var oi = 0; oi < Math.min(SPN, SLIP_NC); oi++) {
      i = ord[oi];
      for (var sd = -1; sd <= 1; sd += 2) {
        var cd = SPL[i] + sd * (SPLH[i] + 3), dup = false;
        for (k = 0; k < nc && !dup; k++) if (Math.abs(SPC[k] - cd) < 4) dup = true;
        if (!dup) SPC[nc++] = cd;
      }
    }
    var Lmax = SLIP_SPD[SLIP_SPD.length - 1] * v * T * 0.75, e2 = S.tsw > SIM.t ? S.latT2 - S.lat : e0, kw0 = S.tsw > SIM.t ? Math.round((S.tsw - SIM.t) / SLIP_DT) : K + 1;
    // the plan in hand (its second line too, if it has one), costed in full: kept unless another is clearly better
    var keep = 1e18, kt = SLIP_SPD.indexOf(S.vs / v);
    for (var t0 = 0; t0 < SLIP_SPD.length; t0++) if (Math.abs(SLIP_SPD[t0] * v - (S.vs || 0)) < 1e-6) kt = t0;
    if (kt >= 0) { slipTraj(K, S.sv, e0, e2, kw0, S.vs, a); keep = SLIP_SPDK[kt] + Math.abs(e2) + SLIP_KC * SLIP_SPD[kt] * Math.max(Math.abs(e0), Math.abs(e2)) / v + slipCost(V, K, 1e18); }
    var lim = keep * 0.85 - 150, best = 1e18, bd = e0, bd2 = e2, bk = kw0, bv = S.vs || SLIP_SPD[0] * v;
    for (var t = 0; t < SLIP_SPD.length; t++) {
      var c1 = SLIP_SPD[t], vs = c1 * v, pen = SLIP_SPDK[t];   // (over 7.4 deg of crab only to keep out of a solid's own zone)
      for (var c = 0; c < nc; c++) {
        var d = SPC[c]; if (Math.abs(d) > Lmax) continue;
        var cost = pen + Math.abs(d) + Math.abs(d - e0) + ((e0 > 10 && d < -10) || (e0 < -10 && d > 10) ? 300 : 0) + SLIP_KC * c1 * Math.abs(d) / v;
        if (cost >= Math.min(best, lim)) continue;
        slipTraj(K, S.sv, d, d, K + 1, vs, a);
        cost += slipCost(V, K, Math.min(best, lim) - cost);
        if (cost < Math.min(best, lim)) { best = cost; bd = d; bd2 = d; bk = K + 1; bv = vs; }
      }
    }
    // (no single line keeps out of every solid's own zone: two lines, the first past one of the solids met soonest (to
    // its centre), then another (the way between two mesas that overlap across the line but not along it: seed 20's
    // DUNES, 540 s). Rarely needed, so tried only then, and at four of the speeds)
    if (Math.min(best, keep) >= SLIP_WIN * 0.02) {
      var SP2 = SLIP_SP2;
      for (var oj = 0, nh = 0; oj < SPN && nh < 4; oj++) {
        i = ord[oj]; if (!(SPRI[i] > 0)) continue; nh++;
        var kw = Math.max(1, Math.min(K, Math.round(SPS[i] / (v * SLIP_DT))));
        for (var s1 = -1; s1 <= 1; s1 += 2) {
          var d1 = SPL[i] + s1 * (SPLH[i] + 3); if (Math.abs(d1) > Lmax) continue;
          for (var t2 = 0; t2 < SP2.length; t2++) {
            var tt = SP2[t2], c2 = SLIP_SPD[tt], vs2 = c2 * v;
            for (c = 0; c < Math.min(nc, 24); c++) {
              var dd = SPC[c]; if (Math.abs(dd) > Lmax) continue;
              var cost2 = SLIP_SPDK[tt] + Math.abs(dd) + Math.abs(d1 - e0) + SLIP_KC * c2 * (Math.abs(d1) + Math.abs(dd - d1)) / v;
              if (cost2 >= Math.min(best, lim)) continue;
              slipTraj(K, S.sv, d1, dd, kw, vs2, a);
              cost2 += slipCost(V, K, Math.min(best, lim) - cost2);
              if (cost2 < Math.min(best, lim)) { best = cost2; bd = d1; bd2 = dd; bk = kw; bv = vs2; }
            }
          }
        }
      }
    }
    if (best >= lim) return keep;   // (the plan in hand kept)
    S.latT = S.lat + bd; S.latT2 = S.lat + bd2; S.tsw = bk <= K ? SIM.t + bk * SLIP_DT : -1; S.vs = bv;
    return best;
  }
  /* the way the slip's controller flies (SPX[0..K], m to the right of the camera now, a sample every SLIP_DT s): toward
     d1, and from sample kw on toward d2, at vs */
  function slipTraj(K, sv, d1, d2, kw, vs, a) {
    var x = 0; SPX[0] = 0;
    for (var k = 1; k <= K; k++) {
      var d = k < kw ? d1 : d2;
      sv = slipCtl(sv, d - x, vs, a, SLIP_DT); x += sv * SLIP_DT; SPX[k] = x;
      if (k >= kw && Math.abs(d2 - x) < 0.05 && Math.abs(sv) < 0.02) { for (var k2 = k + 1; k2 <= K; k2++) SPX[k2] = x; break; }
    }
  }
