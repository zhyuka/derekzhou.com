  /* ---------------- the approach ---------------- */
  function startApproach(b, P, delay) {
    splitOff(b);
    b.st = 'appr'; b.P = P; b.vLo = airLo(b); b.vHi = airHi(b); P.t0 = t + (delay || 0); P.tries = 0; P.d0 = 0; P.tau0 = 0; P.go = 0;
    P.D = perchDepth(b, P.k); P.rest = null;
    PW.appr = b; PERCHED.push(b);
  }
  /* the perch's place in the world now (its body's rest point: over its foot by its standing height) and its motion */
  var PQ = [0, 0, 0], PF2 = [0, 0];
  function perchWorld(b, C, dt) {
    var P = b.P; perchFoot(P, PF2);
    if (!(PF2[0] === PF2[0])) return false;
    var up = P.rest ? P.rest : 0.42 * perchSpan(b, P.k);   // (CSS px from its foot to its body: the rest rule's, once it is known)
    rayAt(C, PF2[0], PF2[1] - up, P.D, PQ);
    var et = t - (P.tAt === undefined ? t - dt : P.tAt); P.tAt = t;   // (the time since it was last placed: a step missed counts)
    if (P.ok && et > 1e-4) { var k = Math.min(1, et / 0.12); for (var i = 0; i < 3; i++) P.v[i] += ((PQ[i] - P.at[i]) / et - P.v[i]) * k; }
    else { P.v[0] = LVC.vx; P.v[1] = LVC.vy; P.v[2] = LVC.vz; }
    P.at[0] = PQ[0]; P.at[1] = PQ[1]; P.at[2] = PQ[2]; P.ok = true; P.foot[0] = PF2[0]; P.foot[1] = PF2[1];
    return true;
  }
  /* a landing's airspeeds: a gull's whole range, not its cruise's (slow flight down to 0.45 of its pace, feet and flaps
     down; a powered burst or a shallow dive up to twice it, as a gull hangs by a ship into a head wind), so it can hold
     a perch that rides the camera through the wind (into a head wind it flies the camera's speed and the wind's; with a
     tail wind, slower) */
  function airLo(b) { return 0.45 * b.K.v; }
  function airHi(b) { return 2 * b.K.v; }
  /* the airspeed it needs to keep pace with the perch (the perch's velocity less the wind's) */
  function airNeed(Vp) { var x = Vp[0] - WINDV[0], y = Vp[1], z = Vp[2] - WINDV[2]; return Math.sqrt(x * x + y * y + z * z); }
  function canHold(b, Vp) { var n = airNeed(Vp); return n <= 0.95 * airHi(b) && n >= 0.8 * airLo(b); }
  /* the most it can close on the perch along the line to it (m/s), its velocity over the ground the perch's less the
     closing, its airspeed within the landing's range (a bird ahead of the perch is caught up by it: it flies on the
     perch's way, slower; one beside it comes in sideways, quicker); never under 2, never so quick it arrives in under
     2.5 s */
  function closeMax(b, Vp, ex, ey, ez, d) {
    var vx = Vp[0] - WINDV[0], vy = Vp[1], vz = Vp[2] - WINDV[2], pe = vx * ex + vy * ey + vz * ez, vv = vx * vx + vy * vy + vz * vz;
    var vm = 0.9 * airHi(b), vn = airLo(b), qo = pe * pe - vv + vm * vm, qi = pe * pe - vv + vn * vn;
    /* its airspeed at a closing vc: sqrt(vv - 2 pe vc + vc^2), least at vc = pe. Under its slowest only between the roots
       pe -+ sqrt(qi): the slower side kept where it is there (no turning about), else the quicker side */
    var outer = qo > 0 ? pe + Math.sqrt(qo) : 0, vc;
    if (qi <= 0) vc = outer;
    else { var inner = pe - Math.sqrt(qi), upper = pe + Math.sqrt(qi); vc = inner >= 2 ? inner : outer >= upper ? outer : 0; }
    return clamp(Math.min(vc, d / 2.5), 2, 1.15 * b.K.v);
  }
  /* the gate: on the window wide of the perch on the bird's side, a little over it, as little deeper than the perch as
     makes the last leg PGATE m: so it comes in from the side and beyond, matching the perch's motion as it closes
     (from straight ahead it could close only by flying slower than the camera, barely over its stall) */
  var GQ = [0, 0, 0], GP = { x: 0, y: 0, z: 0, n: 0 }, GA = [0, 0, 0];
  function gateFor(b, P, C) {
    /* tried every 30 deg round the foot on the window, 0.36 of its least side and 0.12 of its longest out (kept a margin in): the
       one wanting least depth for a last leg of PGATE m (the most from the side: the quickest in), the bird's own side
       first (each 30 deg from it costs 2 m), over it rather than under */
    var q = projReal(b.p[0], b.p[1], b.p[2], C, GP), a0;
    if (q.z > 0.5) a0 = Math.atan2(q.y - P.foot[1], q.x - P.foot[0]);
    else a0 = (b.p[0] - C.pos[0]) * C.r[0] + (b.p[2] - C.pos[2]) * C.r[2] >= 0 ? -0.5 : Math.PI + 0.5;
    var L = 0.36 * Math.min(W, H) + 0.12 * Math.max(W, H), best = null, bs = 1e9, k, dz;
    rayAt(C, P.foot[0], P.foot[1], P.D, GA);
    for (k = 0; k < 12; k++) {
      var a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6;
      var gx = clamp(P.foot[0] + Math.cos(a) * L, 0.1 * W, 0.9 * W), gy = clamp(P.foot[1] + Math.sin(a) * L, 0.08 * H, 0.9 * H);
      for (dz = 4; dz < 60; dz += 2) { rayAt(C, gx, gy, P.D + dz, GQ); if (dist3(GQ, GA) >= PGATE) break; }
      var sc = dz + 2 * Math.ceil(k / 2) + 60 * Math.max(0, gy - P.foot[1]) / H;   // (from under it costs: it would climb at its slowest)
      if (sc < bs) { bs = sc; best = [gx, gy, P.D + dz]; }
    }
    return best;
  }
  /* in view (a margin in), beyond the perch, and able to close quickly from there (straight ahead it cannot); or in
     view and nearer than the last leg already */
  function inCone(b, P, C, near) {
    var q = projReal(b.p[0], b.p[1], b.p[2], C, GP); if (!(q.z > (near ? 0.6 * P.D : P.D + 4) && q.x > 0.06 * W && q.x < 0.94 * W && q.y > 0.06 * H && q.y < 0.94 * H)) return false;
    if (near) return true;   // (in view and already within the last leg: straight in, from where it is)
    var rx = b.p[0] - P.at[0], ry = b.p[1] - P.at[1], rz = b.p[2] - P.at[2], d = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    return closeMax(b, P.v, rx / d, ry / d, rz / d, d) >= PQUICK;
  }
  /* the last leg in view: where it would be in 0.6 s, out past the window's margin, it is turned back in across the
     view (its want pushed sideways in the camera's frame, as far as it would be out) */
  function keepInView(b, o, C) {
    var k = 0.6, x = b.p[0] + (o[0] - LVC.vx) * k, y = b.p[1] + (o[1] - LVC.vy) * k, z = b.p[2] + (o[2] - LVC.vz) * k, q = projReal(x, y, z, C, GP);
    if (!(q.z > 0.5)) return;
    var ex = q.x < 0.05 * W ? (0.05 * W - q.x) / W : q.x > 0.95 * W ? (0.95 * W - q.x) / W : 0, ey = q.y < 0.05 * H ? (q.y - 0.05 * H) / H : q.y > 0.95 * H ? (q.y - 0.95 * H) / H : 0;
    if (!ex && !ey) return;
    var m = 2 * VW.tanX * q.z / k;   // (m/s: a window's width in 0.6 s, at its depth)
    for (var i = 0; i < 3; i++) o[i] += (C.r[i] * ex * m + C.u[i] * ey * m * H / W);
  }
  function onWindow(b, C) { var q = projReal(b.p[0], b.p[1], b.p[2], C, GP); return q.z > 0.5 && q.x > 0 && q.x < W && q.y > 0 && q.y < H; }
  function bump(s) { var a = PDIP[0]; return s <= 0 ? 0 : s < a ? Math.sin(0.5 * Math.PI * s / a) : s < 1 ? Math.cos(0.5 * Math.PI * (s - a) / (1 - a)) : 0; }
  var AV = [0, 0, 0];
  function approachStep(b, dt, C) {
    var P = b.P;
    if (t < P.t0) { var wv = b.F ? goalVel(b.F, b, dt) : [b.v[0], b.v[1], b.v[2]]; flyTo(b, dt, wv[0], wv[1], wv[2]); return; }
    if (!perchWorld(b, C, dt)) { giveUp(b); return; }
    var rx = b.p[0] - P.at[0], ry = b.p[1] - P.at[1], rz = b.p[2] - P.at[2], d = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (!canHold(b, P.v)) { goRound(b, 'fast'); return; }   // (the perch, through the wind, outruns it or is too slow for it)
    /* first into the view: to a gate beyond the perch and to its side (on the window, PGATE m deeper), unless it is in
       view already, beyond it and near; from there the last leg is a line between two points in view, so in view all
       its way (the view is convex) */
    if (!P.gated) {
      if (!P.gate) P.gate = gateFor(b, P, C);
      rayAt(C, P.gate[0], P.gate[1], P.gate[2], GQ);
      var gx = GQ[0] - b.p[0], gy = GQ[1] - b.p[1], gz = GQ[2] - b.p[2], gd = Math.sqrt(gx * gx + gy * gy + gz * gz);
      var ux = b.v[0] - P.v[0], uy = b.v[1] - P.v[1], uz = b.v[2] - P.v[2], cn = -(rx * ux + ry * uy + rz * uz) / (d || 1);   // (closing now)
      if ((gd < 8 || (d < PGATE + 8 && inCone(b, P, C, d < PGATE - 4))) && cn <= 1.25 * closeMax(b, P.v, rx / (d || 1), ry / (d || 1), rz / (d || 1), d) + 1) { P.gated = true; P.d0 = 0; }
      else {
        if (!P.gT) P.gT = Math.max(14, 6 + d / 8);   // (its time to the gate, by how far it began)
        if (t - P.t0 > P.gT) { goRound(b, 'away'); return; }
        var gk = Math.min(14, 0.5 * gd, 0.35 * d + 2) / gd;   // (never so quick near the perch that the last leg cannot stop it)
        AV[0] = P.v[0] + gx * gk; AV[1] = P.v[1] + gy * gk; AV[2] = P.v[2] + gz * gk;
        /* never against the perch's way: a bird ahead lets the perch come to it (flying on its way, slower), so it has
           no turn about to make at the end */
        var pv = Math.sqrt(P.v[0] * P.v[0] + P.v[2] * P.v[2]);
        if (pv > 1) { var al = (AV[0] * P.v[0] + AV[2] * P.v[2]) / pv, lack = 0.4 * pv - al; if (lack > 0) { AV[0] += lack * P.v[0] / pv; AV[2] += lack * P.v[2] / pv; } }
        /* out of view, it keeps off the perch until the gate (else it would come at it unseen, from beside the window) */
        if (d < PGATE && !onWindow(b, C)) { var kr = 1.5 * (PGATE - d) / (d || 1); AV[0] += rx * kr; AV[1] += ry * kr; AV[2] += rz * kr; }
        clearOfEye(b, AV); AV[1] = floorUp(b, AV[1], b.K.v, P.at[1]); flyTo(b, dt, AV[0], AV[1], AV[2]);
        return;
      }
    }
    if (!P.d0) { P.d0 = Math.max(d, 8); P.tau0 = P.d0 / closeMax(b, P.v, rx / (d || 1), ry / (d || 1), rz / (d || 1), P.d0); P.ts = t; }
    /* the closing by the tau-dot law, by the way left (closed loop: the closing a constant tau-dot gives at this range,
       v0 (d/d0)^(1 - tau-dot), so a bird slower than it asks only takes longer, never falls behind a clock) */
    var vc = (P.d0 / P.tau0) * Math.pow(Math.min(d / P.d0, 1.2), 1 - PTAU), tau = d / vc;
    /* carried away from it (past it, or blown off): planned again from here, three times at most, then round */
    if (d > P.d0 * 1.25 + 10) { if (++P.go > 3) { goRound(b, 'away'); return; } P.d0 = 0; if (!onWindow(b, C)) { P.gated = false; P.gate = null; P.gT = 0; P.t0 = t; } return; }   // (out of view, by the gate again: never in at it unseen)
    if (tau <= PLAND[0] || d <= PLAND[1]) {   /* the last of it: down a curve to rest on the perch, from where it is and how it moves */
      var wx = b.v[0] - P.v[0], wy = b.v[1] - P.v[1], wz = b.v[2] - P.v[2], wc = -(rx * wx + ry * wy + rz * wz) / (d || 1);
      b.st = 'land'; P.tl = t; P.r0 = [rx, ry, rz]; P.u0 = [wx, wy, wz]; P.T = clamp(2 * d / Math.max(wc, 2), 0.8, 2.6);
      return;
    }
    /* matched to the perch's motion, then closing: aimed at the dipped way's point, at the closing tau asks */
    var s = clamp(1 - d / P.d0, 0, 1), yo = -PDIP[1] * P.d0 * bump(s);
    var ex = rx, ey = ry - yo, ez = rz, el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
    AV[0] = P.v[0] - ex / el * vc; AV[1] = P.v[1] - ey / el * vc; AV[2] = P.v[2] - ez / el * vc;
    /* its drift across the line to the perch taken out (else, turning only by its bank, it swings past and round) */
    var ux = b.v[0] - P.v[0], uy = b.v[1] - P.v[1], uz = b.v[2] - P.v[2], ue = (ux * ex + uy * ey + uz * ez) / el;
    AV[0] -= PDAMP * (ux - ue * ex / el); AV[1] -= PDAMP * (uy - ue * ey / el); AV[2] -= PDAMP * (uz - ue * ez / el);
    keepInView(b, AV, C);
    /* (no clearOfEye here: the last leg runs between two points at the perch's depth or deeper, so never nearer the eye
       than the perch; on a phone that is nearer than clearOfEye's few spans, and it would push the bird off its landing) */
    b.flapA = b.flap = s < 0.45 || ry < -1 ? 1 : 0;   // (down with strong beats; up into it gliding; under it, beating: a glide cannot climb)
    AV[1] = floorUp(b, AV[1], b.K.v, P.at[1]);
    flyTo(b, dt, AV[0], AV[1], AV[2]);
  }
  /* the last of the landing, in the perch's frame: a curve from where it is, at the speed it has, to rest on the perch
     (a cubic: its place and its motion at both ends, so no jump and no overshoot; head-on, an even braking), the flare
     its last PFLARE s: its body pitched up to near upright, its wings forward and spread as brakes, its feet out */
  function landStep(b, dt, C) {
    var P = b.P;
    if (!perchWorld(b, C, dt)) { giveUp(b); return; }
    var T = P.T, s = clamp((t - P.tl) / T, 0, 1), s2 = s * s, s3 = s2 * s, h0 = 2 * s3 - 3 * s2 + 1, h1 = (s3 - 2 * s2 + s) * T;
    var px = b.p[0], py = b.p[1], pz = b.p[2];
    for (var i = 0; i < 3; i++) b.p[i] = P.at[i] + P.r0[i] * h0 + P.u0[i] * h1;
    b.v[0] = (b.p[0] - px) / dt; b.v[1] = (b.p[1] - py) / dt; b.v[2] = (b.p[2] - pz) / dt;
    var tf = Math.min(PFLARE, T); b.flareU = clamp((s * T - (T - tf)) / tf, 0, 1);
    if (s >= 1) touchDown(b, C);
  }
  function goRound(b, why) {
    var P = b.P; P.tries++;
    if (P.tries > 1 || why === 'fast') { giveUp(b); return; }
    /* once round: after 4 s, once at least 3 spans (and 25 m) from the perch, in again; given up after 14 s */
    b.st = 'round'; P.rT = t; P.d0 = 0;
  }
  function roundStep(b, dt, C) {
    var P = b.P;
    perchWorld(b, C, dt);
    var rx = b.p[0] - P.at[0], rz = b.p[2] - P.at[2], rl = Math.sqrt(rx * rx + rz * rz) || 1, out = Math.max(3 * b.sz, 25);
    var h = Math.atan2(rx, rz) + 0.9, v = b.K.v;
    AV[0] = P.v[0] * 0.6 + v * Math.sin(h); AV[1] = 0.2 * (P.at[1] + 8 - b.p[1]); AV[2] = P.v[2] * 0.6 + v * Math.cos(h);
    clearOfEye(b, AV); AV[1] = floorUp(b, AV[1], v, P.at[1]);
    flyTo(b, dt, AV[0], AV[1], AV[2]);
    if (t - P.rT > 4 && rl > out) { b.st = 'appr'; P.d0 = 0; P.gated = false; P.gate = null; P.gT = 0; P.t0 = t; }
    if (t - P.rT > 14) giveUp(b);
  }
  function giveUp(b) {
    toAir(b, null);
  }
  /* the touch: its feet are the perch's from now; it settles */
  function touchDown(b, C) {
    var P = b.P;
    b.st = 'perch'; P.tt = t; if (PW.appr === b) PW.appr = null;
    /* its attitude on the perch from its attitude now (the flare's): its heading about the camera's up, as it came */
    var fx = b.v[0] - WINDV[0], fz = b.v[2] - WINDV[2];   // (its way through the air: as its body lay)
    var fr = fx * C.r[0] + fz * C.r[2], ff = fx * C.f[0] + fz * C.f[2];
    P.yaw = (Math.abs(fr) > 0.05 ? (fr > 0 ? 1 : -1) : (P.foot[0] < W / 2 ? -1 : 1)) * PERCH.yaw;   // (it stands in profile, toward the side it came moving: seen from behind, the perched form is a thin tent)
    P.yaw0 = P.yaw; P.yawT = t; P.yawTo = P.yaw; P.pitch = PERCH.pitch; P.face = P.yaw >= 0 ? 1 : -1;
    P.stay = t + pick(b.r, PSTAY); P.nextAct = t + pick(b.r, [1.2, 2.5]); P.act = null; P.walk = null; P.swing = 0; P.swingV = 0;
    b.v[0] = P.v[0]; b.v[1] = P.v[1]; b.v[2] = P.v[2];
    makeRoom(b);
  }
  /* a newcomer between two: its neighbours step aside (3 steps at most) */
  function makeRoom(b) {
    var P = b.P, w = 0.35 * perchSpan(b, P.k) + 4;
    for (var i = 0; i < PERCHED.length; i++) {
      var o = PERCHED[i]; if (o === b || o.st !== 'perch' || !o.P || o.P.kind !== P.kind || o.P.li < 0) continue;
      var dx = o.P.x - P.x; if (Math.abs(dx) < 1.6 * w && Math.abs(o.P.fy - P.fy) < 2 * w) { o.P.walk = { dir: dx >= 0 ? 1 : -1, n: 1 + Math.floor(o.r() * 3), step: 0.22 * w, t0: t + o.lat, x0: o.P.x }; }
    }
  }

