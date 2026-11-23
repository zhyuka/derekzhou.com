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
     tools/still-words.mjs; tools/checks/70-still-words.sh measures them again on the build and fails if the stylesheet
     has moved them (then: node tools/still-words.mjs --write) */
  /* (the hub's round-4 review) each still's band's smallest window (CSS px; lo: at 393's density, its short side 360):
     STILL_WORDS holds the union of the bake's boxes and this window's, mapped into the still's frame as cover crops it,
     so a body planned clear of them is clear of the words on every window of the band from this one up; a window
     smaller than this one plans against its own words (a hop at its cut, as a resize has) */
  var STILL_MIN = {"hi-393x861":[360,780],"hi-393x817":[360,720],"hi-393x770":[360,690],"hi-393x724":[360,670],"hi-393x676":[360,640],"hi-393x629":[360,600],"hi-393x524":[360,500],"hi-1080x1080":[800,720],"hi-1350x1080":[1024,768],"hi-1728x1080":[1280,800],"hi-1920x1080":[1366,768],"hi-2268x1080":[1366,620],"lo-393x861":[360,780],"lo-393x817":[360,720],"lo-393x770":[360,690],"lo-393x724":[360,670],"lo-393x676":[360,640],"lo-393x629":[360,600],"lo-393x524":[360,500],"lo-1080x1080":[400,360],"lo-1350x1080":[480,360],"lo-1728x1080":[576,360],"lo-1920x1080":[640,360],"lo-2268x1080":[793,360]};
  var STILL_WORDS = {"hi-393x861":[[25.1,251.7,367.9,341.8],[24,367.2,369,453.9],[24,485.9,369,509.8],[20,811.5,60.3,841],[79.2,811.5,145.7,841]],"hi-393x817":[[25.1,231,367.9,320.6],[24,346.5,369,432.8],[24,464.8,369,489.1],[20,756.7,60.3,797],[79.2,756.7,145.7,797]],"hi-393x770":[[25.1,208.2,367.9,298.1],[24,323.6,369,410.2],[24,442.2,369,466.2],[20,716.9,60.3,750],[79.2,716.9,145.7,750]],"hi-393x724":[[25.1,187.4,367.9,276],[24,301.7,369,388.1],[24,420.1,369,442.8],[20,679.7,61.6,704],[79.2,679.7,146.3,704]],"hi-393x676":[[25.1,167.9,367.9,253],[24,279.7,369,365.1],[24,397,369,417.6],[20,632.7,64.7,656],[79.2,632.7,147.4,656]],"hi-393x629":[[25.1,146.6,367.9,230.4],[24,257.5,369,342.5],[24,373.9,369,394.4],[20,586,65.7,609],[79.2,586,147.8,609]],"hi-393x524":[[25.1,99.5,367.9,195.6],[24,213.1,369,300.5],[24,321.4,369,343.6],[20,481,65.7,504],[79.2,481,147.8,504]],"hi-1080x1080":[[268.9,300.5,810.9,441.4],[267.3,472.8,783.7,579.6],[267.3,585.7,812.7,649.1],[32.4,965.3,79.9,1047.6],[91.6,965.3,185.6,1047.6]],"hi-1350x1080":[[410.3,296.1,939.6,433.8],[408.7,464.3,913,568.5],[408.7,578.1,941.3,636.4],[40,978.1,86.9,1040],[99.2,978.1,190.1,1040]],"hi-1728x1080":[[592.9,278.9,1134.9,433.8],[591.3,451.3,1107.7,558],[591.3,578.1,1136.7,627.5],[40,999.8,99.4,1040],[99.2,999.8,205.1,1040]],"hi-1920x1080":[[677.8,266.9,1242.1,433.8],[676.1,446.2,1213.7,557.3],[676.1,578.1,1243.9,629.7],[40,994,105.7,1040],[99.2,994,215.8,1040]],"hi-2268x1080":[[800.6,222.2,1467.2,433.8],[798.6,434.1,1433.7,565.4],[798.6,578.1,1469.4,650.9],[40,953.4,124.9,1040],[99.2,953.4,254.9,1040]],"lo-393x861":[[25.1,251.7,367.9,341.8],[24,367.2,369,453.9],[24,485.9,369,509.8],[20,811.5,60.3,841],[79.2,811.5,145.7,841]],"lo-393x817":[[25.1,231,367.9,320.6],[24,346.5,369,432.8],[24,464.8,369,489.1],[20,756.7,60.3,797],[79.2,756.7,145.7,797]],"lo-393x770":[[25.1,208.2,367.9,298.1],[24,323.6,369,410.2],[24,442.2,369,466.2],[20,716.9,60.3,750],[79.2,716.9,145.7,750]],"lo-393x724":[[25.1,187.4,367.9,276],[24,301.7,369,388.1],[24,420.1,369,442.8],[20,679.7,61.6,704],[79.2,679.7,146.3,704]],"lo-393x676":[[25.1,167.9,367.9,253],[24,279.7,369,365.1],[24,397,369,417.6],[20,632.7,64.7,656],[79.2,632.7,147.4,656]],"lo-393x629":[[25.1,146.6,367.9,230.4],[24,257.5,369,342.5],[24,373.9,369,394.4],[20,586,65.7,609],[79.2,586,147.8,609]],"lo-393x524":[[25.1,99.5,367.9,195.6],[24,213.1,369,300.5],[24,321.4,369,343.6],[20,481,65.7,504],[79.2,481,147.8,504]],"lo-1080x1080":[[24.7,65,368.2,149.8],[23.6,162.4,369.4,242.7],[23.6,256.8,369.4,276.6],[19.7,338.6,55.2,377.3],[77.8,338.6,133.5,377.3]],"lo-1350x1080":[[40.1,57.7,450.8,154.2],[38.9,169.4,430.1,251],[38.9,264.2,452.1,285.7],[20,344.4,56.5,377.3],[79.2,344.4,136.6,377.3]],"lo-1728x1080":[[95.3,48.4,533.6,152.4],[94,168.4,511.5,254.7],[94,264.2,535,291.7],[20,354.4,60.4,377.3],[79.2,354.4,145.8,377.3]],"lo-1920x1080":[[130.3,48.4,568.6,152.4],[129,168.4,546.5,254.7],[129,264.2,570,291.7],[21,354.4,60.4,377.3],[80.2,354.4,145.9,377.3]],"lo-2268x1080":[[203.6,55.3,621.3,153.4],[202.3,169.4,600.3,252],[202.3,264.2,622.7,287.2],[24.8,346.9,61.4,377.3],[84,346.9,142.8,377.3]]};
  function stillView(w, h, f0, out) {   // a window's own view at the cut (CSS w x h): setFrustum's frustum, svInit's framing and tilt (TALLK, WIDEK), so its pitch, deg
    var ar = w / h, fr = frustumFor(ar, {}), tk = smooth(0.95, 1.75, h / w), wk = ar >= 1.2 ? 1 : 0;
    out.tanX = fr.tanX; out.tanY = fr.tanY; out.pN = (Math.atan((2 * lerp(f0[0], f0[1], tk) - 1) * fr.tanY) + CAMUP * DEG * wk) / DEG;
    return out;
  }
  /* (the hub's round-5 review) each still's band of window shapes (width / height), as hour.js picks the still by its
     SHAPES (the first band from a 20:9 phone's 0.44, the last to a 21:9 screen's 2.4): every window of the band shows the
     still as cover crops it, a wider one losing its top and bottom, a narrower its sides, so the opening is planned in
     the part every one of them shows (a disc in it is whole on each), and its keep (the 12 px and the evening star's glow
     beyond it) is the band's smallest window's, scaled into the still's pixels (1 / its cover scale) */
  var STILL_BAND = {"393x861":[0.44,0.4808],"393x817":[0.4807,0.5103],"393x770":[0.5102,0.5283],"393x724":[0.5282,0.5435],"393x676":[0.5434,0.5814],"393x629":[0.5813,0.625],"393x524":[0.625,0.7502],"1080x1080":[0.7501,1.249],"1350x1080":[1.249,1.599],"1728x1080":[1.599,1.777],"1920x1080":[1.777,2.099],"2268x1080":[2.099,2.4]};
  function stillFrame(tier, nw, nh, f0) {   // the still's planning window (CSS px of its bake): the part of it every window of its band shows, its view and keep, the words' boxes in it; null for a shape not in the tables
    var key = tier + '-' + nw + 'x' + nh, WB = STILL_WORDS[key], MN = STILL_MIN[key], BD = STILL_BAND[nw + 'x' + nh];
    if (!WB || !MN || !BD) return null;
    var sc = tier === 'lo' ? 393 / Math.min(nw, nh) : 1, bw = Math.round(nw * sc), bh = Math.round(nh * sc), vw = stillView(bw, bh, f0, {});
    var cw = Math.min(bw, bh * BD[0]), ch = Math.min(bh, bw / BD[1]), dx = (bw - cw) / 2, dy = (bh - ch) / 2, cm = Math.max(MN[0] / bw, MN[1] / bh);
    return { W: cw, H: ch, tanX: vw.tanX * cw / bw, tanY: vw.tanY * ch / bh, pN: vw.pN, keepPx: MOON_KEEP / Math.min(cm, 1), coarse: tier === 'lo' || bh > bw, bw: bw, bh: bh, dx: dx, dy: dy,
      boxes: WB.map(function (B) { return [B[0] - dx, B[1] - dy, B[2] - dx, B[3] - dy]; }) };
  }
  function stillInputs(I) {
    if (!I || reduced()) return I;
    var m = null; try { m = /-(lo|hi)-(\d+)x(\d+)\.avif/.exec(getComputedStyle(root).getPropertyValue('--still') || ''); } catch (e) { m = null; }
    if (!m) return I;
    var MN = STILL_MIN[m[1] + '-' + m[2] + 'x' + m[3]];
    if (MN && (OUT.cssW < MN[0] - 0.5 || OUT.cssH < MN[1] - 0.5)) return I;   // (a window smaller than the table covers: its own words)
    var F = stillFrame(m[1], +m[2], +m[3], SIM.V.def.frame || [0.4, 0.6]), S = {}, k;
    if (!F) return I;   // (a shape not in the tables: the window's own)
    for (k in I) S[k] = I[k];
    S.W = F.W; S.H = F.H; S.tanX = F.tanX; S.tanY = F.tanY; S.pN = F.pN; S.pL = F.pN; S.keepPx = F.keepPx; S.coarse = F.coarse; S.boxes = F.boxes;
    S.lift = 0;
    S.still = m[0];
    return S;
  }
  function moonStep(t) {
    meteorStep(t);   // (219: the night stay's meteors, planned as their time comes)
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
    var lk = [LATEK.creature, LATEK.glow, LATEK.beam];   // (the hub's round-4 nit: a layout only, so the late programs' flags (230's flock, glows, beam) are put back as they were: none starts compiling at the opening for a cell the streamer has not reached)
    for (sc = 0; sc < scs.length; sc++) {
      var L = scs[sc], n = Math.ceil(L.radius / L.size) + 1, cx = Math.floor(ex / L.size), cz = Math.floor(ez / L.size);
      for (ix = cx - n; ix <= cx + n; ix++) for (iz = cz - n; iz <= cz + n; iz++) {
        var C = new Cell(V, sc, ix, iz), dx = C.cx - ex, dz = C.cz - ez, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd > L.radius + L.size || (dd > 1.5 * L.size && Math.abs(angd(Math.atan2(dx, dz) / DEG, psi)) > MOON_VEIL_AZ)) continue;
        var api = cellApi(C); V.def.cell(api, RNG(api.hash), KITAPI);
        for (i = 0; i < C.clouds.length; i++) CL.push([C, i]);
      }
    }
    LATEK.creature = lk[0]; LATEK.glow = lk[1]; LATEK.beam = lk[2];
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
  function moonPlaceS(P, I, x) {   // the band's s where moonClear tries the moon at x of the way across (beside the words: the plan's own)
    if (P.landSide) return P.landS;
    var sT = Math.min(mrSAt(P.band, I, I.pN, x, P.thetaE), mrSAt(P.band, I, I.pL, x, P.thetaE));
    return Math.min(Math.max(sT, P.wv * (I.land - P.tm0)), P.tauV * P.wv);
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
        var v = moonVeil(LB, moonBandDir(P, moonPlaceS(P, I, xs[k]), d), MRK.R, eye[0], eye[1], eye[2]);
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
  /* (delight-weather 4) the glory's uniform: the moon's own direction (the air's airMoon, at the drawn sky time, as the
     sky draws it) and the amount, the moon's own (w: nought on any sky but the moonlit) while it stands over the sea's
     top (its first 3 degrees up: the point opposite it under the horizon) */
  var GLORYU = new Float32Array(4), GLORYT = NaN, GLORYP = -1;
  function gloryUniform() {
    var tD = SIM.V ? SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt : NaN;
    if (tD === GLORYT && MOON.plans === GLORYP) return GLORYU;   // (and the moon's plan: a resize re-plans it at the same moment (reduced motion's still), and the glory follows it)
    GLORYT = tD; GLORYP = MOON.plans; GLORYU[3] = 0;
    if (!SIM.V) { GLORYU[0] = 0; GLORYU[1] = 1; GLORYU[2] = 0; return GLORYU; }
    var m = airMoon(tD); GLORYU[0] = m.d[0]; GLORYU[1] = m.d[1]; GLORYU[2] = m.d[2];
    GLORYU[3] = DEVMODE && MOONF.moonOff ? 0 : m.w * mrSmooth(0, 3, m.el);
    return GLORYU;
  }
  function skyNightUniforms(P) {
    var V = SIM.V, fx = SKY.fx, u = P.u;
    if (!u.uMoon) return;
    if (!SKYN.c0 && V) { var MF = WSKY.moonlit.fx.moon; SKYN.moonC.set(lchA(MF.L)); SKYN.moonG.set(lchA(MF.glow)); SKYN.c0 = true; }   // (the moon's disc and glare: the moonlit sky's own table)
    if (V) { moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, MOON.s); SKYN.moon[0] = MOON.s.d[0]; SKYN.moon[1] = MOON.s.d[1]; SKYN.moon[2] = MOON.s.d[2]; SKYN.moon[3] = DEVMODE && MOONF.moonOff ? 0 : MOON.s.w; }   // (the moon on its route at the drawn time, as the camera and the stars are; fx[4] kept for the record only)
    else { SKYN.moon[0] = 0; SKYN.moon[1] = 1; SKYN.moon[2] = 0; SKYN.moon[3] = 0; }
    SKYN.night[0] = fx[0]; SKYN.night[1] = SUNU.on ? 0 : fx[1]; SKYN.night[2] = reduced() ? 0 : 1; SKYN.night[3] = STAR_TOP_Y;
    if (u.uSunB) { SUNU.sb[0] = SUNU.on ? fx[1] : 0; SUNU.sb[1] = SUNU.on && V && V.L ? V.L.hi[1] : 0; gl.uniform4fv(u.uSunB, SUNU.sb); }   // (in a change between a twilight sky and a night the wisps and the veil drawn by their own blocks)
    if (u.uAnv) { var AN = SKY.anv; gl.uniform4f(u.uAnv, AN ? AN.az : 0, AN ? AN.d : 0, anvSunEl(), V && V.light ? V.light.sunAz * DEG : 0); }   // (physics: weather/far-anvil)
    if (u.uAnvF) gl.uniform4fv(u.uAnvF, anvFlashAt(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt));   // (the owner's "Soft distant flicker": the storm's lightning at the drawn time)
    if (u.uHalo) gl.uniform4f(u.uHalo, MOON.E ? MOON.E.veil : 0, HALO_K, 0, 0);   // (physics: weather/moon-halo: the veil of the moonlit stay whose moon is up)
    if (u.uPurp) gl.uniform4fv(u.uPurp, purpleAt(sunDepthNow(), V && V.light ? V.light.sunAz * DEG : 0));   // (physics: sky/purple-light)
    gl.uniform4fv(u.uMoon, SKYN.moon); gl.uniform3fv(u.uMoonC, SKYN.moonC); gl.uniform3fv(u.uMoonG, SKYN.moonG); gl.uniform4fv(u.uNight, SKYN.night);
    meteorUniforms(u);   // (219: the meteor on show)
    if (u.uGal) { var G = SKY.gal; gl.uniform4f(u.uGal, G.pole[0], G.pole[1], G.pole[2], fx[2]); gl.uniform4f(u.uGalC, G.core[0], G.core[1], G.core[2], 0); gl.uniform4f(u.uAur, 0, SKY.aur.ph, SKY.aur.base, fx[3]); }
  }
