  /* ---- the sun and moon (the owner's "same w sun"): in a change between a twilight sky (afterglow, blue hour, first
     light: the sun under the sea at its skyEl) and a night sky (skyEl null) the sun keeps sinking, to AIR_SUN_NIGHT
     (or rises from it), on ss01(k) over the whole change, so it starts and ends at rest; everything it lights
     follows its elevation: its glow about it (uSkyS) and the veil's brightening, the warm band low on its side and the
     haze's warm side (sunk by place: whole only under the sun's depth D), each weakening with its depth (band: 1 at -7
     and above, exactly 0 at AIR_SUN_NIGHT), the Earth's shadow climbing with it (the belt's own height) and dissolving with
     band, the noctilucent wisps going dark from below as that shadow climbs over them. The night's own light (its glow,
     its warm band and its haze's warm side about the key, the veil's brightening there) comes in with the night's
     colours (QN), as the sky's colours do. No words input and no clock; outside such a change nothing is touched
     (SUNU.on false: the shaders' branches skipped and the uniforms uploaded as without it, bit for bit) */
  var SUN_BAND = 17, SUN_WISP0 = -1, SUN_MIST = 0.75;
  var SUNU = { on: false, L: null, n: new Float32Array(4), z: new Float32Array([0, 1, 0, 0]), k0: new Float32Array(4), glowS: new Float32Array(3), glowN: new Float32Array(3), wT: new Float32Array(3), wN: new Float32Array(3),
    kT: new Float32Array(4), kN: new Float32Array(4), sk: new Float32Array(4), sb: new Float32Array(4), hi0: new Float32Array(4), es: 0, band: 1, QN: 0, E: 1, D: 0 };
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
    var eA = nB ? eT : AIR_SUN_NIGHT, eB = nB ? AIR_SUN_NIGHT : eT, es = eA + (eB - eA) * ss01(k), D = eT - es;
    var band = ss01((es - AIR_SUN_NIGHT) / SUN_BAND), qn = SKY.far ? (SKY.half + SKY.q) / 2 : SKY.q, QN = nB ? qn : 1 - qn;
    var E = SKY.far ? 1 - SUN_MIST * (SKY.half ? 1 - SKY.q : SKY.q) : 1, az = V.light.sunAz * DEG, el = es * DEG;
    SKY.skyS[0] = Math.sin(az) * Math.cos(el); SKY.skyS[1] = Math.sin(el); SKY.skyS[2] = Math.cos(az) * Math.cos(el); L.skyS = SKY.skyS;
    skyEndCol(T, 'glowC', w, SUNU.glowS); skyEndCol(N, 'glowC', w, SUNU.glowN);
    for (i = 0; i < 3; i++) { SUNU.glowS[i] *= band; SUNU.glowN[i] *= QN; }
    skyEndCol(T, 'skyW', w, SUNU.wT); skyEndCol(N, 'skyW', w, SUNU.wN); skyEndNum(T, 'skyK', w, SUNU.kT); skyEndNum(N, 'skyK', w, SUNU.kN);
    SUNU.k0[0] = 0; SUNU.k0[1] = SUNU.kT[1]; SUNU.k0[2] = 0; SUNU.k0[3] = 0;   // (skyCol's own band off: its amounts 0, its scale kept)
    var kd = keyAt(V); SUNU.n[0] = kd[0]; SUNU.n[1] = kd[1]; SUNU.n[2] = kd[2]; SUNU.n[3] = 1;
    SUNU.sk[0] = D; SUNU.sk[1] = band; SUNU.sk[2] = QN; SUNU.sk[3] = SUN_WISP0 + 1.1 * D;
    SKY.fx[0] = T.fx[0] * band * E; SKY.fx[1] = T.fx[1] * E;   // (the belt's height already follows es through uSkyS; in a change through the mist, the waypoint's events at a quarter)
    SUNU.es = es; SUNU.band = band; SUNU.QN = QN; SUNU.E = E; SUNU.D = D;
  }
  /* (physics: sky/purple-light) the purple light: the high (about 20 km) haze's glow lit by the sun from below the
     horizon, seen 2-6 deg after sunset and before sunrise: its amount whole from 3 to 4 deg down (the most at 3-4, WMO), none above 1.5 or below
     6; its centre on the sun's bearing, 28 deg up with the sun 3 down, sinking with it (16 deg at 6 down). Into out:
     its centre (xyz) and its amount (w) */
  var PURP = new Float32Array(4);
  function purpleAt(d, az) {
    var w = clamp((-1.5 - d) / 1.5, 0, 1), x = clamp((d + 6) / 2, 0, 1), e = clamp(24 + 4 * (d + 4), 4, 40) * DEG;
    w = w * w * (3 - 2 * w) * x * x * (3 - 2 * x);
    PURP[0] = Math.sin(az) * Math.cos(e); PURP[1] = Math.sin(e); PURP[2] = Math.cos(az) * Math.cos(e); PURP[3] = w;
    return PURP;
  }
  function skyThemeWarm(c, e, side) {   // skyWarmN's, on the CPU (theme-color)
    var lt = Math.exp(-Math.max(e + SUNU.D, 0) / SUNU.kT[1]) * SUNU.band, ln = Math.exp(-Math.max(e, 0) / SUNU.kN[1]) * SUNU.QN, j;
    for (j = 0; j < 3; j++) { c[j] += (SUNU.wT[j] - c[j]) * SUNU.kT[0] * side * side * lt; c[j] *= 1 - SUNU.kT[2] * (1 - side) * lt; c[j] += (SUNU.wN[j] - c[j]) * SUNU.kN[0] * side * side * ln; c[j] *= 1 - SUNU.kN[2] * (1 - side) * ln; }
  }
