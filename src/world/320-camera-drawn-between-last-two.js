  /* ---------------------------------------------------------------- the camera, drawn between the last two steps */
  var CAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], roll: 0, pitch: 0, inCloud: 0, arrive: 0, cover: 0, pmode: 0, hold: -1, open: -1, expo: 1 };
  var CAMV = new Float32Array(12);   // pos, r, u, f (for the uniforms)
  function camPose(V, u, a, out) {
    var A = CSP, Bs = CS;   // (at the junction too, CSP being the arrival's own place: arrive)
    var x = lerp(A.x, Bs.x, a), y = lerp(A.y, Bs.y, a), z = lerp(A.z, Bs.z, a);
    var yaw = A.yawV + A.phi + angDiff(Bs.yawV + Bs.phi, A.yawV + A.phi) * a, uth = lerp(A.thU + A.thP, Bs.thU + Bs.thP, a), roll = lerp(A.roll, Bs.roll, a);
    y += (SV.u > 0 ? lerp(CAMLIFT, SV.cl, SV.u) : CAMLIFT) * Math.min(V.clear[1], 12);   // (A2: the still's lift, eased)
    // the pitch: the realm's framing for this window's shape, a look at the ground ahead, the visitor's tilt
    var look = V.def.look || 90, fx = Math.sin(yaw), fz = Math.cos(yaw);
    var ga = groundAt(V, x + fx * look, z + fz * look, false), gh = groundAt(V, x, z, false);
    var pfNow = Math.atan2(ga - gh, look) * pfK(V), pfA = A.pf === A.pf ? A.pf : pfNow, pfB = Bs.pf === Bs.pf ? Bs.pf : pfNow;
    // (the followed look, CS.pf, alone wherever both states have one: the ground read again here less the targets read
    // in the step is nothing until the ground under the look point is refined between the step and the drawing (a cell's
    // ground arriving), when it steps the pitch by itself: 0.055 deg in one frame, 3.3 deg/s, in DUNES at 197.13 s of
    // seed 7's test-order flight, c6b as well)
    if (A.pf === A.pf && Bs.pf === Bs.pf) pfNow = lerp(pfA, pfB, a);
    else pfNow += lerp(pfA, pfB, a) - lerp(A.pf === A.pf ? A.pfT : pfNow, Bs.pf === Bs.pf ? Bs.pfT : pfNow, a);
    // the one framing; the ground's look is off (pfK 0), so the pitch is the framing and the visitor's tilt
    var fr = basePitch(V) + pfNow, pitch = fr + uth;
    pitch = clamp(pitch, -60 * DEG, 50 * DEG);
    var cp = Math.cos(pitch), f0 = fx * cp, f1 = Math.sin(pitch), f2 = fz * cp;
    var r0 = -f2, r2 = f0, rl = Math.sqrt(r0 * r0 + r2 * r2) || 1; r0 /= rl; r2 /= rl;
    var u0 = -r2 * f1, u1 = r2 * f0 - r0 * f2, u2 = r0 * f1;
    var cr = Math.cos(roll), sr = Math.sin(roll);
    out.pos[0] = x; out.pos[1] = y; out.pos[2] = z;
    out.f[0] = f0; out.f[1] = f1; out.f[2] = f2;
    out.r[0] = r0 * cr + u0 * sr; out.r[1] = u1 * sr; out.r[2] = r2 * cr + u2 * sr;
    out.u[0] = u0 * cr - r0 * sr; out.u[1] = u1 * cr; out.u[2] = u2 * cr - r2 * sr;
    out.roll = roll; out.pitch = pitch; out.inCloud = 0; out.arrive = 0; out.yaw = yaw;
    out.cover = 0; out.pmode = 0; out.hold = -1; out.open = -1; out.expo = 1;
    return out;
  }
  /* the framing: a realm says where the horizon should sit (a fraction of the window's height from the top) on a wide
     window and on a tall one; the pitch that puts it there follows the window's shape */
  var TALLK = 0;
  /* (the owner's yes to 9 deg) a wide window's camera pitched up CAMUP deg over the realm's framing: on a desktop
     the horizon from 55 % to about three quarters of the way down, the words wholly on sky. WIDEK is 1 on a window 6 : 5
     or wider and 0 on any other (an upright tablet, a phone, a window near square: their own framing, exactly 0
     added), the stylesheet's own query (wideWin), so the world's tilt and the still sky it dissolves in over agree on
     every window; set with TALLK in setFrustum, so a resize or a rotation re-aims at once, and eased with the frustum
     when only the height changes (WIDEKT). Not a fade between: the credit row stands 54-59 % down on these windows, about
     where the unraised horizon is (55 %), so any share of the 9 between carries the horizon through the credit row at
     some shape ((1 - TALLK) gives an upright tablet 4.8 deg; 1 - smooth(0.75, 1.0, h / w) gives a 1000x900 window
     3.2 deg, the horizon behind the credit). Not 11-12 deg: there the sunrise sky's stack takes light ink over a
     light ground. Everything that frames the view reads basePitch (the camera, the planner's forecast of it,
     the moon's place). */
  var CAMUP = 9;
  var WIDEK = 1, WIDEKT = 1;
  function basePitch(V) {
    var fr = V.def.frame || [0.4, 0.6];
    if (SV.u > 0) return Math.atan((2 * lerp(fr[0], fr[1], lerp(TALLK, SV.tk, SV.u)) - 1) * lerp(FRT.tanY, SV.tanY, SV.u)) + CAMUP * DEG * WIDEK;   // (A2: the still's framing, eased)
    return Math.atan((2 * lerp(fr[0], fr[1], TALLK) - 1) * FR.tanY) + CAMUP * DEG * WIDEK;
  }
  /* the look at the ground ahead's share of the pitch: the world's own (0: none: one pitch everywhere) */
  function pfK(V) { return V.def.pitchFollow === undefined ? 0.2 : V.def.pitchFollow; }
  /* (the one camera) the cruise clearance: one band over the surface flown (the higher of the land and the
     cloud sea's top: the camera's ground), def.cruise[0] m over the sand to def.cruise[1] over the cloud sea, by a smooth function
     of the maps ahead (the cloud weight averaged over CW_S m along the held heading, through smooth(CW_A, CW_B)),
     followed at most CW_V a second (of the weight: 18 m of clearance over about 90 s at the most). There is no framing
     to blend and no mode: a framing weight turns the view by 41 deg and lifts the camera 150 m at every coast. The margin
     about solids follows the same weight */
  var CW_S = [150, 300, 450], CW_A = 0.25, CW_B = 0.85, CW_V = 0.011, CRUISE_IN = 2;   // (the band is the world's own, def.cruise (180), read here only; CRUISE_IN: over the cloud sea the aim is 2 m under the band's top, so its swells keep it in the band)
  function cruiseTarget(S) {
    var hx = Math.sin(S.psi), hz = Math.cos(S.psi), s = 0;
    for (var i = 0; i < CW_S.length; i++) s += kwAt(S.x + hx * CW_S[i], S.z + hz * CW_S[i])[3];
    return smooth(CW_A, CW_B, s / CW_S.length);
  }
  function cruiseStep(S, dt) {
    var T = cruiseTarget(S);
    if (!(S.cw === S.cw)) { S.cw = T; return; }
    S.cw = clamp(S.cw + clamp(T - S.cw, -CW_V * dt, CW_V * dt), 0, 1);
  }
  function cruiseOf(V, cw) { var C = V.def.cruise, w = cw === cw ? cw : 0; return lerp(C[0], C[1] - CRUISE_IN, w * w * (3 - 2 * w)); }
  function flightParams(V, cw) {
    var A = V.def.clear || [7, 14, 60], w = cw === cw ? cw : 0;
    if (!V.clear || V.clear === V.def.clear) V.clear = A.slice();
    V.clear[0] = A[0]; V.clear[1] = cruiseOf(V, cw); V.clear[2] = A[2];
    V.margin = lerp(V.def.margin || 14, V.def.marginB || V.def.margin || 14, w);
    return V.clear;
  }

