// facetpose.js, the ink birds' wing model (src/birds/model/, served as written). Written by hand. Its comments keep the
// tags and file names of the development record it came from (rounds, labs, judges), outside this repository.
/* facetpose.js (majestic round, form): the faceted M posed. No DOM, no clock, no entropy; allocation-free per call.

     var P = FACETPOSE(FACETFORM);
     P.pose()                         a new pose (Float64Array(22), the glide's zeros)
     P.glide(kind, k, pose)           the kind's glide (the arm's dihedral by k: each bird's own set) with its tip set
     P.from14(p14, pose)              the last round's 14-angle pose (birdpose.js) into this one (the tips at rest)
     P.from20(p20, pose, kind)        the motion designer's 20-angle pose (rig3.js: a tip joint more) into this one
     P.verts(kind, pose, out)         every vertex posed (out: 3 x nv, body frame: x forward, y left, z up; spans)
     P.facetNormals(kind, V, out)     each facet's normal (area-weighted over its triangles; unit), out: 3 x nf
     P.paper16(kind, pose, out48)     the last round's 16 points (tips, wrists, shoulders, trailing edges; the body point)
     P.chain(kind, V, out21)          the leading edge's M, tip to tip (7 points; the pen's floor runs along it)
     P.bones(kind, pose, out156)      the 13 bones (R 9, t 3 each) for skinning the static mesh on the GPU
     P.light(kind, N, eye, L, out, area)  each facet's light (option 5: white paper lit like cloud); returns the one tone
     P.lodK(spanPx)                   the facets' share by the bird's ink span on the window (0 under 20 px, 1 from 64)
     P.mix(a, b, w, pose)             a blend, angle by angle
     P.flexBeat(kind, ph, pose)       a STAND-IN beat with the wing's flex (for the form's turntables only: the motion
                                      designer's beat drives the rig in the build)

   THE RIG (per side; the right mirrors the left in y): the shoulder at the body point turns the arm (dih + up, swp +
   forward, twi + leading edge up; R = Rz(-swp) Rx(dih) Ry(-twi), as birdpose.js), ext (1 straight; less draws the
   wrist in); the wrist turns the hand relative to the arm (dih, swp, twi); the wrist's FOLD LINE (the wrist section)
   takes half the hand's turn (a crease bisects its fold); the tip's three pleats turn on their own joints at the
   knuckle's leading edge: dih (curl: + up), swp (+ forward; the tips trailing -), twi (+ leading edge up: the trailing
   edge down), spread (+ fans the trailing pleats back), each pleat taking its share (FACETFORM.primw). The pose (22
   floats): left 0-10, right 11-21: arm dih, swp, twi, ext; hand dih, swp, twi; tip dih, swp, twi, spread (degrees; ext
   a share). The first ten of a side are the motion designer's rig3.js (from20); the first seven the last round's. */
