  /* ================= THE LIVING SKY (round 3; living/DESIGN.md) =================
     The owner: "they shouldnt be cross as per say... they should just be flying around in the sky ... since this is a
     3d world"; "u need to think bigger". Every flock is an animal in the world, at a real place, on its own business:
     commuters on a bearing (to the evening's roost, against it, across it; away from it at first light), wheels over a
     landmark or a patch of air, loiterers about a home (crows, a heron rowing low, swallows hawking), migrants high at
     night. Nothing is planned for the window: it shows what is in front of the camera. A flock's leader steers in the
     world (LV_DT steps, its route worked out LV_AHEAD s ahead of now) at its kind's real airspeed, turning no faster
     than its kind can, drifting with the wind; the others hold their places in its pattern, a moment behind on its
     way (so turns ripple down it), wandering about them. Guardrails: a flock keeps LV_CLEAR from the camera's way (and
     flies behind the words as it will: the owner, 2026-11-05); it is born out of sight (out of the window or beyond the distance
     its ink shows at) and let go out of sight; a window empty LV_EMPTY s has a flock sent in across its side. They
     are drawn as the world's places are (fixed in the world, never escorting the camera). */
  var LIVE_ON = true;
  var LV_DT = 0.1, LV_AHEAD = 4, LV_LOOK = [1.5, 3], LV_EVERY = 0.5;   // s
  var LV_SPAWN = [650, 1500], LV_SPAWN_SEEN = [1150, 1600], LV_DROP = 2100, LV_BEHIND = 450, LV_CLEAR = 110, LV_EMPTY = 9;   // m; s
  var LV_SPEED = { goose: 17, ibis: 14, gull: 11, heron: 10, crow: 11, swallow: 10, stork: 12, finch: 9 };   // m/s through the air (Pennycuick 2001; Alerstam 2007)
  var LV_TURN = { goose: 8, ibis: 12, gull: 25, heron: 8, crow: 22, swallow: 70, stork: 12, finch: 30 };   // deg/s at most
  /* (v16) the calm's few birds and empty sky kept: v15, its flocks let go as they left the window, filled the sky (a
     median of 7 birds in view, 6.4 flights a minute, empty 7 % of the time, against the crossings' 2, 2.5 and 16 %);
     the empty spells are kept short by the rescue (LV_EMPTY), not by a crowd */
  var LV_POP = { glow: 5, blue: 5, first: 4, moon: 4, day: 5 };   // flocks living about the visitor at most (v21: one more, as v20's far flocks no longer show)
  var LV_GAP = { glow: [9, 17], blue: [10, 18], first: [10, 19], moon: [11, 20], day: [9, 17] };   // (v24: a little more often: counting only birds at 0.3 ink and more, v23's sky was empty 29 % of the time, the crossings' 20 %)   // s between encounters (v6: [7, 13] at dusk left empty spells of 29-37 s, before the rescue had its own clock)
  var LV_BEH = {                                                   // behaviours by sky: commute, wheel, loiter, hawk (swallows), migrant
    glow: [['commute', 58], ['wheel', 16], ['loiter', 18], ['hawk', 8]], blue: [['commute', 62], ['wheel', 14], ['loiter', 20], ['hawk', 4]],
    first: [['commute', 60], ['wheel', 15], ['loiter', 25]], moon: [['migrant', 75], ['commute', 25]],
    day: [['commute', 40], ['wheel', 20], ['loiter', 25], ['hawk', 15]] };
  var LV_LAP = [18, 25], LV_LAPS = [1, 3], LV_HOME = [140, 320];   // s; laps; m
  /* (v20) how far off a flock fades into the distance, by its business (nearness): a commuter as the crossings did
     (FAR, FADE), a night migrant as the staged flights (high and faint), a wheel or a loiterer between the thermals' and
     the crossings'. v19 faded every living flock as a thermal (0.14-0.24): far specks the crossings never drew, a
     median of 11 px across on a desktop (the crossings' 20), a wheel or a loiterer 5 */
  var LV_FADE = { commute: [FAR, FADE], migrant: [0.3, 0.38], wheel: [0.3, 0.42], loiter: [0.3, 0.42], hawk: [0.3, 0.42] };   // (v24: a wheel or a loiterer shows when nearer: at 0.22-0.32 a far wheel hung as a faint speck, 21 % of v23's bird-frames under 0.3 ink, the crossings' 8 %)
  /* (v12) the calm, in the world: no flock passes the eye faster than LV_DEGS degrees a second (its route chosen
     farther out, never slowed): v11's near meetings swept a desktop at 200-320 px/s (a 9-ibis skein 145 m off) */
  var LV_DEGS = 6, LV_RATE_T = { near: 45, far: 90 };
  /* (v26) a flock follows the land under it this much of its rise and fall; and the birth check sees the camera keep its
     clearance over the land ahead of it (the camera climbs and sinks 0-2.6 m/s with the dunes: v25's check, holding its
     climb, put a crossing 100 px or more off on the window 15 s on) */
  var LV_TERRAIN = 0.8;
  var LIVE = { r: null, cls: '', rb: 0, side: 1, k: 0, nextT: 0, seenT: 0, look: 0 };
  /* (v26) the land's height under a point (the world's own ground; 0 where it gives none) */
  function lvGround(x, z) { var g = HOST.ground ? HOST.ground(x, z) : 0; return g === g ? g : 0; }
  function liveOn() { return LIVE_ON && !FORCED && !(HOST.reduced && HOST.reduced()); }
  function lvG(r) { return (r() + r() + r() + r() - 2) * 1.7320508; }   // (about a unit normal)
  function lvSort(r, list) { return weighted(r, list); }
  /* a flock's pattern, kind and count, by the sky (the LIFE tables; a day sky the old ones) */
  function lvWhat(r, cls, beh) {
    var L = LIFE[cls], pat, sort, n;
    if (beh === 'wheel') { pat = 'loose'; sort = cls === 'day' ? lvSort(r, [['gull', 60], ['stork', 40]]) : 'gull'; n = 3 + Math.floor(r() * 5); return [pat, sort, n]; }
    if (beh === 'hawk') return [r() < 0.5 ? 'pair' : 'loose', 'swallow', 0];
    if (beh === 'loiter') { var lt = lvSort(r, [['crow', 55], ['heron', 30], ['gull', 15]]); return [lt === 'heron' ? 'single' : lvSort(r, [['pair', 55], ['single', 25], ['loose', 20]]), lt, 0]; }
    pat = L ? weighted(r, L.pat.filter(function (p) { return p[0] !== 'loose'; })) : lvSort(r, [['skein', 25], ['line', 25], ['pair', 30], ['single', 20]]);
    sort = L && L.kinds[pat] ? weighted(r, L.kinds[pat]) : weighted(r, SORT_OF[pat] || [['gull', 1]]);
    if (beh === 'migrant') { pat = r() < 0.6 ? 'skein' : 'line'; sort = 'goose'; }
    return [pat, sort, 0];
  }
  function lvCount(r, pat, n) {
    if (n) return n;
    if (pat === 'single') return 1; if (pat === 'pair') return 2;
    var t = LIFE_N[pat] || [[3, 1]], k = weighted(r, t.map(function (e) { return [e[0], e[1]]; }));
    return k === 4 ? 5 : k;
  }
  /* the places in its pattern (m: back along its way, aside, up), in the kind's own spans */
  function lvSlots(r, pat, n, spm, sort) {
    var S = [], i, k, side;
    for (i = 0; i < n; i++) {
      if (!i) { S.push([0, 0, 0]); continue; }
      /* (v10) a skein's arms not level (one a little higher, each bird a little higher than the one ahead of it on its
         arm), a line's birds staggered in height: seen side on, a level V's arms lay on one another (v9: two birds of a
         skein touching in 17 % of its frames, of a loose group 22 %, of a line 10 %) */
      if (pat === 'skein') { var VG = V_GEOM[sort] || V_GEOM.goose; k = Math.ceil(i / 2); side = i % 2 ? 1 : -1; S.push([k * pick(r, VG.x) * spm, side * k * pick(r, VG.y) * spm, (side * 0.5 + 0.25) * k * spm + (r() - 0.5) * 0.2 * spm]); }
      else if (pat === 'line') S.push([i * mix(r(), 1.6, 2.2) * spm, (r() - 0.5) * 0.6 * spm, (i % 2 ? 0.55 : -0.55) * spm + (r() - 0.5) * 0.3 * spm]);
      else if (pat === 'pair') S.push([mix(r(), -0.4, 0.6) * spm, (r() < 0.5 ? 1 : -1) * mix(r(), 1.3, 2) * spm, (r() - 0.5) * 0.6 * spm]);
      else {   // (a loose cloud, its birds 1.6 spans apart at least: v7's fell on one another)
        var rr = Math.sqrt(n) * 1.9 * spm, c, tries2;
        for (tries2 = 0; tries2 < 30; tries2++) {
          c = [(r() * 2 - 0.5) * rr, (r() * 2 - 1) * rr, (r() * 2 - 1) * 0.8 * rr];
          if (S.every(function (q) { var a = q[0] - c[0], b = q[1] - c[1], e = q[2] - c[2]; return a * a + b * b + e * e >= 5 * spm * spm; })) break;
        }
        S.push(c);
      }
    }
    return S;
  }
  /* a flock made at (x, y, z) heading h (world: (sin h, cos h) on the ground), with its behaviour's own state */
  function lvMake(beh, x, y, z, h, cls, what) {
    var r = sm32((visitSeed ^ Math.imul(9001 + (++LIVE.k), 0x9E3779B9)) >>> 0), w = what || lvWhat(r, cls, beh), pat = w[0], sort = w[1], n = lvCount(r, pat, w[2]), S = SORTS[sort] || SORTS.gull;
    if (n > freeSlots()) n = pat === 'skein' ? (freeSlots() >= 5 ? 5 : 0) : Math.min(n, freeSlots());
    if (n < 1) return null;
    var spm = B_SPAN * S.size * MODEL_K, v0 = (LV_SPEED[sort] || 11), sl = lvSlots(r, pat, n, spm, sort), i, m;   // (v22: a skein's V the crossings' own, V_GEOM: v21's full angle was 73 deg, the crossings' 48)
    var P = { place: true, live: true, eye0: LVC.y, g0: lvGround(x, z), kind: 'live', pat: pat, beh: beh, sort: sort, S: S, n: n, key: 50000 + LIVE.k, t0: t, m: [], dur: 1e9, r: r,
      fadeS: LV_FADE[beh] || LV_FADE.commute, cx: x, cy: y, cz: z, base: y, up: 0, v0: v0, spm: spm, cls: cls,
      tr: { x: [x], y: [y], z: [z], h: [h], n: 1 },
      st: { h: h, c: 0, v: v0, eh: 0, ec: 0, ev: 0, hb: h, ah: 0, ac: 0, aT: -1, y0: y, cx: x, cz: z, R: 0, sense: r() < 0.5 ? 1 : -1, leaveT: 1e9, hx: x, hz: z, Rh: pick(r, LV_HOME), hc: h } };
    if (beh === 'wheel') {
      var lap = pick(r, LV_LAP); P.st.R = v0 * lap / TAU; P.st.leaveT = lap * pick(r, LV_LAPS);
      P.st.cx = x - P.st.R * Math.cos(h) * P.st.sense; P.st.cz = z + P.st.R * Math.sin(h) * P.st.sense;   // (its ring's centre beside it, so it is on the ring heading round)
    }
    /* (v17) its event glides (eventGlides' rules, found along its route as it is worked out, lvEvents): a goose's set wings */
    P.eg = []; P.egS = { r0: -1, tot: 0, ti: -1, d0: -1, di: -1 }; P.egSet = sort === 'goose' ? pick(r, [6, 10]) : 0;
    for (i = 0; i < n; i++) {
      m = { d: (drawBird(r, S), measureBird3D(sort, SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1)))), f: 0, delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0,
        b: sl[i][0], a: sl[i][1], u: sl[i][2], lagT: sl[i][0] / v0, wk: Math.floor(r() * NOISE_N), wT: pick(r, DRIFT_T) * 1.4,
        wL: pick(r, DRIFT_L) * spm * (pat === 'loose' ? 2 : 1), wP: pick(r, DRIFT_P) * spm * (pat === 'loose' ? 2 : 1) };
      m.w = placeWing(sort, r); m.f = m.w.f; m.egD = m.lagT;   // (v17: a glide passes back down the flock as its birds reach the turn)
      P.m.push(m);
    }
    return P;
  }
  /* the leader at its time tau: x, y, z, heading (its worked-out route, LV_DT apart; before it, back along its first
     heading; past its end, on along its last) */
  var LVQ = { x: 0, y: 0, z: 0, h: 0 };
  function lvAt(P, tau, o) {
    var T = P.tr, k = tau / LV_DT, i = Math.floor(k), a, v = P.st.v || P.v0;
    if (i < 0) { var hb = T.h[0]; o.x = T.x[0] + v * tau * Math.sin(hb); o.z = T.z[0] + v * tau * Math.cos(hb); o.y = T.y[0]; o.h = hb; return o; }
    if (i >= T.n - 1) {
      var j = T.n - 1, e = tau - j * LV_DT, hl = T.h[j], dy = j > 0 ? (T.y[j] - T.y[j - 1]) / LV_DT : 0;
      o.x = T.x[j] + v * e * Math.sin(hl); o.z = T.z[j] + v * e * Math.cos(hl); o.y = T.y[j] + dy * e; o.h = hl; return o;
    }
    a = k - i;
    o.x = T.x[i] + (T.x[i + 1] - T.x[i]) * a; o.y = T.y[i] + (T.y[i + 1] - T.y[i]) * a; o.z = T.z[i] + (T.z[i + 1] - T.z[i]) * a;
    o.h = T.h[i] + angDiff(T.h[i + 1], T.h[i]) * a;
    return o;
  }
  /* a bird of a living flock at its flight's time: the leader's way a moment back (its place behind), aside, up, and its
     own wander about its place */
  function liveSpot(P, m, tau, o) {
    lvAt(P, tau - m.lagT, LVQ);
    var h = LVQ.h, ch = Math.cos(h), sh = Math.sin(h), x = tau / m.wT;
    var wl = m.wL * wave(m.wk, x), wa = m.a + m.wP * wave(m.wk + 53, x / 1.3), wu = m.u + 0.6 * m.wP * wave(m.wk + 97, x / 1.1);
    o.x = LVQ.x + wa * ch + wl * sh; o.z = LVQ.z - wa * sh + wl * ch; o.y = LVQ.y + wu;
    return o;
  }
  var LVQ2 = { x: 0, y: 0, z: 0, h: 0 };
  /* (v13) a bird's box (the planner's) with the night halo's reach at its own nearness now (as measureBird3D counts it
     at a flight's: a living flock's distance changes, and v12 counted it at nearness 1, a third of its reach at 0.3) */
  function lvBox(m, n) {
    var d = m.d, N = !FORCED && HOST.night ? HOST.night() : 0, pen = 0.5 * LINE[1] + 1.5;
    var hp = N > 0 && HALO_IN_BOX ? 4 * (W < 600 ? HALO_E[1] : HALO_E[0]) / Math.max(n, 0.15) : 0;
    d.hw = d.gw / 2 + pen + hp; d.hh = d.gh / 2 + pen + hp; d.halo = hp;
  }
  /* the camera's way: where it is and goes (m/s), from its frame state */
  var LVC = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, clr: 0 };
  function lvCam(C) {
    LVC.x = C.pos[0]; LVC.y = C.pos[1]; LVC.z = C.pos[2]; LVC.clr = C.pos[1] - lvGround(C.pos[0], C.pos[2]);
    var s = FL.speed || 0, p = FL.psi || 0;
    LVC.vx = CAMV[0] || s * Math.sin(p); LVC.vy = CAMV[1] || 0; LVC.vz = CAMV[2] || s * Math.cos(p);
    return LVC;
  }
  /* a world point on the window through camera C moved by its velocity for T s (its look held) */
  var LVP = { x: 0, y: 0, n: 0, z: 0 };
  function lvProj(x, y, z, C, T, o) {
    var cx = C.pos[0] + LVC.vx * T, cz = C.pos[2] + LVC.vz * T, cy = T > 0 ? lvGround(cx, cz) + LVC.clr : C.pos[1];
    var dx = x - cx, dy = y - cy, dz = z - cz;
    var zc = dx * C.f[0] + dy * C.f[1] + dz * C.f[2]; o.z = zc;
    if (!(zc > 0.5)) { o.x = o.y = NaN; o.n = 0; return o; }
    var xc = dx * C.r[0] + dy * C.r[1] + dz * C.r[2], yc = dx * C.u[0] + dy * C.u[1] + dz * C.u[2];
    o.x = W / 2 * (1 + xc / zc / VW.tanX); o.y = H / 2 * (1 - yc / zc / VW.tanY); o.n = (W / 2) / VW.tanX * MPU / zc;
    return o;
  }
  /* (v17) the event glides along a living flock's route, as eventGlides finds them in a crossing's path (the old flights'
     rule: a turn of 25 deg or more entered gliding, EG_TURN of the time, from 0.5-0.8 s before it; a descent of 2 deg or
     more held 2 s glided on set wings, EG_DESC_P of the time, EG_DESC s of it), found as each step is added; none
     begins sooner than half a second from now (the route runs LV_AHEAD s ahead). v16's living geese never glided: the
     old rule runs once over a crossing's whole path, and places were skipped. Not on a day sky (the old rule's too) */
  function lvEvents(P, j, dt) {
    var T = P.tr, S = P.egS, k = P.sort, r = P.r, tau = j * dt, lim = tau - (LV_AHEAD - 0.5);
    if (!S || j < 1 || P.cls === 'day') return;
    var dh = angDiff(T.h[j], T.h[j - 1]) / dt / DEG;
    if (Math.abs(dh) > 3) {
      if (S.r0 < 0) { S.r0 = tau; S.tot = 0; S.ti = -1; }
      S.tot += dh * dt;
      if (S.ti === -1 && Math.abs(S.tot) >= 25) { S.ti = -2; if (r() < (EG_TURN[k] || 0.5)) { P.eg.push([Math.max(S.r0 - pick(r, [0.5, 0.8]), lim), 1e9, 'turn']); S.ti = P.eg.length - 1; } }
    } else if (S.r0 >= 0) { if (S.ti >= 0) P.eg[S.ti][1] = tau; S.r0 = -1; }
    var dn = (T.y[j] - T.y[j - 1]) / ((P.st.v || P.v0) * dt) < -Math.sin(2 * DEG);
    if (dn) {
      if (S.d0 < 0) { S.d0 = tau; S.di = -1; }
      if (S.di === -1 && tau - S.d0 >= 2) { S.di = -2; if (r() < (EG_DESC_P[k] || 0.2)) { var st = Math.max(S.d0 + 0.5 * r(), lim); P.eg.push([st, st + (EG_DESC[k] || 4) * pick(r, [0.7, 1.15]), 'set']); S.di = P.eg.length - 1; } }
    } else if (S.d0 >= 0) { if (S.di >= 0) P.eg[S.di][1] = Math.min(P.eg[S.di][1], tau); S.d0 = -1; }
  }
  /* the leader's route worked out to tau end: its behaviour's heading and climb, its wander, the avoidance's bias, its
     kind's turn and climb limits, its airspeed and the wind */
  function lvExtend(P, tEnd) {
    var T = P.tr, s = P.st, r = P.r, dt = LV_DT, wmax = (LV_TURN[P.sort] || 15) * DEG, eye = P.eye0;   // (v25: the eye's height at its birth: nothing in its flight follows the camera)
    windNow(); var wxw = WINDV[0], wzw = WINDV[2];
    while ((T.n - 1) * dt < tEnd) {
      var j = T.n - 1, x = T.x[j], y = T.y[j], z = T.z[j], tau = j * dt, hd, cd;
      var Th = P.beh === 'hawk' ? 1.5 : P.beh === 'loiter' ? 6 : 10, sh = P.beh === 'hawk' ? 40 : P.beh === 'loiter' ? 25 : P.beh === 'migrant' ? 3 : 7;
      s.eh += -s.eh * dt / Th + sh * DEG * Math.sqrt(2 * dt / Th) * lvG(r);
      s.ec += -s.ec * dt / (P.beh === 'hawk' ? 1.2 : 6) + (P.beh === 'hawk' ? 10 : 2.5) * DEG * Math.sqrt(2 * dt / (P.beh === 'hawk' ? 1.2 : 6)) * lvG(r);
      s.ev += -s.ev * dt / 8 + 0.06 * Math.sqrt(2 * dt / 8) * lvG(r);
      if (P.beh === 'wheel' && tau < s.leaveT) {
        s.cx += wxw * dt; s.cz += wzw * dt;   // (its ring drifts downwind)
        var rx = x - s.cx, rz = z - s.cz, rr = Math.sqrt(rx * rx + rz * rz) || 1, ph = Math.atan2(rx, rz);
        hd = ph + s.sense * Math.PI / 2 - s.sense * clamp(1.2 * (rr - s.R) / s.R, -0.7, 0.7);
      } else if (P.beh === 'loiter' || P.beh === 'hawk') {
        var hx = s.hx - x, hz = s.hz - z, hdist = Math.sqrt(hx * hx + hz * hz), toHome = Math.atan2(hx, hz);
        s.hc += angDiff(s.hb + s.eh, s.hc) * Math.min(1, dt / 2);
        /* (v18) back in, and on across its patch on the way it came in (v17 turned it back out at once to its old way:
           crows circled at the patch's edge at their whole 22 deg/s); now and then a gentle new way inside it */
        if (hdist > s.Rh) { s.hb = toHome; hd = toHome + 0.5 * s.eh; } else hd = s.hb + s.eh;
        if (hdist < 0.4 * s.Rh && r() < 0.004) s.hb += (r() * 2 - 1) * 60 * DEG;
      } else hd = s.hb + s.eh;   // (commute, migrant: its bearing, wandering)
      if (P.beh === 'wheel' && tau >= s.leaveT && s.hb === s.h0) s.hb = s.h;   // (away on the tangent)
      var bias = s.aT >= 0 && t - s.aT < 1.5 ? 1 : Math.max(0, 1 - (t - s.aT - 1.5) / 2);
      hd += s.ah * bias;
      s.h += clamp(angDiff(hd, s.h), -wmax * dt, wmax * dt);
      if (j % 10 === 0 || s.gN === undefined) s.gN = lvGround(x, z) - P.g0;   // (v26: the land under it, a second at a time)
      var yWant = (P.beh === 'migrant' ? Math.max(s.y0, eye + 80) : (s.y0 - eye) < 15 ? eye + 15 : s.y0) + LV_TERRAIN * s.gN;   // (v26: over the land's rises and falls, as birds fly, never the camera's)   // (v20: a migrant high, but in the window's sky: 220 m over the eye took it out of the top)
      cd = clamp(0.02 * (yWant - y), -0.12, 0.12) + s.ec + s.ac * bias;
      s.c += clamp(cd - s.c, -0.35 * dt, 0.35 * dt);
      s.v = P.v0 * (1 + s.ev);
      var vh = s.v * Math.cos(s.c);
      T.x.push(x + (vh * Math.sin(s.h) + wxw) * dt); T.z.push(z + (vh * Math.cos(s.h) + wzw) * dt); T.y.push(y + s.v * Math.sin(s.c) * dt); T.h.push(s.h);
      T.n++;
      lvEvents(P, T.n - 1, dt);
    }
    /* (its route behind it trimmed: kept LV_KEEP s, for the birds a moment back on its way) */
    var keep = Math.floor(((t - P.t0) - 40) / dt);
    if (keep > 200) {
      var cut = keep - 100, sh = cut * dt; T.x.splice(0, cut); T.y.splice(0, cut); T.z.splice(0, cut); T.h.splice(0, cut); T.n -= cut; P.t0 += sh;
      if (P.eg) { for (var q = 0; q < P.eg.length; q++) { P.eg[q][0] -= sh; if (P.eg[q][1] < 1e8) P.eg[q][1] -= sh; } var S = P.egS; if (S.r0 >= 0) S.r0 -= sh; if (S.d0 >= 0) S.d0 -= sh; }
    }
  }
  /* (v12) the fastest a flock's leader moves on the window over its next T s (px/s) and whether it shows at all: its
     route worked out that far (the camera on at its velocity, its look held), then put back as it was */
  var LVR = { max: 0, seen: false, first: 1e9, dmin: 1e9 };
  function lvCap() { return LV_DEGS * DEG * (W / 2) / VW.tanX; }
  function lvRate(P, C, T) {
    var R = P.tr, k, best = 0, seen = false, px = NaN, py = NaN, tau, m0 = P.m[0], first = 1e9, dmin = 1e9;
    lvExtend(P, T);
    for (tau = 0; tau <= T; tau += 0.5) {
      lvAt(P, tau, LVQ); lvProj(LVQ.x, LVQ.y, LVQ.z, C, tau, LVP);
      var ccx = LVC.x + LVC.vx * tau, ccz = LVC.z + LVC.vz * tau, ccy = lvGround(ccx, ccz) + LVC.clr;
      dmin = Math.min(dmin, Math.sqrt(Math.pow(LVQ.x - ccx, 2) + Math.pow(LVQ.y - ccy, 2) + Math.pow(LVQ.z - ccz, 2)));
      if (LVP.z > 1 && inView(LVP.x, LVP.y, 0, 0) && fadeFor(P, LVP.n) > 0.02) {
        seen = true; if (first > 1e8 && fadeFor(P, LVP.n) > 0.3) first = tau; if (px === px) best = Math.max(best, Math.sqrt((LVP.x - px) * (LVP.x - px) + (LVP.y - py) * (LVP.y - py)) / 0.5);
        px = LVP.x; py = LVP.y;
        lvBox(m0, LVP.n);   // (v13: its box at its nearness there)
      } else px = py = NaN;
    }
    LVR.dmin = dmin; LVR.max = best; LVR.seen = seen; LVR.first = first; return LVR;
  }
  /* is a world point seen now (in the window, its ink showing)? */
  function lvSeen(x, y, z, C, P) {
    lvProj(x, y, z, C, 0, LVP);
    return LVP.z > 1 && fadeFor(P, LVP.n) > 0.02 && inView(LVP.x, LVP.y, 40, 40);
  }
  /* a flock born for the sky, the reference's way (its creatures are placed in the viewer's way, and the viewer flies
     through their air): an encounter LV_MEET s ahead on the camera's way (where it will be, its look's direction),
     LV_SIDE aside and LV_UP above it, where this flock's own route will bring it then. A commuter on its role's bearing
     (the evening's flight line, against it, across it) set back along that bearing by as far as it flies in that time,
     so it comes into the window from out of it; a wheel or a loiterer waiting there, out of the distance (born beyond
     where its ink shows, or out of the window). Never born in view with its ink showing. (v1 scattered flocks 0.65-1.5
     km about the visitor: at that distance a bird is 2-5 px, and on a phone none was ever seen) */
  /* Three kinds of meeting, from the physics of a viewer moving at 12 m/s (v3 put its meetings 60-260 m ahead and
     120-380 m aside: mostly outside the window's cone, and on a phone none was seen):
     - on the evening's line, flying the viewer's general way: heading off its course by about acos(its speed over the
       camera's), so that relative to the viewer it drifts mostly across: at 150-320 m it crosses the window in about
       15-35 s at its real airspeed, neither swelling nor shrinking much (a goose 17 m/s at 45 deg, an ibis 31; the
       slower kinds near the course, falling back slowly);
     - against the line or across it: the viewer closes on it fast, so it is met farther out (450-900 m), crossing;
     - wheels, loiterers, swallows hawking: placed ahead beside the way, born where their ink does not yet show (about
       nearness 0.13), coming out of the distance as the viewer comes and passing beside it.
     Each set back along its own way by as far as it flies until the meeting, so it comes into the window from out of
     it; never born in view with its ink showing. */
  var LV_E1 = [120, 260], LV_E2 = [350, 700], LV_E3_LAT = [110, 220], LV_UP = { loiter: [40, 120], hawk: [30, 90], wheel: [60, 160] };
  function lvWhy(k) { var w = STATS.lvWhy = STATS.lvWhy || {}; w[k] = (w[k] || 0) + 1; }
  /* a height on the window in the open sky (openBands, its reach px above and below), weighted by the bands' sizes */
  function lvBand(r, reach) {
    var B = openBands(reach, reach), tot = 0, i, u;
    for (i = 0; i < B.length; i++) tot += Math.max(0, B[i][1] - B[i][0]);
    if (!(tot > 4)) return null;
    u = r() * tot;
    for (i = 0; i < B.length; i++) { var s = Math.max(0, B[i][1] - B[i][0]); if (u <= s) return B[i][0] + u; u -= s; }
    return B[B.length - 1][1];
  }
  /* the world point at depth A (m, along the look) seen at window (x, y) through camera C as it looks now */
  function lvAim(C, x, y, A, o) {
    var sx = (2 * x / W - 1) * VW.tanX, sy = (1 - 2 * y / H) * VW.tanY;
    o.x = C.pos[0] + A * (C.f[0] + sx * C.r[0] + sy * C.u[0]); o.y = C.pos[1] + A * (C.f[1] + sx * C.r[1] + sy * C.u[1]); o.z = C.pos[2] + A * (C.f[2] + sx * C.r[2] + sy * C.u[2]);
    return o;
  }
  function lvSpawn(C, cls, rescue) {
    var r = LIVE.r, beh = weighted(r, LV_BEH[cls] || LV_BEH.day), look = Math.atan2(C.f[0], C.f[2]), tries, x, y, z, h, P, A;
    if (rescue && beh !== 'migrant') beh = 'commute';
    var DW = DIRS[cls] || [40, 25, 25, 10], role = beh === 'commute' || beh === 'migrant' ? weighted(r, [['stream', DW[0]], ['counter', DW[1]], ['cross', DW[2]], ['local', DW[3]]]) : 'local';
    if (rescue || beh === 'migrant') role = 'stream';
    if (role === 'local' && (beh === 'commute')) beh = 'loiter';
    var what = lvWhat(r, cls, beh), v = LV_SPEED[what[1]] || 12, cs = Math.sqrt(LVC.vx * LVC.vx + LVC.vz * LVC.vz), course = cs > 1 ? Math.atan2(LVC.vx, LVC.vz) : look;
    var kN = (W / 2) / VW.tanX * MPU;   // (nearness x distance)
    windNow();
    /* (v8) in a head wind the camera goes through the air faster than the slower kinds fly (the dunes: 18.5 m/s against a
       gull's 11): a meeting on the viewer's way is then a strong flyer's, geese or ibis, as in a real head wind */
    if ((role === 'stream' || rescue) && (beh === 'commute' || beh === 'migrant') && v < 0.95 * Math.sqrt(Math.pow(LVC.vx - WINDV[0], 2) + Math.pow(LVC.vz - WINDV[2], 2))) {
      what = [what[0] === 'single' || what[0] === 'pair' ? what[0] : (r() < 0.6 ? 'skein' : 'line'), r() < 0.75 ? 'goose' : 'ibis', 0]; v = LV_SPEED[what[1]];
    }
    var aK = 1, fd = LV_FADE[beh] || LV_FADE.commute;   // (v12: how much farther out than drawn, after a try that swept the eye; v20: its fade)
    for (tries = 0; tries < 16; tries++) {
      var sd = r() < 0.5 ? 1 : -1;
      if (beh === 'commute' || beh === 'migrant') {
        /* (v8) its heading solved in the look's own frame (v7 aimed by the camera's course; where the camera looked well
           off its course, 'flying its way' moved along the line of sight: no flock could cross, and three visits stayed
           empty for minutes): relative to the viewer it moves across the window at s m/s and nearer or farther at d
           (near meetings -2.5..3, a gentle change of size; far ones closing at 3-9), at its kind's own airspeed v
           through the air: |(the camera's air velocity) + s R + d F| = v, R across the window and F along the look */
        var near = role === 'stream' || rescue;
        /* (v18) met at its kind's own nearness (SORTS depth: the crossings' true sizes, which the owner approved; the
           far meetings, against the line or across it, at three quarters of it): v17 met them at 120-700 m, a median of
           9 px across on a desktop against the crossings' 20 (a wheel or a loiterer 5) */
        A = Math.max(60, (beh === 'migrant' ? kN / mix(r(), 0.42, 0.62) : kN / (pick(r, (SORTS[what[1]] || SORTS.gull).depth) * (near ? 1 : 0.75)))) * aK;
        var Fx = Math.sin(look), Fz = Math.cos(look), Rx = Math.cos(look), Rz = -Math.sin(look);
        var ax = LVC.vx - WINDV[0], az = LVC.vz - WINDV[2], aR = ax * Rx + az * Rz, aF = ax * Fx + az * Fz;
        var dd0 = near ? mix(r(), -2.5, 3) : mix(r(), -9, -3), tx = VW.tanX * 1.12, kT = rescue ? 1.05 : 1.25;
        /* (v22) which way it crosses the window: a commuter on the evening's line goes the line's way 65 % of the time (a
           migrant 75 %), the rest on its other side of the viewer's way; a rescue either way. v21 sent every one on the
           line, and every rescue, the line's way: a visit's flights went one way a median 83 % of the time (all of them in
           a tenth of visits), against the crossings' 68 % (the owner: "flying only in 1 direction") */
        var sgn = role === 'counter' ? -LIVE.side : role === 'cross' || rescue ? (r() < 0.5 ? 1 : -1) : (r() < (beh === 'migrant' ? 0.75 : 0.65) ? LIVE.side : -LIVE.side);
        /* (v12) if the drawn way cannot cross the window soon enough (in a head wind a goose flying the viewer's way can
           barely keep pace with it: v11 refused every try, and a moonlit visit stayed empty for two minutes), the way
           across it quickest: its speed along the look where the crossing outruns the closing most (aF + dd = v sin of
           the cone's angle); and a meeting a little nearer (to 0.6 of the drawn) to come within 45 s */
        var ddQ = v * tx / Math.sqrt(1 + tx * tx) - aF, cand = [dd0, ddQ], ci, dd, wl, den, Tm = 1e9, sol = 0, fail = 'slow';
        for (ci = 0; ci < 2 && !sol; ci++) {
          dd = clamp(cand[ci], -aF - 0.92 * v, -aF + 0.92 * v);
          var rad = v * v - (aF + dd) * (aF + dd); if (rad < 1) { fail = 'slow'; continue; }
          var sq = Math.sqrt(rad); wl = -aR + sgn * sq;
          if (Math.abs(wl) < 3.5 && Math.abs(-aR - sgn * sq) > Math.abs(wl)) wl = -aR - sgn * sq;   // (v10: into a crosswind its chosen way crosses at a crawl: it crosses the other way; v23: only under 3.5 m/s, about 17 px/s on a desktop (v22's 6 sent most flocks downwind across the window: one way 81 % of a visit's flights, the crossings' 68 %))
          if (Math.abs(wl) < 2) { fail = 'hang'; continue; }   // (it would hang in the window)
          /* (v8) begun outside the window's cone: across by more than the cone's half-width at the depth it begins at
             (nearer on its way in it is deeper, where the cone is wider); if its closing is too steep for that, begun
             where its ink does not yet show and let come out of the distance */
          den = Math.abs(wl) - Math.max(0, -dd) * tx;
          if (den > 0.8) {
            Tm = Math.max(3, A * tx / den * kT);
            if (Tm > 45 && Tm <= 75) { A *= 45 / Tm; Tm = 45; }
            if (Tm <= 45) sol = 1; else fail = 'long';
          } else if (-dd > 0.5) { var zf = kN / (fd[0] * 0.95); Tm = (zf - A) / -dd; if (Tm <= 60) sol = 2; else fail = 'cone'; }
          else fail = 'cone';
        }
        if (!sol) { lvWhy(fail); continue; }
        if (ci > 1) lvWhy('quick');
        var wx = wl * Rx + dd * Fx, wz = wl * Rz + dd * Fz, vbx = LVC.vx + wx, vbz = LVC.vz + wz;
        h = Math.atan2(vbx - WINDV[0], vbz - WINDV[2]);
        /* (v5) the meeting aimed at a band of open sky (openBands: clear of the other flights) and set back from outside
           the window's side by half its width again (v4 began some just inside it) */
        var by = lvBand(r, 22); if (by === null) { lvWhy('noband'); continue; }
        lvAim(C, W / 2 + (r() * 2 - 1) * 0.2 * W / 2, by, A, LVQ);
        x = LVQ.x + LVC.vx * Tm - vbx * Tm; z = LVQ.z + LVC.vz * Tm - vbz * Tm; y = LVQ.y + LVC.vy * Tm;
      } else {
        A = kN / (fd[0] * mix(r(), 0.9, 1)) * aK;   // (v20: born just beyond its fade)
        var by3 = lvBand(r, 22); if (by3 === null) { lvWhy('noband'); continue; }
        var xf = clamp(sd * pick(r, LV_E3_LAT) * aK / (A * VW.tanX), -0.9, 0.9);   // (v10: beside the way by LV_E3_LAT m, never on it: v9 placed some ahead in the window's middle and flew through them)
        lvAim(C, W / 2 * (1 + xf), by3, A, LVQ); x = LVQ.x; z = LVQ.z; y = LVQ.y; h = TAU * r();
      }
      if (lvSeen(x, y, z, C, { fadeS: fd })) { lvWhy('seen'); STATS.lvSeenLast = [Math.round(LVP.x), Math.round(LVP.y), +LVP.n.toFixed(3), Math.round(LVP.z), +(Tm || 0).toFixed(1), +(wl || 0).toFixed(1), +(dd || 0).toFixed(1), Math.round(A), +C.f[0].toFixed(2), +C.f[1].toFixed(2), +C.f[2].toFixed(2), +LVC.vx.toFixed(1), +LVC.vz.toFixed(1)]; continue; }   // (never born in view with its ink showing)
      P = lvMake(beh, x, y, z, h, cls, what);
      if (!P) { lvWhy('slots'); return null; }
      P.role = role; P.st.h0 = P.st.hb;
      var RT = lvRate(P, C, beh === 'commute' || beh === 'migrant' ? LV_RATE_T.near : LV_RATE_T.far), cap = lvCap();
      if (RT.max > cap) { aK = Math.min(4, aK * RT.max / cap * 1.1); lvWhy('fast'); LIVE.k--; continue; }
      if (!RT.seen) { lvWhy('unseen'); LIVE.k--; continue; }
      if (rescue && !(RT.first <= 5)) { lvWhy('late'); LIVE.k--; continue; }
      if (RT.dmin < LV_CLEAR) { lvWhy('near'); LIVE.k--; continue; }   // (v25: its way kept clear of the viewer's at birth, as it no longer steers after)   // (v21: a rescue shows within 5 s: v20's, slower than the viewer, came out of the distance 35 s later)   // (v16: a way onto the words is not flown: v15's near skein, steering late, went into the margin while it faded)   // (v15: a way that never comes into the window is not flown)
      return P;
    }
    STATS.lvNoSpawn = (STATS.lvNoSpawn || 0) + 1;
    return null;
  }
  /* (v15) how far a projected point lies outside the window (px; 0 inside; behind the eye, the farther behind the more) */
  function lvOut(o) { return !(o.z > 1) ? 1e4 - o.z : Math.max(0, Math.abs(o.x - W / 2) - W / 2, Math.abs(o.y - H / 2) - H / 2); }
  function liveStep(C, dt) {
    if (!C || !FL.ok) return;
    lvCam(C);
    var cls = skyCls(), i, P;
    if (!LIVE.r) LIVE.r = vstream(8800);
    if (cls !== LIVE.cls) { LIVE.cls = cls; LIVE.rb = TAU * LIVE.r(); LIVE.side = LIVE.r() < 0.5 ? 1 : -1; }   // (the evening's flight line: a world bearing drawn once a sky)
    /* each flock's route worked out ahead; every LV_EVERY s its look ahead (its birds' boxes) */
    var look = t - LIVE.look >= LV_EVERY; if (look) LIVE.look = t;
    var live = 0, anySeen = false;
    for (i = PLACES.length - 1; i >= 0; i--) {
      P = PLACES[i]; if (!P.live) continue;
      if (P.gone && t - P.gone > (P.goneT || GONE_T)) { landPlace(P); continue; }   // (gone together)
      lvExtend(P, t - P.t0 + LV_AHEAD);
      lvAt(P, t - P.t0, LVQ);
      var dx = LVQ.x - LVC.x, dz = LVQ.z - LVC.z, dist = Math.sqrt(dx * dx + dz * dz), ahead = dx * Math.sin(FL.psi || 0) + dz * Math.cos(FL.psi || 0);
      if (look) { lvProj(LVQ.x, LVQ.y, LVQ.z, C, 0, LVP); for (var q2 = 0; q2 < P.m.length; q2++) lvBox(P.m[q2], LVP.z > 1 ? LVP.n : 0.15); }   // (v13: its birds' boxes at its nearness now)
      var drawn = drawnNow(P);
      if (P.lastSeen !== undefined && t - P.lastSeen < 0.6) { lvProj(LVQ.x, LVQ.y, LVQ.z, C, 0, LVP); if (fadeFor(P, LVP.n) >= 0.3) anySeen = true; }   // (v24: a faint far speck does not hold off the rescue)
      if (!drawn && (dist > LV_DROP || ahead < -LV_BEHIND)) { landPlace(P); STATS.lvDrop = (STATS.lvDrop || 0) + 1; continue; }   // (let go out of sight)
      /* (v15) let go once out of the window and going away from it (3 s on), or never seen in 75 s: v14's commuters,
         flying the viewer's way about its pace, crossed and then flew on beside it out of sight for minutes, and held
         the sky's count and its twelve birds (a phone's moonlit sky stayed empty for 39 s, every slot taken) */
      if (!drawn) {
        lvProj(LVQ.x, LVQ.y, LVQ.z, C, 0, LVP); var o0 = lvOut(LVP);
        lvAt(P, t - P.t0 + 3, LVQ2); lvProj(LVQ2.x, LVQ2.y, LVQ2.z, C, 3, LVP); var o1 = lvOut(LVP);
        P.awayT = o0 > 0 && o1 > o0 + 0.5 ? (P.awayT || 0) + dt : 0;
        if (P.awayT > 3 || (P.lastSeen === undefined && t - P.t0 > 75)) { landPlace(P); STATS.lvGone = (STATS.lvGone || 0) + 1; continue; }
      }
      live++;
    }
    if (anySeen) LIVE.seenT = t;
    if (!look) return;
    /* the sky kept alive: an encounter every LV_GAP s of the sky's (while fewer than LV_POP flocks live about the
       visitor); one sooner when the window has been empty LV_EMPTY s */
    var want = LV_POP[cls] || 5;
    if ((live < want && t >= LIVE.nextT) || t - LIVE.seenT > LV_EMPTY) {   // (v16: the rescue on its own clock, not the encounters')
      var rescue = t - LIVE.seenT > LV_EMPTY || !(STATS.lvMade > 0);   // (the first at once, just outside the side)
      P = lvSpawn(C, cls, rescue);
      if (P) {
        for (var q = 0, j = 0; q < slots.length && j < P.m.length; q++) if (!slots[q].busy) { slots[q].busy = true; P.m[j].s = slots[q]; dress(slots[q], P.m[j].d); j++; }
        P.id = 'p' + P.key; PLACES.push(P); STATS.lvMade = (STATS.lvMade || 0) + 1;
        lvExtend(P, LV_AHEAD);
        if (rescue) { LIVE.seenT = t; STATS.lvRescue = (STATS.lvRescue || 0) + 1; }
        LIVE.nextT = t + pick(LIVE.r, LV_GAP[cls] || LV_GAP.day);
      } else LIVE.nextT = t + 1.5;   // (v19: no way found, another try soon: v18 waited a whole gap, and a first bird came at 31 s)
    }
  }

