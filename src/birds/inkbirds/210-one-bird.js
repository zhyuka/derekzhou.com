  /* ================= THE ONE BIRD (docs/birds-design.md) =================
     Every bird is one record from the moment it is added to the world to the moment it is taken out: its kind, its own
     stream (from the visit's one seed), its own age (its wings' clock), where it is and how it moves in the world (m,
     m/s), its attitude (heading, climb, bank), its flock and its place in it, its goal and its state. States: 'fly'
     (alone or in a flock: its goal or its place), and the perch's ('appr', 'land', 'perch', 'off': 260). One integrator
     flies every bird that is in the air: it turns only through its bank (rate = g tan(bank) / airspeed, the bank
     leading), climbs and sinks within its kind's limits, at its kind's airspeed through the wind, never faster or
     slower. Nothing in it reads how a bird was born, or the window.

     THE WORLD KEEPS THEM. A bird lives in the world on screen and off: turning the view never adds, removes or fades
     one. Birds are added and taken out only where no one can see it happen: so far off that the world's own air leaves
     nothing of it on any pixel of the largest window (unseen()), or wholly hidden under the sea of cloud's top. The
     population is kept about the visitor in the world: so many flocks within LIVE_R, added out of the sea of cloud
     near by, out of the distance, or (at a visit's start, before its first frame) anywhere. */
  var KINDS = {   // airspeed (m/s), turn (deg/s at most), bank (deg at most), climb and dive (deg at most), roll (deg/s)
    goose:   { v: 17, w: 8, bank: 30, climb: 10, dive: 18, roll: 60 },
    ibis:    { v: 14, w: 12, bank: 30, climb: 10, dive: 18, roll: 70 },
    gull:    { v: 11, w: 25, bank: 40, climb: 14, dive: 28, roll: 110, perch: true },
    heron:   { v: 10, w: 8, bank: 25, climb: 8, dive: 16, roll: 50 },
    crow:    { v: 11, w: 22, bank: 40, climb: 14, dive: 26, roll: 110, perch: true },
    swallow: { v: 10, w: 70, bank: 55, climb: 18, dive: 30, roll: 200, perch: true },
    stork:   { v: 12, w: 12, bank: 28, climb: 8, dive: 14, roll: 50 },
    finch:   { v: 9, w: 30, bank: 40, climb: 16, dive: 26, roll: 150, perch: true }
  };
  var G = 9.81;
  var LIVE_R = 2600;           // m: the visitor's sky (the flocks within it counted) ...
  var LIVE_N = { glow: 7, blue: 7, first: 6, moon: 5, day: 8 };   // ... this many flocks in it, by the sky
  var HOME_R = 1.25 * LIVE_R;   // m: past this a bird turns home (homeStep)
  var NEAR_R = 3000;           // m: a flock nearer than this flies every bird of it each step; farther, its leader a coarse step and the rest held in their places
  var COARSE = 0.5;            // s: the far flocks' step
  var COME_D = [60, 140];      // m beside the eye's way such a flock passes
  var COME_GAP = [25, 50];     // s between flocks sent to cross the camera's way ahead (recruit)
  var CLEAR = 15;              // m: the least height over the land under a bird (the owner, 2026-11-06: never below the land)
  var SEA_DEEP = 18;           // m: a bird this far under the sea's top (and its span) is wholly hidden
  var AVOID = 14;              // m: no bird lets the eye pass nearer than this or 4 of its spans (it banks away, clearOfEye: the near plane never cuts one, nor does a bird fill the window)
  var CONTRAST = 0.4;          // the most a bird's ink differs from the sky behind it (linear): what unseen() bounds
  var UNSEEN = 0.4 / 255;      // a pixel changed by less than this is not changed
  var FDEV_MAX = 2560 * 2 / 2 / Math.tan(36 * DEG);   // device px: the largest window's focal length (2560 CSS px at 2 device px a CSS px, 72 deg across)
  var BIRDS = [], FLOCKS = [], BK = 0, POP = { r: null, nextT: 0, seeded: false, cls: '', side: 1, line: 0, k: 0, passT: 60, comeT: 0 };
  var SEAC = new Map();
  /* the cloud sea at a point (cached on a 64 m grid: the maps never change) */
  function seaAt(x, z) {
    var k = (Math.round(x / 64) + 32768) * 65536 + (Math.round(z / 64) + 32768), c = SEAC.get(k);
    if (!c) { if (SEAC.size > 4096) SEAC.clear(); c = HOST.seaAt && !FORCED ? HOST.seaAt(x, z, { w: 0, lv: 0 }) : { w: 0, lv: -1e9 }; SEAC.set(k, c); }
    return c;
  }
  /* the top of what hides a bird from below at (x, z): near the camera the drawn ground (the cloud sea's own top where
     it lies), farther the sea's raw level less a margin (the drawn top lies at or under it); -1e9 where nothing hides */
  function hideTop(x, z) {
    if (FORCED) return -1e9;
    var dx = x - LVC.x, dz = z - LVC.z, s = seaAt(x, z);
    if (dx * dx + dz * dz < 280 * 280 && HOST.groundReach && HOST.groundReach() > 0) { var g = lvGround(x, z); return s.w > 0.85 ? g : g - 1e4; }
    return s.w > 0.85 ? s.lv - 60 : -1e9;
  }
  function hidden(b) { return b.p[1] + b.sz < LVC.y - 20 && b.p[1] + b.sz < hideTop(b.p[0], b.p[2]) - SEA_DEEP; }   // (the sea lies under the eye: a bird at or over its height is never under it)
  /* the most a bird can change any pixel of the largest window, with the world's own air between (lib-air's fogAmt):
     its ink span there (at least a pixel's worth: the pen's floor), its contrast, the air's transmittance */
  function airT(dx, dy, dz) {
    var L = FORCED ? null : HOST.light(), f = L && L.fog; if (!f) return 1;
    var t = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-3, rdy = dy / t, b = f[1], k = b * rdy * t, ff = Math.abs(k) < 1e-4 ? 1 - 0.5 * k : (1 - Math.exp(-k)) / k;
    return Math.exp(-(f[0] * Math.exp(-b * (LVC.y - f[2])) * t * ff + f[3] * t));
  }
  function unseen(b) {
    var dx = b.p[0] - LVC.x, dy = b.p[1] - LVC.y, dz = b.p[2] - LVC.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 4000) return false;
    var span = b.sz / MODEL_K * FDEV_MAX / d;
    return Math.min(1, 3 * span) * CONTRAST * airT(dx, dy, dz) < UNSEEN;
  }
  /* a flock unseen or hidden, every bird of it */
  function goneUnseen(F) { for (var i = 0; i < F.m.length; i++) { var b = F.m[i]; if (b.st !== 'fly' || !(unseen(b) || hidden(b))) return false; } return true; }

  /* ---------------- a bird ---------------- */
  function newBird(kind, r, x, y, z, psi, gam, F) {
    var S = SORTS[kind] || SORTS.gull, K = KINDS[kind] || KINDS.gull;
    var b = { id: ++BK, kind: kind, S: S, K: K, r: r, age: pick(r, [0, 40]), sz: B_SPAN * S.size * MODEL_K * (1 + SIZE_VAR * (r() * 2 - 1)),
      p: [x, y, z], v: [0, 0, 0], psi: psi, gam: gam || 0, V: K.v * (0.95 + 0.1 * r()), phi: 0,
      vJ: 0.92 + 0.16 * r(), vK: Math.floor(r() * NOISE_N), lat: pick(r, [0.08, 0.25]),
      st: 'fly', F: F || null, slot: [0, 0, 0], goal: null, w: null, s: null, dq: 0, P: null,
      flap: -1, flapA: undefined, flareU: 0, burst: null, vLo: 0, vHi: 0, evT: -1, wtT: 0, wsT: -1, wOff: false, wP: 0, stT: t, pp: [x, y, z], v0: [0, 0, 0], phi0: 0, cs: false,
      WS: { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0, bank: 0, trim: 0 } };   // (every field a bird ever has, set here: one shape for every bird, so the step stays fast)
    b.w = placeWing(kind, r, b.age);
    var ch = Math.cos(b.gam);
    b.v[0] = b.V * ch * Math.sin(psi); b.v[1] = b.V * Math.sin(b.gam); b.v[2] = b.V * ch * Math.cos(psi);
    BIRDS.push(b);
    return b;
  }
  function dropBird(b) {
    if (b.P) perchFree(b);
    var i = BIRDS.indexOf(b); if (i >= 0) BIRDS.splice(i, 1);
    if (b.F) { var F = leaveFlock(b); if (!F.m.length) dropFlock(F); }
  }
  /* a bird out of its flock (its leader gone: another leads); the flock it left */
  function leaveFlock(b) { var F = b.F, j = F.m.indexOf(b); if (j >= 0) F.m.splice(j, 1); b.F = null; if (F.lead === b) relead(F); return F; }
  /* a flock record, empty */
  function flockRec(id, kind, pat, r) { return { id: id, kind: kind, pat: pat, r: r, m: [], lead: null, goal: null, t0: t, far: false, off: false, spk: false, acc: 0, out: false, tr: new Float64Array(4 * TR_N), trI: 0, trN: 0, trT: -1 }; }
  /* a bird on its own: a flock of one */
  function soloFlock(b) { var F = flockRec(++POP.k, b.kind, 'single', b.r); F.m.push(b); F.lead = b; b.F = F; FLOCKS.push(F); return F; }
  /* a place at the end of a flock's pattern (spans: back, aside, up) */
  function endPlace(F) { var n = F.m.length; return [n * 1.9, (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 1.2, 0]; }
  function dropFlock(F) { while (F.m.length) dropBird(F.m[F.m.length - 1]); var i = FLOCKS.indexOf(F); if (i >= 0) FLOCKS.splice(i, 1); F.out = true; }   // (out: no longer in FLOCKS, read in place of a search of it)
  /* a flock's leader gone (landed, left, taken out): the bird foremost in it leads, every place then measured from it */
  function relead(F) {
    if (!F.m.length) return;
    var best = F.m[0], i;
    for (i = 1; i < F.m.length; i++) if (F.m[i].slot[0] < best.slot[0]) best = F.m[i];
    var s0 = best.slot.slice();
    for (i = 0; i < F.m.length; i++) { var q = F.m[i].slot; q[0] -= s0[0]; q[1] -= s0[1]; q[2] -= s0[2]; }
    F.lead = best; if (!best.goal) best.goal = F.goal; F.trN = 0;   // (a new leader: its own way from here)
    if (F.m.length === 1) F.pat = 'single'; else if (F.m.length === 2) F.pat = 'pair';
  }

  /* ---------------- the flight: one integrator ---------------- */
  /* the bird flies toward a wanted velocity over the ground (dx, dy, dz, m/s): its heading through the air turned only
     by its bank, its climb and its airspeed eased within its kind's limits; then the wind carries it */
  function flyTo(b, dt, dx, dy, dz, vk) {
    var K = b.K, wx = WINDV[0], wz = WINDV[2];
    var ax = dx - wx, az = dz - wz, ay = dy, hz = Math.sqrt(ax * ax + az * az);
    var psiD = hz > 0.3 ? Math.atan2(ax, az) : b.psi, gamD = clamp(Math.atan2(ay, Math.max(hz, 0.5)), -K.dive * DEG, K.climb * DEG);
    var lo = b.vLo || 0.72 * K.v, hi = b.vHi || 1.45 * K.v, VD = clamp(Math.sqrt(ax * ax + ay * ay + az * az) * (vk || 1), lo, hi);   // (a landing's own range: vLo, vHi)
    /* gliding (the measured schedule's glide), the bird cannot climb: it holds its height at most, a little under */
    if (b.flap === 0 && gamD > -0.02) gamD = Math.min(gamD, -0.02 + 0.04 * Math.max(0, gamD));
    var e = angDiff(psiD, b.psi), wCmd = clamp(1.1 * e, -K.w * DEG, K.w * DEG), phiT = clamp(Math.atan(b.V * wCmd / G), -K.bank * DEG, K.bank * DEG);
    b.phi += clamp((phiT - b.phi) * Math.min(1, dt / 0.18), -K.roll * DEG * dt, K.roll * DEG * dt);
    b.psi = angDiff(b.psi + G * Math.tan(b.phi) / Math.max(b.V, 3) * dt, 0);
    b.gam += clamp((gamD - b.gam) * Math.min(1, dt / 0.7), -0.5 * dt, 0.5 * dt);
    b.V += clamp((VD - b.V) * Math.min(1, dt / 1.6), -2.5 * dt, 2 * dt);
    integrate(b, dt);
  }
  function integrate(b, dt) {
    var ch = Math.cos(b.gam), vx = b.V * ch * Math.sin(b.psi) + WINDV[0], vy = b.V * Math.sin(b.gam), vz = b.V * ch * Math.cos(b.psi) + WINDV[2];
    b.v[0] = vx; b.v[1] = vy; b.v[2] = vz;
    b.p[0] += vx * dt; b.p[1] += vy * dt; b.p[2] += vz * dt;
  }
  /* its own pace: +-8-12 % about its kind's, slowly */
  function paceOf(b) { return b.vJ * (1 + 0.06 * wave(b.vK, b.age / 9)); }
  /* the measured wing's state at the bird's age, worked out once an age (the step's, read again by the draw) */
  function wingState(b) { if (b.wOff) wingOn(b); if (b.wsT !== b.age) { BW.state(b.w.wing, b.age, b.WS); b.wsT = b.age; } return b.WS; }
  /* a bird no one could see (offView, far, a speck holding its glide) works out no wing: it flies as if beating (a
     glide cannot climb), its wing paused (wP: its age then). Back where its beat might be seen, the wing goes on from
     where it paused (its clock moved on by the time skipped: nothing to work out, nothing made); a bird that slept has
     a wing of its own made anew, begun from its age (out of sight still: no beat seen to jump) */
  function wingOff(b) { if (!b.wOff) { b.wOff = true; b.wP = b.age; } }
  function wingOn(b) {
    if (b.w) { var g = b.w.wing, d = Math.round((b.age - b.wP) / g.dt) * g.dt; if (d > 0) BW.skip(g, d); }
    else { b.w = placeWing(b.kind, b.r, b.age); b.wtT = 0; }
    b.wOff = false; b.wsT = -1;
  }
  /* its wing's history kept to the last seconds (else it grows all its life) */
  function wingTrim(b) { if (b.age > b.wtT) { BW.trim(b.w.wing, b.age - 2); b.wtT = b.age + 30; } }
  /* ... flapping 1, gliding 0: the integrator reads it */
  function wingNow(b) { b.flap = wingState(b).e > 0.5 ? 1 : 0; }
  /* (the owner, 2026-11-06: "Bank away") a bird ignores the view, but for one thing: when the eye's way
     (the camera's motion, a drag's included) would bring it within a few of its spans in the next 4 s, it notices
     (after its own latency, 80-250 ms, as a bird reads a car coming: by distance and closing speed) and turns its own
     way away, by its own bank (the integrator's: never pushed, never a lerp). It never follows the view: it only ever
     turns away from where the eye is going, and only while that threat lasts */
  function clearOfEye(b, o) {
    var rx = b.p[0] - LVC.x, ry = b.p[1] - LVC.y, rz = b.p[2] - LVC.z, d2 = rx * rx + ry * ry + rz * rz;
    if (d2 > 160 * 160) { b.evT = -1; return; }
    var vx = o[0] - LVC.vx, vy = o[1] - LVC.vy, vz = o[2] - LVC.vz, vv = vx * vx + vy * vy + vz * vz, tc = vv > 1e-3 ? clamp(-(rx * vx + ry * vy + rz * vz) / vv, 0, 4) : 0;
    var cx = rx + vx * tc, cy = ry + vy * tc, cz = rz + vz * tc, dm = Math.sqrt(cx * cx + cy * cy + cz * cz), R = Math.max(AVOID, 4 * b.sz) + b.sz;
    if (dm >= (b.evT >= 0 ? 1.6 * R : R)) { b.evT = -1; return; }   // (once turning away it keeps clear, past the threat: its goal would turn it back in)
    if (!(b.evT >= 0)) b.evT = t;
    if (t - b.evT < b.lat) return;   // (its own moment to notice)
    b.flap = 1;   // (it beats its way clear: a glide cannot climb)
    if (dm < 1e-3) { cx = -vz; cy = 0; cz = vx; dm = Math.sqrt(cx * cx + cz * cz) || 1; }
    var k = Math.max(0.6, 3 * (R - dm) / R) * b.K.v * (1 - 0.3 * tc / 4);   // (a firm turn once it has noticed: harder the nearer the miss)
    o[0] += cx / dm * k; o[1] += cy / dm * k; o[2] += cz / dm * k;
  }

  /* ---------------- goals (what a bird in the air is doing) ---------------- */
  /* commute: a bearing and a height, wandering; wheel: round a centre (a place's or a patch of air), drifting
     downwind and climbing a little; loiter: about a home; sink: down into the sea of cloud; out: climbing away into
     the distance; pass: by the eye, near (rare). Each ends in another, drawn from the bird's own stream */
  var GOALS = {
    glow: [['commute', 50], ['wheel', 14], ['loiter', 20], ['sink', 8], ['out', 8]], blue: [['commute', 55], ['wheel', 12], ['loiter', 18], ['sink', 8], ['out', 7]],
    first: [['commute', 55], ['wheel', 12], ['loiter', 20], ['sink', 8], ['out', 5]], moon: [['commute', 60], ['loiter', 20], ['sink', 10], ['out', 10]],
    day: [['commute', 40], ['wheel', 20], ['loiter', 22], ['sink', 10], ['out', 8]] };
  var PASS_GAP = [120, 300], PASS_D = [30, 70];   // s between the near passes (at most one, and rare); m beside the eye
  var PLQ = [];
  /* a near pass flown: the next not before PASS_GAP */
  function passTaken(r) { POP.passT = t + pick(r, PASS_GAP); }
  function newGoal(F, kind, r, cls) {
    var Lb = F.lead, x = Lb.p[0], z = Lb.p[2], g = { k: kind, t0: t, T: 0, psi: Lb.psi, y: Lb.p[1], cx: x, cz: z, R: 0, sense: r() < 0.5 ? 1 : -1, eh: 0, ec: 0, d: 0, place: false, home: false, come: false, leave: false };
    var eye = LVC.y, gr = lvGround(x, z), top = Math.max(hideTop(x, z), gr);
    if (kind === 'commute') {
      g.psi = r() < 0.6 ? POP.line + (r() < 0.65 ? 0 : Math.PI) + (r() - 0.5) * 0.9 : TAU * r();
      g.y = Math.max(top + 25, eye + mix(r(), -40, 90)); g.T = pick(r, [40, 120]);
    } else if (kind === 'wheel') {
      HOST.places && HOST.places(1500, PLQ);
      var pl = null, i; for (i = 0; i < PLQ.length; i++) { var q = PLQ[i], ddx = q.x - x, ddz = q.z - z; if (ddx * ddx + ddz * ddz < 1200 * 1200 && (!pl || r() < 0.5)) pl = q; }
      if (pl) { g.cx = pl.x; g.cz = pl.z; g.R = clamp(pl.orbit || 40, 22, 90); g.y = Math.max(pl.y + 20, top + 30); g.place = true; }
      else { g.R = mix(r(), 30, 80); g.cx = x + g.R * Math.cos(Lb.psi) * g.sense; g.cz = z - g.R * Math.sin(Lb.psi) * g.sense; g.y = Math.max(top + 30, eye + mix(r(), -10, 70)); }
      g.T = (TAU * g.R / Lb.K.v) * pick(r, [1.5, 3.5]);
    } else if (kind === 'loiter') { g.R = mix(r(), 120, 320); g.y = Math.max(top + 15, eye + mix(r(), -30, 40)); g.T = pick(r, [40, 90]); }
    else if (kind === 'sink') {
      var s = seaAt(x, z);
      g.y = Math.min(hideTop(x, z), s.lv - 60) - SEA_DEEP - 2 * Lb.sz - 10; g.T = 90;   // (under both the near top and the far margin: hidden as it drifts either side of the ground grid)
      if (s.w < 0.85 || !sinkWay(g, x, z, Lb.p[1] - g.y, Lb.psi)) return newGoal(F, 'commute', r, cls);   // (no sea of cloud under it, or too little for the way down: on)
    } else if (kind === 'out') { g.psi = TAU * r(); g.y = eye + mix(r(), 120, 300); g.T = 600; }
    else if (kind === 'pass') { g.T = 40; g.d = pick(r, PASS_D) * (r() < 0.5 ? 1 : -1); g.y = eye + mix(r(), 10, 28); }   // (over the eye a little: seen from below its M shows; at the eye's height it is a line)
    F.goal = g; Lb.goal = g;
    return g;
  }
  function nextGoal(F) {
    var r = F.r, cls = skyCls(), k = weighted(r, GOALS[cls] || GOALS.day);
    if ((k === 'wheel' && !(F.kind === 'gull' || F.kind === 'stork' || F.kind === 'crow')) || (k === 'loiter' && F.kind === 'goose')) k = 'commute';
    if (k === 'commute' && t > POP.passT && F.kind !== 'goose' && F.m.length <= 2 && r() < 0.25) { k = 'pass'; passTaken(r); }
    return newGoal(F, k, r, cls);
  }
  /* a sink's way: the heading of the longest run of the sea of cloud (16 tried; 60 m to each side too, past the sea's
     64 m samples). It must last the whole way down, `drop` m at a glide of 12 deg or steeper, and 100 m more: else no
     sink (past the sea's edge, still under its top, a bird would be inside the land). Of the ways long enough, the one
     nearest its own heading: it goes down only gently while it turns */
  function sinkWay(g, x, z, drop, psi) {
    var need = Math.max(drop, 0) / 0.21 + 100, n = Math.ceil(need / 48), bh = 0, bt = Infinity, i, k;
    for (i = 0; i < 16; i++) {
      var a = i * TAU / 16, ax = Math.sin(a), az = Math.cos(a), turn = Math.abs(angDiff(a, psi));
      if (turn >= bt) continue;
      for (k = 1; k <= n; k++) { var px = x + ax * 48 * k, pz = z + az * 48 * k; if (!(seaAt(px, pz).w > 0.85 && seaAt(px + az * 60, pz - ax * 60).w > 0.85 && seaAt(px - az * 60, pz + ax * 60).w > 0.85)) break; }
      if (k > n) { bt = turn; bh = a; }
    }
    if (bt === Infinity) return false;
    g.psi = bh; return true;
  }
  /* never under the land below it and 15 m (the land here and 2 s on), nor, landing, under its perch's own height:
     the climb that wanted vertical speed dy needs (m/s) */
  function floorUp(b, dy, v, top) {
    var x = b.p[0], z = b.p[2], fl = Math.min(Math.max(lvGround(x, z), lvGround(x + b.v[0] * 2, z + b.v[2] * 2)) + CLEAR + b.sz, top);
    return b.p[1] < fl + 10 ? Math.max(dy, clamp(0.4 * (fl + 10 - b.p[1]), 0, v * 0.35)) : dy;
  }
  /* the leader's wanted velocity for its goal (m/s over the ground, before the wind) */
  var WV = [0, 0, 0];
  function goalVel(F, b, dt) {
    var g = F.goal || nextGoal(F), r = F.r, v = b.K.v * paceOf(b), x = b.p[0], z = b.p[2], h = g.psi;
    g.eh += -g.eh * dt / 8 + 9 * DEG * Math.sqrt(2 * dt / 8) * lvG(r);
    g.ec += -g.ec * dt / 6 + 2 * DEG * Math.sqrt(2 * dt / 6) * lvG(r);
    if (g.k === 'wheel') {
      g.cx += WINDV[0] * dt * 0.7; g.cz += WINDV[2] * dt * 0.7; g.y += 0.4 * dt;
      var rx = x - g.cx, rz = z - g.cz, rr = Math.sqrt(rx * rx + rz * rz) || 1, ph = Math.atan2(rx, rz);
      h = ph + g.sense * Math.PI / 2 - g.sense * clamp(1.2 * (rr - g.R) / g.R, -0.7, 0.7);
    } else if (g.k === 'loiter') {
      var hx = g.cx - x, hz = g.cz - z, hd = Math.sqrt(hx * hx + hz * hz);
      if (hd > g.R) g.psi = Math.atan2(hx, hz); else if (r() < 0.003) g.psi += (r() * 2 - 1) * 1.2;
      h = g.psi + g.eh;
    } else if (g.k === 'pass') {
      /* by the eye: aimed beside where the eye will be, then on (its goal done once it is past) */
      var ex = LVC.x + LVC.vx * 4, ez = LVC.z + LVC.vz * 4, cs = Math.sqrt(LVC.vx * LVC.vx + LVC.vz * LVC.vz) || 1;
      ex += -LVC.vz / cs * g.d; ez += LVC.vx / cs * g.d;
      var qx = ex - x, qz = ez - z; h = Math.atan2(qx, qz);
      if (qx * qx + qz * qz < 30 * 30 || t - g.t0 > g.T) { g.k = 'commute'; g.psi = b.psi; g.T = 60; g.t0 = t; }
    } else h = g.psi + g.eh;
    var ch = Math.cos(h), sh = Math.sin(h), dy = clamp(0.12 * (g.y - b.p[1]), -v * 0.4, v * 0.25) + v * g.ec;
    if (g.k === 'sink') {   // (its depth under the cloud's top where it is now: the top rises and falls under it)
      var sk = seaAt(x, z); if (sk.w > 0.85) g.y = Math.min(hideTop(x, z), sk.lv - 60) - SEA_DEEP - 2 * b.sz - 10;
      dy = Math.min(clamp(0.12 * (g.y - b.p[1]), -v * 0.4, v * 0.25), -v * Math.sin(10 * DEG));
      if (Math.abs(angDiff(h, b.psi)) > 30 * DEG) dy = Math.max(dy, -v * Math.sin(4 * DEG));   // (gently, until it is on its way over the sea)
    }
    /* never under the land below it and 15 m (the land here and 2 s on): only into the sea of cloud, going down into it */
    if (!(g.k === 'sink' && seaAt(x, z).w > 0.85)) dy = floorUp(b, dy, v, Infinity);
    WV[0] = v * sh; WV[1] = dy; WV[2] = v * ch;
    if (t - g.t0 > g.T && g.k !== 'out' && g.k !== 'sink') nextGoal(F);   // (a sink is never given up: under the cloud it is only ever taken out)
    return WV;
  }
  /* the leader's way (physics: birds/turning; a turn's wave, equal-radius turns): a ring of where it was and its heading,
     every TR_DT s for TR_N of them (8 s). A member's place is on that way a lag behind (the turn reaching it at c, 1.5
     times its speed in a skein or a line, 2.5 in a loose flock), then back along the way and aside by its place: so it
     turns where its leader turned, on the same radius, never swung round the leader as a rigid frame */
  var TR_DT = 0.1, TR_N = 80, TP = [0, 0, 0, 0];
  function trailPush(F) {
    var L = F.lead; if (F.trN && t - F.trT < TR_DT - 1e-9) return;
    var o = 4 * F.trI; F.tr[o] = L.p[0]; F.tr[o + 1] = L.p[1]; F.tr[o + 2] = L.p[2]; F.tr[o + 3] = L.psi;
    F.trI = (F.trI + 1) % TR_N; if (F.trN < TR_N) F.trN++; F.trT = t;
  }
  /* where the leader was tau s ago (x, y, z, heading), between the ring's samples and where it is now; false past the ring */
  function trailAt(F, tau, o) {
    var L = F.lead, d0 = t - F.trT, a, f, i0, i1, k;
    if (!F.trN || tau <= 0) { o[0] = L.p[0]; o[1] = L.p[1]; o[2] = L.p[2]; o[3] = L.psi; return true; }
    if (tau <= d0) { f = d0 > 0 ? tau / d0 : 0; i1 = 4 * ((F.trI + TR_N - 1) % TR_N); for (k = 0; k < 3; k++) o[k] = L.p[k] + (F.tr[i1 + k] - L.p[k]) * f; o[3] = L.psi + angDiff(F.tr[i1 + 3], L.psi) * f; return true; }
    a = (tau - d0) / TR_DT; var j = Math.floor(a); f = a - j; if (j + 1 >= F.trN) return false;
    i0 = 4 * ((F.trI + TR_N - 1 - j) % TR_N); i1 = 4 * ((F.trI + TR_N - 2 - j) % TR_N);
    for (k = 0; k < 3; k++) o[k] = F.tr[i0 + k] + (F.tr[i1 + k] - F.tr[i0 + k]) * f;
    o[3] = F.tr[i0 + 3] + angDiff(F.tr[i1 + 3], F.tr[i0 + 3]) * f; return true;
  }
  /* a member's place now (x, y, z, heading, in TP and its heading's sin and cos): on its leader's way, or (no way that far
     back yet) in its leader's frame */
  function slotAt(F, b, back, side, up) {
    var L = F.lead, c = (F.pat === 'skein' || F.pat === 'line' ? 1.5 : 2.5) * b.K.v, tau = back > 0 ? back / c : 0, V = Math.sqrt(L.v[0] * L.v[0] + L.v[2] * L.v[2]);
    if (!(tau < TR_N * TR_DT - 0.2 && trailAt(F, tau, TP))) { TP[0] = L.p[0]; TP[1] = L.p[1]; TP[2] = L.p[2]; TP[3] = L.psi; tau = 0; }
    var h = TP[3], ch = Math.cos(h), sh = Math.sin(h), rem = back - V * tau;
    TP[0] += -rem * sh + side * ch; TP[2] += -rem * ch - side * sh; TP[1] += up; return h;
  }
  /* a member's wanted velocity: its leader's, as it was where its place is, and on toward its place (behind, aside, up: in
     spans), drifting about it */
  var MV = [0, 0, 0];
  function placeVel(F, b) {
    var L = F.lead, sp = L.sz, q = b.slot;
    var dl = 0.18 * sp * wave(b.vK + 11, b.age / 6.5), da = 0.3 * sp * wave(b.vK + 53, b.age / 8.3), du = 0.22 * sp * wave(b.vK + 97, b.age / 7.1);
    var back = q[0] * sp + dl, side = q[1] * sp + da, up = q[2] * sp + du, h = slotAt(F, b, back, side, up), V = Math.sqrt(L.v[0] * L.v[0] + L.v[2] * L.v[2]);
    var ex = TP[0] - b.p[0], ey = TP[1] - b.p[1], ez = TP[2] - b.p[2], k = 0.45, cap = 0.1 * b.K.v;
    var cx = clamp(k * ex, -cap, cap), cy = clamp(k * ey, -cap, cap), cz = clamp(k * ez, -cap, cap);
    MV[0] = V * Math.sin(h) + cx; MV[1] = L.v[1] + cy; MV[2] = V * Math.cos(h) + cz;
    if (!(F.goal && F.goal.k === 'sink' && seaAt(b.p[0], b.p[2]).w > 0.85)) MV[1] = floorUp(b, MV[1], b.K.v, Infinity);   // (its place never under the land: as its leader's)
    return MV;
  }
  /* held in its place (a far flock's coarse step): exactly where its place is, at its leader's motion */
  function holdPlace(F, b) {
    var L = F.lead, sp = L.sz, q = b.slot, h = slotAt(F, b, q[0] * sp, q[1] * sp, q[2] * sp), V = Math.sqrt(L.v[0] * L.v[0] + L.v[2] * L.v[2]);
    b.p[0] = TP[0]; b.p[1] = TP[1]; b.p[2] = TP[2];
    b.v[0] = V * Math.sin(h); b.v[1] = L.v[1]; b.v[2] = V * Math.cos(h); b.psi = h; b.gam = L.gam; b.V = L.V; b.phi = L.phi;
  }