(function (root) {
  'use strict';
  var DEG = Math.PI / 180;
  function FACETPOSE(FORM) {
    var KIND = FORM.kinds, PW = FORM.primw, NP = 11;
    var M1 = new Float64Array(9), M2 = new Float64Array(9), M3 = new Float64Array(9);
    function mul(a, b, o) { for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) o[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]; return o; }
    function rx(a, o) { var c = Math.cos(a), s = Math.sin(a); o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0; o[4] = c; o[5] = -s; o[6] = 0; o[7] = s; o[8] = c; return o; }
    function ry(a, o) { var c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = 0; o[2] = s; o[3] = 0; o[4] = 1; o[5] = 0; o[6] = -s; o[7] = 0; o[8] = c; return o; }
    function rz(a, o) { var c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = -s; o[2] = 0; o[3] = s; o[4] = c; o[5] = 0; o[6] = 0; o[7] = 0; o[8] = 1; return o; }
    function joint(dih, swp, twi, o) { rz(-swp * DEG, M1); rx(dih * DEG, M2); mul(M1, M2, M3); ry(-twi * DEG, M1); return mul(M3, M1, o); }
    /* the bones of one side (rotation R and origin t, body frame): 13 slots of 12 (R 9, t 3); 0 the body */
    var BN = new Float64Array(13 * 12), RA = new Float64Array(9), RH = new Float64Array(9), RJ = new Float64Array(9), RF = new Float64Array(9), TMP = new Float64Array(9);
    for (var bi = 0; bi < 13; bi++) { BN[12 * bi] = 1; BN[12 * bi + 4] = 1; BN[12 * bi + 8] = 1; }
    function setBone(k, R, tx, ty, tz, sg) {
      var o = 12 * k;
      for (var i = 0; i < 9; i++) BN[o + i] = R[i];
      if (sg < 0) { BN[o + 1] = -BN[o + 1]; BN[o + 3] = -BN[o + 3]; BN[o + 5] = -BN[o + 5]; BN[o + 7] = -BN[o + 7]; ty = -ty; }   // (mirrored: M R M)
      BN[o + 9] = tx; BN[o + 10] = ty; BN[o + 11] = tz;
    }
    function bones(K, p) {
      for (var side = 0; side < 2; side++) {
        var o = side * NP, sg = side ? -1 : 1, base = 1 + 6 * side, i, j;
        var ext = p[o + 3];
        joint(p[o], p[o + 1], p[o + 2], RA);
        joint(p[o + 4], p[o + 5], p[o + 6], RJ); mul(RA, RJ, RH);                 // the hand
        joint(0.5 * p[o + 4], 0.5 * p[o + 5], 0.5 * p[o + 6], RJ); mul(RA, RJ, RF);   // the fold line: half the hand's turn
        var wx = RA[1] * K.A * ext, wy = RA[4] * K.A * ext, wz = RA[7] * K.A * ext;   // the wrist (left frame)
        setBone(base, RA, 0, 0, 0, sg);
        setBone(base + 1, RF, wx, wy, wz, sg);
        setBone(base + 2, RH, wx, wy, wz, sg);
        /* the pivot of the tip: the knuckle's leading edge, on the hand */
        var px = -K.dims.kx, py = K.yK;
        var tx = wx + RH[0] * px + RH[1] * py, ty = wy + RH[3] * px + RH[4] * py, tz = wz + RH[6] * px + RH[7] * py;
        for (j = 0; j < 3; j++) {
          joint(p[o + 7] * PW.curl[j], p[o + 8] * PW.swp[j] + p[o + 10] * PW.spread[j], p[o + 9] * PW.twist[j], RJ);
          mul(RH, RJ, TMP);
          setBone(base + 3 + j, TMP, tx, ty, tz, sg);
        }
      }
    }
    function verts(kind, p, out) {
      var K = KIND[kind], v = K.v, b = K.b, n = b.length, i, o, x, y, z;
      bones(K, p);
      for (i = 0; i < n; i++) {
        o = 12 * b[i]; x = v[3 * i]; y = v[3 * i + 1]; z = v[3 * i + 2];
        out[3 * i] = BN[o] * x + BN[o + 1] * y + BN[o + 2] * z + BN[o + 9];
        out[3 * i + 1] = BN[o + 3] * x + BN[o + 4] * y + BN[o + 5] * z + BN[o + 10];
        out[3 * i + 2] = BN[o + 6] * x + BN[o + 7] * y + BN[o + 8] * z + BN[o + 11];
      }
      return out;
    }
    /* the 13 bones (R row-major 9, t 3: 12 floats each) for a pose, for skinning on the GPU (the static mesh: FORM.v in
       its bones' frames, FORM.b the bone of each vertex): x_body = R x_local + t */
    function bonesOf(kind, p, out) { bones(KIND[kind], p); for (var i = 0; i < 156; i++) out[i] = BN[i]; return out; }
    function facetNormals(kind, V, out) {
      var K = KIND[kind], T = K.tri, tf = K.tf, nf = K.facets.length, i, a, b, c, f;
      for (i = 0; i < 3 * nf; i++) out[i] = 0;
      for (i = 0; i < tf.length; i++) {
        a = 3 * T[3 * i]; b = 3 * T[3 * i + 1]; c = 3 * T[3 * i + 2]; f = 3 * tf[i];
        var ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
        out[f] += uy * vz - uz * vy; out[f + 1] += uz * vx - ux * vz; out[f + 2] += ux * vy - uy * vx;
      }
      for (f = 0; f < nf; f++) { var l = Math.sqrt(out[3 * f] * out[3 * f] + out[3 * f + 1] * out[3 * f + 1] + out[3 * f + 2] * out[3 * f + 2]) || 1; out[3 * f] /= l; out[3 * f + 1] /= l; out[3 * f + 2] /= l; }
      return out;
    }
    var VS = new Float64Array(3 * 64);
    function paper16(kind, p, out) {
      var K = KIND[kind], m = K.p16, i;
      verts(kind, p, VS);
      for (i = 0; i < 16; i++) {
        if (m[i] < 0) { out[3 * i] = 0; out[3 * i + 1] = 0; out[3 * i + 2] = 0; continue; }
        out[3 * i] = VS[3 * m[i]]; out[3 * i + 1] = VS[3 * m[i] + 1]; out[3 * i + 2] = VS[3 * m[i] + 2];
      }
      return out;
    }
    function chain(kind, V, out) { var c = KIND[kind].chain; for (var i = 0; i < 7; i++) { out[3 * i] = V[3 * c[i]]; out[3 * i + 1] = V[3 * c[i] + 1]; out[3 * i + 2] = V[3 * c[i] + 2]; } return out; }
    function pose() { var p = new Float64Array(2 * NP); p[3] = 1; p[NP + 3] = 1; return p; }
    function glide(kind, k, o) {
      var K = KIND[kind], g = K.glide, tg = K.tipg;
      for (var s = 0; s < 2; s++) {
        var b = s * NP;
        o[b] = g[0] * (k === undefined ? 1 : k); o[b + 1] = g[1]; o[b + 2] = g[2]; o[b + 3] = g[3]; o[b + 4] = g[4]; o[b + 5] = g[5]; o[b + 6] = g[6];
        o[b + 7] = tg[0]; o[b + 8] = tg[1]; o[b + 9] = tg[2]; o[b + 10] = tg[3];
      }
      return o;
    }
    /* the motion designer's 20 (birds3d/majestic/motion/proto/rig3.js: per side arm dih, swp, twi, ext, hand dih, swp,
       twi, tip dih, swp, twi; left 0-9, right 10-19) into this pose: the same angles, the spread 0 (or the kind's glide
       spread when kind is given) */
    function from20(q, o, kind) {
      var sp = kind && KIND[kind] ? KIND[kind].tipg[3] : 0;
      for (var s = 0; s < 2; s++) { for (var i = 0; i < 10; i++) o[s * NP + i] = q[10 * s + i]; o[s * NP + 10] = sp; }
      return o;
    }
    function from14(q, o) { for (var s = 0; s < 2; s++) { for (var i = 0; i < 7; i++) o[s * NP + i] = q[7 * s + i]; for (i = 7; i < NP; i++) o[s * NP + i] = 0; } return o; }
    function mix(a, b, w, o) { for (var i = 0; i < 2 * NP; i++) o[i] = a[i] + (b[i] - a[i]) * w; return o; }

    /* THE LIGHT (the reference; option 5, "Birds of light": white paper lit like cloud, no gold, no head).
       light(kind, N, eye, L, out, area) fills out (3 x nf, linear, before the grade) with each facet's own light and
       returns the bird's ONE TONE (the last round's light: the same panels lit with its constants, area-weighted: the
       bright white the hold and the true-size outline were tuned on). Each facet: its normal turned toward the eye;
       the sun on the paper (SUN_K of the world's sun: lit facets near white, never all blown to one white), a share of
       it through the paper from behind (TRANS: lit paper glows against the light), the sky's light from above and, as
       thin paper passes it, a share of it under every facet (SKYT: the shade cool, the sky's blue), the lit cloud sea's
       from below (BOUNCE x seaLit), and a soft rim where a facet turns edge-on to the eye (RIM, the more against the
       light). L: { sunDir (unit, toward the sun), sunVis, sunC, ambU, ambD, clLit } as the world's HOST.light(); eye:
       the unit vector from the bird to the eye; N: facet normals in the same frame; area: each facet's area on the
       window (px), for the one tone. THE LEVEL OF DETAIL: the renderer shows, per facet, mix(graded one tone, graded
       facet light, lodK(spanPx)): a bird of today's true size (under LOD[0] px of ink span) is its one bright tone, as
       the last round's (the M's outline and its lightness against the sky kept), the facets coming in by LOD[1] px. */
    var LT = { PAPER: [0.94, 0.911, 0.853], SUN_K: 0.7, WRAP: 0, TRANS: 0.4, SKYT: 0.3, BOUNCE: 0.25, GAIN: 1.08, RIM: 0.22, RIM_P: 3,
               ONE: { SUN_K: 1, WRAP: 0.45, TRANS: 0.3, SKYT: 0, BOUNCE: 0.45, RIM: 0 }, LOD: [20, 64] };
    var ONE = new Float64Array(3);
    function lit1(C, nx, ny, nz, ne, sd, sv, sc, au, ad, cl, seaLit, back, out, o) {
      var dS = nx * sd[0] + ny * sd[1] + nz * sd[2];
      var direct = sv * Math.min(1, Math.max(0, (dS + C.WRAP) / (1 + C.WRAP))), through = sv * C.TRANS * Math.max(-dS, 0);
      var wsky = C.SKYT + (1 - C.SKYT) * (0.5 + 0.5 * nz), bnc = C.BOUNCE * Math.max(-nz, 0) * seaLit;
      var rim = sv * C.RIM * Math.pow(1 - ne, LT.RIM_P) * (0.4 + 0.6 * back);
      for (var k = 0; k < 3; k++) out[o + k] = LT.GAIN * LT.PAPER[k] * (C.SUN_K * sc[k] * (direct + through + rim) + ad[k] + (au[k] - ad[k]) * wsky + bnc * cl[k]);
    }
    function light(kind, N, eye, L, out, area) {
      var nf = KIND[kind].facets.length, f, sd = L.sunDir, sv = L.sunVis === undefined ? 1 : L.sunVis, sc = L.sunC, au = L.ambU, ad = L.ambD, cl = L.clLit;
      var seaLit = Math.min(1, Math.max(0, (0.2126 * ad[0] + 0.7152 * ad[1] + 0.0722 * ad[2]) / Math.max(1e-4, 0.2126 * cl[0] + 0.7152 * cl[1] + 0.0722 * cl[2])));
      var back = Math.max(0, -(eye[0] * sd[0] + eye[1] * sd[1] + eye[2] * sd[2])), ma = 0;
      ONE[0] = ONE[1] = ONE[2] = 0;
      for (f = 0; f < nf; f++) {
        var nx = N[3 * f], ny = N[3 * f + 1], nz = N[3 * f + 2], ne = nx * eye[0] + ny * eye[1] + nz * eye[2];
        if (ne < 0) { nx = -nx; ny = -ny; nz = -nz; ne = -ne; }
        lit1(LT.ONE, nx, ny, nz, ne, sd, sv, sc, au, ad, cl, seaLit, back, out, 3 * f);
        var a = area ? area[f] : 1; ONE[0] += out[3 * f] * a; ONE[1] += out[3 * f + 1] * a; ONE[2] += out[3 * f + 2] * a; ma += a;
        lit1(LT, nx, ny, nz, ne, sd, sv, sc, au, ad, cl, seaLit, back, out, 3 * f);
      }
      if (ma > 0) { ONE[0] /= ma; ONE[1] /= ma; ONE[2] /= ma; }
      return ONE;
    }
    function lodK(spanPx) { var x = Math.min(1, Math.max(0, (spanPx - LT.LOD[0]) / (LT.LOD[1] - LT.LOD[0]))); return x * x * (3 - 2 * x); }

    /* A STAND-IN BEAT with the wing's flex, for the form's turntables (the motion designer's beat drives the rig in the
       build): the arm sweeps its stroke; the hand lags it (HAND_LAG of a beat) and straightens on the downstroke; on the
       upstroke the wrist folds (ext down, the hand swept back and drooped) and opens again at the top; the pleats lag
       the hand (TIP_LAG more), curl up under the downstroke's load and trail on the upstroke; the trailing edge twists
       (the hand pronated on the downstroke, supinated on the upstroke). ph: 0 the top of the stroke. */
    var FB = { DOWN: 0.55, HAND_LAG: 0.09, TIP_LAG: 0.07, AMP: 30, EXT_UP: 0.84, HSWP_UP: -16, HDROOP_UP: -14, CURL: 12, TLAG: 10, PRON: 7, SUP: 9 };
    function fr(x) { x = x % 1; return x < 0 ? x + 1 : x; }
    function strokeS(ph) { ph = fr(ph); return ph < FB.DOWN ? Math.cos(Math.PI * ph / FB.DOWN) : -Math.cos(Math.PI * (ph - FB.DOWN) / (1 - FB.DOWN)); }   // +1 top, -1 bottom
    function upW(ph) { ph = fr(ph); if (ph < FB.DOWN) return 0; var s = Math.sin(Math.PI * (ph - FB.DOWN) / (1 - FB.DOWN)); return s * s; }
    function downW(ph) { ph = fr(ph); if (ph >= FB.DOWN) return 0; var s = Math.sin(Math.PI * ph / FB.DOWN); return s * s; }
    function flexBeat(kind, ph, o) {
      var K = KIND[kind], g = K.glide, tg = K.tipg;
      var s = strokeS(ph), sh = strokeS(ph - FB.HAND_LAG), st = strokeS(ph - FB.HAND_LAG - FB.TIP_LAG);
      var uw = upW(ph - 0.5 * FB.HAND_LAG), dw = downW(ph - FB.HAND_LAG), uwt = upW(ph - FB.HAND_LAG - FB.TIP_LAG), dwt = downW(ph - FB.HAND_LAG - FB.TIP_LAG);
      for (var side = 0; side < 2; side++) {
        var b = side * NP;
        o[b] = g[0] + 4 + FB.AMP * s;                          // the arm's stroke about a little over its glide
        o[b + 1] = g[1] + 6 * dw - 4 * uw;                     // forward on the downstroke, back on the upstroke
        o[b + 2] = g[2] - FB.PRON * dw + FB.SUP * uw;          // pronated down, supinated up
        o[b + 3] = 1 - (1 - FB.EXT_UP) * uw;                   // the wrist drawn in on the upstroke
        o[b + 4] = g[4] + 18 * (1 - 0.5 * (1 + sh)) * (1 - uw) + FB.HDROOP_UP * uw + 10 * (sh - s);   // the hand lags the arm, opens on the downstroke, droops folded on the upstroke
        o[b + 5] = g[5] + FB.HSWP_UP * uw;                     // swept back on the upstroke
        o[b + 6] = g[6] - 1.5 * FB.PRON * dw + 1.5 * FB.SUP * uw;   // the hand's twist the larger
        o[b + 7] = tg[0] + FB.CURL * dwt - 0.5 * FB.CURL * uwt + 8 * (st - sh);   // the pleats curl up under load, lag the hand
        o[b + 8] = tg[1] - FB.TLAG * uwt - 3 * dwt;            // trail (swept back) on the upstroke
        o[b + 9] = tg[2] - 0.8 * FB.PRON * dwt + 1.2 * FB.SUP * uwt;
        o[b + 10] = tg[3] + 4 * uwt;                           // fanned a little on the upstroke (slots open)
      }
      return o;
    }
    function bob(ph) { return 0.03 * 0.5 * (1 - strokeS(ph - 0.1)); }
    return { pose: pose, glide: glide, from14: from14, from20: from20, mix: mix, verts: verts, facetNormals: facetNormals, paper16: paper16, chain: chain,
             bones: bonesOf, light: light, lodK: lodK, LT: LT, flexBeat: flexBeat, FB: FB, bob: bob, kinds: KIND, NP: NP };
  }
  root.FACETPOSE = FACETPOSE;
  if (typeof module !== 'undefined' && module.exports) module.exports = FACETPOSE;
})(typeof self !== 'undefined' ? self : this);
