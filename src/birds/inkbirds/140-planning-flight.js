  /* ---------------- planning a flight ---------------- */

  var flights = [], flightNo = 0;
  var r2 = vstream(2), r2k = 0, r2x = r2(), r2y = r2();
  function r2next(o) {                                     // the R2 low-discrepancy sequence: paths spread evenly over a visit
    r2k++;
    o.x = (r2x + r2k * 0.7548776662466927) % 1;
    o.y = (r2y + r2k * 0.5698402909980532) % 1;
    return o;
  }

  /* (round 3, step 1) can a bird of this kind fly a crossing at its calm pace in the air at hand (the camera's way less
     the wind, along the course), over its least airspeed (AIR_MIN)? */
  function airCrossOK(sort) {
    var S = SORTS[sort], am = AIR_MIN[sort];
    if (!S || !am || !WIND_ON || FORCED || !S.depth || !S.pace) return true;
    windNow();
    var yw = job && job.yaw !== undefined ? job.yaw : 0, along = (FL.speed || 0) - (Math.sin(yw) * WINDV[0] + Math.cos(yw) * WINDV[2]);
    var n0 = (S.depth[0] + S.depth[1]) / 2, px = SPAN * view * S.size * n0, vPx = clamp(soft(pace * px * (S.pace[0] + S.pace[1]) / 2 * calmOf(), topSpeed()), SPEED[0], SPEED[1]), vm = vPx / n0 * MPU;
    return Math.sqrt(vm * vm + along * along) >= am;
  }
  function airSort(r, sort, list) {
    if (!list || airCrossOK(sort)) return sort;
    for (var i = 0, s2; i < 4; i++) { s2 = weighted(r, list); if (airCrossOK(s2)) { STATS.airSort = (STATS.airSort || 0) + 1; return s2; } }
    return sort;
  }
  function newFlight(kind, n, dir, r, calm, flat, stillSky) {
    var LCf = !stillSky && job ? LIFE[job.cls] : null, sort = airSort(r, weighted(r, LCf && LCf.kinds[kind] && !(job && job.sortF) ? LCf.kinds[kind] : SORT_OF[kind]), LCf && LCf.kinds[kind] && !(job && job.sortF) && !stillSky ? LCf.kinds[kind] : null), S = SORTS[sort], F = {
      kind: kind, sort: sort, S: S, n: n, dir: dir, r: r, soar: null, cls: job && !stillSky ? job.cls : 'day', roost: !!(job && job.roost), m: null, path: null, w: null, q: 1, inS: 0,
      flat: flat ? 0.6 : 1, calm: !!calm, still: !!stillSky, loose: kind === 'loose' ? 1.4 : 1,
      t0: 0, s0: 0, sa: 0, len: 0, dur: 0, edges: 3, ev0: 0, from: 0, loosen: false, latFirst: false, n0: pick(r, S.depth),
      wKey: Math.floor(r() * NOISE_N), wLam: pick(r, WAVE) * (S.wave || 1),
      wAmp: mix(fBreeze, WANDER[0], WANDER[1]) * (kind === 'line' ? 1.3 : 1) * (S.wander || 1) * pick(r, [0.7, 1.1]),
      hKey: Math.floor(r() * NOISE_N), hT: pick(r, HEAVE_T), hAmp: mix(fBreeze, HEAVE[0], HEAVE[1]) * pick(r, [0.7, 1.1])
    };
    var v, g, px;
    /* (fix round) now and then a lone bird or a pair of the big kinds flies near (NEAR_N, under NEAR_MAX): at 40-55 px on
       a desktop its 3D (the beat in depth, the body, the set, the foreshortening as its way turns) reads at true size,
       where the everyday birds at 15-30 px read as marks */
    if ((kind === 'single' || kind === 'pair') && !stillSky && NEAR_SORTS[sort] && (NEAR_FORCE || r() < NEAR_SHARE)) { F.n0 = pick(r, NEAR_N); F.near = true; }
    if (calm) { F.wAmp *= 0.3; F.hAmp *= 0.3; }          // a narrow strip of sky: still air
    var wsR = job && !stillSky ? job.role : null, wsU = r(), wsV = r();   // (round 3: its own world speed)
    var wsKind = calm || stillSky ? 'hold' : wsR === 'stream' ? 'ahead' : wsR === 'counter' ? 'back' : wsR ? 'hold' : wsU < WS_DAY[0] ? 'ahead' : wsU < WS_DAY[0] + WS_DAY[1] ? 'hold' : 'back';
    F.ws = calm || stillSky ? 1 : mix(wsV, (wsKind === 'ahead' ? WS_AHEAD : wsKind === 'back' ? WS_BACK : WS_HOLD)[0], (wsKind === 'ahead' ? WS_AHEAD : wsKind === 'back' ? WS_BACK : WS_HOLD)[1]);
    F.wsKind = wsKind; F.wsK = Math.floor(r() * NOISE_N); F.wsT = pick(r, WS_T); F.wsA = calm || stillSky || wsKind !== 'hold' ? 0 : WS_WANDER;   // (the wander in spans: made air units below)
    F.wsX = 0; F.wsZ = 1; F.wsS = 0;
    F.smK = Math.floor(r() * NOISE_N); F.smT = pick(r, SURGE_T); F.smA = calm || stillSky ? 0 : SURGE * F.smT / 2.9;   // (round 3, alive: the pace's swing, in s of its own way)
    px = SPAN * view * S.size * F.n0;                     // its span on the window where it crosses: its kind's size, its distance
    F.span = px / F.n0;                                   // (in the air: px at nearness 1)
    v = pace * px * pick(r, S.pace);                      // in the wild: spans a second, about a span a beat ...
    F.vPx = clamp(soft(v * calmOf(), topSpeed()), SPEED[0], SPEED[1]);   // ... on the page slowed to its calm
    F.v = F.vw = F.vPx / F.n0;                            // (units of the air a second)
    F.f = BW.LB.rate(kindOf(F), RATE_MODE);               // (physics: the lab's rate; each bird's own about it)
    F.flaps = S.flaps && S.flaps[0][0] > 8 && F.vPx < 0.8 * px * F.f ? FLAPS_SLOW : S.flaps;   // held back: it glides between bursts ...
    g = Math.sqrt(clamp(v / F.vPx, 1, HOLD));             // ... and every kind glides the longer, the more it is slowed (HOLD here is the hold's state, var HOLD below, as it always was at this read: no upper bound applies; the old marks' 2.2, declared above it and overwritten, never did)
    if (F.flaps && !S.bound) F.flaps = [F.flaps[0], [F.flaps[1][0] * g, F.flaps[1][1] * g]];   // (not a finch's bound: its wings shut)
    F.air = Math.sqrt(Math.min(1, F.vPx / v));            // what moves it in seconds (a gust, its drift, a glide's sink) gentled
    F.hAmp *= F.air;                                      // as it is slowed, so its path turns no sharper for the slower pace
    F.wAmp /= F.n0; F.hAmp /= F.n0; F.wLam /= F.n0;       // (the wander and the gusts, px where it crosses: in the air)
    F.climb = (kind === 'single' || kind === 'pair') && (sort === 'gull' || sort === 'crow' || sort === 'swallow') && W >= SOAR_W && r() < 0.22;
    /* (physics) every bird beats each on its own (a line's wing-beats unlocked, as measured in geese, cranes and
       pelicans); an ibis skein's followers drawn toward the bird ahead's spatial phase in wake bouts (unlock) */
    if (kind === 'soar') return soarFlight(F);
    F.m = formation(F);
    F.d = F.m[0].d;
    if (!spaced(F)) return null;                        // the pattern keeps its birds apart ...
    gatherOf(F);                                          // ... and so does its gathering, if it gathers
    unlock(F);
    F.probe = probeOf(F);
    reachOf(F);
    return F;
  }
  /* how far a flight reaches above and below its leader on the window
     where it crosses (its places through its events, their drift, the
     wander, the gusts, the lift of its wings, the ink), px */
  function reachOf(F) {
    var lo = 0, hi = 0, i, m, y, b, T = eventTimes(F), x, n = F.n0;
    for (i = 0; i < F.m.length; i++) {
      m = F.m[i];
      b = (m.aP + F.wAmp * m.gain + m.d.hh + BOB * m.d.span + liftReach(m)) * n;
      for (x = 0; x < T.length; x++) {
        slotAt(F, m, T[x], sl);
        y = (Math.abs(sl.lat) + 0.5 * F.wAmp * m.gain) * cam.s * n;   // (aside is nearer or farther: higher or lower on the window)
        lo = Math.max(lo, sl.up * n + y + b); hi = Math.max(hi, -sl.up * n + y + b);
      }
    }
    F.lo = lo + F.hAmp * n; F.hi = hi + F.hAmp * n;
    /* (round 3, step 1) how much nearer (dzN, air units, <= 0) and farther (dzF) its birds stand than its leader once its
       figure is turned to its way through the air (spot()'s L4 turn, for a straight crossing at its pace and at half of
       it, the drift about their places included), and its biggest bird's ink and bob (air units) */
    var cs = (FL.speed || 0) / MPU, yw = job && job.yaw !== undefined ? job.yaw : 0, dps = (FL.psi || 0) - yw, wfx = 0, wfz = 0, dzN = 0, dzF = 0, ink = 0, chh = F.dir > 0 ? 1 : -1, j, c, ax, az, fz, dr;
    if (WIND_ON && !F.place && !F.still) { windNow(); wfx = (-Math.cos(yw) * WINDV[0] + Math.sin(yw) * WINDV[2]) / MPU; wfz = (Math.sin(yw) * WINDV[0] + Math.cos(yw) * WINDV[2]) / MPU; }
    for (j = 0; j < 2 && !F.place && !F.still; j++) {
      ax = F.v * (j ? 0.5 : 1) * chh - cs * Math.sin(dps) - wfx; az = cs * Math.cos(dps) - wfz;
      c = Math.atan2(chh * az, chh * ax);
      for (i = 0; i < F.m.length; i++) {
        m = F.m[i]; ink = Math.max(ink, m.d.hh + BOB * m.d.span); dr = m.aL + m.aP + (m.w && m.w.gld > 0 && !m.w.bound ? 0.4 * m.w.lmax : 0);   // (round 3, step 2: and its glide's lag, as far as it usually goes)
        for (x = 0; x < T.length; x++) { slotAt(F, m, T[x], sl); fz = -sl.lag * chh * Math.sin(c) + chh * sl.lat * Math.cos(c); dzN = Math.min(dzN, fz - dr); dzF = Math.max(dzF, fz + dr); }
      }
    }
    F.dzN = dzN; F.dzF = dzF; F.inkR = ink;
  }
  /* the birds that bound a formation (its leader, its tail, its outermost
     either side and above and below, through its events): a path is tried
     on these first, then on them all */
  function probeOf(F) {
    var M = F.m, i, x, T = eventTimes(F), out = [0], ex = [0, 0, 0, 0, 0], who = [0, 0, 0, 0, 0];
    for (i = 1; i < M.length; i++) for (x = 0; x < T.length; x++) {
      slotAt(F, M[i], T[x], sl);
      if (sl.lat < ex[0]) { ex[0] = sl.lat; who[0] = i; }
      if (sl.lat > ex[1]) { ex[1] = sl.lat; who[1] = i; }
      if (sl.lag > ex[2]) { ex[2] = sl.lag; who[2] = i; }
      if (sl.up < ex[3]) { ex[3] = sl.up; who[3] = i; }
      if (sl.up > ex[4]) { ex[4] = sl.up; who[4] = i; }
    }
    who.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  /* the soaring birds' flight: which way in, where the thermal is, which way out */
  function soarFlight(F) {
    var r = F.r, S, R, T, i, m, M = [], n = F.n, top = topSpeed() / F.n0;
    R = clamp(38 + 0.05 * W, SOAR_R[0], SOAR_R[1]) * pick(r, [0.9, 1.1]) / F.n0;
    T = pick(r, LAP);
    if (TAU * R / T > top) R = top * T / TAU;
    S = F.soar = {
      R: R, om: (r() < 0.5 ? 1 : -1) * TAU / T, T: T, drift: pick(r, WIND) / F.n0, rise: pick(r, RISE) / F.n0,
      laps: Math.round(pick(r, LAPS)), dirIn: F.dir, dirOut: r() < 0.55 ? F.dir : -F.dir,
      descent: pick(r, DESCENT), cx: 0, cy: 0, cz: 0, tj0: 0, thj: 0, thx: 0, top: top
    };
    S.sense = S.om > 0 ? 1 : -1;
    S.thj = S.dirIn === S.sense ? -Math.PI / 2 : Math.PI / 2;    // the near side of the ring, or the far: where it runs the way the bird comes in
    S.thx = S.dirOut === S.sense ? -Math.PI / 2 : Math.PI / 2;   // ... and where it runs the way the bird will leave
    for (i = 0; i < n; i++) {
      m = member(F, 0, 0, i);
      m.R = R * (i === 1 ? 0.88 : i === 2 ? 1.1 : 1);
      m.gap = i ? (i * T / n) * pick(r, [0.94, 1.06]) : 0;       // they join the thermal a share of a lap apart ...
      M.push(m);                                                 // ... and hold their wings out, but for a few beats
    }
    F.m = M;
    F.d = M[0].d;
    F.edges = 3;
    F.probe = M.map(function (m, i) { return i; });
    F.lo = 0;
    for (i = 0; i < n; i++) F.lo = Math.max(F.lo, (0.55 * M[i].R + M[i].d.hh + BOB * M[i].d.span) * F.n0);   // (the ring seen from below)
    F.hi = F.lo;
    F.lo += S.rise * F.n0 * T * (S.laps + 1);             // (and climbing as it circles)
    return F;
  }
  /* put a soaring flight's thermal at (cx, cy, cz) in the air and time its birds' glides, laps and leaving */
  function soarTimes(F, cx, cy, cz) {
    var S = F.soar, M = F.m, i, m, d, lo, hi, mid, turn, n, entry;
    S.cx = cx; S.cy = cy; S.cz = cz;
    turn = ((S.thx - S.thj) * S.sense % TAU + TAU) % TAU;
    for (i = 0, lo = hi = S.top; i < M.length; i++) {
      m = M[i];
      m.vj = Math.abs(S.om) * m.R + S.drift;                   // at the join: the ring's speed and the drift together
      m.vx = Math.abs(S.om) * m.R + S.dirIn * S.dirOut * S.drift;
      lo = Math.min(lo, GLIDE_V * m.vj); hi = Math.min(hi, GLIDE_V * m.vx);
    }
    for (i = 0; i < M.length; i++) { M[i].vIn = lo; M[i].vOut = hi; }   // all glide in and away at one pace: one by one, none catching another
    /* the first bird enters from beyond the edge at the start: how long its glide in takes */
    m = M[0];
    n = cam.f / (cy * cam.s + (cz + m.R * Math.sin(S.thj)) * cam.c);   // (its nearness on the way in)
    entry = ((S.dirIn > 0 ? -OUT : W + OUT) - cam.x0) / n;
    d = Math.abs(cx + m.R * Math.cos(S.thj) - entry);
    lo = 0; hi = 600;
    while (hi - lo > 0.01) { mid = (lo + hi) / 2; if (glideDist(mid, m.vj, m.vIn) < d) lo = mid; else hi = mid; }
    S.tj0 = lo;
    for (i = 0; i < M.length; i++) {
      m = M[i];
      m.tj = S.tj0 + m.gap;
      m.jx = cx + S.dirIn * S.drift * (m.tj - S.tj0) + m.R * Math.cos(S.thj);
      m.jy = cy + S.rise * (m.tj - S.tj0);
      m.jz = cz + m.R * Math.sin(S.thj);
      m.tx = m.tj + (S.laps * TAU + turn) / Math.abs(S.om);
      m.xx = cx + S.dirIn * S.drift * (m.tx - S.tj0) + m.R * Math.cos(S.thx);
      m.xy = cy + S.rise * (m.tx - S.tj0);
      m.xz = cz + m.R * Math.sin(S.thx);
      m.delay = 0;   // (physics: its wing the lab's measured stork, bouts and glides as the CC0 tags give them, thermals included)
      lo = 0; hi = 600;                                   // (gone: beyond the far edge, or into the distance)
      while (hi - lo > 0.05) {
        mid = (lo + hi) / 2; away(S, m, mid, st); proj(st.x, st.y, st.z, pp);
        if (pp.n >= FAR && (S.dirOut > 0 ? pp.x - m.d.hw * pp.n < W + 2 : pp.x + m.d.hw * pp.n > -2)) lo = mid; else hi = mid;
      }
      m.done = m.tx + hi;
    }
    F.dur = 0;
    for (i = 0; i < M.length; i++) F.dur = Math.max(F.dur, M[i].done);
    F.edges = (S.dirIn > 0 ? 1 : 2) | (S.dirOut > 0 ? 2 : 1);
  }

  /* where the other flights' birds will be at step k from sky time A.t1:
     worked out when a trial first needs it, and kept for the job's other paths */
  /* (aheadRow: the module's, i5_plan.js) */

  /* a flight's pace on its path: its kind's, but never so quick where it
     passes nearest that it rushes across the window, and never growing or
     shrinking (coming nearer, going away) faster than GROW or SHRINK a
     second; a path that would slow it by more than half: not this one */
  function paced(F) {
    var a = entering(F), b = leaving(F), ds = Math.max(4, (b - a) / 24), s, e, sig = 0, slow = Infinity, gr = 0, sh = 0, tr = 0, x0, y0, n0, d, g, g0 = NaN, L = 0, i, k, seen = Infinity;
    path3(F, F.sa + a, wp); proj(wp.x, wp.y, wp.z, pp); x0 = pp.x; y0 = pp.y; n0 = pp.n;
    for (s = a + ds; s <= b + 1e-6; s += ds) {
      path3(F, F.sa + s, wp); proj(wp.x, wp.y, wp.z, pp);
      d = Math.sqrt((pp.x - x0) * (pp.x - x0) + (pp.y - y0) * (pp.y - y0)) / ds;   // px on the window a unit of path
      sig = Math.max(sig, d); slow = Math.min(slow, d);
      e = Math.log(pp.n / n0) / ds; gr = Math.max(gr, e); sh = Math.max(sh, -e);
      x0 = pp.x; y0 = pp.y; n0 = pp.n;
    }
    for (i = 0; i < F.m.length; i++) L = Math.max(L, Math.abs(F.m[i].lat), Math.abs(F.m[i].ly || 0));
    L += DRIFT_P[1] * F.span;
    for (k = -1; k <= 1; k++) {                           // how fast the way it runs on the window turns, a unit of path: the leader's,
      g0 = x0 = NaN;                                      //  and a bird at either side of the flight's widest (perspective turns them unalike)
      for (s = Math.max(0, a - L - ds); s <= Math.min(F.len, b + L + ds) + 1e-6; s += ds / 2) {
        path3(F, F.sa + s, wp); proj(wp.x - Math.sin(wp.h) * k * L, wp.y, wp.z + Math.cos(wp.h) * k * L, pp);
        if (!(pp.n > 0 && fadeFor(F, pp.n) >= 0.02 && inView(pp.x, pp.y, 0, 0))) { g0 = x0 = NaN; continue; }
        if (x0 === x0) {
          d = Math.sqrt((pp.x - x0) * (pp.x - x0) + (pp.y - y0) * (pp.y - y0)) / (ds / 2); seen = Math.min(seen, d);
          g = Math.atan2(pp.y - y0, pp.x - x0);
          if (g0 === g0) { g0 = g - g0; tr = Math.max(tr, Math.abs(Math.atan2(Math.sin(g0), Math.cos(g0))) / (ds / 2)); }
          g0 = g;
        }
        x0 = pp.x; y0 = pp.y;
      }
    }
    F.v = Math.min(F.vw, 0.92 * topSpeed() / (sig || 1), gr > 0 ? GROW_K * GROW / gr : Infinity, sh > 0 ? 0.9 * SHRINK / sh : Infinity, tr > 0 ? TURN_SEEN * DEG / tr : Infinity);
    F.vLim = Math.min(gr > 0 ? GROW_K * GROW / gr : Infinity, sh > 0 ? 0.9 * SHRINK / sh : Infinity, tr > 0 ? TURN_SEEN * DEG / tr : Infinity); F.vSig = sig;   // (round 3)
    F.q = F.v / F.vw * Math.min(1, Math.min(slow, seen) / F.n0);   // what moves it in seconds, gentled as far again, and as far as any bird of it is seen slower where it heads away: its path turns no sharper
    return F.v >= 0.45 * F.vw && F.v * slow >= SLOWEST;   // (and never so far off and slow that it seems to hang still)
  }
  /* the leader where it is in view: never growing or shrinking faster
     than GROW or SHRINK a second, nor rushing across the window */
  function steady(F, tau) {
    var s = F.sa + F.s0 + F.v * tau, e, v, x, y, n;
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    if (pp.n < (F.fadeS ? F.fadeS[1] : FADE) || !inView(pp.x, pp.y, 0, 0)) return true;
    x = pp.x; y = pp.y; n = pp.n;
    path3(F, s + F.v * 0.5, wp); proj(wp.x, wp.y, wp.z, pp);
    e = Math.log(pp.n / n) / 0.5;
    v = Math.sqrt((pp.x - x) * (pp.x - x) + (pp.y - y) * (pp.y - y)) / 0.5;
    return e <= GROW_K * GROW / 0.9 && e >= -SHRINK && v <= 1.1 * topSpeed();
  }

  /* fly a planned flight forward in thought, from flight time it.from to its
     end: every bird (only its bounding birds, on the probe pass) at its
     nearness clear of the words, inside the edges it does not cross, never
     too near, never on top of another of its flight on the window, and
     APART from the other flights. Worked in slices of `budget` bird-steps:
     0 while unfinished, 1 when clear all the way (it.near its room: the
     more, the calmer), -1 */
  /* (trialRun: the module's, i5_plan.js) */
  /* (trialIt: the module's, i5_plan.js) */
  /* the whole trial at once (a flight re-checked after the page moved) */
  /* (trial: the module's, i5_plan.js) */

  /* how far along its path a flight's leader is when it first comes into
     view, and when it is last in view (worked out once a path) */
  /* (entering: the module's, i5_plan.js) */
  function leaving(F) { entering(F); return F.leS; }
  function inSight(F, s) {
    path3(F, F.sa + s, wp); proj(wp.x, wp.y, wp.z, pp);
    return fadeFor(F, pp.n) >= 0.02 && inView(pp.x, pp.y, F.d.hw * pp.n, F.d.hh * pp.n);
  }
  function farOf(F) { return F.fadeS ? F.fadeS[0] : FAR; }   // (birds3d: a staged flight's own distance fade)
  function allInView(F, tau) {
    for (var i = 0, d; i < F.m.length; i++) {
      spot(F, F.m[i], tau, tmp); d = F.m[i].d;
      if (tmp.a < 0.99 || tmp.x - d.hw * tmp.n < 0 || tmp.x + d.hw * tmp.n > W || tmp.y - d.hh * tmp.n < 0 || tmp.y + d.hh * tmp.n > H) return false;
    }
    return true;
  }
  /* the flight's events (a scatter gathering, a straggler, a pair changing
     sides) begin a little after its leader comes into view */
  function placeEvents(F) {
    var a = entering(F), span = Math.max(1, (leaving(F) - a) / F.v), start = (a - F.s0) / F.v;
    F.ev0 = F.still ? -1e4 : start + span * mix(F.r(), 0.08, 0.25);
  }
  function snapshot(F, from) {
    return { path: F.path, dir: F.dir, sa: F.sa, len: F.len, v: F.v, q: F.q, s0: F.s0, dur: F.dur, edges: F.edges, from: from, ev0: F.ev0, n0: F.n0, vw: F.vw, vPx: F.vPx, lean: F.lean, tat: F.tattoo, vLim: F.vLim, vSig: F.vSig,   // (way-path: its nearness and pace as proposed: a lean crossing's own) (shape: and its own calm bounds, vLim and vSig: the guard's pace changes read them)
             soar: F.soar ? JSON.parse(JSON.stringify(F.soar)) : null,
             m: F.m.map(function (m) {
               var c = {}, k;
               for (k in m) if (k !== 'w' && k !== 's' && k !== 'd') c[k] = m[k];
               return c;
             }) };
  }
  function restore(F, k) {
    F.path = k.path; F.dir = k.dir; F.sa = k.sa; F.len = k.len; F.v = k.v; F.q = k.q; F.s0 = k.s0; F.dur = k.dur; F.edges = k.edges; F.from = k.from; F.ev0 = k.ev0;
    if (k.n0 !== undefined) { F.n0 = k.n0; F.vw = k.vw; F.vPx = k.vPx; F.lean = k.lean; F.tattoo = k.tat; }
    if (k.vLim !== undefined) { F.vLim = k.vLim; F.vSig = k.vSig; }   // (shape) the kept path's own bounds: the last proposal's were left here, and the guard sped a lean crossing paced down for its looming to 1.33 of its proposed pace (growth 2.0 %/s, desk seed 7)
    F.yLo = k.yLo; F.yHi = k.yHi; F.xLo = k.xLo; F.xHi = k.xHi;
    if (k.soar) F.soar = k.soar;
    F.m.forEach(function (m, i) { var c = k.m[i], p; for (p in c) m[p] = c[p]; });
  }

  /* how many birds: 1-9 by COUNT (a lively visit leaning larger), never
     four, and never making four with any of the flights in the sky (so
     none can leave four behind when it goes) */
  function makesFour(n, counts) {
    var sums = [0], i, j;
    for (i = 0; i < counts.length; i++) for (j = sums.length - 1; j >= 0; j--) sums.push(sums[j] + counts[i]);
    for (i = 0; i < sums.length; i++) if (n + sums[i] === 4) return true;
    return false;
  }
  function drawCount(r, free, counts) {
    var tries, u, n, acc, i, tot, w = [];
    for (i = 0, tot = 0; i < COUNT.length; i++) { w.push(COUNT[i] * (1 + 0.5 * (fTraffic - 0.5) * (i - 3) / 4)); tot += w[i]; }
    for (tries = 0; tries < 12; tries++) {
      u = r() * tot; acc = 0; n = 1;
      for (i = 0; i < w.length; i++) { acc += w[i]; if (u < acc) { n = i + 1; break; } }
      n = Math.min(n, free);
      if (!makesFour(n, counts)) return n;
    }
    return makesFour(1, counts) ? 0 : 1;
  }
  function drawKind(r, n) {
    var u = r(), wide = W >= SOAR_W;
    if (n === 1) return wide && u < 0.25 ? 'soar' : 'single';
    if (n === 2) return wide && u < 0.15 ? 'soar' : 'pair';
    if (n === 3 && wide && u < 0.1) return 'soar';
    if (u < 0.55) return 'skein';                         // V's, J's and echelons: the flight everyone knows
    if (u < 0.8 || n > 6) return 'line';
    return 'loose';
  }

