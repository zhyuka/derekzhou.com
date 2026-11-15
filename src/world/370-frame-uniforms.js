  /* ---------------------------------------------------------------- frame uniforms (typed, filled in place: no
     garbage a frame) */
  var VP = new Float32Array(16), RES = new Float32Array(2), PROJ = new Float32Array(4), UT = new Float32Array(1), NEAR = 0.8, FAR = 40000, DBG = 0;
  var CPOS = CAMV.subarray(0, 3), CR = CAMV.subarray(3, 6), CU = CAMV.subarray(6, 9), CF = CAMV.subarray(9, 12);
  var FOV_LONG = 72;
  var FR = { tanX: 1, tanY: 1, t: 0 }, FRT = { tanX: 1, tanY: 1 };
  var HZU = new Float32Array(4);
  function setFrameUniforms(P, V) {
    var u = P.u, L = V.L || V.light;
    if (u.uCam) gl.uniform3fv(u.uCam, CPOS);
    if (u.uCamR) gl.uniform3fv(u.uCamR, CR);
    if (u.uCamU) gl.uniform3fv(u.uCamU, CU);
    if (u.uCamF) gl.uniform3fv(u.uCamF, CF);
    if (u.uProj) gl.uniform4fv(u.uProj, PROJ);
    if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, VP);
    if (u.uRes) gl.uniform2fv(u.uRes, RES);
    if (u.uT) gl.uniform1fv(u.uT, UT);
    if (u.uDbg) gl.uniform1i(u.uDbg, DBG);
    if (u.uPxK) gl.uniform1f(u.uPxK, Math.max(1, OUT.dpr * SS / 1.25));   // (the world's pixels a pixel of the display's: 1 but in a supersampled reference)
    if (u.uSalt) gl.uniform1ui(u.uSalt, V.salt);
    if (u.uAir) gl.uniform4fv(u.uAir, UAIR);
    if (u.uAirM) gl.uniform1f(u.uAirM, UAIRM[0]);
    if (u.uSun) gl.uniform3fv(u.uSun, L.sunDir);
    if (u.uSkyS) gl.uniform3fv(u.uSkyS, L.skyS || L.sunDir);   // (the sky's own light)
    if (u.uSunC) gl.uniform3fv(u.uSunC, L.sunC);
    if (u.uSky) gl.uniform3fv(u.uSky, L.skyFlat);
    if (u.uSkyE) gl.uniform4fv(u.uSkyE, L.skyE);
    if (u.uSkyW) gl.uniform3fv(u.uSkyW, L.skyW);
    var snU = SUNU.on && L === SUNU.L;   // (a change between a twilight sky and a night, on the live light only)
    if (u.uSkyK) gl.uniform4fv(u.uSkyK, snU ? SUNU.k0 : L.skyK);
    if (u.uGlow) gl.uniform4fv(u.uGlow, L.glow);
    if (u.uGlowC) gl.uniform3fv(u.uGlowC, snU ? SUNU.glowS : L.glowC);
    if (u.uSkyN) { gl.uniform4fv(u.uSkyN, snU ? SUNU.n : SUNU.z); if (snU) { if (u.uGlowN) gl.uniform3fv(u.uGlowN, SUNU.glowN); if (u.uSkyWT) gl.uniform3fv(u.uSkyWT, SUNU.wT); if (u.uSkyWN) gl.uniform3fv(u.uSkyWN, SUNU.wN); if (u.uSkyKT) gl.uniform4fv(u.uSkyKT, SUNU.kT); if (u.uSkyKN) gl.uniform4fv(u.uSkyKN, SUNU.kN); if (u.uSunK) gl.uniform4fv(u.uSunK, SUNU.sk); if (u.uHzT) gl.uniform3fv(u.uHzT, SUNU.hzT); if (u.uHzN) gl.uniform3fv(u.uHzN, SUNU.hzN); } }
    if (u.uFog) gl.uniform4fv(u.uFog, L.fog);
    if (u.uFog2) gl.uniform4fv(u.uFog2, L.fog2);
    if (u.uFogB) gl.uniform4fv(u.uFogB, L.fogBf);
    // the ground haze's base under the eye follows the cruise clearance (a slow function of the maps), so the surface
    // flown lies over the base and the far ground's haze meets the sky's at the horizon (a base fixed 24 m under the eye
    // lies above a cloud sea flown 30-40 m over: the far sea takes a fifth of the haze the sky takes just above it, and
    // the horizon shows as a bright line)
    if (u.uHaze) { HZU[0] = L.haze[0]; HZU[1] = L.haze[1]; HZU[2] = L.haze[2] + Math.max(0, (V.clear ? V.clear[1] : 14) - 14) * 1.6; HZU[3] = L.haze[3]; gl.uniform4fv(u.uHaze, HZU); }
    if (u.uHazeC) gl.uniform3fv(u.uHazeC, L.hazeC);
    if (u.uHazeW) gl.uniform3fv(u.uHazeW, L.hazeW);
    if (u.uAmbU) gl.uniform3fv(u.uAmbU, L.ambU);
    if (u.uAmbD) gl.uniform3fv(u.uAmbD, L.ambD);
    if (u.uClLit) gl.uniform3fv(u.uClLit, L.clLit);
    if (u.uClShade) gl.uniform3fv(u.uClShade, L.clShade);
    if (u.uClDeep) gl.uniform3fv(u.uClDeep, L.clDeep);
    if (u.uClRim) gl.uniform3fv(u.uClRim, L.clRim);
    if (u.uClK) gl.uniform4fv(u.uClK, L.clK);
    if (u.uClK2) gl.uniform4fv(u.uClK2, L.clK2);
    if (u.uP) gl.uniform4fv(u.uP, V.paramsFlat);
    if (u.uKWc) gl.uniform4f(u.uKWc, KW.cx, KW.cz, KSTEP, KN);   // (the kits' weights' grid, on unit 1)
    if (u.uKFc) gl.uniform4f(u.uKFc, KF.cx, KF.cz, FSTEP, FN);   // (the far field's grid, in the same texture)
    if (u.uGC) gl.uniform4fv(u.uGC, GCU);
    if (u.uSunVis) gl.uniform1f(u.uSunVis, L.sunVis);
    if (u.uWet) gl.uniform4fv(u.uWet, L.wet);
  }
  /* a light, flattened for uniforms: typed arrays, defaults filled (sunVis, the sun's share of the sky;
     rain, the rain's amount; ripple, the water's; windDir; deep, the realm's deep shade (a passage through the dark);
     glare, the white of a passage through light) */
  var LDEF = { bloom: [1.1, 0.5, 0.18], cl: [7, 0.13, 0.003, 1], clDetail: [120, 4], shaftC: [1, 0.9, 0.8], lift: [0, 0, 0], gain: [1, 1, 1], fog2: [0.5, 0.012, 0, 0], hi: [0, 0, 0, 0], hiC: [1, 1, 1], exposure: 1, sat: 1,
    haze: [0, 30, 20, 0], hazeC: [1, 1, 1], hazeW: null, sunVis: 1, rain: 0, ripple: 0.5, windDir: AIR_DIR, shafts: 0, inCloudK: 1 };
  var LKC = ['sunC', 'skyW', 'glowC', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'hazeC', 'hazeW', 'hiC', 'shaftC', 'deep', 'glare'];   // colours: blended in OKLab
  var LKN = ['skyE', 'skyK', 'glow', 'fog', 'fog2', 'haze', 'clK', 'clK2', 'bloom', 'cl', 'clDetail', 'lift', 'gain', 'hi', 'discK', 'windDir'];   // numbers: linearly
  var LKS = ['exposure', 'sat', 'shafts', 'inCloudK', 'sunVis', 'rain', 'ripple'];
  function prepOne(L) {
    for (var dk in LDEF) if (L[dk] === undefined) L[dk] = LDEF[dk];
    if (!L.hazeW) L.hazeW = L.hazeC;
    if (!L.deep) { var s0 = lin2lab(L.sky[0]); L.deep = lab2linA(clamp(Math.min(s0[0] * 0.55, 0.3), 0.13, 0.3), s0[1] * 0.8, s0[2] * 0.8); }
    if (!L.glare) L.glare = lch(0.99, 0.02, 85, 2.4);
    ['sunDir', 'sunC', 'skyE', 'skyW', 'skyK', 'glow', 'glowC', 'fog', 'fog2', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'clK', 'clK2', 'bloom', 'cl', 'clDetail', 'shaftC', 'lift', 'gain', 'hi', 'hiC', 'haze', 'hazeC', 'hazeW', 'deep', 'glare', 'windDir'].forEach(function (k) { if (L[k] && !(L[k] instanceof Float32Array)) L[k] = new Float32Array(L[k]); });
    L.skyFlat = new Float32Array(18); for (var i = 0; i < 6; i++) { L.skyFlat[i * 3] = L.sky[i][0]; L.skyFlat[i * 3 + 1] = L.sky[i][1]; L.skyFlat[i * 3 + 2] = L.sky[i][2]; }
    var fb = L.fogB || [L.sky[1], 0]; L.fogBf = new Float32Array([fb[0][0], fb[0][1], fb[0][2], fb[1]]);
    L.discK = new Float32Array([Math.cos((L.discR || 1) * DEG), L.discI || 0, L.stars || 0, L.disc || 0]);
    var wl = Math.sqrt(L.windDir[0] * L.windDir[0] + L.windDir[1] * L.windDir[1]) || 1;
    L.wet = new Float32Array([L.rain, L.ripple, L.windDir[0] / wl, L.windDir[1] / wl]);
    return L;
  }
  function prepLight(V) {   // the world's base light (once), its field's parameters
    var L = V.light;
    prepOne(L);
    var P = V.field.params || [], pf = new Float32Array(96);
    for (var j = 0; j < Math.min(P.length, 24); j++) for (var k = 0; k < 4; k++) pf[j * 4 + k] = P[j][k] === undefined ? 0 : P[j][k];
    V.paramsFlat = pf;
    V.L = L; V.LA = null;   // (the kits' lights are set by worldLights; no light by area)
  }
  /* OKLab of a linear colour, and back */
  function lin2lab(c) {
    var l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    return new Float32Array([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]);
  }
  function lab2linA(L, a, b) { var c = oklab2lin(L, a, b); return [Math.max(c[0], 0), Math.max(c[1], 0), Math.max(c[2], 0)]; }
  var LABT = new Float32Array(3);
  function labTo(out, o, L, a, b) {   // OKLab into out[o..o+2], linear (no allocation)
    var l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    out[o] = Math.max(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, 0); out[o + 1] = Math.max(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, 0); out[o + 2] = Math.max(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s, 0);
  }
  /* the composite's inputs (the world's live light; there is no junction to ease across) */
  var EL = { bloom: new Float32Array(3), shaftC: new Float32Array(3), lift: new Float32Array(3), gain: new Float32Array(3), exposure: 1, sat: 1 };
  var SIMNIGHT = false;   // (dev: __world.set({ simnight: 1 }); the paper birds' night look over a SIMULATED night)
  var CAMK = 1;   // (dev: __world.set({ camk: 0.4 }); the camera's pace scaled for a film of a staged wheel (a camera that lingers near a wheel is the world's open decision: SIMULATED); 1 = the world's own pace)
  function easedLight(V, u) {
    var L = V.L || V.light, P = null, w = 1, k;   // (no last realm to ease from)
    var Q = L;
    for (k = 0; k < 3; k++) { EL.bloom[k] = lerp(Q.bloom[k], L.bloom[k], w); EL.shaftC[k] = lerp(Q.shaftC[k], L.shaftC[k], w); EL.lift[k] = lerp(Q.lift[k], L.lift[k], w); EL.gain[k] = lerp(Q.gain[k], L.gain[k], w); }
    EL.exposure = lerp(Q.exposure, L.exposure, w); EL.sat = lerp(Q.sat, L.sat, w);
    if (SIMNIGHT) {   // (dev only: SIMULATED night, the world having no night yet: the day's light graded down and toward blue; never in production)
      EL.exposure *= 0.15; EL.sat *= 0.7;
      for (k = 0; k < 3; k++) { EL.gain[k] *= [0.6, 0.74, 1.08][k]; EL.lift[k] += [0.0015, 0.0025, 0.007][k]; EL.bloom[k] *= k === 0 ? 0.6 : 1; }
    }
    return EL;
  }

