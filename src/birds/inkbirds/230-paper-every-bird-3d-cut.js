  /* ---------------- the paper: every bird a 3D cut-paper body, posed by its own flight (birds3d) ---------------- */

  /* Each bird is the faceted M flown by the measured wing: posed every frame along its way through the air, banked as
     it turns, or standing on its perch; lit by the world's light; drawn by one instanced pass after the composite. */
  var LB = LABBIRD(window.FACETFORM, window.FACETPOSE, window.WINGMODEL, window.WINGMODEL_DATA), BW = BIRDWING(LB, window.WINGMODEL_DATA), FP = LB.P, FP2 = LB.flexPose(), NP = FP.NP, KMD = window.WINGMODEL_DATA.kinds;
  var NV = 46, NFAC = 30, P16MAP = window.FACETFORM.kinds.gull.p16, CHAIN = window.FACETFORM.kinds.gull.chain;   // (every kind's: the 16 points' vertices, -1 the body point; the leading edge's M)

  /* the glide with its load (the wing model's, no trims) */
  var ZTRIM = [0, 0, 0, 0, 0, 0, 1, 1, 1], GS0 = { flap: 0, ph: 0, k: 1, D: 0.5, a: 0, e: 0 }, GLW = { kind: 'gull', trim: ZTRIM }, GB3 = new Float64Array(3);
  function glide22(kind, out) { GLW.kind = kind; GLW.trim = ZTRIM; BW.poseS(GLW, GS0, 0, out, GB3); return out; }
  var MODEL_K = 1.19;          // the drawn model's span on its ink span (the glide seen from below and behind looks 0.64-0.75 of its span): paths and MPU unchanged
  var SPECK = 2;               // device px of span: under it a bird's wings and light are made one frame in four (drawPaper)
  var HOLD_POSE = [3, 8];      // device px of span: below 8 the beat's swing eases into the held glide, held in full at 3 (a speck holds its glide); from 8 px the measured beat in full, so a 1440 px desktop's birds (10-25 px) beat their whole stroke
  var TONE_T = 0.4;            // s: the bird's one tone eased (never a blink)
  var GLOW_ENC = 0.72, HALO_A = 0.14, HALO_E = [3, 2];   // night: the paper's own light (as encoded), the halo's strength and e-folding (CSS px: a desktop, a phone)
  var AOA = [1.5, 1];          // deg: the body's angle to its way through the air gliding, flapping (the body all but along its way, the wing's own incidence carrying the rest)
  var FILTER = [1, 1.5];       // device px: the edge's filter for a bird of 24 px and more, and for a speck of 4 and less

  /* ---------------- the pose: every bird, in the air or on a perch ---------------- */
  /* In the air its body lies along its way through the air (no sideslip), rolled by its own bank (the integrator's: the
     bank that turns it), pitched by its climb and its angle of attack, in the flare pitched up toward upright. Its
     wings: the measured wing at its own age (the schedule's bouts and glides), or the beats it is making now (the
     strong beats after a take-off or a click; the beats down into an approach), the glide set into the flare's brakes.
     On a perch it stands in the perch's frame (the camera's: the ledge is on the window), yawed and pitched as it
     stands, its feet on the ink (the rest rule, solved every frame from where the perch is drawn). A change from one
     to the other blends from the attitude last drawn (BLEND_T s): nothing snaps */
  var WO = { swing: 1 }, VV = [0, 0, 0], BLEND_T = [0.3, 0.35];
  var GP22 = new Float64Array(22), GT1 = new Float64Array(22), GT2 = new Float64Array(22), GOPT = { k: 1, D: undefined }, GBODY = new Float64Array(3), GMEAN = {};
  function smoothK(a, b, x) { return ease((x - a) / (b - a)); }
  function gmix(o, a, b, w) { for (var i = 0; i < 22; i++) o[i] = a[i] + (b[i] - a[i]) * w; return o; }
  function gbeat(kind, ph, k, out) { GOPT.k = k; GOPT.D = undefined; LB.cycle(kind, ph - Math.floor(ph), GOPT, out, GBODY); return out; }
  /* the perching kinds' mean beat, and the name's ledges, made at the boot (never in a landing's flare) */
  function prebuild() { for (var k in KINDS) if (KINDS[k].perch && FP.kinds[k] && KMD[k]) gmean(k); nameLedges(); }
  function gmean(kind) { if (GMEAN[kind]) return GMEAN[kind]; var M = FP.pose(), T = FP.pose(); for (var i = 0; i < 120; i++) { gbeat(kind, i / 120, 1, T); for (var j = 0; j < 22; j++) M[j] += T[j] / 120; } return (GMEAN[kind] = M); }
  var WIND_ON = true, WINDV = [0, 0, 0];
  function windNow() { if (WIND_ON && HOST.wind && !FORCED) HOST.wind(WINDV); else WINDV[0] = WINDV[1] = WINDV[2] = 0; return WINDV; }
  /* the basis now (forward, left, up: 9 numbers) into s.B, blended from the last one drawn while a change is fresh */
  function basis(s, fx, fy, fz, lx, ly, lz, zx, zy, zz) {
    var B = s.B, u = s.bT0 >= 0 ? clamp((TD - s.bT0) / s.bTT, 0, 1) : 1;
    if (u < 1 && s.bFrom) {
      var w = ease(u), F0 = s.bFrom;
      fx = F0[0] + (fx - F0[0]) * w; fy = F0[1] + (fy - F0[1]) * w; fz = F0[2] + (fz - F0[2]) * w;
      zx = F0[6] + (zx - F0[6]) * w; zy = F0[7] + (zy - F0[7]) * w; zz = F0[8] + (zz - F0[8]) * w;
      var fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= fl; fy /= fl; fz /= fl;
      var dz = zx * fx + zy * fy + zz * fz; zx -= dz * fx; zy -= dz * fy; zz -= dz * fz; var zl = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1; zx /= zl; zy /= zl; zz /= zl;
      lx = zy * fz - zz * fy; ly = zz * fx - zx * fz; lz = zx * fy - zy * fx;
    }
    B[0] = fx; B[1] = fy; B[2] = fz; B[3] = lx; B[4] = ly; B[5] = lz; B[6] = zx; B[7] = zy; B[8] = zz;
  }
  /* a change of state: blend from the last drawn basis */
  function blendFrom(s, T) { if (!s || !s.B) return; if (!s.bFrom) s.bFrom = new Float64Array(9); for (var i = 0; i < 9; i++) s.bFrom[i] = s.B[i]; s.bT0 = TD; s.bTT = T; }
  /* the wings in the air: the schedule's, or the beats it makes now (a burst: the first the biggest, about a fifth
     quicker than its level beat) */
  function wingsAir(b, s, rest) {
    var kind = s.kind, w0 = b.w, swing = smoothK(HOLD_POSE[0], HOLD_POSE[1], s.spanPx || 20), WS0 = null;
    WO.swing = swing; WO.rough = 0;
    var f = (w0 && w0.f) || 3, bu = b.burst;
    if (bu && !rest) {
      var ub = Math.max(0, TD - bu.t0), nb = ub * f * 1.2;
      if (nb < bu.n) { gbeat(kind, nb, 1.3 - 0.18 * Math.min(1, nb / bu.n), s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 1; return; }
      b.burst = null;
    }
    if (b.st === 'appr' && b.flapA !== undefined && !rest) {   // (down into the approach with strong beats, up into the perch gliding)
      if (b.flapA > 0) { gbeat(kind, AD * f * 1.1, 1.15, s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 1; return; }
      glide22(kind, s.P22); gmix(s.P22, s.P22, PERCH.poses.flare, 0.25 * smoothK(0.45, 1, b.P && b.P.d0 ? 1 - Math.min(1, dist3(b.p, b.P.at) / b.P.d0) : 0)); s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 0; return;
    }
    if (b.st === 'land') {   // (the flare: wings up and forward, braking beats, the feet out)
      var u = flareAt(b), GL = glide22(kind, GT2);
      gmix(GT1, GL, PERCH.poses.flare, smoothK(0, 0.5, u)); if (u > 0.75) gmix(GT1, GT1, PERCH.poses.touch, smoothK(0.75, 1, u));   // (the touch pose taken from the flare's, never from the glide: no snap at 0.75)
      gbeat(kind, f * 1.45 * Math.max(0, TD - b.P.tl), 0.9, GP22); var M = gmean(kind), wb = 0.45 * (1 - smoothK(0.55, 1, u));
      for (var j = 0; j < 22; j++) s.P22[j] = GT1[j] + wb * (GP22[j] - M[j]);
      s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = wb; return;
    }
    if (w0 && w0.wing && !b.wOff) { WS0 = BW.state(w0.wing, AD, s.WSD); BW.poseS(w0.wing, WS0, AD, s.P22, s.B3, WO); }   // (the wing as it is at the frame's own time)   // (a speck that works out no wing holds its glide)
    else { glide22(kind, s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; }
    s.flapW = WS0 ? WS0.e * swing : 0;
  }
  /* a change of what the wings are doing (a burst begun or ended, the approach's beats and glide, the flare, the perch,
     the leap): the pose carried over from the one last drawn, eased into the new one over XF_T s, never a snap */
  var XF_T = 0.22, XF_V = 0.06;
  function wingKey(b) { var k = b.st === 'fly' ? 1 : b.st === 'appr' ? 2 : b.st === 'round' ? 3 : b.st === 'land' ? 4 : 5; k = k * 8 + (b.burst ? 4 : 0) + (b.st === 'appr' ? (b.flapA === 1 ? 2 : b.flapA === 0 ? 1 : 0) : 0); return k; }   // (not the leave: perchPose eases into its opening itself)
  function wingXF(b, s) {
    var k = wingKey(b), i;
    if (s.xKey >= 0 && k !== s.xKey) { for (i = 0; i < 22; i++) { s.XF22[i] = s.LP22[i]; s.XV22[i] = s.LV22[i]; } for (i = 0; i < 3; i++) s.XB3[i] = s.LB3[i]; s.xFW = s.lFW; s.xT0 = TD; s.xT1 = s.lT; }
    s.xKey = k;
    if (s.xT0 >= 0) { var u = Math.max(0, TD - s.xT0) / XF_T; if (u >= 1) s.xT0 = -1; else { var w = ease(u), g = XF_V * (1 - Math.exp(-Math.max(0, TD - s.xT1) / XF_V)); for (i = 0; i < 22; i++) { var o = s.XF22[i] + s.XV22[i] * g; s.P22[i] = o + (s.P22[i] - o) * w; } for (i = 0; i < 3; i++) s.B3[i] = s.XB3[i] + (s.B3[i] - s.XB3[i]) * w; s.flapW = s.xFW + ((s.flapW || 0) - s.xFW) * w; } }   // (the pose, the glide's bank and the wings' angle of attack, all three)   // (from the old pose still moving as it was, its speed dying away over XF_V s: no stop at the change)
    var dl = TD - s.lT; for (i = 0; i < 22; i++) { s.LV22[i] = dl > 0 && dl < 0.1 ? (s.P22[i] - s.LP22[i]) / dl : 0; s.LP22[i] = s.P22[i]; } s.lT = TD; for (i = 0; i < 3; i++) s.LB3[i] = s.B3[i]; s.lFW = s.flapW || 0;
  }
  /* the flare's progress (0 to 1) at the frame's own time: landStep's sum, read at TD (b.flareU is the step's) */
  function flareAt(b) { var P = b.P; if (!P || !(P.T > 0)) return b.flareU || 0; var T = P.T, tf = Math.min(PFLARE, T); return clamp((Math.max(0, TD - P.tl) - (T - tf)) / tf, 0, 1); }
  function dist3(a, c) { var x = a[0] - c[0], y = a[1] - c[1], z = a[2] - c[2]; return Math.sqrt(x * x + y * y + z * z); }
  /* where a bird is at the frame's time: stepped this step, between where it was and is (q of the way back, by the
     loop's own alpha); else (a coarse speck) carried back along its way by bb s */
  var DP = [0, 0, 0];
  function drawnAt(b, q, bb, o) { for (var i = 0; i < 3; i++) o[i] = q > 0 ? b.p[i] - (b.p[i] - b.pp[i]) * q : b.p[i] - b.v[i] * bb; return o; }
  /* a bird in the air, posed: its place now (between the last two steps: back along its way), its basis, its wings */
  function poseFly(b, C, s, rest, back) {
    var kind = s.kind, i;
    drawnAt(b, QB, back, DP); var px = DP[0], py = DP[1], pz = DP[2];
    for (i = 0; i < 3; i++) VV[i] = b.v[i] - (b.v[i] - b.v0[i]) * QB - WINDV[i];   // (its way at the frame's time: between its last two steps)
    var vl = Math.sqrt(VV[0] * VV[0] + VV[1] * VV[1] + VV[2] * VV[2]);
    if (!(vl > 0.3)) { VV[0] = Math.sin(b.psi); VV[1] = 0; VV[2] = Math.cos(b.psi); vl = 1; }
    var fx = VV[0] / vl, fy = VV[1] / vl, fz = VV[2] / vl;
    var lx = fz, lz = -fx, ll = Math.sqrt(lx * lx + lz * lz) || 1; lx /= ll; lz /= ll; var ly = 0;
    var ux = fy * lz - fz * ly, uy = fz * lx - fx * lz, uz = fx * ly - fy * lx;
    if (!s.hold) { wingsAir(b, s, rest); wingXF(b, s); }
    var fu = b.st === 'land' ? flareAt(b) : 0, flare = 80 * smoothK(0, 0.85, fu);
    var aoa = (AOA[0] + (AOA[1] - AOA[0]) * (s.flapW || 0) + flare) * DEG, ca = Math.cos(aoa), sa = Math.sin(aoa);
    var bxx = fx * ca + ux * sa, bxy = fy * ca + uy * sa, bxz = fz * ca + uz * sa;
    var bzx = ux * ca - fx * sa, bzy = uy * ca - fy * sa, bzz = uz * ca - fz * sa;
    var rr = -(b.phi - (b.phi - b.phi0) * QB) * (1 - fu), cr = Math.cos(rr), sr = Math.sin(rr);
    var byx = lx * cr + bzx * sr, byy = ly * cr + bzy * sr, byz = lz * cr + bzz * sr;
    var bzx2 = bzx * cr - lx * sr, bzy2 = bzy * cr - ly * sr, bzz2 = bzz * cr - lz * sr;
    if (b.st === 'land' && b.P && b.P.landYaw) {   // (the landing: its attitude eased over the flare into the perched one it will stand in, the touch's yaw decided at the last leg's start)
      var wl = smoothK(0, 1, fu);
      if (wl > 0) {
        perchBasis(C, b.P.yaw, PERCH.pitch * DEG, 0, PB9);
        bxx += (PB9[0] - bxx) * wl; bxy += (PB9[1] - bxy) * wl; bxz += (PB9[2] - bxz) * wl; bzx2 += (PB9[6] - bzx2) * wl; bzy2 += (PB9[7] - bzy2) * wl; bzz2 += (PB9[8] - bzz2) * wl;
        var fl2 = Math.sqrt(bxx * bxx + bxy * bxy + bxz * bxz) || 1; bxx /= fl2; bxy /= fl2; bxz /= fl2;
        var dz2 = bzx2 * bxx + bzy2 * bxy + bzz2 * bxz; bzx2 -= dz2 * bxx; bzy2 -= dz2 * bxy; bzz2 -= dz2 * bxz;
        var zl2 = Math.sqrt(bzx2 * bzx2 + bzy2 * bzy2 + bzz2 * bzz2) || 1; bzx2 /= zl2; bzy2 /= zl2; bzz2 /= zl2;
        byx = bzy2 * bxz - bzz2 * bxy; byy = bzz2 * bxx - bzx2 * bxz; byz = bzx2 * bxy - bzy2 * bxx;
      }
    }
    basis(s, bxx, bxy, bxz, byx, byy, byz, bzx2, bzy2, bzz2);
    place(b, s, C, px, py, pz);
    return true;
  }
  /* the 46 vertices from its pose, scaled to its size, turned by its basis, from the camera; the 16 points beside them */
  function place(b, s, C, px, py, pz) {
    var V = s.V46, F = s.F46, i;
    if (!sameFlex(s)) LB.flexOf(s.kind, s.P22, F);
    for (i = 0; i < 3 * NV; i++) V[i] = F[i];
    LB.bodyOn(NV, s.B3, V);
    placeAt(b, s, C, px, py, pz, V);
  }
  /* the pose the flexing form (F46) was last made from: the same kind and pose (a speck holds its glide: HOLD_POSE)
     make the same form, so it is kept; the body's heave, surge and bank go on it afresh each frame (LB.geom's sums) */
  function sameFlex(s) {
    var P = s.P22, G = s.G22, i, same = s.gKind === s.kind;
    for (i = 0; i < 22 && same; i++) same = G[i] === P[i];
    if (same) return true;
    for (i = 0; i < 22; i++) G[i] = P[i];
    s.gKind = s.kind;
    return false;
  }
  /* ... the same geometry V moved to (px, py, pz): the rest rule's tries rebuild nothing */
  function placeAt(b, s, C, px, py, pz, V) {
    var i, sp = b.sz, B = s.B;
    var ox = px - C.pos[0], oy = py - C.pos[1], oz = pz - C.pos[2], X = s.X46;
    for (i = 0; i < NV; i++) {
      var x = V[3 * i] * sp, y = V[3 * i + 1] * sp, z = V[3 * i + 2] * sp;
      X[3 * i] = ox + x * B[0] + y * B[3] + z * B[6]; X[3 * i + 1] = oy + x * B[1] + y * B[4] + z * B[7]; X[3 * i + 2] = oz + x * B[2] + y * B[5] + z * B[8];
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = ox; s.X16[3 * i + 1] = oy; s.X16[3 * i + 2] = oz; } else { s.X16[3 * i] = X[3 * vi]; s.X16[3 * i + 1] = X[3 * vi + 1]; s.X16[3 * i + 2] = X[3 * vi + 2]; } }
    s.body[0] = ox; s.body[1] = oy; s.body[2] = oz;
  }
  /* the perched pose: settling (touch, half folded, loose, folded: two or three small adjustments), its own breath (its
     own slow noise, never a clock's sine), its wings raised or a rouse, a crouch to leave, a hop (a turn or a step) */
  function perchPose(b, s) {
    var P = b.P, kind = s.kind, Q = PERCH.poses, u = Math.max(0, TD - P.tt);
    if (u < 0.25) gmix(s.P22, Q.touch, Q.foldHalf, smoothK(0, 0.25, u));
    else if (u < 0.6) gmix(s.P22, Q.foldHalf, Q.foldLoose, smoothK(0.25, 0.6, u));
    else gmix(s.P22, Q.foldLoose, Q.fold, smoothK(0.6, 0.95, u));
    var br = 2.4 * wave(b.vK + 7, AD / 3.1), bh = 1.8 * wave(b.vK + 19, AD / 2.3);
    s.P22[0] += br; s.P22[NP] += br; s.P22[4] += bh; s.P22[NP + 4] += bh;
    var A = P.act;
    if (A) {
      var ua = (TD - A.t0) / A.T, wa = Math.sin(Math.PI * clamp(ua, 0, 1));
      if (A.k === 'wings') gmix(s.P22, s.P22, Q.open, 0.7 * ease(1.4 * wa));   // (both wings raised: a lifted M, and let down)
      else { var sk = 7 * wa * Math.sin(TAU * 7.5 * ua * A.T); s.P22[0] += sk; s.P22[NP] += sk; s.P22[4] -= 0.7 * sk; s.P22[NP + 4] -= 0.7 * sk; }   // (a rouse: a quick shake)
    }
    if (P.leaving) gmix(s.P22, s.P22, Q.open, ease((TD - P.leaving.t0) / Math.max(0.05, P.leaving.tc)));
    s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 0;
  }
  /* the perched pose's scratch; tilt turns a vector by the perch's elevation (PERCH.el, in TCE/TSE) about the camera's right */
  var RQ = [0, 0, 0], PFD = [0, 0], F0V = [0, 0, 0], L0V = [0, 0, 0], U0V = [0, 0, 0], T1 = [0, 0, 0], T2 = [0, 0, 0], T3 = [0, 0, 0], TCE = 1, TSE = 0;
  function tilt(C, v0, v1, v2, o) { var a = v0 * C.u[0] + v1 * C.u[1] + v2 * C.u[2], bb = v0 * C.f[0] + v1 * C.f[1] + v2 * C.f[2], c = v0 * C.r[0] + v1 * C.r[1] + v2 * C.r[2], a2 = a * TCE + bb * TSE, b2 = bb * TCE - a * TSE; o[0] = C.r[0] * c + C.u[0] * a2 + C.f[0] * b2; o[1] = C.r[1] * c + C.u[1] * a2 + C.f[1] * b2; o[2] = C.r[2] * c + C.u[2] * a2 + C.f[2] * b2; }
  /* the rest rule: its body over its foot (CSS px up from it) by as much as puts its lowest drawn points on the
     surface (a letter's ink under them; on the tip, the tip), with its pose and basis as they are */
  function restSolve(b, C, s, fxp, fyp, lift, V, at) {
    if (!V) { LB.geom(s.kind, s.P22, s.B3, s.V46, 'this'); V = s.V46; }
    var P = b.P, sp = perchSpan(b, P.k), up = P.rest || 0.42 * sp, k2 = (W / 2) / VW.tanX, lg = P.kind === 'pointer' ? null : ledges()[P.li], i;
    if (at !== undefined) { rayAt(C, fxp, fyp - at - lift * sp, P.D, RQ); placeAt(b, s, C, RQ[0], RQ[1], RQ[2], V); return at; }   // (placed at a rest given, not solved)
    for (var it = 0; it < 4; it++) {
      rayAt(C, fxp, fyp - up - lift * sp, P.D, RQ);
      placeAt(b, s, C, RQ[0], RQ[1], RQ[2], V);
      var worst = -1e9, anyOn = false, low = -1e9, sS = 0;
      for (i = 0; i < NV; i++) {
        var X = s.X46[3 * i], Y = s.X46[3 * i + 1], Z = s.X46[3 * i + 2], zc = X * C.f[0] + Y * C.f[1] + Z * C.f[2];
        var sx = W / 2 + (X * C.r[0] + Y * C.r[1] + Z * C.r[2]) / zc * k2, syy = H / 2 - (X * C.u[0] + Y * C.u[1] + Z * C.u[2]) / zc / VW.tanY * (H / 2);
        if (syy > low) low = syy;
        if (lg) { var lp = lg.pts, ln = lp.length, sf = surfY(lp, sx), ax = Math.abs(sx - fxp) - 0.18 * sp, we = 0; if (!(sf === sf)) { we = sx < lp[0][0] ? lp[0][0] - sx : sx - lp[ln - 1][0]; sf = we < 2 ? (sx < lp[0][0] ? lp[0][1] : lp[ln - 1][1]) : NaN; } if (sf === sf) { anyOn = true; var v = syy - sf - (ax > 0 ? 3 * ax : 0) + (we > 0 ? Math.log(1 - we / 2) : 0); if (v > worst) { sS = sS * Math.exp(worst - v) + 1; worst = v; } else sS += Math.exp(v - worst); } }   // (the ink under it only, its weight fading to none over 2 px past a ledge's ends, the points far from its feet not counted, smoothly; the lowest of them by a soft max, 1 px wide, so the rest never kinks as one point passes another)
      }
      var err = anyOn ? worst + Math.log(sS) - 1.6 : low - fyp;
      up += err; if (Math.abs(err) < 0.05) break;
    }
    return up;
  }
  /* where its rest will be at the touch: the touch pose on the perched basis it will stand in, solved in the step (at
     the approach's start and again at the last leg's, its yaw decided then), never from what was drawn: the landing
     closes on that, so the touch is where its feet are */
  var TOUCHG = {}, ZERO3 = new Float64Array(3);
  /* the touch pose's geometry, a kind's own (the same every landing) */
  function touchGeom(kind) { var g = TOUCHG[kind]; if (!g) { g = TOUCHG[kind] = new Float64Array(3 * NV); LB.geom(kind, PERCH.poses.touch, ZERO3, g, 'this'); } return g; }
  var PRB = null;
  /* a scratch bird record for a rest solved ahead (the touch's, a turn's end): its kind's form on a basis of its own */
  function prb(b) {
    if (!PRB) PRB = { kind: 'gull', B: new Float64Array(9), V46: new Float64Array(3 * NV), X46: new Float64Array(3 * NV), X16: new Float64Array(48), body: new Float64Array(3), B3: new Float64Array(3) };
    PRB.kind = FP.kinds[b.kind] && KMD[b.kind] ? b.kind : 'gull'; return PRB;
  }
  function landRest(b, C) {
    var P = b.P; perchFoot(P, PFD); if (!(PFD[0] === PFD[0])) return;
    var R = prb(b); perchBasis(C, P.yaw, PERCH.pitch * DEG, 0, R.B);
    P.rest = null; P.rest = restSolve(b, C, R, PFD[0], PFD[1], 0, touchGeom(R.kind));
  }
  /* a bird on its perch, posed in the camera's frame at the perch's depth, its lowest points on the ink (on the tip:
     its feet the tip's), solved every frame from where the perch is drawn */
  var RW = 30;
  function posePerch(b, C, s) {
    var P = b.P;
    perchFoot(P, PFD); if (!(PFD[0] === PFD[0])) return false;
    var wh = P.hop || 0;
    if (P.walk && TD >= P.walk.t0 && P.kind !== 'pointer') { walkAt(P, TD, WKA); var Lw = ledges()[P.li], yw = surfY(Lw.pts, WKA[0]); PFD[0] = WKA[0]; if (yw === yw) PFD[1] = yw; wh = WKA[1]; }   // (a walk's foot and hop at the frame's own time)
    if (s.rT0 !== P.tt) { s.rT0 = P.tt; s.rU = P.rest || 0; s.rV = 0; s.rT = TD; }   // (once a touch: from the rest the landing closed on)
    perchPose(b, s); wingXF(b, s);
    var yawNow = P.yaw;
    if (P.yawTo !== undefined && TD - P.yawT < P.yawD) yawNow = P.yaw0 + (P.yawTo - P.yaw0) * ease((TD - P.yawT) / P.yawD);
    var turning = TD - P.yawT < P.yawD && TD >= P.yawT, hopL = turning ? (P.hopTurn ? 0.16 : 0.035) * Math.sin(Math.PI * clamp((TD - P.yawT) / P.yawD, 0, 1)) : wh * 0.05;
    var L = P.leaving, crouch = L ? Math.sin(0.5 * Math.PI * clamp((TD - L.t0) / Math.max(L.tc, 1e-3), 0, 1)) : (P.crouch || 0);   // (the crouch at the frame's own time)
    var pt = (P.pitch + 3 * wave(b.vK + 31, AD / 3.7) - crouch * 10 + (P.swing || 0) * 20) * DEG, rl = (P.swing || 0) * 0.8;
    perchBasis(C, yawNow, pt, rl, PB9);
    basis(s, PB9[0], PB9[1], PB9[2], PB9[3], PB9[4], PB9[5], PB9[6], PB9[7], PB9[8]);
    var up;
    if (turning && P.yawTo !== undefined && P.kind !== 'pointer') {   // (a turn is a hop from one rest to the next: off the ink, its rest eased from the one it stood at to the one it will stand at, solved once at its start)
      if (P.rT !== P.yawT) { P.rT = P.yawT; P.rA = s.rU || P.rest || 0; LB.geom(s.kind, s.P22, s.B3, s.V46, 'this'); var R = prb(b); perchBasis(C, P.yawTo, pt, rl, R.B); P.rB = restSolve(b, C, R, PFD[0], PFD[1], 0, s.V46); }
      up = restSolve(b, C, s, PFD[0], PFD[1], hopL, undefined, P.rA + (P.rB - P.rA) * ease(clamp((TD - P.yawT) / P.yawD, 0, 1)));
      s.rU = up; s.rV = 0; s.rT = TD; return true;   // (the turn's own rest is the drawn one: it ends at the next one's, at rest)
    } else {
      up = restSolve(b, C, s, PFD[0], PFD[1], hopL, undefined, L && P.rest ? P.rest : undefined);   // (leaving: its rest held as it was: the crouch and the opening wings do not lift it)
    }
    if (!hopL && !L) P.rest = up;
    /* the drawn rest follows the solved one, critically damped (RW per s): a change of what holds it up (a point onto the
       ink at a stroke's end) settles over a few frames, never a snap; from the touch it starts where the landing ended */
    var dr = TD - s.rT;
    if (!(dr > 0 && dr < 0.25)) dr = dr > 0 ? 0.25 : 0;
    s.rT = TD;
    var e = s.rU - up, rw = e < 0 ? 4 * RW : RW, x = Math.exp(-rw * dr), q = (s.rV + rw * e) * dr; s.rU = up + (e + q) * x; s.rV = (s.rV - rw * q) * x;   // (out of the ink four times as fast as it settles down onto it)
    if (Math.abs(s.rU - up) > 0.01) restSolve(b, C, s, PFD[0], PFD[1], hopL, undefined, s.rU);
    return true;
  }
  /* the perched attitude: its yaw about the camera's up (from facing the camera), its pitch and roll, the eye's tilt */
  var PB9 = new Float64Array(9);
  function perchBasis(C, yawNow, pt, rl, o) {
    var yw = yawNow * DEG, el = PERCH.el * DEG;
    var cy = Math.cos(yw), sy = Math.sin(yw), i;
    for (i = 0; i < 3; i++) { F0V[i] = C.f[i] * cy + C.r[i] * sy; L0V[i] = -(C.r[i] * cy - C.f[i] * sy); }
    U0V[0] = F0V[1] * L0V[2] - F0V[2] * L0V[1]; U0V[1] = F0V[2] * L0V[0] - F0V[0] * L0V[2]; U0V[2] = F0V[0] * L0V[1] - F0V[1] * L0V[0];
    var cp = Math.cos(pt), spt = Math.sin(pt), cr = Math.cos(rl), sr = Math.sin(rl);
    var fx = F0V[0] * cp + U0V[0] * spt, fy = F0V[1] * cp + U0V[1] * spt, fz = F0V[2] * cp + U0V[2] * spt;
    var ux = U0V[0] * cp - F0V[0] * spt, uy = U0V[1] * cp - F0V[1] * spt, uz = U0V[2] * cp - F0V[2] * spt;
    var lx = L0V[0] * cr + ux * sr, ly = L0V[1] * cr + uy * sr, lz = L0V[2] * cr + uz * sr, zx = ux * cr - L0V[0] * sr, zy = uy * cr - L0V[1] * sr, zz = uz * cr - L0V[2] * sr;
    TCE = Math.cos(el); TSE = Math.sin(el);
    tilt(C, fx, fy, fz, T1); tilt(C, lx, ly, lz, T2); tilt(C, zx, zy, zz, T3);
    for (i = 0; i < 3; i++) { o[i] = T1[i]; o[3 + i] = T2[i]; o[6 + i] = T3[i]; }
  }
  function projectBird(s, C, N) {
    var i, xc, yc, zc, X = s.X46, k = VW.outW / Math.max(1, W), fx = (VW.outW / 2) / VW.tanX, fy = (VW.outH / 2) / VW.tanY;
    for (i = 0; i < NV; i++) {   // every vertex, and its 1/depth for the pass's nearest facet
      var ax = X[3 * i], ay = X[3 * i + 1], az = X[3 * i + 2];
      zc = ax * C.f[0] + ay * C.f[1] + az * C.f[2];
      if (!(zc > 0.5)) return false;
      xc = ax * C.r[0] + ay * C.r[1] + az * C.r[2]; yc = ax * C.u[0] + ay * C.u[1] + az * C.u[2];
      var dx = VW.outW / 2 + fx * xc / zc, dy = VW.outH / 2 + fy * yc / zc;
      s.D46[2 * i] = dx; s.D46[2 * i + 1] = dy; s.IZ[i] = 1 / zc;
    }
    var bz = s.body[0] * C.f[0] + s.body[1] * C.f[1] + s.body[2] * C.f[2];
    s.n = bz > 0.5 ? (W / 2) / VW.tanX * MPU / bz : 0;
    s.spanPx = s.d.span * s.n * k;                       // its ink span on the window, device px: the LOD, the pen floor, the filter
    s.floorPx = clamp(Math.round(4 * clamp(1.3 + 0.035 * s.spanPx / k, LINE[0], LINE[1])) / 4 * k, 1, 2.5 * k);   // the pen along its leading edge, at its width for this size
    s.filt = FILTER[0] + (FILTER[1] - FILTER[0]) * clamp((24 - s.spanPx) / 20, 0, 1);
    s.lod = FP.lodK(s.spanPx / k);                       // the facets' share by its ink span, CSS px
    s.halo = N;
    s.haloE = (W < 600 ? HALO_E[1] : HALO_E[0]) * k;
    return true;
  }
  /* the world's light on the paper, by facetpose's own model ("white paper lit like cloud"), facet by facet: each
     facet's normal (area-weighted over its triangles, on the posed flexing form) turned toward the eye; its light (FE)
     for a near bird's planes, and the bird's ONE TONE (LT.ONE's constants over the same facets, area-weighted on the
     window: the bright white the true-size outline is tuned on), eased (TONE_T). The world is y up, facetpose z up: every vector handed to it has y and z swapped (a reflection:
     dot products kept; the normals' sign it turns toward the eye itself) */
  var SUNC0 = [1, 1, 1], AMBU0 = [0.3, 0.35, 0.45], AMBD0 = [0.25, 0.25, 0.3], CLLIT0 = [0.7, 0.65, 0.7];
  var LZ = { sunDir: [0, 0, 1], sunVis: 0, sunC: SUNC0, ambU: AMBU0, ambD: AMBD0, clLit: CLLIT0, seaLit: 0 }, EYEZ = [0, 0, 1];
  /* the frame's light, in facetpose's axes, once a frame (the same for every bird) */
  function lightFrame(L) {
    var sd = L && L.sunDir;
    if (sd) { LZ.sunDir[0] = sd[0]; LZ.sunDir[1] = sd[2]; LZ.sunDir[2] = sd[1]; } else { LZ.sunDir[0] = 0; LZ.sunDir[1] = 0; LZ.sunDir[2] = 1; }
    LZ.sunVis = L ? (L.sunVis === undefined ? 1 : L.sunVis) : 0;
    LZ.sunC = L && L.sunC ? L.sunC : SUNC0; LZ.ambU = L && L.ambU ? L.ambU : AMBU0; LZ.ambD = L && L.ambD ? L.ambD : AMBD0; LZ.clLit = L && L.clLit ? L.clLit : CLLIT0;
    var ad = LZ.ambD, cl = LZ.clLit;
    LZ.seaLit = Math.min(1, Math.max(0, (0.2126 * ad[0] + 0.7152 * ad[1] + 0.0722 * ad[2]) / Math.max(1e-4, 0.2126 * cl[0] + 0.7152 * cl[1] + 0.0722 * cl[2])));
  }
  /* the bird's one tone alone (facetpose.light's ONE: its lit1 with LT.ONE, area-weighted), for a bird whose planes do
     not show: the same sums, half the work */
  var ONE3 = new Float64Array(3);
  function oneTone(N, eye, L, area) {
    var LT = FP2.LT, C = LT.ONE, sd = L.sunDir, sv = L.sunVis === undefined ? 1 : L.sunVis, sc = L.sunC, au = L.ambU, ad = L.ambD, cl = L.clLit, f, ma = 0;
    var seaLit = LZ.seaLit, back = C.RIM ? Math.max(0, -(eye[0] * sd[0] + eye[1] * sd[1] + eye[2] * sd[2])) : 0;
    /* (the same products in the same order as per facet and channel; only the loads lifted out of the loop) */
    var ex = eye[0], ey = eye[1], ez = eye[2], s0 = sd[0], s1 = sd[1], s2 = sd[2], WRAP = C.WRAP, WRAP1 = 1 + WRAP, TRANS = C.TRANS, SKYT = C.SKYT, SKYT1 = 1 - SKYT;
    var BOUNCE = C.BOUNCE, RIM = C.RIM, RIM_P = LT.RIM_P, GAIN = LT.GAIN, P0 = LT.PAPER[0], P1 = LT.PAPER[1], P2 = LT.PAPER[2], SUN_K = C.SUN_K;
    var k0 = SUN_K * sc[0], k1 = SUN_K * sc[1], k2 = SUN_K * sc[2], ad0 = ad[0], ad1 = ad[1], ad2 = ad[2], au0 = au[0] - ad0, au1 = au[1] - ad1, au2 = au[2] - ad2, c0 = cl[0], c1 = cl[1], c2 = cl[2];
    var o0 = 0, o1 = 0, o2 = 0;
    for (f = 0; f < NFAC; f++) {
      var nx = N[3 * f], ny = N[3 * f + 1], nz = N[3 * f + 2], ne = nx * ex + ny * ey + nz * ez;
      if (ne < 0) { nx = -nx; ny = -ny; nz = -nz; ne = -ne; }
      var dS = nx * s0 + ny * s1 + nz * s2;
      var direct = sv * Math.min(1, Math.max(0, (dS + WRAP) / WRAP1)), through = sv * TRANS * Math.max(-dS, 0);
      var wsky = SKYT + SKYT1 * (0.5 + 0.5 * nz), bnc = BOUNCE * Math.max(-nz, 0) * seaLit;
      var rim = RIM ? sv * RIM * Math.pow(1 - ne, RIM_P) * (0.4 + 0.6 * back) : 0, a = area ? area[f] : 1, dtr = direct + through + rim;
      o0 += a * GAIN * P0 * (k0 * dtr + ad0 + au0 * wsky + bnc * c0);
      o1 += a * GAIN * P1 * (k1 * dtr + ad1 + au1 * wsky + bnc * c1);
      o2 += a * GAIN * P2 * (k2 * dtr + ad2 + au2 * wsky + bnc * c2);
      ma += a;
    }
    if (ma > 0) { o0 /= ma; o1 /= ma; o2 /= ma; }
    ONE3[0] = o0; ONE3[1] = o1; ONE3[2] = o2;
    return ONE3;
  }
  function lightBird(s, rest, dt) {
    var kind = s.kind, FK = LB.flexKind(kind), T = FK.tri, tf = FK.tf, X = s.X46, VZ = s.VZ, i, f;
    for (i = 0; i < NV; i++) { VZ[3 * i] = X[3 * i]; VZ[3 * i + 1] = X[3 * i + 2]; VZ[3 * i + 2] = X[3 * i + 1]; }
    FP2.facetNormals(kind, VZ, s.NZ);
    var ex = -s.body[0], ey = -s.body[1], ez = -s.body[2], el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
    EYEZ[0] = ex / el; EYEZ[1] = ez / el; EYEZ[2] = ey / el;
    for (f = 0; f < NFAC; f++) s.FA[f] = 1e-3;
    for (i = 0; i < tf.length; i++) s.FA[tf[i]] += Math.abs(triA(s.D46, T[3 * i], T[3 * i + 1], T[3 * i + 2]));   // (each facet's area on the window, device px)
    var one = s.lod > 0 && !FORCED && !(s.halo > 0) ? FP2.light(kind, s.NZ, EYEZ, LZ, s.FE, s.FA) : oneTone(s.NZ, EYEZ, LZ, s.FA);
    var e = rest || !s.eOk ? 1 : 1 - Math.exp(-dt / TONE_T);
    for (var k2 = 0; k2 < 3; k2++) s.E[k2] += (one[k2] - s.E[k2]) * e;
    s.eOk = true;
  }
  function triA(D, a, b, c) { return 0.5 * ((D[2 * b] - D[2 * a]) * (D[2 * c + 1] - D[2 * a + 1]) - (D[2 * c] - D[2 * a]) * (D[2 * b + 1] - D[2 * a + 1])); }
  /* how much of the cloud before it stands in front of it: at its left tip, its body and its right tip, the clouds'
     lobes between the camera and each (eased by CLOUD_IN m), at least the cover over the view; worked out every frame
     it is drawn (a bird goes into a cloud as the cloud's edge passes over it, never a step later) */
  var CWP = new Float64Array(9), CWL = new Float64Array(3);
  function cloudWeights(s, C) {
    if (FORCED) { s.cw[0] = s.cw[1] = s.cw[2] = 0; return; }
    var cov = HOST.cover(), X = s.X16, q;
    CWP[0] = X[0]; CWP[1] = X[1]; CWP[2] = X[2]; CWP[3] = s.body[0]; CWP[4] = s.body[1]; CWP[5] = s.body[2]; CWP[6] = X[18]; CWP[7] = X[19]; CWP[8] = X[20];   // its left tip, its body, its right tip
    if (FX.cloud) HOST.cloudBetween3(C.pos[0], C.pos[1], C.pos[2], CWP, CWL); else CWL[0] = CWL[1] = CWL[2] = 0;
    for (q = 0; q < 3; q++) s.cw[q] = Math.max(ease(CWL[q] / CLOUD_IN), cov);
  }

