  /* ---- the night's bodies (NIGHT lane, delight-night §1 and §4): the stars coming out by the sun's depth, and the
     evening or morning star. No clock and no words input to the frame: both follow the depth of the sun the sky draws
     (it sinks by moving through a change into a night, SUNU.es; a hold holds it); the planet stands by that sun's glow
     on the ecliptic through it (venusFrame, the hub's ruling of 21:50), at the visit's elongation, chosen once a visit
     so its whole path down keeps clear of the words' boxes at the view's own heading and pitch, as the moon's plan does */
  /* the faintest magnitude that shows at the zenith by the sun's depth under the horizon (deg): the brightest stars and
     the planets at the end of civil twilight (6 deg), the horizon lost and about fourth magnitude at the end of nautical
     (12), the faintest to the eye at the end of astronomical (18): https://aa.usno.navy.mil/faq/RST_defs; between, by
     straight lines; the sky's own light where each star stands lowers it further (sky-body.glsl) */
  var STAR_LIM = [[0, -4], [3, -1], [6, 1], [9, 3], [12, 4.5], [15, 5.6], [18, 6.5], [24, 7]];   // (deeper than the eye's 6.5 at the night's 24 deg so the field's faintest, 6.2, shows whole with its 0.5 of margin: a night keeps every star it had)
  var VEN_EL = [24, 46], VEN_TRY = 12, VEN_TOP_Y = 0.118, VEN_GLOW = 10;   // (its elongation from the sun, deg, on the ecliptic: at most 47; the tries for a clear path; its peak, Y: OKLab L 0.49 in its warm white; its glow's reach, px)
  /* (night) the bright outer planet (Jupiter's kind: magnitude about -2.4, a little under Venus): on the same ecliptic,
     90-180 deg from the drawn sun (an outer planet's elongation, up to opposition), on either side, so on a night it stands
     high in the dark half of the sky; steady and pale cream, its peak under OKLab L 0.47 (Y 0.104), under Venus's 0.49;
     chosen once a visit, its path keeping off the words as Venus's does (bodyPick), from streams of its own (1201, 1202) */
  var JUP_EL = [90, 180], JUP_TOP_Y = 0.104;
  var JUPB = { v: new Float32Array(4), eps: -1, side: 1, seed: NaN, d: [0, 0, 0] };
  var NIGHTB = { m: new Float32Array(4), v: new Float32Array(4), seed: NaN, eps: 0, side: 1, morning: false, fails: -1, D0: 24, d: [0, 0, 0] };
  function starLim(D) {   // the zenith's faintest magnitude at the sun's depth D (deg under the horizon)
    var T = STAR_LIM, i;
    if (D <= T[0][0]) return T[0][1];
    for (i = 1; i < T.length; i++) if (D <= T[i][0]) return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * (D - T[i - 1][0]) / (T[i][0] - T[i - 1][0]);
    return T[T.length - 1][1];
  }
  var ZEN = [0, 0, 0];
  function zenithY(L) { skyGradCPU(L, 90, ZEN); return Math.max(ZEN[0] * 0.2126 + ZEN[1] * 0.7152 + ZEN[2] * 0.0722, 1e-4); }   // (the sky's own light at the zenith, Y: nightLim's reference)
  function skyElOf(O) { return O.skyEl === null || O.skyEl === undefined ? AIR_SUN_NIGHT : O.skyEl; }
  function skyDepth() {   // the sky's own sun's depth under the horizon now (deg): a twilight's, a night's AIR_SUN_NIGHT, and in a change between the two the sinking sun's
    var A = SKY.A, B = SKY.B, k = SKY.k;
    if (!A) return -AIR_SUN_NIGHT;
    if (SUNU.on) return -SUNU.es;
    if (B && A.skyEl !== null && B.skyEl !== null && k > 0 && k < 1) return -Math.asin(clamp(SKY.skyS[1], -1, 1)) / DEG;   // (between two twilights: the arc the glow takes)
    return -(B && k >= 1 ? skyElOf(B) : skyElOf(A));
  }
  /* (the hub's ruling, 21:50: until the night's true order lands, Venus stands by the drawn sky's sun, its glow) a local
     frame for it alone, at AIR's latitude (AIR_LAT) and in AIR's season (the frame's sun declination): north placed so
     the drawn sun (on the key's azimuth, the opening's depth D0) stands where such a sun stands at that depth, in the
     west on an evening visit and in the east on a morning one (first light); the celestial pole AIR_LAT up toward
     north. The planet is placed on the ecliptic through the drawn sun at D0 (its pole 23.44 deg from the pole, the
     season's side from SEED0's stream), then turned with that sun as it sinks: rigid in the sun's own vertical plane
     (the world's sun sets straight down), so its elongation is kept exactly, it always stands by the glow and it never
     swings (re-fitting the ecliptic to a sun sinking straight down swung it 1.7 deg for 0.5 of the sun's). It slips
     against the stars, which turn on their own clock, until one forward clock drives both (delight-visit §5.5) */
  var VEN_F = { seed: NaN, morning: null, D0: NaN, az: NaN, P: [0, 1, 0], sg: 1 };
  function venusFrame(V, morning, D0) {
    var F = VEN_F;
    if (F.seed === J.seed && F.morning === morning && F.D0 === D0 && F.az === V.light.sunAz) return F;
    var f = AIR_LAT * DEG, d = skySphere(SIM.t + (SKY.dt || 0), V).sunDec * DEG, h = -D0 * DEG;
    var A = Math.acos(clamp((Math.sin(d) - Math.sin(f) * Math.sin(h)) / (Math.cos(f) * Math.cos(h)), -1, 1)), bs = morning ? A : 2 * PI - A;   // (the drawn sun's compass bearing, from north through east)
    var S0 = airSkySun(V, -D0), kn = Math.sqrt(S0[0] * S0[0] + S0[2] * S0[2]) || 1, K = [S0[0] / kn, 0, S0[2] / kn], Rk = [-K[2], 0, K[0]];   // (its level direction, and that direction's right: cross(K, up))
    var N = [Math.cos(bs) * K[0] - Math.sin(bs) * Rk[0], 0, Math.cos(bs) * K[2] - Math.sin(bs) * Rk[2]];   // (north: the sun's level direction turned left by its bearing)
    F.P = [N[0] * Math.cos(f), Math.sin(f), N[2] * Math.cos(f)]; F.sg = RNG(subseed(J.seed, 1200)).f() < 0.5 ? -1 : 1;
    F.seed = J.seed; F.morning = morning; F.D0 = D0; F.az = V.light.sunAz;
    return F;
  }
  function venusEcl(F, S, out) {   // the ecliptic's north pole through the sun S: at right angles to S, 23.44 deg from the pole (the nearest where S's declination passes 23.44)
    var P = F.P, ps = P[0] * S[0] + P[1] * S[1] + P[2] * S[2], q = [P[0] - ps * S[0], P[1] - ps * S[1], P[2] - ps * S[2]], cd = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]) || 1, i;
    for (i = 0; i < 3; i++) q[i] /= cd;
    var t = [S[1] * q[2] - S[2] * q[1], S[2] * q[0] - S[0] * q[2], S[0] * q[1] - S[1] * q[0]], ca = Math.min(1, Math.cos(23.44 * DEG) / cd), sa = F.sg * Math.sqrt(1 - ca * ca);
    for (i = 0; i < 3; i++) out[i] = ca * q[i] + sa * t[i];
    return out;
  }
  function venusDir(F, eps, side, D, D0, out) {   // the planet at elongation eps (deg) east (side 1: an evening star) or west (-1: a morning one) of the drawn sun along its ecliptic, placed with the sun at depth D0, turned with it to depth D
    var V = SIM.V, S = airSkySun(V, -D0), E = venusEcl(F, S, [0, 0, 0]), i;
    var t = [E[1] * S[2] - E[2] * S[1], E[2] * S[0] - E[0] * S[2], E[0] * S[1] - E[1] * S[0]], n = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]) || 1, c = Math.cos(eps * DEG), s = Math.sin(eps * DEG) * side / n;   // (east along the ecliptic at S: cross(E, S))
    for (i = 0; i < 3; i++) out[i] = c * S[i] + s * t[i];
    var az = V.light.sunAz * DEG, kx = Math.sin(az), kz = Math.cos(az), a = out[0] * kx + out[2] * kz, b = out[1], w = -out[0] * kz + out[2] * kx, dl = (D0 - D) * DEG, cl = Math.cos(dl), sl = Math.sin(dl);   // (its parts toward the key, up and across; turned by the sun's own change of elevation)
    var a2 = a * cl - b * sl, b2 = a * sl + b * cl;
    out[0] = a2 * kx - w * kz; out[1] = b2; out[2] = a2 * kz + w * kx;
    return out;
  }
  function venusFails(I, F, eps, side, D0) {   // how many of its places on the way down (the opening's depth to the night's, by 0.5 deg) fall on a word box (grown by the keep and its glow) at the view's own heading and pitch
    var C = mrCam(I.psi, I.pN), grow = I.keepPx + VEN_GLOW * (I.keepPx / MOON_KEEP), n = 0, d = [0, 0, 0], D, b, B;
    for (D = D0; D <= -AIR_SUN_NIGHT + 1e-9; D += 0.5) {
      venusDir(F, eps, side, D, D0, d);
      if (d[1] <= 0) break;
      var q = mrProj(C, I, d);
      if (q[2] <= 0) continue;   // (every place in front, in the planning frame or not: a smaller window of the band shows more of the still than the part the plan keeps in frame)
      var x = (q[0] + 1) / 2 * I.W, y = (1 - q[1]) / 2 * I.H;
      for (b = 0; b < I.boxes.length; b++) { B = I.boxes[b]; if (B[2] - B[0] > 1 && B[3] - B[1] > 1 && x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow) { n++; break; } }
    }
    return n;
  }
  function venusSeen(I, d) {   // in the window at the view's own heading and pitch, its glare inside the edges, and over the horizon
    var q = mrProj(mrCam(I.psi, I.pN), I, d);
    return d[1] > 0.02 && q[2] > 0 && Math.abs(q[0]) < 0.92 && Math.abs(q[1]) < 0.92;
  }
  function bodyPick(R, EL, side, F, D0, I, I2) {   // of VEN_TRY elongations drawn from R in EL (the same every plan of a visit), the first whose path down keeps clear of the words in the window I (and I2) and that stands in view at the cut, else the first clear one over the horizon at the cut, else -1: [eps, seen]
    var seen = -1, up = -1, k, d = [0, 0, 0];
    for (k = 0; k < VEN_TRY && seen < 0; k++) {
      var e = R.r(EL[0], EL[1]);
      if (venusFails(I, F, e, side, D0) || (I2 && venusFails(I2, F, e, side, D0))) continue;
      venusDir(F, e, side, D0, D0, d);
      if (venusSeen(I, d)) seen = e; else if (up < 0 && d[1] > 0.02) up = e;
    }
    return [seen >= 0 ? seen : up, seen >= 0];
  }
  function venusPlan(V, I, I2) {   // (I2: the live window's own view, where the night after the cut is seen; its path must keep off the words there too) its side (a morning star on a visit that opens on first light) and, of VEN_TRY elongations drawn (the same every plan of a visit), the first whose path down keeps clear of the words in the window I and that stands in view at the cut (the hub's review of the 4090 frames: seen, not only possible), else the first clear one over the horizon at the cut; none clear: no Venus this visit
    if (!V || !V.light || !I) return false;
    var morning = !!(SKY.landing && SKY.landing.sky === 'firstlight'), R = RNG(subseed(J.seed, 84));
    var el0 = SKY.landing ? airSunEl(SKY.landing.sky) : null, D0 = -(el0 === null ? AIR_SUN_NIGHT : el0), F = venusFrame(V, morning, D0);
    NIGHTB.side = morning ? -1 : 1; NIGHTB.morning = morning;
    var P = bodyPick(R, VEN_EL, NIGHTB.side, F, D0, I, I2);
    NIGHTB.eps = P[0]; NIGHTB.seen = P[1]; NIGHTB.D0 = D0; NIGHTB.seed = J.seed;
    var RJ = RNG(subseed(J.seed, 1201)); JUPB.side = RNG(subseed(J.seed, 1202)).f() < 0.5 ? -1 : 1;
    JUPB.eps = bodyPick(RJ, JUP_EL, JUPB.side, F, D0, I, I2)[0]; JUPB.seed = J.seed;   // (no clear path: no outer planet this visit)
    NIGHTB.none = NIGHTB.eps < 0;   // (the hub's ruling: no clear path down, no Venus this visit, as its still has none)
    NIGHTB.fails = NIGHTB.none ? 1 : 0;
    return true;
  }
  /* (the hub's round-3 review of #301) planned in the sky's step (226's moonStep), never in the draw: once a visit at its
     first step with a window, the opening against the still's own window and words (226's stillInputs, as its moon), so
     the still and the live first frame agree; a new window plans it again with the live one (moonResized), the phone's
     bar shown or hidden only when its path now crosses a word */
  function venusStep() { if (NIGHTB.seed !== J.seed) { var I0 = moonInputs(null), IS = stillInputs(I0); venusPlan(SIM.V, IS, IS !== I0 ? I0 : null); } }   // (the cut in the still's frame; the night after it in the window's own view, the hub's round-5 review)
  function venusResized(heightOnly) {
    if (NIGHTB.seed !== J.seed) return;
    var I = moonInputs(null); if (!I) return;
    var F = venusFrame(SIM.V, NIGHTB.morning, NIGHTB.D0);
    if (heightOnly && (NIGHTB.none || !venusFails(I, F, NIGHTB.eps, NIGHTB.side, NIGHTB.D0)) && (JUPB.eps < 0 || !venusFails(I, F, JUPB.eps, JUPB.side, NIGHTB.D0))) return;
    venusPlan(SIM.V, I);
  }
  function nightBodiesUniforms(u) {
    var V = SIM.V, D = skyDepth();
    NIGHTB.m[0] = starLim(D); NIGHTB.m[1] = V && V.L && V.L.skyFlat ? zenithY(V.L) : 0.016; NIGHTB.m[2] = VEN_TOP_Y; NIGHTB.m[3] = 1 - smooth(15, 18, D);   // (the sky's light holds the stars back in a twilight only: nightLim)
    NIGHTB.v[3] = 0;
    if (V && V.light && NIGHTB.seed === J.seed && !NIGHTB.none) { venusDir(venusFrame(V, NIGHTB.morning, NIGHTB.D0), NIGHTB.eps, NIGHTB.side, D, NIGHTB.D0, NIGHTB.d); NIGHTB.v[0] = NIGHTB.d[0]; NIGHTB.v[1] = NIGHTB.d[1]; NIGHTB.v[2] = NIGHTB.d[2]; NIGHTB.v[3] = 1; }
    if (u.uStarM) gl.uniform4fv(u.uStarM, NIGHTB.m);
    JUPB.v[3] = 0;
    if (V && V.light && JUPB.seed === J.seed && JUPB.eps >= 0) { venusDir(venusFrame(V, NIGHTB.morning, NIGHTB.D0), JUPB.eps, JUPB.side, D, NIGHTB.D0, JUPB.d); JUPB.v[0] = JUPB.d[0]; JUPB.v[1] = JUPB.d[1]; JUPB.v[2] = JUPB.d[2]; JUPB.v[3] = JUP_TOP_Y; }
    if (u.uVen) gl.uniform4fv(u.uVen, NIGHTB.v);
    if (u.uJup) gl.uniform4fv(u.uJup, JUPB.v);
  }
