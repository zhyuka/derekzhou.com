  /* ---- each step: the cycle, the four-way blend (two kits by place, two skies by time), the sky's own amounts, the paint */
  var SKW = { c: new Float64Array(4), s: new Float64Array(4), cb: new Float64Array([-1, -1, -1, -1]), sb: new Float64Array([-1, -1, -1, -1]), gen: -1 };
  var LKN_ST = { skyK: 1, glow: 1, haze: 1, fog: 1, hi: 1, bloom: 1, discK: 1 };   // (structure: on the structure clock)
  function skyStep(V, w) {
    if (SKY.seed !== J.seed || SKY.hour !== HOUR || SKY.V !== V) skyInit(V);
    skyAt(SIM.t + SKY.dt);
    var q = SKY.q, c = SKW.c, s = SKW.s, X = SKY.X, Y = SKY.Y;
    c[0] = (1 - w) * (1 - q); c[1] = w * (1 - q); c[2] = (1 - w) * q; c[3] = w * q;
    s[0] = (1 - w) * (1 - q); s[1] = w * (1 - q); s[2] = (1 - w) * q; s[3] = w * q;   // (the structure's weights: on the light's clock; the two clocks are one)
    if (V.LA[0] !== X.d || V.LA[2] !== Y.d) { V.LA = [X.d, X.a, Y.d, Y.a]; V.LAlab = [X.dl, X.al, Y.dl, Y.al]; }
    blendSky(V);
    var L = V.L, A = SKY.A, B = SKY.B, k = SKY.k, j;
    SKY.sunVis = 0; L.sunVis = 0;   // (no sky draws the sun's disc: sunVis 0 in all six)
    skyArc(A.dir, B.dir, k, SKY.skyS); L.skyS = SKY.skyS;
    SKY.ceil = X.ceil + (Y.ceil - X.ceil) * q; L.ceil = SKY.ceil;
    for (j = 0; j < 8; j++) SKY.fx[j] = X.fx[j] + (Y.fx[j] - X.fx[j]) * q;
    SKY.fx[6] = X.motes + (Y.motes - X.motes) * q; L.fx = SKY.fx;
    skyFxPlace(X.fx, Y.fx, q, SKY.fx, SKY.rise);
    skySun(V, w, L);   // (the sun sets or rises through a change into or out of a night)
    moonStep(SIM.t + SKY.dt);   // (and the moon's stay: its route planned once, as it begins)
    skyPaint(V);
    if (REC && SIM.t - SKY.recT >= 1) { SKY.recT = SIM.t; if (!REC.cycle) REC.cycle = []; if (REC.cycle.length < 4000) REC.cycle.push([+SIM.t.toFixed(1), A.id, B.id, +k.toFixed(3), +q.toFixed(3), +q.toFixed(3), SKYI.group, SKYI.words, +SKY.ceil.toFixed(3)]); }
  }
  /* (aurora-enter-by-place, no fades) the galaxy's and the aurora's amounts (fx 2, 3) never blended like colours: each
     is 1 while either end of the change has it, else 0, and how far it has come in (rise: 0 gone, 1 whole) moves with
     the change, so it comes and goes by place (the aurora's base rising from under the poleward horizon, the galaxy
     uncovered from the horizon up as an edge sinks off it), never by a strength between */
  function skyFxPlace(a, b, q, fx, rise) {
    for (var j = 2; j < 4; j++) { var ia = a[j] > 0, ib = b[j] > 0; fx[j] = ia || ib ? 1 : 0; rise[j - 2] = ia && ib ? 1 : ia ? 1 - q : ib ? q : 0; }
  }
  /* two skies' colours blended by their chroma vectors (a, b) at q along the hue's arc, the chroma the two's own
     blended, never through the neutral axis (a straight blend greys the middle of a change: a tower to C 0.015): the
     hue moves by the chroma-weighted share of the way (a near-grey end lends no hue), along the shorter arc, unless the
     two are more than 100 deg apart and that arc crosses the greens (h 135): then the other way round, through the
     violets and roses (a blue sky into a gold one passes rose, as a dusk does, never teal). The light (L) is the
     caller's; q 0 and 1 are the ends exactly (a hold is drawn unchanged) */
  function abLong(a1, b1, a2, b2) {   // (the way round, from the two ends alone: the long way only for hues over 100 deg apart whose shorter arc crosses the greens)
    if (a1 * a1 + b1 * b1 < 1e-10 || a2 * a2 + b2 * b2 < 1e-10) return false;
    var h1 = Math.atan2(b1, a1) / DEG, d = angd(Math.atan2(b2, a2) / DEG, h1), e = ((135 - h1) % 360 + 360) % 360;
    return Math.abs(d) > 100 && (d > 0 ? e < d : 360 - e < -d);
  }
  function abMix(a1, b1, a2, b2, q, out, o, lw) {   // lw: the way round (abLong of the ends; given once a pair where the ends move with the place)
    if (q <= 0) { out[o] = a1; out[o + 1] = b1; return out; }
    if (q >= 1) { out[o] = a2; out[o + 1] = b2; return out; }
    var c1 = Math.sqrt(a1 * a1 + b1 * b1), c2 = Math.sqrt(a2 * a2 + b2 * b2), cw = (1 - q) * c1 + q * c2;
    if (c1 < 1e-5 || c2 < 1e-5) { out[o] = a1 + (a2 - a1) * q; out[o + 1] = b1 + (b2 - b1) * q; return out; }
    var h1 = Math.atan2(b1, a1) / DEG, d = angd(Math.atan2(b2, a2) / DEG, h1);
    if (lw) d -= d > 0 ? 360 : -360;
    var h = (h1 + q * c2 / cw * d) * DEG;
    out[o] = cw * Math.cos(h); out[o + 1] = cw * Math.sin(h); return out;
  }
  var ABO = [0, 0], ABX = [0, 0], ABL = new Uint8Array(32);   // (ABL: blendSky's way round per colour, decided once a pair)
  function skyAB(p0, p1, p2, p3, j, out, lw) {   // (the four-way blend's chroma: the kits by place (w) linearly within each sky, the two skies by time (q) through abMix)
    var wc = SKW.c, q = wc[2] + wc[3], w = wc[1] + wc[3], xa = p0[j] + (p1[j] - p0[j]) * w, xb = p0[j + 1] + (p1[j + 1] - p0[j + 1]) * w;
    return abMix(xa, xb, p2[j] + (p3[j] - p2[j]) * w, p2[j + 1] + (p3[j + 1] - p2[j + 1]) * w, q, out, 0, lw);
  }
  function blendSky(V) {
    var wc = SKW.c, ws = SKW.s, i, k, j, same = SKW.gen === SKY.gen;
    for (i = 0; i < 4; i++) if (Math.abs(wc[i] - SKW.cb[i]) > 1e-4 || Math.abs(ws[i] - SKW.sb[i]) > 1e-4) same = false;
    if (same) return;
    for (i = 0; i < 4; i++) { SKW.cb[i] = wc[i]; SKW.sb[i] = ws[i]; }
    if (SKW.gen !== SKY.gen) { var Bp = V.LAlab, jj; for (jj = 0; jj < LKC.length; jj++) ABL[jj] = abLong(Bp[0][LKC[jj]][1], Bp[0][LKC[jj]][2], Bp[2][LKC[jj]][1], Bp[2][LKC[jj]][2]) ? 1 : 0; for (jj = 0; jj < 6; jj++) ABL[20 + jj] = abLong(Bp[0].skyFlat[jj * 3 + 1], Bp[0].skyFlat[jj * 3 + 2], Bp[2].skyFlat[jj * 3 + 1], Bp[2].skyFlat[jj * 3 + 2]) ? 1 : 0; ABL[26] = abLong(Bp[0].fogB[1], Bp[0].fogB[2], Bp[2].fogB[1], Bp[2].fogB[2]) ? 1 : 0; }   // (each colour's way round decided once a pair, from the two skies' own sets: never switched mid-change by the place)
    SKW.gen = SKY.gen;
    var L = V.L, A = V.LA, B = V.LAlab, n = 4, eq = true;
    for (i = 0; i < 4; i++) if (wc[i] !== ws[i]) eq = false;
    for (j = 0; j < LKC.length; j++) {
      var key = LKC[j], a0 = 0, a1 = 0, a2 = 0;
      var fam = eq ? null : SKY_FAMOF[key];
      if (fam) for (i = 0; i < n; i++) { var cf = B[i][key], mf = B[i].mL; a0 += mf * wc[i] + (cf[0] - mf) * ws[i]; }   // (each family colour's offset from its set's SKY mean rides the structure clock, so a tower is the sky's own light as the ground crosses the band; the family's own mean leaves a tower 0.05-0.06 under its sky at the crossing)
      else for (i = 0; i < n; i++) a0 += B[i][key][0] * wc[i];
      skyAB(B[0][key], B[1][key], B[2][key], B[3][key], 1, ABO, ABL[j]);   // (the chroma along the hue's arc)
      labTo(L[key], 0, a0, ABO[0], ABO[1]);
    }
    // the gradient: its mean light on the light clock, its shape (each stop's offset from the mean) on the structure clock
    for (k = 0; k < 6; k++) {
      var s0 = 0, s1 = 0, s2 = 0;
      if (eq) for (i = 0; i < n; i++) s0 += B[i].skyFlat[k * 3] * wc[i];
      else for (i = 0; i < n; i++) { var sg = B[i].skyFlat; s0 += B[i].mL * wc[i] + (sg[k * 3] - B[i].mL) * ws[i]; }
      skyAB(B[0].skyFlat, B[1].skyFlat, B[2].skyFlat, B[3].skyFlat, k * 3 + 1, ABO, ABL[20 + k]);
      labTo(L.skyFlat, k * 3, s0, ABO[0], ABO[1]);
    }
    var f0 = 0, f3 = 0; for (i = 0; i < n; i++) { f0 += B[i].fogB[0] * wc[i]; f3 += A[i].fogBf[3] * wc[i]; } skyAB(B[0].fogB, B[1].fogB, B[2].fogB, B[3].fogB, 1, ABO, ABL[26]); labTo(L.fogBf, 0, f0, ABO[0], ABO[1]); L.fogBf[3] = f3;
    for (j = 0; j < LKN.length; j++) { var kn = LKN[j], dst = L[kn], ww = LKN_ST[kn] ? ws : wc; for (k = 0; k < dst.length; k++) { var v = 0; for (i = 0; i < n; i++) v += A[i][kn][k] * ww[i]; dst[k] = v; } }
    for (j = 0; j < LKS.length; j++) { var ks = LKS[j], vs = 0, wk = ks === 'shafts' ? ws : wc; for (i = 0; i < n; i++) vs += A[i][ks] * wk[i]; L[ks] = vs; }
    var wl = Math.sqrt(L.windDir[0] * L.windDir[0] + L.windDir[1] * L.windDir[1]) || 1;
    L.wet[0] = L.rain; L.wet[1] = L.ripple; L.wet[2] = L.windDir[0] / wl; L.wet[3] = L.windDir[1] / wl;
  }
  /* the paint as drawn: each slot's light on the light clock with the sky's mean, its offset from it and its contrast on
     the structure clock; a hold's own paint whole, bit for bit */
  var SKP = { gen: -1, q: -1 }, PL = [0, 0, 0];
  function skyPaint(V) {
    var X = SKY.X, Y = SKY.Y, q = SKY.q, pf = V.paramsFlat, s;
    if (SKP.gen === SKY.gen && Math.abs(q - SKP.q) < 1e-4) return;
    SKP.gen = SKY.gen; SKP.q = q; SKY.pgen++;
    if (X === Y || q === 0) { pf.set(X.pLin); return; }
    if (q === 1) { pf.set(Y.pLin); return; }
    for (s = 0; s < 18; s++) {
      var r = ROLE_SLOT[s]; if (!r) continue;
      var a = X.pLab, b = Y.pLab, o = s * 3;
      if (r === 'sea') { pf[s * 4] = pf[s * 4 + 1] = pf[s * 4 + 2] = a[o] + (b[o] - a[o]) * q; continue; }
      var mx = s < 12 ? X.mD : X.mA, my = s < 12 ? Y.mD : Y.mA, mq = mx + (my - mx) * q;
      var lv = mq + (a[o] - mx) * (1 - q) + (b[o] - my) * q;
      abMix(a[o + 1], a[o + 2], b[o + 1], b[o + 2], q, ABX, 0, abLong(a[o + 1], a[o + 2], b[o + 1], b[o + 2]));   // (the paint's chroma along the hue's arc too; its ends the two skies' own, constant through a change)
      labTo(pf, s * 4, lv, ABX[0], ABX[1]);
    }
  }
  /* a flock's or a particle's colour through the paint (cached on it for the paint's generation: no garbage a frame) */
  var TRX = [0, 0, 0], TRY = [0, 0, 0], TRL = [0, 0, 0];
  function skyTint(src, out, part, mR) {
    var X = SKY.X, Y = SKY.Y, q = SKY.q;
    if (!X || (part && X.sky && X.sky.kit && Y.sky && Y.sky.kit)) { out[0] = src[0]; out[1] = src[1]; out[2] = src[2]; return out; }
    var c0 = src[0], c1 = src[1], c2 = src[2], l = Math.cbrt(0.4122214708 * c0 + 0.5363325363 * c1 + 0.0514459929 * c2), m = Math.cbrt(0.2119034982 * c0 + 0.6806995451 * c1 + 0.1073969566 * c2), s = Math.cbrt(0.0883024619 * c0 + 0.2817188376 * c1 + 0.6299787005 * c2), lb = TRL;
    lb[0] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s; lb[1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s; lb[2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;   // (lin2lab's, in place: no array a call)
    trCr(X, lb, TRX, part); trCr(Y, lb, TRY, part);
    var mx = mR ? X.mR : X.mD, my = mR ? Y.mR : Y.mD, mq = mx + (my - mx) * q;
    var lv = mq + (TRX[0] - mx) * (1 - q) + (TRY[0] - my) * q;
    abMix(TRX[1], TRX[2], TRY[1], TRY[2], q, ABX, 0, abLong(TRX[1], TRX[2], TRY[1], TRY[2]));
    labTo(out, 0, lv, ABX[0], ABX[1]);
    return out;
  }
  function skyFlock(F) {
    var c = F._sky;
    if (!c) c = F._sky = { g: -1, lit: new Float32Array(3), shade: new Float32Array(3) };
    if (c.g !== SKY.pgen) { c.g = SKY.pgen; skyTint(F.lit, c.lit, false, true); skyTint(F.shade, c.shade, false, true); }
    return c;
  }
  function skyPart(pa, out, rib) {   // a particle set's colour (rgb) and opacity: grains and veils through the paint (and the night's own factor), the motes by the sky's own amount
    var c = pa._sky, X = SKY.X, Y = SKY.Y;
    if (!c) c = pa._sky = { g: -1, rgb: new Float32Array(3) };
    if (c.g !== SKY.pgen) { c.g = SKY.pgen; skyTint(pa.color, c.rgb, true, false); var f = rib ? X.ribK + (Y.ribK - X.ribK) * SKY.q : X.grainK + (Y.grainK - X.grainK) * SKY.q; c.rgb[0] *= f; c.rgb[1] *= f; c.rgb[2] *= f; }
    out[0] = c.rgb[0]; out[1] = c.rgb[1]; out[2] = c.rgb[2];
    var kd = pa.hop ? pa.hop[3] : 0;
    out[3] = pa.color[3] * (kd > 0.5 && kd < 2.5 ? SKY.fx[6] : 1);
    return out;
  }
