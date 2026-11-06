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
  var PTAU = 0.75;             // the closing's tau-dot
  var PDAMP = 0.8;             // the share of its drift across the line to the perch it takes out each step of the last leg
  var PQUICK = 6;              // m/s: the closing a bird already in view needs to come straight in (else by the gate)
  var PGATE = 30;              // m: the gate's depth past the perch (the last leg's length: the research's last 30 m, in view)
  var PLAND = [1.2, 10];       // the last of a landing (a curve to rest: landStep) from this tau (s) or this range (m)
  var PFLARE = 0.6;            // s of tau: the flare (the feet out from 0.15)
  var PNOTICE = [16, 34];      // s between the letters' turns to have a bird (one at a time) ...
  var PSEEK = 20;              // ... each turn looking this long (every PLOOK s) for a bird that can be there soon (PREACH s): the perch moves
  var PLOOK = 0.5, PREACH = 20;   // with the camera, so only a bird near it or beside its way can come down in a believable time
  var PDWELL = 8;              // s down before a passing flock may take it (just landed, it settles first)
  var PSTAY = [25, 90];        // s on a perch, by its own wish
  var PFIRST = 6;              // s: the first noticing
  var PJ = { slow: 40, setout: 1.0, first: 3, gap: [12, 22], jerk: 900, jab: 300, rest: 0.6 };
  var PERCHED = [], PW = { k: 0, nextT: PFIRST, appr: null, ptrNext: PJ.first, ptrStill: 0, px: -1, py: -1, pvx: 0, pvy: 0, pax: 0, pay: 0, ptrT: -1, ptr: null, ledges: null, ledgeKey: '', clk: [], jabT: -1e9, seekEnd: 0 };
  var PTR = { x: 0, y: 0, n: 0, gone: true, down: false, steer: false, touch: false };

  /* ---------------- the ledges (the words' ink, on this window) ---------------- */
  var NAME_INK = null;
  function nameInk() { if (!NAME_INK) NAME_INK = PERCH_INK.name.split('|').map(function (c) { return c ? c.split(';').map(function (q) { var a = q.split(','); return [+a[0], +a[1]]; }) : []; }); return NAME_INK; }
  function inkTops(c) { var I = nameInk()[c], o = []; if (!I) return o; for (var i = 0; i < I.length; i++) if (I[i][1] < PERCH_INK.h && I[i][1] - I[i][0] >= PERCH_INK.room) o.push(I[i][1] - 1); return o; }
  /* the name's ledges in its own units (x, y pairs along each), made once: a relayout only maps them */
  var NAME_LEDGES = null;
  function nameLedges() {
    if (NAME_LEDGES) return NAME_LEDGES;
    var out = [], sp = PERCH_INK.span, nc = nameInk().length, TOPS = [], c, i, k;
    for (c = 0; c < nc; c++) TOPS.push(inkTops(c));
    for (c = sp; c < nc - sp; c += 2) {
      var T = TOPS[c];
      for (i = 0; i < T.length; i++) {
        var U = [], ok = true;
        for (k = -sp; k <= sp && ok; k++) { var y = k ? nearTop(TOPS[c + k], T[i]) : T[i]; if (!(y === y)) ok = false; else U.push((c + k) * PERCH_INK.col + PERCH_INK.col / 2, y); }
        if (ok) out.push(U);
      }
    }
    return (NAME_LEDGES = out);
  }
  function wBoxes() { var b = HOST.words().boxes, k = 1 / (VW.bdpr || VW.dpr || 1), o = []; for (var i = 0; i < 5; i++) o.push([b[4 * i] * k, b[4 * i + 1] * k, b[4 * i + 2] * k, b[4 * i + 3] * k]); return o; }
  function nameMap() { var nv = HOST.words().nvb; if (!nv) return null; var k = 1 / (VW.bdpr || VW.dpr || 1); return [nv[0] * k, nv[1] * k, nv[2] * k]; }
  /* every ledge: its surface (CSS px, along x), where its middle is, its slope; the name's from its ink (every column's
     tops, so a curve's and a slope's too), each link's glyph tops and the credit's (made at build time: PERCH_INK) */
  function ledges() {
    if (PW.ledges) return PW.ledges;   // (made again when the words move: relayout)
    var B = wBoxes(), nm = nameMap();
    var out = [], c, i, k, sp = PERCH_INK.span;
    if (nm) { var NL = nameLedges();
      for (c = 0; c < NL.length; c++) {
        var U = NL[c], pts = [];
        for (k = 0; k < U.length; k += 2) pts.push([nm[0] + U[k] * nm[2], nm[1] + U[k + 1] * nm[2]]);
        out.push({ kind: 'name', pts: pts, x: pts[sp][0], y: pts[sp][1], slope: (pts[2 * sp][1] - pts[0][1]) / Math.max(1e-6, pts[2 * sp][0] - pts[0][0]), k: 1 });
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
  function nearTop(T, y) { var b = NaN; for (var i = 0; i < T.length; i++) if (Math.abs(T[i] - y) <= PERCH_INK.flat && !(Math.abs(b - y) <= Math.abs(T[i] - y))) b = T[i]; return b; }
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
      return perchRec(Lg.kind, i, Lg.x, Lg.y, Lg.k);
    }
    return null;
  }
  /* a perch: a ledge's place (kind, its index, x and its foot's y, CSS px) or the tip's, and every field a landing and
     a perched life set (one shape for every perch, so their steps stay optimised) */
  function perchRec(kind, li, x, fy, k) {
    return { kind: kind, lk: kind, li: li, x: x, fy: fy, k: k, foot: [0, 0], at: [0, 0, 0], v: [0, 0, 0], ok: false,
      t0: 0, tries: 0, d0: 0, tau0: 0, ts: 0, go: 0, D: 0, rest: null, gate: null, gated: false, gT: 0, rT: 0, tAt: undefined, tl: 0, r0: null, u0: null, T: 0,
      tt: 0, yaw: 0, yaw0: 0, yawT: 0, yawTo: undefined, yawD: 0, hopTurn: false, pitch: 0, face: 0, stay: 0, nextAct: 0, act: null, walk: null,
      swing: 0, swingV: 0, hop: 0, crouch: 0, leaving: null, lastComfort: 0, startleT: undefined };
  }
  function perchCount() { var n = 0; for (var i = 0; i < PERCHED.length; i++) if (PERCHED[i].P && PERCHED[i].P.kind !== 'pointer') n++; return n; }
  var VPN = [0, 0, 0];
  /* how soon a bird could be on a perch near the eye (s; Infinity: not in front, too near or far, or unable to keep its
     pace): the perch moves as the camera does (VPN) */
  function reachT(b, C, dmax) {
    var dx = b.p[0] - C.pos[0], dy = b.p[1] - C.pos[1], dz = b.p[2] - C.pos[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz), fwd = (dx * C.f[0] + dy * C.f[1] + dz * C.f[2]) / (d || 1);
    if (d < 40 || d > dmax || fwd < 0.2 || !canHold(b, VPN)) return Infinity;
    return d / closeMax(b, VPN, -dx / d, -dy / d, -dz / d, d);
  }
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
        var T = reachT(b, C, 200);
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
      var T = reachT(b, C, 300);
      if (T < bd && T <= PREACH) { bd = T; best = b; }
    }
    if (best) PW.ptrNext = t + pick(POP.r, PJ.gap);
    if (best) startApproach(best, perchRec('pointer', -1, PTR.x, PTR.y, P_PTR_K), 0);
  }

