  /* ---- the night's sky (SKY_BODY): the moon (a pale flat disc held under the ceiling, standing above the words where
     the window has room at the default pitch, else above the top edge, its light the key's), the belt, the wisps, the
     stars' twinkle (held under reduced motion) and their top */
  // (night contrast A) the light ceiling's knee narrowed, 0.08 -> 0.04: what stands under ceiling - knee passes as it
  // is, so a night's highlights keep their contrast; the ceiling itself, and so the words' worst contrast, unchanged
  var CEIL_KNEE = 0.04, STAR_TOP_Y = 0.0911, MOON_R = 1.8, MOON_FOOT = 4.5, MOON_KEEP = 12;
  var HALO_K = 0.011;   // (physics: weather/moon-halo) the halo's strength: about +0.03-0.06 in L at its brightest over the moonlit sky (test/unit/sky.mjs)
  var SKYN = { moon: new Float32Array(4), moonC: new Float32Array(3), moonG: new Float32Array(3), night: new Float32Array(4) };
  // MOON-ROUTE-BEGIN
  /* (the sun and moon: the owner's "Drift all night" and "Slower moon") the moon never fades, stops or
     turns back. A moonlit stay (its change in, its hold, its change out: t0 to t3, sky time) is one route, one way: out
     of sight it rises behind the sea (a leg, 16 deg under the horizon at t0), comes in through a side edge of the window
     above the words late in the change in, drifts across at one pace on a nearly level band (a row on the window, bowed
     a little toward the zenith where the room under the top edge allows), leaves through the other side early in the
     change out and sets behind the sea (16 deg under at t3). Pure functions of numbers and arrays (Math only: no DOM, no
     globals, no clock), so tools/moonkeep.js runs this same text in node. Angles in deg; directions world unit vectors
     (x, y up, z); the window's camera as camPose builds it (heading psi, pitch p, roll 0). Canonical frame: the band
     culminates at heading 0, its +s side toward the window's right (-x); moonAt turns it to the stay's own */
  var MRK = { R: 1.8, FOOT: 4.5, SLACK: 0.05, UP: 0.75, SPAN: 8, RES: 6, ROOM: 2, BOWL: 0.35, GLARE: 6, SPILL: 0.15, M: 1.5, SETV: 3, V10: 3.6, VPK: 4, TURN: 4, TURNUP: 3.3, WMAX: 1, DEEP: 16, MONO: 2, RHO: 30, STEP: 8, LANDX: 1 / 3, LANDROOM: 0.5 };
  var MRD = Math.PI / 180, MRC = [0, 0, 0];
  function mrDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function mrNorm(a) { var n = Math.sqrt(mrDot(a, a)) || 1; a[0] /= n; a[1] /= n; a[2] /= n; return a; }
  function mrAng(a, b) { var x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; return Math.atan2(Math.sqrt(x * x + y * y + z * z), mrDot(a, b)) / MRD; }
  function mrSmooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function mrCam(psi, p) { var a = psi * MRD, b = p * MRD, cp = Math.cos(b), f = [Math.sin(a) * cp, Math.sin(b), Math.cos(a) * cp], r = mrNorm([-f[2], 0, f[0]]); return { f: f, r: r, u: [-r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1]] }; }
  function mrRay(C, I, nx, ny) { var x = nx * I.tanX, y = ny * I.tanY; return mrNorm([C.f[0] + C.r[0] * x + C.u[0] * y, C.f[1] + C.r[1] * x + C.u[1] * y, C.f[2] + C.r[2] * x + C.u[2] * y]); }
  function mrPix(C, I, x, y) { return mrRay(C, I, 2 * x / I.W - 1, 1 - 2 * y / I.H); }
  function mrProj(C, I, d) { var z = mrDot(d, C.f); return [mrDot(d, C.r) / z / I.tanX, mrDot(d, C.u) / z / I.tanY, z]; }
  function mrSamples(I) {   // every box's top edge every STEP canvas px, its corners included (boxes 1 px or less skipped): of a box's outline its top edge needs the highest band (a point under another on the window needs less), so the rest is left out; with no stack, today's row at 0.3 H
    var S = [], B = I.boxes, st = false, b, j, n;
    for (b = 0; b < B.length; b++) {
      var x0 = B[b][0], y0 = B[b][1], x1 = B[b][2], y1 = B[b][3];
      if (!(x1 - x0 > 1 && y1 - y0 > 1)) continue;
      if (b < 3) st = true;
      n = Math.max(1, Math.ceil((x1 - x0) / MRK.STEP)); for (j = 0; j <= n; j++) S.push([x0 + (x1 - x0) * j / n, y0]);
    }
    if (!st) for (j = 0; j <= 24; j++) S.push([I.W * (0.2 + 0.6 * j / 24), I.H * 0.3]);
    return S;
  }
  function mrLo(I, S, p) {   // the keep line at pitch p: the lowest culmination whose great circle (level on the window) keeps the footprint and KEEP px clear of every sample; a bowl above it keeps it too
    var C = mrCam(0, p), lo = -90, i;
    for (i = 0; i < S.length; i++) {
      var d = mrPix(C, I, S[i][0], S[i][1]), kd = mrAng(d, mrPix(C, I, S[i][0], S[i][1] - I.keepPx)) * MRD, rh = Math.sqrt(d[2] * d[2] + d[1] * d[1]);
      var e = (Math.atan2(d[1], d[2]) + Math.asin(Math.min(1, Math.sin(MRK.FOOT * MRD + kd) / rh))) / MRD;
      if (e > lo) lo = e;
    }
    return lo + MRK.SLACK;
  }
  function mrBandSet(B, ec, beta) {   // the band: a small circle through the culmination dc, tangent to the window's right there, bowed toward the zenith by beta of a level circle's bend (0: the great circle)
    var e = ec * MRD, rho = beta > 0 && e > 0.01 ? Math.atan(1 / (beta * Math.tan(e))) : Math.PI / 2, cb = Math.cos(rho), sb = Math.sin(rho);
    B.ec = ec; B.beta = beta; B.rhoB = rho / MRD; B.cB = cb; B.sB = sb;
    B.Pc = [0, cb * Math.sin(e) + sb * Math.cos(e), cb * Math.cos(e) - sb * Math.sin(e)];
    B.e1 = [0, (Math.sin(e) - cb * B.Pc[1]) / sb, (Math.cos(e) - cb * B.Pc[2]) / sb];
    return B;
  }
  function mrBand(B, s, out) { var ph = s * MRD / B.sB, c = Math.cos(ph); out[0] = -B.sB * Math.sin(ph); out[1] = B.cB * B.Pc[1] + B.sB * c * B.e1[1]; out[2] = B.cB * B.Pc[2] + B.sB * c * B.e1[2]; return out; }
  function mrTopOK(B, I, p) {   // the band's centre, wherever it is in the window's x span, stands MRK.R + 1 deg (and SLACK) or more under the top edge's point at that x (pitch p): least where it crosses the side edge (the band rises toward the sides, and a px there spans less angle), so tested there and at four points inside
    var C = mrCam(0, p), d = [0, 0, 0], sE = mrEdge(B, I, p), j, q;
    for (j = 0; j <= 4; j++) {
      mrBand(B, j < 4 ? sE * j / 4 : sE - 1e-6, d); q = mrProj(C, I, d);
      if (q[2] <= 0 || q[1] >= 1 || mrAng(d, mrRay(C, I, Math.max(-1, Math.min(1, q[0])), 1)) < MRK.R + 1 + MRK.SLACK) return false;
    }
    return true;
  }
  function mrHi(I, p) {   // the highest culmination whose level band (beta 0: a row on the window, at ndc y tan(ec - p) / tanY) passes mrTopOK: its row solved at the side edge, where the margin is least
    var C = mrCam(0, p), top = mrRay(C, I, 1, 1), a = -1, b = 1, it;
    for (it = 0; it < 40; it++) { var m = (a + b) / 2; if (mrAng(mrRay(C, I, 1, m), top) >= MRK.R + 1 + MRK.SLACK) a = m; else b = m; }
    return p + Math.atan(a * I.tanY) / MRD;
  }
  function mrHiAt(I, p, x, mg) {   // (the opening's moon) mrHi with the margin under the top edge (mg deg past the disc's radius, 1 unless given) taken at ndc x, where the moon stands at the cut, not at the side edge
    var C = mrCam(0, p), top = mrRay(C, I, x, 1), a = -1, b = 1, it, g = MRK.R + (mg === undefined ? 1 : mg) + MRK.SLACK;
    for (it = 0; it < 40; it++) { var m = (a + b) / 2; if (mrAng(mrRay(C, I, x, m), top) >= g) a = m; else b = m; }
    return p + Math.atan(a * I.tanY) / MRD;
  }
  function mrSAt(B, I, p, x, sMax) {   // (the opening's moon) the band's arc on its leaving side whose centre stands at ndc x (pitch p)
    var C = mrCam(0, p), d = [0, 0, 0], a = 0, b = sMax, it, q;
    for (it = 0; it < 32; it++) { var m = (a + b) / 2; q = mrProj(C, I, mrBand(B, m, d)); if (q[2] > 0 && q[0] < x) a = m; else b = m; }
    return a;
  }
  function mrEdge(B, I, p) {   // the arc at which the band's centre crosses the side edge's plane (pitch p)
    var C = mrCam(0, p), d = [0, 0, 0], a, b, q, it;
    for (b = 5; b < 180; b += 5) { q = mrProj(C, I, mrBand(B, b, d)); if (q[2] <= 0 || Math.abs(q[0]) >= 1) break; }
    a = b - 5;
    for (it = 0; it < 32; it++) { var m = (a + b) / 2; q = mrProj(C, I, mrBand(B, m, d)); if (q[2] > 0 && Math.abs(q[0]) < 1) a = m; else b = m; }
    return b;
  }
  function mrLeg(L, u, out) {   // the setting leg at arc u from J: a small circle of radius rhoL tangent to the band at J, curving down
    var ph = u * MRD / L.sL, c = Math.cos(ph), a = L.cL * L.cL + L.sL * L.sL * c, b = L.sL * L.cL * (1 - c), g = L.sL * Math.sin(ph), i;
    for (i = 0; i < 3; i++) out[i] = L.J[i] * a + L.m[i] * b + L.T[i] * g;
    return out;
  }
  function mrLegEl(L, u, d) { return Math.asin(Math.max(-1, Math.min(1, mrLeg(L, u, d)[1]))) / MRD; }
  function mrLegTo(L, el) {   // the leg's arc where it first reaches el going down (at or under it); -1 if it never does
    var d = [0, 0, 0], a, b, it;
    for (b = 2; b < 180 * L.sL; b += 2) if (mrLegEl(L, b, d) <= el) break;
    if (mrLegEl(L, b, d) > el) return -1;
    a = b - 2; for (it = 0; it < 40; it++) { var m = (a + b) / 2; if (mrLegEl(L, m, d) > el) a = m; else b = m; }
    return b;
  }
  function mrS(o, u) { u = Math.min(u, o.T); return o.wv * u + (o.A > 0 ? o.A * o.T / (MRK.M + 1) * Math.pow(u / o.T, MRK.M + 1) : 0); }   // the leg's arc u s past its join
  function mrV(o, u) { return o.wv + (o.A > 0 ? o.A * Math.pow(Math.min(u, o.T) / o.T, MRK.M) : 0); }   // and its speed (deg/s)
  function mrU(o, s) { var a = 0, b = o.T, it; for (it = 0; it < 32; it++) { var m = (a + b) / 2; if (mrS(o, m) < s) a = m; else b = m; } return b; }
  function mrPace(P, wv) {   // the legs for a crossing speed wv: v(u) = wv + A (u / T)^M, from wv at the join (zero acceleration there) to sD at t0 and t3
    var tauV = P.thetaV / wv, T = (P.t3 - P.t0) / 2 - tauV;
    if (!(T > 0)) return null;
    return { wv: wv, tauV: tauV, T: T, A: Math.max(0, (MRK.M + 1) * (P.sD - wv * T) / T) };
  }
  function mrFeas(P, o) {   // every bound of the legs: the set, the speed at -10, the peak, the turn on the sky (speed x cot rhoL) at the horizon and at the peak
    if (!o) return false;
    var ct = 1 / Math.tan(P.rhoL * MRD); o.vH = mrV(o, mrU(o, P.sH)); o.v10 = mrV(o, mrU(o, P.s10)); o.peak = o.wv + o.A; o.turnH = o.vH * ct; o.turn = o.peak * ct;
    return o.vH <= MRK.SETV && o.v10 <= MRK.V10 && o.peak <= MRK.VPK && o.turnH <= MRK.TURNUP && o.turn <= MRK.TURN;
  }
  function moonPlan(I, K) {   // I: moonInputs; K: a re-plan's kept heading, culmination, case and way
    var P = { psi: I.psi, pN: I.pN, pL: I.pL, coarse: !!I.coarse, noRoom: !!I.noRoom, side: I.side, sigma: I.sigma, keyAz: I.keyAz, lift: I.lift || 0, t0: I.t0, t1: I.t1, t2: I.t2, t3: I.t3, fail: '' }, B = {}, it;
    // STEP 1 and 2: the keep line and the room under the top edge, at the plan's pitch and with the tilt it had (both views keep them)
    var S = mrSamples(I);
    P.loN = mrLo(I, S, I.pN); P.loL = mrLo(I, S, I.pL); P.hiN = mrHi(I, I.pN); P.hiL = mrHi(I, I.pL);
    P.lo = Math.max(P.loN, P.loL); P.hi = Math.min(P.hiN, P.hiL); P.top = Math.max(I.pN, I.pL) + Math.atan(I.tanY) / MRD;
    P.room = !I.noRoom && P.hi - P.lo >= MRK.ROOM;
    P.ec = P.room ? P.lo + (I.coarse ? Math.min(P.hi - P.lo, MRK.RES) : MRK.UP * Math.min(P.hi - P.lo, MRK.SPAN)) : Math.max(P.top + MRK.FOOT, P.lo + 0.5);
    /* (the opening's moon, NIGHT lane: the hub's "the moon in frame at the cut on every moonlit opening") where the window
       has no room under its top edge at the side edges (the lo tier's wide and square windows, the words high), the room
       is taken where the moon stands at the cut (LANDX): the band still over every box's keep line, its centre R + 1 deg
       under the top edge there; it leaves by the top corner on its way out (only there, by moving) */
    P.land = I.land === undefined || I.land === null ? null : I.land; P.landRoom = false; P.landX = I.landX || MRK.LANDX;
    var upL = I.landUp === undefined || I.landUp === null ? MRK.UP : I.landUp;   // (the opening's moon: how far up its room it stands; 226 tries a few to clear the clouds)
    if (P.land !== null && P.room && !I.coarse) P.ec = P.lo + upL * Math.min(P.hi - P.lo, MRK.SPAN);
    if (P.land !== null && !P.room && !I.noRoom) {   // (and, if it must, with less of the keep beyond the footprint: 12, 6, then 0 px; the footprint itself always clear)
      var hT, kf, I2, lo2, mg;
      for (mg = 1; mg >= 0 && !P.landRoom; mg -= 0.5) {   // (and, last, less of the margin under the top edge, to none: the disc still whole in the window)
        hT = Math.min(mrHiAt(I, I.pN, P.landX, mg), mrHiAt(I, I.pL, P.landX, mg));
        for (kf = 1; kf >= 0 && !P.landRoom; kf -= 0.5) {
          I2 = {}; for (var kk in I) I2[kk] = I[kk]; I2.keepPx = I.keepPx * kf;
          lo2 = Math.max(mrLo(I2, S, I.pN), mrLo(I2, S, I.pL));
          if (hT - lo2 >= (mg < 1 ? MRK.LANDROOM / 2 : MRK.LANDROOM)) { P.lo = lo2; P.ec = lo2 + upL * Math.min(hT - lo2, MRK.SPAN); P.landRoom = true; P.landKeep = kf; P.landMg = mg; }
        }
      }
      /* no row over the words at all (the lo tier's wide windows: the name 6-9 deg under the top edge): the moon at the cut
         stands beside the words on its leaving side, as high as the top edge allows, its footprint and keep clear of every
         box's whole outline; from there it only moves out, through the side edge (its way under the keep line, behind the
         words, is before the cut, never drawn) */
      if (!P.landRoom) {
        var mir = (I.sigma || 1) < 0, OL = [], bi, j2, n2, xx, Bd = {};
        for (bi = 0; bi < I.boxes.length; bi++) {
          var bx = I.boxes[bi], x0 = mir ? I.W - bx[2] : bx[0], x1 = mir ? I.W - bx[0] : bx[2], y0 = bx[1], y1 = bx[3];
          if (!(x1 - x0 > 1 && y1 - y0 > 1)) continue;
          n2 = Math.max(1, Math.ceil((x1 - x0) / MRK.STEP)); for (j2 = 0; j2 <= n2; j2++) { OL.push([x0 + (x1 - x0) * j2 / n2, y0]); OL.push([x0 + (x1 - x0) * j2 / n2, y1]); }
          n2 = Math.max(1, Math.ceil((y1 - y0) / MRK.STEP)); for (j2 = 0; j2 <= n2; j2++) { OL.push([x0, y0 + (y1 - y0) * j2 / n2]); OL.push([x1, y0 + (y1 - y0) * j2 / n2]); }
        }
        for (xx = P.landX; xx <= 0.92 && !P.landRoom; xx += 0.02) {
          var ex = Math.min(mrHiAt(I, I.pN, xx), mrHiAt(I, I.pL, xx)) - MRK.SLACK, ok = true, pp, Cq, dq = [0, 0, 0];
          mrBandSet(Bd, ex, 0);
          for (pp = 0; pp < 2 && ok; pp++) {
            var pq = pp ? I.pL : I.pN; Cq = mrCam(0, pq); mrBand(Bd, mrSAt(Bd, I, pq, xx, 120), dq);
            for (j2 = 0; j2 < OL.length; j2++) { var sp = mrPix(Cq, I, OL[j2][0], OL[j2][1]); if (mrAng(dq, sp) < MRK.FOOT + mrAng(sp, mrPix(Cq, I, OL[j2][0], OL[j2][1] - I.keepPx))) { ok = false; break; } }
          }
          if (ok) { P.ec = ex; P.landRoom = true; P.landX = xx; P.landSide = true; }
        }
      }
    }
    // STEP 4: the bowl, as much as the room under the top edge allows at both pitches (0 passes by STEP 2's hi)
    var beta = 0, a = 0, b = MRK.BOWL;
    if (P.room) {
      if (mrTopOK(mrBandSet(B, P.ec, b), I, I.pN) && mrTopOK(B, I, I.pL)) a = b;
      else for (it = 0; it < 8; it++) { var m = (a + b) / 2; if (mrTopOK(mrBandSet(B, P.ec, m), I, I.pN) && mrTopOK(B, I, I.pL)) a = m; else b = m; }
      beta = a;
    }
    P.band = mrBandSet(B, P.ec, beta); P.beta = beta; P.rhoB = B.rhoB;
    // STEP 3: the case: today's moon place (the key's azimuth and 25 deg to the visit's side, at ec) in the plan window: A, it culminates ahead; else B, behind
    var Cp = mrCam(I.psi, I.pN), ma = (I.keyAz + 25 * I.side) * MRD, me = P.ec * MRD, mq = mrProj(Cp, I, [Math.sin(ma) * Math.cos(me), Math.sin(me), Math.cos(ma) * Math.cos(me)]);
    P.caseA = mq[2] > 0 && Math.abs(mq[0]) <= 1; P.Hc = P.caseA ? I.psi : I.psi + 180;
    if (P.land !== null) { P.caseA = true; P.Hc = I.psi; }   // (the opening's moon: ahead, culminating at the view's own heading, wherever the key stands)
    if (K) { P.psi = K.psi; P.Hc = K.Hc; P.caseA = K.caseA; P.sigma = K.sigma; }
    // STEP 5: the reach: the centre past the side edge's plane at either pitch, and the disc's radius; the glare's 6 deg more at one pace
    P.thetaE = Math.max(mrEdge(B, I, I.pN), mrEdge(B, I, I.pL)) + MRK.R; P.thetaV = P.thetaE + MRK.GLARE;
    var J = mrBand(B, P.thetaV, [0, 0, 0]);
    P.rise = J[1];   // (the record: how high the band stands at its join)
    var ph = P.thetaV * MRD / B.sB, TJ = [-Math.cos(ph), -Math.sin(ph) * B.e1[1], -Math.sin(ph) * B.e1[2]];
    // STEP 6: the legs: tangent at J, curving down on a circle sized so the azimuth's turning point lies MONO under the path's end
    var mN = mrNorm([J[1] * TJ[2] - J[2] * TJ[1], J[2] * TJ[0] - J[0] * TJ[2], J[0] * TJ[1] - J[1] * TJ[0]]);
    if (mN[1] > 0) { mN[0] = -mN[0]; mN[1] = -mN[1]; mN[2] = -mN[2]; }
    var rhoL = Math.max(MRK.RHO * MRD, Math.atan((J[1] + Math.sin((MRK.DEEP + MRK.MONO) * MRD)) / -mN[1]));
    P.leg = { J: J, T: TJ, m: mN, cL: Math.cos(rhoL), sL: Math.sin(rhoL) }; P.rhoL = rhoL / MRD;
    P.sH = mrLegTo(P.leg, 0); P.s10 = mrLegTo(P.leg, -10); P.sD = mrLegTo(P.leg, -MRK.DEEP);
    if (P.sD < 0 || P.sH < 0 || P.s10 < 0) { P.fail = 'the leg does not reach -' + MRK.DEEP; P.sD = Math.max(P.sD, 60); P.sH = Math.max(P.sH, 1); P.s10 = Math.max(P.s10, 2); }
    // STEP 7: the pace: the crossing at one speed through the plan window's span over the hold and SPILL of the changes, quickened only as the legs' bounds need
    P.tm = (I.t0 + I.t3) / 2; P.Dvis = (I.t2 - I.t1) + MRK.SPILL * ((I.t1 - I.t0) + (I.t3 - I.t2)); P.w0 = 2 * P.thetaE / P.Dvis;
    var w0 = P.w0, o = mrPace(P, w0);
    if (!o) { w0 = P.thetaV / (0.4 * (I.t3 - I.t0)); o = mrPace(P, w0); }
    if (!mrFeas(P, o)) {
      var lo2 = w0, hi2 = MRK.WMAX, oh = mrPace(P, hi2);
      if (!mrFeas(P, oh)) { P.fail = P.fail || 'no crossing speed up to WMAX meets the legs\' bounds'; o = oh || o; }
      else { for (it = 0; it < 20; it++) { var mm = (lo2 + hi2) / 2; if (mrFeas(P, mrPace(P, mm))) hi2 = mm; else lo2 = mm; } o = mrPace(P, hi2); mrFeas(P, o); }
    }
    P.wv = o.wv; P.tauV = o.tauV; P.T = o.T; P.A = o.A; P.vH = o.vH; P.v10 = o.v10; P.peak = o.peak; P.turnH = o.turnH; P.turn = o.turn;
    /* (the opening's moon) the crossing timed so that at the cut (I.land, sky time) the moon stands LANDX of the way out
       on its leaving side (a third of the window in from the edge it is heading for), or later on its way if the stay's own
       timing has it farther: never earlier than the plan's culmination, so the setting leg keeps at least its own time and
       sets behind the sea before the stay ends; the rising leg, before the cut, is never drawn */
    if (P.land !== null && P.room !== undefined && (P.room || P.landRoom)) {
      var sT = Math.min(mrSAt(B, I, I.pN, P.landX, P.thetaE), mrSAt(B, I, I.pL, P.landX, P.thetaE)), sM = P.wv * (P.land - P.tm), sC = Math.min(Math.max(sT, sM), P.tauV * P.wv);
      P.tm0 = P.tm; P.tm = P.land - sC / P.wv; P.landS = sC;
    }
    return P;
  }
  function moonAt(P, t, out) {   // the moon's direction (out.d, world) and its broad light's share (out.w) at sky time t; out.s its arc from the culmination, out.leg -1 rising, 1 setting, 0 on the band
    var d = out.d, s, leg = 0, c = MRC;
    if (!P || !(t > P.t0 && t < P.t3)) { d[0] = 0; d[1] = -1; d[2] = 0; out.w = 0; out.s = 0; out.v = 0; out.leg = 0; out.el = -90; out.az = 0; return out; }
    var tau = t - P.tm;
    if (Math.abs(tau) <= P.tauV) { s = P.wv * tau; mrBand(P.band, s, c); out.v = P.wv; }
    else {
      var u = Math.abs(tau) - P.tauV, sl = Math.min(mrS(P, u), P.sD);
      mrLeg(P.leg, sl, c); leg = tau < 0 ? -1 : 1; if (tau < 0) c[0] = -c[0];
      s = leg * (P.thetaV + sl); out.v = sl < P.sD ? mrV(P, u) : 0;
    }
    var H = P.Hc * MRD, rx = -(P.sigma < 0 ? -1 : 1) * c[0];
    d[0] = -rx * Math.cos(H) + c[2] * Math.sin(H); d[1] = c[1]; d[2] = rx * Math.sin(H) + c[2] * Math.cos(H);
    out.el = Math.asin(Math.max(-1, Math.min(1, d[1]))) / MRD; out.az = Math.atan2(d[0], d[2]) / MRD;
    out.w = mrSmooth(-MRK.DEEP, -MRK.R, out.el); out.s = s; out.leg = leg;
    return out;
  }
  // MOON-ROUTE-END
