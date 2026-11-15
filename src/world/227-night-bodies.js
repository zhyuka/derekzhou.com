  /* ---- the night's bodies (NIGHT lane, delight-night §1 and §4): the stars coming out by the sun's depth, and the
     evening or morning star. No clock and no words input to the frame: the stars follow the depth of the sun the sky
     draws (it sinks by moving through a change into a night, SUNU.es; a hold holds it), and the planet stands on the
     ecliptic of the sky's frame (skyFrame(t), 215: one celestial sphere, its hour held through a hold and eased through
     a change), at the visit's elongation from the frame's sun, chosen once a visit so its path through the opening's
     hold and the changes after it keeps clear of the words' boxes at the view's own heading and pitch, as the moon's
     plan does */
  /* the faintest magnitude that shows at the zenith by the sun's depth under the horizon (deg): the brightest stars and
     the planets at the end of civil twilight (6 deg), the horizon lost and about fourth magnitude at the end of nautical
     (12), the faintest to the eye at the end of astronomical (18): https://aa.usno.navy.mil/faq/RST_defs; between, by
     straight lines; the sky's own light where each star stands lowers it further (sky-body.glsl) */
  var STAR_LIM = [[0, -4], [3, -1], [6, 1], [9, 3], [12, 4.5], [15, 5.6], [18, 6.5], [24, 7]];   // (deeper than the eye's 6.5 at the night's 24 deg so the field's faintest, 6.2, shows whole with its 0.6 of margin: a night keeps every star it had)
  var VEN_EL = [24, 46], VEN_TRY = 12, VEN_TOP_Y = 0.118, VEN_GLOW = 10;   // (its elongation from the sun, deg, on the ecliptic: at most 47; the tries for a clear path; its peak, Y: OKLab L 0.49 in its warm white; its glow's reach, px)
  var NIGHTB = { m: new Float32Array(4), v: new Float32Array(4), seed: NaN, eps: 0, side: 1, morning: false, fails: -1, d: [0, 0, 0] };
  function starLim(D) {   // the zenith's faintest magnitude at the sun's depth D (deg under the horizon)
    var T = STAR_LIM, i;
    if (D <= T[0][0]) return T[0][1];
    for (i = 1; i < T.length; i++) if (D <= T[i][0]) return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * (D - T[i - 1][0]) / (T[i][0] - T[i - 1][0]);
    return T[T.length - 1][1];
  }
  function skyElOf(O) { return O.skyEl === null || O.skyEl === undefined ? AIR_SUN_NIGHT : O.skyEl; }
  function skyDepth() {   // the sky's own sun's depth under the horizon now (deg): a twilight's, a night's AIR_SUN_NIGHT, and in a change between the two the sinking sun's
    var A = SKY.A, B = SKY.B, k = SKY.k;
    if (!A) return -AIR_SUN_NIGHT;
    if (SUNU.on) return -SUNU.es;
    if (B && A.skyEl !== null && B.skyEl !== null && k > 0 && k < 1) return -Math.asin(clamp(SKY.skyS[1], -1, 1)) / DEG;   // (between two twilights: the arc the glow takes)
    return -(B && k >= 1 ? skyElOf(B) : skyElOf(A));
  }
  function venusDir(F, eps, side, out) {   // the planet at elongation eps (deg) east (side 1: an evening star) or west (-1: a morning one) of the frame's sun along its ecliptic: the sun turned about the ecliptic's pole (east: cross(ecl, sun), as east on the ground is cross(north, up))
    var S = F.sun, E = F.ecl, t = [E[1] * S[2] - E[2] * S[1], E[2] * S[0] - E[0] * S[2], E[0] * S[1] - E[1] * S[0]], c = Math.cos(eps * DEG), s = Math.sin(eps * DEG) * side, i;
    for (i = 0; i < 3; i++) out[i] = c * S[i] + s * t[i];
    return out;
  }
  function venusFails(I, P, eps, side) {   // how many of its places through the plan's times (P: the frame's sun and ecliptic at each) fall on a word box (grown by the keep and its glow) at the view's own heading and pitch
    var C = mrCam(I.psi, I.pN), grow = I.keepPx + VEN_GLOW * (I.keepPx / MOON_KEEP), n = 0, d = [0, 0, 0], k, b, B;
    for (k = 0; k < P.length; k++) {
      venusDir(P[k], eps, side, d);
      if (d[1] <= 0) continue;
      var q = mrProj(C, I, d);
      if (q[2] <= 0 || Math.abs(q[0]) > 1.05 || Math.abs(q[1]) > 1.05) continue;
      var x = (q[0] + 1) / 2 * I.W, y = (1 - q[1]) / 2 * I.H;
      for (b = 0; b < I.boxes.length; b++) { B = I.boxes[b]; if (B[2] - B[0] > 1 && B[3] - B[1] > 1 && x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow) { n++; break; } }
    }
    return n;
  }
  function venusPlan(V, tD) {   // once a visit, at its first frame with a window: its side (the opening's twilight: a morning star on first light) and the first elongation drawn whose path keeps clear through the opening's hold and every change the order has drawn after it (else the clearest)
    if (NIGHTB.seed === J.seed) return true;
    var I = moonInputs(null); if (!I) return false;
    var morning = !!(SKY.landing && SKY.landing.sky === 'firstlight'), R = RNG(subseed(J.seed, 84)), P = [], seq = SKY.seq, end = tD + 1, best = -1, bf = Infinity, k, t, F;
    for (k = 0; k < seq.length && k < 3; k++) end = Math.max(end, seq[k].at + seq[k].hold + seq[k].move - (SKY.dt || 0));
    for (t = tD; t <= end; t += 1) { F = skyFrame(t); P.push({ sun: F.sun.slice(), ecl: F.ecl.slice() }); }
    NIGHTB.side = morning ? -1 : 1; NIGHTB.morning = morning;
    for (k = 0; k < VEN_TRY; k++) {
      var e = R.r(VEN_EL[0], VEN_EL[1]), f = venusFails(I, P, e, NIGHTB.side);
      if (f < bf) { bf = f; best = e; }
      if (!f) break;
    }
    NIGHTB.eps = best; NIGHTB.fails = bf; NIGHTB.seed = J.seed;
    return true;
  }
  function nightBodiesUniforms(u) {
    var V = SIM.V, D = skyDepth();
    NIGHTB.m[0] = starLim(D); NIGHTB.m[1] = 0; NIGHTB.m[2] = VEN_TOP_Y; NIGHTB.m[3] = 0;
    NIGHTB.v[3] = 0;
    var tD = SIM.t - (1 - SIM.alpha) * SIM_DT;   // (the drawn time, as the moon's and the camera's)
    if (V && V.light && venusPlan(V, tD)) { venusDir(skyFrame(tD), NIGHTB.eps, NIGHTB.side, NIGHTB.d); NIGHTB.v[0] = NIGHTB.d[0]; NIGHTB.v[1] = NIGHTB.d[1]; NIGHTB.v[2] = NIGHTB.d[2]; NIGHTB.v[3] = 1; }
    if (u.uStarM) gl.uniform4fv(u.uStarM, NIGHTB.m);
    if (u.uVen) gl.uniform4fv(u.uVen, NIGHTB.v);
  }
