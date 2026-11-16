  /* the far field (KF): raw texels within FH and KF_RAW of the camera (the director's settled reach), derived within FDH
     once their neighbours are */
  function kfFollow(x, z, sync) {
    var ci = Math.floor(x / FSTEP), cj = Math.floor(z / FSTEP), i, j, budget = sync ? 1e9 : KF_FRAME;
    KF.i0 = ci; KF.j0 = cj;
    for (var r = 0; r <= FH && budget > 0; r++) for (j = cj - r; j <= cj + r && budget > 0; j++) for (i = ci - r; i <= ci + r; i++) {   // (rings, the nearest first)
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
      var q = kmod(j, FN) * FN + kmod(i, FN), key = kkey(i, j);
      if (KF.ix[q] === key) continue;
      var tx = (i + 0.5) * FSTEP, tz = (j + 0.5) * FSTEP;
      if ((tx - x) * (tx - x) + (tz - z) * (tz - z) > KF_RAW * KF_RAW) continue;
      var k = kitAt(tx, tz);
      KF.data[q * 4] = k.wD; KF.data[q * 4 + 1] = k.wC; KF.data[q * 4 + 2] = SEA_LO; KF.data[q * 4 + 3] = SINK;
      KF.ix[q] = key; KF.dx[q] = BADK; KF.baked++; KF.dirty = true;
      if (--budget <= 0) break;
    }
    for (j = cj - FDH; j <= cj + FDH; j++) for (i = ci - FDH; i <= ci + FDH; i++) {
      var q2 = kmod(j, FN) * FN + kmod(i, FN), key2 = kkey(i, j);
      if (KF.dx[q2] === key2 || KF.ix[q2] !== key2) continue;
      var lv = 1e9, sk = -1e9, ok = true;
      for (var b = -FAR_R; b <= FAR_R && ok; b++) for (var a = -FAR_R; a <= FAR_R; a++) {
        var qa = kmod(j + b, FN) * FN + kmod(i + a, FN);
        if (KF.ix[qa] !== kkey(i + a, j + b)) { ok = false; break; }
        var w = KF.data[qa * 4 + 1], d = KLIP * FSTEP * (Math.abs(a) + Math.abs(b));
        lv = Math.min(lv, SEA_LO + RISE * w + d); sk = Math.max(sk, SINK * w - d);
      }
      if (!ok) continue;
      KF.data[q2 * 4 + 2] = lv; KF.data[q2 * 4 + 3] = sk; KF.dx[q2] = key2; KF.derived++; KF.dirty = true;
    }
    KF.ok = true;
    KF.cx = (KF.i0 + 0.5) * FSTEP; KF.cz = (KF.j0 + 0.5) * FSTEP;
  }
  var KFROWS = FN * FN / KN;   // (KF's texels in the texture's rows under KW's: 16 rows of 256)
  function kwUpload() {   // GPU: the texture made at the start; the rows baked since, written (unit 1, kept bound)
    if (!KW.tex) {
      KW.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, KW.tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, KN, KN + KFROWS);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KN, KN, gl.RGBA, gl.FLOAT, KW.data); KW.dirty.length = 0;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, KN, KN, KFROWS, gl.RGBA, gl.FLOAT, KF.data); KF.dirty = false;
      gl.activeTexture(gl.TEXTURE0); return;
    }
    if (!KW.dirty.length && !KF.dirty) return;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, KW.tex);
    var seen = {};
    for (var k = 0; k < KW.dirty.length; k++) { var r = KW.dirty[k]; if (seen[r]) continue; seen[r] = 1; gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, r, KN, 1, gl.RGBA, gl.FLOAT, KW.data, r * KN * 4); }
    if (KF.dirty) { gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, KN, KN, KFROWS, gl.RGBA, gl.FLOAT, KF.data); KF.dirty = false; }
    KW.dirty.length = 0; gl.activeTexture(gl.TEXTURE0);
  }
  function kwForget() { KW.tex = null; KW.dirty.length = 0; }   // (a lost context: the texture made again, whole, from the CPU's grids)
  /* the cubic B-spline (C2) over a grid, as the GLSL's: channel values and gradients; then the blend (kitW4's) */
  function bsw(f, o) { var f2 = f * f, f3 = f2 * f; o[0] = (1 - 3 * f + 3 * f2 - f3) / 6; o[1] = (4 - 6 * f2 + 3 * f3) / 6; o[2] = (1 + 3 * f + 3 * f2 - 3 * f3) / 6; o[3] = f3 / 6; }
  function bsd(f, o) { var f2 = f * f; o[0] = (-3 + 6 * f - 3 * f2) / 6; o[1] = (-12 * f + 9 * f2) / 6; o[2] = (3 + 6 * f - 9 * f2) / 6; o[3] = 3 * f2 / 6; }
  var BWX = [0, 0, 0, 0], BWZ = [0, 0, 0, 0], BDX = [0, 0, 0, 0], BDZ = [0, 0, 0, 0], KWO = new Float64Array(12), KBN = new Float64Array(12), KBF = new Float64Array(12);
  function bsGrid(far, x, z, out) {   // out: channel c's value, d/dx, d/dz at 3c .. 3c + 2
    var D = far ? KF.data : KW.data, N = far ? FN : KN, st = far ? FSTEP : KSTEP, cx = far ? KF.cx : KW.cx, cz = far ? KF.cz : KW.cz, hw = (far ? FSH : KSH) * st;
    var qx = clamp(x, cx - hw, cx + hw), qz = clamp(z, cz - hw, cz + hw);
    var tx = qx / st - 0.5, tz = qz / st - 0.5, ix = Math.floor(tx), iz = Math.floor(tz), fx = tx - ix, fz = tz - iz;
    if (KW.part && !far) for (var gb = -1; gb <= 2; gb++) for (var ga = -1; ga <= 2; ga++) kwEnsure(ix + ga, iz + gb);   // (fast500 B3: the CPU's reads while the first plan's rest is pending)
    bsw(fx, BWX); bsw(fz, BWZ); bsd(fx, BDX); bsd(fz, BDZ);
    out.fill(0);
    for (var b = 0; b < 4; b++) for (var a = 0; a < 4; a++) {
      var q = (kmod(iz - 1 + b, N) * N + kmod(ix - 1 + a, N)) * 4, w0 = BWX[a] * BWZ[b], wx = BDX[a] * BWZ[b] / st, wz = BWX[a] * BDZ[b] / st;
      for (var c = 0; c < 4; c++) { var v = D[q + c]; out[c * 3] += w0 * v; out[c * 3 + 1] += wx * v; out[c * 3 + 2] += wz * v; }
    }
    return out;
  }
  function sstepD(a, b, x) { var t = (x - a) / (b - a); return t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t) / (b - a); }
  /* the weights at (x, z) (KWO: wD, d/dx, d/dz; wC ...; the sea's level ...; the land's sink ...): KW near the camera,
     eased into KF and that into KW_FAR by the distance from the camera (the flight's: CS, as the GPU's is the drawn
     camera's, the same within a step) */
  function kwAt(x, z) {
    var ex = x - CS.x, ez = z - CS.z, dc = Math.sqrt(ex * ex + ez * ez), ux = dc > 1e-3 ? ex / dc : 0, uz = dc > 1e-3 ? ez / dc : 0;
    var kn = 1 - smooth(KN0, KN1, dc), kf = 1 - smooth(KF0, KF1, dc), dkn = -sstepD(KN0, KN1, dc), dkf = -sstepD(KF0, KF1, dc), c;
    if (kn >= 1) return bsGrid(false, x, z, KWO);
    for (c = 0; c < 4; c++) { KBF[c * 3] = KW_FAR[c]; KBF[c * 3 + 1] = 0; KBF[c * 3 + 2] = 0; }
    if (kf > 0) bsGrid(true, x, z, KBF);
    if (kn > 0) bsGrid(false, x, z, KBN);
    for (c = 0; c < 4; c++) {
      var vF = KBF[c * 3], vN = kn > 0 ? KBN[c * 3] : vF, vM = vF + (vN - vF) * kn;
      var gxM = KBF[c * 3 + 1] + ((kn > 0 ? KBN[c * 3 + 1] : KBF[c * 3 + 1]) - KBF[c * 3 + 1]) * kn + (vN - vF) * dkn * ux;
      var gzM = KBF[c * 3 + 2] + ((kn > 0 ? KBN[c * 3 + 2] : KBF[c * 3 + 2]) - KBF[c * 3 + 2]) * kn + (vN - vF) * dkn * uz;
      KWO[c * 3] = KW_FAR[c] + (vM - KW_FAR[c]) * kf; KWO[c * 3 + 1] = gxM * kf + (vM - KW_FAR[c]) * dkf * ux; KWO[c * 3 + 2] = gzM * kf + (vM - KW_FAR[c]) * dkf * uz;
    }
    return KWO;
  }
  /* the cloud sea's level and the land's sink, as the GLSL's (kitW4's derived channels) */
  function seaBaseAt(x, z) { return kwAt(x, z)[6]; }
  /* the climate the light reads: the cloud weight averaged over a disc of LIGHT_R about the camera (a pure function of
     where the camera is: no clock, no easing in time) */
  var LIGHT_R = [0, 350, 700], LIGHT_WT = [4, 1, 0.5];
  function lightWeight(x, z) {
    var s = 0, sw = 0;
    for (var r = 0; r < LIGHT_R.length; r++) {
      var n = r ? 8 : 1;
      for (var k = 0; k < n; k++) { var a = (k + 0.5 * r) / n * 2 * PI; s += kwAt(x + Math.sin(a) * LIGHT_R[r], z + Math.cos(a) * LIGHT_R[r])[3] * LIGHT_WT[r]; sw += LIGHT_WT[r]; }
    }
    return s / sw;
  }

