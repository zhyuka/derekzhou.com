  /* ---------------------------------------------------------------- the time of day */
  /* The owner (2026-10-23): "Add dusk and night first"; and, of the live sky, "Only the starting landing scene should
     depend on the system time. The rest should cycle through smoothly randomly non-time-dependent." The world opens on
     a sky of the visitor's own time of day (hour.v2.js marks data-sky and data-sky-at: its one read of the clock) and then
     passes from sky to sky in an order of its own, the live sky's (sky.v3.js nextSky): mostly into a neighbouring sky,
     now and then (SKY_FAR) into any through the mist, never into one of the last SKY_RECENT, a sky not yet seen likelier
     (every sky's words are light, so there is no run of one kind of words to break). The cycle runs on the
     flight's own clock (SIM.t: a still at data-t is any moment of it), its draws from the visit's own streams
     (subseed(SEED0, 41): the order; 42: the visit's own placements): no new entropy, no clock.
     Each sky is a set of colours and amounts laid over each kit's own light (the dunes' and the cloud sea's; 'fair' is
     the kits' own light, unchanged) and a paint transform of everything the kits paint rather than light (the land, the
     stones, the isles, the creatures, the particles). The key light keeps the visit's one baked direction (every cloud
     body's light depth is baked along it): at night it is the moon's light from the same place; the sky's own light (its
     glow, warmth, disc: uSkyS) may stand lower (the afterglow's -3 deg). Between two skies the light is blended four
     ways (two kits by place, two skies by time): colours on the light clock q, structure (warmth, glow, veil, events,
     fog, the gradient's shape, the land's offset from the sky and its contrast) on the structure clock, which is the
     light's own (every sky's words are light, so no change passes a twilight waypoint and none hurries its light across
     the inks' band). Nothing here reads the words (rule 7, W7). Design: tod/design/design.md. */
  var WSKY = {
    afterglow: { g:'sunset', w:'light', ph:1, land:['sunset','rain'], hold:70, near:['bluehour','milkyway','moonlit','firstlight'], sky:[[0.3,0.05,265],[0.52,0.075,40],[0.47,0.07,25],[0.41,0.07,330],[0.375,0.08,292],[0.34,0.08,284]], skyW:[0.53,0.09,40], glowC:[0.53,0.1,45], hazeC:[0.42,0.06,290], hazeW:[0.5,0.08,35], fogB:[0.3,0.06,272], ambU:[0.42,0.07,290], ambD:[0.32,0.05,300], clLit:[0.78,0.12,5], clShade:[0.52,0.08,345], clDeep:[0.45,0.07,320], clRim:[0.78,0.1,25], skyK:[0.5,6,0.15], key:[0.78,0.12,40,0.7], skyEl:-3, sunVis:0, fogK:1, hazeK:1, seaLit:0.75, paint:{lit:[0.5,0.7,300,0.6],shade:[0.43,0.6,285,0.6],deep:[0.4,0.6,275,0.6],pale:[0.5,0.8,300,0.5]}, post:{bloomK:0.4,shafts:0,sat:1.05,stars:0.05,hi:0.15,hiC:[0.48,0.08,10]}, fx:{belt:0.6}, ceil:0.525 },
    bluehour: { g:'dusk', w:'light', ph:1, land:['dusk'], hold:70, near:['moonlit','milkyway','aurora','afterglow','firstlight'], sky:[[0.27,0.05,268],[0.5,0.06,40],[0.45,0.065,325],[0.41,0.085,295],[0.36,0.09,285],[0.3,0.09,272]], skyW:[0.48,0.07,35], glowC:[0.48,0.07,40], hazeC:[0.38,0.07,275], hazeW:[0.46,0.06,35], fogB:[0.27,0.07,270], ambU:[0.38,0.08,272], ambD:[0.28,0.05,275], clLit:[0.62,0.07,285], clShade:[0.47,0.07,280], clDeep:[0.4,0.07,275], clRim:[0.66,0.06,300], skyK:[0.4,5,0.12], key:[0.6,0.08,58,0.4], skyEl:-7, sunVis:0, fogK:1, hazeK:1, seaLit:0.85, paint:{lit:[0.53,0.8,320,0.8],shade:[0.46,0.75,305,0.7],deep:[0.4,0.7,290,0.7],pale:[0.5,0.7,300,0.6]}, post:{bloomK:0.35,shafts:0,sat:1.05,stars:0.35,hi:0.1,hiC:[0.42,0.06,280]}, fx:{belt:0.4,nlc:1}, ceil:0.525 },
    moonlit: { g:'night', w:'light', ph:1, land:['night'], hold:190, near:['milkyway','aurora','firstlight','bluehour'], sky:[[0.3,0.12,264],[0.48,0.07,254],[0.43,0.1,257],[0.35,0.12,261],[0.28,0.12,264],[0.22,0.09,265]], skyW:[0.36,0.08,255], glowC:[0.42,0.04,250], hazeC:[0.33,0.045,262], hazeW:[0.38,0.035,252], fogB:[0.26,0.11,264], ambU:[0.34,0.09,262], ambD:[0.26,0.06,262], clLit:[0.7,0.06,258], clShade:[0.52,0.07,262], clDeep:[0.44,0.08,264], clRim:[0.74,0.04,250], skyK:[0.2,8,0.05], key:[0.84,0.03,245,0.55], skyEl:null, sunVis:0, fogK:1, hazeK:1, seaLit:0.9, paint:{lit:[0.37,0.6,258,0.8],shade:[0.28,0.7,262,0.8],deep:[0.24,0.75,262,0.8],pale:[0.48,0.4,250,0.5]}, post:{bloomK:0.3,shafts:0,sat:1,stars:0.6,hi:0.1,hiC:[0.36,0.08,262]}, fx:{moon:{r:1.8,L:[0.62,0.03,250],glow:[0.44,0.05,250],corona:1}}, ceil:0.525 },
    milkyway: { g:'night', w:'light', ph:2, land:['night'], hold:95, near:['aurora','moonlit','firstlight'], sky:[[0.25,0.09,264],[0.3,0.1,262],[0.29,0.1,263],[0.26,0.1,264],[0.22,0.09,265],[0.18,0.075,266]], skyW:[0.3,0.06,262], glowC:[0.3,0.03,260], hazeC:[0.28,0.09,264], hazeW:[0.31,0.08,260], fogB:[0.22,0.08,265], ambU:[0.26,0.07,264], ambD:[0.2,0.05,264], clLit:[0.38,0.1,266], clShade:[0.28,0.09,266], clDeep:[0.25,0.085,266], clRim:[0.42,0.06,255], skyK:[0.1,8,0], key:[0.6,0.02,250,0.15], skyEl:null, sunVis:0, fogK:1, hazeK:1, seaLit:0.8, paint:{lit:[0.44,0.6,262,0.8],shade:[0.42,0.7,264,0.8],deep:[0.4,0.75,264,0.8],pale:[0.44,0.8,262,0.7]}, post:{bloomK:0.3,shafts:0,sat:1,stars:1,hi:0,hiC:[0.28,0.09,264]}, fx:{galaxy:1}, ceil:0.525 },
    aurora: { g:'night', w:'light', ph:2, land:['night'], hold:100, near:['milkyway','moonlit','firstlight','bluehour'], sky:[[0.27,0.06,250],[0.33,0.06,225],[0.32,0.065,235],[0.29,0.08,250],[0.25,0.08,262],[0.21,0.07,266]], skyW:[0.34,0.06,175], glowC:[0.36,0.06,165], hazeC:[0.31,0.05,215], hazeW:[0.36,0.065,175], fogB:[0.24,0.065,250], ambU:[0.34,0.055,172], ambD:[0.24,0.05,240], clLit:[0.44,0.08,170], clShade:[0.32,0.07,240], clDeep:[0.28,0.07,250], clRim:[0.48,0.09,160], skyK:[0.15,10,0], key:[0.72,0.09,152,0.38], skyEl:null, sunVis:0, fogK:1, hazeK:1, seaLit:0.85, paint:{lit:[0.46,0.6,175,0.35],shade:[0.43,0.6,250,0.7],deep:[0.41,0.6,255,0.7],pale:[0.46,0.8,175,0.4]}, post:{bloomK:0.35,shafts:0,sat:1.02,stars:0.75,hi:0,hiC:[0.31,0.05,215]}, fx:{aurora:1}, ceil:0.525 },
    firstlight: { g:'dawn', w:'light', ph:1, land:['dawn','day'], hold:70, near:['moonlit','bluehour','afterglow'], sky:[[0.28,0.06,262],[0.52,0.095,38],[0.45,0.085,15],[0.37,0.075,265],[0.33,0.09,252],[0.29,0.09,255]], skyW:[0.5,0.09,45], glowC:[0.52,0.09,50], hazeC:[0.34,0.07,264], hazeW:[0.48,0.08,45], fogB:[0.27,0.07,255], ambU:[0.36,0.07,270], ambD:[0.26,0.05,268], clLit:[0.78,0.15,45], clShade:[0.46,0.07,292], clDeep:[0.4,0.07,286], clRim:[0.8,0.12,50], skyK:[0.5,6,0.12], key:[0.82,0.1,50,0.6], skyEl:-3, sunVis:0, fogK:1, hazeK:1, seaLit:0.8, paint:{lit:[0.42,0.65,245,0.9],shade:[0.38,0.65,248,0.9],deep:[0.35,0.65,250,0.9],pale:[0.5,0.5,250,0.5]}, post:{bloomK:0.35,shafts:0,sat:1.04,stars:0.3,hi:0.1,hiC:[0.4,0.06,252]}, fx:{belt:0.4}, ceil:0.525 }
  };
  /* the landings: each hour on the kept sky nearest it in the day's own order: dawn and the morning (day, 08-13)
     on the light before sunrise (its tops lit first, the sky warming low toward the sun), the afternoon (rain, 13-16) and
     sunset on the afterglow (the tops still pink over the sea in the Earth's shadow), dusk on the blue hour, the night on
     the moonlit sea, the Milky Way or the aurora (the visit's draw); after it the order is the visit's own */
  /* the owner's answers: "No rays at dusk/dawn": the light shafts are 0 in the afterglow, the blue hour and first
     light (so nothing about them thins or moves as the sun sinks); "Slower moon": the moonlit hold is 190 s, so the
     moon drifts across at a few px a second (the moonlit sky takes a bigger share of the cycle) */
  var SKY_PHASE = 2;   // (the owner: "lets only use white text for everything so never use any scenes that dont pass white text": only skies whose words are light are kept; phase 1: afterglow, bluehour, moonlit, firstlight; phase 2 adds milkyway, aurora)
  /* FAR_FOG, FAR_HAZE: the air through the mist (any thicker and the frames flatten to the COVER bar) */
  var FAR_FOG = 1.25, FAR_HAZE = 1.5;
  var SKY_FAR = 0.38, SKY_RECENT = 3, SKYE_W = [3, 10, 26, 58];
  var ROLE_SLOT = ['lit', 'lit', 'shade', 'deep', 'lit', 'shade', 'lit', 'shade', 'sheen', '', 'deep', 'pale', 'lit', 'shade', 'shade', 'sea', 'lit', 'deep'];
  var SKY_COLK = ['sunC', 'skyW', 'glowC', 'hazeC', 'hazeW', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'hiC', 'shaftC'];
  var SKY_CLOUDK = ['clLit', 'clShade', 'clDeep', 'clRim'];
  var SKY = { seed: null, hour: null, V: null, ids: [], land: {}, seq: [], visits: {}, rO: null, rV: null, sets: {}, dt: 0,
    i: -1, e: null, pair: '', A: null, B: null, X: null, Y: null, k: 0, q: 0, x: 0, half: 0, gen: 0, pgen: 0, far: false,
    baseLab: null, recT: -1e9, skyS: new Float32Array(3), fx: new Float32Array(8), sunVis: 1, ceil: 2, moonD: null };
  /* the cycle as each frame stands (skyAt): the change's index and how far it is, the words' kind of the sky on show
     (every sky's are light: the record's), the two skies and the time of day on show (the still sky's mark) */
  var SKYI = { id: -1, k: 0, words: 'light', sky: '', next: '', group: '' };
  function ss01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function angd(a, b) { var d = ((a - b + 180) % 360 + 360) % 360 - 180; return d; }
  function labA(c) { var o = lin2lab(c); return [o[0], o[1], o[2]]; }
  function linA(l) { return lab2linA(l[0], l[1], l[2]); }
  function lchA(c, k) { return lch(c[0], c[1], c[2], k); }
  function cpv(v) { return v && typeof v === 'object' ? (v.length !== undefined && typeof v[0] === 'object' ? Array.prototype.map.call(v, cpv) : Array.prototype.slice.call(v)) : v; }
  function cpRaw(R) { var L = {}, k; for (k in R) L[k] = cpv(R[k]); return L; }
  function scl(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function midLab(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }
  /* ---- a sky's light on a kit: the kit's own set with the sky's colours and stops in place and its amounts on the kit's densities */
  function skyRaw(S, K, sunDir) {
    var L = cpRaw(K), dk;
    for (dk in LDEF) if (L[dk] === undefined) L[dk] = cpv(LDEF[dk]);
    if (!L.hazeW) L.hazeW = cpv(L.hazeC);
    L.sunDir = Array.prototype.slice.call(sunDir);
    if (S.kit) { L.sunVis = 1; return L; }
    L.sunC = lchA(S.key, S.key[3]);
    L.sky = S.sky.map(function (c) { return lchA(c); });
    L.skyE = SKYE_W.slice(); L.skyW = lchA(S.skyW); L.skyK = [S.skyK[0], S.skyK[1], S.skyK[2], 0];
    L.glowC = lchA(S.glowC);
    L.fog = [L.fog[0] * S.fogK, L.fog[1], L.fog[2], L.fog[3] * S.fogK];
    L.fogB = [lchA(S.fogB), K.fogB ? K.fogB[1] : 0];
    L.haze = [L.haze[0] * S.hazeK, L.haze[1], L.haze[2], L.haze[3]];
    L.hazeC = lchA(S.hazeC); L.hazeW = lchA(S.hazeW); L.ambU = lchA(S.ambU); L.ambD = lchA(S.ambD);
    L.clLit = lchA(S.clLit); L.clShade = lchA(S.clShade); L.clDeep = lchA(S.clDeep); L.clRim = lchA(S.clRim);
    L.hi = [S.post.hi, L.hi[1], L.hi[2], L.hi[3]]; L.hiC = lchA(S.post.hiC);
    L.bloom = [L.bloom[0], L.bloom[1], L.bloom[2] * S.post.bloomK];
    L.shafts = S.post.shafts; L.sat = S.post.sat; L.exposure = 1; L.stars = S.post.stars; L.sunVis = S.sunVis; L.rain = S.post.rain || 0;
    return L;
  }
  function wayRaw(RA, RB, far) {
    var L = {}, k, j;
    for (k in RA) {
      var a = RA[k], b = RB[k];
      if (SKY_COLK.indexOf(k) >= 0) L[k] = linA(midLab(labA(a), labA(b)));
      else if (k === 'sky') { L.sky = []; for (j = 0; j < 6; j++) L.sky.push(linA(midLab(labA(a[j]), labA(b[j])))); }
      else if (k === 'fogB') L.fogB = [linA(midLab(labA(a[0]), labA(b[0]))), (a[1] + b[1]) / 2];
      else if (typeof a === 'number') L[k] = (a + b) / 2;
      else if (a && a.length !== undefined && typeof a[0] === 'number') { L[k] = []; for (j = 0; j < a.length; j++) L[k].push((a[j] + b[j]) / 2); }
      else L[k] = cpv(a);
    }
    L.sunDir = Array.prototype.slice.call(RA.sunDir);
    if (far) {   // (through the mist: the live's "through the cloud", the world's way: no white cover)
      L.fog[0] *= FAR_FOG; L.fog[3] *= FAR_FOG; L.haze[0] *= FAR_HAZE; L.haze[2] *= 0.5;
      var cf = [], mf = 0;
      for (j = 0; j < SKY_CLOUDK.length; j++) { cf.push(labA(L[SKY_CLOUDK[j]])); mf += cf[j][0] / SKY_CLOUDK.length; }
      for (j = 0; j < SKY_CLOUDK.length; j++) { cf[j][0] = mf + 0.6 * (cf[j][0] - mf); L[SKY_CLOUDK[j]] = linA(cf[j]); }
    }
    return L;
  }
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
    O.rawD = skyRaw(S, V.lightRaw, V.light.sunDir); O.rawA = skyRaw(S, V.lightRawB, V.light.sunDir);
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
    O.skyEl = S.kit ? null : S.skyEl;
    O.motes = S.post && S.post.motes !== undefined ? S.post.motes : 0;
    O.grainK = 0.45; O.ribK = 0.5;   // (the sand's grains and veils at night, every sky's: x0.45 and x0.5 of the paint's colour, so a speck near the eye is no lamp against the night sky)
    var fx = S.fx || {};
    O.fx = [fx.belt || 0, fx.nlc || 0, fx.galaxy || 0, fx.aurora || 0, fx.moon ? 1 : 0, fx.curtain || 0, 0, 0];
    O.dir = O.skyEl === null ? Array.prototype.slice.call(V.light.sunDir) : dirAzEl(V.light.sunAz, O.skyEl);
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
    O.motes = (A.motes + B.motes) / 2; O.grainK = (A.grainK + B.grainK) / 2; O.ribK = (A.ribK + B.ribK) / 2;
    O.fx = []; for (j = 0; j < 8; j++) O.fx.push((A.fx[j] + B.fx[j]) / 2 * 0.25);
    O.dir = A.dir;
    SKY.sets[key] = O;
    return O;
  }
  /* ---- the order (the live's pushSky and nextSky, on the world's streams) */
  function skyInit(V) {
    SKY.V = V; SKY.seed = J.seed; SKY.hour = HOUR; SKY.sets = {}; SKY.seq = []; SKY.visits = {}; SKY.i = -1; SKY.pair = ''; SKY.e = null; SKY.X = null; SKY.Y = null;
    SKY.rO = RNG(subseed(J.seed, 41)); SKY.rV = RNG(subseed(J.seed, 42));
    SKY.dt = DEVMODE && OPT.skyDt !== null && isFinite(+OPT.skyDt) ? +OPT.skyDt : 0;   // (dev: the cycle's clock this far ahead of the flight's)
    SKY.ids = Object.keys(WSKY).filter(function (id) { return WSKY[id].ph <= SKY_PHASE; });
    SKY.land = {};
    SKY.ids.forEach(function (id) { (WSKY[id].land || []).forEach(function (h) { (SKY.land[h] = SKY.land[h] || []).push(id); }); });   // (a sky lands on the hours it lists)
    SKY.baseLab = []; for (var s = 0; s < 24; s++) SKY.baseLab.push(labA([V.paramsBase[s * 4], V.paramsBase[s * 4 + 1], V.paramsBase[s * 4 + 2]]));
    SKY.sheenLab = labA(scl([V.paramsBase[32], V.paramsBase[33], V.paramsBase[34]], 1 / 0.3));
    var g = SKY.land[HOUR] ? HOUR : 'day', at = parseFloat(attr('data-sky-at'));   // (the hour's script writes it at load)
    if (!(at >= 0 && at <= 1)) at = 0.5;
    var open = DEVMODE && OPT.skyScene && WSKY[OPT.skyScene] && SKY.ids.indexOf(OPT.skyScene) >= 0 ? OPT.skyScene : null;
    if (!open) open = SKY.land[g][Math.floor(SKY.rO.f() * SKY.land[g].length)];
    skyPush(open);
    SKY.seq[0].at = -SKY.seq[0].hold * at * 0.9;
    SKY.landing = { hour: HOUR, group: g, at: at, sky: open };
    SKY.moonSide = SKY.rV.sign();   // (the visit's own: the moon's side of the key light)
    SKY.moonDir = RNG(subseed(J.seed, 79)).sign();   // (the visit's own way the moon crosses the window, one way, from its own stream: the other draws stay as they are)
    /* (phase 2) the visit's own: the galaxy's lie (the live's: of 24 poles drawn, the one whose band crosses most of the
       landing's view low, its core the lowest point of the band there), the aurora's phase and base */
    var h0 = RNG(subseed(J.seed, 77)).r(0, 2 * PI), fw = [Math.sin(h0), 0, Math.cos(h0)], best = null, bn = -1, i, j;
    for (i = 0; i < 24; i++) {
      var P = dirAzEl(SKY.rV.r(-180, 180), SKY.rV.r(15, 60)), U = norm(cross(P, [0, 1, 0])), W = cross(P, U), nn = 0, lo = 99, core = null;
      for (j = 0; j < 90; j++) { var a = j / 90 * 2 * PI, g = [U[0] * Math.cos(a) + W[0] * Math.sin(a), U[1] * Math.cos(a) + W[1] * Math.sin(a), U[2] * Math.cos(a) + W[2] * Math.sin(a)], e = Math.asin(clamp(g[1], -1, 1)) / DEG;
        if (dot(g, fw) > 0.85 && e > 4 && e < 34) { nn++; if (e < lo) { lo = e; core = g; } } }
      if (nn > bn) { bn = nn; best = { pole: P, core: core || U }; }
    }
    SKY.gal = best; SKY.aur = { ph: SKY.rV.f() * 6.2832, base: 5 + 3 * SKY.rV.f() };
    SKY.gen++;
  }
  function skyPush(id) {
    var S = WSKY[id], seq = SKY.seq, prev = seq[seq.length - 1], r = SKY.rO;
    SKY.visits[id] = (SKY.visits[id] || 0) + 1;
    seq.push({ id: id, at: prev ? prev.at + prev.hold + prev.move : 0, hold: S.hold * (0.9 + 0.25 * r.f()), move: 55 + 5 * r.f(), far: false, n: seq.length });
  }
  function skyNext() {
    var seq = SKY.seq, last = seq[seq.length - 1], r = SKY.rO, recent = [], c = [], w = [], sum = 0, i, x, id;
    for (i = Math.max(0, seq.length - Math.min(SKY_RECENT, SKY.ids.length - 2)); i < seq.length; i++) recent.push(seq[i].id);   // (of four skies never the last two, so the order is never a fixed round)
    var far = r.f() < SKY_FAR, pool = far ? SKY.ids : WSKY[last.id].near;
    for (i = 0; i < pool.length; i++) if (SKY.ids.indexOf(pool[i]) >= 0 && recent.indexOf(pool[i]) < 0) c.push(pool[i]);
    if (!c.length) for (i = 0; i < SKY.ids.length; i++) if (SKY.ids[i] !== last.id) c.push(SKY.ids[i]);
    for (i = 0; i < c.length; i++) { var v = 1 / (1 + 2 * (SKY.visits[c[i]] || 0)); w.push(v); sum += v; }   // (every sky's words are light: no streak of one kind of words to break)
    x = r.f() * sum;
    for (i = 0; i < c.length - 1 && x >= w[i]; i++) x -= w[i];
    id = c[i];
    if (DEVMODE && seq.length === 1 && OPT.skyNext && SKY.ids.indexOf(OPT.skyNext) >= 0 && OPT.skyNext !== last.id) id = OPT.skyNext;   // (dev: the first change's sky forced)
    last.far = WSKY[last.id].near.indexOf(id) < 0;
    skyPush(id);
  }
  /* ---- the cycle at t: the change under way (or the hold), its waypoint, the two sets on show and the two clocks */
  function skyAt(t) {
    var seq = SKY.seq, i;
    while (seq[seq.length - 1].at < t + 30) skyNext();
    i = seq.length - 2;
    while (i > 0 && seq[i].at > t) i--;
    var e = seq[i], A = skyObj(e.id), B = skyObj(seq[i + 1].id), k = clamp((t - e.at - e.hold) / e.move, 0, 1);
    var X, Y, q, x, half = 0;
    if (e.far) {   // (through the mist: each half of the change from a sky to the waypoint or from it to the next)
      var C = e.way || (e.way = skyWay(e.id, seq[i + 1].id, e.far));   // (found once a change: no key built a frame)
      half = k < 0.5 ? 0 : 1;
      x = half ? 2 * k - 1 : 2 * k;
      X = half ? C : A; Y = half ? B : C;
    } else { X = A; Y = B; x = k; }
    q = ss01(x);   // (the light's clock and the structure's are one: no change crosses a band of the words' inks)
    SKY.i = i; SKY.e = e; SKY.A = A; SKY.B = B; SKY.k = k; SKY.x = x; SKY.half = half; SKY.far = e.far;
    if (X !== SKY.X || Y !== SKY.Y) { SKY.pair = X.id + '|' + Y.id; SKY.X = X; SKY.Y = Y; SKY.gen++; }
    SKY.q = q;
    SKYI.id = e.n; SKYI.k = k;
    SKYI.words = k < 0.5 ? A.w : B.w; SKYI.sky = A.id; SKYI.next = B.id; SKYI.group = (k < 0.5 ? A : B).g;
  }
  /* from one direction to another (the live's arc: over the top where they face apart) */
  function skyArc(a, b, k, out) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], m0 = a[0] + (b[0] - a[0]) * k, m1 = a[1] + (b[1] - a[1]) * k + Math.max(0, -d) * Math.sin(PI * k) * 0.6, m2 = a[2] + (b[2] - a[2]) * k;
    var n = Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2) || 1; out[0] = m0 / n; out[1] = m1 / n; out[2] = m2 / n; return out;
  }
  /* ---- the sun and moon (the owner's "same w sun"): in a change between a twilight sky (afterglow, blue hour, first
     light: the sun under the sea at its skyEl) and a night sky (skyEl null) the sun keeps sinking, to SUN_NIGHT
     (or rises from it), on ss01(k) over the whole change, so it starts and ends at rest; everything it lights
     follows its elevation: its glow about it (uSkyS) and the veil's brightening, the warm band low on its side and the
     haze's warm side (sunk by place: whole only under the sun's depth D), each weakening with its depth (band: 1 at -7
     and above, exactly 0 at SUN_NIGHT), the Earth's shadow climbing with it (the belt's own height) and dissolving with
     band, the noctilucent wisps going dark from below as that shadow climbs over them. The night's own light (its glow,
     its warm band and its haze's warm side about the key, the veil's brightening there) comes in with the night's
     colours (QN), as the sky's colours do. No words input and no clock; outside such a change nothing is touched
     (SUNU.on false: the shaders' branches skipped and the uniforms uploaded as without it, bit for bit) */
  var SUN_NIGHT = -24, SUN_BAND = 17, SUN_WISP0 = -1, SUN_MIST = 0.75;
  var SUNU = { on: false, L: null, n: new Float32Array(4), z: new Float32Array([0, 1, 0, 0]), k0: new Float32Array(4), glowS: new Float32Array(3), glowN: new Float32Array(3), wT: new Float32Array(3), wN: new Float32Array(3),
    kT: new Float32Array(4), kN: new Float32Array(4), sk: new Float32Array(4), hzT: new Float32Array(3), hzN: new Float32Array(3), sb: new Float32Array(4), hi0: new Float32Array(4), es: 0, band: 1, QN: 0, E: 1, D: 0 };
  function skyHi0(L) { SUNU.hi0[0] = L.hi[0]; SUNU.hi0[1] = 0; SUNU.hi0[2] = L.hi[2]; SUNU.hi0[3] = L.hi[3]; return SUNU.hi0; }
  var SUNX = [0, 0, 0], SUNY = [0, 0, 0], MOONF = { sunOff: false, moonOff: false };   // (MOONF: dev only, the same-instant twins: the sun's change or the moon left out)
  function skyEndCol(O, key, w, out) {   // one end's colour of a key, blended by place only (blendSky's own arithmetic at q 0)
    var a = O.dl[key], b = O.al[key];
    labTo(out, 0, a[0] * (1 - w) + b[0] * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w);
    return out;
  }
  function skyEndNum(O, key, w, out) { var a = O.d[key], b = O.a[key]; for (var i = 0; i < out.length && i < a.length; i++) out[i] = a[i] * (1 - w) + b[i] * w; return out; }
  function skySun(V, w, L) {
    var A = SKY.A, B = SKY.B, k = SKY.k, i;
    SUNU.L = L;
    SUNU.on = !!(A && B && (A.skyEl === null) !== (B.skyEl === null) && k > 0 && k < 1 && !(DEVMODE && MOONF.sunOff));
    if (!SUNU.on) return;
    var nB = B.skyEl === null, T = nB ? A : B, N = nB ? B : A, eT = T.skyEl;
    var eA = nB ? eT : SUN_NIGHT, eB = nB ? SUN_NIGHT : eT, es = eA + (eB - eA) * ss01(k), D = eT - es;
    var band = ss01((es - SUN_NIGHT) / SUN_BAND), qn = SKY.far ? (SKY.half + SKY.q) / 2 : SKY.q, QN = nB ? qn : 1 - qn;
    var E = SKY.far ? 1 - SUN_MIST * (SKY.half ? 1 - SKY.q : SKY.q) : 1, az = V.light.sunAz * DEG, el = es * DEG;
    SKY.skyS[0] = Math.sin(az) * Math.cos(el); SKY.skyS[1] = Math.sin(el); SKY.skyS[2] = Math.cos(az) * Math.cos(el); L.skyS = SKY.skyS;
    skyEndCol(T, 'glowC', w, SUNU.glowS); skyEndCol(N, 'glowC', w, SUNU.glowN);
    for (i = 0; i < 3; i++) { SUNU.glowS[i] *= band; SUNU.glowN[i] *= QN; }
    skyEndCol(T, 'skyW', w, SUNU.wT); skyEndCol(N, 'skyW', w, SUNU.wN); skyEndNum(T, 'skyK', w, SUNU.kT); skyEndNum(N, 'skyK', w, SUNU.kN);
    SUNU.k0[0] = 0; SUNU.k0[1] = SUNU.kT[1]; SUNU.k0[2] = 0; SUNU.k0[3] = 0;   // (skyCol's own band off: its amounts 0, its scale kept)
    skyEndCol(T, 'hazeW', w, SUNX); skyEndCol(T, 'hazeC', w, SUNY); for (i = 0; i < 3; i++) SUNU.hzT[i] = SUNX[i] - SUNY[i];
    skyEndCol(N, 'hazeW', w, SUNX); skyEndCol(N, 'hazeC', w, SUNY); for (i = 0; i < 3; i++) SUNU.hzN[i] = SUNX[i] - SUNY[i];
    var kd = V.light.sunDir; SUNU.n[0] = kd[0]; SUNU.n[1] = kd[1]; SUNU.n[2] = kd[2]; SUNU.n[3] = 1;
    SUNU.sk[0] = D; SUNU.sk[1] = band; SUNU.sk[2] = QN; SUNU.sk[3] = SUN_WISP0 + 1.1 * D;
    SKY.fx[0] = T.fx[0] * band * E; SKY.fx[1] = T.fx[1] * E;   // (the belt's height already follows es through uSkyS; in a change through the mist, the waypoint's events at a quarter)
    SUNU.es = es; SUNU.band = band; SUNU.QN = QN; SUNU.E = E; SUNU.D = D;
  }
  function skyThemeWarm(c, e, side) {   // skyWarmN's, on the CPU (theme-color)
    var lt = Math.exp(-Math.max(e + SUNU.D, 0) / SUNU.kT[1]) * SUNU.band, ln = Math.exp(-Math.max(e, 0) / SUNU.kN[1]) * SUNU.QN, j;
    for (j = 0; j < 3; j++) { c[j] += (SUNU.wT[j] - c[j]) * SUNU.kT[0] * side * side * lt; c[j] *= 1 - SUNU.kT[2] * (1 - side) * lt; c[j] += (SUNU.wN[j] - c[j]) * SUNU.kN[0] * side * side * ln; c[j] *= 1 - SUNU.kN[2] * (1 - side) * ln; }
  }
  function skySunRec() { return SUNU.on ? { on: true, es: +SUNU.es.toFixed(5), band: +SUNU.band.toFixed(6), QN: +SUNU.QN.toFixed(6), E: +SUNU.E.toFixed(6), wispH: +SUNU.sk[3].toFixed(4), beltH: +(1 + 1.1 * Math.max(-SUNU.es, 0)).toFixed(4), belt: +SKY.fx[0].toFixed(6), shafts: SIM.V && SIM.V.L ? SIM.V.L.shafts : null } : { on: false, shafts: SIM.V && SIM.V.L ? SIM.V.L.shafts : null }; }
  /* ---- each step: the cycle, the four-way blend (two kits by place, two skies by time), the sky's own amounts, the paint */
  var SKW = { c: new Float64Array(4), s: new Float64Array(4), cb: new Float64Array([-1, -1, -1, -1]), sb: new Float64Array([-1, -1, -1, -1]), gen: -1 };
  var LKN_ST = { skyK: 1, glow: 1, haze: 1, fog: 1, hi: 1, bloom: 1, discK: 1 };   // (structure: on the structure clock)
  function skyStep(V, w) {
    if (SKY.seed !== J.seed || SKY.hour !== HOUR || SKY.V !== V) skyInit(V);
    skyAt(SIM.t + SKY.dt);
    var q = SKY.q, c = SKW.c, s = SKW.s, X = SKY.X, Y = SKY.Y;
    SKY.w = w;   // (the cloud sea's share of the land below, for the score's ear: skyHear)
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
    skySun(V, w, L);   // (the sun sets or rises through a change into or out of a night)
    moonStep(SIM.t + SKY.dt);   // (and the moon's stay: its route planned once, as it begins)
    skyPaint(V);
    if (REC && SIM.t - SKY.recT >= 1) { SKY.recT = SIM.t; if (!REC.cycle) REC.cycle = []; if (REC.cycle.length < 4000) REC.cycle.push([+SIM.t.toFixed(1), A.id, B.id, +k.toFixed(3), +q.toFixed(3), +q.toFixed(3), SKYI.group, SKYI.words, +SKY.ceil.toFixed(3)]); }
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
  /* dev and the record: the cycle as it stands */
  /* the sky as the score hears it (WORLD.sky, read by score.js once the visitor has pressed the sound icon): the sky
     on show and the next, the change's k, whether it goes through the mist, the cloud sea's share of the land below,
     and the score's seed, one of the visit's own streams (no second entropy read). It reads; it changes nothing. */
  function skyHear() {
    return { sky: SKY.e ? SKYI.sky : '', next: SKY.e ? SKYI.next : '', k: SKYI.k, far: !!SKY.far, w: SKY.w === undefined ? 0.5 : SKY.w, seed: subseed(J.seed, 97) >>> 0 };
  }
  function skyState() {
    if (!SKY.e) return null;
    return { sky: SKY.A.id, next: SKY.B.id, k: +SKY.k.toFixed(4), q: +SKY.q.toFixed(4), x: +SKY.x.toFixed(4), half: SKY.half, X: SKY.X.id, Y: SKY.Y.id,
      far: SKY.far,
      ceil: +SKY.ceil.toFixed(4), sunVis: +SKY.sunVis.toFixed(4), fx: Array.prototype.map.call(SKY.fx, function (v) { return +v.toFixed(3); }), skyS: Array.prototype.map.call(SKY.skyS, function (v) { return +v.toFixed(4); }),
      landing: SKY.landing, moon: skyMoonRec(), sun: skySunRec(), theme: THEME.hex, ink: { id: SKYI.id, words: SKYI.words, group: SKYI.group }, dt: SKY.dt, phase: SKY_PHASE,
      seq: SKY.seq.slice(0, 40).map(function (e) { return [e.id, +e.at.toFixed(2), +e.hold.toFixed(2), +e.move.toFixed(2), e.far ? 1 : 0]; }) };
  }
  /* ---- the night's sky (SKY_BODY): the moon (a pale flat disc held under the ceiling, standing above the words where
     the window has room at the default pitch, else above the top edge, its light the key's), the belt, the wisps, the
     stars' twinkle (held under reduced motion) and their top */
  var CEIL_KNEE = 0.08, STAR_TOP_Y = 0.0911, MOON_R = 1.8, MOON_FOOT = 4.5, MOON_KEEP = 12;
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
  var MRK = { R: 1.8, FOOT: 4.5, SLACK: 0.05, UP: 0.75, SPAN: 8, RES: 6, ROOM: 2, BOWL: 0.35, GLARE: 6, SPILL: 0.15, M: 1.5, SETV: 3, V10: 3.6, VPK: 4, TURN: 4, TURNUP: 3.3, WMAX: 1, DEEP: 16, MONO: 2, RHO: 30, STEP: 8 };
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
      coarse: coarse, noRoom: TOUCHMODE === 'scroll', keyAz: V.light.sunAz, side: SKY.moonSide || 1, sigma: SKY.moonDir || 1, lift: lift, t0: mt[0], t1: mt[1], t2: mt[2], t3: mt[3] };
  }
  function moonStep(t) {
    var E = moonStay(t); MOON.E = E;
    if (E && !E.moon) { var I = moonInputs(E); if (I) { E.moon = moonPlan(I); E.moonPlans = 1; MOON.plans++; MOON.off[0] = MOON.off[1] = 0; } }
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
  function skyMoonRec() {
    var E = MOON.E, P = E && E.moon, s = MOON.s, f = function (x, n) { return typeof x === 'number' && isFinite(x) ? +x.toFixed(n) : x; };
    if (!P) return { side: SKY.moonSide, sigma: SKY.moonDir, plan: null, w: 0, plans: MOON.plans };
    return { 'case': P.caseA ? 'A' : 'B', side: P.side, sigma: P.sigma, psi: f(P.psi, 4), Hc: f(P.Hc, 4), ec: f(P.ec, 4), pN: f(P.pN, 4), pL: f(P.pL, 4), lo: f(P.lo, 4), hi: f(P.hi, 4), top: f(P.top, 4), room: P.room, coarse: P.coarse, lift: f(P.lift, 2),
      beta: f(P.beta, 5), rise: f(P.rise, 5), thetaE: f(P.thetaE, 4), thetaV: f(P.thetaV, 4), rhoL: f(P.rhoL, 4), sH: f(P.sH, 4), s10: f(P.s10, 4), sD: f(P.sD, 4), wv: f(P.wv, 6), w0: f(P.w0, 6), A: f(P.A, 6), T: f(P.T, 4), tauV: f(P.tauV, 4),
      t0: f(P.t0, 4), t1: f(P.t1, 4), t2: f(P.t2, 4), t3: f(P.t3, 4), tm: f(P.tm, 4), Dvis: f(P.Dvis, 4), vH: f(P.vH, 5), v10: f(P.v10, 5), peak: f(P.peak, 5), turnH: f(P.turnH, 5), turn: f(P.turn, 5), fail: P.fail,
      s: f(s.s, 5), v: f(s.v, 5), leg: s.leg, el: f(s.el, 5), az: f(s.az, 5), w: f(s.w, 6), d: [f(s.d[0], 6), f(s.d[1], 6), f(s.d[2], 6)], off: [f(MOON.off[0], 6), f(MOON.off[1], 6)], plans: E.moonPlans };
  }
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
  /* ---- the browser's bars (theme-color): the drawn sky's colour on the window's top-centre ray, worked out on the CPU
     from the blended light as skyGrad and skyCol draw it (words-free), written into the page's own meta (an attribute:
     no DOM built) when it moves by 2 codes or more, at most twice a second of the flight's clock; at the first paint the
     hour's script's colour stands; when the canvas hides, the still sky's top (markStill) */
  var THEME = { t: -1e9, rgb: [-9, -9, -9], meta: null, n: 0, hex: '', f: [0, 0, 0], c: [0, 0, 0], v: [0, 0, 0] }, LUMA3 = [0.2126, 0.7152, 0.0722];
  function skyGmix(o, s, j, t) { for (var i = 0; i < 3; i++) o[i] += (s[j * 3 + i] - o[i]) * t; }
  function skyGradCPU(L, e, o) {
    var s = L.skyFlat, E = L.skyE, i;
    for (i = 0; i < 3; i++) o[i] = s[3 + i];
    if (e < 0) { skyGmix(o, s, 0, smooth(0, 14, -e)); return o; }
    skyGmix(o, s, 2, smooth(0, E[0], e)); skyGmix(o, s, 3, smooth(E[0], E[1], e)); skyGmix(o, s, 4, smooth(E[1], E[2], e)); skyGmix(o, s, 5, smooth(E[2], E[3], e));
    return o;
  }
  function skyTheme(force) {
    var V = SIM.V; if (!V || !V.L) return;
    var cf = CAM.f[0] * THEME.f[0] + CAM.f[1] * THEME.f[1] + CAM.f[2] * THEME.f[2];
    if (!force && SIM.t - THEME.t < 0.5 && THEME.n && cf > 0.9994) return;   // (at most twice a second of the flight's clock, or the view turned 2 deg)
    THEME.t = SIM.t; THEME.f[0] = CAM.f[0]; THEME.f[1] = CAM.f[1]; THEME.f[2] = CAM.f[2];
    if (THEME.meta === null) THEME.meta = document.querySelector('meta[name="theme-color"]') || false;
    if (!THEME.meta) return;
    var L = V.L, ty = FR.tanY, d0 = CAM.f[0] + CAM.u[0] * ty, d1 = CAM.f[1] + CAM.u[1] * ty, d2 = CAM.f[2] + CAM.u[2] * ty, n = Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2) || 1;
    d0 /= n; d1 /= n; d2 /= n;
    var e = Math.asin(clamp(d1, -1, 1)) / DEG, c = skyGradCPU(L, e, THEME.c), S = L.skyS || L.sunDir, sn = SUNU.on && L === SUNU.L, K = sn ? SUNU.k0 : L.skyK;   // (the sun's change as the shaders draw it, the same arithmetic)
    var hl = Math.sqrt(d0 * d0 + d2 * d2) || 1, sl = Math.sqrt(S[0] * S[0] + S[2] * S[2]) || 1, side = 0.5 + 0.5 * (d0 * S[0] + d2 * S[2]) / (hl * sl), low = Math.exp(-Math.max(e, 0) / K[1]), j;
    for (j = 0; j < 3; j++) { c[j] += (L.skyW[j] - c[j]) * K[0] * side * side * low; c[j] *= 1 - K[2] * (1 - side) * low; }
    if (sn) skyThemeWarm(c, e, side);
    var cs = Math.max(d0 * S[0] + d1 * S[1] + d2 * S[2], 0), g = L.glow[0] * Math.pow(cs, L.glow[1]) + L.glow[2] * Math.pow(cs, L.glow[3]), gC = sn ? SUNU.glowS : L.glowC, cn = 0;
    for (j = 0; j < 3; j++) c[j] += gC[j] * g;
    if (sn) { cn = Math.max(d0 * SUNU.n[0] + d1 * SUNU.n[1] + d2 * SUNU.n[2], 0); var gn = L.glow[0] * Math.pow(cn, L.glow[1]) + L.glow[2] * Math.pow(cn, L.glow[3]); for (j = 0; j < 3; j++) c[j] += SUNU.glowN[j] * gn; }
    // the ground haze over the sky (hazeSky, hazeCol) and the high veil's even paleness (veilMean), as SKY_BODY lays them
    var H = L.haze, hs = H[0] > 0 ? 1 - Math.exp(-H[0] * Math.exp(-H[2] / H[1]) * H[1] / Math.max(d1, 2e-3)) : 0, hcs = Math.max((d0 * S[0] + d2 * S[2]) / (hl * sl), 0), hw = hcs * hcs * hcs;
    if (sn) { var hst = Math.exp(-(Math.max(e + SUNU.D, 0) - Math.max(e, 0)) / SUNU.kT[1]) * SUNU.band; for (j = 0; j < 3; j++) c[j] += ((L.hazeC[j] + hw * (SUNU.hzT[j] * hst + SUNU.hzN[j] * SUNU.QN)) - c[j]) * hs; }
    else for (j = 0; j < 3; j++) c[j] += ((L.hazeC[j] + (L.hazeW[j] - L.hazeC[j]) * hw) - c[j]) * hs;
    if (L.hi[0] > 0 && d1 > 0.01) { var vm = smooth(0.55 - L.hi[0], 0.95 - L.hi[0], 0.692) * L.hi[1] * smooth(0.01, 0.12, d1) * smooth(0, 0.05, L.hi[0]), fs = sn ? 1 + 1.5 * (Math.pow(Math.max(cs, 0), 6) * SUNU.band + Math.pow(cn, 6) * SUNU.QN) : 1 + 1.5 * Math.pow(Math.max(cs, 0), 6); for (j = 0; j < 3; j++) c[j] += (L.hiC[j] * fs - c[j]) * vm; }
    var y0 = 0, rgb = THEME.v, hx = '#';
    for (j = 0; j < 3; j++) { c[j] *= L.exposure; y0 += c[j] * LUMA3[j]; }
    for (j = 0; j < 3; j++) rgb[j] = Math.round(clamp(agL2s(Math.max(y0 + (c[j] - y0) * L.sat, 0)), 0, 1) * 255);
    if (Math.max(Math.abs(rgb[0] - THEME.rgb[0]), Math.abs(rgb[1] - THEME.rgb[1]), Math.abs(rgb[2] - THEME.rgb[2])) < 2) return;
    for (j = 0; j < 3; j++) { THEME.rgb[j] = rgb[j]; hx += (rgb[j] < 16 ? '0' : '') + rgb[j].toString(16); }
    THEME.hex = hx; THEME.n++;
    THEME.meta.setAttribute('content', hx);
  }
  function skyThemeStill(group) { if (THEME.meta === null) THEME.meta = document.querySelector('meta[name="theme-color"]') || false; if (THEME.meta && SKYTOP[group]) { THEME.meta.setAttribute('content', stillTop(group)); THEME.rgb[0] = THEME.rgb[1] = THEME.rgb[2] = -9; THEME.hex = stillTop(group); } }

