  /* ---------------------------------------------------------------- the meteors (delight-night §2)
     Two kinds, on the night skies only (the Milky Way and the aurora; the moonlit sky the bright ones only; none in a
     twilight), each a stay's own from the seed (subseed(J.seed, 85) and the stay's place in the order), at 1x real time:
     - the long grazers (the spec's strict form): from a radiant just under the horizon (1-4 deg down) a meteor runs low and
       slow (3-5 deg/s) along the great circle through it, from under 2 deg up or out of the view to out of it again,
       its wake rigid (2 deg) and its light constant: it shows by crossing the window, never by fading (at real rates
       1-2% of the sporadics seen are grazers like it, 2-9 deg/s: https://www.imo.net/observations/methods/visual-observation/
       and the handoff's strict.mjs); about one a stay
     - the short ones (the owner's ruling, 2026-11-15: "Allow short ones too"): 0.3-1 s at 3-25 deg/s mid-sky (20-55 deg up), a few a night,
       a soft rise and fall of their light over that time (one of the owner's two exceptions in no-fades, RULES.json), the stroke drawn
       over each frame's own path; 1-3 a stay
     Each is planned when its time comes, against the view as it is then (its heading and pitch); none under reduced motion
     and none in a still (none in the opening stay's first METEOR.QUIET s). Drawn by sky-body.glsl's meteorAt: a head of the
     stars' pixel-integrated kind and its wake, its light capped so no pixel passes OKLab L 0.50, behind the haze. */
  var METEOR = { LONG: [3, 5], SHORT_W: [3, 25], SHORT_D: [0.3, 1], WAKE: 2, QUIET: 8, GAP: 8, TOP_Y: 0.118, RAD: [1, 4], SPAN: 120,
    SKIES: { milkyway: [1, 1], aurora: [1, 1], moonlit: [0.5, 0.5] }, BRIGHT: 0.09, Y: [0.06, 0.1], FAST: 15 };
  var METS = { E: null, h: new Float32Array(4), t: new Float32Array(4), c: new Float32Array(3), cW: null, cG: null };
  function meteorList(E, seed, t0, t1) {   // a night stay's meteors from its own stream: [{ at, long, ... }] in sky time, none before t0, all done by t1
    var S = METEOR.SKIES[E.id]; if (!S) return [];
    var R = RNG(subseed(seed, 85 + 7 * (E.n || 0))), out = [], i, nL, nS, moonlit = E.id === 'moonlit';
    var u = R.f(); nL = u < 0.25 * S[0] ? 0 : (u < 1 - 0.25 * S[0] ? 1 : 2); if (S[0] < 1 && R.f() > S[0]) nL = 0;   // (a mean of about one a stay; the moonlit sky's half as often)
    nS = 1 + Math.floor(R.f() * 3); if (moonlit) nS = R.f() < 0.5 ? 1 : 0;   // (1-3; the moonlit sky's a bright one at most)
    for (i = 0; i < nL + nS; i++) {
      var lg = i < nL, w = lg ? R.r(METEOR.LONG[0], METEOR.LONG[1]) : R.r(METEOR.SHORT_W[0], METEOR.SHORT_W[1]), dur = lg ? METEOR.SPAN / w : R.r(METEOR.SHORT_D[0], METEOR.SHORT_D[1]);
      var y = moonlit ? R.r(METEOR.BRIGHT, METEOR.Y[1]) : R.r(METEOR.Y[0], METEOR.Y[1]);
      out.push({ long: lg, w: w, dur: dur, y: y, u: [R.f(), R.f(), R.f(), R.f()], at: 0, plan: null });
    }
    var room = t1 - t0, used = 0;   // (in turn, spread over the stay with at least GAP between them; what does not fit is dropped)
    for (i = 0; i < out.length; i++) used += out[i].dur + METEOR.GAP;
    if (used > room) { while (out.length && used > room) { used -= out[out.length - 1].dur + METEOR.GAP; out.pop(); } }
    var slack = room - used, at = t0;
    for (i = 0; i < out.length; i++) { at += slack * R.f() / out.length; out[i].at = at; at += out[i].dur + METEOR.GAP; }
    return out;
  }
  function meteorAxis(A, B) { var n = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]], l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1; return [n[0] / l, n[1] / l, n[2] / l]; }
  function meteorPlan(M, psi, pitch, tanX, tanY) {   // where it runs, against the view at its start: a great circle (from A, about axis n), the angles it runs between
    var u = M.u, P;
    if (M.long) {   // (a grazer: a point low in the view, a radiant 40-60 deg to one side of it (so it runs on 60 deg and more past it, out of the view) just under the horizon; from under 2 deg up to SPAN on)
      var azP = psi + (u[0] * 2 - 1) * 0.6 * Math.atan(tanX) / DEG, elP = 6 + 14 * u[1], side = u[2] < 0.5 ? -1 : 1, azR = azP + side * (40 + 20 * u[3]), elR = -(METEOR.RAD[0] + (METEOR.RAD[1] - METEOR.RAD[0]) * u[1]);
      var R0 = dirAzEl(azR, elR); P = dirAzEl(azP, elP);
      var n = meteorAxis(R0, P), thP = Math.acos(Math.max(-1, Math.min(1, R0[0] * P[0] + R0[1] * P[1] + R0[2] * P[2]))) / DEG;
      var th0 = 0, k, lo = 0, s2 = Math.sin(2 * DEG); for (k = 0; k < 90; k++) { if (meteorAt3(R0, n, th0)[1] > s2) break; lo = th0; th0 += 1; }   // (from where it rises over 2 deg: found by the degree, then halved down to it)
      for (k = 0; k < 24 && th0 > 0; k++) { var mid = (lo + th0) / 2; if (meteorAt3(R0, n, mid)[1] > s2) th0 = mid; else lo = mid; }
      th0 = lo;
      return { A: R0, n: n, th0: th0, th1: th0 + METEOR.SPAN, thP: thP };
    }
    var nx = (u[0] * 2 - 1) * 0.8, ny = -0.1 + 0.8 * u[1], cp = Math.cos(pitch * DEG), sp = Math.sin(pitch * DEG), a = psi * DEG;   // (a short one: in the view, mid-sky)
    var f = [Math.sin(a) * cp, sp, Math.cos(a) * cp], r = [Math.cos(a), 0, -Math.sin(a)], up = [-Math.sin(a) * sp, cp, -Math.cos(a) * sp];
    var S = [f[0] + r[0] * nx * tanX + up[0] * ny * tanY, f[1] + r[1] * nx * tanX + up[1] * ny * tanY, f[2] + r[2] * nx * tanX + up[2] * ny * tanY], l = Math.sqrt(S[0] * S[0] + S[1] * S[1] + S[2] * S[2]);
    S = [S[0] / l, Math.min(Math.max(S[1] / l, Math.sin(20 * DEG)), Math.sin(55 * DEG)), S[2] / l];   // (mid-sky, the owner's: 20-55 deg up) l = Math.sqrt(S[0] * S[0] + S[1] * S[1] + S[2] * S[2]); S = [S[0] / l, S[1] / l, S[2] / l];
    var Rd = dirAzEl(psi + 360 * u[2], 20 + 50 * u[3]), n2 = meteorAxis(Rd, S);   // (it runs away from its radiant, 20-70 deg up somewhere round the sky)
    return { A: S, n: n2, th0: 0, th1: M.w * M.dur, thP: 0 };
  }
  function meteorAt3(A, n, th) {   // the point th deg along the great circle from A about axis n
    var c = Math.cos(th * DEG), s = Math.sin(th * DEG), b = [n[1] * A[2] - n[2] * A[1], n[2] * A[0] - n[0] * A[2], n[0] * A[1] - n[1] * A[0]];
    return [c * A[0] + s * b[0], c * A[1] + s * b[1], c * A[2] + s * b[2]];
  }
  function meteorShape(M, t, dt) {   // at sky time t (dt: a frame): { head, tail, y } or null; the wake rigid (a long one) or the frame's own path at least (a short one)
    var p = M.plan, e = t - M.at; if (!p || e < 0 || e > M.dur) return null;
    var th = p.th0 + M.w * e, wake = M.long ? METEOR.WAKE : Math.max(M.w * 0.12, M.w * dt), tt = Math.max(p.th0, th - wake);
    var y = M.long ? M.y : M.y * Math.sin(Math.PI * e / M.dur);   // (the short one's soft rise and fall: the owner's exception; a long one's light is constant)
    return { head: meteorAt3(p.A, p.n, th), tail: meteorAt3(p.A, p.n, tt), y: y, green: M.w > METEOR.FAST };
  }
  function meteorStep(t) {   // (226's moonStep, the sky's step) the stay's list, planned once; a meteor's path when its time comes
    var E = SKY.seq[SKY.i]; if (!E || reduced() || !SIM.V) return;
    if (E.met === undefined) { var first = E === SKY.seq[0]; E.met = meteorList(E, J.seed, Math.max(E.at, first ? t : E.at) + (first ? METEOR.QUIET : 4), E.at + E.hold); }
    for (var i = 0; i < E.met.length; i++) { var M = E.met[i]; if (!M.plan && t >= M.at && t < M.at + M.dur) M.plan = meteorPlan(M, (CS.yawV + CS.phi) / DEG, basePitchT(SIM.V) / DEG, FRT.tanX, FRT.tanY); }
  }
  function meteorUniforms(u) {   // (226's skyNightUniforms) the one meteor on show at the drawn time: uMetH head and its light (Y), uMetT tail, uMetC its colour (luminance 1)
    if (!u.uMetH) return;
    var E = SKY.seq[SKY.i], t = SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, sh = null, i;
    METS.h[3] = 0;
    if (E && E.met && !reduced()) for (i = 0; i < E.met.length && !sh; i++) sh = meteorShape(E.met[i], t, SIM_DT);
    if (sh) {
      if (!METS.cW) { METS.cW = meteorTint([0.8, 0.035, 85]); METS.cG = meteorTint([0.8, 0.04, 140]); }
      METS.h.set([sh.head[0], sh.head[1], sh.head[2], sh.y]); METS.t.set([sh.tail[0], sh.tail[1], sh.tail[2], 0.75]); METS.c.set(sh.green ? METS.cG : METS.cW);
    }
    gl.uniform4fv(u.uMetH, METS.h); gl.uniform4fv(u.uMetT, METS.t); gl.uniform3fv(u.uMetC, METS.c);
  }
  function meteorTint(lchC) { var c = lchA(lchC), y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return [c[0] / y, c[1] / y, c[2] / y]; }   // (warm white h 85, or a fast one's green head h 140; at luminance 1, the cap sets its light)
