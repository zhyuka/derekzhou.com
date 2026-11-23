/* solve.js (physics/model): solve the rig's angles on the faceted M so that the POSED form, measured the way the
   source measured its birds, shows the measured observables at every phase; fit each rig angle with a harmonic (cosine and sine) series
   and write them into the model (kinds[k].rig).
     node solve.js <the wing model's folder: src/birds/model> <model.json in> <model.json out>   (tools/birds/model/make.py runs it)

   Two observable sets, as the sources defined them:
   'front' (gull, geese, swan, stork, heron, ibis; NTRS 20040075526 traced birds filmed head-on):
       the arm's front-view angle (root -> wrist line, y-z plane: psi1), the hand's front-view angle less the arm's
       (wrist -> tip: -psi2), the front-projected arc length root-wrist-knuckle-tip over its greatest (the extension);
       and the arm section's and the outer (knuckle) section's chord pitch in the body frame (the barnacle goose's
       measure: cycle means kept, the oscillation the model's).
       Unknowns: arm dih, hand dih, arm twi, hand twi by the tangent (derivative) iteration; the hand's sweep nested (bisection on the back branch
       for the extension). Geese and swans: no extension (they do not fold): the sweep stays the lag channel's.
   'mocap' (crow, swallow, finch: the pigeon's motion-capture definitions, doi:10.3390/biomimetics9090555):
       the shoulder-wrist line's 3D elevation above the horizontal plane, the wrist-tip line's less it, and the tip's
       lateral reach (|y|) over its greatest; the reach's shape the pigeon's measured semi-span, its depth solved so the
       tip's reach at mid-upstroke over mid-downstroke is the kind's measured span ratio. Pitch: the plain mapping. */
