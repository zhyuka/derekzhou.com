  /* ---------------------------------------------------------------- the time of day: a sky's paint, its objects, its waypoints */
  /* a prepared set's OKLab (as worldLights' are), and its sky's mean light (stops 0-58 deg) */
  function skyLabSet(A) {
    var o = {}, i; LKC.forEach(function (k) { o[k] = lin2lab(A[k]); });
    o.skyFlat = new Float32Array(18); o.mL = 0;
    for (i = 0; i < 6; i++) { var c = lin2lab([A.skyFlat[i * 3], A.skyFlat[i * 3 + 1], A.skyFlat[i * 3 + 2]]); o.skyFlat[i * 3] = c[0]; o.skyFlat[i * 3 + 1] = c[1]; o.skyFlat[i * 3 + 2] = c[2]; if (i > 0) o.mL += c[0] / 5; }
    o.fogB = lin2lab([A.fogBf[0], A.fogBf[1], A.fogBf[2]]);
    o.fam = {}; for (var f in SKY_FAM) { var m = 0; for (i = 0; i < SKY_FAM[f].length; i++) m += o[SKY_FAM[f][i]][0] / SKY_FAM[f].length; o.fam[f] = m; }
    return o;
  }
  /* the colour families whose contrast is structure: the cloud's lit, shade, deep and rim (a tower behind the name),
     the haze toward the light and away, the ambient from above and below: each family's mean light rides the light
     clock with the sky's, each colour's offset from it the structure clock (no change crosses the inks' band, and the
     two clocks are one) */
  var SKY_FAM = { cl: ['clLit', 'clShade', 'clDeep', 'clRim'], hz: ['hazeC', 'hazeW'], amb: ['ambU', 'ambD'] }, SKY_FAMOF = { clLit: 'cl', clShade: 'cl', clDeep: 'cl', clRim: 'cl', hazeC: 'hz', hazeW: 'hz', ambU: 'amb', ambD: 'amb' };
  /* the paint: a role's transform of an OKLab colour (L x kL, capped or floored; C x kC; the hue pulled toward h) */
  function trRole(p, l, out) {
    if (p[0] === 1 && p[1] === 1 && p[3] === 0 && p.length < 5) { out[0] = l[0]; out[1] = l[1]; out[2] = l[2]; return out; }
    var L = l[0] * p[0], C = Math.hypot(l[1], l[2]) * p[1], h = Math.atan2(l[2], l[1]) / DEG;
    if (p.length > 4) L = Math.max(Math.min(L, p[4]), p[5]);
    h += p[3] * angd(p[2], h);
    out[0] = L; out[1] = C * Math.cos(h * DEG); out[2] = C * Math.sin(h * DEG);
    return out;
  }
  var TRS = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  /* a creature's colour (a flock's lit or shade) or a particle's through a sky: creatures keep their own light but the
     night's (x crK, at most crCap: the white birds pale and moonlit, the dunes' birds silhouettes), the lit role's
     chroma and hue; particles take the lit role whole. A waypoint: the two skies' midpoint */
  function trCr(O, l, out, part) {
    if (O.wA) {
      var a = trCr(O.wA, l, TRS[0], part), b = trCr(O.wB, l, TRS[1], part);
      out[0] = (a[0] + b[0]) / 2; out[1] = (a[1] + b[1]) / 2; out[2] = (a[2] + b[2]) / 2;
      return out;
    }
    var p = O.sky.paint.lit;
    if (part) return trRole(p, l, out);
    trRole([1, p[1], p[2], p[3]], l, out); out[0] = Math.min(l[0] * O.crK, O.crCap);
    return out;
  }
  function skyFinish(O) {
    O.d = prepOne(cpRaw(O.rawD)); O.a = prepOne(cpRaw(O.rawA)); O.dl = skyLabSet(O.d); O.al = skyLabSet(O.a);
    O.mD = O.dl.mL; O.mA = O.al.mL; O.mR = (O.mD + O.mA) / 2;
  }
  /* a sky's own: its two kits' sets, its paint (OKLab per slot, and the whole uP array as drawn in its hold), its amounts */
  function skyObj(id) {
    if (SKY.sets[id]) return SKY.sets[id];
    var S = WSKY[id], V = SKY.V, O = { id: id, w: S.w, sky: S, g: S.g }, s, j, o = [0, 0, 0];
    O.rawD = skyRaw(S, V.lightRaw, keyAt(V)); O.rawA = skyRaw(S, V.lightRawB, keyAt(V));
    skyFinish(O);
    O.pLab = new Float32Array(72); O.pLin = new Float32Array(V.paramsBase);
    for (s = 0; s < 18; s++) {
      var r = ROLE_SLOT[s], B = SKY.baseLab[s];
      if (!r) continue;
      if (r === 'sea') { O.pLab[s * 3] = S.seaLit === undefined ? 1 : S.seaLit; O.pLin[s * 4] = O.pLin[s * 4 + 1] = O.pLin[s * 4 + 2] = O.pLab[s * 3]; continue; }
      if (r === 'sheen') {   // (the sheen: lit's transform of its colour before its own x0.3, then the x0.3 again)
        var sb = SKY.sheenLab; trRole(S.paint.lit, sb, o); var sl = lab2linA(o[0], o[1], o[2]), sv = labA(scl(sl, 0.3));
        O.pLab[s * 3] = sv[0]; O.pLab[s * 3 + 1] = sv[1]; O.pLab[s * 3 + 2] = sv[2];
      } else { trRole(S.paint[r], B, o); O.pLab[s * 3] = o[0]; O.pLab[s * 3 + 1] = o[1]; O.pLab[s * 3 + 2] = o[2]; }
      if (S.kit) continue;   // ('fair': the kits' own paint, bit for bit)
      labTo(O.pLin, s * 4, O.pLab[s * 3], O.pLab[s * 3 + 1], O.pLab[s * 3 + 2]);
    }
    O.crK = 0.5; O.crCap = 0.5;   // (a creature's light under the night's: x0.5, at most 0.5; every sky's words are light)
    O.ceil = S.ceil; O.seaLit = S.seaLit === undefined ? 1 : S.seaLit; O.sunVis = S.kit ? 1 : S.sunVis;
    O.skyEl = S.kit ? null : airSunEl(id);
    O.motes = S.post && S.post.motes !== undefined ? S.post.motes : 0;
    O.ribK = 0.5;   // (the sand's veils at night, every sky's: x0.5 of the paint's colour, so a sheet near the eye is no lamp against the night sky)
    var fx = S.fx || {};
    O.fx = [fx.belt || 0, fx.nlc || 0, fx.galaxy || 0, fx.aurora || 0, fx.moon ? 1 : 0, fx.curtain || 0, 0, 0];
    O.dir = airSkySun(V, O.skyEl);
    SKY.sets[id] = O;
    return O;
  }
  /* a change's waypoint (the live's way(A, B, far)): the two skies' midpoint, every event at a quarter;
     through the mist where the two are not neighbours */
  function skyWay(a, b, far) {
    var key = a + '>' + b + (far ? '*' : '');
    if (SKY.sets[key]) return SKY.sets[key];
    var A = skyObj(a), B = skyObj(b), V = SKY.V, O = { id: key, w: null, wA: A, wB: B, far: far, g: A.g }, s, j;
    O.rawD = wayRaw(A.rawD, B.rawD, far); O.rawA = wayRaw(A.rawA, B.rawA, far);
    skyFinish(O);
    O.pLab = new Float32Array(72); O.pLin = new Float32Array(V.paramsBase);
    for (s = 0; s < 18; s++) { var r = ROLE_SLOT[s]; if (!r) continue; for (j = 0; j < 3; j++) O.pLab[s * 3 + j] = (A.pLab[s * 3 + j] + B.pLab[s * 3 + j]) / 2; }
    for (s = 0; s < 18; s++) {
      var r2 = ROLE_SLOT[s]; if (!r2) continue;
      if (r2 === 'sea') { O.pLin[s * 4] = O.pLin[s * 4 + 1] = O.pLin[s * 4 + 2] = O.pLab[s * 3]; continue; }
      labTo(O.pLin, s * 4, O.pLab[s * 3], O.pLab[s * 3 + 1], O.pLab[s * 3 + 2]);
    }
    O.ceil = (A.ceil + B.ceil) / 2; O.seaLit = (A.seaLit + B.seaLit) / 2; O.sunVis = 0; O.skyEl = null;
    O.motes = (A.motes + B.motes) / 2; O.ribK = (A.ribK + B.ribK) / 2;
    O.fx = []; for (j = 0; j < 8; j++) O.fx.push((A.fx[j] + B.fx[j]) / 2 * 0.25);
    O.dir = A.dir;
    SKY.sets[key] = O;
    return O;
  }
