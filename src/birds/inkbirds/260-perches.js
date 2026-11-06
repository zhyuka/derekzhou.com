  /* ================= PERCHES: the letters' ink and the pointer's tip (docs/birds-design.md) =================
     A perch is a place on the window (a ledge of a letter's ink, or the pointer's tip) seen at a depth: a point in the
     world in front of the camera that moves as the camera and the pointer move, like a ferry's rail. Any bird of a
     perching kind (a lone bird, or one to three of a passing flock) may come down to it: the same bird, its wings and
     its size its own throughout. It first matches the perch's motion, then closes on it: down a little (its low point
     PDIP of the way in, 3 % of the way below), then up into it, its closing held at a constant tau-dot (PTAU), its feet
     out at the end, and from the touch its feet are the perch's (worked out every frame from where the perch is drawn:
     no easing). If the perch gets away from it, it goes round once (far out) and tries again, or flies on. On the perch
     it lives: it turns by steps, hops round, raises its wings, rouses, walks along a stroke, makes room for a newcomer,
     the end bird looks out; it leaves by its own wish, when a flock of its kind passes (to join it), or startled by a
     jab (the startle running down the row bird to bird). It leaves as a bird does: a crouch and a lean, a leap, a few
     strong beats, and on in the world on a goal any bird may fly. */
  var PERCH = (function () {   /* the perched shape: the owner's chosen one (perch A): its poses */
    function side(a) { var p = FP.pose(); for (var i = 0; i < 11; i++) { p[i] = a[i]; p[11 + i] = a[i]; } return p; }
    var P = { flare: side([55, 26, 26, 1, -16, 6, 10, 14, 0, 0, 12]), touch: side([62, 10, 12, 0.95, -40, 0, 4, 6, 0, 0, 8]),
      fold: side([0, -78, 88, 0.48, 0, -14, 0, 0, -6, 0, 0]), foldHalf: side([40, -20, 30, 0.8, -40, -25, 0, 0, -5, 0, 6]),
      foldLoose: side([8, -62, 70, 0.6, -6, -10, 0, 0, -4, 0, 2]), open: side([40, 8, 6, 0.9, -30, -10, 4, 0, -4, 0, 6]) };
    return { poses: P, scale: 4.2, el: 4, pitch: 70, yaw: 95 };
  })();
  var P_LINK_K = 0.75, P_PTR_K = 0.75;   // a perched bird's size on a link or the credit, and on the pointer, against the name's
  var PMAX = 6;                // birds on the letters at once, at most
  var PDIP = [0.61, 0.032];    // the approach's low point: this share of the way in, this share of the way below
  var PTAU = 0.72;             // the closing's tau-dot
  var PFLARE = 0.6;            // s of tau: the flare (the feet out from 0.15)
  var PNOTICE = [16, 34];      // s between the letters' turns to have a bird (one at a time) ...
  var PSEEK = 20;              // ... each turn looking this long (every PLOOK s) for a bird that can be there soon (PREACH s): the perch moves
  var PLOOK = 0.5, PREACH = 20;   // with the camera, so only a bird near it or beside its way can come down in a believable time
  var PSTAY = [25, 90];        // s on a perch, by its own wish
  var PFIRST = 6;              // s: the first noticing
  var PJ = { slow: 40, setout: 1.0, first: 3, gap: [12, 22], jerk: 900, jab: 300, rest: 0.6 };
  var PERCHED = [], PW = { k: 0, nextT: PFIRST, appr: null, ptrNext: PJ.first, ptrStill: 0, px: -1, py: -1, pvx: 0, pvy: 0, pax: 0, pay: 0, ptrT: -1, ptr: null, ledges: null, ledgeKey: '', clk: [], jabT: -1e9 };
  var PTR = { x: 0, y: 0, n: 0, gone: true, down: false, steer: false, touch: false };

  /* ---------------- the ledges (the words' ink, on this window) ---------------- */
  var NAME_INK = null;
  function nameInk() { if (!NAME_INK) NAME_INK = PERCH_INK.name.split('|').map(function (c) { return c ? c.split(';').map(function (q) { var a = q.split(','); return [+a[0], +a[1]]; }) : []; }); return NAME_INK; }
  function inkTops(c) { var I = nameInk()[c], o = []; if (!I) return o; for (var i = 0; i < I.length; i++) if (I[i][1] < PERCH_INK.h && I[i][1] - I[i][0] >= PERCH_INK.room) o.push(I[i][1] - 1); return o; }
  function wBoxes() { var b = HOST.words().boxes, k = 1 / (VW.bdpr || VW.dpr || 1), o = []; for (var i = 0; i < 5; i++) o.push([b[4 * i] * k, b[4 * i + 1] * k, b[4 * i + 2] * k, b[4 * i + 3] * k]); return o; }
  function nameMap() { var nv = HOST.words().nvb; if (!nv) return null; var k = 1 / (VW.bdpr || VW.dpr || 1); return [nv[0] * k, nv[1] * k, nv[2] * k]; }
  /* every ledge: its surface (CSS px, along x), where its middle is, its slope; the name's from its ink (every column's
     tops, so a curve's and a slope's too), each link's glyph tops and the credit's (made at build time: PERCH_INK) */
  function ledges() {
    if (PW.ledges) return PW.ledges;   // (made again when the words move: relayout)
    var B = wBoxes(), nm = nameMap();
    var out = [], c, i, k, sp = PERCH_INK.span;
    if (nm) for (c = sp; c < nameInk().length - sp; c += 2) {
      var T = inkTops(c);
      for (i = 0; i < T.length; i++) {
        var pts = [], ok = true;
        for (k = -sp; k <= sp && ok; k++) { var y = k ? nearTop(c + k, T[i]) : T[i]; if (!(y === y)) ok = false; else pts.push([nm[0] + ((c + k) * PERCH_INK.col + PERCH_INK.col / 2) * nm[2], nm[1] + y * nm[2]]); }
        if (ok) out.push({ kind: 'name', pts: pts, x: pts[sp][0], y: pts[sp][1], slope: (pts[2 * sp][1] - pts[0][1]) / Math.max(1e-6, pts[2 * sp][0] - pts[0][0]), k: 1 });
      }
    }
    for (var L = 0; L < 2; L++) {
      var b = B[3 + L]; if (!(b[2] > b[0])) continue;
      var em = (b[3] - b[1]) / 1.5, base = b[3] - 0.4286 * em, G2 = PERCH_INK.links[L], w = b[2] - b[0];
      for (i = 0; i < G2.length; i++) { var x0 = b[0] + G2[i][0] * w, x1 = b[0] + Math.min(G2[i][1], 1) * w, yl = base - 1.5 - (G2[i][2] - 0.035) * em; out.push({ kind: 'link', pts: [[x0, yl], [x1, yl]], x: 0.5 * (x0 + x1), y: yl, slope: 0, k: P_LINK_K }); }
    }
    var bc = B[2];
    if (bc[2] > bc[0]) {
      var ce = (bc[3] - bc[1]) / 1.55, cb = bc[1] + (bc[3] - bc[1] - 1.3 * ce) / 2 + 1.005 * ce, CR = PERCH_INK.credit;
      for (i = 0; i < CR.length; i++) {
        var cl = CR[i]; if (!cl) continue;
        var cx0 = bc[0] + (i + 0.18) * 0.6 * ce, cx1 = bc[0] + (i + 0.82) * 0.6 * ce, yc = cb - 1 - cl * ce;
        if (cx1 < bc[2]) out.push({ kind: 'link', pts: [[cx0, yc], [cx1, yc]], x: 0.5 * (cx0 + cx1), y: yc, slope: 0, k: P_LINK_K, credit: true });
      }
    }
    PW.ledges = out;
    return out;
  }
  function nearTop(c, y) { var T = inkTops(c), b = NaN; for (var i = 0; i < T.length; i++) if (Math.abs(T[i] - y) <= PERCH_INK.flat && !(Math.abs(b - y) <= Math.abs(T[i] - y))) b = T[i]; return b; }
  function surfY(pts, x) { if (x < pts[0][0] || x > pts[pts.length - 1][0]) return NaN; for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var w = (x - pts[i - 1][0]) / Math.max(1e-6, pts[i][0] - pts[i - 1][0]); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * w; } return NaN; }
  /* a perched bird's span on the window (CSS px) and so its depth (m) */
  function perchSpan(b, k) { return SPAN * view * b.S.size * PERCH.scale * (k || 1); }
  function perchDepth(b, k) { return (b.sz / MODEL_K) * (W / 2) / (VW.tanX * perchSpan(b, k)); }
  /* a window point at a depth, through camera C: the world point */
  function rayAt(C, x, y, D, o) {
    var nx = (2 * x / W - 1) * VW.tanX, ny = (1 - 2 * y / H) * VW.tanY;
    o[0] = C.pos[0] + D * (C.f[0] + C.r[0] * nx + C.u[0] * ny); o[1] = C.pos[1] + D * (C.f[1] + C.r[1] * nx + C.u[1] * ny); o[2] = C.pos[2] + D * (C.f[2] + C.r[2] * nx + C.u[2] * ny);
    return o;
  }
  /* where a perch is now (its foot point on the window, CSS px): a letter's ledge where the bird stands on it, or the tip */
  function perchFoot(P, o) {
    if (P.kind === 'pointer') { o[0] = PTR.x; o[1] = PTR.y; return o; }
    var L = ledges(), Lg = L[P.li]; if (!Lg || Lg.kind !== P.lk) { o[0] = NaN; return o; }
    var y = surfY(Lg.pts, P.x); o[0] = P.x; o[1] = y === y ? y : Lg.y;
    return o;
  }

  /* ---------------- choosing a perch ---------------- */
  function perchTaken(x, y, w) { for (var i = 0; i < PERCHED.length; i++) { var q = PERCHED[i].P; if (q && Math.abs(q.x - x) < w && Math.abs(q.fy - y) < 2 * w) return true; } return false; }
  function pickLedge(b, r) {
    var L = ledges(), n = L.length, i, k;
    if (!n) return null;
    for (k = 0; k < 24; k++) {
      i = Math.floor(r() * n); var Lg = L[i], w = 0.5 * perchSpan(b, Lg.k);
      if (Math.abs(Lg.slope) > 0.7) continue;   // (too steep to stand on)
      if (!PTR.gone && Math.abs(PTR.x - Lg.x) < 1.5 * w && Math.abs(PTR.y - Lg.y) < 2 * w) continue;   // (not under the pointer)
      if (perchTaken(Lg.x, Lg.y, 1.6 * w * 0.35 + 6)) continue;
      return { kind: Lg.kind, lk: Lg.kind, li: i, x: Lg.x, fy: Lg.y, k: Lg.k, foot: [0, 0], at: [0, 0, 0], v: [0, 0, 0], ok: false };
    }
    return null;
  }
  function perchCount() { var n = 0; for (var i = 0; i < PERCHED.length; i++) if (PERCHED[i].P && PERCHED[i].P.kind !== 'pointer') n++; return n; }
  /* a bird of the sky the letters could have: a perching kind, flying, in front of the camera, near enough */
  function wantsPerch(b) { return false; }   // (the flock's leader asks nothing: the noticing below picks a bird)
  function perchAsk(b) { }
  var VPN = [0, 0, 0];
  function notice(C) {
    VPN[0] = LVC.vx; VPN[1] = LVC.vy; VPN[2] = LVC.vz;
    if (PW.appr || t < PW.nextT || perchCount() >= PMAX || HOST.reduced()) return;
    if (!(PW.seekEnd > t)) PW.seekEnd = t + PSEEK;   // (this turn's look begins)
    PW.nextT = t + PLOOK;
    if (t >= PW.seekEnd) { PW.seekEnd = 0; PW.nextT = t + pick(POP.r, PNOTICE); return; }
    var best = null, bs = 0, i, j;
    for (i = 0; i < FLOCKS.length; i++) {
      var F = FLOCKS[i]; if (F.far || !KINDS[F.kind].perch) continue;
      for (j = 0; j < F.m.length; j++) {
        var b = F.m[j]; if (b.st !== 'fly') continue;
        var dx = b.p[0] - C.pos[0], dy = b.p[1] - C.pos[1], dz = b.p[2] - C.pos[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz), fwd = (dx * C.f[0] + dy * C.f[1] + dz * C.f[2]) / (d || 1);
        if (d < 40 || d > 300 || fwd < 0.2) continue;
        if (!canHold(b, VPN)) continue;
        var T = d / closeMax(b, VPN, -dx / d, -dy / d, -dz / d, d);   // (how soon it could be there: the perch moves as the camera does)
        if (T > PREACH) continue;
        var sc = (0.5 + POP.r()) / T;
        if (sc > bs) { bs = sc; best = b; }
      }
    }
    if (!best) return;
    PW.seekEnd = 0; PW.nextT = t + pick(POP.r, PNOTICE);
    /* from a flock: one to three of it come down, the rest fly on */
    var F0 = best.F, nd = F0.m.length > 2 ? 1 + Math.floor(POP.r() * Math.min(3, F0.m.length - 1)) : 1, list = [best];
    for (j = 0; j < F0.m.length && list.length < nd; j++) if (F0.m[j] !== best && F0.m[j].st === 'fly') list.push(F0.m[j]);
    for (j = 0; j < list.length && perchCount() + j < PMAX; j++) {
      var P = pickLedge(list[j], list[j].r); if (!P) break;
      startApproach(list[j], P, j * pick(list[j].r, [0.6, 1.4]));
    }
  }
  /* the pointer resting (slow, in open sky) long enough: a bird of the sky may come to its tip */
  function noticePointer(C) {
    if (PTR.gone || PTR.down || PTR.steer || HOST.reduced() || PW.appr || t < PW.ptrNext || PW.ptrStill < PJ.setout) return;
    if (PTR.x < 40 || PTR.y < 40 || PTR.x > W - 40 || PTR.y > H - 40) return;
    for (var q = 0; q < PERCHED.length; q++) if (PERCHED[q].P.kind === 'pointer') return;
    PW.ptrNext = t + PLOOK;   // (looked for again soon while it rests; the gap only once a bird comes)
    VPN[0] = LVC.vx; VPN[1] = LVC.vy; VPN[2] = LVC.vz;
    var best = null, bd = 1e9;
    for (var i = 0; i < BIRDS.length; i++) {
      var b = BIRDS[i]; if (b.st !== 'fly' || !b.K.perch || (b.F && b.F.far)) continue;
      var dx = b.p[0] - C.pos[0], dy = b.p[1] - C.pos[1], dz = b.p[2] - C.pos[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz), fwd = (dx * C.f[0] + dy * C.f[1] + dz * C.f[2]) / (d || 1);
      if (d < 40 || d > 300 || fwd < 0.2) continue;
      if (!canHold(b, VPN)) continue;
      var T = d / closeMax(b, VPN, -dx / d, -dy / d, -dz / d, d);   // (how soon it could be on the tip: the tip moves with the camera)
      if (T < bd && T <= PREACH) { bd = T; best = b; }
    }
    if (best) PW.ptrNext = t + pick(POP.r, PJ.gap);
    if (best) startApproach(best, { kind: 'pointer', lk: 'pointer', li: -1, x: PTR.x, fy: PTR.y, k: P_PTR_K, foot: [0, 0], at: [0, 0, 0], v: [0, 0, 0], ok: false }, 0);
  }

  /* ---------------- the approach ---------------- */
  function startApproach(b, P, delay) {
    splitOff(b);
    b.st = 'appr'; b.P = P; b.vLo = airLo(b); b.vHi = airHi(b); P.t0 = t + (delay || 0); P.tries = 0; P.d0 = 0; P.tau0 = 0; P.go = 0;
    P.D = perchDepth(b, P.k); P.rest = null;
    PW.appr = b; PERCHED.push(b);
    STATS.approaches = (STATS.approaches || 0) + 1;
  }
  /* the perch's place in the world now (its body's rest point: over its foot by its standing height) and its motion */
  var PQ = [0, 0, 0], PF2 = [0, 0];
  function perchWorld(b, C, dt) {
    var P = b.P; perchFoot(P, PF2);
    if (!(PF2[0] === PF2[0])) return false;
    var up = P.rest ? P.rest : 0.42 * perchSpan(b, P.k);   // (CSS px from its foot to its body: the rest rule's, once it is known)
    rayAt(C, PF2[0], PF2[1] - up, P.D, PQ);
    if (P.ok && dt > 0) { var k = Math.min(1, dt / 0.12); for (var i = 0; i < 3; i++) P.v[i] += ((PQ[i] - P.at[i]) / dt - P.v[i]) * k; }
    else { P.v[0] = LVC.vx; P.v[1] = LVC.vy; P.v[2] = LVC.vz; }
    P.at[0] = PQ[0]; P.at[1] = PQ[1]; P.at[2] = PQ[2]; P.ok = true; P.foot[0] = PF2[0]; P.foot[1] = PF2[1];
    return true;
  }
  /* a landing's airspeeds: a gull's whole range, not its cruise's (slow flight down to 0.55 of its pace, a powered
     burst or a shallow dive up to 1.75 of it), so it can hold a perch that rides the camera through the wind (into a
     head wind it must fly the camera's speed and the wind's; with a tail wind, slower); airLo/airHi */
  function airLo(b) { return 0.55 * b.K.v; }
  function airHi(b) { return 1.75 * b.K.v; }
  /* the airspeed it needs to keep pace with the perch (the perch's velocity less the wind's) */
  function airNeed(Vp) { var x = Vp[0] - WINDV[0], y = Vp[1], z = Vp[2] - WINDV[2]; return Math.sqrt(x * x + y * y + z * z); }
  function canHold(b, Vp) { var n = airNeed(Vp); return n <= 0.95 * airHi(b) && n >= 0.8 * airLo(b); }
  /* the most it can close on the perch along the line to it (m/s), its velocity over the ground the perch's less the
     closing, its airspeed within the landing's range (a bird ahead of the perch is caught up by it: it flies on the
     perch's way, slower; one beside it comes in sideways, quicker); never under 2, never so quick it arrives in under
     3 s */
  function closeMax(b, Vp, ex, ey, ez, d) {
    var vx = Vp[0] - WINDV[0], vy = Vp[1], vz = Vp[2] - WINDV[2], pe = vx * ex + vy * ey + vz * ez, vv = vx * vx + vy * vy + vz * vz;
    var vm = 0.9 * airHi(b), vn = airLo(b), qo = pe * pe - vv + vm * vm, qi = pe * pe - vv + vn * vn;
    /* its airspeed at a closing vc: sqrt(vv - 2 pe vc + vc^2), least at vc = pe. Under its slowest only between the roots
       pe -+ sqrt(qi): the slower side kept where it is there (no turning about), else the quicker side */
    var outer = qo > 0 ? pe + Math.sqrt(qo) : 0, vc;
    if (qi <= 0) vc = outer;
    else { var inner = pe - Math.sqrt(qi), upper = pe + Math.sqrt(qi); vc = inner >= 2 ? inner : outer >= upper ? outer : 0; }
    return clamp(Math.min(vc, d / 3), 2, 0.9 * b.K.v);
  }
  function bump(s) { var a = PDIP[0]; return s <= 0 ? 0 : s < a ? Math.sin(0.5 * Math.PI * s / a) : s < 1 ? Math.cos(0.5 * Math.PI * (s - a) / (1 - a)) : 0; }
  var AV = [0, 0, 0];
  function approachStep(b, dt, C) {
    var P = b.P;
    if (t < P.t0) { wingNow(b); var wv = b.F ? goalVel(b.F, b, dt) : [b.v[0], b.v[1], b.v[2]]; flyTo(b, dt, wv[0], wv[1], wv[2]); return; }
    if (!perchWorld(b, C, dt)) { giveUp(b); return; }
    var rx = b.p[0] - P.at[0], ry = b.p[1] - P.at[1], rz = b.p[2] - P.at[2], d = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (!canHold(b, P.v)) { goRound(b, 'fast'); return; }   // (the perch, through the wind, outruns it or is too slow for it)
    if (!P.d0) { P.d0 = Math.max(d, 8); P.tau0 = P.d0 / closeMax(b, P.v, rx / (d || 1), ry / (d || 1), rz / (d || 1), P.d0); P.ts = t; }
    var tau = P.tau0 - PTAU * (t - P.ts), dLaw = P.d0 * Math.pow(Math.max(tau, 0) / P.tau0, 1 / PTAU);
    /* fallen behind the law (it could not close as fast): planned again from here, three times at most, then round */
    if (d > 1.6 * dLaw + 3 || d > P.d0 * 1.25 + 10) { if (++P.go > 3) { goRound(b, 'away'); return; } P.d0 = 0; return; }
    if (tau <= PFLARE) { b.st = 'land'; P.tl = t; P.tauL = Math.max(tau, 0.2); P.r0 = [rx, ry, rz]; return; }
    /* matched to the perch's motion, then closing: aimed at the dipped way's point, at the closing tau asks */
    var s = clamp(1 - d / P.d0, 0, 1), yo = -PDIP[1] * P.d0 * bump(s);
    var ex = rx, ey = ry - yo, ez = rz, el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1, vc = d / Math.max(tau, 0.2);
    AV[0] = P.v[0] - ex / el * vc; AV[1] = P.v[1] - ey / el * vc; AV[2] = P.v[2] - ez / el * vc;
    clearOfEye(b, AV);
    b.flapA = b.flap = s < 0.45 ? 1 : 0;   // (down with strong beats; up into it gliding)
    flyTo(b, dt, AV[0], AV[1], AV[2]);
  }
  /* the flare: the last tenths, its place the perch's less what is left of the way (closing at the same tau-dot, to
     nothing): its body pitched up to near upright, its wings forward and spread as brakes, its feet out */
  function landStep(b, dt, C) {
    var P = b.P;
    if (!perchWorld(b, C, dt)) { giveUp(b); return; }
    var u = clamp((t - P.tl) / (P.tauL / PTAU), 0, 1), left = Math.pow(1 - u, 1 / PTAU), px = b.p[0], py = b.p[1], pz = b.p[2];
    b.p[0] = P.at[0] + P.r0[0] * left; b.p[1] = P.at[1] + P.r0[1] * left; b.p[2] = P.at[2] + P.r0[2] * left;
    b.v[0] = (b.p[0] - px) / dt; b.v[1] = (b.p[1] - py) / dt; b.v[2] = (b.p[2] - pz) / dt;
    b.flareU = u;
    if (u >= 1) touchDown(b, C);
  }
  function goRound(b, why) {
    var P = b.P; P.tries++;
    STATS.goRounds = (STATS.goRounds || 0) + 1;
    if (P.tries > 1 || why === 'fast') { giveUp(b); return; }
    /* once round: out at least 3 spans past where it was, then in again */
    b.st = 'round'; P.rT = t; P.d0 = 0;
  }
  function roundStep(b, dt, C) {
    var P = b.P; wingNow(b);
    perchWorld(b, C, dt);
    var rx = b.p[0] - P.at[0], rz = b.p[2] - P.at[2], rl = Math.sqrt(rx * rx + rz * rz) || 1, out = Math.max(3 * b.sz, 25);
    var h = Math.atan2(rx, rz) + 0.9, v = b.K.v;
    AV[0] = P.v[0] * 0.6 + v * Math.sin(h); AV[1] = 0.2 * (P.at[1] + 8 - b.p[1]); AV[2] = P.v[2] * 0.6 + v * Math.cos(h);
    clearOfEye(b, AV);
    flyTo(b, dt, AV[0], AV[1], AV[2]);
    if (t - P.rT > 4 && rl > out) { b.st = 'appr'; P.d0 = 0; }
    if (t - P.rT > 14) giveUp(b);
  }
  function giveUp(b) {
    STATS.giveUps = (STATS.giveUps || 0) + 1;
    toAir(b, null);
  }
  /* the touch: its feet are the perch's from now; it settles */
  function touchDown(b, C) {
    var P = b.P;
    b.st = 'perch'; P.tt = t; if (PW.appr === b) PW.appr = null;
    /* its attitude on the perch from its attitude now (the flare's): its heading about the camera's up, as it came */
    var fx = b.v[0] - WINDV[0], fz = b.v[2] - WINDV[2];   // (its way through the air: as its body lay)
    var fr = fx * C.r[0] + fz * C.r[2], ff = fx * C.f[0] + fz * C.f[2];
    P.yaw = Math.abs(fr) + Math.abs(ff) > 0.05 ? Math.atan2(fr, ff) / DEG : (P.foot[0] < W / 2 ? -1 : 1) * 60;
    P.yaw0 = P.yaw; P.yawT = t; P.yawTo = P.yaw; P.pitch = PERCH.pitch; P.face = P.yaw >= 0 ? 1 : -1;
    P.stay = t + pick(b.r, PSTAY); P.nextAct = t + pick(b.r, [1.2, 2.5]); P.act = null; P.walk = null; P.swing = 0; P.swingV = 0;
    b.v[0] = P.v[0]; b.v[1] = P.v[1]; b.v[2] = P.v[2];
    STATS.landings = (STATS.landings || 0) + 1;
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
  function perchedStep(b, dt, C) {
    var P = b.P, r = b.r;
    if (!perchWorld(b, C, dt)) { leave(b, 'lost'); return; }
    b.p[0] = P.at[0]; b.p[1] = P.at[1]; b.p[2] = P.at[2]; b.v[0] = P.v[0]; b.v[1] = P.v[1]; b.v[2] = P.v[2];
    if (P.kind === 'pointer') {   /* on the tip: the feet the tip's, the body a pendulum to its motion; off when it moves fast */
      var ax = PW.pax, ay = PW.pay, w0 = TAU * 2.5;
      P.swingV += (-w0 * w0 * P.swing - 2 * 0.35 * w0 * P.swingV - 0.002 * ax) * dt; P.swing += P.swingV * dt; P.swing = clamp(P.swing, -0.6, 0.6);
      var sp = Math.sqrt(PW.pvx * PW.pvx + PW.pvy * PW.pvy);
      if (PTR.gone || PTR.steer || sp > PJ.jerk || PTR.x < 20 || PTR.y < 20 || PTR.x > W - 20 || PTR.y > H - 20) { leave(b, 'tip'); return; }
    }
    if (P.walk && t >= P.walk.t0) {   /* a side-step (or a walk along the stroke): a hop of a step, pausing between */
      var wk = P.walk, k = Math.floor((t - wk.t0) / 0.45), f = ((t - wk.t0) % 0.45) / 0.22;
      if (k >= wk.n) { P.x = wk.x0 + wk.dir * wk.step * wk.n; P.walk = null; }
      else { P.x = wk.x0 + wk.dir * wk.step * (k + gss(Math.min(1, f))); P.hop = f < 1 ? Math.sin(Math.PI * f) : 0; }
      var Lg = ledges()[P.li]; if (Lg && (P.x < Lg.pts[0][0] || P.x > Lg.pts[Lg.pts.length - 1][0])) { var L2 = nearLedge(P.x, P.fy, P.li); if (L2 >= 0) P.li = L2; else { P.x = clamp(P.x, Lg.pts[0][0], Lg.pts[Lg.pts.length - 1][0]); P.walk = null; } }
    } else P.hop = 0;
    /* its turns: by steps, never a rotation in place; now and then a hop round */
    if (P.yawTo !== P.yaw && t - P.yawT >= P.yawD) P.yaw = P.yawTo;
    if (t >= P.nextAct && !P.act && !P.walk) {
      var want = wantYaw(b), u = r();
      if (Math.abs(angDiff(want * DEG, P.yaw * DEG)) > 60 * DEG || u < 0.18) { P.yaw0 = P.yaw; P.yawTo = want; P.yawT = t; P.yawD = pick(r, [0.2, 0.4]); P.hopTurn = true; P.face = want >= 0 ? 1 : -1; }
      else if (u < 0.62) { P.yaw0 = P.yaw; P.yawTo = clamp(P.yaw + (r() < 0.5 ? -1 : 1) * pick(r, [10, 30]), -120, 120); P.yawT = t; P.yawD = pick(r, [0.12, 0.2]); P.hopTurn = false; }
      else if (u < 0.74 && P.kind === 'name') { P.walk = { dir: r() < 0.5 ? -1 : 1, n: 1 + Math.floor(r() * 3), step: 0.08 * perchSpan(b, P.k), t0: t, x0: P.x }; }
      else if (u < 0.86 && t - (P.lastComfort || -1e9) > 12) { P.act = { k: r() < 0.5 ? 'wings' : 'rouse', t0: t, T: pick(r, [0.9, 1.6]) }; P.lastComfort = t; }
      P.nextAct = t + pick(r, [5, 20]);
    }
    if (P.act && t - P.act.t0 > P.act.T) P.act = null;
    /* it leaves: by its own wish, or to a flock of its kind passing */
    if (t >= P.stay) { leave(b, 'wish'); return; }
    if (P.kind !== 'pointer' && STATS.steps % 20 === b.id % 20) { var J = passingFlock(b, C); if (J) { leave(b, 'join', J); return; } }
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
  /* the crouch and the lean (0.1-0.3 s), the leap, the strong beats; then a bird of the air on a goal (to the flock
     that passes, or one any bird may draw: out into the distance, by the eye, down into the cloud, on) */
  function leave(b, why, J) {
    var P = b.P; if (!P || P.leaving) return;
    if (b.st !== 'perch') { toAir(b, J); return; }
    P.leaving = { t0: t, why: why, J: J, tc: why === 'startle' ? pick(b.r, [0.05, 0.12]) : pick(b.r, [0.12, 0.3]) };
    STATS.leaves = (STATS.leaves || 0) + 1;
  }
  function leavingStep(b, dt, C) {
    var P = b.P, L = P.leaving, u = t - L.t0;
    if (!perchWorld(b, C, dt)) { toAir(b, L.J); return; }
    if (u < L.tc) { b.p[0] = P.at[0]; b.p[1] = P.at[1]; b.p[2] = P.at[2]; b.v[0] = P.v[0]; b.v[1] = P.v[1]; b.v[2] = P.v[2]; P.crouch = Math.sin(0.5 * Math.PI * u / L.tc); return; }
    /* the leap: off the perch at its own push, away from the words and up */
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
      if (b.F && b.F !== J) { var F0 = b.F, j = F0.m.indexOf(b); if (j >= 0) F0.m.splice(j, 1); if (!F0.m.length) { var k = FLOCKS.indexOf(F0); if (k >= 0) FLOCKS.splice(k, 1); } }
      b.F = J; b.slot = [J.m.length * 1.9, (J.m.length % 2 ? 1 : -1) * Math.ceil(J.m.length / 2) * 1.2, 0.3]; J.m.push(b);
      STATS.rejoins = (STATS.rejoins || 0) + 1;
    } else {
      if (!b.F) { var F = { id: ++POP.k, kind: b.kind, pat: 'single', r: b.r, m: [b], lead: b, goal: null, t0: t, far: false }; b.F = F; FLOCKS.push(F); }
      var r = b.r, g = weighted(r, [['out', 30], ['commute', 35], ['sink', 15], ['pass', 20]]);
      if (g === 'pass' && t < POP.passT) g = 'commute';
      if (g === 'pass') POP.passT = t + pick(r, PASS_GAP);
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
    STATS.startles = (STATS.startles || 0) + 1;
  }
  /* a click: a bird of the sky where it was clicked, in the world (at a gull's distance there), off on its way */
  var CQ = [0, 0, 0];
  function clickBird(x, y, C) {
    if (HOST.reduced() || FORCED) return;
    if (liveCount() > (LIVE_N[skyCls()] || 6) + 4) return;
    var r = vstream(8000 + (++PW.k)), kind = weighted(r, [['gull', 70], ['crow', 20], ['swallow', 10]]);
    var b0 = { S: SORTS[kind], sz: B_SPAN * SORTS[kind].size * MODEL_K }, D = perchDepth(b0, 0.55);   // (a little beyond the perches: its span about 2.3 a mid bird's there, so it can come down soon)
    rayAt(C, x, y, D, CQ);
    var F = newFlock(CQ[0], CQ[1], CQ[2], Math.atan2(C.f[0], C.f[2]) + (x < W / 2 ? -0.9 : 0.9), skyCls(), ['single', kind, 1]), b = F.lead;
    b.v[0] = LVC.vx + C.u[0] * 3; b.v[1] = LVC.vy + C.u[1] * 3; b.v[2] = LVC.vz + C.u[2] * 3;
    var ax = b.v[0] - WINDV[0], az = b.v[2] - WINDV[2]; b.psi = Math.atan2(ax, az); b.V = Math.max(b.K.v, Math.sqrt(ax * ax + az * az)); b.gam = 10 * DEG;
    b.burst = { t0: t, n: 4 + Math.floor(r() * 2) };
    STATS.clicks = (STATS.clicks || 0) + 1;
  }

  /* ---------------- each step, and the state machine ---------------- */
  var LVC_F = [0, 0, 1], LVC_R = [1, 0, 0];
  function perchesStep(C, dt) {
    LVC_F[0] = C.f[0]; LVC_F[2] = C.f[2]; LVC_R[0] = C.r[0]; LVC_R[2] = C.r[2];
    pointerStep(dt, C);
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
  function gss(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
