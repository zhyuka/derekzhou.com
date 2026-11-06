  /* ---------------- the paper: every bird a 3D cut-paper body, posed by its own flight (birds3d) ---------------- */

  /* Each bird is the faceted M flown by the measured wing: posed every frame along its way through the air, banked as
     it turns, or standing on its perch; lit by the world's light; drawn by one instanced pass after the composite. */
  var LB = LABBIRD(window.FACETFORM, window.FACETPOSE, window.WINGMODEL, window.WINGMODEL_DATA), BW = BIRDWING(LB, window.WINGMODEL_DATA), FP = LB.P, FP2 = LB.flexPose(), NP = FP.NP, KMD = window.WINGMODEL_DATA.kinds;
  var NV = 46, NFAC = 30, P16MAP = window.FACETFORM.kinds.gull.p16, CHAIN = window.FACETFORM.kinds.gull.chain;   // (every kind's: the 16 points' vertices, -1 the body point; the leading edge's M)

  /* the glide with its load (the lab's, no trims) */
  var ZTRIM = [0, 0, 0, 0, 0, 0, 1, 1, 1], GS0 = { flap: 0, ph: 0, k: 1, D: 0.5, a: 0, e: 0 }, GLW = { kind: 'gull', trim: ZTRIM }, GB3 = new Float64Array(3);
  function glide22(kind, out) { GLW.kind = kind; GLW.trim = ZTRIM; BW.poseS(GLW, GS0, 0, out, GB3); return out; }
  function slotArrays(s) {
    s.P22 = FP.pose(); s.B3 = new Float64Array(3); s.V46 = new Float64Array(3 * NV); s.X46 = new Float64Array(3 * NV); s.D46 = new Float32Array(2 * NV); s.IZ = new Float32Array(NV);
    s.NZ = new Float64Array(3 * NFAC); s.FE = new Float64Array(3 * NFAC); s.FA = new Float64Array(NFAC); s.VZ = new Float64Array(3 * NV); s.B = new Float64Array(9); s.bT0 = -1; s.bFrom = null; s.lod = 0;
  }
  var MODEL_K = 1.19;          // (way-form: 1.38 for the bodied form; the wing-only form spans more of its model on the window) the drawn model's span on today's ink span (the glide seen from below and behind looks 0.64-0.75 of its span): paths and MPU unchanged
  var HOLD_POSE = [3, 8];      // device px of span: smaller, the beat's swing eases into the held glide (a speck holds its glide). (physics: the measured beat in full from 8 px; the shape round held it in from 16, and a 1440 px desktop's birds, 10-25 px, beat partly held 68 % of their time, a tenth of it at under 0.65 of the measured stroke: the stiffness the owner saw)
  var TONE_T = 0.4;            // s: the bird's one tone eased (never a blink)
  var GLOW_ENC = 0.72, HALO_A = 0.14, HALO_E = [3, 2];   // night: the paper's own light (as encoded), the halo's strength and e-folding (CSS px: a desktop, a phone)
  var AOA = [1.5, 1];          // deg: the body's angle to its way through the air gliding, flapping (fix: the body all but along its way, the wing's own incidence carrying the rest)
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
  function gmean(kind) { if (GMEAN[kind]) return GMEAN[kind]; var M = FP.pose(), T = FP.pose(); for (var i = 0; i < 120; i++) { gbeat(kind, i / 120, 1, T); for (var j = 0; j < 22; j++) M[j] += T[j] / 120; } return (GMEAN[kind] = M); }
  var WIND_ON = true, WINDV = [0, 0, 0];
  function windNow() { if (WIND_ON && HOST.wind && !FORCED) HOST.wind(WINDV); else WINDV[0] = WINDV[1] = WINDV[2] = 0; return WINDV; }
  /* the basis now (forward, left, up: 9 numbers) into s.B, blended from the last one drawn while a change is fresh */
  function basis(s, fx, fy, fz, lx, ly, lz, zx, zy, zz) {
    var B = s.B, u = s.bT0 >= 0 ? clamp((t - s.bT0) / s.bTT, 0, 1) : 1;
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
  function blendFrom(s, T) { if (!s || !s.B) return; if (!s.bFrom) s.bFrom = new Float64Array(9); for (var i = 0; i < 9; i++) s.bFrom[i] = s.B[i]; s.bT0 = t; s.bTT = T; }
  /* the wings in the air: the schedule's, or the beats it makes now (a burst: the first the biggest, about a fifth
     quicker than its level beat) */
  function wingsAir(b, s, rest) {
    var kind = s.kind, w0 = b.w, swing = smoothK(HOLD_POSE[0], HOLD_POSE[1], s.spanPx || 20), WS0 = null;
    WO.swing = swing; WO.rough = 0;
    var f = (w0 && w0.f) || 3, bu = b.burst;
    if (bu && !rest) {
      var ub = t - bu.t0, nb = ub * f * 1.2;
      if (nb < bu.n) { gbeat(kind, nb, 1.3 - 0.18 * Math.min(1, nb / bu.n), s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 1; return; }
      b.burst = null;
    }
    if (b.st === 'appr' && b.flapA !== undefined && !rest) {   // (down into the approach with strong beats, up into the perch gliding)
      if (b.flapA > 0) { gbeat(kind, b.age * f * 1.1, 1.15, s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 1; return; }
      glide22(kind, s.P22); gmix(s.P22, s.P22, PERCH.poses.flare, 0.25 * smoothK(0.45, 1, b.P && b.P.d0 ? 1 - Math.min(1, dist3(b.p, b.P.at) / b.P.d0) : 0)); s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 0; return;
    }
    if (b.st === 'land') {   // (the flare: wings up and forward, braking beats, the feet out)
      var u = b.flareU || 0, GL = glide22(kind, GT2);
      gmix(GT1, GL, u < 0.75 ? PERCH.poses.flare : PERCH.poses.touch, u < 0.75 ? smoothK(0, 0.5, u) : smoothK(0.75, 1, u));
      gbeat(kind, f * 1.45 * (t - b.P.tl), 0.9, GP22); var M = gmean(kind), wb = 0.45 * (1 - smoothK(0.55, 1, u));
      for (var j = 0; j < 22; j++) s.P22[j] = GT1[j] + wb * (GP22[j] - M[j]);
      s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = wb; return;
    }
    if (w0 && w0.wing) { WS0 = wingState(b); BW.poseS(w0.wing, WS0, b.age, s.P22, s.B3, WO); }
    else { glide22(kind, s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; }
    s.flapW = WS0 ? WS0.e * swing : 0;
  }
  function dist3(a, c) { var x = a[0] - c[0], y = a[1] - c[1], z = a[2] - c[2]; return Math.sqrt(x * x + y * y + z * z); }
  /* a bird in the air, posed: its place now (between the last two steps: back along its way), its basis, its wings */
  function poseFly(b, C, s, rest, back) {
    var kind = s.kind, i;
    var px = b.p[0] - b.v[0] * back, py = b.p[1] - b.v[1] * back, pz = b.p[2] - b.v[2] * back;
    VV[0] = b.v[0] - WINDV[0]; VV[1] = b.v[1] - WINDV[1]; VV[2] = b.v[2] - WINDV[2];
    var vl = Math.sqrt(VV[0] * VV[0] + VV[1] * VV[1] + VV[2] * VV[2]);
    if (!(vl > 0.3)) { VV[0] = Math.sin(b.psi); VV[1] = 0; VV[2] = Math.cos(b.psi); vl = 1; }
    var fx = VV[0] / vl, fy = VV[1] / vl, fz = VV[2] / vl;
    var lx = fz, lz = -fx, ll = Math.sqrt(lx * lx + lz * lz) || 1; lx /= ll; lz /= ll; var ly = 0;
    var ux = fy * lz - fz * ly, uy = fz * lx - fx * lz, uz = fx * ly - fy * lx;
    wingsAir(b, s, rest);
    var flare = b.st === 'land' ? 80 * smoothK(0, 0.85, b.flareU || 0) : 0;
    var aoa = (AOA[0] + (AOA[1] - AOA[0]) * (s.flapW || 0) + flare) * DEG, ca = Math.cos(aoa), sa = Math.sin(aoa);
    var bxx = fx * ca + ux * sa, bxy = fy * ca + uy * sa, bxz = fz * ca + uz * sa;
    var bzx = ux * ca - fx * sa, bzy = uy * ca - fy * sa, bzz = uz * ca - fz * sa;
    var rr = -b.phi * (b.st === 'land' ? 1 - (b.flareU || 0) : 1), cr = Math.cos(rr), sr = Math.sin(rr);
    var byx = lx * cr + bzx * sr, byy = ly * cr + bzy * sr, byz = lz * cr + bzz * sr;
    var bzx2 = bzx * cr - lx * sr, bzy2 = bzy * cr - ly * sr, bzz2 = bzz * cr - lz * sr;
    basis(s, bxx, bxy, bxz, byx, byy, byz, bzx2, bzy2, bzz2);
    place(b, s, C, px, py, pz);
    return true;
  }
  /* the 46 vertices from its pose, scaled to its size, turned by its basis, from the camera; the 16 points beside them */
  function place(b, s, C, px, py, pz) {
    var i, sp = b.sz, B = s.B;
    LB.geom(s.kind, s.P22, s.B3, s.V46, 'this');
    var ox = px - C.pos[0], oy = py - C.pos[1], oz = pz - C.pos[2], V = s.V46, X = s.X46;
    for (i = 0; i < NV; i++) {
      var x = V[3 * i] * sp, y = V[3 * i + 1] * sp, z = V[3 * i + 2] * sp;
      X[3 * i] = ox + x * B[0] + y * B[3] + z * B[6]; X[3 * i + 1] = oy + x * B[1] + y * B[4] + z * B[7]; X[3 * i + 2] = oz + x * B[2] + y * B[5] + z * B[8];
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = ox; s.X16[3 * i + 1] = oy; s.X16[3 * i + 2] = oz; } else { s.X16[3 * i] = X[3 * vi]; s.X16[3 * i + 1] = X[3 * vi + 1]; s.X16[3 * i + 2] = X[3 * vi + 2]; } }
    s.body[0] = ox; s.body[1] = oy; s.body[2] = oz;
    s.nb[0] = B[6]; s.nb[1] = B[7]; s.nb[2] = B[8]; s.fw[0] = B[0]; s.fw[1] = B[1]; s.fw[2] = B[2]; s.lw3[0] = B[3]; s.lw3[1] = B[4]; s.lw3[2] = B[5];
  }
  /* the perched pose: settling (touch, half folded, loose, folded: two or three small adjustments), its own breath (its
     own slow noise, never a clock's sine), its wings raised or a rouse, a crouch to leave, a hop (a turn or a step) */
  function perchPose(b, s) {
    var P = b.P, kind = s.kind, Q = PERCH.poses, u = t - P.tt;
    if (u < 0.25) gmix(s.P22, Q.touch, Q.foldHalf, smoothK(0, 0.25, u));
    else if (u < 0.6) gmix(s.P22, Q.foldHalf, Q.foldLoose, smoothK(0.25, 0.6, u));
    else gmix(s.P22, Q.foldLoose, Q.fold, smoothK(0.6, 0.95, u));
    var br = 2.4 * wave(b.vK + 7, b.age / 3.1), bh = 1.8 * wave(b.vK + 19, b.age / 2.3);
    s.P22[0] += br; s.P22[NP] += br; s.P22[4] += bh; s.P22[NP + 4] += bh;
    var A = P.act;
    if (A) {
      var ua = (t - A.t0) / A.T, wa = Math.sin(Math.PI * clamp(ua, 0, 1));
      if (A.k === 'wings') gmix(s.P22, s.P22, Q.open, 0.7 * gss(1.4 * wa));   // (both wings raised: a lifted M, and let down)
      else { var sk = 7 * wa * Math.sin(TAU * 7.5 * ua * A.T); s.P22[0] += sk; s.P22[NP] += sk; s.P22[4] -= 0.7 * sk; s.P22[NP + 4] -= 0.7 * sk; }   // (a rouse: a quick shake)
    }
    if (P.leaving) gmix(s.P22, s.P22, Q.open, gss((t - P.leaving.t0) / Math.max(0.05, P.leaving.tc)));
    s.B3[0] = s.B3[1] = s.B3[2] = 0; s.flapW = 0;
  }
  /* a bird on its perch, posed in the camera's frame at the perch's depth, its lowest points on the ink (on the tip:
     its feet the tip's), solved every frame from where the perch is drawn */
  var RQ = [0, 0, 0], PFD = [0, 0], F0V = [0, 0, 0], L0V = [0, 0, 0], U0V = [0, 0, 0], T1 = [0, 0, 0], T2 = [0, 0, 0], T3 = [0, 0, 0], TCE = 1, TSE = 0;
  function tilt(C, v0, v1, v2, o) { var a = v0 * C.u[0] + v1 * C.u[1] + v2 * C.u[2], bb = v0 * C.f[0] + v1 * C.f[1] + v2 * C.f[2], c = v0 * C.r[0] + v1 * C.r[1] + v2 * C.r[2], a2 = a * TCE + bb * TSE, b2 = bb * TCE - a * TSE; o[0] = C.r[0] * c + C.u[0] * a2 + C.f[0] * b2; o[1] = C.r[1] * c + C.u[1] * a2 + C.f[1] * b2; o[2] = C.r[2] * c + C.u[2] * a2 + C.f[2] * b2; }
  /* the rest rule: its body over its foot (CSS px up from it) by as much as puts its lowest drawn points on the
     surface (a letter's ink under them; on the tip, the tip), with its pose and basis as they are */
  function restSolve(b, C, s, fxp, fyp, lift) {
    var P = b.P, sp = perchSpan(b, P.k), up = P.rest || 0.42 * sp, k2 = (W / 2) / VW.tanX, lg = P.kind === 'pointer' ? null : ledges()[P.li], i;
    for (var it = 0; it < 4; it++) {
      rayAt(C, fxp, fyp - up - lift * sp, P.D, RQ);
      place(b, s, C, RQ[0], RQ[1], RQ[2]);
      var worst = -1e9, anyOn = false, low = -1e9;
      for (i = 0; i < NV; i++) {
        var X = s.X46[3 * i], Y = s.X46[3 * i + 1], Z = s.X46[3 * i + 2], zc = X * C.f[0] + Y * C.f[1] + Z * C.f[2];
        var sx = W / 2 + (X * C.r[0] + Y * C.r[1] + Z * C.r[2]) / zc * k2, syy = H / 2 - (X * C.u[0] + Y * C.u[1] + Z * C.u[2]) / zc / VW.tanY * (H / 2);
        if (syy > low) low = syy;
        if (lg) { var sf = surfY(lg.pts, sx); if (sf === sf) { anyOn = true; worst = Math.max(worst, syy - sf); } }
      }
      var err = anyOn ? worst - 1.6 : low - fyp;
      up += err; if (Math.abs(err) < 0.05) break;
    }
    return up;
  }
  /* (the flare's last tenths) where its rest will be at the touch: the touch pose on its basis now, solved; the landing
     closes on that, so the touch is where its feet are */
  var PRB = { P22: null };
  function restProbe(b, C, s) {
    var P = b.P; perchFoot(P, PFD); if (!(PFD[0] === PFD[0]) || !s.X46) return;
    var keep = s.P22; if (!PRB.P22) PRB.P22 = FP.pose();
    for (var i = 0; i < 22; i++) PRB.P22[i] = PERCH.poses.touch[i];
    s.P22 = PRB.P22; s.B3[0] = s.B3[1] = s.B3[2] = 0;
    P.rest = restSolve(b, C, s, PFD[0], PFD[1], 0);
    s.P22 = keep;
  }
  /* a bird on its perch, posed in the camera's frame at the perch's depth, its lowest points on the ink (on the tip:
     its feet the tip's), solved every frame from where the perch is drawn */
  function posePerch(b, C, s) {
    var P = b.P;
    perchFoot(P, PFD); if (!(PFD[0] === PFD[0])) return false;
    perchPose(b, s);
    var yawNow = P.yaw;
    if (P.yawTo !== undefined && t - P.yawT < P.yawD) yawNow = P.yaw0 + (P.yawTo - P.yaw0) * gss((t - P.yawT) / P.yawD);
    var turning = t - P.yawT < P.yawD, hopL = turning ? (P.hopTurn ? 0.16 : 0.035) * Math.sin(Math.PI * clamp((t - P.yawT) / P.yawD, 0, 1)) : (P.hop || 0) * 0.05;
    var yw = yawNow * DEG, pt = (P.pitch + 3 * wave(b.vK + 31, b.age / 3.7) - (P.crouch || 0) * 10 + (P.swing || 0) * 20) * DEG, rl = (P.swing || 0) * 0.8, el = PERCH.el * DEG;
    var cy = Math.cos(yw), sy = Math.sin(yw), i;
    for (i = 0; i < 3; i++) { F0V[i] = C.f[i] * cy + C.r[i] * sy; L0V[i] = -(C.r[i] * cy - C.f[i] * sy); }
    U0V[0] = F0V[1] * L0V[2] - F0V[2] * L0V[1]; U0V[1] = F0V[2] * L0V[0] - F0V[0] * L0V[2]; U0V[2] = F0V[0] * L0V[1] - F0V[1] * L0V[0];
    var cp = Math.cos(pt), spt = Math.sin(pt), cr = Math.cos(rl), sr = Math.sin(rl);
    var fx = F0V[0] * cp + U0V[0] * spt, fy = F0V[1] * cp + U0V[1] * spt, fz = F0V[2] * cp + U0V[2] * spt;
    var ux = U0V[0] * cp - F0V[0] * spt, uy = U0V[1] * cp - F0V[1] * spt, uz = U0V[2] * cp - F0V[2] * spt;
    var lx = L0V[0] * cr + ux * sr, ly = L0V[1] * cr + uy * sr, lz = L0V[2] * cr + uz * sr, zx = ux * cr - L0V[0] * sr, zy = uy * cr - L0V[1] * sr, zz = uz * cr - L0V[2] * sr;
    TCE = Math.cos(el); TSE = Math.sin(el);
    tilt(C, fx, fy, fz, T1); tilt(C, lx, ly, lz, T2); tilt(C, zx, zy, zz, T3);
    basis(s, T1[0], T1[1], T1[2], T2[0], T2[1], T2[2], T3[0], T3[1], T3[2]);
    var up = restSolve(b, C, s, PFD[0], PFD[1], hopL);
    if (!hopL) P.rest = up;
    return true;
  }
  function projectBird(s, C) {
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
    s.halo = HOST.night ? HOST.night() : 0;
    s.haloE = (W < 600 ? HALO_E[1] : HALO_E[0]) * k;
    return true;
  }
  /* (physics) the world's light on the paper: facetpose's own (the form designer's option 5, "white paper lit like
     cloud"), facet by facet: each facet's normal (area-weighted over its triangles, on the posed flexing form) turned
     toward the eye; its light (FE) for the near bird's planes and the bird's ONE TONE (the last round's constants over
     the same facets, area-weighted on the window: the bright white the true-size outline is tuned on),
     eased (TONE_T). The world is y up, facetpose z up: every vector handed to it has y and z swapped (a reflection:
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
    var LT = FP2.LT, C = LT.ONE, sd = L.sunDir, sv = L.sunVis === undefined ? 1 : L.sunVis, sc = L.sunC, au = L.ambU, ad = L.ambD, cl = L.clLit, f, k, ma = 0;
    var seaLit = LZ.seaLit, back = C.RIM ? Math.max(0, -(eye[0] * sd[0] + eye[1] * sd[1] + eye[2] * sd[2])) : 0;
    ONE3[0] = ONE3[1] = ONE3[2] = 0;
    for (f = 0; f < NFAC; f++) {
      var nx = N[3 * f], ny = N[3 * f + 1], nz = N[3 * f + 2], ne = nx * eye[0] + ny * eye[1] + nz * eye[2];
      if (ne < 0) { nx = -nx; ny = -ny; nz = -nz; ne = -ne; }
      var dS = nx * sd[0] + ny * sd[1] + nz * sd[2];
      var direct = sv * Math.min(1, Math.max(0, (dS + C.WRAP) / (1 + C.WRAP))), through = sv * C.TRANS * Math.max(-dS, 0);
      var wsky = C.SKYT + (1 - C.SKYT) * (0.5 + 0.5 * nz), bnc = C.BOUNCE * Math.max(-nz, 0) * seaLit;
      var rim = C.RIM ? sv * C.RIM * Math.pow(1 - ne, LT.RIM_P) * (0.4 + 0.6 * back) : 0, a = area ? area[f] : 1;
      for (k = 0; k < 3; k++) ONE3[k] += a * LT.GAIN * LT.PAPER[k] * (C.SUN_K * sc[k] * (direct + through + rim) + ad[k] + (au[k] - ad[k]) * wsky + bnc * cl[k]);
      ma += a;
    }
    if (ma > 0) { ONE3[0] /= ma; ONE3[1] /= ma; ONE3[2] /= ma; }
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
  function cloudWeights(s, C) {
    if (FORCED) { s.cw[0] = s.cw[1] = s.cw[2] = 0; return; }
    var cov = HOST.cover(), pts = [0, -1, 6];
    for (var q = 0; q < 3; q++) {
      var x, y, z;
      if (pts[q] < 0) { x = s.body[0]; y = s.body[1]; z = s.body[2]; } else { x = s.X16[3 * pts[q]]; y = s.X16[3 * pts[q] + 1]; z = s.X16[3 * pts[q] + 2]; }
      var len = FX.cloud ? HOST.cloudBetween(C.pos[0], C.pos[1], C.pos[2], C.pos[0] + x, C.pos[1] + y, C.pos[2] + z) : 0;
      s.cw[q] = Math.max(ease(len / CLOUD_IN), cov);
    }
  }
