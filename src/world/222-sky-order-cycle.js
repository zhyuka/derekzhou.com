  /* ---- the order (the live's pushSky and nextSky, on the world's streams) */
  function skyInit(V) {
    SKY.V = V; SKY.seed = J.seed; SKY.hour = HOUR; SKY.sets = {}; SKY.seq = []; SKY.visits = {}; SKY.i = -1; SKY.pair = ''; SKY.e = null; SKY.X = null; SKY.Y = null;
    SKY.rO = RNG(subseed(J.seed, 41)); SKY.rV = RNG(subseed(J.seed, 42));
    SKY.dt = DEVMODE && OPT.skyDt !== null && isFinite(+OPT.skyDt) ? +OPT.skyDt : 0;   // (dev: the cycle's clock this far ahead of the flight's)
    SKY.ids = Object.keys(WSKY).filter(function (id) { return WSKY[id].ph <= SKY_PHASE; });
    SKY.land = {};
    SKY.ids.forEach(function (id) { (WSKY[id].land || []).forEach(function (h) { (SKY.land[h] = SKY.land[h] || []).push(id); }); });   // (a sky lands on the hours it lists)
    SKY.baseLab = []; for (var s = 0; s < 24; s++) SKY.baseLab.push(labA([V.paramsBase[s * 4], V.paramsBase[s * 4 + 1], V.paramsBase[s * 4 + 2]]));
    SKY.sheenLab = labA(scl([V.paramsBase[32], V.paramsBase[33], V.paramsBase[34]], 1 / 0.3));
    var g = /** @type {any} */ (SKY.land[HOUR] ? HOUR : 'day'), at = parseFloat(attr('data-sky-at'));   // (the hour's script writes it at load)
    if (!(at >= 0 && at <= 1)) at = 0.5;
    var open = DEVMODE && OPT.skyScene && WSKY[OPT.skyScene] && SKY.ids.indexOf(OPT.skyScene) >= 0 ? OPT.skyScene : null;
    if (!open) open = SKY.land[g][Math.floor(SKY.rO.f() * SKY.land[g].length)];
    skyPush(open);
    SKY.seq[0].at = -SKY.seq[0].hold * at * 0.9;
    SKY.landing = { hour: HOUR, group: g, at: at, sky: open };
    SKY.moonSide = SKY.rV.sign();   // (the visit's own: the moon's side of the key light)
    SKY.moonDir = RNG(subseed(J.seed, 79)).sign();   // (the visit's own way the moon crosses the window, one way, from its own stream: the other draws stay as they are)
    /* (phase 2) the visit's own: the galaxy's lie (the live's: of 24 poles drawn, the one whose band crosses most of the
       landing's view low, its core the lowest point of the band there), the aurora's arc's centre and base */
    var h0 = airHeading0(), fw = [Math.sin(h0), 0, Math.cos(h0)], best = null, bn = -1, i, j;
    for (i = 0; i < 24; i++) {
      var P = dirAzEl(SKY.rV.r(-180, 180), SKY.rV.r(15, 60)), U = norm(cross(P, [0, 1, 0])), W = cross(P, U), nn = 0, lo = 99, core = null;
      for (j = 0; j < 90; j++) { var a = j / 90 * 2 * PI, g = /** @type {any} */ ([U[0] * Math.cos(a) + W[0] * Math.sin(a), U[1] * Math.cos(a) + W[1] * Math.sin(a), U[2] * Math.cos(a) + W[2] * Math.sin(a)]), e = Math.asin(clamp(g[1], -1, 1)) / DEG;
        if (dot(g, fw) > 0.85 && e > 4 && e < 34) { nn++; if (e < lo) { lo = e; core = g; } } }
      if (nn > bn) { bn = nn; best = { pole: P, core: core || U }; }
    }
    SKY.gal = best; SKY.aur = { ph: (SKY.rV.f(), V.light ? Math.atan2(keyAt(V)[0], keyAt(V)[2]) : 0), fp: 5 + 3 * SKY.rV.f() };   // (physics: aurora/geometry: the sheet toward the aurora sky's key, so its light on the world comes from it; the same draws)
    /* (physics: aurora/phases) the stay's own, after the draws above (they stay as they are): a breakup in half the
       stays, its front 20-40 deg east of centre as it begins, a second arc in half, 150-300 km beyond the first */
    SKY.aur.bk = SKY.rV.f() < 0.5 ? 1 : 0; SKY.aur.f0 = SKY.rV.r(20, 40); SKY.aur.dD = SKY.rV.f() < 0.5 ? SKY.rV.r(150, 300) : 0; SKY.aur.rise = 0; SKY.aur.p = 0; SKY.aur.sf = 0;
    SKY.gen++;
  }
  function skyPush(id) {
    var S = WSKY[id], seq = SKY.seq, prev = seq[seq.length - 1], r = SKY.rO;
    SKY.visits[id] = (SKY.visits[id] || 0) + 1;
    seq.push({ id: id, at: prev ? prev.at + prev.hold + prev.move : 0, hold: S.hold * (0.9 + 0.25 * r.f()), move: 55 + 5 * r.f(), far: false, n: seq.length });
  }
  /* (the cut) the order after the skies on screen drawn again from the visit's own read: the one on show and, in a
     change, the one it changes into are kept; the rest are taken back and drawn again from the new stream */
  function skyReseed(seed) {
    var seq = SKY.seq, keep = Math.max(1, SKY.i + (SKY.k > 0 ? 2 : 1)), j;
    SKY.rO = RNG(subseed(seed, 41));
    for (j = seq.length - 1; j >= keep; j--) { SKY.visits[seq[j].id]--; seq.pop(); }
    seq[seq.length - 1].way = null; seq[seq.length - 1].far = false;
  }
  function skyNext() {
    var seq = SKY.seq, last = seq[seq.length - 1], r = SKY.rO, recent = [], c = [], w = [], sum = 0, i, x, id;
    for (i = Math.max(0, seq.length - Math.min(SKY_RECENT, SKY.ids.length - 2)); i < seq.length; i++) recent.push(seq[i].id);   // (of four skies never the last two, so the order is never a fixed round)
    var far = r.f() < SKY_FAR, pool = far ? SKY.ids : WSKY[last.id].near;
    for (i = 0; i < pool.length; i++) if (SKY.ids.indexOf(pool[i]) >= 0 && recent.indexOf(pool[i]) < 0) c.push(pool[i]);
    if (!c.length) for (i = 0; i < SKY.ids.length; i++) if (SKY.ids[i] !== last.id) c.push(SKY.ids[i]);
    for (i = 0; i < c.length; i++) { var v = 1 / (1 + 2 * (SKY.visits[c[i]] || 0)); w.push(v); sum += v; }   // (every sky's words are light: no streak of one kind of words to break)
    x = r.f() * sum;
    for (i = 0; i < c.length - 1 && x >= w[i]; i++) x -= w[i];
    id = c[i];
    if (DEVMODE && seq.length === 1 && OPT.skyNext && SKY.ids.indexOf(OPT.skyNext) >= 0 && OPT.skyNext !== last.id) id = OPT.skyNext;   // (dev: the first change's sky forced)
    last.far = WSKY[last.id].near.indexOf(id) < 0;
    skyPush(id);
  }
  /* ---- the cycle at t: the change under way (or the hold), its waypoint, the two sets on show and the two clocks */
  function skyAt(t) {
    var seq = SKY.seq, i;
    while (seq[seq.length - 1].at < t + 30) skyNext();
    i = seq.length - 2;
    while (i > 0 && seq[i].at > t) i--;
    var e = seq[i], A = skyObj(e.id), B = skyObj(seq[i + 1].id), k = clamp((t - e.at - e.hold) / e.move, 0, 1);
    var X, Y, q, x, half = 0;
    if (e.far) {   // (through the mist: each half of the change from a sky to the waypoint or from it to the next)
      var C = e.way || (e.way = skyWay(e.id, seq[i + 1].id, e.far));   // (found once a change: no key built a frame)
      half = k < 0.5 ? 0 : 1;
      x = half ? 2 * k - 1 : 2 * k;
      X = half ? C : A; Y = half ? B : C;
    } else { X = A; Y = B; x = k; }
    q = ss01(x);   // (the light's clock and the structure's are one: no change crosses a band of the words' inks)
    SKY.i = i; SKY.e = e; SKY.A = A; SKY.B = B; SKY.k = k; SKY.x = x; SKY.half = half; SKY.far = e.far;
    if (X !== SKY.X || Y !== SKY.Y) { SKY.pair = X.id + '|' + Y.id; SKY.X = X; SKY.Y = Y; SKY.gen++; }
    SKY.q = q;
    SKYI.id = e.n; SKYI.k = k;
    SKYI.words = k < 0.5 ? A.w : B.w; SKYI.sky = A.id; SKYI.next = B.id; SKYI.group = (k < 0.5 ? A : B).g;
    skyAur(t);
  }
  /* (physics: aurora/phases, no fades: what shows changes only because the sheet moves) the aurora's own clock over its
     stay, from the change that brings it to the end of the one that takes it (its amount 1 throughout, through the
     mist too): it rises (D 1950 -> 650) over AUR_IN s from that change's start, drifts over the hold (D 650 -> 500)
     and sinks (500 -> 1950) over AUR_OUT s to that change's end, each eased: 11.9 and 15.2 deg at 1.5 / AUR_IN and
     1.5 / AUR_OUT a second at most, under 0.3 deg/s; the breakup's front (km along the sheet) from 20-40 deg east of
     centre (at D 650) west at 2.2 km/s, from that change's start (a landing on the aurora: as if it came 60 s before
     its hold) */
  var AUR_IN = 64, AUR_OUT = 80, AUR_FRONT = 2.2;
  function skyAur(t) {
    var seq = SKY.seq, i = SKY.i, A = SKY.aur, au = function (n) { var f = WSKY[seq[n].id].fx; return !!(f && f.aurora > 0); };
    var j = au(i) ? i : au(i + 1) ? i + 1 : -1;
    if (j < 0) { A.rise = 0; A.p = 0; A.sf = 0; return; }
    var e = seq[j], t0 = j > 0 ? seq[j - 1].at + seq[j - 1].hold : -1e9, t1 = e.at + e.hold + e.move, tf = j > 0 ? t0 : e.at - 60;
    A.rise = Math.min(ss01(clamp((t - t0) / AUR_IN, 0, 1)), ss01(clamp((t1 - t) / AUR_OUT, 0, 1)));
    var ta = j > 0 ? t0 + AUR_IN : e.at, tb = t1 - AUR_OUT;
    A.p = clamp((t - ta) / Math.max(tb - ta, 1), 0, 1);
    A.sf = 650 * Math.tan(A.f0 * DEG) - AUR_FRONT * (t - tf);
  }
  /* from one direction to another (the live's arc: over the top where they face apart) */
  function skyArc(a, b, k, out) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], m0 = a[0] + (b[0] - a[0]) * k, m1 = a[1] + (b[1] - a[1]) * k + Math.max(0, -d) * Math.sin(PI * k) * 0.6, m2 = a[2] + (b[2] - a[2]) * k;
    var n = Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2) || 1; out[0] = m0 / n; out[1] = m1 / n; out[2] = m2 / n; return out;
  }
