  /* ---------------- life on the perch ---------------- */
  /* its wanted facing (deg about the camera's up, 0 away from the eye): the readable profiles only (a standing M), the
     side nearer the wind's (it faces into the wind), the end bird of a row looking out */
  function wantYaw(b) {
    var P = b.P, wr = WINDV[0] * LVC_R[0] + WINDV[2] * LVC_R[2], wf = WINDV[0] * LVC_F[0] + WINDV[2] * LVC_F[2], ws = Math.sqrt(wr * wr + wf * wf);
    var side = ws > 1 ? (wr > 0 ? -1 : 1) : P.face;   // (the wind blowing toward its right comes from its left: it faces left, into it)
    var edge = edgeOf(b); if (edge) side = edge;
    return side * PERCH.yaw;
  }
  function edgeOf(b) {
    var P = b.P, lft = 0, rgt = 0;
    for (var i = 0; i < PERCHED.length; i++) { var o = PERCHED[i]; if (o === b || o.st !== 'perch' || !o.P || o.P.kind === 'pointer' || Math.abs(o.P.fy - P.fy) > 30) continue; if (o.P.x < P.x) lft++; else rgt++; }
    if (lft + rgt === 0) return 0;
    return !lft ? -1 : !rgt ? 1 : 0;
  }
  /* a step turn kept a profile, on the side it faces (from in front or behind the perched form is a thin tent) */
  function profile(y, was) { return (was >= 0 ? 1 : -1) * clamp(Math.abs(y), 65, 120); }
  /* a walk's foot and hop at time T (the step's, or the frame's own): a hop of a step, then a pause; o[2] 1 once done */
  var WKA = [0, 0, 0];
  function walkAt(P, T, o) {
    var wk = P.walk, k = Math.floor((T - wk.t0) / 0.45), f = ((T - wk.t0) % 0.45) / 0.22;
    if (k >= wk.n) { o[0] = wk.x0 + wk.dir * wk.step * wk.n; o[1] = 0; o[2] = 1; }
    else { o[0] = wk.x0 + wk.dir * wk.step * (k + ease(Math.min(1, f))); o[1] = f < 1 ? Math.sin(Math.PI * f) : 0; o[2] = 0; }
    return o;
  }
  function perchedStep(b, dt, C) {
    var P = b.P, r = b.r;
    if (P.kind === 'pointer') {   /* on the tip: the feet the tip's, the body a pendulum to its motion; off when it moves fast, steers, goes or nears the edge */
      var ax = PW.pax, ay = PW.pay, w0 = TAU * 2.5;
      P.swingV += (-w0 * w0 * P.swing - 2 * 0.35 * w0 * P.swingV - 0.002 * ax) * dt; P.swing += P.swingV * dt; P.swing = clamp(P.swing, -0.6, 0.6);
      var sp = Math.sqrt(PW.pvx * PW.pvx + PW.pvy * PW.pvy);
      if (PTR.gone || PTR.steer || sp > PJ.jerk || PTR.x < 20 || PTR.y < 20 || PTR.x > W - 20 || PTR.y > H - 20) { leave(b, 'tip'); return; }
    }
    if (P.walk && t >= P.walk.t0) {   /* a side-step (or a walk along the stroke): a hop of a step, pausing between */
      walkAt(P, t, WKA); P.x = WKA[0]; P.hop = WKA[1]; if (WKA[2]) P.walk = null;
      var Lg = ledges()[P.li]; if (Lg && (P.x < Lg.pts[0][0] || P.x > Lg.pts[Lg.pts.length - 1][0])) { var L2 = nearLedge(P.x, P.fy, P.li); if (L2 >= 0) P.li = L2; else { P.x = clamp(P.x, Lg.pts[0][0], Lg.pts[Lg.pts.length - 1][0]); P.walk = null; } }
    } else P.hop = 0;
    /* its body over its feet where they are this step (after any step it takes) */
    if (!perchWorld(b, C, dt)) { leave(b, 'lost'); return; }
    b.p[0] = P.at[0]; b.p[1] = P.at[1]; b.p[2] = P.at[2]; b.v[0] = P.v[0]; b.v[1] = P.v[1]; b.v[2] = P.v[2];
    /* its turns: by steps, never a rotation in place; now and then a hop round */
    if (P.yawTo !== P.yaw && t - P.yawT >= P.yawD) P.yaw = P.yawTo;
    if (t >= P.nextAct && !P.act && !P.walk) {
      var want = wantYaw(b), u = r(), off = angDiff(want * DEG, P.yaw * DEG) / DEG;
      /* a hop-turn: round to face the other way (to its wanted side when it faces from it, else now and then of its own);
         off its wanted side by less than a hop, a step toward it */
      if (Math.abs(off) >= 90 || (u < 0.15 && Math.abs(off) <= 30)) { var to = Math.abs(off) >= 90 ? want : (P.yaw >= 0 ? -1 : 1) * PERCH.yaw; P.yaw0 = P.yaw; P.yawTo = to; P.yawT = t; P.yawD = pick(r, [0.2, 0.4]); P.hopTurn = true; P.face = to >= 0 ? 1 : -1; }
      else if (Math.abs(off) > 30) { P.yaw0 = P.yaw; P.yawTo = profile(P.yaw + (off > 0 ? 1 : -1) * pick(r, [15, 30]), P.yaw); P.yawT = t; P.yawD = pick(r, [0.12, 0.2]); P.hopTurn = false; }
      else if (u < 0.7) { P.yaw0 = P.yaw; P.yawTo = profile(P.yaw + (r() < 0.5 ? -1 : 1) * pick(r, [10, 30]), P.yaw); P.yawT = t; P.yawD = pick(r, [0.12, 0.2]); P.hopTurn = false; }
      else if (u < 0.82 && P.kind === 'name') { P.walk = { dir: r() < 0.5 ? -1 : 1, n: 1 + Math.floor(r() * 3), step: 0.08 * perchSpan(b, P.k), t0: t, x0: P.x }; }
      else if (u < 0.94 && t - (P.lastComfort || -1e9) > 12) { P.act = { k: r() < 0.5 ? 'wings' : 'rouse', t0: t, T: pick(r, [0.9, 1.6]) }; P.lastComfort = t; }
      P.nextAct = t + pick(r, [4, 12]);
    }
    if (P.act && t - P.act.t0 > P.act.T) P.act = null;
    /* it leaves: by its own wish, or to a flock of its kind passing */
    if (t >= P.stay) { leave(b, 'wish'); return; }
    if (P.kind !== 'pointer' && t - P.tt > PDWELL && STEPS % 20 === b.id % 20) { var J = passingFlock(b, C); if (J) { leave(b, 'join', J); return; } }
  }
  function nearLedge(x, y, not) { var L = ledges(), best = -1, bd = 12; for (var i = 0; i < L.length; i++) { if (i === not) continue; var Lg = L[i]; if (x < Lg.pts[0][0] || x > Lg.pts[Lg.pts.length - 1][0]) continue; var d = Math.abs(surfY(Lg.pts, x) - y); if (d < bd) { bd = d; best = i; } } return best; }
  function passingFlock(b, C) {
    for (var i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i]; if (F.far || F.kind !== b.kind || !F.lead || F.lead.st !== 'fly' || F === b.F || F.m.length < 2) continue;
      var dx = F.lead.p[0] - b.p[0], dy = F.lead.p[1] - b.p[1], dz = F.lead.p[2] - b.p[2];
      if (dx * dx + dy * dy + dz * dz < 200 * 200) return F;
    }
    return null;
  }

  /* ---------------- leaving ---------------- */
  /* the crouch and the lean (0.12-0.3 s; 0.05-0.12 s startled), the leap, the strong beats; then a bird of the air on a goal (to the flock
     that passes, or one any bird may draw: out into the distance, by the eye, down into the cloud, on) */
  function leave(b, why, J) {
    var P = b.P; if (!P || P.leaving) return;
    if (b.st !== 'perch') { toAir(b, J); return; }
    P.leaving = { t0: t, why: why, J: J, tc: why === 'startle' ? pick(b.r, [0.05, 0.12]) : pick(b.r, [0.12, 0.3]) };
  }
  function leavingStep(b, dt, C) {
    var P = b.P, L = P.leaving, u = t - L.t0;
    if (!perchWorld(b, C, dt)) { toAir(b, L.J); return; }
    if (u < L.tc) { b.p[0] = P.at[0]; b.p[1] = P.at[1]; b.p[2] = P.at[2]; b.v[0] = P.v[0]; b.v[1] = P.v[1]; b.v[2] = P.v[2]; P.crouch = Math.sin(0.5 * Math.PI * u / L.tc); return; }
    /* the leap: off the perch at its own push, toward the side it faces and up */
    var side = P.face || 1, up = 0.75, ax = C.r[0] * side * 0.65 + C.u[0] * up, ay = C.r[1] * side * 0.65 + C.u[1] * up, az = C.r[2] * side * 0.65 + C.u[2] * up, al = Math.sqrt(ax * ax + ay * ay + az * az) || 1, push = pick(b.r, [3, 4.2]);
    b.v[0] = P.v[0] + ax / al * push; b.v[1] = P.v[1] + ay / al * push; b.v[2] = P.v[2] + az / al * push;
    b.p[0] = P.at[0]; b.p[1] = P.at[1]; b.p[2] = P.at[2];
    toAir(b, L.J, true);
  }
  /* back in the air: its flight state from its motion now; a few strong beats; a goal */
  function toAir(b, J, leapt) {
    var P = b.P;
    if (PW.appr === b) PW.appr = null;
    var i = PERCHED.indexOf(b); if (i >= 0) PERCHED.splice(i, 1);
    b.P = null; b.st = 'fly'; b.vLo = b.vHi = 0;
    var ax = b.v[0] - WINDV[0], az = b.v[2] - WINDV[2], hz = Math.sqrt(ax * ax + az * az);
    b.psi = Math.atan2(ax, az); b.V = Math.max(0.75 * b.K.v, Math.sqrt(ax * ax + b.v[1] * b.v[1] + az * az)); b.gam = clamp(Math.atan2(b.v[1], Math.max(hz, 0.5)), -b.K.dive * DEG, b.K.climb * DEG); b.phi = 0;
    b.burst = leapt ? { t0: t, n: 3 + Math.floor(b.r() * 3) } : null;
    if (J && J.lead) {   /* to the flock: a place at its end, flown into */
      if (b.F && b.F !== J) { var F0 = leaveFlock(b); if (!F0.m.length) dropFlock(F0); }
      var q = endPlace(J); q[2] = 0.3; b.F = J; b.slot = q; J.m.push(b); J.off = false; J.acc = 0;   // (a bird joining: the flock is judged again with it, from this frame)
    } else {
      if (!b.F) soloFlock(b);
      var r = b.r, g = weighted(r, [['out', 30], ['commute', 35], ['sink', 15], ['pass', 20]]);
      if (g === 'pass' && t < POP.passT) g = 'commute';
      if (g === 'pass') passTaken(r);
      newGoal(b.F, g, r, skyCls());
    }
  }

  /* ---------------- the pointer, a jab, a click ---------------- */
  var CLKQ = [];
  function pointerStep(dt, C) {
    var was = !PTR.gone, ox = PTR.x, oy = PTR.y;
    if (HOST.pointer) HOST.pointer(PTR); else PTR.gone = true;
    if (PTR.gone || !was) { PW.pvx = PW.pvy = PW.pax = PW.pay = 0; PW.ptrStill = 0; }
    else {
      var vx = (PTR.x - ox) / dt, vy = (PTR.y - oy) / dt, k = Math.min(1, dt / 0.05);
      var nvx = PW.pvx + (vx - PW.pvx) * k, nvy = PW.pvy + (vy - PW.pvy) * k;
      PW.pax = (nvx - PW.pvx) / dt; PW.pay = (nvy - PW.pvy) / dt; PW.pvx = nvx; PW.pvy = nvy;
      var sp = Math.sqrt(nvx * nvx + nvy * nvy);
      PW.ptrStill = sp < PJ.slow ? PW.ptrStill + dt : 0;
      if (sp > PJ.jab) jab(PTR.x, PTR.y, sp);
    }
    if (HOST.clicks) { HOST.clicks(CLKQ); for (var i = 0; i + 1 < CLKQ.length; i += 2) clickBird(CLKQ[i], CLKQ[i + 1], C); }
  }
  /* a jab (the pointer quick, near a perched bird): it startles, and the startle runs down the row, each bird a beat
     after the one before it (120-250 ms), a bold one or two staying */
  function jab(x, y, sp) {
    if (t - PW.jabT < 30) return;
    var hit = null, i;
    for (i = 0; i < PERCHED.length; i++) { var b = PERCHED[i]; if (b.st !== 'perch' || !b.P) continue; var w = perchSpan(b, b.P.k); if (Math.abs(b.P.foot[0] - x) < 1.2 * w && Math.abs(b.P.foot[1] - 0.4 * w - y) < 1.2 * w) { hit = b; break; } }
    if (!hit) return;
    PW.jabT = t;
    var row = PERCHED.filter(function (o) { return o.st === 'perch' && o.P && o.P.kind !== 'pointer'; }).sort(function (a, c) { return Math.abs(a.P.x - hit.P.x) - Math.abs(c.P.x - hit.P.x); });
    var at = 0;
    for (i = 0; i < row.length; i++) { var o = row[i]; if (o !== hit && o.r() < 0.15) continue; o.P.startleT = t + at; at += pick(o.r, [0.12, 0.25]); }
    if (hit.P.kind === 'pointer') hit.P.startleT = t;
  }
  /* a click: a bird of the sky where it was clicked, in the world (at a gull's distance there), off on its way */
  var CQ = [0, 0, 0];
  function clickBird(x, y, C) {
    if (HOST.reduced() || FORCED) return;
    var r = vstream(8000 + (++PW.k)), kind = weighted(r, [['gull', 70], ['crow', 20], ['swallow', 10]]);
    var b0 = { S: SORTS[kind], sz: B_SPAN * SORTS[kind].size * MODEL_K }, D = perchDepth(b0, 0.55);   // (a little beyond the perches: its span about 2.3 a mid bird's there, so it can come down soon)
    rayAt(C, x, y, D, CQ);
    var F = newFlock(CQ[0], CQ[1], CQ[2], Math.atan2(C.f[0], C.f[2]) + (x < W / 2 ? -0.9 : 0.9), skyCls(), ['single', kind, 1]), b = F.lead;
    b.v[0] = LVC.vx + C.u[0] * 3; b.v[1] = LVC.vy + C.u[1] * 3; b.v[2] = LVC.vz + C.u[2] * 3;
    var ax = b.v[0] - WINDV[0], az = b.v[2] - WINDV[2]; b.psi = Math.atan2(ax, az); b.V = Math.max(b.K.v, Math.sqrt(ax * ax + az * az)); b.gam = 10 * DEG;
    b.burst = { t0: t, n: 4 + Math.floor(r() * 2) };
  }

  /* ---------------- each step, and the state machine ---------------- */
  var LVC_F = [0, 0, 1], LVC_R = [1, 0, 0];
  function perchesStep(C, dt) {
    LVC_F[0] = C.f[0]; LVC_F[2] = C.f[2]; LVC_R[0] = C.r[0]; LVC_R[2] = C.r[2];
    if (FORCED || HOST.reduced()) return;
    notice(C); noticePointer(C);
    for (var i = PERCHED.length - 1; i >= 0; i--) { var b = PERCHED[i]; if (b.P && b.P.startleT !== undefined && t >= b.P.startleT && b.st === 'perch') { b.P.startleT = undefined; leave(b, 'startle'); } }
  }
  function perchStep(b, dt, C) {
    if (b.st === 'appr') approachStep(b, dt, C);
    else if (b.st === 'round') roundStep(b, dt, C);
    else if (b.st === 'land') landStep(b, dt, C);
    else if (b.st === 'perch') { if (b.P.leaving) leavingStep(b, dt, C); else perchedStep(b, dt, C); }
  }
  function perchFree(b) { var i = PERCHED.indexOf(b); if (i >= 0) PERCHED.splice(i, 1); if (PW.appr === b) PW.appr = null; b.P = null; }
  function perchReset() { PERCHED.length = 0; PW.appr = null; PW.nextT = t + PFIRST; PW.ptrNext = t + PJ.first; PW.ledges = null; PW.jabT = -1e9; PW.seekEnd = 0; }
