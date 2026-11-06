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
  var AVOID = 14;              // m: no bird lets the eye pass nearer than this or 4 of its spans (it banks away: B17; the near plane never cuts one, nor does a bird fill the window)
  var CONTRAST = 0.4;          // the most a bird's ink differs from the sky behind it (linear): what unseen() bounds
  var UNSEEN = 0.4 / 255;      // a pixel changed by less than this is not changed
  var FDEV_MAX = 2560 * 2 / 2 / Math.tan(36 * DEG);   // device px: the largest window's focal length (2560 CSS px at 2 device px a CSS px, 72 deg across)
  var BIRDS = [], FLOCKS = [], BK = 0, POP = { r: null, nextT: 0, seeded: false, cls: '', side: 1, line: 0 };
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
  var FOGQ = [0, 0, 0, 0];
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
      p: [x, y, z], v: [0, 0, 0], a: [0, 0, 0], psi: psi, gam: gam || 0, V: K.v * (0.95 + 0.1 * r()), phi: 0,
      vJ: 0.92 + 0.16 * r(), vK: Math.floor(r() * NOISE_N), lat: pick(r, [0.08, 0.25]),
      st: 'fly', F: F || null, slot: [0, 0, 0], goal: null, think: 0, w: null, s: null, d: null, P: null,
      wf: 0, flap: -1, seen: 0, wtT: 0, WS: { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 }, wsT: -1 };
    b.w = placeWing(kind, r, b.age);
    var ch = Math.cos(b.gam);
    b.v[0] = b.V * ch * Math.sin(psi); b.v[1] = b.V * Math.sin(b.gam); b.v[2] = b.V * ch * Math.cos(psi);
    BIRDS.push(b);
    return b;
  }
  function dropBird(b) {
    if (b.s) { b.s.busy = false; b.s = null; }
    if (b.P) perchFree(b);
    var i = BIRDS.indexOf(b); if (i >= 0) BIRDS.splice(i, 1);
    if (b.F) { var F = b.F, j = F.m.indexOf(b); if (j >= 0) F.m.splice(j, 1); b.F = null; if (F.lead === b) relead(F); if (!F.m.length) dropFlock(F); }
  }
  function dropFlock(F) { while (F.m.length) dropBird(F.m[F.m.length - 1]); var i = FLOCKS.indexOf(F); if (i >= 0) FLOCKS.splice(i, 1); }
  /* a flock's leader gone (landed, left, taken out): the bird foremost in it leads, every place then measured from it */
  function relead(F) {
    if (!F.m.length) return;
    var best = F.m[0], i;
    for (i = 1; i < F.m.length; i++) if (F.m[i].slot[0] < best.slot[0]) best = F.m[i];
    var s0 = best.slot.slice();
    for (i = 0; i < F.m.length; i++) { var q = F.m[i].slot; q[0] -= s0[0]; q[1] -= s0[1]; q[2] -= s0[2]; }
    F.lead = best; if (!best.goal) best.goal = F.goal;
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
    var k = Math.min(1, dt / 0.15);
    b.a[0] += ((vx - b.v[0]) / dt - b.a[0]) * k; b.a[1] += ((vy - b.v[1]) / dt - b.a[1]) * k; b.a[2] += ((vz - b.v[2]) / dt - b.a[2]) * k;
    b.v[0] = vx; b.v[1] = vy; b.v[2] = vz;
    b.p[0] += vx * dt; b.p[1] += vy * dt; b.p[2] += vz * dt;
  }
  /* its own pace: +-8-12 % about its kind's, slowly */
  function paceOf(b) { return b.vJ * (1 + 0.06 * wave(b.vK, b.age / 9)); }
  /* the measured wing's state at the bird's age, worked out once an age (the step's, read again by the draw) */
  function wingState(b) { if (b.wsT !== b.age) { BW.state(b.w.wing, b.age, b.WS); b.wsT = b.age; } return b.WS; }
  /* its wing's history kept to the last seconds (else it grows all its life) */
  function wingTrim(b) { if (b.age > b.wtT) { BW.trim(b.w.wing, b.age - 2); b.wtT = b.age + 30; } }
  /* ... flapping 1, gliding 0: the integrator reads it */
  function wingNow(b) { b.flap = wingState(b).e > 0.5 ? 1 : 0; }
  /* (B17, the owner's choice 2026-11-06: "Bank away") a bird ignores the view, but for one thing: when the eye's way
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
    if (dm < 1e-3) { cx = -vz; cy = 0; cz = vx; dm = Math.sqrt(cx * cx + cz * cz) || 1; }
    var k = Math.max(0.6, 3 * (R - dm) / R) * b.K.v * (1 - 0.3 * tc / 4);   // (a firm turn once it has noticed: harder the nearer the miss)
    o[0] += cx / dm * k; o[1] += cy / dm * k; o[2] += cz / dm * k;
    STATS.evades = (STATS.evades || 0) + (b.evN === b.evT ? 0 : 1); b.evN = b.evT;
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
  function newGoal(F, kind, r, cls) {
    var Lb = F.lead, x = Lb.p[0], z = Lb.p[2], g = { k: kind, t0: t, T: 0, psi: Lb.psi, y: Lb.p[1], cx: x, cz: z, R: 0, sense: r() < 0.5 ? 1 : -1, eh: 0, ec: 0 };
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
      if (s.w < 0.85) return newGoal(F, 'commute', r, cls);   // (no sea of cloud under it: on)
      g.y = hideTop(x, z) - SEA_DEEP - 2 * Lb.sz - 10; g.T = 90;
    } else if (kind === 'out') { g.psi = TAU * r(); g.y = eye + mix(r(), 120, 300); g.T = 600; }
    else if (kind === 'pass') { g.T = 40; g.d = pick(r, PASS_D) * (r() < 0.5 ? 1 : -1); g.y = eye + mix(r(), 10, 28); }   // (over the eye a little: seen from below its M shows; at the eye's height it is a line)
    F.goal = g; Lb.goal = g;
    return g;
  }
  function nextGoal(F) {
    var r = F.r, cls = skyCls(), k = weighted(r, GOALS[cls] || GOALS.day);
    if ((k === 'wheel' && !(F.kind === 'gull' || F.kind === 'stork' || F.kind === 'crow')) || (k === 'loiter' && F.kind === 'goose')) k = 'commute';
    if (k === 'commute' && t > POP.passT && F.kind !== 'goose' && F.m.length <= 2 && r() < 0.25) { k = 'pass'; POP.passT = t + pick(r, PASS_GAP); }
    return newGoal(F, k, r, cls);
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
    if (g.k === 'sink') dy = Math.min(dy, -v * Math.sin(10 * DEG));
    /* never under the land below it and 15 m (the land here and 2 s on): only into the sea of cloud, going down into it */
    if (!(g.k === 'sink' && seaAt(x, z).w > 0.85)) {
      var fl = Math.max(lvGround(x, z), lvGround(x + b.v[0] * 2, z + b.v[2] * 2)) + CLEAR + b.sz;
      if (b.p[1] < fl + 10) dy = Math.max(dy, clamp(0.4 * (fl + 10 - b.p[1]), 0, v * 0.35));
    }
    WV[0] = v * sh; WV[1] = dy; WV[2] = v * ch;
    if (t - g.t0 > g.T && g.k !== 'out') nextGoal(F);
    return WV;
  }
  /* a member's wanted velocity: its leader's, and on toward its place (behind, aside, up: in spans), drifting about it */
  var MV = [0, 0, 0];
  function placeVel(F, b) {
    var L = F.lead, h = L.psi, ch = Math.cos(h), sh = Math.sin(h), sp = L.sz, q = b.slot;
    var dl = 0.18 * sp * wave(b.vK + 11, b.age / 6.5), da = 0.3 * sp * wave(b.vK + 53, b.age / 8.3), du = 0.22 * sp * wave(b.vK + 97, b.age / 7.1);
    var back = q[0] * sp + dl, side = q[1] * sp + da, up = q[2] * sp + du;
    var tx = L.p[0] - back * sh + side * ch, tz = L.p[2] - back * ch - side * sh, ty = L.p[1] + up;
    var ex = tx - b.p[0], ey = ty - b.p[1], ez = tz - b.p[2], k = 0.45, cap = 0.35 * b.K.v;
    var cx = clamp(k * ex, -cap, cap), cy = clamp(k * ey, -cap, cap), cz = clamp(k * ez, -cap, cap);
    MV[0] = L.v[0] + cx; MV[1] = L.v[1] + cy; MV[2] = L.v[2] + cz;
    return MV;
  }
  /* held in its place (a far flock's coarse step): exactly where its place is, at its leader's motion */
  function holdPlace(F, b) {
    var L = F.lead, h = L.psi, ch = Math.cos(h), sh = Math.sin(h), sp = L.sz, q = b.slot;
    b.p[0] = L.p[0] - q[0] * sp * sh + q[1] * sp * ch; b.p[2] = L.p[2] - q[0] * sp * ch - q[1] * sp * sh; b.p[1] = L.p[1] + q[2] * sp;
    b.v[0] = L.v[0]; b.v[1] = L.v[1]; b.v[2] = L.v[2]; b.psi = L.psi; b.gam = L.gam; b.V = L.V; b.phi = L.phi; b.a[0] = L.a[0]; b.a[1] = L.a[1]; b.a[2] = L.a[2];
  }

  /* ---------------- flocks ---------------- */
  /* the places in a pattern (spans: back, aside, up), the old flights' own shapes */
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
    return [pat, kind, lvCount(r, pat, 0)];
  }
  /* a flock of a kind that perches, where the sky has one (a few draws of its own mix) */
  function perchWhat(r, cls) { var w; for (var k = 0; k < 6; k++) { w = flockWhat(r, cls); if (KINDS[w[1]] && KINDS[w[1]].perch) return w; } return w; }
  function lvCount(r, pat, n) {
    if (n) return n;
    if (pat === 'single') return 1; if (pat === 'pair') return 2;
    var tb = LIFE_N[pat] || [[3, 1]], k = weighted(r, tb.map(function (e) { return [e[0], e[1]]; }));
    return k === 4 ? 5 : k;
  }
  /* a flock made at (x, y, z) heading psi */
  function newFlock(x, y, z, psi, cls, what) {
    var r = sm32((visitSeed ^ Math.imul(9001 + (++POP.k), 0x9E3779B9)) >>> 0), w = what || flockWhat(r, cls), pat = w[0], kind = w[1], n = w[2];
    var F = { id: POP.k, kind: kind, pat: pat, r: r, m: [], lead: null, goal: null, t0: t, far: false };
    var sl = slotsOf(r, pat, n, kind), i;
    for (i = 0; i < n; i++) { var b = newBird(kind, sm32((visitSeed ^ Math.imul(77003 + POP.k * 31 + i, 0x85EBCA6B)) >>> 0), x, y, z, psi, 0, F); b.slot = sl[i]; F.m.push(b); }
    F.lead = F.m[0];
    for (i = 1; i < n; i++) holdPlace(F, F.m[i]);
    FLOCKS.push(F);
    nextGoal(F);
    return F;
  }
  /* (the owner, 2026-11-06: any bird joins a flock or forms one) a lone bird, or a flock's few, near another flock of
     its kind flying the same way joins it: a place at the end of its pattern, eased into by its own steering */
  function joinStep() {
    for (var i = 0; i < FLOCKS.length; i++) {
      var A = FLOCKS[i]; if (A.far || !A.lead || A.lead.st !== 'fly') continue;
      for (var j = 0; j < FLOCKS.length; j++) {
        var B = FLOCKS[j]; if (B === A || B.far || B.kind !== A.kind || B.m.length > A.m.length || B.m.length > 2 || !B.lead || B.lead.st !== 'fly') continue;
        if (A.m.length + B.m.length > 11) continue;
        var dx = B.lead.p[0] - A.lead.p[0], dy = B.lead.p[1] - A.lead.p[1], dz = B.lead.p[2] - A.lead.p[2];
        if (dx * dx + dy * dy + dz * dz > 40 * 40 || Math.cos(angDiff(B.lead.psi, A.lead.psi)) < 0.6) continue;
        var sp = A.lead.sz, ch = Math.cos(A.lead.psi), sh = Math.sin(A.lead.psi);
        while (B.m.length) {
          var b = B.m.pop(), back = A.m.length * 1.9, side = (A.m.length % 2 ? 1 : -1) * Math.ceil(A.m.length / 2) * 1.2;
          if (A.pat === 'line') side = (B.r() - 0.5) * 0.6;
          b.slot = [back, side, (B.r() - 0.5) * 0.5]; b.F = A; b.goal = null; A.m.push(b);
        }
        if (A.m.length === 2) A.pat = 'pair';
        var k = FLOCKS.indexOf(B); if (k >= 0) FLOCKS.splice(k, 1);
        STATS.joins = (STATS.joins || 0) + 1;
        return;
      }
    }
  }
  /* a bird leaves its flock (to land, or a straggler on its own way): a flock of its own, on its own goal */
  function splitOff(b) {
    var F0 = b.F; if (!F0 || F0.m.length < 2) return F0;
    var j = F0.m.indexOf(b); F0.m.splice(j, 1); if (F0.lead === b) relead(F0);
    var F = { id: ++POP.k, kind: b.kind, pat: 'single', r: b.r, m: [b], lead: b, goal: null, t0: t, far: false };
    b.F = F; b.slot = [0, 0, 0]; FLOCKS.push(F);
    return F;
  }

  /* ---------------- the population ---------------- */
  function popCls() { return skyCls(); }
  function liveCount(R) {
    var n = 0, r2 = (R || LIVE_R) * (R || LIVE_R);
    for (var i = 0; i < FLOCKS.length; i++) { var F = FLOCKS[i], L = F.lead; if (!L) continue; var dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z; if (dx * dx + dz * dz < r2 || (!R && F.goal && F.goal.home)) n++; }   // (the whole sky's count takes in the flocks coming in)
    return n;
  }
  /* the visit's first sky (before its first frame: nothing is seen yet): the visitor's sky filled, a flock or two near */
  function seed(C) {
    var cls = popCls(), r = POP.r, want = LIVE_N[cls] || 6, i, k;
    for (i = 0; i < want; i++) {
      for (k = 0; k < 12; k++) {
        var near = i < 2, d = near ? mix(r(), 140, 600) : LIVE_R * Math.sqrt(mix(r(), 0.03, 1)), a = near ? Math.atan2(C.f[0], C.f[2]) + (r() - 0.5) * 1.2 : TAU * r();
        var x = LVC.x + d * Math.sin(a), z = LVC.z + d * Math.cos(a), y = Math.max(hideTop(x, z) + 30, LVC.y + mix(r(), -30, 80));
        if (y < lvGround(x, z) + 15) continue;
        newFlock(x, y, z, TAU * r(), cls, near ? perchWhat(r, cls) : null);   // (the near ones of kinds that perch: a visit sees one come down soon)
        break;
      }
    }
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
      STATS.adds = (STATS.adds || 0) + 1;
      return F;
    }
    return null;
  }
  /* now and then (COME_GAP) one of the sky's flocks, of a kind that perches if it has one, turns to cross the camera's
     way ahead of it: the flocks that fly by, from which the words' birds come down (none is made for it) */
  function recruit() {
    var best = null, bd = 1e18, i;
    for (i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i], L = F.lead; if (!L || L.st !== 'fly' || (F.goal && (F.goal.k === 'sink' || F.goal.come))) continue;
      var dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z, dd = dx * dx + dz * dz;
      if (dd < 150 * 150 || dd > LIVE_R * LIVE_R) continue;
      if (!KINDS[F.kind].perch) dd *= 4;   // (one that perches first: it may come down on the words)
      if (dd < bd) { bd = dd; best = F; }
    }
    if (!best) return;
    /* by the eye's way, wide of it (the pass goal: aimed afresh each step beside where the eye will be) */
    var L2 = best.lead, g = newGoal(best, 'pass', best.r, POP.cls);
    g.d = pick(best.r, COME_D) * (best.r() < 0.5 ? 1 : -1); g.T = dist3(L2.p, [LVC.x, LVC.y, LVC.z]) / L2.K.v + 30; g.y = LVC.y + mix(best.r(), 5, 40); g.come = true;
    STATS.recruits = (STATS.recruits || 0) + 1;
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
  function popStep(C) {
    if (!POP.r) POP.r = vstream(8800);
    var cls = popCls();
    if (cls !== POP.cls) { POP.cls = cls; POP.line = TAU * POP.r(); }
    if (!POP.seeded) { seed(C); return; }
    for (var i = FLOCKS.length - 1; i >= 0; i--) {   // (taken out: only where unseen or hidden, every bird of it)
      var F = FLOCKS[i];
      if (F.lead && F.lead.st === 'fly' && goneUnseen(F) && (F.goal && F.goal.k === 'sink' || unseen(F.lead))) { dropFlock(F); STATS.outs = (STATS.outs || 0) + 1; continue; }
      if (FORCED && F.lead && F.lead.st === 'fly') { var allOut = true; for (var q = 0; q < F.m.length && allOut; q++) allOut = outOfView(F.m[q], C) && dist3(F.m[q].p, C.pos) > 600; if (allOut) dropFlock(F); }
    }
    if (t >= POP.nextT) {
      POP.nextT = t + 1.5;
      if (liveCount() < (LIVE_N[cls] || 6)) addFar(C, cls, POP.r);
      if (t >= (POP.comeT || PFIRST)) { recruit(); POP.comeT = t + pick(POP.r, COME_GAP); }
    }
    if (STATS.steps % 30 === 0) { joinStep(); homeStep(); }
  }
  /* the world's birds live round the eye: one gone past the live circle goes down into the sea of cloud if one lies
     under it (hidden there, then taken out), else turns back toward the eye's country. (Out past a few km a bird is
     a speck, but it stays seeable for tens of km in clear air: left on its way, the world would fill with them.) */
  function homeStep() {
    for (var i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i], L = F.lead; if (!L || L.st !== 'fly' || !F.goal || F.goal.k === 'sink' || F.goal.home) continue;
      var dx = LVC.x - L.p[0], dz = LVC.z - L.p[2]; if (dx * dx + dz * dz < HOME_R * HOME_R) continue;
      var g = newGoal(F, 'sink', F.r, POP.cls);
      if (g.k !== 'sink') { g.psi = Math.atan2(dx, dz) + (F.r() - 0.5) * 1.2; g.T = pick(F.r, [80, 160]); g.home = true; }
      STATS.homes = (STATS.homes || 0) + 1;
    }
  }

  /* ---------------- each step ---------------- */
  var FQ = [];
  function birdsStep(C, dt) {
    lvCam(C); windNow();
    popStep(C);
    var i, j, F, b;
    FQ.length = 0; for (i = 0; i < FLOCKS.length; i++) FQ.push(FLOCKS[i]);   // (a stable list: a bird taking off joins or leaves a flock mid-step)
    for (i = 0; i < FQ.length; i++) {
      F = FQ[i]; if (!F.lead || FLOCKS.indexOf(F) < 0) continue;
      var L = F.lead, dx = L.p[0] - LVC.x, dz = L.p[2] - LVC.z, dd = dx * dx + dz * dz;
      F.far = F.far ? dd > (0.92 * NEAR_R) * (0.92 * NEAR_R) : dd > NEAR_R * NEAR_R;
      if (F.far) {
        F.acc = (F.acc || 0) + dt; if (F.acc < COARSE) continue;
        var cdt = F.acc; F.acc = 0;
        if (L.st === 'fly') { var w = goalVel(F, L, cdt); flyTo(L, cdt, w[0], w[1], w[2]); L.age += cdt; wingNow(L); wingTrim(L); }
        for (j = 0; j < F.m.length; j++) { b = F.m[j]; if (b === L || b.st !== 'fly') continue; holdPlace(F, b); b.age += cdt; BW.ensure(b.w.wing, b.age); wingTrim(b); }   // (its wing kept up with its age: never a long history to work out at once)
        continue;
      }
      for (j = 0; j < F.m.length; j++) {
        b = F.m[j]; b.age += dt; wingTrim(b);
        if (b.st === 'perch' || b.st === 'land') BW.ensure(b.w.wing, b.age); else wingNow(b);
        if (b.st !== 'fly') { perchStep(b, dt, C); continue; }
        var wv = b === L ? goalVel(F, b, dt) : placeVel(F, b);
        clearOfEye(b, wv);
        flyTo(b, dt, wv[0], wv[1], wv[2]);
        if (b === L && wantsPerch(b)) perchAsk(b);
      }
    }
  }
  function birdsClear() { while (FLOCKS.length) dropFlock(FLOCKS[0]); BIRDS.length = 0; POP.seeded = false; POP.k = 0; POP.passT = 60; SEAC.clear(); perchReset(); POP.r = vstream(8800); POP.cls = ''; }
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
