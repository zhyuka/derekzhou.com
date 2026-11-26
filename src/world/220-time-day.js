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
    afterglow: { g:'sunset', w:'light', ph:1, land:['sunset','rain'], hold:70, near:['bluehour','milkyway','moonlit','firstlight'], sky:[[0.3,0.05,265],[0.52,0.075,40],[0.47,0.07,25],[0.41,0.07,330],[0.375,0.08,292],[0.34,0.08,284]], skyW:[0.53,0.09,40], glowC:[0.53,0.1,45], fogB:[0.3,0.06,272], ambU:[0.42,0.07,290], ambD:[0.32,0.05,300], clLit:[0.78,0.12,5], clShade:[0.52,0.08,345], clDeep:[0.45,0.07,320], clRim:[0.78,0.1,25], skyK:[0.5,6,0.15], key:[0.78,0.12,40,0.7], sunVis:0, fogK:1, hazeK:1, seaLit:0.75, paint:{lit:[0.5,0.7,300,0.6],shade:[0.43,0.6,285,0.6],deep:[0.4,0.6,275,0.6],pale:[0.5,0.8,300,0.5]}, post:{bloomK:0.4,shafts:0,sat:1.05,stars:1,hi:0.15,hiC:[0.48,0.08,10]}, fx:{belt:0.6}, ceil:0.525 },
    bluehour: { g:'dusk', w:'light', ph:1, land:['dusk'], hold:70, near:['moonlit','milkyway','aurora','afterglow','firstlight'], sky:[[0.27,0.05,268],[0.5,0.06,40],[0.45,0.065,325],[0.41,0.085,295],[0.36,0.09,285],[0.3,0.09,272]], skyW:[0.48,0.07,35], glowC:[0.48,0.07,40], fogB:[0.27,0.07,270], ambU:[0.38,0.08,272], ambD:[0.28,0.05,275], clLit:[0.62,0.07,285], clShade:[0.47,0.07,280], clDeep:[0.4,0.07,275], clRim:[0.66,0.06,300], skyK:[0.4,5,0.12], key:[0.6,0.08,58,0.4], sunVis:0, fogK:1, hazeK:1, seaLit:0.85, paint:{lit:[0.53,0.8,320,0.8],shade:[0.46,0.75,305,0.7],deep:[0.4,0.7,290,0.7],pale:[0.5,0.7,300,0.6]}, post:{bloomK:0.35,shafts:0,sat:1.05,stars:1,hi:0.1,hiC:[0.42,0.06,280]}, fx:{belt:0,nlc:1}, ceil:0.525 },
    moonlit: { g:'night', w:'light', ph:1, land:['night'], hold:190, near:['milkyway','aurora','firstlight','bluehour'], sky:[[0.3,0.12,264],[0.48,0.07,254],[0.43,0.1,257],[0.35,0.12,261],[0.28,0.12,264],[0.22,0.09,265]], skyW:[0.36,0.08,255], glowC:[0.42,0.04,250], fogB:[0.26,0.11,264], ambU:[0.34,0.09,262], ambD:[0.26,0.06,262], clLit:[0.7,0.06,258], clShade:[0.52,0.07,262], clDeep:[0.44,0.08,264], clRim:[0.74,0.04,250], skyK:[0.2,8,0.05], key:[0.84,0.03,245,0.55], sunVis:0, fogK:1, hazeK:1, seaLit:0.9, paint:{lit:[0.37,0.6,258,0.8],shade:[0.28,0.7,262,0.8],deep:[0.24,0.75,262,0.8],pale:[0.48,0.4,250,0.5]}, post:{bloomK:0.3,shafts:0,sat:1,stars:1,hi:0.1,hiC:[0.36,0.08,262]}, fx:{moon:{r:1.8,L:[0.62,0.01,80],glow:[0.44,0.01,80],corona:1}}, ceil:0.525 },
    milkyway: { g:'night', w:'light', ph:2, land:['night'], hold:95, near:['aurora','moonlit','firstlight'], sky:[[0.25,0.09,264],[0.3,0.1,262],[0.29,0.1,263],[0.26,0.1,264],[0.22,0.09,265],[0.18,0.075,266]], skyW:[0.3,0.06,262], glowC:[0.3,0.03,260], fogB:[0.22,0.08,265], ambU:[0.26,0.07,264], ambD:[0.2,0.05,264], clLit:[0.38,0.1,266], clShade:[0.28,0.09,266], clDeep:[0.25,0.085,266], clRim:[0.42,0.06,255], skyK:[0.1,8,0], key:[0.6,0.02,250,0.15], sunVis:0, fogK:1, hazeK:1, seaLit:0.8, paint:{lit:[0.44,0.6,262,0.8],shade:[0.42,0.7,264,0.8],deep:[0.4,0.75,264,0.8],pale:[0.44,0.8,262,0.7]}, post:{bloomK:0.3,shafts:0,sat:1,stars:1,hi:0,hiC:[0.28,0.09,264]}, fx:{galaxy:1}, ceil:0.525 },
    aurora: { g:'night', w:'light', ph:2, land:['night'], hold:100, near:['milkyway','moonlit','firstlight','bluehour'], sky:[[0.27,0.05,250],[0.33,0.03,250],[0.32,0.035,250],[0.29,0.05,250],[0.25,0.08,262],[0.21,0.07,266]], skyW:[0.34,0.02,250], glowC:[0.36,0.03,160], fogB:[0.24,0.065,250], ambU:[0.34,0.04,160], ambD:[0.24,0.05,240], clLit:[0.44,0.03,250], clShade:[0.32,0.07,240], clDeep:[0.28,0.07,250], clRim:[0.48,0.06,155], skyK:[0.15,10,0], key:[0.72,0.06,150,0.38], sunVis:0, fogK:1, hazeK:1, seaLit:0.85, paint:{lit:[0.46,0.6,175,0.35],shade:[0.43,0.6,250,0.7],deep:[0.41,0.6,255,0.7],pale:[0.46,0.8,175,0.4]}, post:{bloomK:0.35,shafts:0,sat:1.02,stars:1,hi:0,hiC:[0.31,0.05,215]}, fx:{aurora:1}, ceil:0.525 },
    firstlight: { g:'dawn', w:'light', ph:1, land:['dawn','day'], hold:70, near:['moonlit','bluehour','afterglow'], sky:[[0.28,0.06,262],[0.52,0.095,38],[0.45,0.085,15],[0.37,0.075,265],[0.33,0.09,252],[0.29,0.09,255]], skyW:[0.5,0.09,45], glowC:[0.52,0.09,50], fogB:[0.27,0.07,255], ambU:[0.36,0.07,270], ambD:[0.26,0.05,268], clLit:[0.78,0.15,45], clShade:[0.46,0.07,292], clDeep:[0.4,0.07,286], clRim:[0.8,0.12,50], skyK:[0.5,6,0.12], key:[0.82,0.1,50,0.6], sunVis:0, fogK:1, hazeK:1, seaLit:0.8, paint:{lit:[0.42,0.65,245,0.9],shade:[0.38,0.65,248,0.9],deep:[0.35,0.65,250,0.9],pale:[0.5,0.5,250,0.5]}, post:{bloomK:0.35,shafts:0,sat:1.04,stars:1,hi:0.1,hiC:[0.4,0.06,252]}, fx:{belt:0.4}, ceil:0.525 }
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
  var SKY_COLK = ['sunC', 'skyW', 'glowC', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'hiC', 'shaftC'];
  var SKY_CLOUDK = ['clLit', 'clShade', 'clDeep', 'clRim'];
  var SKY = { seed: null, hour: null, V: null, ids: [], land: {}, seq: [], visits: {}, rO: null, rV: null, vS: 0, sets: {}, dt: 0,
    i: -1, e: null, pair: '', A: null, B: null, X: null, Y: null, k: 0, q: 0, x: 0, half: 0, gen: 0, pgen: 0, far: false,
    baseLab: null, recT: -1e9, skyS: new Float32Array(3), fx: new Float32Array(8), rise: new Float32Array(2), sunVis: 1, ceil: 2, moonD: null };
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
    L.sunDir = Array.prototype.slice.call(sunDir);
    if (S.kit) { L.sunVis = 1; return L; }
    L.sunC = lchA(S.key, S.key[3]);
    L.sky = S.sky.map(function (c) { return lchA(c); });
    L.skyE = SKYE_W.slice(); L.skyW = lchA(S.skyW); L.skyK = [S.skyK[0], S.skyK[1], S.skyK[2], 0];
    L.glowC = lchA(S.glowC);
    L.fog = [L.fog[0] * S.fogK, L.fog[1], L.fog[2], L.fog[3] * S.fogK];
    L.fogB = [lchA(S.fogB), K.fogB ? K.fogB[1] : 0];
    L.haze = [L.haze[0] * S.hazeK, L.haze[1], L.haze[2], L.haze[3]];
    L.ambU = lchA(S.ambU); L.ambD = lchA(S.ambD);
    L.clLit = lchA(S.clLit); L.clShade = lchA(S.clShade); L.clDeep = lchA(S.clDeep); L.clRim = lchA(S.clRim);
    L.hi = [S.post.hi, L.hi[1], L.hi[2], L.hi[3]]; L.hiC = lchA(S.post.hiC);
    L.bloom = [L.bloom[0], L.bloom[1], L.bloom[2] * S.post.bloomK];
    L.shafts = S.post.shafts; L.sat = S.post.sat; L.exposure = 1; L.stars = S.post.stars; L.sunVis = S.sunVis;
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
