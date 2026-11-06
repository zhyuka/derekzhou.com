  /* ---------------- the planner in the turning world (round 2) ---------------- */

  /* The live planner's own functions (above, carried over) decide a flight's kind, its birds, its path in the air, its
     pace and its calm, all in the still view (the camera as it will be when the flight sets off, held still: against
     the world). These, in place of the live's of the same names, fly each path through the coming view as well (the
     camera's predicted turn, pitch and roll): where its birds will be seen, so that they come into view only across an
     edge or out of the distance (never in view as the flight is made), keep clear of the edges and the other flights
     there, are seen long enough to be worth the sky, and are not lost behind cloud or the land; and work out a
     path's extent in coarse steps then halves (round 1's 4 px steps made one path's working-out 1200 bird-steps in a
     single step) */
  var pv = {}, pv2 = {}, PW = {};
  var SWEEP_GIVE = 0.7;        // (round 3) a flight going the way of the view's coming turn slows by this share of the turn's sweep ...
  var SWEEP_UP = 0;            // ... and one against it quickens by this share (tried at 0.7: when the turn then reversed, it raced: 55-60 px/s at 1440)
  var FLIP = 0.6;              // (round 3) a flight goes the way of the view's coming turn when it sweeps the land faster than this share of its own pace (round 2: 0.35)

  /* from the path's point out along it (sg: +1 ahead, -1 back) until its leader is OUT beyond the window, gone into the
     distance or below the window's sill: how far that is; null if it would pass behind the eye, come too near in view
     or go under the floor in view. Steps of about 16 px on the window, then the crossing found by halves */
  function walkAt(F, s) {
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    if (!(pp.n > 0)) return 1;                            // behind the eye
    if (pp.n > NEAR_MAX && inView(pp.x, pp.y, 0, 0)) return 1;   // too near, in view
    if (wp.y <= floorY) return pp.y > H ? 2 : 1;          // down to the floor: gone below the window's sill, or not a path
    if (pp.n < farOf(F)) return 2;                        // gone into the distance
    if (pp.x < -OUT || pp.x > W + OUT || pp.y < -OUT || pp.y > H + OUT) return 2;
    return 0;
  }
  function walk(F, sg) {
    var s = 0, s0 = 0, i, r, b, lo, hi, mid;
    pp.n = 0;
    for (i = 0; i < 1500; i++) {
      s0 = s; s += sg * 16 / Math.max(0.3, pp.n || F.n0);
      r = walkAt(F, s);
      if (r === 1) return null;
      if (r === 2) {
        lo = s0; hi = s;
        for (b = 0; b < 6; b++) { mid = (lo + hi) / 2; r = walkAt(F, mid); if (r === 1) return null; if (r === 2) hi = mid; else lo = mid; }
        return hi;
      }
    }
    return null;
  }
  /* how far along its path a flight's leader is when it first comes into view, and when it is last in view (the still
     view; worked out once a path, in coarse steps then halves) */
  function sightEdge(F, from, to, sg) {
    var s = from, prev = from, k, b, lo, hi, mid;
    pp.n = F.n0;
    for (k = 0; k < 1500; k++) {
      if (inSight(F, s)) break;
      prev = s; s += sg * 16 / Math.max(0.3, pp.n || F.n0);
      if ((s - to) * sg > 0) return to;
    }
    if (k === 0) return s;
    lo = prev; hi = s;
    for (b = 0; b < 5; b++) { mid = (lo + hi) / 2; if (inSight(F, mid)) hi = mid; else lo = mid; }
    return hi;
  }
  function entering(F) {
    if (F.inS === F.path) return F.enS;
    F.enS = Math.min(sightEdge(F, 0, F.len, 1), F.len);
    F.leS = Math.max(sightEdge(F, F.len, 0, -1), F.enS); F.inS = F.path;
    return F.enS;
  }

  /* where the other flights' birds will be seen at sample k of the coming view (each through its own frame): worked out
     when a trial first needs it, and kept for the job's other paths */
  function aheadRow(A, k) {
    var row = A.rows[k], i, j, G, tau, d;
    if (row) return row;
    row = A.rows[k] = [];
    if (VP.t0 + k * STEP > A.until) return row;
    viewNeed(k);
    for (i = 0; i < flights.length; i++) {
      G = flights[i];
      tau = VP.t0 + k * STEP - G.t0;
      if (tau > G.dur || G.gone) continue;
      viewAtK(G, k);
      for (j = 0; j < G.m.length; j++) {
        spot(G, G.m[j], tau, tmp2);
        A.cost++;
        projV(tmp2.ax, tmp2.ay, tmp2.az, pv2);
        d = G.m[j].d;
        if (pv2.n > 0 && fadeOf(pv2.n) >= 0.02 && inView(pv2.x, pv2.y, d.hw * pv2.n, d.hh * pv2.n)) row.push(pv2.x, pv2.y, d.hw * pv2.n, d.hh * pv2.n, i);
      }
    }
    return row;
  }

  /* fly a planned flight forward in thought through the coming view, a sample (STEP) at a time from the job's start:
     its calm against the world (the live's checks, in the still view: never too quick, growing or shrinking too fast,
     nor any bird turning too sharply), and where it is seen (the coming view): never in view as it is made, in view by
     it.enterBy after it sets off, every bird at its nearness inside the edges it does not cross,
     never too near, never on top of another of its flight, APART from the other flights; done once it has been seen
     at least it.seenMin and none of it has been in view for LEAVE_T (the view turned from it, or it left), or at the
     course's end. Worked in slices of `budget` bird-steps: 0 while unfinished, 1 when clear all the way (it.near its
     room: the more, the calmer), -1 (it.why: what failed) */
  function pfail(J, why) { if (HOST.dev) J.why['p.' + why] = (J.why['p.' + why] || 0) + 1; return false; }
  function fail(it, why) { it.why = why; STATS.fails[why] = (STATS.fails[why] || 0) + 1; if (job && HOST.dev) job.why[why] = (job.why[why] || 0) + 1; if (job) { job.nf = (job.nf || 0) + 1; if (why === 'hidden') job.nh = (job.nh || 0) + 1; } return -1; }
  function jobLog(J, F) {   // (development: what each job tried and how it ended)
    if (!HOST.dev) return;
    STATS.jobs.push({ t: +t.toFixed(2), mode: J.mode, ok: !!F, kind: F ? F.kind + ':' + F.sort + ':' + F.n : null, sweep: Math.round(J.sweep || 0), c: J.c, a: J.a, oi: J.oi, why: J.why, far: F ? !!F.farIn : false });
    if (STATS.jobs.length > 60) STATS.jobs.shift();
  }
  function trialRun(F, it, A, budget) {
    var M = F.m, probe = it.probe ? F.probe : null, cnt = probe ? probe.length : M.length, bx = it.bx, wv = it.wv, wt = it.wt, fc = it.fc,
        w0 = work, i, j, m, row, g, gx, gy, e, tau, hw, hh, sw, sh, tp = it.tp, turns = !F.soar && !F.still, any, trust = true, hk,
        calm = !F.soar && !F.still && !it.live && !!HOST.calm, pmax = paceMax(), ox, oy, wx, wy, own;   // (an engine without the calm (HOST.calm) turns as it will: its turn cannot be planned round, and round 2's still-view calm is all there is)
    it.spent = 0;
    if (WIND_ON && !F.place) { windNow(); var wcy = F.cyw === undefined ? 1 : F.cyw, wsy = F.syw === undefined ? 0 : F.syw; WF[0] = (-wcy * WINDV[0] + wsy * WINDV[2]) / MPU; WF[2] = (wsy * WINDV[0] + wcy * WINDV[2]) / MPU; } else WF[0] = WF[2] = 0;   // (way-other: the wind in the flight's frame, air units a second)
    for (;;) {
      tau = it.from + it.k * STEP;
      it.spent = work - w0;                               // (every point of a path worked out: its own birds', the other flights', the course's)
      if (it.spent >= budget) return 0;
      if (tau > it.until) {
        if (!it.live && !probe && !F.soar && !F.still && F.m.length > 1 && it.enter > -1e8 && !it.tailOk) {   // (round 3, step 1: its own spacing to its end)
          var rt = spaceTail(F, it, budget - (work - w0));
          if (rt === 0) { it.spent = work - w0; return 0; }
          if (rt < 0) return fail(it, 'spaceT');
          it.tailOk = true;
        }
        it.end = tau; it.capped = it.last >= tau - 3 * STEP; if (sideOn(it)) return fail(it, 'sideon'); return it.enter > -1e8 || it.live ? 1 : fail(it, 'never');
      }   // (capped: still seen as the trial ends)
      if (!F.soar && tau >= 0 && !steady(F, tau)) return fail(it, 'calm');
      viewNeed(it.k0 + it.k);
      row = A ? aheadRow(A, it.k0 + it.k) : null;
      viewAtK(F, it.k0 + it.k);
      /* (round 3) how far ahead the course is here: the trusted course */
      hk = (it.k0 + it.k) * STEP;
      trust = it.live || hk <= trustT();
      /* (round 3) the course turning harder than the calm lets the autopilot (a solid's or a cloud's way round, which the
         engine's forecast now flies too): the world's own turn, not this path's, sweeps its birds then; the calm on the
         window is judged where the view keeps the calm (refusing every path through such a turn left DUNES s21's sky
         empty for its first 13 s) */
      var vi = Math.min(Math.max(it.k0 + it.k, 1), VP.n - 1), hard = !VP.still && VP.n > 1 && Math.abs(angDiff(VP.yaw[vi], VP.yaw[vi - 1])) / STEP > CALM_SKIP * calmBase();
      any = false;
      for (i = 0; i < cnt; i++) {
        m = M[probe ? probe[i] : i];
        bx[4 * i] = NaN;
        spot(F, m, tau, tmp);                              // (its place in the air, and in the still view)
        var hdg = wp.h;                                     // (birds3d: its way in the air, for the side-on gate)
        /* (way-other) in a crosswind, no readable bird crosses the window downwind: slower than the wind its body would face
           upwind while it slid the other way (backward), and its pace is set after the trial (paced) and changes in
           flight; flights cross upwind, or hang in the wind (the path's own way, known exactly: no course needed) */
        if (WIND_ON && !F.place && !F.soar && !F.still && WF[0] !== 0 && Math.abs(WF[0]) * MPU >= WIND_SIDE) {
          if (!it.wpx) it.wpx = new Float64Array(3 * MAXP).fill(-9);
          var okw = it.k > 0 && it.wpx[3 * i + 2] === it.k - 1, pxw = it.wpx[3 * i], pzw = it.wpx[3 * i + 1]; it.wpx[3 * i] = tmp.ax; it.wpx[3 * i + 1] = tmp.az; it.wpx[3 * i + 2] = it.k;
          if (okw && tau >= 0) {   // (W5: its own way across the frame from its places a step apart, as it will be flown: the path's speed alone missed a goose skein crossing downwind at 3.9 m/s)
            var oxw = (tmp.ax - pxw) / STEP, ozw = (tmp.az - pzw) / STEP, axw = oxw - WF[0], azw = ozw + (FL.speed || 0) / MPU - WF[2], frw = axw * PV.cd + azw * PV.sd, mvw = oxw * PV.cd + ozw * PV.sd;
            if (mvw * frw < 0 && Math.abs(frw) > FACE_SIN * Math.sqrt(axw * axw + azw * azw) && Math.abs(mvw) * tmp.n > BACK_PX && fadeOf(tmp.n) > 0.02) return fail(it, 'back');   // (round 3, alive: only a body yawed past FACE_SIN toward the side it slides from faces back; a downwind crossing is no longer refused as such)   // (shape: from the moment it is in the air at all, not only once it is 0.3 seen: the trial ends with the trusted course, and an ibis line out of the distance, faded under 0.3 through it, slid backward at 18 px/s for 35 s after it, desk seed 3)
          }
        }
        if (tmp.x !== tmp.x || tmp.y !== tmp.y) return fail(it, 'nan');
        /* the calm against the world: never turning sharply on the window, all it does in seconds and all (but a
           finch's bound), where the still view sees it */
        sw = m.d.hw * tmp.n; sh = (m.d.hh + BOB * m.d.span) * tmp.n;
        if (turns && !m.w.bound && tau >= 0 && tmp.a >= 0.02 && inView(tmp.x, tmp.y, sw, sh)) {
          j = 5 * i; gx = tmp.x - tp[j]; gy = tmp.y - tp[j + 1];  // (the way it went since it last moved half a px, and when: the middle of that)
          if (gx !== gx) { tp[j] = tmp.x; tp[j + 1] = tmp.y; tp[j + 2] = NaN; tp[j + 3] = tau; }
          else if (gx * gx + gy * gy > 0.25) {
            g = Math.atan2(gy, gx); gx = g - tp[j + 2]; gy = (tp[j + 3] + tau) / 2;
            if (Math.abs(Math.atan2(Math.sin(gx), Math.cos(gx))) > TURN_MAX * DEG * (gy - tp[j + 4])) return fail(it, 'turn');
            tp[j] = tmp.x; tp[j + 1] = tmp.y; tp[j + 2] = g; tp[j + 3] = tau; tp[j + 4] = gy;
          }
        } else tp[5 * i] = NaN;
        /* where it is seen */
        projV(tmp.ax, tmp.ay, tmp.az, pv);
        if (!(pv.n > 0) || fadeOf(pv.n) < 0.02) { wv[5 * i] = NaN; wt[2 * i] = NaN; continue; }   // behind the eye, or gone into the distance
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;   // its ink at its nearness, and the room its bob takes
        e = F.soar && tau >= m.tj && tau < m.tx ? 0 : F.edges | 3;   // (a soaring bird circles wholly inside the window; a turn of the view may carry any flight out of either side)
        if (!inView(pv.x, pv.y, hw, hh)) { if (!e && it.enter > -1e8) return fail(it, 'soar'); wv[5 * i] = NaN; wt[2 * i] = NaN; continue; }
        if (it.k === 0 && !it.live && !F.still) return fail(it, 'pop');   // (in view as it is made: never)
        any = true;
        if (pv.n > NEAR_MAX) return fail(it, 'near');
        if (trust && !withinEdges(pv.x, pv.y, hw, hh, e)) return fail(it, 'edge');
        it.near = Math.min(it.near, room(pv.x, pv.y, hw, hh, e));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh);   // the band it flies in (and how far across)
        it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        if (!probe) { if (pv.n > m.nTry) m.nTry = pv.n; bx[4 * i] = pv.x; bx[4 * i + 1] = pv.y; bx[4 * i + 2] = hw - (m.d.halo || 0) * pv.n; bx[4 * i + 3] = hh - (m.d.halo || 0) * pv.n; }   // (fix round: the paper's box for the spacing, the halo left out)
        /* (birds3d) the side-on gate and the tattoo's share: where a readable bird (12 device px of span or more) is
           seen from (its world way: its own and the camera's, against the line of sight): side-on (70-110 deg off its
           tail) the 3D M closes to a profile; below and behind (0-60 deg, seen from below) it is the tattoo's view */
        if (!probe && !F.soar && !F.still && (trust || WIND_ON && WF[0] !== 0) && m.d.span * pv.n * (VW.dpr || 1) >= 12) {   // (way-other, W7: in a wind its whole crossing counted: the crab turns a bird side-on late in a long crossing)
          var vo = F.v * F.q, vxa = vo * Math.cos(hdg), vza = vo * Math.sin(hdg) + (FL.speed || 0) / MPU, vya = F.path.g * vo;
          if (WIND_ON && !F.place && WF[0] !== 0) {   // (way-other) its way through the air, the body's: its own way from its places a step apart (W6: the path's speed alone missed it), the frame's, less the wind
            if (!it.wpp) it.wpp = new Float64Array(4 * MAXP).fill(-9);
            var p3 = 4 * i, ok3 = it.k > 0 && it.wpp[p3 + 3] === it.k - 1, px3 = it.wpp[p3], py3 = it.wpp[p3 + 1], pz3 = it.wpp[p3 + 2];
            it.wpp[p3] = tmp.ax; it.wpp[p3 + 1] = tmp.ay; it.wpp[p3 + 2] = tmp.az; it.wpp[p3 + 3] = it.k;
            if (ok3) { vxa = (tmp.ax - px3) / STEP; vya = (tmp.ay - py3) / STEP; vza = (tmp.az - pz3) / STEP + (FL.speed || 0) / MPU; }
            vxa -= WF[0]; vza -= WF[2];
          }
          var la = Math.sqrt(tmp.ax * tmp.ax + tmp.ay * tmp.ay + tmp.az * tmp.az) || 1, lv = Math.sqrt(vxa * vxa + vya * vya + vza * vza) || 1;
          var azo = Math.acos(clamp((vxa * tmp.ax + vya * tmp.ay + vza * tmp.az) / (la * lv), -1, 1)) / DEG;
          it.readT += STEP; if (azo >= 70 && azo <= 110) it.sideT += STEP; if (azo <= 60 && tmp.ay > 0) it.tatT += STEP;
          { var tlv = Math.sqrt(vxa * vxa + vza * vza) || 1, txv = vza / tlv, tzv = -vxa / tlv, hsv = 0.5 * m.d.span;   // (round 3, step 3: its wings' line on the window)
            projV(tmp.ax + txv * hsv, tmp.ay, tmp.az + tzv * hsv, TP1); projV(tmp.ax - txv * hsv, tmp.ay, tmp.az - tzv * hsv, TP2); work += 2;
            if (TP1.n > 0 && TP2.n > 0 && Math.abs(Math.atan2(TP2.y - TP1.y, Math.abs(TP2.x - TP1.x) + 1e-9)) / DEG > TILT_MAX) it.tiltT = (it.tiltT || 0) + STEP; }
          if (LEAN_PLAN) { var lr = leanAir(F, m, tmp, hdg); work += 2; if (lr === lr && lr <= (P95K[kindOf(F)] || 0.065)) it.leanT += STEP; }   // (way-path: the physical lean, as the judges measure it)
        }
        if (row && trust) for (j = 0; j < row.length; j += 5) {
          gx = Math.abs(pv.x - row[j]) - hw - row[j + 2];
          gy = Math.abs(pv.y - row[j + 1]) - hh - row[j + 3];
          g = Math.max(gx, gy);
          if (g < APART) return fail(it, 'apart');
          it.apart = Math.min(it.apart, g);
        }
        if (row && row.length) { BK[0] = Math.min(BK[0], pv.y - hh); BK[1] = Math.max(BK[1], pv.y + hh); BK[2] = Math.min(BK[2], pv.x - hw); BK[3] = Math.max(BK[3], pv.x + hw); }
        /* (round 3) the live's calm, on the window as it will be seen (the coming view, through the trusted course):
           never sliding backward against the way it faces (its own motion, the view held, sets its facing, as the
           drawer's tracker does), never racing across, never bending sharply. Round 2 judged these in the still view
           only, and a turning view swept birds backward, at twice the live's pace, or round a bend */
        if (calm && trust && hard) { wv[5 * i] = NaN; wt[2 * i] = NaN; }
        else if (calm && trust) {
          j = 5 * i;
          if (wv[j] === wv[j]) {
            projV(wv[j + 2], wv[j + 3], wv[j + 4], pv2);   // (where it was, through this view: its own motion)
            ox = (pv.x - pv2.x) / STEP; oy = (pv.y - pv2.y) / STEP; own = Math.sqrt(ox * ox + oy * oy);
            wx = (pv.x - wv[j]) / STEP; wy = (pv.y - wv[j + 1]) / STEP;
            if (WIND_ON && !F.place && !FORCED) {   // (round 2: not in forced colours' still view: no camera way, no wind) (way-other) the way it faces is its body's: its way through the air (its own, the frame's, less the wind) along the window's right
              var axr = (tmp.ax - wv[j + 2]) / STEP - WF[0], azr = (tmp.az - wv[j + 4]) / STEP + (FL.speed || 0) / MPU - WF[2], frr = axr * PV.cd + azr * PV.sd;
              var fra = Math.sqrt(axr * axr + azr * azr); fc[i] = Math.abs(frr) > FACE_SIN * fra && Math.abs(frr) > 0.5 ? (frr < 0 ? -1 : 1) : 0;   // (round 3, alive: a body within FACE_SIN of the view's axis, seen from behind or before, has no side)
              if (Math.sqrt(axr * axr + azr * azr) * MPU < (AIR_MIN[F.sort] || 6) && fadeOf(pv.n) > 0.3) return fail(it, 'air');   // (way-other: too slow through the air to fly)
            } else if (Math.abs(ox) > 0.5 && Math.abs(ox) > FACE_HYST * own) fc[i] = ox < 0 ? -1 : 1;
            if (fc[i] && wx * fc[i] < -BACK_PX && fadeOf(pv.n) > 0.3) return fail(it, 'back');
            /* (shape) the calm's own bars as the judges measure them, the view held (its own motion through one camera),
               every bird as it will be drawn (drift, wander, gusts, the figure turned by the crab), over about a second
               (three steps): never growing faster than GROW (the path's share was GROW_K of it, the drift's the rest, and
               a near gull line's drift took it to 1.39 %/s, phone seed 7), nor its way on the window turning faster than
               WTURN1 (the planner's WTURN is over single steps: slow gulls wobbling reached 26.7 deg/s on 1 s, desk seed 3) */
            if (!it.gq) it.gq = new Float64Array(8 * MAXP).fill(NaN);
            var gb = 8 * i, gq = it.gq;
            if (gq[gb + 7] !== it.k - 1) { gq[gb] = gq[gb + 1] = gq[gb + 2] = gq[gb + 3] = gq[gb + 4] = gq[gb + 5] = NaN; }
            gq[gb + 7] = it.k;
            gq[gb] = gq[gb + 1]; gq[gb + 1] = gq[gb + 2]; gq[gb + 2] = pv2.n > 0 ? Math.log(pv.n / pv2.n) / STEP : NaN;
            if (fadeOf(pv.n) > 0.3 && (gq[gb] + gq[gb + 1] + gq[gb + 2]) / 3 > GROW) return fail(it, 'grow');
            if (own > 2) {
              var ga = Math.atan2(oy, ox);
              if (gq[gb + 3] === gq[gb + 3] && fadeOf(pv.n) > 0.3 && Math.abs(angDiff(ga, gq[gb + 3])) > WTURN1 * DEG * 3 * STEP) return fail(it, 'wturn1');
              gq[gb + 3] = gq[gb + 4]; gq[gb + 4] = gq[gb + 5]; gq[gb + 5] = ga;
            } else gq[gb + 3] = gq[gb + 4] = gq[gb + 5] = NaN;
            if (wx * wx + wy * wy > pmax * pmax) { it.paceT += STEP; if (it.paceT > PACE_T || wx * wx + wy * wy > 1.4 * pmax * pmax) return fail(it, 'pace'); }   // (a moment over it at a window's stretched edge, but no more)
            if (wx * wx + wy * wy < SLOW_SEEN * SLOW_SEEN && fadeOf(pv.n) > 0.3) { it.slowT += STEP; if (it.slowT > PACE_T) return fail(it, 'hang'); }   // (nor hanging on the window, the view's turn all but cancelling its own way: the live's SLOWEST)
            gx = wt[2 * i]; gy = wt[2 * i + 1];
            if (gx === gx && wx * wx + wy * wy > 36 && gx * gx + gy * gy > 36 && Math.abs(Math.atan2(gx * wy - gy * wx, gx * wx + gy * wy)) > WTURN * DEG * STEP) return fail(it, 'wturn');
            wt[2 * i] = wx; wt[2 * i + 1] = wy;
          } else wt[2 * i] = NaN;
          wv[j] = pv.x; wv[j + 1] = pv.y; wv[j + 2] = tmp.ax; wv[j + 3] = tmp.ay; wv[j + 4] = tmp.az;
        }
      }
      /* one flight to a band while both are seen: two in one band at once read as one long train (unless the words
         stand between them); the live judged it over the whole crossing, but here a turn of the view carries flights
         through and out, and two that are never seen together never make a train (round 3: nor do two that share a
         band for a moment, as a turn carries one past the other: BAND_T of it at most) */
      if (row && row.length && BK[0] < BK[1] && !F.still && trust && !bandsClear(row)) { it.bandT += STEP; if (it.bandT > BAND_T) return fail(it, 'band'); }
      BK[0] = BK[2] = Infinity; BK[1] = BK[3] = -Infinity;
      if (!probe) for (i = 0; i < cnt; i++) {    // two of its birds, near and far, never on top of one another on the window (fix round: the whole way, not only through the trusted course: past it the view's error turns the flight, it does not part its birds)
        if (bx[4 * i] !== bx[4 * i]) continue;
        for (j = i + 1; j < cnt; j++) {
          if (bx[4 * j] !== bx[4 * j]) continue;
          g = Math.max(Math.abs(bx[4 * i] - bx[4 * j]) - bx[4 * i + 2] - bx[4 * j + 2], Math.abs(bx[4 * i + 1] - bx[4 * j + 1]) - bx[4 * i + 3] - bx[4 * j + 3]);
          if (g < SPACE_SEEN) return fail(it, 'space');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; it.seen += STEP; }
      else if (it.enter < -1e8) { if (!it.live && tau > it.enterBy) return fail(it, 'never'); }
      else if (tau - it.last > LEAVE_T && tau >= 0) {   // none of it in view a while: done (the view turned from it, or it left)
        it.end = tau;
        if (sideOn(it)) return fail(it, 'sideon');
        return it.seen >= it.seenMin || it.live || F.still ? 1 : fail(it, 'short');
      }
      it.k++;
    }
  }
  /* (round 3, step 1) a flock's birds apart on the window (the still view) from the trial's horizon to its end: 1 clear,
     0 unfinished (its budget spent), -1 two of its birds within SPACE_SEEN */
  var TAIL_MAX = 90, SPT = new Float64Array(4 * MAXP), SPO = {};
  function spaceTail(F, it, budget) {
    var M = F.m, n = M.length, i, j, tau, w0 = work, g, nn, hw, hh, d, end = Math.min(F.dur, it.until + TAIL_MAX);
    if (it.tk === undefined) it.tk = 1;
    for (;;) {
      tau = it.until + it.tk * STEP;
      if (tau > end) return 1;
      if (work - w0 >= budget) return 0;
      for (i = 0; i < n; i++) {
        SPT[4 * i] = NaN; d = M[i].d;
        spot(F, M[i], tau, SPO); nn = SPO.n;
        if (!(nn > 0) || fadeOf(nn) < 0.02) continue;
        hw = (d.hw - (d.halo || 0)) * nn; hh = (d.hh + BOB * d.span - (d.halo || 0)) * nn;
        if (!inView(SPO.x, SPO.y, hw, hh)) continue;
        SPT[4 * i] = SPO.x; SPT[4 * i + 1] = SPO.y; SPT[4 * i + 2] = hw; SPT[4 * i + 3] = hh;
      }
      for (i = 0; i < n; i++) {
        if (SPT[4 * i] !== SPT[4 * i]) continue;
        for (j = i + 1; j < n; j++) {
          if (SPT[4 * j] !== SPT[4 * j]) continue;
          g = Math.max(Math.abs(SPT[4 * i] - SPT[4 * j]) - SPT[4 * i + 2] - SPT[4 * j + 2], Math.abs(SPT[4 * i + 1] - SPT[4 * j + 1]) - SPT[4 * i + 3] - SPT[4 * j + 3]);
          if (g < SPACE_SEEN) return -1;
        }
      }
      it.tk++;
    }
  }
  /* (birds3d) a travelling path whose readable birds would spend over SIDE_GATE of their time side-on: not flown */
  var TILT_MAX = 30, TILT_SHARE = 0.3, TILT_EMPTY = 8, TP1 = {}, TP2 = {};   // (round 3, step 3) deg; of the readable time; s: an empty sky this long takes a hook rather than wait (a hard gate left phones empty 70 s)
  function sideOn(it) {
    if (it.live || it.probe || !(it.readT > 2)) return false;
    if (it.sideT > SIDE_GATE * it.readT) return true;
    if ((it.tiltT || 0) > TILT_SHARE * it.readT && t - lastSeenAny < TILT_EMPTY) { STATS.hook = (STATS.hook || 0) + 1; return true; }   // (round 3, step 3: a hook on the window, refused while the sky has birds)
    return false;
  }
  var BK = [Infinity, -Infinity, Infinity, -Infinity], BG = [], BSTAMP = 0, BANDA = { yLo: 0, yHi: 0, xLo: 0, xHi: 0 }, BB = { yLo: 0, yHi: 0, xLo: 0, xHi: 0 };
  function bandsClear(row) {
    var j, g, n = 0, st = ++BSTAMP;
    for (j = 0; j < row.length; j += 5) {   // (each other flight's extent on the window at this moment)
      g = row[j + 4];
      if (BG[3 * g] === undefined || BG[3 * g + 2] !== st) { BG[3 * g] = Infinity; BG[3 * g + 1] = -Infinity; BG[3 * g + 2] = st; BG[3 * (g + 100)] = Infinity; BG[3 * (g + 100) + 1] = -Infinity; }
      BG[3 * g] = Math.min(BG[3 * g], row[j + 1] - row[j + 3]); BG[3 * g + 1] = Math.max(BG[3 * g + 1], row[j + 1] + row[j + 3]);
      BG[3 * (g + 100)] = Math.min(BG[3 * (g + 100)], row[j] - row[j + 2]); BG[3 * (g + 100) + 1] = Math.max(BG[3 * (g + 100) + 1], row[j] + row[j + 2]);
      n = Math.max(n, g + 1);
    }
    BANDA.yLo = BK[0]; BANDA.yHi = BK[1]; BANDA.xLo = BK[2]; BANDA.xHi = BK[3];
    for (g = 0; g < n; g++) {
      if (BG[3 * g + 2] !== st || !(BG[3 * g] < BG[3 * g + 1])) continue;
      BB.yLo = BG[3 * g]; BB.yHi = BG[3 * g + 1]; BB.xLo = BG[3 * (g + 100)]; BB.xHi = BG[3 * (g + 100) + 1];
      if (BANDA.yLo < BB.yHi + BAND_GAP && BANDA.yHi > BB.yLo - BAND_GAP) return false;
      BG[3 * g + 2] = -1;   // (done with this row's flight)
    }
    return true;
  }
  /* (round 3) the open bands cut off where a level crossing at the flight's nearness would be under the floor (FLOOR_T
     over the ground: walk() turns such a path down, so a point there is no path; round 2 drew most of its points there
     in DUNES, where the floor stands a few degrees under the horizon, and walked each out to find it so) */
  function floorClip(B, F) {
    if (!(floorY > -1e5)) return B;
    var Y = floorY + 2 * F.span + F.hi / F.n0, ymax = cam.y0 - (Y * F.n0 - cam.f * cam.s) / cam.c - F.hi, out = [], i;
    for (i = 0; i < B.length; i++) if (B[i][0] < ymax) out.push([B[i][0], Math.min(B[i][1], ymax)]);
    return out;
  }
  /* (round 3) the fastest a bird may cross the window as it will be seen: the live's fastest (topSpeed, in the still
     view) and the calm's sweep, stretched at a window's edge by the lens (PACE_SEEN of it) */
  function paceMax() { return topSpeed() + PACE_SEEN * CALM_K * (W / across(CALM)); }
  /* (round 3) a trial's arrays, kept between trials: the job's (TA) and a flight re-checked's (TB) */
  function trialArrays() { return { bx: new Float64Array(4 * MAXP), tp: new Float64Array(5 * MAXP), wv: new Float64Array(5 * MAXP), wt: new Float64Array(2 * MAXP), fc: new Int8Array(MAXP) }; }
  var TA = trialArrays(), TB = trialArrays();
  /* a trial of the job's flight, from the job's start (the coming view's first sample); probe: its bounding birds only */
  function trialIt(J, F, probe) {
    var still = J.mode === 'still', from = still ? 0 : VP.t0 - J.t;
    var cross = Math.max(4, F.dur - Math.max(0, F.s0 > 0 ? 0 : 0) - 2 * OUT / (F.v * F.n0 || SPEED[1]));
    return { from: from, k: 0, k0: 0, near: ROOMY, apart: 200, probe: probe, spent: 0, yLo: Infinity, yHi: -Infinity, xLo: Infinity, xHi: -Infinity,
             bx: TA.bx, tp: TA.tp.fill(NaN), wv: TA.wv.fill(NaN), wt: TA.wt.fill(NaN), fc: TA.fc.fill(0), bandT: 0, paceT: 0, slowT: 0, late: 0, enter: -1e9, last: -1e9, seen: 0, end: 0, why: '', live: false, readT: 0, sideT: 0, tatT: 0, leanT: 0,
             enterBy: J.mode === 'first' ? ENTER_BY[0] : ENTER_BY[1], seenMin: still ? 0 : clamp(0.35 * cross, SEEN_MIN[0], SEEN_MIN[1]),
             until: still ? F.dur : Math.min(VP.t0 + (VP_N - 1) * STEP - J.t, F.dur + 30, VP.t0 + VP.end + 2 - J.t, VP.t0 + trustT() + TRIAL_PAST - J.t) };   // (round 3: no further than TRIAL_PAST past the trusted course: the course a guess there, the guard watches the flight; round 2 flew every trial up to 30 s past the flight's end, and a job could take 6 s)
  }
  /* the whole trial at once (a flight re-checked after the page moved), from now, through a fresh course */
  function trial(F, from) {
    var it = { from: from, k: 0, k0: 0, near: ROOMY, apart: 200, probe: false, spent: 0, yLo: Infinity, yHi: -Infinity, xLo: Infinity, xHi: -Infinity,
               bx: TB.bx, tp: TB.tp.fill(NaN), wv: TB.wv.fill(NaN), wt: TB.wt.fill(NaN), fc: TB.fc.fill(0), bandT: 0, paceT: 0, slowT: 0, late: 0, enter: -1e9, last: -1e9, seen: 0, end: 0, why: '', live: true, readT: 0, sideT: 0, tatT: 0,
               enterBy: 1e9, seenMin: 0, until: Math.min(F.dur, from + 30) };
    return trialRun(F, it, null, Infinity) > 0 ? it.near : -1;
  }

  /* (round 3, step 1) the share (0-1) of a level crossing's heading and climb its band leaves room for: its leader's
     line on the window, through (qx, qy) at its nearness, inside the window's top and bottom margins (its reach above
     and below) at both side edges, and over every word box's width clear of the box, its margin and the course's slack */
  var FWP = {}, FPP = {}, FIT_K = 0, THIN_SKY = 0.2;   // (THIN_SKY: open bands under this share of the window's height: a thin sky, its steeper paths tried from the first)
  /* (round 3, step 1) a flock's reach above (reachUp) and below (reachDn) its leader's height y on the window beyond
     its figure's on the window's plane: its nearer birds farther from the horizon line, its farther ones nearer it */
  function reachUp(F, y) {
    if (!F.dzN && !F.dzF) return 0;
    var Z0 = cam.f / F.n0, rN = Z0 / Math.max(0.3 * Z0, Z0 + F.dzN), rF = Z0 / (Z0 + F.dzF), E = cam.hy - y;
    return (E >= 0 ? E * (rN - 1) : -E * (1 - rF)) + F.inkR * F.n0 * (rN - 1);
  }
  function reachDn(F, y) {
    if (!F.dzN && !F.dzF) return 0;
    var Z0 = cam.f / F.n0, rN = Z0 / Math.max(0.3 * Z0, Z0 + F.dzN), rF = Z0 / (Z0 + F.dzF), E = cam.hy - y;
    return (E >= 0 ? E * (1 - rF) : -E * (rN - 1)) + F.inkR * F.n0 * (rN - 1);
  }
  /* the open bands narrowed by that reach: the heights whose flock stays inside its band's own limits */
  function trueBands(B, F) {
    if (F.soar || (!F.dzN && !F.dzF)) return B;
    var out = [], i, y, a, b, s0, ok;
    for (i = 0; i < B.length; i++) {
      a = B[i][0]; b = B[i][1]; s0 = null;
      for (y = a; y <= b; y += 1) {
        ok = y - reachUp(F, y) >= a && y + reachDn(F, y) <= b;
        if (ok && s0 === null) s0 = y;
        else if (!ok && s0 !== null) { out.push([s0, y - 1]); s0 = null; }
      }
      if (s0 !== null) out.push([s0, Math.min(b, y - 1)]);
    }
    return out.filter(function (v) { return v[1] > v[0]; });
  }
  function lineFits(F, qx, qy, hd, climb) {
    var h = F.dir > 0 ? hd : Math.PI - hd, L = 40, dx, sl, top = EDGE + F.lo, bot = H - EDGE - F.hi, yl, yr;
    unproj(qx, qy, F.n0, FWP);
    proj(FWP.x + L * Math.cos(h), FWP.y + L * Math.tan(climb), FWP.z + L * Math.sin(h), FPP);
    if (!(FPP.n > 0)) return false;
    dx = FPP.x - qx; if (Math.abs(dx) < 1e-6) return false;
    sl = (FPP.y - qy) / dx; yl = qy - qx * sl; yr = qy + (W - qx) * sl;
    if (yl - reachUp(F, yl) < top || yl + reachDn(F, yl) > bot || yr - reachUp(F, yr) < top || yr + reachDn(F, yr) > bot) return false;
    return true;
  }
  function bandFit(F, qx, qy, hd, climb) {
    if (lineFits(F, qx, qy, hd, climb)) return 1;
    if (!lineFits(F, qx, qy, 0, 0)) return 1;   // (a point whose flat crossing does not fit either: left to the trial)
    var lo = 0, hi = 1, k, i;
    for (i = 0; i < 7; i++) { k = (lo + hi) / 2; if (lineFits(F, qx, qy, hd * k, climb * k)) lo = k; else hi = k; }
    return lo;
  }

  /* a path in the air (or a thermal) for the job's flight; true if it is worth a trial */
  function propose(J) {
    var F = J.F, qx, qy, u, hd, turn, climb, plain, open, i;
    if (J.pend) { J.pend = false; return propose2(J); }
    J.a++;
    r2next(q);
    J.diag = false; J.far = false;
    setYaw(F, J.yaw);
    { var dpW = angDiff(FL.psi || 0, F.yaw); F.wsX = -Math.sin(dpW); F.wsZ = Math.cos(dpW); F.wsS = (FL.speed || 0) / MPU; }   // (round 3: the camera's course in this frame, held: the flight's own world speed is along it)
    /* (round 3) paths found behind cloud: the next ones nearer (the flight in front of the towers, not behind them) */
    if (F.n00 === undefined) F.n00 = F.n0;
    if (!F.soar) F.n0 = Math.min(F.n00 * (J.near ? 1.6 : 1 + 0.3 * Math.min(J.hid || 0, 2)), 0.9 * NEAR_MAX);
    if (!J.bands) J.bands = trueBands(floorClip(openBands(F.lo, F.hi), F), F);   // (round 3, step 1: narrowed by the flock's reach in depth, and over the floor)
    if (F.soar) {
      qy = inBands(J.bands, q.y);
      if (qy === null) { J.a = 1e9; return false; }      // no band holds the thermal (the job's tries are up)
      unproj(mix(q.x, 0.08, 0.92) * W, qy, F.n0, wp);
      soarTimes(F, wp.x, wp.y, wp.z);
    } else {
      J.climb = F.climb && !J.fill && J.mode !== 'still' && J.a <= TRIES / 2;    // climbing away or coming down, if it finds room
      open = J.bands.length > 0;                          // (no open band: the other flights' bands fill the sky)
      for (var bi = 0, btot = 0; bi < J.bands.length; bi++) btot += J.bands[bi][1] - J.bands[bi][0];   // (round 3, step 1: a thin sky)
      J.diag = J.climb || (J.a > 2 * TRIES && J.best < 0 && J.a % 2 === 0) || ((!open || btot < THIN_SKY * H) && J.a % 2 === 0);   // no level crossing fits: try the steeper paths (now and then)
      /* (shape, step 4d: the lean's height) with LEAN_H > 0 a lean crossing is decided before its point, and that share of
         them takes, of the open sky's next eight points, the one whose height asks the heading (the kind's mark's lean
         over the height's own: tan psi = tan lean / tan elevation) nearest what this crossing can fly through the air
         (from its least pace to the lean's top, the crosswind adding upwind): higher where the view is level (the
         desktop), lower where the wind alone gives more than the mark asks (a gull in a strong crosswind on a phone). A
         preference among clear points, never a gate. LEAN_H 0: as before, the stream of draws unchanged */
      var leanPre = -1, pickH = false;
      if (LEAN_H > 0 && LEAN_PLAN && !J.diag && open && !J.climb && J.mode !== 'still' && J.mode !== 'first' && (FL.speed || 0) > 2) { leanPre = F.r() < LEAN_MODE ? 1 : 0; pickH = leanPre === 1 && F.r() < LEAN_H; }   // (not the first flight: it simply crosses, soon; with it, desk seed 3's sky stood empty its first 27 s)
      if (pickH) {
        var mkH = markOf(kindOf(F)), tlH = Math.atan2(mkH[9] - mkH[1], mkH[8] - mkH[0]), wxH = 0, wzH = 0, bestH = Infinity, qxH = 0, qyH = 0;
        if (WIND_ON && LEAN_AIR) { windNow(); wxH = (-F.cyw * WINDV[0] + F.syw * WINDV[2]) / MPU; wzH = (F.syw * WINDV[0] + F.cyw * WINDV[2]) / MPU; }
        var fwdH = (FL.speed || 12) / MPU - wzH, upH = J.dir * wxH < 0 ? Math.abs(wxH) : -Math.abs(wxH), topH = LEAN_PACE * topSpeed();
        var aMinH = Math.max(0, SPEED[0] / Math.max(LEAN_N0, F.n0) + upH), pMinH = Math.atan2(aMinH, fwdH), pMaxH = Math.atan2(Math.max(aMinH, topH / LEAN_N0 + upH), fwdH);
        for (i = 0; i < 8; i++, r2next(q)) {
          var qxc = q.x * W, qyc = inBands(J.bands, q.y);
          if (qyc === null || !(unproj(qxc, qyc, F.n0, wp).y > floorY + 2 * F.span)) continue;
          var elH = Math.atan2(wp.y, Math.sqrt(wp.x * wp.x + wp.z * wp.z)), pN = Math.atan(Math.tan(tlH) / Math.max(Math.tan(elH), 0.05)), cH = Math.abs(pN - clamp(pN, pMinH, pMaxH));
          if (cH < bestH - 1e-9) { bestH = cH; qxH = qxc; qyH = qyc; }
        }
        if (bestH === Infinity) return pfail(J, 'nopoint');
        qx = qxH; qy = qyH; i = 0;
      } else
      for (i = 0; i < 8; i++, r2next(q)) {                // its middle somewhere in the open sky ...
        qx = q.x * W;
        qy = J.diag || !open ? mix(q.y, 0.04, 0.96) * H : inBands(J.bands, q.y);   // ... a level crossing's in an open band
        if (qy !== null && unproj(qx, qy, F.n0, wp).y > floorY + 2 * F.span) break;   // (round 3: nor under the floor where it crosses; step 1: a steeper path's point too)
      }
      if (i === 8) return pfail(J, 'nopoint');
      plain = open && (J.mode === 'still' || J.fill || (J.mode === 'first' && J.a > TRIES / 4));   // (the first flight, if it finds no room soon, simply crosses)
      u = plain ? 0 : weighted(F.r, [[0, open ? HEAD_W[0] : 0], [1, HEAD_W[1]], [2, HEAD_W[2]]]);   // across the window, angling away, or coming nearer (with no open band, never straight across)
      hd = pick(F.r, HEAD[u]) * DEG * (u === 0 && F.r() < 0.5 ? -1 : 1);
      if (J.hdPref !== null && J.hdPref !== undefined && !J.diag) {   /* (life) the roost's way: off the window's plane as far as the bearing asks, within the kinds of path the planner flies */
        var hp = clamp(J.hdPref + 8 * (F.r() * 2 - 1), -30, HEAD_MAX);
        u = hp > 25 ? 1 : hp < -12 ? 2 : 0; if (plain && u) { u = 0; hp = clamp(hp, -25, 25); }
        hd = hp * DEG;
      }
      turn = !plain && F.r() < TURNING * (F.S.wheel || 1) ? (F.r() < 0.5 ? 1 : -1) * pick(F.r, TURN) * DEG : 0;   // now and then wheeling as it goes
      if (J.turnF) turn = (F.r() < 0.5 ? 1 : -1) * J.turnF * DEG;   // (dev: a film's flight wheeling through turnF deg)
      else if (J.role === 'local' && !plain) turn = (F.r() < 0.5 ? 1 : -1) * pick(F.r, DIR_LOCAL_TURN) * DEG;   // (round 3, alive: a local flight wheels once)
      F.dir = (J.diag || !open) && !J.climb && (!J.role || J.role === 'cross' || J.role === 'local') && F.r() < 0.7 ? (qx < W / 2 ? -1 : 1) : J.dir;   // (in a narrow strip of sky, mostly out by the nearer side; round 3, alive: a flight on the line or against it keeps its side: half its tries spent, a quarter of the stream flights came out the other way)
      if (F.dir !== J.dir) STATS.thinSide = (STATS.thinSide || 0) + 1;
      var upw = 0;   // (round 3, alive: no flight is sent upwind; a downwind crossing flies far and quick enough that its body does not face back (DOWN_*), or the trial refuses it)
      /* (round 2) a view turning against the flight's way would leave it behind beyond its edge: as fast as it flies or
         a little faster (the two would all but cancel: a bird hanging on the window), it goes the way of the sweep
         instead; much faster, it sets off beyond the far edge, and the view passes it as it flies on (farOption) */
      J.upstream = false;
      if (J.mode !== 'still' && F.dir * J.sweep < 0) {
        if (J.mode === 'next' && Math.abs(J.sweep) > 1.25 * F.vPx) J.upstream = true;
        else if (Math.abs(J.sweep) > FLIP * F.vPx && !upw) { F.dir = -F.dir; STATS.sweepFlip = (STATS.sweepFlip || 0) + 1; F.swept = true; }   // (round 3: 0.35 doubled the birds' pace on the window under a modest turn; now that turn slows them instead) (shape: never downwind in a crosswind)
      }
      if (J.diag && !J.climb) {                           // steeper across the window: down and away toward the horizon, or up and nearer (now and then the other)
        climb = (F.r() < 0.5 ? 1 : -1) * pick(F.r, DIAG);
        u = (F.r() < 0.7 ? -1 : 1) * (climb > 0 ? 1 : -1);   // (+ coming nearer as it goes, - going away)
        if (!pathAcross(F, qx, qy, climb, u * F.r() * DIAG_N * (u > 0 ? GROW : SHRINK) / (F.vw * F.n0), turn)) return pfail(J, 'pathA');
        u = 3;
      } else {
        climb = J.climb ? (F.r() < 0.5 ? 1 : -1) * pick(F.r, CLIMB) : (F.r() * 2 - 1) * F.S.tilt * DEG / 3;   // (its kind's tilt: a gentle climb or descent; the heading tilts it on the window)
        if (!J.climb && J.sinkPref !== null && J.sinkPref !== undefined) {   // (life: sinking toward the roost; fix: the angle is through the AIR, so the path's slope in the frame is it times the airspeed over the frame's pace)
          var sa0 = J.sinkPref + 0.4 * DEG * (F.r() * 2 - 1), vf0 = Math.max(0.5, (F.vw00 !== undefined ? F.vw00 : F.vw) * MPU), va0 = Math.sqrt(vf0 * vf0 + (FL.speed || 12) * (FL.speed || 12)), cap0 = Math.tan((W < 600 ? 4 : 8) * DEG);
          climb = clamp(Math.tan(sa0) * va0 / vf0, -cap0, cap0);
        }
        if (F.vw00 === undefined) { F.vw00 = F.vw; F.vPx00 = F.vPx; }
        F.vw = F.vw00; F.vPx = F.vPx00; F.lean = false;
        if (leanPre >= 0 ? leanPre === 1 && !plain : LEAN_PLAN && !J.climb && !plain && J.mode !== 'still' && (FL.speed || 0) > 2 && F.r() < LEAN_MODE) {
          /* (way-path) a lean crossing: across the window at the calm's top pace, as near as that pace lets its world
             heading stand LEAN_PSI off the camera's track (never nearer than it would otherwise fly, never farther
             than LEAN_N0), a touch away, and now and then turning away from the camera as it goes (its far wing low) */
          /* the heading its lean asks where it crosses: the near wing's rise on the window grows with how far its heading
             stands off the camera's track and how high it is seen (tan of the tilt ~ tan psi x tan of its elevation), so
             psi from the kind's own mark (gull 25 deg, goose and ibis 31) and the height of the proposed crossing */
          unproj(qx, qy, F.n0, wp);
          var mk0 = markOf(kindOf(F)), tilt = Math.atan2(mk0[9] - mk0[1], mk0[8] - mk0[0]), el = Math.atan2(wp.y, Math.sqrt(wp.x * wp.x + wp.z * wp.z));
          var psiT = clamp(Math.atan(Math.tan(tilt) / Math.max(Math.tan(el), 0.25) * pick(F.r, [0.85, 1.25])), LEAN_PSI[0] * DEG, LEAN_PSI[1] * DEG);   // (shape: the dial's upper end read, 52 as before)
          /* (shape, the join) psiT is its heading through the AIR: the body lies along its way through the air, so the
             world's wind (this flight's frame: wfx across, wfz along the camera's way) gives part of it. Across upwind,
             the speed across over the ground it needs is (forward airspeed) x tan psiT less the crosswind (downwind,
             more), never under the crossing's least pace (SPEED[0] px/s at its nearness) nor over the lean's top; then
             way-path's nearness and pace. A crossing whose airspeed would fall under its kind's least is not made a
             lean crossing (the ordinary proposal stands) */
          var top = LEAN_PACE * topSpeed(), cs0 = (FL.speed || 12) / MPU, wfx = 0, wfz = 0;
          if (WIND_ON && LEAN_AIR && !F.place) { windNow(); var lcy = F.cyw === undefined ? 1 : F.cyw, lsy = F.syw === undefined ? 0 : F.syw; wfx = (-lcy * WINDV[0] + lsy * WINDV[2]) / MPU; wfz = (lsy * WINDV[0] + lcy * WINDV[2]) / MPU; }
          var fwd = cs0 - wfz, vlat = fwd * Math.tan(psiT) + F.dir * wfx;
          var n0L = vlat > 1e-6 ? clamp(top / vlat, LEAN_N0, Math.max(LEAN_N0, F.n0)) : Math.max(LEAN_N0, F.n0);
          var vwL = clamp(vlat, SPEED[0] / n0L, top / n0L), axL = F.dir * vwL - wfx;
          if (fwd > 0 && Math.sqrt(axL * axL + fwd * fwd) * MPU >= (AIR_MIN[F.sort] || 6)) {
            F.n0 = n0L; F.vw = vwL; F.vPx = vwL * n0L; F.lean = true;
            hd = J.hdPref !== null && J.hdPref !== undefined ? clamp(J.hdPref + 8 * (F.r() * 2 - 1), -30, HEAD_MAX) * DEG : pick(F.r, LEAN_HD) * DEG;   // (life: the roost's way)
            turn = F.r() < LEAN_TURN ? pick(F.r, LEAN_TURN_A) * DEG : 0;
            if (J.turnF) turn = J.turnF * DEG;
          }
        }
        if (DOWN_ON && WIND_ON && !F.lean && J.mode !== 'still' && F.cyw !== undefined) {   /* (round 3, alive, DIRECTIONS 4.3.5) downwind in a crosswind: across the frame faster than the wind by enough that its body does not face back */
          windNow(); var wxD = -F.cyw * WINDV[0] + F.syw * WINDV[2];
          if (Math.abs(wxD) >= WIND_SIDE && F.dir * wxD > 0) {
            var needD = (Math.abs(wxD) - FACE_SIN * (FL.speed || 12) + DOWN_LAT) / MPU, topD = 0.92 * topSpeed();
            if (F.vw < needD) { var nD = clamp(topD / needD, DOWN_NMIN, F.n0); F.n0 = nD; F.vw = Math.min(needD, topD / nD); F.vPx = F.vw * F.n0; STATS.down = (STATS.down || 0) + 1; }
          }
        }
        if (open && !J.climb) { var kfit = bandFit(F, qx, qy, hd, climb); if (kfit < 1) { hd *= kfit; climb *= kfit; FIT_K++; } }   // (round 3, step 1: shaped to its band)
        if (!pathThrough(F, qx, qy, hd, turn, climb)) return pfail(J, 'path');
      }
      if (!u && (F.edges & 12)) return pfail(J, 'edges');   // a crossing never leaves by the top or the bottom (one going away may sink below the sill)
      J.pend = true; return false;                        // (its pace and timing on the next step: no one step works out a whole path)
    }
    J.c++;
    J.it = trialIt(J, F, F.probe.length < F.m.length);
    return true;
  }
  function propose2(J) {
    var F = J.F, lap = 0;
    {
      if (!paced(F)) return pfail(J, 'paced');
      /* (round 3) the view's coming turn sweeps the land across the window under the flight: going its way, the flight
         flies that much slower against the land (gliding the more, as the live's slowed kinds do), so that on the
         window it keeps near its kind's calm pace rather than adding the turn's to it (never under half its pace) */
      if (J.mode !== 'still' && SWEEP_GIVE > 0 && F.dir * J.sweep > 0 && !F.soar) {
        var kk = Math.max(0.5 * F.vw / F.v, (F.v - SWEEP_GIVE * Math.abs(J.sweep) / F.n0) / F.v);
        if (kk < 1) { F.v *= kk; F.q *= kk; }
      } else if (J.mode !== 'still' && SWEEP_UP > 0 && F.dir * J.sweep < 0 && !F.soar) {
        /* ... and against it, that much quicker (within the calm's own bounds on growing, shrinking and turning, and
           its kind's pace by at most half the sweep again), so that it still crosses the window in about the live's time */
        var up = Math.min(F.vw * (1 + SWEEP_UP * Math.abs(J.sweep) / F.vPx), F.vLim || Infinity, 0.92 * topSpeed() / (F.vSig || 1));
        if (up > F.v) { F.q = Math.min(1, F.q * up / F.v); F.v = up; }
      }
      F.m.forEach(function (m) { lap = Math.max(lap, Math.max(m.lag, m.lx) + m.stragL + F.span); });
      F.s0 = 0;
      if (J.mode === 'first') F.s0 = entering(F) - F.v * pick(F.r, FIRST) * (F.dir * J.sweep < 0 ? clamp(1 - Math.abs(J.sweep) / F.vPx, 0.25, 1) : 1);   // the leader enters within a second or two (round 3: as soon against the view's turn)
      else if (J.mode === 'still') F.s0 = (entering(F) + leaving(F) + lap) / 2;    // composed across the middle of the sky
      F.dur = (F.len + lap - F.s0) / F.v;
      F.lap = lap;
      placeEvents(F);
      if (J.upstream) { J.c++; J.far = false; J.it = { why: 'never' }; return farOption(J); }
    }
    J.c++;
    J.it = trialIt(J, F, F.probe.length < F.m.length);
    return true;
  }
  /* (round 2) a flight the coming view would leave behind beyond its edge (the view turning its way faster than it
     flies), or bring into view as it is made: the same path, the flight set off beyond the far edge instead, so the
     view passes it (it comes in across that edge, flying on its own way against the turn) */
  function farOption(J) {
    var F = J.F, why = J.it.why;
    if (J.far || F.soar || J.mode !== 'next' || (why !== 'never' && why !== 'pop' && why !== 'short')) return false;
    if (F.dir * J.sweep > -0.5 * F.vPx && !J.upstream) return false;
    J.far = true;
    F.s0 = F.len + F.lap - F.v * (VP.t0 - J.t) + 0.5 * F.span;   // (the whole flight beyond the far edge as the job starts)
    F.dur = Math.max(F.dur, 30);
    J.it = trialIt(J, F, F.probe.length < F.m.length);
    return true;
  }
  /* how much of a path the clouds and the land would hide: its leader and its last bird at six moments through the
     time it is in view, each a point in the world (the camera's predicted place and the flight's frame), the clouds'
     lobes between the camera and it, and the ground under the line of sight; and the ground under it (never lower than
     FLOOR_T over it: a path in DUNES may cross low in front of the dunes, never through them). 1: not a path */
  function hiddenShare(J, F) {
    var it = J.it, i, k, m, tau, kk, x, y, z, uu, nT = 0, nH = 0, hid, list, nL = 0;
    J.overLand = 0;
    if (FORCED || it.enter < -1e8 || !camStep()) return 0;
    list = [F.m[0], F.m[F.m.length - 1]];
    for (k = 0; k < 6; k++) {
      tau = it.enter + (it.last - it.enter) * (k + 0.5) / 6;
      kk = Math.round((tau - it.from) / STEP); viewNeed(kk);
      for (i = 0; i < list.length; i++) {
        m = list[i]; spot(F, m, tau, tmp2);
        airWorldK(F, tmp2.ax, tmp2.ay, tmp2.az, kk, PW);
        work += 10; nT++;
        if (FL.ok && PW.y - HOST.ground(PW.x, PW.z) < FLOOR_T) return 1;
        hid = FX.cloud && HOST.cloudBetween(PW.cx, PW.cy, PW.cz, PW.x, PW.y, PW.z) > 0.6 * CLOUD_IN;
        for (uu = 0.2; !hid && uu < 0.99; uu += 0.2) {
          x = PW.cx + (PW.x - PW.cx) * uu; y = PW.cy + (PW.y - PW.cy) * uu; z = PW.cz + (PW.z - PW.cz) * uu;
          if (HOST.ground(x, z) > y) hid = true;
        }
        if (hid) nH++;
        /* (round 3) seen against the land behind it (a dune, the ground far off), rather than the open sky */
        if (J.mode === 'still') for (uu = 1.5; uu < 13; uu *= 2) {
          x = PW.cx + (PW.x - PW.cx) * uu; y = PW.cy + (PW.y - PW.cy) * uu; z = PW.cz + (PW.z - PW.cz) * uu;
          if (FL.ok && HOST.ground(x, z) > y) { nL++; break; }
        }
      }
    }
    J.overLand = nL / Math.max(1, nT);
    return nH / Math.max(1, nT);
  }
  /* a trial passed: keep the roomiest path (clear of the clouds and the land) */
  function judge(J) {
    var F = J.F, sc = J.it.near, i, G, hs;
    if (J.mode === 'still' && !allInView(F, 0)) return;
    if (F.soar && sc < 40) return;                        // a thermal only in a roomy field: in a narrow band a ring looks trapped
    if (J.mode === 'still') for (i = 0; i < flights.length; i++) {   // one flight to a band (the still sky's: the live's, over the whole crossing; a moving sky's while both are seen, in the trial)
      G = flights[i];
      if (J.it.yLo < G.yHi + BAND_GAP && J.it.yHi > G.yLo - BAND_GAP) { fail(J.it, 'band'); return; }
    }
    hs = hiddenShare(J, F);
    if (hs > CLOUD_HID) { if (hs < 1) J.hid = (J.hid || 0) + 1; fail(J.it, hs >= 1 ? 'floor' : 'hidden'); return; }
    sc += 0.25 * J.it.apart + (J.diag && !J.climb ? 0 : 40) + 8 * F.r() - 80 * hs - (J.far ? 10 : 0) - (J.mode === 'still' ? 60 * J.overLand : 0);
    var tat = J.it.readT > 0 ? J.it.tatT / J.it.readT : 0; if (LEAN_PLAN) { tat = J.it.readT > 0 ? (J.it.leanT || 0) / J.it.readT : 0; sc += LEAN_W * tat * Math.min(1, J.it.readT / 6); } else sc += 24 * tat; F.tattoo = tat;   // (way-path: the physical lean's share of its readable time, weighed by how long it is readable) F.sideShare = J.it.readT > 0 ? J.it.sideT / J.it.readT : 0;   // (birds3d: the tattoo's view preferred, a preference, never a gate)   // (round 3: the less, the longer it would pass near the words where the course is a guess)
    if (sc > J.best) {
      if (J.it.end) F.dur = Math.max(J.it.end, J.it.last + 1);
      J.best = sc; J.keep = snapshot(F, 0); J.keep.yLo = J.it.yLo; J.keep.yHi = J.it.yHi; J.keep.xLo = J.it.xLo; J.keep.xHi = J.it.xHi;
      J.keep.enterT = J.it.enter > -1e8 ? J.it.enter : 0; J.keep.seenSpan = J.it.last > -1e8 ? J.it.last - Math.max(J.it.enter, 0) : 0; J.keep.far = J.far;
      if (J.it.capped && !F.soar) J.keep.seenSpan = Math.max(J.keep.seenSpan, (leaving(F) - entering(F)) / F.v);   // (round 3: a trial cut off while it was still seen: its crossing in the still view, for the gap to the next)
    }
  }

  /* work on the job, `quota` bird-steps' worth; the flight once it is in the sky, else null (and job null too when
     nothing found room) */
  /* (round 3, alive) a role's way (DIRECTIONS 4.1-4.2): its side of the window and how far off the window's plane it
     heads, from the sky's flight line as this flight's kind group takes it: on the line, as the roost-bound flights flew
     (away toward the roost); against it, across (70 %) or coming nearer; across it, steeply away or nearer, mostly on the
     line's side; local, either side, across, wheeling once. The wind never picks it */
  function roleWay(J, F) {
    var g = DIR_GROUP[F.sort], tgt = J.tgt, VP0 = HOST.flight ? HOST.flight(FLX) : null, vyaw = VP0 && VP0.ok ? VP0.view : 0, d = J.rd;
    if (g !== undefined && J.cls !== 'moon' && roostFlip[g] < 0) tgt = 2 * roostVq - tgt;   // (this kind's roost on the other side: kinds pass each other at dusk)
    var rel = angDiff(tgt, vyaw), side = rel > 0 ? -1 : 1;   // (+: to the view's left)
    if (J.role === 'stream') { J.dir = side; J.hdPref = 90 - Math.abs(rel) / DEG; }
    else if (J.role === 'counter') { J.dir = -side; J.hdPref = d[0] < 0.7 ? mix(d[1], -10, 20) : mix(d[1], -30, -12); }
    else if (J.role === 'cross') { J.dir = d[2] < DIR_CROSS_SAME ? side : -side; J.hdPref = d[0] < 0.5 ? mix(d[1], 35, 60) : mix(d[1], -30, -12); }
    else { J.dir = d[2] < 0.5 ? side : -side; J.hdPref = mix(d[1], -10, 20); }
    F.dir = J.dir; F.role = J.role; F.dirRole = J.dir;
  }
  function workJob(quota) {
    var J = job, o, F, res, C, q0 = quota;
    while (job === J && quota > 0) {
      if (HOST.budget && HOST.budget() <= 0) return null;   // (round 3: the frame's time for planning is spent: on with it next step)
      /* (round 2) a passed trial is judged (its clouds and its land: some 130 bird-steps) only on a step that has spent
         under a quarter of its quota, and a path's two halves are worked out on steps of their own (propose, propose2):
         round 1's steps did up to five such stages, 933-1268 bird-steps against a quota of 200; gating the proposals too
         left the sky emptier, a step lost after every failed trial (fake world: empty 0.045 -> 0.063 at 1440) */
      if (J.jn) {
        if (q0 - quota > 0.25 * q0) return null;
        J.jn = false; o = work; judge(J); quota -= work - o;
        if (HOST.dev && work - o > (STATS.costs.judge || 0)) STATS.costs.judge = work - o;
        J.it = null; continue;
      }
      if (!J.F) {
        if (J.oi >= J.order.length) { if (J.cls && LIFE[J.cls] && J.mode !== 'still' && J.order[0] && J.order[0][0] !== 'single' && !(LPEND && LPEND.kd === J.order[0][0])) LPEND = { kd: J.order[0][0], nd: J.order[0][1], cls: J.cls, t: t };   /* (fix: no path found: the pattern waits) */ jobLog(J, null); HIDJOB = (J.nh || 0) > 0.3 * (J.nf || 0) ? t : HIDJOB; job = null; return null; }   // (round 3: a job the clouds defeated, noted)
        o = J.order[J.oi++];
        if ((makesFour(o[1], J.counts) && !(o[1] === 1 && LIFE[J.cls])) || o[1] > freeSlots() + awaySlots()) continue;
        var keepS = J.sortF ? SORT_OF[o[0]] : null; if (J.sortF) SORT_OF[o[0]] = [[J.sortF, 1]];
        NEAR_FORCE = !!J.nearF;
        try { J.F = newFlight(o[0], o[1], J.dir, J.r, o[2], o[3], J.mode === 'still'); } finally { if (J.sortF) SORT_OF[o[0]] = keepS; NEAR_FORCE = false; }
        if (J.giftF && J.F) J.F.gift = true;
        if (J.F && J.role && !J.F.soar) roleWay(J, J.F);   // (round 3, alive)
        J.c = 0; J.a = 0; J.best = -1; J.keep = null; J.it = null; J.bands = null; J.pend = false; J.jn = false; J.retry = 0; J.hid = 0;
        return null;                                      // (drawing a flight is a frame's work: its paths are tried from the next)
      }
      if (!J.it) {
        if (J.c >= ((J.mode === 'first' && !J.fill) || J.oi > 1 || J.retry ? TRIES / 2 : TRIES) || J.a >= 6 * TRIES) {   // (the first flight, and a second choice, in fewer tries; a path that cannot even be drawn is a cheap try)
          if (J.keep) {
            F = J.F; restore(F, J.keep); setYaw(F, J.yaw); F.enterT = J.keep.enterT; F.seenSpan = J.keep.seenSpan; F.farIn = J.keep.far; job = null;
            var t1 = J.t;                                 // (round 3: every flight sets off when its trials had it set off, the course's view and its own aligned; a first flight FIRST_LEAD after its job began, entering a second or two after that. Round 2 set a first flight off as it was committed, its course then seconds out of step with the view when the planning ran long)
            /* never made in view: through the camera as it is now (a turn the course did not foresee, a drag) */
            C = camStep();
            if (J.mode !== 'still' && C) {
              FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
              /* (a first flight the view has turned onto while it was planned sets off a little further back along its
                 path, half a second at a time, so it still comes in across the edge) */
              for (var bk = 0; bk < 6 && seenReal(F, t - (t1 - F.from), C); bk++) { F.s0 -= 0.5 * F.v; F.dur += 0.5; F.ev0 += 0.5; F.enterT = (F.enterT || 0) + 0.5; }
              if (seenReal(F, t - (t1 - F.from), C)) { fail(J.it || {}, 'commit'); jobLog(J, null); J.keep = null; J.best = -1; return null; }   // (round 3: that path given up; round 2 tried it again every step)
            }
            F.id = ++FLIGHT_ID; F.pitch0 = Math.atan2(cam.s, cam.c);   // (development: the still view's pitch it was planned in)
            jobLog(J, F);
            commit(F, t1);
            return F;
          }
          /* (round 3) the kind and the count drawn, tried again before the ladder steps down to fewer birds: on the
             other side, the other way across (the turn's side), then setting off a little later (a later stretch of the
             course: another band, a far entry); round 2 went straight down to a lone bird a third to four fifths of
             the time in some skies */
          if (J.oi === 1 && J.F && (J.retry || 0) < (J.mode === 'next' ? RETRIES : 1) && J.mode !== 'still') {
            J.retry++;
            if (J.retry === 1 && (!J.role || J.role === 'cross' || J.role === 'local')) J.dir = -J.dir; else J.t += RETRY_LATER;   // (round 3, alive: a flight on the line or against it tries its own side later; flipped, still air showed one way 50-78 %)
            J.c = 0; J.a = 0; J.it = null; J.bands = null; J.pend = false;
            continue;
          }
          J.F = null;
          continue;
        }
        o = work; var st2 = J.pend;
        propose(J);
        quota -= 2 + (work - o);                          // (a path in the air costs what it costs to work out)
        if (HOST.dev && work - o > (STATS.costs[st2 ? 'propose2' : 'propose'] || 0)) STATS.costs[st2 ? 'propose2' : 'propose'] = work - o;
        if (J.it || J.pend) return null;                  // (its next stage, and its trial, on the next steps)
        continue;
      }
      res = trialRun(J.F, J.it, J.ahead, Math.min(quota, TRIAL_SLICE));   // (round 3: a slice of it a step)
      quota -= J.it.spent + 1;
      if (res !== 0 && HOST.dev && J.it.spent > (STATS.costs.trial || 0)) STATS.costs.trial = J.it.spent;
      if (res === 0) return null;                         // on with it next step
      if (res > 0 && J.it.probe) { J.it = trialIt(J, J.F, false); continue; }   // the bounding birds cleared it: now all of them
      if (res > 0) { J.jn = true; continue; }            // (judged on a step of its own, or this one if it is still fresh)
      else if (farOption(J)) continue;
      J.it = null;
    }
    return null;
  }

  var FILL_T = 12;   // (round 3, step 1) s with no bird seen: the next flight a lone bird (or else a pair) on a plain crossing (the floor under the rhythm: no 30-s empty sky; at 18 s a pattern retried and a fill's pair refused left 28-s spells)
  var FIRST_FILL = 6;   // (round 3, step 1) s after load with no flight yet planned: the first one floored the same way
  var RETRIES = 2, RETRY_LATER = 2, FIRST_LEAD = 1, LONE_REDRAW = 2, AWAY_GRACE = 6, TRIAL_PAST = 10, HIDDEN_FILL = 5, HIDJOB = -1e9, nearJob = false;
  /* (round 3) the birds held by flights the view has turned from (they give way to a new flight that needs them) */
  function givesWay(G) { return G.away && !G.gone && t - G.lastSeen > AWAY_GRACE; }   // (a flight looked away from a moment keeps its birds: the view may be coming back)
  function awaySlots() { var n = 0; for (var i = 0; i < flights.length; i++) if (givesWay(flights[i])) n += flights[i].m.length; return n; }
  function makeRoom(n) {
    while (freeSlots() < n) {
      var A = null;
      for (var i = 0; i < flights.length; i++) { var G = flights[i]; if (givesWay(G) && (!A || G.lastSeen < A.lastSeen)) A = G; }
      if (!A) return false;
      land(A); STATS.landed.unseen++;
    }
    return true;
  }
  /* a new flight: mode 'first' (it enters soon after load), 'next' (the scheduler's), 'still' (the composed still
     sky). If the pattern finds no room: the same again (above), then a flatter V, a smaller one, the same birds in a
     line, fewer in a line, a calm line, a calm small skein, a pair, and only then one (round 2 tried one bird before
     the calm line and the small skein) */
  function startJob(mode) {
    var r = vstream(100 + flightNo++), counts = [], free = freeSlots() + awaySlots(), n, kind, dir, order, i, seen = {};
    for (i = 0; i < flights.length; i++) if (!flights[i].gone) counts.push(flights[i].m.length);
    /* (round 3) no more birds than would take the window much past the live's own sky (its crowd and CROWD_UP more, a
       flight of three always allowed): two flights on the window and a big third made eleven birds and more at 1440 a
       tenth of the time, six on average where the live's sky holds four */
    if (mode !== 'still') free = Math.min(free, Math.max(3, Math.floor(crowdTarget() + CROWD_UP - seenNow)));
    if (free < 1) return false;
    var fill = mode !== 'still' && (t - lastSeenAny > FILL_T || (STATS.planned === 0 && t > FIRST_FILL));   // (round 3, step 1: the floor under the rhythm; the visit's first flight sooner)
    n = drawCount(r, free, counts);
    /* (round 3) a lone bird only if drawn three times (a lone bird of the live's ladder of fallbacks, now and then):
       alone on the window it was the live's now and then (1-7 % of its time), and round 2's turning view, ending flights
       sooner, made it a procession of them; the live's own rate of lone birds (a ninth of its flights) left 300 s runs
       with a quarter to two fifths of them lone, by chance */
    for (i = 0; n === 1 && mode !== 'still' && i < (mode === 'first' ? 4 : LONE_REDRAW); i++) n = drawCount(r, free, counts) || 1;   // (the first flight: a flock, as the live's, unless the sky's counts allow nothing else)
    if (!n) return false;
    if (mode === 'first' && n > 3 && openSky() < 0.35 * H) n = 3;   // a small sky: a small first flight, soon in view
    kind = mode === 'still' ? (n >= 3 ? 'skein' : n === 2 ? 'pair' : 'single') : drawKind(r, n);
    var clsJ = skyCls(), LCj = LIFE[clsJ];
    if (LCj && mode !== 'still' && !fill) {   /* (life) the pattern first, by the sky's class; then its birds; clamped to the room, never four */
      /* (the pattern drawn once, so its share is kept: one the room cannot hold now waits for room, never clamped into
         another; a lone bird is never kept back by the four rule) */
      var kd = weighted(r, LCj.pat), nt = kd === 'skein' ? (clsJ === 'first' || clsJ === 'moon' ? LIFE_N.skeinN : LIFE_N.skein) : LIFE_N[kd], nd = weighted(r, nt);
      if (LPEND && LPEND.cls === clsJ && t - LPEND.t < LPEND_T && t - lastSeenAny < 12) { kd = LPEND.kd; nd = LPEND.nd; }   // (fix: the pattern drawn before, waiting for room: its share kept)
      var lo = LIFE_MIN[kd], nd0 = nd;   // (round 3, step 3: a skein five or more at night and first light too)
      if ((kd === 'loose' || kd === 'skein') && nd > free && seenNow <= 1) free = Math.min(freeSlots() + awaySlots(), nd);   // (round 3, step 3: a skein too: one sight)   // (fix: a loose flock is the evening's one sight: an all but empty sky takes it whole)
      if (kd === 'skein' && nd - free >= 2 && seenNow > 1) { if (!LPEND || LPEND.kd !== kd || LPEND.cls !== clsJ) LPEND = { kd: kd, nd: nd0, cls: clsJ, t: t }; return false; }   // (round 3, step 3: it waits for a thinner sky)
      if (nd > free) nd = free;
      if (nd !== 1 && makesFour(nd, counts)) nd = nd - 1 >= lo && !makesFour(nd - 1, counts) ? nd - 1 : 0;
      if (nd === 4) nd = 3 >= lo ? 3 : 0;
      if (nd < lo) { if (!LPEND || LPEND.kd !== kd || LPEND.cls !== clsJ) LPEND = { kd: kd, nd: nd0, cls: clsJ, t: t }; return false; }
      LPEND = null;
      kind = kd; n = nd;
    }
    var turnF = 0, sortF = null, giftF = false, nearF = false;
    dir = r() < faithful ? season : -season;              // most flights go the season's way; now and then one the other
    /* (life, DESIGN 2.3) the flight line to a roost: most flights take the way (left or right on the window, and how far
       off its plane) whose heading through the air stands nearest the visit's roost bearing (at first light away from
       it, at night a migration's bearing 90 deg on); the planner then flies that way if it finds room. Their path sinks
       toward the roost, climbs a little at first light, is level at night */
    var hdPref = null, roostB = false, sinkPref = null, roleJ = null, roleD = null, tgtJ = 0;
    if (LCj && mode !== 'still') {
      if (clsJ !== roostCls) {   /* (fix, L3) the roost's bearing set once a sky: 55-75 deg off the view, upwind in a crosswind, and never moved after (judge-bio1: moved by the wind, the blue hour crossed both ways) */
        roostCls = clsJ; var rq = vstream(7010 + roostK++), VPq = HOST.flight ? HOST.flight(FLX) : null, vq = VPq && VPq.ok ? VPq.view : 0, sq = rq() < 0.5 ? 1 : -1;
        if (WIND_ON && clsJ === 'moon') { var Cq = HOST.camera ? HOST.camera() : null; windNow(); var wq0 = Cq ? WINDV[0] * Cq.r[0] + WINDV[2] * Cq.r[2] : 0; if (Math.abs(wq0) >= WIND_SIDE && rq() < DIR_NIGHT_DOWN) sq = wq0 > 0 ? -1 : 1; }   // (round 3, alive: never set by the wind, but a night's migrants pick a following wind)
        for (var gq = 0; gq < 4; gq++) roostFlip[gq] = clsJ === 'moon' || rq() < (DIR_AGREE[clsJ] || 0.8) ? 1 : -1;   // (round 3, alive: each kind group's roost on the sky's side or the other)
        roostVq = vq;
        roostPsi = vq + sq * pick(rq, [55, 75]) * DEG - (clsJ === 'first' ? Math.PI : clsJ === 'moon' ? Math.PI / 2 : 0);
      }
      var tgt = clsJ === 'first' ? roostPsi + Math.PI : clsJ === 'moon' ? roostPsi + Math.PI / 2 : roostPsi;
      /* (round 3, alive) the flight's role (DIRS); its side and how far off the window's plane it heads are worked out
         once its kind is drawn (roleWay: each kind group's roost its own side); never sent upwind */
      var DW = DIRS[clsJ] || DIRS.glow;
      roleJ = weighted(r, [['stream', DW[0]], ['counter', DW[1]], ['cross', DW[2]], ['local', DW[3]]]);
      roleD = [r(), r(), r(), r()]; tgtJ = tgt; roostB = roleJ === 'stream';
      if (roleJ === 'stream') sinkPref = clsJ === 'first' ? pick(r, ROOST.climbFirst) * DEG : clsJ === 'moon' ? 0 : -pick(r, ROOST.sink) * DEG;
      else if (roleJ === 'counter') sinkPref = clsJ === 'moon' ? 0 : pick(r, DIR_CLIMB) * DEG;
      else if (roleJ === 'cross') sinkPref = clsJ === 'moon' ? 0 : -pick(r, ROOST.other) * DEG;
      else sinkPref = (r() * 2 - 1) * DEG;
      STATS.roles = STATS.roles || {}; STATS.roles[roleJ] = (STATS.roles[roleJ] || 0) + 1;
    }
    order = [];
    function add(o) { var k = o.join(':'); if (!seen[k]) { seen[k] = 1; order.push(o); } }
    add([kind, n]);
    if (kind === 'soar') add([n === 1 ? 'single' : n === 2 ? 'pair' : 'skein', n]);
    if (n >= 3 && kind !== 'line' && kind !== 'loose') {   // (round 3, step 3: a loose flock falls to lines, not to a skein)
      add(['skein', n, 0, 1]);
      for (i = n - 2; i >= 5; i -= 2) add(['skein', i, 0, 1]);   // (round 3, step 3: never under five)
      add(['line', n]);
    }
    if (n >= 5) add(['line', n - 2 === 4 ? 3 : n - 2]);
    if (n >= 3) add(['line', Math.min(n, 5) === 4 ? 3 : Math.min(n, 5), 1]);
    if (n >= 5 && kind === 'skein') add(['skein', 5, 1, 1]);   // (round 3, step 3: a calm skein of five, never three)
    if (n >= 3) add(['pair', 2]);
    if (n >= 2) add(['single', 1]);
    add(['single', 1, 1]);
    if (LCj && mode !== 'still' && kind !== 'single') order = order.filter(function (o) { return o[0] !== 'single' && (kind === 'pair' || o[0] !== 'pair'); });   // (fix, L1: a skein, a line or a flock that finds no path is not flown as a lone bird or a pair: it waits)
    /* (round 3) a sky the clouds have kept empty (every path behind the towers) for HIDDEN_FILL s: a lone bird near the
       eye, in front of them, fills it until the towers pass */
    if (fill) { order = free >= 2 && !makesFour(2, counts) ? [['single', 1], ['pair', 2], ['single', 1, 1]] : [['single', 1], ['single', 1, 1]]; STATS.fill = (STATS.fill || 0) + 1; }   // (round 3, step 1)
    if (mode !== 'still' && t - HIDJOB < 3 && t - lastSeenAny > HIDDEN_FILL) { order = [['single', 1]]; nearJob = true; } else nearJob = false;
    job = { fill: fill, mode: mode, r: r, order: order, oi: 0, counts: counts, dir: dir, F: null, near: nearJob, turnF: turnF, sortF: sortF, giftF: giftF, nearF: nearF, cls: clsJ, hdPref: hdPref, roost: roostB, sinkPref: sinkPref, role: roleJ, rd: roleD, tgt: tgtJ };   // (sortF, giftF, dev: a film's kind and the gift's write-on, SIMULATED S5)   // (turnF, dev: a film's wheeling flight)
    resetJob();
    return true;
  }
  /* a job (re)started: the coming view from now; the still view the camera as the flight will set off (its heading the
     flight's frame's, its pitch the planner's camera's); the predicted sweep of the land across the window (the live's
     resetJob, then this) */
  function resetJob() {
    resetJob0();
    if (!job) return;
    var J = job;
    if (J.mode === 'first') J.t = t + FIRST_LEAD;   // (round 3: a first flight sets off a moment after its job begins: its trials, a share a step, are done by then)
    viewPredict(J.mode === 'still' || HOST.reduced());
    var lead = Math.max(0, J.t - t), kf = lead / STEP, k0 = Math.floor(kf), a = kf - k0;
    viewNeed(k0 + 2);
    var i0 = Math.min(k0, VP.n - 1), i1 = Math.min(k0 + 1, VP.n - 1);
    camera(VP.pitch[i0] + (VP.pitch[i1] - VP.pitch[i0]) * a);
    J.yaw = VP.yaw[i0] + angDiff(VP.yaw[i1], VP.yaw[i0]) * a;
    J.sweep = sweepAhead(lead + 8); J.far = false; J.why = {}; J.pend = false; J.jn = false;
  }

