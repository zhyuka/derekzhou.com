  /* ---------------- the wings ---------------- */

  /* a bird's day on the wing is the lab's (birdwing.js on labbird.js): its bouts of beats and its glides drawn
     from the measured schedules, its beat's period, its stroke and each bout's rate varying as measured, its rate its
     own. Its clock is the bird's own age: begun a second before the age it is made at (no history to replay), drawing
     from a stream of its own (seeded once from the bird's: when its wing is worked out changes no other draw) */
  function placeWing(kind, r, age, V) { var g = BW.make(sm32(Math.floor(r() * 4294967296) >>> 0), BW.LB.P.kinds[kind] ? kind : 'gull', { rate: RATE_MODE, sched: SCHED_MODE, from: age - 1, V: !!V }); return { wing: g, f: g.f, V: !!V }; }   // (V: in a skein or a line; an ibis then flies the ibis-in-a-V schedule)
  /* (physics: birds/phase) who beats with whom, measured: an ibis or a goose in a skein locks to the bird ahead on its own leg,
     at the spatial phase (f d / U - 0.18 cycle), and in a line to the bird directly ahead (lateral under half a span) in
     antiphase (+0.46), each in wake bouts (the lab's LOCK: 32 % of the time, median 2 s); gulls, loose flocks, pairs and
     singles beat free. Worked out once whenever the flock's birds change (F.lk), never a step */
  function inV(F) { return !!F && (F.pat === 'skein' || F.pat === 'line'); }
  function flockLocks(F) {
    F.lk = false;
    var lk = inV(F) && (F.kind === 'ibis' || F.kind === 'goose'), i, j, b, a, best;
    for (i = 0; i < F.m.length; i++) {
      b = F.m[i]; if (!b.w) continue; best = null;
      if (lk && b !== F.lead) for (j = 0; j < F.m.length; j++) {
        a = F.m[j]; if (a === b || !a.w || a.slot[0] >= b.slot[0]) continue;
        if (F.pat === 'skein' && a !== F.lead && (a.slot[1] > 0) !== (b.slot[1] > 0)) continue;   // (on its own leg)
        if (!best || a.slot[0] > best.slot[0]) best = a;
      }
      var col = F.pat === 'line', lat = best ? Math.abs(b.slot[1] - best.slot[1]) : 0;
      if (!best || (col && lat >= 0.5)) BW.relock(b.w.wing, null);
      else BW.relock(b.w.wing, best.w.wing, (b.slot[0] - best.slot[0]) * F.lead.sz, b.K.v, best.age - b.age, col ? 0.46 : -0.18);
    }
  }
