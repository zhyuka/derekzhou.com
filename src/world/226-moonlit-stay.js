  /* the moonlit stay on the sky's clock, its plan made once as it begins (from the view, the window and the words'
     boxes then: composition; never in the sky's or the composite's pass), the moon on show at the drawn time; a resize
     re-plans (a height-only one only if the plan no longer holds, the moon then eased onto the new plan by an offset
     that decays with the frustum's own 0.35 s) */
  var MOON_LAND = 57.5, MOON_BAR = 0.15, MOON_EASE = 0.35, WORDSIH = 0;
  var MOON = { E: null, off: [0, 0], plans: 0, s: { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 }, a: { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 } };
  function basePitchT(V) { var fr = V.def.frame || [0.4, 0.6]; return Math.atan((2 * lerp(fr[0], fr[1], TALLK) - 1) * FRT.tanY) + CAMUP * DEG * WIDEKT; }   // (basePitch at the frustum's target)
  function moonStay(t) {   // the moonlit entry whose stay holds sky time t (its times kept on it: t0 its change in's start, or MOON_LAND before a landing's)
    var seq = SKY.seq, i = SKY.i, e = seq[i], n = seq[i + 1];
    if (!e) return null;
    if (e.id !== 'moonlit') { if (!n || n.id !== 'moonlit' || t < e.at + e.hold) return null; e = n; i++; }
    if (!e.mt) { var t1 = e.at, t2 = t1 + e.hold; e.mt = [i > 0 ? t1 - seq[i - 1].move : t1 - MOON_LAND, t1, t2, t2 + e.move]; }
    return e;
  }
  function moonInputs(E) {   // every DOM read of the plan, here: the view, the window, the words' boxes (the stack at its highest place: the phone's bar shown), the pointer, the page's touch mode
    var V = SIM.V; if (!V || !V.light || !OUT.w || !OUT.h || !TG) return null;
    var coarse = false, svh = NaN, sv = null, b;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
    try { sv = /^\s*([0-9.]+)px\s*$/.exec(getComputedStyle(root).getPropertyValue('--svh')); } catch (e) { sv = null; }
    if (sv) svh = +sv[1];
    if (!(svh >= 0.5 * OUT.cssH && svh <= OUT.cssH + 1)) svh = coarse ? (1 - MOON_BAR) * OUT.cssH : NaN;
    var lift = svh === svh && WORDSIH > 0 ? Math.max(0, WORDSIH - svh) / 2 * OUT.dpr : 0, boxes = [], mt = E && E.mt ? E.mt : [0, 0, 0, 0];
    for (b = 0; b < 5; b++) boxes.push([WORDS[b * 4], WORDS[b * 4 + 1] - (b < 3 ? lift : 0), WORDS[b * 4 + 2], WORDS[b * 4 + 3] - (b < 3 ? lift : 0)]);
    return { psi: (CS.yawV + CS.phi) / DEG, pN: basePitchT(V) / DEG, pL: (basePitchT(V) + CS.thU + CS.thP) / DEG, tanX: FRT.tanX, tanY: FRT.tanY, W: OUT.w, H: OUT.h, boxes: boxes, keepPx: MOON_KEEP * OUT.dpr,
      coarse: coarse, noRoom: TOUCHMODE === 'scroll', keyAz: V.light.sunAz, side: SKY.moonSide || 1, sigma: SKY.moonDir || 1, lift: lift, t0: mt[0], t1: mt[1], t2: mt[2], t3: mt[3], land: E && E.landT !== undefined ? E.landT : null, landX: E && E.landX, landUp: E && E.landUp };
  }
  function moonStep(t) {
    var E = moonStay(t); MOON.E = E;
    if (E && !E.moon && E === SKY.seq[0] && E.landT === undefined) E.landT = t;   // (the opening's own moonlit stay: its moon in frame at the cut, the plan timed to it: 225's P.land)
    if (E && !E.moon) { var I = moonInputs(E); if (I) { E.moon = I.land !== null ? moonClear(E, I) : moonPlan(I); E.moonPlans = 1; MOON.plans++; MOON.off[0] = MOON.off[1] = 0; } }
  }
  /* (the opening's moon, the hub's review of #303) its place at the cut kept off the cloud bodies about the eye: the
     places tried in order (along its band from 0.11 to 0.58 of the way out by 0.025, nearest LANDX first, at each of 5 heights in its room), the first whose disc (its
     centre and 8 points on its limb) meets less than MOON_VEIL m (mean) of the visible lobes (each a sphere: cloudBetween3's measure) out to
     MOON_VEIL_D m wins, else the least veiled: a moon behind thin cloud, never one hidden by a solid body when a clear or
     thinner place is there. Placed before the first frame; the place is kept on the stay (E.landX, E.landUp) so a resize's
     re-plan keeps it */
  var MOON_VEIL = 5, MOON_VEIL_D = 9000, MOON_TRY = [];
  (function () { var X = [1 / 3], U = [null, 0.35, 1, 0.55, 0.15], i, j; for (i = 1; i <= 9; i++) { X.push(1 / 3 - 0.025 * i); if (1 / 3 + 0.025 * i <= 0.6) X.push(1 / 3 + 0.025 * i); } for (j = 0; j < U.length; j++) for (i = 0; i < X.length; i++) MOON_TRY.push([X[i], U[j]]); })();   // (across, then up its room: LANDX at the plan's own height first)
  function moonVeil(dir, R) {   // the mean chord (m) through the visible lobes along the disc's centre and 8 limb rays, from the eye
    var V = SIM.V, L = V && V.cellList, ex = CS.x, ey = CS.y, ez = CS.z, up = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a = mrNorm([up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]]), b = [dir[1] * a[2] - dir[2] * a[1], dir[2] * a[0] - dir[0] * a[2], dir[0] * a[1] - dir[1] * a[0]];
    if (!L) return 0;
    var tot = 0, k, i, j, l, tr = Math.tan(R * DEG);
    for (k = 0; k < 9; k++) {
      var c = k ? Math.cos(k * PI / 4) * tr : 0, s2 = k ? Math.sin(k * PI / 4) * tr : 0, d = mrNorm([dir[0] + a[0] * c + b[0] * s2, dir[1] + a[1] * c + b[1] * s2, dir[2] + a[2] * c + b[2] * s2]);
      cbSet(ex, ey, ez, ex + d[0] * MOON_VEIL_D, ey + d[1] * MOON_VEIL_D, ez + d[2] * MOON_VEIL_D);
      for (i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 3 || !C.soft || !C.softB) continue;
        for (j = 0; j < C.softB.length; j++) { var B = C.softB[j]; if (!cbChord(B[0], B[1], B[2], B[3])) continue; for (l = B[4]; l < B[5]; l += 4) tot += cbChord(C.soft[l], C.soft[l + 1], C.soft[l + 2], C.soft[l + 3]); }
      }
    }
    return tot / 9;
  }
  function moonClear(E, I) {
    var best = null, bv = Infinity, k, P, o = { d: [0, 0, 0] };
    for (k = 0; k < MOON_TRY.length; k++) {
      I.landX = MOON_TRY[k][0]; I.landUp = MOON_TRY[k][1]; P = moonPlan(I);
      if (!(P.room || P.landRoom)) { best = P; bv = 0; E.landX = I.landX; E.landUp = I.landUp; break; }   // (no place for it in frame at all: the plan as it is)
      moonAt(P, I.land, o); var v = moonVeil(o.d, MRK.R);
      P.veil = v;
      if (v < bv) { bv = v; best = P; E.landX = I.landX; E.landUp = I.landUp; }
      if (v < MOON_VEIL) break;
    }
    MOON.veil = bv;
    return best;
  }
  function moonShown(t, out) {   // the plan's moon at t, turned by the re-plan's offset (0 with no resize: a still and a flight agree)
    var E = MOON.E, P = E && E.moon;
    moonAt(P || null, t, out);
    if (P && t > P.t0 && t < P.t3 && (MOON.off[0] || MOON.off[1])) {
      var az = (out.az + MOON.off[0]) * DEG, el = (out.el + MOON.off[1]) * DEG;
      out.d[0] = Math.sin(az) * Math.cos(el); out.d[1] = Math.sin(el); out.d[2] = Math.cos(az) * Math.cos(el); out.az = az / DEG; out.el = el / DEG; out.w = mrSmooth(-MRK.DEEP, -MRK.R, out.el);
    }
    return out;
  }
  function moonFits(P, Pn, I) {   // a height-only resize: the plan as it stands against the new view (its band over the new keep line and under the new top edge, its bowl too)
    if (P.room !== Pn.room) return false;
    if (!P.room) return P.ec >= Pn.top + MRK.FOOT - 1e-9 && P.ec >= Pn.lo + 0.5 - 1e-9;
    return P.ec >= Pn.lo - 1e-9 && P.ec <= Pn.hi + 1e-9 && mrTopOK(P.band, I, I.pN) && mrTopOK(P.band, I, I.pL);
  }
  function moonResized(heightOnly) {
    var E = MOON.E, P = E && E.moon; if (!P) return;
    var I = moonInputs(E); if (!I) return;
    var Pn = moonPlan(I, { psi: P.psi, Hc: P.Hc, caseA: P.caseA, sigma: P.sigma });
    if (!heightOnly) { E.moon = Pn; E.moonPlans++; MOON.plans++; MOON.off[0] = MOON.off[1] = 0; return; }   // (a new window: the view's own cut)
    if (moonFits(P, Pn, I)) return;
    var tD = SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, sh = moonShown(tD, MOON.s), az0 = sh.az, el0 = sh.el;   // (what is on show, offset included: offsets chain)
    E.moon = Pn; E.moonPlans++; MOON.plans++; moonAt(Pn, tD, MOON.a);
    if (sh.w > 0 || MOON.a.w > 0) { MOON.off[0] = angd(az0, MOON.a.az); MOON.off[1] = el0 - MOON.a.el; } else MOON.off[0] = MOON.off[1] = 0;
  }
  function moonEase(dt) { if (!MOON.off[0] && !MOON.off[1]) return; var k = Math.exp(-dt / MOON_EASE); MOON.off[0] *= k; MOON.off[1] *= k; if (Math.abs(MOON.off[0]) < 1e-7 / DEG) MOON.off[0] = 0; if (Math.abs(MOON.off[1]) < 1e-7 / DEG) MOON.off[1] = 0; }
  function skyNightUniforms(P) {
    var V = SIM.V, fx = SKY.fx, u = P.u;
    if (!u.uMoon) return;
    if (!SKYN.c0 && V) { var MF = WSKY.moonlit.fx.moon; SKYN.moonC.set(lchA(MF.L)); SKYN.moonG.set(lchA(MF.glow)); SKYN.c0 = true; }   // (the moon's disc and glare: the moonlit sky's own table)
    if (V) { moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, MOON.s); SKYN.moon[0] = MOON.s.d[0]; SKYN.moon[1] = MOON.s.d[1]; SKYN.moon[2] = MOON.s.d[2]; SKYN.moon[3] = DEVMODE && MOONF.moonOff ? 0 : MOON.s.w; }   // (the moon on its route at the drawn time, as the camera and the stars are; fx[4] kept for the record only)
    else { SKYN.moon[0] = 0; SKYN.moon[1] = 1; SKYN.moon[2] = 0; SKYN.moon[3] = 0; }
    SKYN.night[0] = fx[0]; SKYN.night[1] = SUNU.on ? 0 : fx[1]; SKYN.night[2] = reduced() ? 0 : 1; SKYN.night[3] = STAR_TOP_Y;
    if (u.uSunB) { SUNU.sb[0] = SUNU.on ? fx[1] : 0; SUNU.sb[1] = SUNU.on && V && V.L ? V.L.hi[1] : 0; gl.uniform4fv(u.uSunB, SUNU.sb); }   // (in a change between a twilight sky and a night the wisps and the veil drawn by their own blocks)
    gl.uniform4fv(u.uMoon, SKYN.moon); gl.uniform3fv(u.uMoonC, SKYN.moonC); gl.uniform3fv(u.uMoonG, SKYN.moonG); gl.uniform4fv(u.uNight, SKYN.night);
    if (u.uGal) { var G = SKY.gal; gl.uniform4f(u.uGal, G.pole[0], G.pole[1], G.pole[2], fx[2]); gl.uniform4f(u.uGalC, G.core[0], G.core[1], G.core[2], 0); gl.uniform4f(u.uAur, 0, SKY.aur.ph, SKY.aur.base, fx[3]); }
  }
