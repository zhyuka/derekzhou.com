  /* ---------------- flocks ---------------- */
  /* the places in a pattern, in spans (back, aside, up) from the lead */
  function slotsOf(r, pat, n, kind) {
    var S = [[0, 0, 0]], i, k, side;
    for (i = 1; i < n; i++) {
      if (pat === 'skein') { var VG = V_GEOM[kind] || V_GEOM.goose; k = Math.ceil(i / 2); side = i % 2 ? 1 : -1; S.push([k * pick(r, VG.x), side * k * pick(r, VG.y), (side * 0.5 + 0.25) * k + (r() - 0.5) * 0.2]); }
      else if (pat === 'line') S.push([i * mix(r(), 1.8, 2.5), (r() - 0.5) * 0.6, (i % 2 ? 0.55 : -0.55) + (r() - 0.5) * 0.3]);
      else if (pat === 'pair') S.push([mix(r(), -0.4, 0.6), (r() < 0.5 ? 1 : -1) * mix(r(), 1.4, 2.1), (r() - 0.5) * 0.6]);
      else {
        var rr = Math.sqrt(n) * 1.9, c, tr;
        for (tr = 0; tr < 30; tr++) { c = [(r() * 2 - 0.5) * rr, (r() * 2 - 1) * rr, (r() * 2 - 1) * 0.8 * rr]; if (S.every(function (q) { var a = q[0] - c[0], bb = q[1] - c[1], e = q[2] - c[2]; return a * a + bb * bb + e * e >= 5; })) break; }
        S.push(c);
      }
    }
    return S;
  }
  /* what flies: a pattern, its kind, how many (the sky's tables) */
  function flockWhat(r, cls) {
    var L = LIFE[cls], pat = L ? weighted(r, L.pat) : weighted(r, [['skein', 22], ['line', 18], ['pair', 28], ['single', 22], ['loose', 10]]);
    var kind = L && L.kinds[pat] ? weighted(r, L.kinds[pat]) : weighted(r, SORT_OF[pat] || [['gull', 1]]);
    return [pat, kind, lvCount(r, pat)];
  }
  /* a flock of a kind that perches, where the sky has one (a few draws of its own mix) */
  function perchWhat(r, cls) { var w; for (var k = 0; k < 6; k++) { w = flockWhat(r, cls); if (KINDS[w[1]] && KINDS[w[1]].perch) return w; } return w; }
  function lvCount(r, pat) {
    if (pat === 'single') return 1; if (pat === 'pair') return 2;
    return weighted(r, LIFE_N[pat] || [[3, 1]]);
  }
  /* a flock made at (x, y, z) heading psi */
  function newFlock(x, y, z, psi, cls, what) {
    var r = sm32((visitSeed ^ Math.imul(9001 + (++POP.k), 0x9E3779B9)) >>> 0), w = what || flockWhat(r, cls), pat = w[0], kind = w[1], n = w[2];
    var F = flockRec(POP.k, kind, pat, r);
    var sl = slotsOf(r, pat, n, kind), i;
    for (i = 0; i < n; i++) { var b = newBird(kind, sm32((visitSeed ^ Math.imul(77003 + POP.k * 31 + i, 0x85EBCA6B)) >>> 0), x, y, z, psi, 0, F); b.slot = sl[i]; F.m.push(b); }
    F.lead = F.m[0];
    for (i = 1; i < n; i++) holdPlace(F, F.m[i]);
    FLOCKS.push(F);
    nextGoal(F);
    return F;
  }
  /* (the owner, 2026-11-06: any bird joins a flock or forms one) a lone bird, or a flock's few, near another flock of
     its kind flying the same way joins it: a place at the end of its pattern, eased into by its own steering. (The
     flocks that may join, sorted by their leader's x: a flock looks only at those within 40 m of it in x and takes the
     first of them in FLOCKS' order, as a search of every flock would; the pairs no longer grow as the count squared) */
  var JI = new Int32Array(64), JX = new Float64Array(64), JO = new Int32Array(64);
  /* O[0..n) sorted in place by K[O[i]], least first (a heapsort: no store made, as a typed array's sort with a rule makes) */
  function heapSort(O, K, n) {
    var i, e, v;
    for (i = (n >> 1) - 1; i >= 0; i--) siftDown(O, K, i, n);
    for (e = n - 1; e > 0; e--) { v = O[0]; O[0] = O[e]; O[e] = v; siftDown(O, K, 0, e); }
  }
  function siftDown(O, K, r, m) { var c, v; while ((c = 2 * r + 1) < m) { if (c + 1 < m && K[O[c + 1]] > K[O[c]]) c++; if (K[O[c]] <= K[O[r]]) return; v = O[r]; O[r] = O[c]; O[c] = v; r = c; } }
  function joinStep() {
    var n = 0, i, j, k;
    for (j = 0; j < FLOCKS.length; j++) {
      var C = FLOCKS[j]; if (C.far || C.m.length > 2 || !C.lead || C.lead.st !== 'fly') continue;
      if (n === JI.length) { var I2 = new Int32Array(2 * n), X2 = new Float64Array(2 * n); I2.set(JI); X2.set(JX); JI = I2; JX = X2; JO = new Int32Array(2 * n); }
      JI[n] = j; JX[n] = C.lead.p[0]; n++;
    }
    if (!n) return;
    for (k = 0; k < n; k++) JO[k] = k;
    var O = JO; heapSort(O, JX, n);
    for (i = 0; i < FLOCKS.length; i++) {
      var A = FLOCKS[i]; if (A.far || !A.lead || A.lead.st !== 'fly') continue;
      var ax = A.lead.p[0], lo = 0, hi = n;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (JX[O[mid]] < ax - 40) lo = mid + 1; else hi = mid; }
      var best = -1;
      for (k = lo; k < n && JX[O[k]] <= ax + 40; k++) {
        j = JI[O[k]]; if (best >= 0 && j > best) continue;
        var B = FLOCKS[j]; if (B === A || B.kind !== A.kind || B.m.length > A.m.length) continue;
        if (A.m.length + B.m.length > 11) continue;
        var dx = B.lead.p[0] - A.lead.p[0], dy = B.lead.p[1] - A.lead.p[1], dz = B.lead.p[2] - A.lead.p[2];
        if (dx * dx + dy * dy + dz * dz > 40 * 40 || Math.cos(angDiff(B.lead.psi, A.lead.psi)) < 0.6) continue;
        best = j;
      }
      if (best >= 0) {
        B = FLOCKS[best];
        while (B.m.length) {
          var b = B.m.pop(), q = endPlace(A);
          if (A.pat === 'line') q[1] = (B.r() - 0.5) * 0.6;
          q[2] = (B.r() - 0.5) * 0.5; b.slot = q; b.F = A; b.goal = null; A.m.push(b); A.lk = true;
        }
        if (A.m.length === 2) A.pat = 'pair';
        A.off = false; A.acc = 0;   // (joined: judged again with its new birds)
        FLOCKS.splice(best, 1); B.out = true;
        return;
      }
    }
  }
  /* a bird leaves its flock (to land, or a straggler on its own way): a flock of its own, on its own goal */
  function splitOff(b) {
    var F0 = b.F; if (!F0 || F0.m.length < 2) return F0;
    leaveFlock(b); b.slot = [0, 0, 0];
    return soloFlock(b);
  }

  /* ---------------- the population ---------------- */
  function liveCount(R) {
    var n = 0, r2 = (R || LIVE_R) * (R || LIVE_R);
    for (var i = 0; i < FLOCKS.length; i++) { var F = FLOCKS[i], L = F.lead; if (!L) continue; var dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z; if (dx * dx + dz * dz < r2 || (!R && F.goal && F.goal.home)) n++; }   // (the whole sky's count takes in the flocks coming in)
    return n;
  }
  /* the visit's first sky (before its first frame: nothing is seen yet): the visitor's sky filled, a flock or two near */
  function seed(C) {
    var cls = skyCls(), r = POP.r, pass = cls === 'moon' && !FORCED && passR() < PASS_P, want = LIVE_N[cls] || 6, i, k;
    for (i = 0; i < want; i++) {
      for (k = 0; k < 12; k++) {
        var near = i < 2, d = near ? mix(r(), 140, 600) : LIVE_R * Math.sqrt(mix(r(), 0.03, 1)), a = near ? Math.atan2(C.f[0], C.f[2]) + (r() - 0.5) * 1.2 : TAU * r();
        var x = LVC.x + d * Math.sin(a), z = LVC.z + d * Math.cos(a), y = Math.max(hideTop(x, z) + 30, LVC.y + mix(r(), -30, 80));
        if (y < lvGround(x, z) + 15) continue;
        var ps = TAU * r(); if (pass && i === want - 1) POP.k++; else newFlock(x, y, z, ps, cls, near ? perchWhat(r, cls) : null);   // (the near ones of kinds that perch: a visit sees one come down soon; a passage takes the last place, the draws kept)
        break;
      }
    }
    if (pass) passage(C, cls, passR, true);   // (a night opening's passage, on its way at the cut)
    POP.nightT = Infinity;   // (the opening's sky drawn here)
    for (i = 0; i < BIRDS.length; i++) { var q = BIRDS[i]; for (k = 0; k < 3; k++) { q.pp[k] = q.p[k]; q.v0[k] = q.v[k]; } q.phi0 = q.phi; }   // (seeded where they are: no step behind them to draw between)
    POP.seeded = true; POP.nextT = t + 2;
  }
  /* a new flock (the owner, 2026-11-06: never born near the viewer, not under the land nor in the sea of cloud): only
     beyond sight (under half a pixel on the largest window, through the air between), on its way into the visitor's
     sky, aimed where the eye will be by the time it comes; it counts as the sky's while it comes in (g.home) */
  function sightD(kind, y) {
    var lo = 300, hi = 60000, m = B_SPAN * (SORTS[kind] || SORTS.gull).size * FDEV_MAX * 1.4, dy = y - LVC.y;   // (the widest a bird of the kind is, with a margin)
    for (var k = 0; k < 24; k++) { var d = 0.5 * (lo + hi); if (m / d * airT(d, dy, 0) < 0.5) hi = d; else lo = d; }
    return hi;
  }
  function addFar(C, cls, r) {
    if (FORCED) return addOutOfView(C, cls, r);
    for (var k = 0; k < 8; k++) {
      var what = r() < 0.5 ? perchWhat(r, cls) : flockWhat(r, cls), y = LVC.y + mix(r(), -30, 90), d = sightD(what[1], y) * 1.05, a = TAU * r();
      var x = LVC.x + d * Math.sin(a), z = LVC.z + d * Math.cos(a);
      if (y < lvGround(x, z) + 30) continue;
      var F = newFlock(x, y, z, 0, cls, what), T = d / F.lead.K.v;
      var ax = LVC.x + LVC.vx * T + (r() - 0.5) * LIVE_R - x, az = LVC.z + LVC.vz * T + (r() - 0.5) * LIVE_R - z;
      F.goal = null; var g = newGoal(F, 'commute', F.r, cls); g.psi = Math.atan2(ax, az); g.T = T * 1.2; g.home = true;
      for (var m = 0; m < F.m.length; m++) F.m[m].psi = g.psi;
      return F;
    }
    return null;
  }
  /* now and then (COME_GAP) one of the sky's flocks, of a kind that perches if it has one, turns to cross the camera's
     way ahead of it: the flocks that fly by, from which the words' birds come down (none is made for it) */
  function recruit() {
    var best = null, bd = 1e18, i;
    for (i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i], L = F.lead; if (!L || L.st !== 'fly' || F.passage || (F.goal && (F.goal.k === 'sink' || F.goal.come)) || (POP.cls === 'moon' && !NIGHT_K[F.kind])) continue;   // (never the night's passage: it flies on)   // (at night never a day kind: it is going to roost)
      var dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z, dd = dx * dx + dz * dz;
      if (dd < 150 * 150 || dd > LIVE_R * LIVE_R) continue;
      if (!KINDS[F.kind].perch) dd *= 4;   // (one that perches first: it may come down on the words)
      if (dd < bd) { bd = dd; best = F; }
    }
    if (!best) return;
    /* by the eye's way, wide of it (the pass goal: aimed afresh each step beside where the eye will be) */
    var L2 = best.lead, g = newGoal(best, 'pass', best.r, POP.cls);
    g.d = pick(best.r, COME_D) * (best.r() < 0.5 ? 1 : -1); g.T = dist3(L2.p, [LVC.x, LVC.y, LVC.z]) / L2.K.v + 30; g.y = LVC.y + mix(best.r(), 5, 40); g.come = true;
  }
  /* (forced colours: the world not drawn, the camera held still, so the view can never turn to them) a flock added
     beyond the view's side, already flying across it */
  function outOfView(b, C) {
    var dx = b.p[0] - C.pos[0], dy = b.p[1] - C.pos[1], dz = b.p[2] - C.pos[2], zc = dx * C.f[0] + dy * C.f[1] + dz * C.f[2];
    if (zc < 1) return true;
    var xc = (dx * C.r[0] + dy * C.r[1] + dz * C.r[2]) / zc, yc = (dx * C.u[0] + dy * C.u[1] + dz * C.u[2]) / zc, m = 2 * b.sz / zc;
    return Math.abs(xc) > VW.tanX * 1.6 + m || Math.abs(yc) > VW.tanY * 1.6 + m;
  }
  function addOutOfView(C, cls, r) {
    var side = r() < 0.5 ? 1 : -1, d = mix(r(), 150, 700), look = Math.atan2(C.f[0], C.f[2]), a = look + side * (VW.tanX ? Math.atan(VW.tanX * 1.9) : 1.2);
    var x = C.pos[0] + d * Math.sin(a), z = C.pos[2] + d * Math.cos(a), y = C.pos[1] + mix(r(), 10, 120);
    var F = newFlock(x, y, z, look - side * mix(r(), 1.2, 1.9), cls);
    F.goal = null; var g = newGoal(F, 'commute', F.r, cls); g.psi = F.lead.psi; g.T = 600;
    for (var i = 0; i < F.m.length; i++) if (!outOfView(F.m[i], C)) { dropFlock(F); return null; }
    return F;
  }
  /* THE NIGHT PASSAGE (delight-life 2; geese migrate at night, calling, mostly 300-400 m up on marine radar). Once a
     night sky, by the visit's stream (PASS_P), a goose skein of 9-25 birds flies a straight way 300-600 m over the land
     across the eye's sky; it takes a flock's place in the count. On a night opening it is seeded at the visit's cut
     (nothing seen yet), on its way, over a place in the upper sky ahead 30-90 s off (as seen from where the eye will be,
     by the flight's own heading and speed); a sky that turns to night bears it beyond sight (at that height a goose
     shows to about 9 km: a long way in). A drag makes it pass elsewhere: nothing follows the view. If it crosses the
     moon it is by chance (the hub, 2026-11-25). passWay fills PASSW (x, y, z, heading) or returns false */
  var PASS_P = 0.6, PASS_H = [300, 600], PASS_N = [9, 25], PASS_TC = [30, 90], PASSA = [0, 0, 0], PASSW = new Float64Array(4), PASSF = {};
  var PASSR = null;
  function passR() { if (!PASSR) PASSR = vstream(8801); return PASSR(); }   // (the passage's own stream: the sky's other flocks draw as they did)
  function passWay(C, h, Tc, side, near, u, v) {   // (u, v: the place ahead it crosses, as fractions of the window's half widths)
    var V = KINDS.goose.v, fl = HOST.flight(PASSF), vx = LVC.vx, vz = LVC.vz, k;
    if (fl.ok) { vx = fl.speed * Math.sin(fl.psi); vz = fl.speed * Math.cos(fl.psi); }   // (the eye's way: the flight's own heading and speed; the eye's measured velocity is still none at a visit's cut)
    u *= VW.tanX; v *= VW.tanY;
    var dx0 = C.f[0] + u * C.r[0] + v * C.u[0], dy0 = C.f[1] + u * C.r[1] + v * C.u[1], dz0 = C.f[2] + u * C.r[2] + v * C.u[2];   // (the line of sight to it: its length matters to nothing but its slope's least)
    if (dy0 < 0.03 * Math.hypot(dx0, dy0, dz0)) return false;
    for (k = 0; k < 24; k++, Tc += 30) {   // (later, farther, till its start is beyond sight)
      var ex = LVC.x + vx * Tc, ez = LVC.z + vz * Tc, gy = lvGround(ex, ez) + h; if (gy <= LVC.y) continue;   // (where the eye will be, and the skein's height there)
      var s = (gy - LVC.y) / dy0, px = ex + dx0 * s, pz = ez + dz0 * s, tr = Math.atan2(dx0, dz0) + side * Math.PI / 2, tx = Math.sin(tr), tz = Math.cos(tr);   // (the place it crosses, and its way over the ground: across the line of sight)
      HOST.wind(PASSA, h); var wl = PASSA[0] * tx + PASSA[2] * tz, wp = PASSA[0] * tz - PASSA[2] * tx, va = V * clamp(1 - 0.2 * wl / V, 0.85, 1.35), gs = wl + Math.sqrt(Math.max(0, va * va - wp * wp));   // (its ground speed as goalVel flies it in the wind at its height)
      var sx = px - tx * gs * Tc, sz = pz - tz * gs * Tc;
      if (gs < 0.5 * V || (!near && Math.hypot(sx - LVC.x, sz - LVC.z) < sightD('goose', gy) * 1.05) || lvGround(sx, sz) + 30 > gy) continue;
      PASSW[0] = sx; PASSW[1] = gy; PASSW[2] = sz; PASSW[3] = tr; return true;
    }
    return false;
  }
  function passage(C, cls, r, near) {
    var n = Math.round(pick(r, PASS_N)), h = pick(r, PASS_H), Tc = pick(r, PASS_TC), side = r() < 0.5 ? 1 : -1, u = (r() - 0.5) * 1.4, v = mix(r(), 0.2, 0.9);
    if (!passWay(C, h, Tc, side, near, u, v)) return;
    var k0 = POP.k; POP.k = 50000 + POP.passN++;   // (its own flock keys: the sky's other flocks keep theirs)
    var F = newFlock(PASSW[0], PASSW[1], PASSW[2], PASSW[3], cls, ['skein', 'goose', n]); POP.k = k0;
    F.goal = null; var g = newGoal(F, 'commute', F.r, cls); g.psi = PASSW[3]; g.y = PASSW[1]; g.T = 900; g.home = true;
    F.passage = 1;
    return F;
  }
  function popStep(C) {
    if (!POP.r) POP.r = vstream(8800);
    var cls = skyCls();
    if (cls !== POP.cls) { POP.cls = cls; POP.line = TAU * POP.r(); POP.nightT = cls === 'moon' && passR() < PASS_P ? t + pick(passR, [4, 40]) : Infinity; }   // (a night's passage: drawn once, as the sky turns)
    if (!POP.seeded) { seed(C); return; }
    for (var i = FLOCKS.length - 1; i >= 0; i--) {   // (taken out: only where unseen or hidden, every bird of it)
      var F = FLOCKS[i];
      if (F.lead && F.lead.st === 'fly' && F.goal && F.goal.k === 'sink' && goneUnseen(F)) { dropFlock(F); continue; }
      if (F.lead && F.lead.st === 'fly' && unseen(F.lead) && goneUnseen(F)) { if (FORCED) dropFlock(F); else sleepFlock(F, i); continue; }
      if (FORCED && F.lead && F.lead.st === 'fly') { var allOut = true; for (var q = 0; q < F.m.length && allOut; q++) allOut = outOfView(F.m[q], C) && dist3(F.m[q].p, C.pos) > 600; if (allOut) dropFlock(F); }
    }
    if (!FORCED) wakeStep();
    if (t >= POP.nextT) {
      POP.nextT = t + 1.5;
      if (!FORCED) disperse(cls);
      if (t >= POP.nightT && !FORCED) { POP.nightT = Infinity; passage(C, cls, passR, false); }   // (it takes a flock's place: the count's own pace evens it)
      if (liveCount() < (LIVE_N[cls] || 6)) addFar(C, cls, POP.r);
      if (t >= (POP.comeT || PFIRST)) { recruit(); POP.comeT = t + pick(POP.r, COME_GAP); }
    }
    if (STEPS % 30 === 0) { joinStep(); homeStep(); }
  }
  /* the world's birds live round the eye: one gone past the live circle goes down into the sea of cloud if one lies
     under it (hidden there, then taken out), else turns back toward the eye's country. (Out past a few km a bird is
     a speck, but it stays seeable for tens of km in clear air: left on its way, the world would fill with them.) */
  function homeStep() {
    for (var i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i], L = F.lead; if (!L || L.st !== 'fly' || !F.goal || F.goal.k === 'sink' || F.goal.home || F.goal.leave) continue;
      var dx = LVC.x - L.p[0], dz = LVC.z - L.p[2]; if (dx * dx + dz * dz < HOME_R * HOME_R) continue;
      var g = newGoal(F, 'sink', F.r, POP.cls);
      if (g.k !== 'sink') { g.psi = Math.atan2(dx, dz) + (F.r() - 0.5) * 1.2; g.T = pick(F.r, [80, 160]); g.home = true; }
    }
  }

  /* (the owner, 2026-11-13: "the birds furthest away start flying further away") a sky holding more flocks than its
     count (clicks let any number go) thins from its far edge: every 1.5 s a twentieth of the excess (one at least),
     the farthest first, turns out, away from the eye, and flies on (homeStep never turns it back) */
  var DSI = new Int32Array(64), DSD = new Float64Array(64), DSO = new Int32Array(64);

  function disperse(cls) {
    var n = 0, stay = 0, i, j, r2 = LIVE_R * LIVE_R;
    for (i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i], L = F.lead; if (!L || (F.goal && F.goal.leave)) continue;
      var dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z, dd = dx * dx + dz * dz;
      if (dd >= r2 && !(F.goal && F.goal.home)) continue;
      stay++;
      if (F.passage || (F.goal && (F.goal.k === 'sink' || F.goal.come || F.goal.k === 'pass'))) continue;   // (never the night's passage on its way)
      var fly = true; for (j = 0; j < F.m.length && fly; j++) fly = F.m[j].st === 'fly';
      if (!fly) continue;
      if (n === DSI.length) { var I2 = new Int32Array(2 * n), D2 = new Float64Array(2 * n); I2.set(DSI); D2.set(DSD); DSI = I2; DSD = D2; DSO = new Int32Array(2 * n); }
      DSI[n] = i; DSD[n] = dd; n++;
    }
    var ex = stay - (LIVE_N[cls] || 6); if (ex <= 0 || !n) return;
    for (i = 0; i < n; i++) DSO[i] = i;
    var O = DSO; heapSort(O, DSD, n);   // (nearest first: the farthest at the end)
    var k = Math.min(n, Math.max(1, Math.ceil(0.05 * ex)));
    for (i = 0; i < k; i++) {
      var G = FLOCKS[DSI[O[n - 1 - i]]], Lg = G.lead, g = newGoal(G, 'out', G.r, cls);
      g.psi = Math.atan2(Lg.p[0] - LVC.x, Lg.p[2] - LVC.z) + (G.r() - 0.5) * 0.6; g.leave = true;
    }
  }
  /* a flock gone where no one can see it is kept, asleep: out of the lists, its wing and draw stores let go (its
     record, about a kilobyte a bird, kept), flying on its way in a straight line at its speed (worked out only when
     it wakes). Each step a 90th of the sleepers is looked at: one the eye could see again (it came nearer, or the eye
     went to it) wakes where its way has brought it, still beyond sight, over the land and the cloud, on a goal of its
     own: the world's birds are never thrown away, only let be where nothing of them shows */
  var SLEEP = [], SWK = 0, SIGHT0 = {}, SIGHTT = {};
  function sleepFlock(F, i) {
    FLOCKS.splice(i, 1); F.out = true; F.zT = t;
    for (var j = 0; j < F.m.length; j++) { var b = F.m[j], k = BIRDS.indexOf(b); if (k >= 0) BIRDS.splice(k, 1); b.s = null; b.w = null; b.wOff = true; }
    SLEEP.push(F);
  }
  function wakeStep() {
    var n = SLEEP.length; if (!n) return;
    var m = Math.ceil(n / 90), q;
    for (q = 0; q < m && SLEEP.length; q++) {
      if (SWK >= SLEEP.length) SWK = 0;
      var F = SLEEP[SWK], L = F.lead, dt = t - F.zT;
      var x = L.p[0] + L.v[0] * dt - LVC.x, y = L.p[1] + L.v[1] * dt - LVC.y, z = L.p[2] + L.v[2] * dt - LVC.z, d = Math.sqrt(x * x + y * y + z * z);
      var s0 = SIGHT0[F.kind]; if (!(s0 > 0) || t - (SIGHTT[F.kind] || -99) > 1.5) { s0 = SIGHT0[F.kind] = sightD(F.kind, LVC.y); SIGHTT[F.kind] = t; }
      if (d < 1.5 * s0 && d < 1.05 * sightD(F.kind, L.p[1] + L.v[1] * dt)) { SLEEP.splice(SWK, 1); wakeFlock(F, dt); }
      else SWK++;
    }
  }
  function wakeFlock(F, dt) {
    var L = F.lead, j, b, x = L.p[0] + L.v[0] * dt, z = L.p[2] + L.v[2] * dt, y = L.p[1] + L.v[1] * dt;
    var lift = Math.max(0, lvGround(x, z) + 30 - y, hideTop(x, z) + 30 - y);
    for (j = 0; j < F.m.length; j++) {
      b = F.m[j]; b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt + lift; b.p[2] += b.v[2] * dt; b.age += dt;
      wingOn(b); BIRDS.push(b);
    }
    F.out = false; F.far = true; F.off = false; F.acc = 0; FLOCKS.push(F);
    nextGoal(F);
  }

  /* (physics: birds/glides) a leader (or a bird on its own) glides, whatever its kind, when its way goes down steeper than
     a glide's (5 deg) for over a second, or as it banks past 15 deg rolling into a turn: 1.5-6 s, then at least 4 s on its
     wings. Its flock glides after it, each bird as it reaches the point its leader began from (its distance back over its
     speed, and its own reaction, b.lat) */
  var GLIDE_DN = -5 * DEG, GLIDE_BANK = 15 * DEG;
  /* how long its wing takes from now to glide, asked now: the rest of the beat it is in, and the ramp out (RAMP.E_OUT) */
  function toGlide(b) { var g = b.w.wing, p = BW.psiAt(g, b.age); return (1 - (p - Math.floor(p)) + 0.1 + BW.LB.RAMP.E_OUT) / Math.max(g.f, 0.5); }
  function glideWhen(F, b, wv, dt) {
    var hz = Math.sqrt(wv[0] * wv[0] + wv[2] * wv[2]), dn = Math.atan2(wv[1], Math.max(hz, 0.5)) < GLIDE_DN;
    b.dsT = dn ? b.dsT + dt : 0;
    var soar = b.soarT === t;   // (soaring: its glide asked on and on, twice a second, its flock after it)
    if (!b.w || b.wOff || b.burst || (b.flap !== 1 && !soar) || t < b.gOK) return;
    var roll = Math.abs(b.phi) > GLIDE_BANK && Math.abs(b.phi) > Math.abs(b.phi0) + 1e-4;
    if (b.dsT < 1 && !roll && !soar) return;
    var dur = soar ? 2 : pick(b.r, [1.5, 6]), t0 = t + toGlide(b); BW.glide(b.w.wing, b.age, dur); b.gOK = soar ? t + 0.5 : t + dur + 4; F.gD = dur;
    for (var j = 0; j < F.m.length; j++) { var q = F.m[j]; if (q !== b && q.st === 'fly') q.gAt = t0 + Math.max(0, q.slot[0] * b.sz) / Math.max(b.V, 3) + q.lat; }
  }

  /* ---------------- each step ---------------- */
  var FQ = [];
  /* a flock no one can see now: every bird of it flying, past the eye's reach (clearOfEye's 160 m) and out of the view by 20 degrees
     and its own breadth. It steps as a far flock does (its leader a coarse step, the rest held in their places); back
     in the margin it steps every frame again from where it is (the time it skipped is skipped: no catching up, so no
     jump), still out of the view. Seen birds cost a step a frame; the rest a step every COARSE s */
  var OFF_A = 0.35, OFF_D = 160, OTX = 1, OTY = 1, SPECK_W = 2.5, HOLD_W = 3, SPK_DT = 4 / 60;   // (SPK_DT: a speck flock's step; HOLD_W: back to a wing only from the held glide's 3 px; SPECK_W: device px; under it a drawn bird works out no wing: it holds its glide from 3 px)
  function offView(F, C) {
    var L = F.lead, i;
    for (i = 0; i < F.m.length; i++) if (F.m[i].st !== 'fly') return false;
    var rad = 2 * L.sz * (F.m.length + 1);
    for (i = 0; i < F.m.length; i++) {   // (every bird of it, not its leader alone: a straggler or a joiner may be in view while its leader is not)
      var q = F.m[i], dx = q.p[0] - C.pos[0], dy = q.p[1] - C.pos[1], dz = q.p[2] - C.pos[2];
      if (dx * dx + dy * dy + dz * dz < OFF_D * OFF_D) return false;
      var zc = dx * C.f[0] + dy * C.f[1] + dz * C.f[2], xc = dx * C.r[0] + dy * C.r[1] + dz * C.r[2], yc = dx * C.u[0] + dy * C.u[1] + dz * C.u[2];
      if (!(Math.abs(xc) - rad > zc * OTX || Math.abs(yc) - rad > zc * OTY)) return false;
    }
    return true;
  }
  function birdsStep(C, dt) {
    lvCam(C); windNow();
    for (var q = 0; q < BIRDS.length; q++) { var bq = BIRDS[q]; bq.pp[0] = bq.p[0]; bq.pp[1] = bq.p[1]; bq.pp[2] = bq.p[2]; bq.v0[0] = bq.v[0]; bq.v0[1] = bq.v[1]; bq.v0[2] = bq.v[2]; bq.phi0 = bq.phi; bq.tum0 = bq.tum; }   // (where each was as the step began: the draw goes between)
    popStep(C);
    OTX = Math.tan(Math.atan(VW.tanX || 1) + OFF_A); OTY = Math.tan(Math.atan(VW.tanY || 1) + OFF_A);
    var i, j, F, b;
    var nq = FLOCKS.length; for (i = 0; i < nq; i++) FQ[i] = FLOCKS[i];   // (a stable list: a bird taking off joins or leaves a flock mid-step; filled in place, never emptied: no new store a step)
    for (i = 0; i < nq; i++) {
      F = FQ[i]; if (!F.lead || F.out) continue;
      trailPush(F); if (F.lk) flockLocks(F);
      var L = F.lead, dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z, dd = dx * dx + dz * dz;
      F.far = !F.passage && (F.far ? dd > (0.92 * NEAR_R) * (0.92 * NEAR_R) : dd > NEAR_R * NEAR_R);   // (a passage is seen far off: it steps as specks do, never a far flock's coarse step, whose held places snap)
      var off = !F.far && !FORCED && offView(F, C);
      if (F.off && !off) { F.acc = 0; for (j = 0; j < F.m.length; j++) if (F.m[j].wOff) wingOn(F.m[j]); }
      F.off = off;
      if (off) {
        F.acc = (F.acc || 0) + dt; if (F.acc < COARSE) continue;
        var odt = F.acc; F.acc = 0;
        for (j = 0; j < F.m.length; j++) { b = F.m[j]; b.age += odt; wingOff(b); b.flap = 1; }
        var ow = goalVel(F, L, odt); flyTo(L, odt, ow[0], ow[1], ow[2]);
        for (j = 0; j < F.m.length; j++) { if (F.m[j] !== L) holdPlace(F, F.m[j]); F.m[j].stT = t; F.m[j].cs = true; }
        continue;
      }
      if (F.far) {
        F.acc = (F.acc || 0) + dt; if (F.acc < COARSE) continue;
        var cdt = F.acc; F.acc = 0;
        if (L.st === 'fly') { wingOff(L); L.flap = 1; var w = goalVel(F, L, cdt); flyTo(L, cdt, w[0], w[1], w[2]); L.age += cdt; }
        for (j = 0; j < F.m.length; j++) { b = F.m[j]; if (b === L || b.st !== 'fly') continue; holdPlace(F, b); b.age += cdt; wingOff(b); }   // (a speck that far holds its glide: its wing paused, going on from there when it is near)
        for (j = 0; j < F.m.length; j++) { F.m[j].stT = t; F.m[j].cs = true; }
        continue;
      }
      /* a flock of specks (every bird of it flying and drawn last frame under SPECK_W device px, past the eye's reach)
         steps one frame in four, a step of their time; between, the draw carries each bird on along its way
         (stT: the time of its last step), so it moves every frame, its way corrected by far under a pixel */
      var spk = !FORCED && dd > OFF_D * OFF_D;
      for (j = 0; j < F.m.length && spk; j++) { b = F.m[j]; spk = b.st === 'fly' && !b.burst && !!b.s && b.s.seenF >= DF - 1 && b.s.spanPx > 0 && b.s.spanPx < (F.spk ? HOLD_W : SPECK_W); }
      if (F.spk && !spk) F.acc = 0;
      F.spk = spk;
      if (spk) {
        F.acc += dt; if (F.acc < SPK_DT - 1e-9) continue;
        var sdt = F.acc; F.acc = 0;
        for (j = 0; j < F.m.length; j++) {
          b = F.m[j]; b.age += sdt; wingOff(b); b.flap = 1;
          var sv = b === L ? goalVel(F, b, sdt) : placeVel(F, b);
          flyTo(b, sdt, sv[0], sv[1], sv[2]); b.stT = t; b.cs = true;
        }
        continue;
      }
      for (j = 0; j < F.m.length; j++) {
        b = F.m[j]; b.age += dt; wingTrim(b); b.stT = t; b.cs = false;
        if (b.st === 'perch' || b.st === 'land') BW.ensure(b.w.wing, b.age);
        else if (b.st === 'fly' && !b.burst && b.s && b.s.seenF >= DF - 1 && b.s.spanPx > 0 && b.s.spanPx < (b.wOff ? HOLD_W : SPECK_W)) { wingOff(b); b.flap = 1; }   // (a speck holds its glide: HOLD_POSE; its wing paused till it is larger)
        else wingNow(b);
        if (b.st !== 'fly') { perchStep(b, dt, C); continue; }
        var wv = b === L ? goalVel(F, b, dt) : placeVel(F, b);
        clearOfEye(b, wv);
        if (b === L) glideWhen(F, b, wv, dt); else if (b.gAt && b.w && t + toGlide(b) >= b.gAt - 0.5 / Math.max(b.w.wing.f, 0.5)) { b.gAt = 0; if (!b.burst) BW.glide(b.w.wing, b.age, F.gD); }   // (asked as its beat takes to end, at the beat's end nearest its time: it glides from its own time)
        flyTo(b, dt, wv[0], wv[1], wv[2]);
      }
    }
  }
  function birdsClear() { while (FLOCKS.length) dropFlock(FLOCKS[0]); BIRDS.length = 0; SLEEP.length = 0; SWK = 0; POP.seeded = false; POP.k = 0; POP.passT = 60; SEAC.clear(); perchReset(); POP.r = vstream(8800); POP.cls = ''; }
  function lvG(r) { return (r() + r() + r() + r() - 2) * 1.7320508; }
  /* the land's height under a point (the world's own ground; 0 where it gives none) */
  function lvGround(x, z) { var g = HOST.ground && !FORCED ? HOST.ground(x, z) : -1e4; return g === g ? g : 0; }
  /* the camera's way: where it is and goes (m/s) */
  var LVC = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }, LVP0 = [0, 0, 0], LVT0 = -1;
  function lvCam(C) {
    if (LVT0 >= 0 && t > LVT0) { var dtc = t - LVT0, k = Math.min(1, dtc / 0.3); LVC.vx += ((C.pos[0] - LVP0[0]) / dtc - LVC.vx) * k; LVC.vy += ((C.pos[1] - LVP0[1]) / dtc - LVC.vy) * k; LVC.vz += ((C.pos[2] - LVP0[2]) / dtc - LVC.vz) * k; }
    if (Math.abs(C.pos[0] - LVC.x) + Math.abs(C.pos[2] - LVC.z) > 200) { LVC.vx = LVC.vy = LVC.vz = 0; }
    LVP0[0] = C.pos[0]; LVP0[1] = C.pos[1]; LVP0[2] = C.pos[2]; LVT0 = t;
    LVC.x = C.pos[0]; LVC.y = C.pos[1]; LVC.z = C.pos[2];
    return LVC;
  }