'use strict';
var fs = require('fs'), path = require('path');
var SITE = process.argv[2], IN = process.argv[3], OUTF = process.argv[4];
global.self = global;
require(path.join(SITE, 'facetform.js'));
var FACETPOSE = require(path.join(SITE, 'facetpose.js'));
var WINGMODEL = require(path.join(SITE, 'wingmodel.js'));
var MODEL = JSON.parse(fs.readFileSync(IN, 'utf8'));
Object.keys(MODEL.kinds).forEach(function (k) { delete MODEL.kinds[k].rig; });
var P = FACETPOSE(self.FACETFORM), W = WINGMODEL(MODEL, P);
var TAU = Math.PI * 2, R2D = 180 / Math.PI, NPH = 180;
function ser(c, p) { var y = c.a0; for (var k = 0; k < c.a.length; k++) y += c.a[k] * Math.cos(TAU * (k + 1) * p) + c.b[k] * Math.sin(TAU * (k + 1) * p); return y; }
var V = new Float64Array(192), BN = new Float64Array(156);
function obsFront(kind, pose, out) {
  P.verts(kind, pose, V); P.bones(kind, pose, BN);
  var psi1 = Math.atan2(V[14] - V[2], V[13] - V[1]) * R2D, psih = Math.atan2(V[50] - V[14], V[49] - V[13]) * R2D;
  out[0] = psi1; out[1] = psih - psi1;
  out[2] = Math.hypot(V[13] - V[1], V[14] - V[2]) + Math.hypot(V[25] - V[13], V[26] - V[14]) + Math.hypot(V[49] - V[25], V[50] - V[26]);
  out[3] = Math.atan2(BN[12 + 6], BN[12]) * R2D;
  out[4] = Math.atan2(V[26] - V[32], V[24] - V[30]) * R2D;
  return out;
}
function elev(dx, dy, dz) { return Math.atan2(dz, Math.hypot(dx, dy)) * R2D; }
function obsMocap(kind, pose, out) {
  P.verts(kind, pose, V);
  var a = elev(V[12] - V[0], V[13] - V[1], V[14] - V[2]), h = elev(V[48] - V[12], V[49] - V[13], V[50] - V[14]);
  out[0] = a; out[1] = h - a; out[2] = Math.abs(V[49]); out[3] = 0; out[4] = 0;
  return out;
}
function fitF(y, maxN, tol) {
  var n = y.length, best = null;
  for (var N = 1; N <= maxN; N++) {
    var c = { a0: 0, a: [], b: [] }, i, k;
    for (i = 0; i < n; i++) c.a0 += y[i] / n;
    for (k = 1; k <= N; k++) { var a = 0, b = 0; for (i = 0; i < n; i++) { a += 2 * y[i] * Math.cos(TAU * k * i / n) / n; b += 2 * y[i] * Math.sin(TAU * k * i / n) / n; } c.a.push(a); c.b.push(b); }
    var r = 0; for (i = 0; i < n; i++) { var d = ser(c, i / n) - y[i]; r += d * d; } r = Math.sqrt(r / n);
    c.N = N; c.rms_fit = r; best = c;
    if (r <= tol) break;
  }
  best.a0 = +best.a0.toFixed(4); best.a = best.a.map(function (x) { return +x.toFixed(4); }); best.b = best.b.map(function (x) { return +x.toFixed(4); }); best.rms_fit = +best.rms_fit.toFixed(4);
  return best;
}
var RIGN = W.RIGN;
Object.keys(MODEL.kinds).forEach(function (kind) {
  if (!P.kinds[kind]) return;
  var mk = MODEL.kinds[kind], ch = mk.channels, NP = P.NP, F = P.kinds[kind], G5 = F.glide[5];
  var mocap = false, deepen = !!(mk.meta && mk.meta.span_ratio_target), obs = obsFront;
  var pose = P.pose(), o = new Float64Array(5), o2 = new Float64Array(5), i, j, EK = 1;
  function spanRatio(rows) {   // the tip's lateral reach at mid-upstroke over mid-downstroke (as doi:10.1242/jeb.199.2.263 and doi:10.1242/jeb.204.15.2741 measured)
    var D = mk.D, iu = Math.round((D + (1 - D) / 2) * NPH) % NPH, id = Math.round(D / 2 * NPH) % NPH, q = P.pose();
    function reach(r) { for (var t = 0; t < NP; t++) { q[t] = r[t]; q[NP + t] = r[t]; } P.verts(kind, q, V); return Math.abs(V[49]); }
    return reach(rows[iu]) / reach(rows[id]);
  }
  if (deepen) {   // crow, swallow, finch: the plain mapping; the fold's depth (the arm's shortening, the hand's sweep at the
                  // deepest) solved on the form for the measured wrist-span and span ratios (mid-upstroke over mid-downstroke)
    var Dk = mk.D, q0 = P.pose(), tW = mk.meta.wristspan_ratio_target[1], tS = mk.meta.span_ratio_target[1];
    mk.meta.fold_depth_rule = 'the deepest fold\'s lateral reach over the spread reach = the measured ratio (tip: span; wrist: wrist span)';
    function ratio(vi) {   // the deepest fold's lateral reach over the spread's (timing-free: the pigeon's timing, the kind's depth)
      var W2 = WINGMODEL(MODEL, P), mn = 1e9, mx = 0; for (var t = 0; t < 120; t++) { W2.flap(kind, t / 120, null, q0, null); P.verts(kind, q0, V); var u = Math.abs(V[vi]); mn = Math.min(mn, u); mx = Math.max(mx, u); } return mn / mx; }
    if (mk.meta.tip_stroke_target_deg) {   // the swallow: the hand's swing scaled on the form so the shoulder-tip line sweeps the measured 99 deg
      var hb = ch.hand_bend, a0b = hb.a.slice(), b0b = hb.b.slice(), flo = 0.2, fhi = 2.0, tp = 0;
      var tipPP = function () { var W2 = WINGMODEL(MODEL, P), mn = 1e9, mx = -1e9; for (var t = 0; t < 120; t++) { W2.flap(kind, t / 120, null, q0, null); P.verts(kind, q0, V); var e = Math.atan2(V[50], Math.hypot(V[48], V[49])) * R2D; mn = Math.min(mn, e); mx = Math.max(mx, e); } return mx - mn; };
      mk.meta.fold_sweep_deg = 0; mk.meta.fold_ext = 0;
      for (var g0 = 0; g0 < 25; g0++) { var fh = 0.5 * (flo + fhi); hb.a = a0b.map(function (x) { return x * fh; }); hb.b = b0b.map(function (x) { return x * fh; }); tp = tipPP(); if (tp > mk.meta.tip_stroke_target_deg) fhi = fh; else flo = fh; }
      mk.meta.hand_swing_scale_form = +(0.5 * (flo + fhi)).toFixed(4); mk.meta.tip_stroke_solved_deg = +tp.toFixed(1);
      console.log(kind, 'hand swing x', mk.meta.hand_swing_scale_form, 'on the form -> tip stroke', tp.toFixed(1));
    }
    mk.meta.fold_sweep_deg = 0; var lo = 0, hi = 0.75, rw = 0;
    for (var g = 0; g < 30; g++) { mk.meta.fold_ext = 0.5 * (lo + hi); rw = ratio(13); if (rw > tW) lo = mk.meta.fold_ext; else hi = mk.meta.fold_ext; }
    lo = 0; hi = 115; var rs = 0;
    for (g = 0; g < 30; g++) { mk.meta.fold_sweep_deg = 0.5 * (lo + hi); rs = ratio(49); if (rs > tS) lo = mk.meta.fold_sweep_deg; else hi = mk.meta.fold_sweep_deg; }
    mk.meta.fold_ext = +mk.meta.fold_ext.toFixed(4); mk.meta.fold_sweep_deg = +mk.meta.fold_sweep_deg.toFixed(2);
    mk.meta.wristspan_ratio_solved = +rw.toFixed(4); mk.meta.span_ratio_solved = +rs.toFixed(4);
    console.log(kind, 'plain mapping; arm shortening at the deepest', mk.meta.fold_ext, '-> wrist span', rw.toFixed(3), '(', tW, '); hand sweep at the deepest', mk.meta.fold_sweep_deg, '-> span', rs.toFixed(3), '(', tS, ')');
    return;
  }
  var extT = mocap ? ch.semispan_target : ch.ext_target, solveSwp = !!extT;
  var UA = mocap ? [0, 4] : [0, 4, 2, 6], TI = mocap ? [0, 1] : [0, 1, 3, 4];
  var mA = 0, mH = 0;
  for (i = 0; i < NPH; i++) { W.flap(kind, i / NPH, null, pose, null); obs(kind, pose, o); mA += o[3] / NPH; mH += o[4] / NPH; }
  function setSwp(v) { pose[5] = v; pose[NP + 5] = v; }
  function lenAt(v) { setSwp(v); return obs(kind, pose, o2)[2]; }
  function fitSwp(Lt) {   // the hand's sweep on the back branch for a target extension or reach
    var hi = G5, lo = G5 - 120;
    if (lenAt(hi) <= Lt) { setSwp(hi); return; }
    for (var b = 0; b < 40; b++) { var mid = 0.5 * (lo + hi); if (lenAt(mid) > Lt) hi = mid; else lo = mid; }
    setSwp(0.5 * (lo + hi));
  }
  function target(ph, Lmax, EK) {
    var e = solveSwp ? ser(extT, ph) : 1; if (EK !== 1) e = Math.max(0.12, 1 - EK * (1 - e));
    return [ser(ch.arm_elev, ph), ser(ch.hand_bend, ph), e * Lmax, mA + ser(ch.pitch_arm, ph), mH + ser(ch.pitch_hand, ph)];
  }
  function pass(Lmax, EK, rows, L0s) {
    var prev = null, worst = 0;
    for (i = 0; i < NPH; i++) {
      var ph = i / NPH;
      W.flap(kind, ph, { plain: true }, pose, null);
      if (EK !== 1) { var ex = Math.max(0.3, 1 - EK * (1 - pose[3])); pose[3] = ex; pose[NP + 3] = ex; }   // the arm shortens with the deeper fold
      if (prev) for (j = 0; j < UA.length; j++) { pose[UA[j]] = prev[j]; pose[NP + UA[j]] = prev[j]; }
      var T = target(ph, Lmax, EK);
      var resid = function (out) { if (solveSwp) fitSwp(T[2]); obs(kind, pose, o2); for (var q = 0; q < TI.length; q++) out[q] = o2[TI[q]] - T[TI[q]]; return out; };
      var n = UA.length, r0 = new Float64Array(n), r1 = new Float64Array(n), Jm = [], it, err = 0;
      for (it = 0; it < 40; it++) {
        resid(r0); err = 0; for (j = 0; j < n; j++) err = Math.max(err, Math.abs(r0[j]));
        if (err < 1e-3) break;
        for (j = 0; j < n; j++) {
          var h = 0.05, sv = pose[UA[j]]; pose[UA[j]] = sv + h; pose[NP + UA[j]] = sv + h; resid(r1); pose[UA[j]] = sv; pose[NP + UA[j]] = sv;
          Jm[j] = []; for (var q = 0; q < n; q++) Jm[j][q] = (r1[q] - r0[q]) / h;
        }
        var A = [], q2, c2;
        for (q2 = 0; q2 < n; q2++) { A[q2] = []; for (c2 = 0; c2 < n; c2++) A[q2][c2] = Jm[c2][q2]; A[q2][n] = -r0[q2]; }
        for (c2 = 0; c2 < n; c2++) { var pv = c2; for (q2 = c2 + 1; q2 < n; q2++) if (Math.abs(A[q2][c2]) > Math.abs(A[pv][c2])) pv = q2; var tmp = A[c2]; A[c2] = A[pv]; A[pv] = tmp;
          for (q2 = c2 + 1; q2 < n; q2++) { var f = A[q2][c2] / A[c2][c2]; for (var c3 = c2; c3 <= n; c3++) A[q2][c3] -= f * A[c2][c3]; } }
        var dx = new Float64Array(n); for (q2 = n - 1; q2 >= 0; q2--) { var sum = A[q2][n]; for (c2 = q2 + 1; c2 < n; c2++) sum -= A[q2][c2] * dx[c2]; dx[q2] = sum / A[q2][q2]; }
        for (j = 0; j < n; j++) { var st = Math.max(-8, Math.min(8, dx[j])); pose[UA[j]] += st; pose[NP + UA[j]] += st; }
      }
      resid(r0);
      if (L0s) { var keep = pose[5]; L0s.push(lenAt(G5)); setSwp(keep); }
      var eext = solveSwp ? Math.abs(obs(kind, pose, o2)[2] - T[2]) / Lmax : 0;
      worst = Math.max(worst, err, 100 * eext);
      if (process.env.DBG === kind && (i % 15 === 0 || err > 0.5)) console.log(kind, i, ph.toFixed(3), 'err', err.toFixed(3), 'ext err', eext.toFixed(4), 'T', T.map(function (x) { return x.toFixed(2); }).join(','), 'u', [0, 4, 5, 2, 6].map(function (u) { return pose[u].toFixed(1); }).join(','));
      prev = []; for (j = 0; j < n; j++) prev.push(pose[UA[j]]);
      rows.push(Array.prototype.slice.call(pose, 0, NP));
    }
    return worst;
  }
  /* pass 1 finds the greatest extension (or reach) the unswept wing shows; pass 2 solves against it */
  var rows = [], L0s = [], Lmax = 1, worst;
  worst = pass(solveSwp ? 1e9 : 1, 1, rows, L0s);
  if (solveSwp) {
    Lmax = Math.max.apply(null, L0s);
    if (deepen) {
      var tgt = mk.meta.span_ratio_target[1], lo = 0.3, hi = 3.2, sr = 0; if (process.env.NOEK) { lo = hi = 1; }
      for (var bb = 0; bb < (process.env.NOEK ? 1 : 18); bb++) { EK = 0.5 * (lo + hi); rows = []; worst = pass(Lmax, EK, rows, null); sr = spanRatio(rows); if (sr > tgt) lo = EK; else hi = EK; }
      mk.meta.fold_depth_solved = +EK.toFixed(4); mk.meta.span_ratio_solved = +sr.toFixed(4);
      console.log(kind, 'fold depth x', EK.toFixed(3), 'span ratio', sr.toFixed(3), 'target', tgt);
    } else { rows = []; worst = pass(Lmax, 1, rows, null); }
  }
  var UN = solveSwp ? UA.slice(0, 2).concat([5], UA.slice(2)) : UA;
  var rig = { about: 'the rig\'s left-side angles (the right mirrors them) solved on this kind\'s faceted form so the posed bird shows the measured observables (tools/solve.js); facetpose pose layout', observables: mocap ? 'mocap (3D elevations, tip lateral reach)' : 'front (front-view angles, front-projected extension) + section pitch',
              solved: UN.map(function (u) { return RIGN[u]; }), worst_residual: +worst.toFixed(4), fold_depth: EK, channels: {} };
  for (j = 0; j < NP; j++) rig.channels[RIGN[j]] = fitF(rows.map(function (r) { return r[j]; }), 12, j === 3 ? 0.001 : 0.15);
  mk.rig = rig;
  console.log(kind, 'solved', rig.solved.join(','), 'worst residual', worst.toFixed(4), 'harmonics', RIGN.map(function (n) { return n + ':' + rig.channels[n].N; }).join(' '));
});
fs.writeFileSync(OUTF, JSON.stringify(MODEL, null, 1));
