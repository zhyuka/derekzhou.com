  /* ---------------- a flight's shape: in the air, behind its leader ---------------- */

  /* a bird's place: lag behind the leader along the path, lat aside (level,
     at right angles to the path: for a crossing, nearer or farther), up */
  function member(F, lag, lat, rank) {
    var r = F.r, S = F.S, m = {
      lag: lag, lat: lat, up: 0, rank: rank, gain: Math.min(1.5, 1 + 0.1 * rank),
      d: (drawBird(r, S), measureBird3D(F.sort, F.span * (1 + SIZE_VAR * (r() * 2 - 1)), F.n0)),   // its own size (birds3d: its model's box; drawBird for its draws from the flight's stream alone, in their order: its 2D mark is not kept)
      /* its own drift about its place, its own wing-beat and glide */
      aL: pick(r, DRIFT_L) * F.span * F.loose, aP: pick(r, DRIFT_P) * F.span * F.loose * F.air, bKey: Math.floor(r() * NOISE_N), bT: pick(r, DRIFT_T) * F.loose,   // (a loose flock drifts wider, and as gently)
      f: F.f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: (S.bound ? 0.3 : 1) * r(), rest: r(), glide: pick(r, S.glide), bob: 0,
      w: null, stragL: 0, stragT0: 0, stragT: 1, swapT0: 0, swapT: 0, gT: 0, gT0: 0, lx: 0, ly: 0, s: null,
      x: 0, y: 0, n: F.n0, a: 1, nTry: 0
    };
    m.w = wingsOf(F, m); m.f = m.w.f;                    // (physics: its own measured wing; unlock() spreads a flight's rates evenly)
    return m;
  }
  /* (physics) a bird's own measured wing (BW.make), after its kind; its sink (the path's) and bound as before. o: the
     lab's options (spread, V, lead, lock) */
  function wingsOf(F, m, o) {
    var kind = kindOf(F), g = BW.make(F.r, kind, Object.assign({ rate: RATE_MODE, sched: SCHED_MODE, from: WING_FROM }, o || {}));
    var va = Math.sqrt(F.v * F.v * MPU * MPU + (FL.speed || 0) * (FL.speed || 0)), rho = GLIDE_RHO[F.sort] || 0.85;   // (round 3, step 2: its airspeed, m/s: its frame's pace and the camera's)
    return { gsr: !F.S.bound && !F.still && !F.soar ? GLIDE_SINK_K * va / (GLIDE_LD[F.sort] || 15) : 0, gld: !F.S.bound && !F.still && !F.soar && !F.place ? LAG_GAIN * (1 - rho) * va / MPU : 0, lmax: (F.n <= 1 ? LAG_SPANS_LONE : LAG_SPANS) * F.span,
             wing: g, f: g.f, sinks: !F.S.bound && !F.still, amp: GS_AMP * F.span * (F.air || 1),
             bound: !!F.S.bound, bAmp: F.S.bound ? pick(F.r, F.S.bound) * F.span : 0 };
  }
  /* a place's or a wheel's bird (no flight of its own): its wing, no sink */
  function placeWing(kind, r) { var g = BW.make(r, BW.LB.P.kinds[kind] ? kind : 'gull', { rate: RATE_MODE, sched: SCHED_MODE, from: WING_FROM }); return { wing: g, f: g.f, sinks: false, amp: 0, bound: false, bAmp: 0 }; }
  /* birds beating each on its own never fall into step: their rates spread evenly over the whole of the lab's SPREAD
     (+-3 %, the measured bird-to-bird spread), each from its own point in its day (the lab's flock); an ibis in a skein
     (a V, a J or an echelon) is drawn toward the spatial phase behind the bird ahead of it on its arm in wake bouts (the
     lab's lock: the distance between them, m, and their speed through the air, the camera's and its own) */
  function unlock(F) {
    var M = F.m, n = M.length, i, j, k, order = [], sp = [];
    for (i = 0; i < n; i++) order.push(i);
    for (i = n - 1; i > 0; i--) { j = Math.floor(F.r() * (i + 1)); k = order[i]; order[i] = order[j]; order[j] = k; }
    for (i = 0; i < n; i++) sp[order[i]] = n > 1 ? 2 * i / (n - 1) - 1 : undefined;
    var V = F.kind === 'skein' && F.sort === 'ibis', U = Math.sqrt(Math.pow(FL.speed || 12, 2) + Math.pow(F.v * MPU, 2));
    for (i = 0; i < n; i++) {
      var m = M[i], o = { spread: sp[i] };
      if (V) { o.V = true; if (i > 0) { var Ld = M[m.rank === 1 ? 0 : i - 1]; o.lead = Ld.w.wing; o.lock = { d: Math.max(0.5, Math.abs(m.lag - Ld.lag) * MPU), U: Math.max(5, U) }; } }
      m.w = wingsOf(F, m, o); m.f = m.w.f; m.delay = 0;
    }
  }

  /* the birds of a flight in their places behind the leader: never where
     a ruler would put them, and never still in them */
  function formation(F) {
    var r = F.r, n = F.n, sp = F.span, M = [], k, a, b, arm, dx, dy, u, rank, lag, lat, up, m, bow;
    function jit() { return r() * 2 - 1; }
    M.push(member(F, 0, 0, 0));
    if (F.kind === 'skein') {
      u = r();                                            // echelon, J or V (J's and echelons are the commoner in the wild)
      if (u < 0.3 || n === 2) { a = n - 1; b = 0; }
      else if (u < 0.65 && n >= 4) { a = Math.ceil((n - 1) / 2) + 1; b = n - 1 - a; }
      else { a = Math.ceil((n - 1) / 2); b = n - 1 - a; }
      if (F.cls !== 'day' && a > 5) { a = 5; b = n - 1 - a; }   // (life: at most five a leg)
      arm = r() < 0.5 ? 1 : -1;
      dx = pick(r, ARM_X) * sp * (2 - F.flat); dy = pick(r, ARM_Y) * sp * F.flat;   // (a narrow band: a flatter V)
      var VG0 = F.cls !== 'day' && V_GEOM[F.sort], JIT = VG0 ? JITTER_V : JITTER;
      if (VG0) { dx = pick(r, VG0.x) * sp * (1.25 - 0.25 * F.flat); dy = pick(r, VG0.y) * sp; }   // (fix: the V's width kept in a narrow band, its angle with it)   // (life: the goose's V narrower, the ibis's wider)
      bow = r() < 0.3;                                    // a U: the ranks near the apex closer in
      u = mix(r(), 0.3, 0.7);                             // the second arm a part of a place behind the first (no V is symmetric)
      for (k = 1; k < n; k++) {
        rank = k <= a ? k : k - a;
        lag = (rank + (k > a ? u : 0)) * dx * (bow ? 0.85 + 0.075 * rank : 1) * (1 + JIT * jit());
        lat = (k <= a ? arm : -arm) * (rank * dy * (1 + JIT * jit()) + 0.5 * JIT * sp * jit());
        m = member(F, lag, lat, rank);
        m.up = UP_V * sp * jit();                         // the V lies level in the air
        M.push(m);
      }
      if (!F.still && n >= 5 && a > b + 1 && r() < RESHUF) { m = M[a]; m.swapT = pick(r, RESHUF_T); m.swapT0 = mix(r(), 6, 22); m.shuf = true; }   // (round 3, step 3: a reshuffle now and then)
    } else if (F.kind === 'line') {
      dx = pick(r, FILE) * sp; lag = 0; lat = 0; up = 0;
      for (k = 1; k < n; k++) {
        lag += dx * (1 + 1.5 * JITTER * jit());           // uneven gaps ...
        up += FILE_Y * sp * jit();                        // ... and the line undulating in the air
        lat += 0.3 * FILE_Y * sp * jit();
        m = member(F, lag, lat, k);
        m.up = up;
        m.gain = Math.min(1.5, 1 + 0.07 * k);
        M.push(m);
      }
    } else if (F.kind === 'pair') {
      m = member(F, pick(r, PAIR_X) * sp, (r() < 0.5 ? 1 : -1) * pick(r, PAIR_Y) * sp, 1);   // one nearer, one farther
      m.up = 0.3 * sp * jit();
      m.gain = 1;
      if (!F.still && r() < 0.4) { m.swapT = pick(r, SWAP_T); m.swapT0 = mix(r(), 4, 14); }
      M.push(m);
    } else if (F.kind === 'loose' && F.cls !== 'day' && F.sort === 'crow') {
      /* (life) a loose flock built of pairs: the two of a pair side by side 0.8-1.4 spans apart, the pairs 2.7-4 spans
         from the next, the flock flat (wider than deep) */
      var pl = 0, pa = 0, ps = r() < 0.5 ? 1 : -1;
      for (k = 1; k < n; k++) {
        if (k % 2 === 1) { m = member(F, pl, pa + ps * pick(r, [0.8, 1.4]) * sp, k); m.up = 0.15 * sp * jit(); }
        else {
          for (u = 0; u < 60; u++) { var dd = pick(r, [2.7, 4.0]) * sp, an = (r() * 2 - 1) * 1.1; pl = Math.max(0.6 * sp, (k / 2) * 1.2 * sp + dd * Math.abs(Math.cos(an)) * 0.6); pa = dd * Math.sin(an) * 1.6 + 0.3 * jit() * sp; m = member(F, pl, pa, k); m.up = 0.25 * sp * jit(); if (fits(F, M, m, 0)) break; }
          ps = r() < 0.5 ? 1 : -1;
        }
        m.gain = 1; M.push(m);
      }
    } else if (F.kind === 'loose') {
      for (k = 1; k < n; k++) {
        m = member(F, 0, 0, k);
        m.gain = 1;
        for (u = 0; u < 80; u++) {                        // a cloud behind and about the leader, wider than tall
          m.lag = mix(r(), 0.8, 2 * Math.sqrt(n)) * sp;
          m.lat = jit() * 1.15 * Math.sqrt(n) * sp;
          m.up = jit() * 0.45 * Math.sqrt(n) * sp;
          if (fits(F, M, m, u < 40 ? pick(r, LOOSE) * sp - sp : 0)) break;
        }
        M.push(m);
      }
    }
    /* a straggler, now and then: the tail of a skein of five or more, catching up */
    if (F.kind === 'skein' && n >= 5 && !F.still && r() < 0.33) {
      m = M[0];
      for (k = 1; k < M.length; k++) if (M[k].lag > m.lag) m = M[k];
      m.stragT = pick(r, STRAGGLE_T); m.stragL = pick(r, STRAGGLE) * F.v * m.stragT / 1.5; m.stragT0 = mix(r(), 0, 6);   // (1.5: the ease's steepest)
    }
    return M;
  }
  /* now and then a skein crosses as a ragged file that fans out into its V
     (sideways first, then closing up, the front birds first), or a V that
     strings out into a file; a line as a bunch that strings out into single
     file, or the reverse: never through one another */
  function gatherOf(F) {
    var r = F.r, M = F.m, sp = F.span, i, m, tries, u = r(), order, acc, strag;
    if (F.still || F.calm || F.n < 3 || (F.kind !== 'skein' && F.kind !== 'line') || u >= GATHER + LOOSEN) return;
    F.loosen = u >= GATHER;
    strag = M.map(function (m) { var v = m.stragL; m.stragL = 0; return v; });   // (a gathering flight has no straggler: one change at a time)
    F.latFirst = F.kind === 'skein';
    order = M.slice(1).sort(function (a, b) { return a.lag - b.lag; });
    for (tries = 0; tries < 6; tries++) {
      acc = 0;
      for (i = 0; i < order.length; i++) {
        m = order[i];
        if (F.kind === 'skein') {                         // the file: one behind another, a little ragged
          acc += pick(r, FILE_G) * sp;
          m.lx = acc; m.ly = (r() * 2 - 1) * 0.25 * sp;
        } else {                                          // the bunch: closer, and spread either side
          m.lx = m.lag * mix(r(), 0.45, 0.65);
          m.ly = m.lat + (i % 2 ? 1 : -1) * mix(r(), 0.8, 1.2) * sp;
        }
        m.gT0 = i * pick(r, GATHER_AT);                   // the front birds first ...
        m.gT = Math.max(pick(r, GATHER_T), 2.2 * Math.max(Math.abs(m.lag - m.lx), Math.abs(m.lat - m.ly)) / (REL * F.v));   // ... none faster than REL of the flight's speed
      }
      if (order.every(function (m) { return m.gT <= GATHER_MAX; }) && fitsAll(F)) return;
      for (i = 1; i < M.length; i++) { M[i].lag *= 1.1; M[i].lx *= 1.1; }   // (a little more room, and again)
    }
    for (i = 1; i < M.length; i++) { M[i].gT = 0; M[i].lag /= Math.pow(1.1, tries); M[i].stragL = strag[i]; }   // no way keeps them apart: the pattern as it was
  }

  /* a bird's place in its flight (lag behind the leader, lat aside, up) at
     flight time tau: its slot, or on its way to it from the scatter, a
     straggler catching up, a pair changing sides */
  var sl = {};
  function slotAt(F, m, tau, o) {
    var lag = m.lag, lat = m.lat, q, a, b, e = tau - F.ev0;   // (the events keep the flight's own clock, from ev0)
    if (m.gT) {                                           // on its way between the scatter and its place: one way leads, the other follows
      q = clamp((e - m.gT0) / m.gT, 0, 1);
      if (F.loosen) q = 1 - q;                            // (loosening is gathering played backwards)
      a = ease(q / 0.7); b = ease((q - 0.3) / 0.7);
      lag = m.lx + (lag - m.lx) * (F.latFirst ? b : a); lat = m.ly + (lat - m.ly) * (F.latFirst ? a : b);
    }
    if (m.stragL) lag += m.stragL * (1 - ease((e - m.stragT0) / m.stragT));
    if (m.swapT) {                                        // back a span, across, and up again
      q = ease((e - m.swapT0) / m.swapT);
      lat *= Math.cos(Math.PI * q);
      lag += F.span * Math.sin(Math.PI * q);
      o.up = m.up + 1.2 * F.span * Math.sin(Math.PI * q);   // (birds3d: and over it: seen from behind, never through it on the window)
      o.lag = lag; o.lat = lat;
      return o;
    }
    o.lag = lag; o.lat = lat; o.up = m.up;
    return o;
  }
  /* the moments worth checking a flight's spacing at: before, through and after its events */
  function eventTimes(F) {
    var end = 0, i, m, T = [], e;
    for (i = 0; i < F.m.length; i++) {
      m = F.m[i];
      if (m.gT) end = Math.max(end, m.gT0 + m.gT);
      if (m.stragL) end = Math.max(end, m.stragT0 + m.stragT);
      if (m.swapT) end = Math.max(end, m.swapT0 + m.swapT);
    }
    for (e = -0.5; e <= end + 0.5; e += 0.5) T.push(F.ev0 + e);
    return T;
  }

  /* can bird m join the others in M (in their slots), ink never nearer than SPACE (+ extra) in the air? */
  function fits(F, M, m, extra) {
    for (var i = 0; i < M.length; i++) if (!pairFits(F, M[i], m, M[i].lag, M[i].lat, m.lag, m.lat, extra || 0, M[i].up, m.up)) return false;
    return true;
  }
  /* two birds at these places, whatever their drift, the wander, gusts, glides and bounds between them */
  function pairFits(F, a, b, la, ta, lb, tb, extra, ua, ub) {
    var v = F.v, dl = Math.abs(la - lb), dp = Math.sqrt((ta - tb) * (ta - tb) + (ua - ub) * (ua - ub)),
        gx = dl - a.d.hw - b.d.hw + (a.d.halo || 0) + (b.d.halo || 0) - a.aL - b.aL - (F.smA ? 1.9 * SURGE * dl : 0),   // (round 3, alive: the surge's ripple)
        gy = dp - a.d.hh - b.d.hh + (a.d.halo || 0) + (b.d.halo || 0) - a.aP - b.aP - BOB * Math.max(a.d.span, b.d.span) -
             F.wAmp * (Math.abs(a.gain - b.gain) + 2 * Math.max(a.gain, b.gain) * Math.min(1, TAU * dl / F.wLam)) -
             2 * F.hAmp * Math.min(1, TAU * dl / (v * F.hT)) -
             (a.w === b.w ? liftReach(a) * Math.min(1, dl / (v * 2)) : liftReach(a) + liftReach(b));
    return Math.max(gx, gy) >= SPACE / F.n0 + extra;
  }
  var slA = {}, slB = {};
  function fitsAll(F) {
    var M = F.m, T = eventTimes(F), x, i, j;
    for (x = 0; x < T.length; x++) {
      for (i = 0; i < M.length; i++) {
        slotAt(F, M[i], T[x], slA);
        for (j = i + 1; j < M.length; j++) {
          slotAt(F, M[j], T[x], slB);
          if (!pairFits(F, M[i], M[j], slA.lag, slA.lat, slB.lag, slB.lat, 0, slA.up, slB.up)) return false;
        }
      }
    }
    return true;
  }
  /* the whole flight keeps its birds apart: if not, its places are drawn out along the track */
  function spaced(F) {
    var M = F.m, i, tries;
    for (tries = 0; tries < 8; tries++) {
      if (fitsAll(F)) return true;
      for (i = 1; i < M.length; i++) { M[i].lag *= 1.12; M[i].lx *= 1.12; if (F.kind === 'skein' && F.cls !== 'day') { M[i].lat *= 1.12; M[i].ly *= 1.12; } }   // (fix: a skein drawn out whole, its V's angle kept)
    }
    return false;
  }

