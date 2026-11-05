  /* ---------------- the staging (birds3d): S3 out from behind the cloud tower, S1 the ribbon, S2 the wheel ---------------- */

  /* The owner, of the bigger staging (streams of birds, flocks wheeling round landmarks, gulls coming out from behind the
     cloud tower): "Yes, calmly". Three staged moments (SPEC 6), rare, one at a time, each planned whole before a bird is
     seen, through the camera's course (its heading held: the course is the flight itself), as every flight is:
       S3: a file of gulls (or ibis, geese) keeping pace behind a cloud tower's inner flank, revealed edge by edge as the
           tower slides past (each bird starts wholly behind it, its cover falling once to nothing, never covered again),
           then crossing under the words and out by the far edge;
       S1: a ribbon of far specks low over the sea under the words, weaving (a yaw weave and a rise and fall), curved from
           its first frame, in and out across the side edges;
       S2: a wheel: a loose clump going round a landmark, fixed in the world, coming out of the distance and swept out
           with the land (or away on its tangent before it would come too near).
     The stage clock: the first FIRST_STAGE s after the world shows, then STAGE_GAP after the last one left (stretched as
     the visit goes); when due it looks every STAGE_LOOK s for up to STAGE_LOOK_MAX s, else waits RETRY_STAGE s. While a
     stage is planned nothing else is (the hush); while one is in view the sky takes one flight fewer. */
  var FIRST_STAGE = 40, STAGE_GAP = [110, 180], STAGE_LOOK = 5, STAGE_LOOK_MAX = 60, RETRY_STAGE = 30, HUSH_T = 6;
  var STAGE_W = [['S3', 40], ['S2', 35], ['S1', 25]];
  var REVEAL_CLEAR = 60, RIBBON_CLEAR = 48, WHEEL_GROW = 0.03, STAGE_QUOTA = 400, STAGE_CANDS = 10;
  var S3_N = [[3, 35], [5, 40], [7, 25]], S3_SORT = [['gull', 70], ['ibis', 15], ['goose', 15]], S3_MPS = [4, 6], S3_HEAD = [10, 12];
  var S1_SORT = [['goose', 50], ['ibis', 30], ['gull', 20]], S1_RANK = [1.6, 3.0], S1_ABREAST = [[1, 1], [2, 2], [3, 2], [4, 1]], S1_YAW = [22, 28], S1_LAM = [380, 520], S1_RISE = [11, 16], S1_LAM2 = 260, S1_MPS = [7, 10], S1_N0 = [0.24, 0.32], S1_MAXT = 70;
  var S2_N = [[5, 25], [7, 40], [9, 25], [11, 10]], S2_SORT = [['gull', 50], ['stork', 25], ['ibis', 15], ['crow', 10]], S2_MPS = [9, 12], S2_ARC = [20, 60], S2_LEAD = 25, S2_BANK = 8;   // (S2_LEAD s: the latest a wheel may first be seen after its look)
  var STG = { due: FIRST_STAGE, lookFrom: -1, nextLook: 0, last: null, cur: null, job: null, log: [], force: null, inView: false, n: 0, why: {}, hush: [-1, -1], failT: {} };
  STG.reset = function () { STG.due = FIRST_STAGE; STG.lookFrom = -1; STG.nextLook = 0; STG.last = null; STG.cur = null; STG.job = null; STG.log = []; STG.force = null; STG.inView = false; STG.n = 0; STG.why = {}; STG.hush = [-1, -1]; STG.failT = {}; };
  var FIRST_LEAD_IN = 2;   // s: a flight set off is in view this soon or later (the hush's lead)
  STG.state = function () { return { due: +STG.due.toFixed(1), last: STG.last, cur: STG.cur ? { stage: STG.cur.stage, id: STG.cur.id || STG.cur.key, t0: STG.cur.t0 } : null, job: STG.job ? STG.job.kind : null, log: STG.log.slice(-12), inView: STG.inView, why: STG.why }; };
  /* (dev) a candidate of a kind made and walked, its numbers: why a stage finds no room */
  STG.debug = function (kind) {
    var J = { kind: kind, r: vstream(7777), c: 0 }, out = { kind: kind };
    stageCourse(J); out.cam = { f: cam.f, pitch: Math.atan2(cam.s, cam.c) / DEG, y0: cam.y0, hy: cam.hy }; out.camY = VP.y[0]; out.ground = FL.ok ? HOST.ground(VP.x[0], VP.z[0]) : null; out.floorY = floorY;
    if (kind === 'S1') {
      var F = s1Make(J); out.n0 = F.n0; out.depth = cam.f * MPU / F.n0;
      var ok = s1Path(J, F); out.ok = ok; out.sa = F.sa; out.len = F.len; out.edges = F.edges; out.dur = F.dur;
      if (F.path) { var probe = []; for (var s2 = -2000; s2 <= 2000; s2 += 400) { path3(F, s2, wp); proj(wp.x, wp.y, wp.z, pp); probe.push([s2, +wp.y.toFixed(1), +pp.x.toFixed(0), +pp.y.toFixed(0), +pp.n.toFixed(3), walkAt(F, s2)]); } out.probe = probe; }
    }
    if (kind === 'S3') {
      J.tws = s3Towers(); out.towers = J.tws.map(function (q) { return [Math.round(q.al), Math.round(q.lat), Math.round(q.p.r), Math.round(q.flank), Math.round(q.p.top || 0)]; });
      wayOf(WAY); out.all = TOW.filter(function (p) { return p.kind === 'tower'; }).map(function (p) { return [Math.round((p.x - FL.x) * WAY.fx + (p.z - FL.z) * WAY.fz), Math.round((p.x - FL.x) * WAY.rx + (p.z - FL.z) * WAY.rz), Math.round(p.r), Math.round(p.pass), p.w ? Math.round(p.w) : null]; }); out.speed = FL.speed; out.dmax = cam.f * MPU / 0.44;
      out.tries = [];
      for (var c3 = 0; c3 < 8 && J.tws.length; c3++) {
        J.tw = J.tws[c3 % J.tws.length]; var cd = s3Cand(J), rec = { cand: cd ? { lead: +cd.lead.toFixed(1), kL: cd.kL, qx: Math.round(cd.qx), qy: Math.round(cd.qy), n0: +cd.n0.toFixed(2) } : null };
        if (cd) {
          var iK = Math.min(cd.kL, VP.n - 1), tp = J.tw.p;
          rec.cbCenter = +HOST.cloudBetween(VP.x[iK], VP.y[iK], VP.z[iK], tp.x, VP.y[iK], tp.z).toFixed(1);
          rec.cbTop = +HOST.cloudBetween(VP.x[iK], VP.y[iK], VP.z[iK], tp.x, (tp.base + tp.top) / 2, tp.z).toFixed(1);
          rec.tower = { base: Math.round(tp.base), top: Math.round(tp.top), r: Math.round(tp.r), camY: Math.round(VP.y[iK]) };
        }
        if (cd) { var F3 = s3Make(J, cd); rec.made = !!F3; if (F3) {
          spot(F3, F3.m[0], 0, tmp); airWorldK(F3, tmp.ax, tmp.ay, tmp.az, cd.kL, PW); rec.bird = [Math.round(PW.x - tp.x), Math.round(PW.y), Math.round(PW.z - tp.z)]; rec.cbBird = +HOST.cloudBetween(PW.cx, PW.cy, PW.cz, PW.x, PW.y, PW.z).toFixed(1); J.F = F3; stageTrialInit(J, cd.kL); var r3 = s3Trial(J, 1e9); rec.res = r3; rec.why = J.it.why; rec.k = J.it.k; rec.st = Array.from(J.it.st); rec.cmin = Array.from(J.it.cmin).map(function (v) { return +v.toFixed(2); }); rec.rx = J.it.rx; rec.sort = F3.sort; rec.n = F3.m.length; } }
        out.tries.push(rec);
      }
    }
    if (kind === 'S2w') {   // (dev: the stage's own course, one look run whole)
      STG.force = 'S2'; STG.why = {}; var okS = stageStart(), J2 = STG.job, ks = [];
      if (okS && J2) { var w1 = work; while (STG.job === J2 && work - w1 < 1e7) { if (J2.F && J2.it) ks.push([J2.c, J2.it.k, J2.it.k0, VP.n, J2.mk && J2.mk.p.kind]); stageWork(500); } }
      out.ok = okS; out.log = STG.log.slice(-2); out.why = STG.why; out.ks = ks.slice(0, 40); out.VPn = VP.n; return out;
    }
    if (kind === 'S2') {
      J.mks = s2Marks(); out.marks = J.mks.map(function (q) { return [q.p.kind, Math.round(q.al), Math.round(q.lat), Math.round(q.p.r), Math.round(q.p.top || q.p.y)]; });
      J.mk = J.mks[0];
      if (J.mk) {
        var P = s2Make(J); out.P = P ? { cx: P.cx, cy: P.cy, cz: P.cz, R: P.R, n: P.m.length } : null;
        if (P) { var rows = []; for (var k = 0; k < 300; k += 10) { viewNeed(k + 1); if (k >= VP.n) break; wheelSpot(P, P.m[0], k * STEP, wq); worldOnK(wq.x, wq.y, wq.z, k, pv); rows.push([k, +pv.x.toFixed(0), +pv.y.toFixed(0), +pv.n.toFixed(3)]); } out.rows = rows; out.VPn = VP.n;
          J.F = P; stageTrialInit(J, Math.round(1 / STEP)); var res = s2Trial(J, 1e9); if (res < 0 && J.it.redo) { stageTrialInit(J, J.it.k0); res = s2Trial(J, 1e9); }
          out.trial = { res: res, why: J.it.why, k: J.it.k, enter: J.it.enter, last: J.it.last, near: J.it.near, g98: J.it.g98, tx: P.m[0].tx }; }
      }
    }
    return out;
  };
  STG.dev = function (o) {
    if (o && o.debug) return STG.debug(o.debug);
    if (o && o.force) { STG.force = o.force; STG.film = !!o.film; if (o.now !== false) { STG.due = Math.min(STG.due, t); STG.nextLook = t; STG.lookFrom = -1; } }   // (film, dev: a wheel already in the sky at the film's first frame, as S4's, near the camera's way: for a film with the camera slowed, SIMULATED)
    if (o && o.off) { STG.due = 1e9; }
    return STG.state();
  };
  function stageWhy(k) { STG.why[k] = (STG.why[k] || 0) + 1; }
  function pickW(r, list) { return weighted(r, list); }
  /* the stage's own fade for far specks and a far wheel (a travelling flight's: FAR 0.42 .. FADE 0.54) */
  function stageFade(F, n) { var a = F.fadeS; return n >= a[1] ? 1 : n <= a[0] ? 0 : ease((n - a[0]) / (a[1] - a[0])); }

  /* the course from now, and the still view as the stage sets off: the planner's own (viewPredict, camera) */
  function stageCourse(J) {
    viewPredict(false);
    camera(VP.pitch[0]);
    J.yaw = VP.yaw[0]; J.t = t;
  }
  /* the camera's way (level), its right, and where a world point lies along and beside it */
  function wayOf(o) { var fx = Math.sin(FL.psi), fz = Math.cos(FL.psi); o.fx = fx; o.fz = fz; o.rx = -fz; o.rz = fx; return o; }
  var WAY = {};
  /* a point of the world (m) through the course's camera at sample k: on the window (CSS px) and its nearness */
  var SGF = { yaw: 0, cyw: 1, syw: 0 };
  function worldOnK(x, y, z, k, o) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1);
    setYaw(SGF, VP.yaw[i]); viewAtK(SGF, k);
    var dx = (x - VP.x[i]) / MPU, dy = (y - VP.y[i]) / MPU, dz = (z - VP.z[i]) / MPU, c = SGF.cyw, s = SGF.syw;
    return projV(-c * dx + s * dz, dy, s * dx + c * dz, o);
  }
  /* the cover of the clouds between the camera at sample k and a world point (0 .. 1) */
  function coverK(x, y, z, k) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1);
    work += 4;
    return FX.cloud ? ease(HOST.cloudBetween(VP.x[i], VP.y[i], VP.z[i], x, y, z) / CLOUD_IN) : 0;
  }
  /* a box (centre, half-extents) against the words: the stack's margin (m0: WORDS, or more), the links' (LINKS) */
  function clearStage(x, y, hw, hh, m0, sx, sy) {
    for (var i = 0, o, m; i < words.length; i++) {
      o = words[i]; m = i === 0 ? Math.max(o.m, m0 || 0) : o.m;
      if (x + hw > o.l - m - sx && x - hw < o.r + m + sx && y + hh > o.t - m - sy && y - hh < o.b + m + sy) return false;
    }
    return true;
  }
  function gapWords(x, y, hw, hh) {
    var g = 1e9;
    for (var i = 0; i < words.length; i++) { var o = words[i], dx = Math.max(o.l - x - hw, x - hw - o.r, 0), dy = Math.max(o.t - y - hh, y - hh - o.b, 0); g = Math.min(g, Math.sqrt(dx * dx + dy * dy)); }
    return g;
  }
  /* a travelling flight of a forced kind (the stage's own weights), made by the planner's own newFlight */
  function stageFlight(kind, n, dir, r, sortW) {
    var keep = SORT_OF[kind]; SORT_OF[kind] = sortW;
    var F = null; try { F = newFlight(kind, n, dir, r, false, false, false); } finally { SORT_OF[kind] = keep; }
    return F;
  }

  /* ---- S3: out from behind the cloud tower ---- */
  var TOW = [], S3_LEAD = [2, 22];
  function s3Towers() {
    var out = [], i, p, al, lat, fl, spd = Math.max(6, FL.speed || 12), dmax = cam.f * MPU / 0.44;
    if (!HOST.pois) return out;
    HOST.pois(1400, TOW); wayOf(WAY);
    for (i = 0; i < TOW.length; i++) {
      p = TOW[i]; if (p.kind !== 'tower' || !(p.r > 0)) continue;
      al = (p.x - FL.x) * WAY.fx + (p.z - FL.z) * WAY.fz; lat = (p.x - FL.x) * WAY.rx + (p.z - FL.z) * WAY.rz; fl = Math.abs(lat) - p.r;
      if (fl < 25 || fl > (W < 600 ? 140 : 190)) continue;
      if (al - p.r < 60 || (al - 0.8 * dmax) / spd > S3_LEAD[1]) continue;   // (near enough that its flank will hide a file within S3_LEAD s)
      out.push({ p: p, al: al, lat: lat, flank: fl });
    }
    out.sort(function (a, b) { return a.al - b.al; });
    return out;
  }
  /* a candidate: the lead (s) until the tower stands where the file can hide behind its flank at its distance; the
     birds' height (under the words where the floor lets them, else just over the horizon, beside the words); a window
     point inside the flank; its heading after the reveal (across under the words, or angling away into the distance) */
  function s3Cand(J) {
    var r = J.r, T = J.tw, p = T.p, d = W < 600, n0 = pick(r, d ? [0.5, 0.62] : [0.4, 0.55]), depth = cam.f * MPU / n0;
    /* the lead: the tower's centre a little nearer than the birds (they are behind its body, just inside its flank) */
    var spd = Math.max(6, FL.speed || 12), lead = (T.al - (0.92 * depth - mix(r(), 0.1, 0.5) * p.r)) / spd;
    if (lead < S3_LEAD[0] || lead > S3_LEAD[1] + 4) { stageWhy('s3.lead'); return null; }
    var kL = Math.round(lead / STEP); viewNeed(kL + 4); if (kL >= VP.n - 4) return null;
    var i = Math.min(kL, VP.n - 1), cy = VP.y[i], side = T.lat > 0 ? 1 : -1;   // (+: the tower right of the way)
    /* the birds behind the body's lower part (the world lifts a cloud's body whole over the flight band: its lobes stand
       where they stand), over the floor; under the words where that is below the eye, else above the horizon */
    var by = p.base + mix(r(), 0.12, 0.35) * Math.max(20, p.top - p.base), fx0 = VP.x[i] + WAY.fx * depth, fz0 = VP.z[i] + WAY.fz * depth, gnd = FL.ok ? HOST.ground(fx0, fz0) : -1e4;
    by = Math.max(by, gnd + FLOOR_T + 15);
    var dep = Math.atan2(cy - by, depth), low = dep > 0;
    var pitch = Math.atan2(cam.s, cam.c), qy = cam.y0 + cam.f * Math.tan(pitch + dep);
    var fr = mix(r(), 0.5, 0.82), fx = p.x - side * p.r * fr * WAY.rx, fz = p.z - side * p.r * fr * WAY.rz;
    worldOnK(fx, by, fz, kL, pv); if (!(pv.n > 0)) return null;
    var qx = pv.x;
    if (qx < -40 || qx > W + 40) return null;
    /* the way out: low, across under the words to the far edge; high, angling away (into the distance, or out by the near edge) */
    var u = r(), hd, dir;
    if (low) { hd = pick(r, S3_HEAD) * DEG; dir = -side; }
    else if (u < 0.6) { hd = pick(r, [35, 60]) * DEG; dir = -side; }
    else { hd = pick(r, [25, 45]) * DEG; dir = side; }
    return { n0: n0, lead: lead, kL: kL, qx: qx, qy: qy, dir: dir, side: side, dep: dep, low: low, hd: hd };
  }
  function s3Make(J, c) {
    var r = J.r, n = pickW(r, S3_N), F = stageFlight('line', n, c.dir, r, S3_SORT);
    if (!F) { stageWhy('s3.flight'); return null; }
    setYaw(F, J.yaw); F.n00 = F.n0 = c.n0; F.stage = 'S3'; F.dir = c.dir; F.fadeS = [0.3, 0.38];
    var mps = pick(r, S3_MPS); F.vw = F.v = mps / MPU; F.vPx = F.v * F.n0;
    if (!pathThrough(F, c.qx, c.qy, c.hd, 0, c.low ? 0 : pick(r, [0, 4]) * DEG)) { stageWhy('s3.path'); return null; }
    if (!paced(F)) { stageWhy('s3.paced'); return null; }
    F.v = Math.min(F.v, mps / MPU); F.q = Math.min(F.q, 1);
    var lap = 0; F.m.forEach(function (m) { lap = Math.max(lap, Math.max(m.lag, m.lx || 0) + (m.stragL || 0) + F.span); });
    F.s0 = -F.sa; F.lap = lap; F.dur = (F.len + lap - F.s0) / F.v; F.from = 0;
    F.ev0 = 1e9;   // (no gathering: a file revealed as it is)
    F.m.forEach(function (m) { m.gT = 0; m.stragL = 0; m.swapT = 0; });
    return F;
  }
  /* the S3 trial: from the lead's sample to the end; each bird hidden at its first frame, its cover falling once to
     nothing (never peeking out and back), revealed REVEAL_CLEAR from the words, never covered again; clear of the
     words, the edges it does not cross, near, calm */
  function s3Trial(J, budget) {
    var F = J.F, it = J.it, w0 = work, M = F.m, i, m, tau, k, c, hw, hh;
    for (;;) {
      if (work - w0 >= budget) return 0;
      k = it.k0 + it.k; tau = it.k * STEP;
      if (tau > F.dur + 2 || k >= VP.n - 1 && VP.n >= VP_N) { it.end = tau; break; }
      viewNeed(k + 1); if (k >= VP.n) { it.end = tau; break; }
      viewAtK(F, k);
      if (tau >= 0 && !steady(F, tau)) return stageFail(it, 'calm');
      var any = false;
      for (i = 0; i < M.length; i++) {
        m = M[i]; spot(F, m, tau, tmp); projV(tmp.ax, tmp.ay, tmp.az, pv);
        if (!(pv.n > 0)) { if (it.st[i] === 2) it.st[i] = 3; continue; }
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;
        if (fadeFor(F, pv.n) < 0.02 || !inView(pv.x, pv.y, hw, hh)) { if (it.st[i] === 2) it.st[i] = 3; continue; }
        any = true;
        if (pv.n > NEAR_MAX) return stageFail(it, 'near');
        if (!clearStage(pv.x, pv.y, hw, hh, 0, 2, 2)) return stageFail(it, 'words');
        if (!withinEdges(pv.x, pv.y, hw, hh, F.edges | 3)) return stageFail(it, 'edge');
        it.near = Math.min(it.near, gapWords(pv.x, pv.y, hw, hh));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh); it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        if (it.st[i] === 3) return stageFail(it, 'back');   // (in view again after it left: no)
        if (it.st[i] < 2 || it.k % 3 === 0) {
          airWorldK(F, tmp.ax, tmp.ay, tmp.az, k, PW);
          c = coverK(PW.x, PW.y, PW.z, k);
          if (it.st[i] === 0) { if (c < 0.95) return stageFail(it, 'shown'); it.st[i] = 1; it.cmin[i] = c; }
          else if (it.st[i] === 1) {
            if (c > it.cmin[i] + 0.05) return stageFail(it, 'peek');
            it.cmin[i] = Math.min(it.cmin[i], c);
            if (c < 0.5 && it.rv[i] < 0) { it.rv[i] = tau; if (gapWords(pv.x, pv.y, hw, hh) < REVEAL_CLEAR) return stageFail(it, 'reveal'); it.rx.push(+pv.x.toFixed(1), +pv.y.toFixed(1)); }
            if (c <= 0.05) { it.st[i] = 2; it.re[i] = tau; if (it.rv[i] < 0) it.rv[i] = tau; }
          } else if (c > 0.2) return stageFail(it, 'recover');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; }
      else if (it.enter > -1e8 && tau - it.last > LEAVE_T) { it.end = tau; break; }
      it.k++;
    }
    for (i = 0; i < M.length; i++) if (it.st[i] < 2) return stageFail(it, 'unrevealed');
    return 1;
  }
  function stageFail(it, why) { it.why = why; stageWhy('s3.' + why); return -1; }

  /* ---- S1: the ribbon ---- */
  /* a weaving path: its heading weaves about across the window by +-yaw (wavelength lam), its height rises and falls
     by +-rise (wavelength lam2), all in air units; sampled at ds and integrated (path3 reads it) */
  function weavePath(F, x0, y0, z0, h0, yaw, lam, rise, lam2, ph1, ph2, S) {
    var ds = 4, n = Math.ceil(2 * S / ds) + 1, tab = new Float64Array(4 * n), i, s, h, x = 0, z = 0, xs, zs;
    /* integrate from -S to S, then shift so s = 0 is at (x0, z0) */
    var hs = function (s) { return h0 + yaw * Math.sin(TAU * s / lam + ph1); };
    for (i = 0; i < n; i++) {
      s = -S + i * ds; h = hs(s);
      if (i) { var hm = hs(s - ds / 2); x += ds * Math.cos(hm); z += ds * Math.sin(hm); }
      tab[4 * i] = x; tab[4 * i + 1] = z; tab[4 * i + 2] = h; tab[4 * i + 3] = rise * Math.sin(TAU * s / lam2 + ph2);
    }
    var i0 = Math.round(S / ds); xs = tab[4 * i0]; zs = tab[4 * i0 + 1]; var ys = tab[4 * i0 + 3];
    for (i = 0; i < n; i++) { tab[4 * i] += x0 - xs; tab[4 * i + 1] += z0 - zs; tab[4 * i + 3] += y0 - ys; }
    F.path = { tab: tab, ds: ds, S: S, n: n, x: x0, y: y0, z: z0, h: h0, k: 0, s1: 0, s2: 0, g: 0, sp: null };
  }
  function path3tab(P, s, o) {
    var f = (s + P.S) / P.ds, i = Math.floor(f), a, T = P.tab;
    if (i < 0) { i = 0; a = f; } else if (i >= P.n - 1) { i = P.n - 2; a = f - i; } else a = f - i;
    var j = 4 * i, k = j + 4;
    o.x = T[j] + (T[k] - T[j]) * a; o.z = T[j + 1] + (T[k + 1] - T[j + 1]) * a; o.h = T[j + 2] + (T[k + 2] - T[j + 2]) * a; o.y = T[j + 3] + (T[k + 3] - T[j + 3]) * a;
    if (f < 0 || f > P.n - 1) { var e = f < 0 ? f * P.ds : (f - (P.n - 1)) * P.ds; o.x = (f < 0 ? T[0] : T[4 * (P.n - 1)]) + e * Math.cos(o.h); o.z = (f < 0 ? T[1] : T[4 * (P.n - 1) + 1]) + e * Math.sin(o.h); o.y = f < 0 ? T[3] : T[4 * (P.n - 1) + 3]; }
    return o;
  }
  function s1Count() { return W >= 1024 ? [24, 36] : W >= 700 ? [18, 28] : [12, 20]; }
  function s1Make(J) {
    var r = J.r, c = s1Count(), n = Math.round(pick(r, c)), sort = pickW(r, S1_SORT), S = SORTS[sort], dir = r() < faithful ? season : -season;
    var F = { kind: 'ribbon', stage: 'S1', sort: sort, S: S, n: n, dir: dir, r: r, soar: null, m: [], path: null, w: null, q: 1, inS: 0, flat: 1, calm: false, still: false, loose: 1,
      t0: 0, s0: 0, sa: 0, len: 0, dur: 0, edges: 3, ev0: 1e9, from: 0, loosen: false, latFirst: false, n0: pick(r, S1_N0),
      wKey: Math.floor(r() * NOISE_N), wLam: 400, wAmp: 0, hKey: Math.floor(r() * NOISE_N), hT: 12, hAmp: 0, fadeS: [0.12, 0.16] };
    F.n00 = F.n0; setYaw(F, J.yaw);
    F.span = SPAN * view * S.size; F.f = pick(r, S.hz) * tempo; F.air = 1;
    F.flaps = S.flaps ? [[2, 4], [2.5, 5.5]] : null;   // (gliding at least 70 % of the time: a few beats, long glides)
    var mps = pick(r, S1_MPS); F.vw = F.v = mps / MPU; F.vPx = F.v * F.n0;
    /* the ranks: 1-4 abreast, 1.6-3 spans apart, each speck up to 1.4 spans aside and 1 up or down, drifting 0.12 */
    var lag = 0, k = 0, rank = 0, M = [];
    while (k < n) {
      var ab = Math.min(n - k, pickW(r, S1_ABREAST)), j;
      for (j = 0; j < ab; j++, k++) {
        var m = member(F, lag, (j - (ab - 1) / 2) * 1.1 * F.span + (r() * 2 - 1) * 0.3 * F.span, rank);
        m.lat = clamp(m.lat, -1.4 * F.span * Math.max(1, ab / 2), 1.4 * F.span * Math.max(1, ab / 2)); m.up = (r() * 2 - 1) * F.span;
        m.aL = 0.12 * F.span; m.aP = 0.12 * F.span; m.gain = 1;
        M.push(m);
      }
      lag += pick(r, S1_RANK) * F.span * (1 + 0.25 * (r() * 2 - 1)); rank++;
    }
    F.m = M; F.d = M[0].d; F.probe = [0, M.length - 1]; F.lap = lag + F.span;
    unlock(F);
    return F;
  }
  /* the ribbon's path: the leader across the window, low under the words, weaving, at its distance */
  function s1Path(J, F) {
    var r = J.r, d = W < 600, dep = pick(r, d ? [9, 13] : [6, 12]) * DEG, depth = cam.f * MPU / F.n0, room = (FL.ok ? (VP.y[0] - HOST.ground(VP.x[0], VP.z[0])) : 100) - FLOOR_T - 18;
    if (depth * Math.tan(dep) > room) dep = Math.atan(Math.max(0, room) / depth);
    if (dep < (d ? 7 : 4) * DEG) return false;
    var qy = cam.y0 + cam.f * Math.tan(Math.atan2(cam.s, cam.c) + dep), qx = W * mix(r(), 0.3, 0.7);
    unproj(qx, qy, F.n0, wp);
    var yaw = pick(r, S1_YAW) * DEG, lam = pick(r, S1_LAM) / MPU, rise = pick(r, S1_RISE) / MPU, lam2 = S1_LAM2 / MPU, S = 2.4 * W / F.n0 + 2 * F.lap;
    weavePath(F, wp.x, wp.y, wp.z, F.dir > 0 ? 0 : Math.PI, yaw, lam, rise, lam2, TAU * r(), TAU * r(), S);
    var sOut = walk(F, 1); if (sOut === null) return false;
    var sIn = walk(F, -1); if (sIn === null) return false;
    F.sa = sIn; F.len = sOut - sIn; F.edges = endEdge(F, sIn) | endEdge(F, sOut);
    if (F.edges & 12 && !(F.edges & 3)) return false;
    /* the time across: at most S1_MAXT s (a quicker pace within its calm, else not this one) */
    var across = (F.len + F.lap) / F.v;
    if (across > S1_MAXT + 8) { F.v *= across / (S1_MAXT + 8); if (F.v * MPU > 1.15 * S1_MPS[1]) return false; }
    F.s0 = 0; F.dur = (F.len + F.lap) / F.v;
    return true;
  }
  /* the S1 trial: every speck clear of the stack by RIBBON_CLEAR and of the links by LINKS, inside the top and bottom
     edges, never on another of its ranks on the window, over the floor; its whole crossing at most S1_MAXT s */
  function s1Trial(J, budget) {
    var F = J.F, it = J.it, w0 = work, M = F.m, i, j, m, tau, k, hw, hh, cnt = it.probe ? F.probe.length : M.length;
    for (;;) {
      if (work - w0 >= budget) return 0;
      k = it.k0 + it.k; tau = it.k * STEP;
      if (tau > F.dur + 2) { it.end = tau; break; }
      viewNeed(k + 1); if (k >= VP.n) { it.end = tau; break; }
      viewAtK(F, k);
      var any = false;
      for (i = 0; i < cnt; i++) {
        m = M[it.probe ? F.probe[i] : i]; it.bx[4 * i] = NaN;
        spot(F, m, tau, tmp); projV(tmp.ax, tmp.ay, tmp.az, pv);
        if (!(pv.n > 0) || stageFade(F, pv.n) < 0.02) continue;
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;
        if (!inView(pv.x, pv.y, hw, hh)) continue;
        if (tau < 0.5 && it.k === 0) return stageFail(it, 'r.pop');
        any = true;
        if (!clearStage(pv.x, pv.y, hw, hh, RIBBON_CLEAR, 2, 2)) return stageFail(it, 'r.words');
        if (!withinEdges(pv.x, pv.y, hw, hh, F.edges | 3)) return stageFail(it, 'r.edge');
        it.near = Math.min(it.near, gapWords(pv.x, pv.y, hw, hh));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh); it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        it.bx[4 * i] = pv.x; it.bx[4 * i + 1] = pv.y; it.bx[4 * i + 2] = hw; it.bx[4 * i + 3] = hh;
        if (it.k % 4 === 0 && (i === 0 || i === cnt - 1)) {   // (over the floor: the sea of cloud or the land under it)
          airWorldK(F, tmp.ax, tmp.ay, tmp.az, k, PW); work += 2;
          if (FL.ok && PW.y - HOST.ground(PW.x, PW.z) < FLOOR_T) return stageFail(it, 'r.floor');
        }
      }
      if (!it.probe) for (i = 0; i < cnt; i++) {   // (each speck against its 8 rank-neighbours on the window)
        if (it.bx[4 * i] !== it.bx[4 * i]) continue;
        for (j = i + 1; j < Math.min(cnt, i + 9); j++) {
          if (it.bx[4 * j] !== it.bx[4 * j]) continue;
          var g = Math.max(Math.abs(it.bx[4 * i] - it.bx[4 * j]) - it.bx[4 * i + 2] - it.bx[4 * j + 2], Math.abs(it.bx[4 * i + 1] - it.bx[4 * j + 1]) - it.bx[4 * i + 3] - it.bx[4 * j + 3]);
          if (g < SPACE_SEEN - 1.5) return stageFail(it, 'r.space');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; }
      else if (it.enter > -1e8 && tau - it.last > LEAVE_T) { it.end = tau; break; }
      it.k++;
    }
    if (it.enter < -1e8) return stageFail(it, 'r.never');
    if (it.last - it.enter > S1_MAXT + 6) return stageFail(it, 'r.long');
    return 1;
  }

  /* ---- S2: the wheel ---- */
  var LMK = [];
  function s2Marks() {
    var out = [], i, p, al, lat, d = W < 600, ck = FL.camk > 0 && FL.camk < 1 ? FL.camk : 1;   // (ck: the world's dev pace for a film; its distances in the camera's seconds, so a wheel looms no faster)
    if (!HOST.pois) return out;
    HOST.pois(1500, LMK); wayOf(WAY);
    for (i = 0; i < LMK.length; i++) {
      p = LMK[i]; if (p.kind === 'canyon') continue;
      al = (p.x - FL.x) * WAY.fx + (p.z - FL.z) * WAY.fz; lat = (p.x - FL.x) * WAY.rx + (p.z - FL.z) * WAY.rz;
      if (STG.film) { if (al < 150 || al > 360 || (!d && Math.abs(lat) < 40)) continue; }   // (dev film: near, already in view)
      else if (al < (d ? 600 : 750) * ck || al > 1450 * ck) continue;   // (far enough that its birds come out of the distance: the place's fade)
      if (!d && !STG.film && Math.abs(lat) < 200 * ck) continue;             // (the desk's: beside, at least 200 m off the way)
      if (d && (STG.film ? Math.abs(lat) > 90 : p.kind !== 'tower' && p.kind !== 'island' || Math.abs(lat) > 160)) continue;   // (dev film: any landmark near its way)   // (the phone's: below, a small tower's waist or an island's stem)
      out.push({ p: p, al: al, lat: lat });
    }
    out.sort(function (a, b) { return a.al - b.al; });
    return out;
  }
  function s2Make(J) {
    var c2 = skyCls(), r = J.r, L = J.mk, p = L.p, d = W < 600, n = pickW(r, S2_N), sort = pickW(r, c2 === 'moon' || c2 === 'first' ? [['gull', 1]] : c2 === 'glow' || c2 === 'blue' ? [['gull', 55], ['ibis', 20], ['crow', 25]] : S2_SORT), S = SORTS[sort], i, m;   // (fix: at dusk no stork, at night no crow: they roost)
    if (n > freeSlots()) n = freeSlots() >= 5 ? (freeSlots() % 2 ? freeSlots() : freeSlots() - 1) : 0;
    if (n < 5) return null;
    var eye = FL.y || 0, R, cy;
    if (!d) { R = Math.max(mix(r(), 40, 60), Math.min(p.r + 25, 160)); cy = clamp((p.top || p.y) + 10, eye + 20, eye + 60); }
    else { R = Math.min(p.r, 80) + mix(r(), 30, 40); cy = eye - mix(r(), 50, 90); }
    var v = pick(r, S2_MPS), sense = r() < 0.5 ? 1 : -1, arc = pick(r, S2_ARC) * DEG, th0 = TAU * r();
    R = Math.max(30, Math.min(R, v * v / (9.81 * Math.tan(S2_BANK * DEG))));   // (round 2: the bank physical and at least S2_BANK, SPEC 6.4's 8-20 deg: round a big landmark the ring was 160 m and banked 3 deg; now it circles over it)
    var P = { place: true, kind: 'wheel', stage: 'S2', sort: sort, S: S, n: n, key: (p.id || 1) * 7 + 13, cx: p.x, cy: cy, cz: p.z, base: cy, up: 0, t0: 0, m: [], dur: 1e9, r: r, fadeS: [0.16, 0.26], R: R, v: v, mark: p.kind };
    var f = pick(r, S.hz) * tempo;
    for (i = 0; i < n; i++) {
      m = { d: (drawBird(r, S), measureBird3D(sort, SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1)))), R: R * mix(r(), 0.94, 1.06), th0: th0 + sense * arc * (i / Math.max(1, n - 1) - 0.5) + (r() - 0.5) * 0.15 * arc / n,
            dy: (r() * 2 - 1) * mix(r(), 3, 6), f: f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0, bR: TAU * r(), bY: TAU * r(), tx: 1e9 };
      m.om = sense * v / m.R;
      m.w = placeWing(sort, r); m.f = m.w.f;   // (physics: the lab's measured wing)
      P.m.push(m);
    }
    return P;
  }
  /* a wheel's bird at its time: round the ring (its radius breathing +-6 %, its height +-dy), or away on its tangent */
  function wheelSpot(P, m, tau, o) {
    var tt = Math.min(tau, m.tx), th = m.th0 + m.om * tt, R = m.R * (1 + 0.06 * Math.sin(0.11 * tt + m.bR));
    o.x = P.cx + R * Math.cos(th); o.z = P.cz + R * Math.sin(th);
    o.y = P.cy + m.dy * Math.sin(0.17 * tt + m.bY);
    if (tau > m.tx) {   // (the tangent at tx, gliding a little downhill: the turn's bank comes off as it straightens)
      var e = tau - m.tx, v = Math.abs(m.om) * m.R, tth = th + (m.om > 0 ? 1 : -1) * Math.PI / 2;
      o.x += v * e * Math.cos(tth); o.z += v * e * Math.sin(tth); o.y -= v * e * Math.tan(3 * DEG);
    }
    return o;
  }
  /* the S2 trial: through the course, every bird where it is seen (its place's fade) clear of the words from its first
     faint frame, its own looming (the camera held still) under WHEEL_GROW at the 98th percentile, its own pace under
     the window's top speed, never nearer than NEAR_MAX (else away on the tangent 1.5 laps before) */
  var S2BX = new Float64Array(4 * MAXP);
  function s2Trial(J, budget) {
    var P = J.F, it = J.it, w0 = work, M = P.m, i, m, tau, k, hw, hh, n1;
    for (;;) {
      if (work - w0 >= budget) return 0;
      k = it.k0 + it.k; tau = it.k * STEP;
      viewNeed(k + 2);   // (the course out past this sample: k + 1 left the trial ending at the first chunk's end, never seeing a wheel)
      if (k >= VP.n - 2 || tau > 150) { it.end = tau; break; }
      var any = false, nb2 = 0;
      for (i = 0; i < M.length; i++) {
        m = M[i]; wheelSpot(P, m, tau, wq); worldOnK(wq.x, wq.y, wq.z, k, pv); work += 3;
        if (!(pv.n > 0)) continue;
        var a = stageFade(P, pv.n); if (a < 0.02) continue;
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;
        if (!inView(pv.x, pv.y, hw, hh)) continue;
        /* (fix round) two of its birds never on top of one another on the window (round 2's wheel had no spacing check:
           its specks overlapped by up to 94 %) */
        var hp2 = (m.d.halo || 0) * pv.n;
        for (var q2 = 0; q2 < nb2; q2++) if (Math.max(Math.abs(pv.x - S2BX[4 * q2]) - (hw - hp2) - S2BX[4 * q2 + 2], Math.abs(pv.y - S2BX[4 * q2 + 1]) - (hh - hp2) - S2BX[4 * q2 + 3]) < SPACE_SEEN) return stageFail(it, 'w.space');
        S2BX[4 * nb2] = pv.x; S2BX[4 * nb2 + 1] = pv.y; S2BX[4 * nb2 + 2] = hw - hp2; S2BX[4 * nb2 + 3] = hh - hp2; nb2++;
        if (it.k === 0 && !STG.film) return stageFail(it, 'w.pop');
        any = true;
        if (pv.n > NEAR_MAX - 0.1 && m.tx > 1e8) {   // (it would come too near: away on its tangent 1.5 laps before, if it can; then the trial again)
          var lapT = TAU / Math.abs(m.om), tx = Math.max(2, tau - 1.5 * lapT);
          for (var q = 0; q < M.length; q++) M[q].tx = tx + 0.4 * q;
          it.redo = true; return stageFail(it, 'w.near');
        }
        if (pv.n > NEAR_MAX) return stageFail(it, 'w.near2');
        if (!clearStage(pv.x, pv.y, hw, hh, 0, 2, 2)) return stageFail(it, 'w.words');
        it.near = Math.min(it.near, gapWords(pv.x, pv.y, hw, hh));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh); it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        /* its own motion, the camera held still (this sample's): looming and pace */
        var x1 = pv.x, y1 = pv.y; n1 = pv.n;
        wheelSpot(P, m, tau + 0.5, wa3); worldOnK(wa3.x, wa3.y, wa3.z, k, pv2);
        if (pv2.n > 0 && a > 0.3) {
          it.grow.push(Math.log(pv2.n / n1) / 0.5);
          var sp = Math.sqrt((pv2.x - x1) * (pv2.x - x1) + (pv2.y - y1) * (pv2.y - y1)) / 0.5;
          if (sp > 1.18 * topSpeed()) return stageFail(it, 'w.pace');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; }
      else if (it.enter > -1e8 && tau - it.last > LEAVE_T) { it.end = tau; break; }
      else if (it.enter < -1e8 && tau > S2_LEAD) return stageFail(it, 'w.late');   // (the course is a forecast: a wheel first seen a minute on was, in the films, never seen at all)
      it.k++;
    }
    if (it.enter < -1e8) return stageFail(it, 'w.never');
    if (it.last - it.enter < 6) return stageFail(it, 'w.short');
    if (it.grow.length) { var g = it.grow.slice().sort(function (a, b) { return a - b; }), p98 = g[Math.min(g.length - 1, Math.floor(0.98 * g.length))]; if (p98 > WHEEL_GROW) return stageFail(it, 'w.grow'); it.g98 = p98; }
    return 1;
  }

  /* ---- the stage clock and its job ---- */
  function stageTrialInit(J, k0) { var n = J.F.m.length; J.it = { k: 0, k0: k0, near: 1e9, yLo: 1e9, yHi: -1e9, xLo: 1e9, xHi: -1e9, enter: -1e9, last: -1e9, end: 0, why: '', st: new Int8Array(n), cmin: new Float64Array(n), rv: new Float64Array(n).fill(-1), re: new Float64Array(n).fill(-1), rx: [], bx: new Float64Array(4 * n), grow: [], probe: J.kind === 'S1' }; }
  function stageFeasible(kind) {
    if (kind === 'S3') return s3Towers().length > 0;
    if (kind === 'S2') return s2Marks().length > 0;
    if (kind === 'S1') return W >= 360;
    return false;
  }
  function stageStart() {
    var r = vstream(5000 + (STG.n++)), kinds = [], i, k;
    for (i = 0; i < STAGE_W.length; i++) { k = STAGE_W[i][0]; if ((STG.force ? k === STG.force : true) && stageFeasible(k)) kinds.push(STAGE_W[i]); }
    var fresh = kinds.filter(function (q) { return !(STG.failT[q[0]] > t - STAGE_LOOK_MAX); });   // (a kind that found no room this last minute steps aside while another can look)
    if (fresh.length) kinds = fresh;
    if (kinds.length > 1 && STG.last) kinds = kinds.filter(function (q) { return q[0] !== STG.last; });
    if (!kinds.length) { stageWhy('none'); return false; }
    var kind = pickW(r, kinds), J = { kind: kind, r: r, c: 0, best: null, bestSc: -1e9, F: null, it: null };
    stageCourse(J);
    if (kind === 'S3') { J.tws = s3Towers(); J.tw = J.tws[0]; if (!J.tw) return false; }
    if (kind === 'S2') { J.mks = s2Marks(); J.mk = J.mks[0]; if (!J.mk) return false; }
    STG.job = J;
    return true;
  }
  /* a candidate made and its trial begun; true while there is one */
  function stageNext(J) {
    var F = null, c, tries = 0;
    while (!F && J.c < STAGE_CANDS && tries++ < 4) {
      J.c++;
      if (J.kind === 'S3') { J.tw = J.tws[(J.c - 1) % J.tws.length]; c = s3Cand(J); if (c) { F = s3Make(J, c); if (F) { F.cand = c; J.F = F; stageTrialInit(J, c.kL); } } else stageWhy('s3.cand'); }
      else if (J.kind === 'S1') { F = s1Make(J); if (F && s1Path(J, F)) { J.F = F; stageTrialInit(J, Math.round(1 / STEP)); } else { F = null; stageWhy('s1.path'); } }
      else { J.mk = J.mks[(J.c - 1) % J.mks.length]; F = s2Make(J); if (F) { J.F = F; stageTrialInit(J, Math.round(1 / STEP)); } }   // (each landmark in turn)
    }
    return !!F;
  }
  function stageWork(quota) {
    var J = STG.job, w0 = work, res;
    while (STG.job === J && work - w0 < quota) {
      if (!J.F) { if (!stageNext(J)) { stageDone(J); return; } continue; }
      res = J.kind === 'S3' ? s3Trial(J, quota - (work - w0)) : J.kind === 'S1' ? s1Trial(J, quota - (work - w0)) : s2Trial(J, quota - (work - w0));
      if (res === 0) return;
      if (res > 0 && J.it.probe) { J.it.probe = false; var k0 = J.it.k0; stageTrialInit(J, k0); J.it.probe = false; continue; }
      if (res > 0) {
        var sc = Math.min(J.it.near, 200) + 10 * J.r();
        if (sc > J.bestSc) { J.bestSc = sc; J.best = { F: J.F, it: J.it }; }
        if (J.kind !== 'S3' || J.bestSc > 120) { stageDone(J); return; }   // (a wheel or a ribbon that fits is flown; a reveal, the roomiest of a few)
      } else if (J.kind === 'S2' && J.it.redo) { var Pf = J.F; stageTrialInit(J, J.it.k0); J.F = Pf; continue; }
      J.F = null; J.it = null;
      if (J.c >= STAGE_CANDS) { stageDone(J); return; }
    }
  }
  function stageDone(J) {
    STG.job = null;
    if (!J.best) { STG.failT[J.kind] = t; STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: false, c: J.c }); if (STG.log.length > 40) STG.log.shift(); stageLookLater(); return; }
    var F = J.best.F, it = J.best.it;
    if (J.kind === 'S2') {
      if (F.m.length > freeSlots()) { STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: false, why: 'slots' }); return; }
      F.t0 = J.t + it.k0 * STEP; F.yLo = it.yLo; F.yHi = it.yHi; F.xLo = it.xLo; F.xHi = it.xHi; F.enterT = it.enter;
      for (var i = 0, j = 0; i < slots.length && j < F.m.length; i++) if (!slots[i].busy) { slots[i].busy = true; F.m[j].s = slots[i]; dress(slots[i], F.m[j].d); j++; }
      PLACES.push(F); F.id = 'w' + (++FLIGHT_ID);
    } else {
      if (F.m.length > freeSlots() + awaySlots()) { STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: false, why: 'slots' }); return; }
      F.id = ++FLIGHT_ID; F.yLo = it.yLo; F.yHi = it.yHi; F.xLo = it.xLo; F.xHi = it.xHi;
      F.enterT = J.kind === 'S3' ? Math.max(0, Math.min.apply(null, Array.prototype.slice.call(it.rv))) : it.enter;
      F.revealEnd = J.kind === 'S3' ? Math.max.apply(null, Array.prototype.slice.call(it.re)) : 0;
      F.seenSpan = Math.max(4, it.last - Math.max(it.enter, 0)); F.pitch0 = Math.atan2(cam.s, cam.c);
      commit(F, J.t + it.k0 * STEP);
    }
    STG.cur = F; STG.last = J.kind; STG.force = null; STG.film = false; STG.lookFrom = -1;
    STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: true, id: F.id, sort: F.sort, n: F.m.length, t0: +F.t0.toFixed(1), enter: +(F.t0 + (F.enterT || 0)).toFixed(1), near: +it.near.toFixed(1), seen: +(it.last - Math.max(it.enter, 0)).toFixed(1), x: [Math.round(it.xLo), Math.round(it.xHi)], y: [Math.round(it.yLo), Math.round(it.yHi)], rx: it.rx ? it.rx.slice(0, 14) : null, g98: it.g98 });
    /* the hush: no travelling flight sets off to enter in the HUSH_T s before the stage's first bird is seen */
    var E = F.t0 + (F.enterT || 0); STG.hush[0] = E - HUSH_T - FIRST_LEAD_IN; STG.hush[1] = E;   // (a flight set off now enters a second or two later)
  }
  /* nothing staged this look: look again in STAGE_LOOK s, for up to STAGE_LOOK_MAX s; then wait RETRY_STAGE s */
  function stageLookLater() {
    STG.nextLook = t + STAGE_LOOK;
    if (STG.lookFrom >= 0 && t - STG.lookFrom > STAGE_LOOK_MAX) { STG.due = t + RETRY_STAGE; STG.lookFrom = -1; }
  }
  /* each step: the stage that is on (done when its birds are), the clock, and the job a share at a time */
  function stageStep(C) {
    if (FORCED || HOST.reduced()) return;
    var F = STG.cur;
    if (F) {
      var on = F.place ? PLACES.indexOf(F) >= 0 : flights.indexOf(F) >= 0;
      STG.inView = on && F.lastSeen !== undefined && t - F.lastSeen < 1;
      if (!on) { STG.cur = null; STG.inView = false; STG.due = t + pick(vstream(6000 + STG.n), STAGE_GAP) * Math.min(2, 1 + t / 720); STG.nextLook = STG.due; }
      return;
    }
    if (STG.job) { if (!job) stageWork(STAGE_QUOTA); return; }
    if (t < STG.due || t < STG.nextLook || job) return;
    if (STG.lookFrom < 0) STG.lookFrom = t;
    if (!stageStart()) stageLookLater();
  }

  function stageReset() { STG.reset(); }
  function stageDev(o) { return STG.dev(o); }
  function stageState() { return STG.state(); }

