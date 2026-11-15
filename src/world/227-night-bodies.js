  /* ---- the night's bodies (NIGHT lane, delight-night §1 and §4): the stars coming out by the sun's depth, and the
     evening or morning star. No clock and no words input to the frame: the sun's depth is the sky's own (it sinks by
     moving through a change into a night, SUNU.es; a hold holds it), and the planet's place is the sky frame's
     (airSkyFrame, 215) turned by the visit's elongation, chosen once a visit so its whole setting path keeps clear of
     the words' boxes at the view's own heading and pitch, as the moon's plan does */
  /* the faintest magnitude that shows at the zenith by the sun's depth under the horizon (deg): the brightest stars and
     the planets at the end of civil twilight (6 deg), the horizon lost and about fourth magnitude at the end of nautical
     (12), the faintest to the eye at the end of astronomical (18): https://aa.usno.navy.mil/faq/RST_defs; between, by
     straight lines; the sky's own light where each star stands lowers it further (sky-body.glsl) */
  var STAR_LIM = [[0, -4], [3, -1], [6, 1], [9, 3], [12, 4.5], [15, 5.6], [18, 6.5], [24, 7]];   // (deeper than the eye's 6.5 at the night's 24 deg so the field's faintest, 6.2, shows whole with its 0.6 of margin: a night keeps every star it had)
  var VEN_EL = [24, 46], VEN_TRY = 12, VEN_TOP_Y = 0.118, VEN_GLOW = 10;   // (its elongation from the sun, deg, on the ecliptic: at most 47; the tries for a clear path; its peak, Y: OKLab L 0.49 in its warm white; its glow's reach, px)
  var NIGHTB = { m: new Float32Array(4), v: new Float32Array(4), seed: NaN, eps: 0, side: 1, morning: false, fails: -1, D0: 24, S: [0, 0, 0], Ec: [0, 0, 0], d: [0, 0, 0] };
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
  function venusDir(F, eps, side, D, D0, out) {   // the planet at elongation eps (deg) east (side 1: an evening star) or west (-1: a morning one) of the sun along the ecliptic, placed so with the sun D0 deg under the horizon on the key's azimuth (the opening's depth), and turned with the sun as it sinks to D: the sky about it rigid in the sun's own vertical plane (the world's sun sets straight down), so its elongation is kept exactly and it sinks as the sun does, never rising
    var S = NIGHTB.S, s0 = airSkySun(SIM.V, -D0), E = NIGHTB.Ec, i;
    S[0] = s0[0]; S[1] = s0[1]; S[2] = s0[2]; eclPole(F, S, E);
    var t = [E[1] * S[2] - E[2] * S[1], E[2] * S[0] - E[0] * S[2], E[0] * S[1] - E[1] * S[0]], n = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]) || 1, c = Math.cos(eps * DEG), s = Math.sin(eps * DEG) * side / n;   // (east along the ecliptic at S: cross(E, S))
    for (i = 0; i < 3; i++) out[i] = c * S[i] + s * t[i];
    var az = SIM.V.light.sunAz * DEG, kx = Math.sin(az), kz = Math.cos(az), a = out[0] * kx + out[2] * kz, b = out[1], w = -out[0] * kz + out[2] * kx, dl = (D0 - D) * DEG, cl = Math.cos(dl), sl = Math.sin(dl);   // (its parts toward the key, up and across; the turn by the sun's own change of elevation)
    var a2 = a * cl - b * sl, b2 = a * sl + b * cl;
    out[0] = a2 * kx - w * kz; out[1] = b2; out[2] = a2 * kz + w * kx;
    return out;
  }
  function venusFails(I, F, eps, side, D0) {   // how many of its places on the way down (the opening's depth to the night's) fall on a word box (grown by the keep and its glow) at the view's own heading and pitch
    var C = mrCam(I.psi, I.pN), grow = I.keepPx + VEN_GLOW * (I.keepPx / MOON_KEEP), n = 0, d = [0, 0, 0], D, b, B;
    for (D = D0; D <= -AIR_SUN_NIGHT + 1e-9; D += 0.5) {
      venusDir(F, eps, side, D, D0, d);
      if (d[1] <= 0) break;
      var q = mrProj(C, I, d);
      if (q[2] <= 0 || Math.abs(q[0]) > 1.05 || Math.abs(q[1]) > 1.05) continue;
      var x = (q[0] + 1) / 2 * I.W, y = (1 - q[1]) / 2 * I.H;
      for (b = 0; b < I.boxes.length; b++) { B = I.boxes[b]; if (B[2] - B[0] > 1 && B[3] - B[1] > 1 && x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow) { n++; break; } }
    }
    return n;
  }
  function venusPlan(V) {   // once a visit, at its first frame with a window: its side (the opening's twilight: morning on first light) and the first elongation drawn whose path keeps clear (else the clearest)
    if (NIGHTB.seed === J.seed) return true;
    var I = moonInputs(null); if (!I) return false;
    var morning = !!(SKY.landing && SKY.landing.sky === 'firstlight'), F = airSkyFrame(V, morning), R = RNG(subseed(J.seed, 84));
    var el0 = SKY.landing ? airSunEl(SKY.landing.sky) : null, D0 = -(el0 === null ? AIR_SUN_NIGHT : el0), best = -1, bf = Infinity, k;
    NIGHTB.side = morning ? -1 : 1; NIGHTB.morning = morning;
    for (k = 0; k < VEN_TRY; k++) {
      var e = R.r(VEN_EL[0], VEN_EL[1]), f = venusFails(I, F, e, NIGHTB.side, D0);
      if (f < bf) { bf = f; best = e; }
      if (!f) break;
    }
    NIGHTB.eps = best; NIGHTB.fails = bf; NIGHTB.D0 = D0; NIGHTB.seed = J.seed;
    return true;
  }
  function nightBodiesUniforms(u) {
    var V = SIM.V, D = skyDepth();
    NIGHTB.m[0] = starLim(D); NIGHTB.m[1] = 0; NIGHTB.m[2] = VEN_TOP_Y; NIGHTB.m[3] = 0;
    NIGHTB.v[3] = 0;
    if (V && V.light && venusPlan(V)) { venusDir(airSkyFrame(V, NIGHTB.morning), NIGHTB.eps, NIGHTB.side, D, NIGHTB.D0, NIGHTB.d); NIGHTB.v[0] = NIGHTB.d[0]; NIGHTB.v[1] = NIGHTB.d[1]; NIGHTB.v[2] = NIGHTB.d[2]; NIGHTB.v[3] = 1; }
    if (u.uStarM) gl.uniform4fv(u.uStarM, NIGHTB.m);
    if (u.uVen) gl.uniform4fv(u.uVen, NIGHTB.v);
  }
