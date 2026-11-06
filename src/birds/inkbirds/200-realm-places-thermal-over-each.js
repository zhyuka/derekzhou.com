  /* ---------------- the realm's places: a thermal over each ---------------- */

  /* Where a realm keeps birds about a place (its cells' bird flocks: a temple, a giant shard, an island), the ink
     birds keep a thermal by it instead: two or three storks (or gulls) circling above, one way round,
     the storks holding their wings out (the live's), the gulls gliding with a few beats now and then: fixed in the world, as the place is, so the camera comes to them and passes
     beneath. Made when the camera comes within PLACE_ON of the place (its birds then too far to be seen: they come out
     of the distance as it nears), and gone once it is beyond PLACE_OFF with none of them in view. One at a time; while
     one is seen the sky keeps one travelling flight fewer */
  var PLACE_ON = 1250, PLACE_OFF = 1400,   // (round 3: from 700 and 820, inside the distance its birds already show at)
      PLACE_MAX = 1, PLACE_UP = [35, 70];   // m; thermals at once; m over the place's own birds or the camera, whichever is higher (so the camera passes beneath them)
  var PLACE_AHEAD = 200, LATERAL = [90, 170];   // m: a place this far ahead along the way at least; its thermal this far aside of the way
  var PLACE_FAR = [0.16, 0.26];  // nearness: a thermal's birds come out of the distance between these (the travelling flights' FAR, FADE: 0.42, 0.54)
  /* the air between: a travelling flight's birds are the live's (FADE, FAR); a thermal's are seen from further off, small
     ink over the place (the camera comes to them at its own pace, and would otherwise pass them before they showed) */
  function fadeFor(F, n) { if (F.fadeS) return stageFade(F, n); return F.place ? (n >= PLACE_FAR[1] ? 1 : n <= PLACE_FAR[0] ? 0 : ease((n - PLACE_FAR[0]) / (PLACE_FAR[1] - PLACE_FAR[0]))) : fadeOf(n); }
  var PLACES = [], PLC = [], placeSeen = false, placeDone = {};
  function placeSpot(P, m, tau, o) {
    if (P.live) return liveSpot(P, m, tau, o);   // (round 3: the living sky)
    if (P.kind === 'wheel') return wheelSpot(P, m, tau, o);   // (birds3d: S2)
    var th = m.th0 + m.om * tau;
    o.x = P.cx + m.R * Math.cos(th); o.z = P.cz + m.R * Math.sin(th);
    o.y = P.cy + m.dy + 3 * Math.sin(0.5 * th + m.th0);
    return o;
  }
  function placeFlight(pl, C) {
    var r = sm32((pl.key ^ visitSeed) >>> 0), sort = r() < 0.6 ? 'stork' : 'gull', S = SORTS[sort], n = r() < 0.35 ? 3 : 2, i, m, P, T, R;
    if (freeSlots() < n) return null;
    /* where its thermal stands: between the place and the camera's way, LATERAL from the way (so it is seen ahead as the
       camera comes, and passed beside, never flown through); none for a place already passed or too close ahead */
    var dx = Math.sin(FL.psi), dz = Math.cos(FL.psi), ox = pl.x - FL.x, oz = pl.z - FL.z, sAl = ox * dx + oz * dz;
    if (sAl < PLACE_AHEAD) return null;
    var lx = ox - dx * sAl, lz = oz - dz * sAl, ld = Math.sqrt(lx * lx + lz * lz);
    if (ld < 1) { lx = dz; lz = -dx; ld = 1; }
    var lw = clamp(ld, LATERAL[0], LATERAL[1]), cx = FL.x + dx * sAl + lx / ld * lw, cz = FL.z + dz * sAl + lz / ld * lw;
    R = clamp(pl.orbit, 35, 70);
    T = Math.max(pick(r, LAP), TAU * R / 9);
    P = { place: true, kind: 'thermal', sort: sort, S: S, n: n, key: pl.key, cx: cx, cy: 0, base: pl.y, up: pick(r, PLACE_UP), cz: cz, t0: t, m: [], dur: 1e9, r: r };
    P.cy = Math.max(P.base, FL.y) + P.up;
    var sense = r() < 0.5 ? 1 : -1, f = pick(r, S.hz) * tempo;
    for (i = 0; i < n; i++) {
      m = { d: (drawBird(r, S), measureBird3D(sort, SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1)))), R: R * mix(r(), 0.85, 1.15), th0: TAU * (i + 0.3 * r()) / n, dy: (i - (n - 1) / 2) * 6,
            f: f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0 };
      m.om = sense * TAU / T;
      m.w = placeWing(sort, r); m.f = m.w.f;   // (physics: the lab's measured stork or gull)
      P.m.push(m);
    }
    if (C && seenReal(P, 0, C)) return null;              // (never made in view: they come out of the distance)
    for (i = 0, m = 0; i < slots.length && m < n; i++) if (!slots[i].busy) { slots[i].busy = true; P.m[m].s = slots[i]; dress(slots[i], P.m[m].d); m++; }
    PLACES.push(P);
    return P;
  }
  /* a thermal keeps above the camera: its storks climbing (or sinking) at most CLIMB_T m/s toward UP over the place's
     own birds or the camera's height, whichever is higher, so the camera passes beneath them (a visitor climbing faster
     comes up to them: they step aside, NEAR_FADE) */
  var CLIMB_T = 3;
  function placeLift(dt) {
    for (var i = 0; i < PLACES.length; i++) { var P = PLACES[i]; if (P.live) continue; var want = Math.max(P.base, FL.y) + P.up; P.cy += clamp(want - P.cy, -CLIMB_T * dt, CLIMB_T * dt); }
  }
  function landPlace(P) {
    P.m.forEach(function (m) { if (m.s) { hide(m.s); m.s.busy = false; m.s = null; } });
    var k = PLACES.indexOf(P); if (k >= 0) PLACES.splice(k, 1);
  }
  function placeStep(C, cover) {
    var i, P, dx, dz, seen = false;
    for (i = PLACES.length - 1; i >= 0; i--) {
      P = PLACES[i]; dx = P.cx - FL.x; dz = P.cz - FL.z;
      if (P.gone && t - P.gone > GONE_T) { landPlace(P); continue; }   // (round 3: one let go, faded out whole)
      var s = C && seenReal(P, t - P.t0, C);
      if (s) seen = true;
      if (P.stage) { if ((P.lastSeen !== undefined && t - P.lastSeen > 3 && !s) || (P.lastSeen === undefined && t - P.t0 > (P.enterT || 0) + 12)) landPlace(P); continue; }   // (birds3d: a staged wheel: once its birds are seen no more)
      if (!s && dx * dx + dz * dz > PLACE_OFF * PLACE_OFF) landPlace(P);
    }
    placeSeen = seen;
    if (PLACES.length >= PLACE_MAX || cover > 0.05 || !FL.ok) return;
    HOST.places(PLACE_ON, PLC);
    var best = null, bd = Infinity;
    for (i = 0; i < PLC.length; i++) {
      var pl = PLC[i]; if (placeDone[pl.key]) continue;
      dx = pl.x - FL.x; dz = pl.z - FL.z; var d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = pl; }
    }
    if (best && placeFlight(best, C)) placeDone[best.key] = true;
  }

