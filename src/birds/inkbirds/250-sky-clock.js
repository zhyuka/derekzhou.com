  /* ---------------- the sky's clock (the engine's fixed steps; no clock is read) ---------------- */

  var t = 0, tNext = 0, misses = 0, stills = 0, firstNext = true, STEP_DT = 1 / 60, GONE_T = 1.2, APPEAR_T = 1, STILL_Q = 1500, STILL_G = 40;

  /* how long a flight is in view, near enough (as its trial saw it through the coming view) */
  function inViewFor(F) { return Math.max(4, F.seenSpan || (F.dur - F.from - 2 * OUT / (F.v * F.n0 || SPEED[1]))); }
  function gapAfter(F) {
    var g0 = inViewFor(F) * pick(F.r, GAP) * (1 + Math.min(THIN_MAX, t / THIN)) * (1.1 - 0.2 * fTraffic) * OPEN_SKY * GAP_K * crowd(), LC = LIFE[F.cls];
    if (!LC) return g0;
    return Math.min(g0 * LC.gap, inViewFor(F) + LC.empty - 12);   // (life: x the class's gap; the empty spell after it never over the class's longest, less the next one's set-off and entry)
  }
  /* a job is done: when the next flight comes */
  function planned(F, mode) {
    if (mode === 'still') { if (F && ++stills < (W >= WIDE ? 2 : 1)) startJob('still'); return; }   // the still sky: a second flight on a wide one
    if (F) { misses = 0; tNext = t + (mode === 'first' ? pick(F.r, [0.12, 0.25]) * inViewFor(F) : gapAfter(F)); }   // the second a few seconds after the first
    else { misses++; tNext = t + Math.min(2 * RETRY, RETRY * misses) * OPEN_SKY * (t - lastSeenAny > EMPTY_T ? 0.35 : 1); }   // no room (the bands are taken): look again a little later (soon, in an empty sky)
  }
  var lastSeenAny = 0, EMPTY_T = 1.5;
  var GAP_K = 1;               // (round 3) the gaps between flights, on the live's
  /* (round 3) the sky's own measure of how full it has been: the birds on the window, a running mean over CROWD_T s; the
     gaps stretched as far as it is over the live's own (3.3 birds on a phone, 4.2 at 1440: a flight in the turning
     world is on the window longer than its trial could see, and the sky held half again the live's birds) */
  var CROWD_T = 60, crowdN = 0, CROWD = [3.3, 4.2], CROWD_OVER = 1.5, CROWD_UP = 3.5;
  function crowdTarget() { return CROWD[0] + (CROWD[1] - CROWD[0]) * clamp((W - 390) / 1050, 0, 1); }
  function crowd() { var k = crowdN / crowdTarget(); return clamp(k * k, 1, 4); }
  /* into a sky a flight has left unseen, the next comes as the first did, within a second or two */
  function nextAsFirst(now) {   // (E1.1 Fix 2: now, the words' guard letting a flight go: the next planned at once, while it fades, not 0.5 s on)
    /* (round 3) only into a sky no other flight is in or coming into: with others there, the rhythm goes on as it was
       (round 2 brought the next as the first, a second or two later, whenever any flight went: the sky over-filled) */
    for (var i = 0; i < flights.length; i++) { var G = flights[i]; if (!G.gone && !G.away && (t - (G.lastSeen || -1e9) < 1 || (G.firstSeen === undefined && t - G.t0 < (G.enterT || 0) + 2))) return; }
    firstNext = true; tNext = Math.min(tNext, t + (now ? 0 : 0.5)); misses = 0;
  }
  /* is any bird of a flight seen through the world's camera C (beyond its planned end: the camera may have turned to it) */
  function seenReal(F, tau, C) {
    for (var i = 0; i < F.m.length; i++) {
      var m = F.m[i], d = m.d;
      where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
      if (tmp3.z > 1 && fadeFor(F, tmp3.n) >= 0.02 && inView(tmp3.x, tmp3.y, d.hw * tmp3.n, d.hh * tmp3.n)) return true;
    }
    return false;
  }
  function measureIf() { if (dirty || changed()) relayout(); }
  /* each bird, 12 times a second on the flight's own steps (so a still is the same drawn alone or in a film): when it
     comes into view (its appear begins), and which way it faces: the way it goes on the window against the world (the
     camera's turn left out: a bird swept back by a turn of the view still faces the way it flies), turning only past
     FACE_HYST (the live's hysteresis); and, a flight's, when any bird of it was last seen and how long all its birds
     on the window have been behind cloud */
  var seenNow = 0;
  function track(C) {
    var i, j, F, m, s, tau, c, dx, dy, d, vis, li, any, cl, on;
    seenNow = 0;
    for (li = 0; li < 2; li++) for (i = 0; i < (li ? PLACES : flights).length; i++) {
      F = (li ? PLACES : flights)[i]; tau = t - F.t0; any = false; cl = true; on = 0;
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; s = m.s; if (!s) continue; d = s.d;
        where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
        vis = tmp3.z > 1 && fadeFor(F, tmp3.n) >= 0.02 && inView(tmp3.x, tmp3.y, d.hw * tmp3.n, d.hh * tmp3.n);
        if (!vis) { if (s.vis) { s.vis = false; s.outT = t; } s.still = false; s.wpT = -1; continue; }   // (out of view: when it is back, below)
        on++; if (!(s.wf > 0.5)) cl = false; if (!li) seenNow += F.kind === 'ribbon' ? 0.2 : 1;   // (birds3d: a speck a fifth of a bird)
        /* (seen: in view, and not behind cloud; the words hide no bird) */
        if (!(s.wf > 0.5)) any = true;
        /* (E1.1) the bird's own speed on the window, as drawn (its flight's motion and the camera's, a drag's
           included): from where it was last step, eased over about 0.08 s */
        if (s.wpT > 0 && t - s.wpT > 0 && t - s.wpT < 0.2) {
          var wdt = t - s.wpT, wvx = (tmp3.x - s.wpX) / wdt, wvy = (tmp3.y - s.wpY) / wdt, wk = Math.min(1, wdt / 0.08);
          if (s.wvOk) { s.wvx += (wvx - s.wvx) * wk; s.wvy += (wvy - s.wvy) * wk; } else { s.wvx = wvx; s.wvy = wvy; s.wvOk = true; }
        } else s.wvOk = false;
        s.wpX = tmp3.x; s.wpY = tmp3.y; s.wpT = t;
        where(F, m, tau + 0.25, wa); projReal(wa.x, wa.y, wa.z, C, pa);
        dx = pa.x - tmp3.x; dy = pa.y - tmp3.y; c = dx / (Math.sqrt(dx * dx + dy * dy) || 1);
        if (!s.vis) {
          s.vis = true;
          /* its appear: the live's 1 s, the first time it is seen. (round 3) Back in view within LEAVE_T, it carries on
             at its ink: it crosses back over the edge it left by, as the land does (round 2 faded it in again from
             nothing, already well inside the window); back after longer, its appear again, done within about 30 px of
             the edge at the speed the window carries it in */
          if (s.still) { if (s.shownT < 0) { s.shownT = t; s.appT = APPEAR_T; } }   // (the still sky's: shown already, facing as it was drawn)
          else if (s.shownT < 0) { s.shownT = t; s.appT = APPEAR_T; s.face = dx < 0 ? -1 : 1; }
          else if (t - s.outT > LEAVE_T) { s.shownT = t; s.appT = clamp(30 / Math.max(1, Math.sqrt(dx * dx + dy * dy) / 0.25 + sweepNow()), 0.15, APPEAR_T); }
        }
        if (c === c) {
          if (s.face > 0 && c < -FACE_HYST) s.face = -1;        // turn to face left (mirrored)
          else if (s.face < 0 && c > FACE_HYST) s.face = 1;     // face right (as drawn)
        }
      }
      if (any) { F.lastSeen = t; lastSeenAny = t; if (F.firstSeen === undefined) F.firstSeen = t; F.away = false; }
      F.cloudT = on && cl && !FORCED ? (F.cloudT || 0) + 5 * STEP_DT : 0;
    }
  }
  /* (round 3) the window's sweep under a bird now: f x the camera's turn (its last quarter second), across and (a drag
     tilts the view too) up and down */
  function sweepNow() {
    if (CH.n < 2) return 0;
    var a = (CH.i + 31) % 32, b = (CH.i + 32 - Math.min(CH.n, 16)) % 32, dt = CH.t[a] - CH.t[b];
    if (!(dt > 0)) return 0;
    var sx = cam.f * angDiff(CH.yaw[a], CH.yaw[b]) / dt, sy = cam.f * (CH.pitch[a] - CH.pitch[b]) / dt;
    return Math.sqrt(sx * sx + sy * sy);
  }
  var DRAG_PX = 150;            // px/s: the window swept faster than this (the visitor's drag; the autopilot's calm turn is 10-20)
  function activeFlights() { var n = 0; for (var i = 0; i < flights.length; i++) if (!flights[i].away && !flights[i].gone) n++; return n; }
  /* (round 3) the calm asked of the camera while the birds fly (a sky with birds in it, or one about to have them: a
     flight is planned before it comes, through the camera's coming turn, so the calm is asked for all along): its turn
     sweeping the land across the window at most CALM_K of the live's median pace there (HOST.calm; the engine eases it
     in and out over 2 s; under reduced motion or forced colours the birds ask nothing) */
  var calmOn = -1, coverAvg = 0, COVER_PLAN = 0.5;
  /* the calm's rate (rad/s): the camera's own turn sweeps the land across the window at CALM_K of the live's median pace */
  function calmBase() { return cam.f >= 2 ? CALM_K * (W / across(CALM)) / cam.f : 0; }
  function calmAsk() {
    if (!HOST.calm || cam.f < 2) return;
    var base = !FORCED && !HOST.reduced() ? calmBase() : 0, rate = base;
    if (Math.abs(rate - calmOn) > 1e-7) { calmOn = rate; HOST.calm(rate, base * CALM_EV); }
  }

  /* one fixed step: the frames, the clock, the planning (a share of it), the flights that are done */
  function step(dt) {
    STEP_DT = dt;
    forcedCheck();
    if (!frameStep()) return;
    var moving = !HOST.reduced(), cover = FORCED ? 0 : HOST.cover(), F, mode, i, C = camStep();
    if (moving) t += dt;
    measureIf();
    STATS.steps++;
    if (C) { camHistory(C); if (moving) camVelStep(C); }
    if (moving && STATS.steps % 6 === 0) errLearn();
    calmAsk();
    /* (round 2) an empty sky is not kept waiting: no bird seen a second and a half, and the next comes as the first did
       (the view turns flights out of sight sooner than the live's sky ended them) */
    if (moving && !job && t - lastSeenAny > EMPTY_T && !firstNext) {
      firstNext = true; tNext = Math.min(tNext, t); misses = 0;
      /* (the flights out of sight that are not about to come into it are let go: the new one is not kept from their bands) */
      for (i = flights.length - 1; i >= 0; i--) { F = flights[i]; if (!F.gone && F.firstSeen === undefined && !(t - F.t0 < (F.enterT || 0) + 1.5) && !(C && seenReal(F, t - F.t0, C)) && !drawnNow(F)) { land(F); STATS.landed.unseen++; } }   // (round 3: a flight seen before is kept: the view may come back to it)
    }
    var w0 = work;
    /* (round 3) the view clearing (a passage's cloud thinning out, the cover falling under COVER_PLAN): the next flight is
       planned as it clears, there as it has (round 2 waited for the cover all but gone: every passage between realms left
       the sky empty some 2 s longer) */
    coverAvg += (cover - coverAvg) * Math.min(1, dt / 0.5);
    var clearing = cover < COVER_PLAN && cover < coverAvg - 0.01;
    if (C && moving && !FORCED && liveOn()) liveStep(C, dt);   // (round 3: the living sky)
    if (!liveOn() && !job && moving && (cover < 0.05 || clearing) && t >= tNext && activeFlights() < maxFlights() && seenNow < crowdTarget() + CROWD_OVER) {   // (round 3: nor while the window already holds more than the live's sky)
      if (!startJob(firstNext ? 'first' : 'next')) planned(null, 'next');
    }
    if (job) {
      if (cover > 0.5 && job.mode !== 'still') job = null;   // (the view is covered: no flight is planned behind it)
      else {
        mode = job.mode;
        F = workJob(QUOTA_STEP - (work - w0));            // (a job's start, the coming view's first samples, counted in the step's quota)
        STATS.workMax = Math.max(STATS.workMax, work - w0);
        if (F || !job) { if (F) { firstNext = false; STATS.planned++; } planned(F, moving ? mode : 'still'); }
      }
    }
    if (C && STATS.steps % 5 === 0) { track(C); if (moving) crowdN += (seenNow - crowdN) * 5 * dt / CROWD_T; }
    if (C && moving && !FORCED) for (i = 0; i < flights.length; i++) if ((STATS.steps + 3 * i) % GUARD_EVERY === 0) guard(flights[i]);   // (round 3: each flight a few seconds ahead, on a step of its own)
    if (moving) guestStep(dt);   // (life: the guests, after every ordinary bird's step: nothing of theirs is read back)
    if (PLACES.length && FL.ok) placeLift(dt);
    for (i = flights.length - 1; i >= 0; i--) {           // done: past its end and seen no more (or faded out); or let go unseen
      F = flights[i];
      var tau = t - F.t0;
      var endNow = F.gone && t - F.gone > (F.goneT || GONE_T), due = !endNow && ((tau > F.dur && (!C || !seenReal(F, tau, C))) || tau > F.dur + 40);
      /* (fix round) a flight is done only when none of its birds is drawn: one still drawn (the planner's end against the
         turning view, or its 40 s past its span) goes as a flight the words moved onto goes, fading together over
         LATE_T, never popped out mid-sky (round 2: a skein at full ink 79 px inside the edge gone in a frame) */
      if (due && drawnNow(F)) { if (!F.gone) { F.gone = t; F.goneT = LATE_T; STATS.landed.late = (STATS.landed.late || 0) + 1; } due = false; }
      if (endNow || due) { land(F); STATS.landed.done++; continue; }
      if (F.gone || !moving) continue;
      if (F.firstSeen !== undefined && t - F.lastSeen > LEAVE_T && !(C && seenReal(F, tau, C))) {   // the view has turned from it
        /* (round 3) kept, unseen, while its planned span lasts (AWAY_T at most): the visitor may look back to it (round
           2 let it go after LEAVE_T, and a skein looked away from for 4 s was gone when the view came back); its band is
           free meanwhile, the next flight comes as the first did, and it gives way to one that needs its birds */
        if (tau < F.dur && t - F.lastSeen < AWAY_T) { if (!F.away) { F.away = true; STATS.away++; nextAsFirst(); } continue; }
        if (drawnNow(F)) { F.gone = t; F.goneT = LATE_T; STATS.landed.late = (STATS.landed.late || 0) + 1; continue; }   // (fix round: drawn, it fades)
        land(F); STATS.landed.unseen++; if (!F.away) nextAsFirst(); continue;
      }
      if (F.firstSeen === undefined && tau > (F.enterT || 0) + UNSEEN_T && !(C && seenReal(F, tau, C))) { if (drawnNow(F)) { F.gone = t; F.goneT = LATE_T; continue; } land(F); STATS.landed.never++; nextAsFirst(); continue; }   // it never came into view
      if (F.cloudT > CLOUD_T) { F.gone = t; STATS.landed.cloud++; nextAsFirst(); continue; }   // hidden by cloud: let go while it is hidden
    }
  }
  /* forced colours came or went: the sky begins again in the other view */
  function forcedCheck() {
    var f = !!(HOST.forced && HOST.forced().on);
    if (f === FORCED) return;
    FORCED = f; clearAll(); dirty = true;
  }

  /* the window changed shape, or the words moved: the planner's camera is aimed again; a flight the words moved onto
     fades away (never popping), and into a sky left empty the next comes as the first did */
  function relayout() {
    var w0 = W, h0 = H, i, F, gone = 0;
    measure();
    camera();
    if (FORCED) forcedCam();
    if (!flights.length) { if (job) resetJob(); return; }
    if (W !== w0 || Math.abs(H - h0) > 120) { for (i = 0; i < flights.length; i++) if (!flights[i].gone) { flights[i].gone = t; gone++; } }
    else {
      viewPredict(HOST.reduced());
      for (i = flights.length - 1; i >= 0; i--) { F = flights[i]; if (!F.gone && trial(F, t - F.t0) < 0) { F.gone = t; gone++; } }
    }
    if (gone) { firstNext = true; tNext = Math.min(tNext, t + GONE_T); }
    if (job) resetJob();
  }
  /* the sky begins again (a visit, a reset): every flight gone, the first comes as at the start */
  function clearAll() { STILL.on = false; GVT = -1e9; lastSeenAny = t; clearSky(); while (PLACES.length) landPlace(PLACES[0]); job = null; stills = 0; firstNext = true; tNext = t; misses = 0; }

  /* reduced motion: a still sky, a photograph: the flight planned whole, every bird at rest. (round 3) A share of it
     at a time: the engine asks prepare() each frame while its still sky shows, before its one still frame (round 2
     planned it all inside that frame's draw: 49 ms cold at 1440); a draw that finds it unfinished finishes it */
  var STILL = { on: false };
  function stillStep(quota) {
    if (!STILL.on) {
      if (flights.length || BUSY) return true;            // (planned already)
      BUSY = true; forcedCheck(); measure(); camera(); if (FORCED) forcedCam(); stills = 0; BUSY = false;
      if (!frameStep()) return false;
      if (!startJob('still')) return true;
      STILL.on = true;
    }
    /* (round 3, second part) as many of the job's stages a call as its quota of bird-steps allows: a stage a call (a
       path's halves, a trial's slice, a judging, each on a call of its own, as a moving sky's are on steps of their own)
       left a wide still sky unplanned after the engine's 120 calls, and the draw finished it (21 ms at 1440, DUNES s5;
       17-137 ms in the fake world) */
    var w0 = work, F, g;
    for (g = 0; g < STILL_G; g++) {
      F = workJob(quota - (work - w0));
      if (F || !job) planned(F, 'still');
      if (!job) { STILL.on = false; return true; }
      if (work - w0 >= quota || (HOST.budget && HOST.budget() <= 0)) break;   // (and the engine's time for it this frame)
    }
    return false;
  }
  function stillSky() { if (BUSY) return; for (var g = 0; g < 400 && !stillStep(1e9); g++); }
  var BUSY = false;

