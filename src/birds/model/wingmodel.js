// wingmodel.js, the ink birds' wing model (src/birds/model/, served as written). Written by hand. Its comments keep the
// tags and file names of the development record it came from (rounds, labs, judges), outside this repository.
/* wingmodel.js (physics/model): the measured wingbeat (MODEL.md) driving the faceted M's rig (facetpose.js).
   No DOM, no clock, no entropy; allocation-free per call.

     var W = WINGMODEL(MODEL, FACETPOSE(FACETFORM));     MODEL: data/model.json (the per-kind harmonic channels)
     W.anatomy(kind, ph, o, A)     the anatomical channels at phase ph (A: Float64Array(W.NA), indices W.IX)
     W.flap(kind, ph, o, pose, body)  the rig's 22 floats (symmetric) and the body's offset (body[0] surge, body[2]
                                   heave, spans) at phase ph; o: { k: the beat's amplitude (1), D: this beat's downstroke
                                   share (the kind's measured D), curl: deg (CURL), twt: deg (TWT) } or null
     W.mean(kind, pose)            the flapping pose's mean over a beat (what a burst swings about)
     W.rate(kind, spanM)           the beat frequency (Hz) of this kind drawn at spanM metres (dynamic similarity:
                                   f = f_real (b_real / b)^(1/2), doi:10.1242/jeb.204.19.3283 eq. 2 at constant shape)
     W.kinds                       the model's kinds

   PHASE ph in cycles: 0 = the top of the arm's stroke (its elevation's maximum), the downstroke the first D.
   TWO PATHS to the rig's 22 floats (MODEL.md 4):
   (1) the SOLVED rig (gull, goose, stork, heron, ibis: model.kinds[k].rig): each of the 11 per-side angles a harmonic (cosine and sine)
       series solved on that kind's faceted form (tools/solve.js) so the posed bird, measured as the source measured
       its birds, shows the measured curves: the arm's and the hand's front-view angles, the wing's front-projected
       extension, the arm's and the outer section's pitch. The fast path: 11 series, about 30 cos/sin a bird.
   (2) the PLAIN mapping (crow, swallow, finch; o.plain forces it anywhere), per side, onto the glide's set G (the
       tattoo's M) and its tip set TG:
     arm dih  = arm_elev(ph)                       (the shoulder-wrist line above the horizontal)
     arm swp  = G1 + arm_sweep(ph)
     arm twi  = G2 + pitch_arm(ph)
     ext      = ext(ph); small birds 1 - fold_ext fold_coord_wrist(ph)
     hand dih = hand_bend(ph)                      (relative to the arm's line)
     hand swp = G5 + hand_fold_sweep(ph) + hand_lag(ph); small birds G5 - fold_sweep_deg fold_coord(ph)
     hand twi = G6 + pitch_hand(ph) - pitch_arm(ph)
     tip dih  = TG0 + CURL tip_load(ph)            (the primaries bend up under the downstroke's load, down 1/2.2 of it)
     tip swp  = TG1                                (P10 turns with the carpometacarpus: the gull's markers)
     tip twi  = TG2 - TWT tip_load(ph)             (washout under load)
     spread   = TG3 + fan_change(ph)               (the fan closes with the wrist: the trailing pleats come forward)
   (the solved rig's tip angles are these same rules). Oscillations scale by o.k about each angle's mean. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var CH = ['arm_elev', 'arm_sweep', 'pitch_arm', 'ext', 'hand_bend', 'hand_fold_sweep', 'hand_lag', 'pitch_hand', 'tip_load', 'fan_change', 'heave', 'surge', 'elbow', 'wrist', 'fold_coord', 'fold_coord_wrist'];
  var IX = {}; for (var i = 0; i < CH.length; i++) IX[CH[i]] = i;
  var CURL = 8, TWT = 3;
  var RIGN = ['arm_dih', 'arm_swp', 'arm_twi', 'ext', 'hand_dih', 'hand_swp', 'hand_twi', 'tip_dih', 'tip_swp', 'tip_twi', 'tip_spread'];
  function WINGMODEL(MODEL, P) {
    var KM = MODEL.kinds, K = {}, kind;
    for (kind in KM) {
      var m = KM[kind], c = m.channels, ks = { D: m.D, real: m.real, a0: new Float64Array(CH.length), A: [], B: [], N: new Int32Array(CH.length), mean: null };
      for (i = 0; i < CH.length; i++) {
        var s = c[CH[i]];
        if (!s) { ks.a0[i] = CH[i] === 'ext' ? 1 : 0; ks.A.push(new Float64Array(0)); ks.B.push(new Float64Array(0)); continue; }
        ks.a0[i] = s.a0; ks.A.push(Float64Array.from(s.a)); ks.B.push(Float64Array.from(s.b)); ks.N[i] = s.a.length;
      }
      ks.small = !!c.fold_coord; ks.foldS = m.meta && m.meta.fold_sweep_deg || 0; ks.foldX = m.meta && m.meta.fold_ext || 0;
      if (m.rig) {   // the rig's angles solved on this kind's form (tools/solve.js): the fast, exact path
        ks.rig = { a0: new Float64Array(RIGN.length), A: [], B: [] };
        for (i = 0; i < RIGN.length; i++) { var r = m.rig.channels[RIGN[i]]; ks.rig.a0[i] = r.a0; ks.rig.A.push(Float64Array.from(r.a)); ks.rig.B.push(Float64Array.from(r.b)); }
      }
      K[kind] = ks;
    }
    function fr(x) { return x - Math.floor(x); }
    /* the phase of this beat in the source's phase: a smooth, monotone warp that moves the bottom from D to the
       kind's measured share (frequency changes are made in the upstroke: doi:10.1371/journal.pbio.3000299) */
    function warp(ph, D, Ds) {
      ph = fr(ph); if (!D || Math.abs(D - Ds) < 1e-6) return ph;
      var s = Math.sin(Math.PI * D), w = Math.sin(Math.PI * ph);
      return fr(ph + (Ds - D) * w * w / (s * s));
    }
    function ev(ks, i, ph, k) {
      var A = ks.A[i], B = ks.B[i], n = A.length, y = 0, c1 = Math.cos(TAU * ph), s1 = Math.sin(TAU * ph), c = c1, s = s1, t;
      for (var j = 0; j < n; j++) { y += A[j] * c + B[j] * s; t = c * c1 - s * s1; s = s * c1 + c * s1; c = t; }
      return ks.a0[i] + k * y;
    }
    var NA = CH.length;
    function anatomy(kind, ph, o, out) {
      var ks = K[kind], k = o && o.k !== undefined ? o.k : 1, p = warp(ph, o && o.D, ks.D);
      for (var i = 0; i < NA; i++) out[i] = ev(ks, i, p, k);
      return out;
    }
    var AN = new Float64Array(NA);
    function flap(kind, ph, o, pose, body) {
      var F = P.kinds[kind], G = F.glide, TG = F.tipg, ks = K[kind], curl = o && o.curl !== undefined ? o.curl : CURL, twt = o && o.twt !== undefined ? o.twt : TWT;
      var k = o && o.k !== undefined ? o.k : 1;
      if (ks.rig && !(o && o.plain)) {   // the solved rig angles (the posed form shows the measured observables)
        var p = warp(ph, o && o.D, ks.D), R = ks.rig;
        for (var sd2 = 0; sd2 < 2; sd2++) for (var j = 0; j < 11; j++) {
          var A = R.A[j], B = R.B[j], y = 0, c1 = Math.cos(TAU * p), s1 = Math.sin(TAU * p), c = c1, s = s1, t;
          for (var q = 0; q < A.length; q++) { y += A[q] * c + B[q] * s; t = c * c1 - s * s1; s = s * c1 + c * s1; c = t; }
          pose[sd2 * P.NP + j] = R.a0[j] + k * y;
        }
        pose[3] = Math.min(1, pose[3]); pose[P.NP + 3] = pose[3];
        if (body) { body[0] = ev(ks, IX.surge, p, k); body[1] = 0; body[2] = ev(ks, IX.heave, p, k); }
        return pose;
      }
      anatomy(kind, ph, o, AN);
      var ext = ks.small ? 1 - ks.foldX * AN[IX.fold_coord_wrist] : AN[IX.ext]; if (k !== 1) ext = 1 - k * (1 - ext);   // (the fold scales toward the spread wing)
      var hfold = ks.small ? -ks.foldS * AN[IX.fold_coord] : AN[IX.hand_fold_sweep];   // (small birds: the measured fold timing, the solved depth)
      for (var sd = 0; sd < 2; sd++) {
        var b = sd * P.NP;
        pose[b] = AN[IX.arm_elev];
        pose[b + 1] = G[1] + AN[IX.arm_sweep];
        pose[b + 2] = G[2] + AN[IX.pitch_arm];
        pose[b + 3] = Math.max(0.3, Math.min(1, ext));
        pose[b + 4] = AN[IX.hand_bend];
        pose[b + 5] = G[5] + hfold + AN[IX.hand_lag];
        pose[b + 6] = G[6] + AN[IX.pitch_hand] - AN[IX.pitch_arm];
        pose[b + 7] = TG[0] + curl * AN[IX.tip_load];
        pose[b + 8] = TG[1];
        pose[b + 9] = TG[2] - twt * AN[IX.tip_load];
        pose[b + 10] = TG[3] + AN[IX.fan_change];
      }
      if (body) { body[0] = AN[IX.surge]; body[1] = 0; body[2] = AN[IX.heave]; }
      return pose;
    }
    function mean(kind, out) {
      var ks = K[kind];
      if (!ks.mean) {
        var m = new Float64Array(2 * P.NP), t = new Float64Array(2 * P.NP), n = 360, i, j;
        for (i = 0; i < n; i++) { flap(kind, i / n, null, t, null); for (j = 0; j < m.length; j++) m[j] += t[j] / n; }
        ks.mean = m;
      }
      for (var q = 0; q < ks.mean.length; q++) out[q] = ks.mean[q];
      return out;
    }
    function rate(kind, spanM) { var r = K[kind].real; return spanM ? r.f * Math.sqrt(r.b / spanM) : r.f; }
    return { RIGN: RIGN, anatomy: anatomy, flap: flap, mean: mean, rate: rate, warp: warp, kinds: K, IX: IX, NA: NA, CH: CH, consts: { CURL: CURL, TWT: TWT } };
  }
  root.WINGMODEL = WINGMODEL;
  if (typeof module !== 'undefined' && module.exports) module.exports = WINGMODEL;
})(typeof self !== 'undefined' ? self : this);
