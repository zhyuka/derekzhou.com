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
  /* (the hub's round-3 review: the opening against the still's own shape) the opening's plans (its moon, 226; its evening
     star, 227) are made as the still was baked (tools/gpu/bake-stills.js: the window the hour's script named it by): the
     still's own CSS size and frustum (frustumFor at its aspect), its own framing and tilt (TALLK, WIDEK as svInit takes
     them: so its pitch), the keep in its CSS px, coarse as its tier and shape baked it, and the words' boxes the bake
     itself had (STILL_WORDS: scaling this window's boxes is not enough, the words do not scale with the window). So the plan at the cut is the still's, whatever
     this window's size or density: no hop at the cut. Not under reduced motion (the world opens at the window's own view) */
  /* the words' boxes as each still was baked with them (CSS px of the bake's window: hi at the shape's own size, lo at 393
     on its short side; the lettered name's outline, the line, the credit, the two links), measured in Chromium by
     tools/still-words.mjs; tools/checks/43-still-words.sh measures them again on the build and fails if the stylesheet
     has moved them (then: node tools/still-words.mjs --write) */
  var STILL_WORDS = {"hi-393x861":[[25.1,261.2,367.9,341.8],[24,374.9,369,453.9],[24,485.9,369,505.4],[20,820,55.2,841],[79.2,820,133.5,841]],"hi-393x817":[[25.1,240.1,367.9,320.6],[24,353.7,369,432.8],[24,464.8,369,484.3],[20,776,55.2,797],[79.2,776,133.5,797]],"hi-393x770":[[25.1,217.5,367.9,298.1],[24,331.2,369,410.2],[24,442.2,369,461.7],[20,729,55.2,750],[79.2,729,133.5,750]],"hi-393x724":[[25.1,195.5,367.9,276],[24,309.1,369,388.1],[24,420.1,369,439.6],[20,683,55.2,704],[79.2,683,133.5,704]],"hi-393x676":[[25.1,172.4,367.9,253],[24,286.1,369,365.1],[24,397.1,369,416.6],[20,635,55.2,656],[79.2,635,133.5,656]],"hi-393x629":[[25.1,149.9,367.9,230.4],[24,263.5,369,342.5],[24,374.5,369,394],[20,588,55.2,609],[79.2,588,133.5,609]],"hi-393x524":[[25.1,99.5,367.9,180],[24,213.1,369,292.1],[24,324.1,369,343.6],[20,483,55.2,504],[79.2,483,133.5,504]],"hi-1080x1080":[[339.2,347,740.7,441.4],[338,474.6,720.5,553.7],[338,585.7,742,605.2],[32.4,1026.6,67.6,1047.6],[91.6,1026.6,145.9,1047.6]],"hi-1350x1080":[[474.2,339.4,875.7,433.8],[473,467,855.5,546.1],[473,578.1,877,597.6],[40,1019,75.2,1040],[99.2,1019,153.5,1040]],"hi-1728x1080":[[663.2,339.4,1064.7,433.8],[662,467,1044.5,546.1],[662,578.1,1066,597.6],[40,1019,75.2,1040],[99.2,1019,153.5,1040]],"hi-1920x1080":[[759.2,339.4,1160.7,433.8],[758,467,1140.5,546.1],[758,578.1,1162,597.6],[40,1019,75.2,1040],[99.2,1019,153.5,1040]],"hi-2268x1080":[[933.2,339.4,1334.7,433.8],[932,467,1314.5,546.1],[932,578.1,1336,597.6],[40,1019,75.2,1040],[99.2,1019,153.5,1040]],"lo-393x861":[[25.1,261.2,367.9,341.8],[24,374.9,369,453.9],[24,485.9,369,505.4],[20,820,55.2,841],[79.2,820,133.5,841]],"lo-393x817":[[25.1,240.1,367.9,320.6],[24,353.7,369,432.8],[24,464.8,369,484.3],[20,776,55.2,797],[79.2,776,133.5,797]],"lo-393x770":[[25.1,217.5,367.9,298.1],[24,331.2,369,410.2],[24,442.2,369,461.7],[20,729,55.2,750],[79.2,729,133.5,750]],"lo-393x724":[[25.1,195.5,367.9,276],[24,309.1,369,388.1],[24,420.1,369,439.6],[20,683,55.2,704],[79.2,683,133.5,704]],"lo-393x676":[[25.1,172.4,367.9,253],[24,286.1,369,365.1],[24,397.1,369,416.6],[20,635,55.2,656],[79.2,635,133.5,656]],"lo-393x629":[[25.1,149.9,367.9,230.4],[24,263.5,369,342.5],[24,374.5,369,394],[20,588,55.2,609],[79.2,588,133.5,609]],"lo-393x524":[[25.1,99.5,367.9,180],[24,213.1,369,292.1],[24,324.1,369,343.6],[20,483,55.2,504],[79.2,483,133.5,504]],"lo-1080x1080":[[25.1,65,367.9,145.5],[24,162.4,369,241.4],[24,257.1,369,276.6],[20,356.3,55.2,377.3],[79.2,356.3,133.5,377.3]],"lo-1350x1080":[[44.7,58.1,446.2,152.4],[43.5,169.4,426,248.5],[43.5,264.2,447.5,283.7],[20,356.3,55.2,377.3],[79.2,356.3,133.5,377.3]],"lo-1728x1080":[[113.7,58.1,515.2,152.4],[112.5,169.4,495,248.5],[112.5,264.2,516.5,283.7],[20,356.3,55.2,377.3],[79.2,356.3,133.5,377.3]],"lo-1920x1080":[[148.7,58.1,550.2,152.4],[147.5,169.4,530,248.5],[147.5,264.2,551.5,283.7],[21,356.3,56.2,377.3],[80.2,356.3,134.5,377.3]],"lo-2268x1080":[[211.7,58.1,613.2,152.4],[210.5,169.4,593,248.5],[210.5,264.2,614.5,283.7],[24.8,356.3,60,377.3],[84,356.3,138.3,377.3]]};
  function stillInputs(I) {
    if (!I || reduced()) return I;
    var m = null; try { m = /-(lo|hi)-(\d+)x(\d+)\.avif/.exec(getComputedStyle(root).getPropertyValue('--still') || ''); } catch (e) { m = null; }
    if (!m) return I;
    var nw = +m[2], nh = +m[3], lo = m[1] === 'lo', sc = lo ? 393 / Math.min(nw, nh) : 1, bw = Math.round(nw * sc), bh = Math.round(nh * sc), WB = STILL_WORDS[m[1] + '-' + nw + 'x' + nh];   // (the bake's own window, as tools/gpu/bake-stills.js sizes it)
    var ar = bw / bh, fr = frustumFor(ar, {}), tk = smooth(0.95, 1.75, bh / bw), wk = ar >= 1.2 ? 1 : 0, f0 = SIM.V.def.frame || [0.4, 0.6];
    var pN = (Math.atan((2 * lerp(f0[0], f0[1], tk) - 1) * fr.tanY) + CAMUP * DEG * wk) / DEG;
    var c = Math.max(I.W / bw, I.H / bh), ox = (I.W - bw * c) / 2, oy = (I.H - bh * c) / 2, S = {}, k;
    for (k in I) S[k] = I[k];
    S.W = bw; S.H = bh; S.tanX = fr.tanX; S.tanY = fr.tanY; S.pN = pN; S.pL = pN; S.keepPx = MOON_KEEP; S.coarse = lo || bh > bw;
    S.boxes = WB ? WB.map(function (B) { return B.slice(); }) : I.boxes.map(function (B) { return [(B[0] - ox) / c, (B[1] - oy) / c, (B[2] - ox) / c, (B[3] - oy) / c]; });   // (the bake's own boxes; a shape not in the table: this window's, mapped as cover crops it)
    S.lift = 0;
    S.still = m[0];
    return S;
  }
  function moonStep(t) {
    var E = moonStay(t); MOON.E = E;
    if (E && !E.moon && E === SKY.seq[0] && E.landT === undefined) E.landT = t;   // (the opening's own moonlit stay: its moon in frame at the cut, the plan timed to it: 225's P.land)
    if (E && !E.moon) { var I = moonInputs(E); if (I && I.land !== null) { I = stillInputs(I); MOON.still = I.still || ''; } if (I) { E.moon = I.land !== null ? moonClear(E, I) : moonPlan(I); E.moonPlans = 1; MOON.plans++; MOON.off[0] = MOON.off[1] = 0; } }
  }
  /* (the opening's moon, the hub's reviews of #303) its place at the cut kept off the cloud bodies, a pure function of
     the seed: moonLobes lays out, as their own cells lay them out, every cell of each scale within that scale's streaming
     radius of the eye toward the view's heading (MOON_VEIL_AZ), whatever the streamer has reached, and each cloud's
     lobes from the realm's own cloud() and the cell's own stream (its base its y, or its dy over the ground at its
     place). moonClear plans once for each of 3 heights in the room; along each plan's band the places from 0.11 to 0.58
     of the way out (by 0.025, nearest LANDX first) only re-time it (the band is the same), so the first place whose disc
     (centre and 8 limb rays, out to MOON_VEIL_D m) meets under MOON_VEIL m (mean) of the lobes wins, else the least
     veiled, and one plan more makes it exact: 4 plans at most. The place is kept on the stay (E.landX, E.landUp) for a
     resize's re-plan */
  var MOON_VEIL = 5, MOON_VEIL_D = 9000, MOON_VEIL_AZ = 60, MOON_UPS = [null, 0.35, 1], MOON_XS = [1 / 3];
  (function () { for (var i = 1; i <= 9; i++) { MOON_XS.push(1 / 3 - 0.025 * i); if (1 / 3 + 0.025 * i <= 0.6) MOON_XS.push(1 / 3 + 0.025 * i); } })();
  function moonLobes(V, psi, ex, ez) {   // [x, y, z, r] lobes and their bodies' bounds [x, y, z, r, i0, i1], laid out from the seed
    var lob = [], bnd = [], scs = V.def.layout.scales, sc, ix, iz, i, k, CL = [];
    for (sc = 0; sc < scs.length; sc++) {
      var L = scs[sc], n = Math.ceil(L.radius / L.size) + 1, cx = Math.floor(ex / L.size), cz = Math.floor(ez / L.size);
      for (ix = cx - n; ix <= cx + n; ix++) for (iz = cz - n; iz <= cz + n; iz++) {
        var C = new Cell(V, sc, ix, iz), dx = C.cx - ex, dz = C.cz - ez, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd > L.radius + L.size || (dd > 1.5 * L.size && Math.abs(angd(Math.atan2(dx, dz) / DEG, psi)) > MOON_VEIL_AZ)) continue;
        var api = cellApi(C); V.def.cell(api, RNG(api.hash), KITAPI);
        for (i = 0; i < C.clouds.length; i++) CL.push([C, i]);
      }
    }
    /* (the hub's round-3 nit) each cloud's ground at its own place, as its cell's probe reads it (one synchronous probe of
       every cloud's centre, probeJob's own: the camera's 640 m grid clamped at its edge put them 17-35 m off) */
    var pts = [], h = null, q;
    for (q = 0; q < CL.length; q++) { var c0 = CL[q][0].clouds[CL[q][1]]; pts.push(c0.x, c0.z); }
    if (CL.length) h = probeJob(V, pts, Math.min(CL.length, PROBE_CAP), 0, true).h;
    for (q = 0; q < CL.length; q++) {
      var Cq = CL[q][0]; i = CL[q][1];
      {
          var cl = Cq.clouds[i], PF = new Puffs(), gr = h && q < h.length ? h[q] : groundAt(V, cl.x, cl.z, false, true), bi;
          cl.base = cl.y !== undefined ? cl.y : gr + (cl.dy || 0);
          V.def.cloud(cl, PF, RNG(cl.seed || (Cq.key + i * 7919) >>> 0), KITAPI);
          for (bi = 0; bi < PF.bodies.length; bi++) {   // (each body as resolve leaves it: lifted whole over the flight band, cellResolve's bandTopAt)
            var j0 = PF.bodies[bi].i0, j1 = bi + 1 < PF.bodies.length ? PF.bodies[bi + 1].i0 : PF.count(), b0 = lob.length, lowB = 1e9, cxB = 0, czB = 0, j;
            if (j0 >= j1) continue;
            for (j = j0; j < j1; j++) { lowB = Math.min(lowB, PF.a[j * 12 + 1] - 1.3 * PF.a[j * 12 + 3]); cxB += PF.a[j * 12]; czB += PF.a[j * 12 + 2]; }
            var dB = Math.max(bandTopAt(cxB / (j1 - j0), czB / (j1 - j0), gr) - lowB, 0), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
            for (j = j0; j < j1; j++) { k = j * 12; lob.push(PF.a[k], PF.a[k + 1] + dB, PF.a[k + 2], PF.a[k + 3]); for (var a3 = 0; a3 < 3; a3++) { var cc = PF.a[k + a3] + (a3 === 1 ? dB : 0); lo[a3] = Math.min(lo[a3], cc - PF.a[k + 3]); hi[a3] = Math.max(hi[a3], cc + PF.a[k + 3]); } }
            bnd.push((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2, Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2, b0, lob.length);
          }
      }
    }
    return { lob: lob, bnd: bnd };
  }
  function moonVeil(LB, dir, R, ex, ey, ez) {   // the mean chord (m) through the lobes along the disc's centre and 8 limb rays, from the eye
    var up = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a = mrNorm([up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]]), b = [dir[1] * a[2] - dir[2] * a[1], dir[2] * a[0] - dir[0] * a[2], dir[0] * a[1] - dir[1] * a[0]];
    var tot = 0, k, j, l, tr = Math.tan(R * DEG), B = LB.bnd, Lo = LB.lob;
    for (k = 0; k < 9; k++) {
      var c = k ? Math.cos(k * PI / 4) * tr : 0, s2 = k ? Math.sin(k * PI / 4) * tr : 0, d = mrNorm([dir[0] + a[0] * c + b[0] * s2, dir[1] + a[1] * c + b[1] * s2, dir[2] + a[2] * c + b[2] * s2]);
      cbSet(ex, ey, ez, ex + d[0] * MOON_VEIL_D, ey + d[1] * MOON_VEIL_D, ez + d[2] * MOON_VEIL_D);
      for (j = 0; j < B.length; j += 6) { if (!cbChord(B[j], B[j + 1], B[j + 2], B[j + 3])) continue; for (l = B[j + 4]; l < B[j + 5]; l += 4) tot += cbChord(Lo[l], Lo[l + 1], Lo[l + 2], Lo[l + 3]); }
    }
    return tot / 9;
  }
  function moonBandDir(P, s, out) {   // the plan's band at arc s, turned to its heading (moonAt's own turn)
    var c = mrBand(P.band, s, [0, 0, 0]), H = P.Hc * MRD, rx = -(P.sigma < 0 ? -1 : 1) * c[0];
    out[0] = -rx * Math.cos(H) + c[2] * Math.sin(H); out[1] = c[1]; out[2] = rx * Math.sin(H) + c[2] * Math.cos(H);
    return out;
  }
  function moonClear(E, I, LB, eye) {   // LB, eye: the lobes and the eye (226's own when not given: moonLobes about the flight's place)
    eye = eye || [CS.x, CS.y, CS.z];
    var t0 = clockNow(); LB = LB || moonLobes(SIM.V, I.psi, eye[0], eye[2]); MOON.lobeMs = clockNow() - t0; MOON.lobes = LB.lob.length / 4;   // (its cost, recorded only: never read for what is drawn)
    var bx = MOON_XS[0], bu = null, bv = Infinity, u, k, P, d = [0, 0, 0], plans = 0, done = false;
    for (u = 0; u < MOON_UPS.length && !done; u++) {
      I.landX = MRK.LANDX; I.landUp = MOON_UPS[u]; P = moonPlan(I); plans++;
      if (!(P.room || P.landRoom)) continue;
      var xs = P.landSide ? [P.landX] : MOON_XS;
      for (k = 0; k < xs.length; k++) {
        var s;
        if (P.landSide) s = P.landS;
        else { var sT = Math.min(mrSAt(P.band, I, I.pN, xs[k], P.thetaE), mrSAt(P.band, I, I.pL, xs[k], P.thetaE)); s = Math.min(Math.max(sT, P.wv * (I.land - P.tm0)), P.tauV * P.wv); }
        var v = moonVeil(LB, moonBandDir(P, s, d), MRK.R, eye[0], eye[1], eye[2]);
        if (v < bv) { bv = v; bx = xs[k]; bu = MOON_UPS[u]; }
        if (v < MOON_VEIL) { done = true; break; }
      }
    }
    I.landX = bx; I.landUp = bu; P = moonPlan(I); plans++;
    E.landX = bx; E.landUp = bu; MOON.veil = bv; MOON.landPlans = plans; MOON.clearMs = clockNow() - t0;
    return P;
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
