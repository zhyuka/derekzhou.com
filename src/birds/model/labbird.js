// labbird.js, the ink birds' wing model (src/birds/model/, served as written). Written by hand. Its comments keep the
// tags and file names of the development record it came from (rounds, labs, judges), outside this repository.
/* labbird.js (physics/lab): the measured wingbeat (../model, MODEL.md) flying the faceted M (majestic/form: facetform
   6896d8a3, facetpose d463285f) through a skeleton rig, with the measured flap-gliding and variation. The same module
   poses the bird the lab draws (lab.js) and the bird the checks measure (tools/measure.js): one geometry.
   No DOM, no clock, no entropy: a seed in, pure functions of time out (each bird's day on the wing is integrated once,
   at a fixed step, when it is made).

     var LB = LABBIRD(FACETFORM, FACETPOSE, WINGMODEL, MODEL_DATA)
     LB.bird(seed, kind, o)        a bird of this round: its rate (o.rate 'scaled' | 'real'; o.spread in [-1, 1] its
                                   place in the flight's +-3 %), its schedule (o.sched 'measured' | 'continuous' |
                                   'calm'), its beat-to-beat variation, o.lead (a bird ahead) + o.lock { d, U } (an ibis
                                   in a V: the spatial-phase rule in wake bouts), o.from, o.to (s), o.dt
     LB.state(b, t, S)             S: { flap, ph (0 the top of the stroke), k, D, a, e, beat, pause, tuck }
     LB.pose(b, t, pose22, body)   the rig's 22 floats (facetpose layout) and the body (surge, 0, heave; spans); returns S
     LB.cycle(kind, ph, o, pose22, body)   the pure beat at phase ph (no schedule): for the checks
     LB.geom(kind, pose22, body, out, beat)  every vertex (body frame, spans) with the body's heave, surge and pitch and
                                   this round's feather shares (beat 'this'); 'last' / 'shape' keep the form's shares
     LB.flexOf(kind, pose22, out), LB.bodyOn(nv, body, out)  the two halves of geom's 'this' beat (the flexing form; then
                                      the body's heave, surge and bank on it, in place): a held pose's form kept
     LB.skeleton(kind, pose22, body, out)  the skeleton in the posed form, per side (left then right): shoulder, elbow,
                                   wrist, the hand bones' end (the knuckle), the primaries' tip: 5 x 3 x 2 = 30 floats
     LB.elbowExt(kind, E)          the arm's length (shoulder-wrist, a share of its spread length) at elbow angle E
     LB.rate(kind, mode)           Hz

   THE RIG AS A SKELETON (MODEL.md 2, 3.3, 4.1): the shoulder (the arm's dihedral, sweep, twist: three of the rig's
   angles), the ELBOW (its interior angle E from the model's elbow channel sets the shoulder-wrist distance through the
   humerus and the ulna, d(E) = sqrt(h^2 + u^2 - 2 h u cos E), so ext = d(E) / d(E_spread): the fold is the elbow's
   doing), the wrist (the hand's bend, sweep and twist; its fold sweep solved on the form, MODEL.md 4.3), the hand
   bones (carpometacarpus and digit: the hand panel's leading edge to the knuckle), the primaries (the three pleats:
   curl and washout with the load, the fan with the wrist). The bones are the bird's own lengths (model.json skeleton)
   scaled to the form's arm (the tattoo's proportions). The body heaves and surges with the beat; its pitch is held
   at 0 (MODEL.md 3.6: not measured in cruising flight).

   THE FEATHER SHARES (MODEL.md 4.4.1): the three pleats' shares of the tip's curl and washout per kind: unslotted
   (gull, swallow) 1 / 0.95 / 0.9, one surface; slotted (goose, heron, ibis, finch) 1 / 0.8 / 0.6; deep slots (crow,
   stork) 1 / 0.7 / 0.45. facetpose.js reads FORM.primw at each call, so the lab writes the kind's shares into it before
   posing (facetpose.js itself unchanged, byte for byte). */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, DEG = Math.PI / 180;
  /* MODEL.md 3.9 (sources in CHECKS.md): flap bouts (beats) and glides (beat-lengths) as lognormal medians and sigmas */
  var SCHED = {
    goose:   { cont: true, src: 'continuous flapping, never gliding even in steep descents (doi:10.1126/science.1258732, facts)' },
    heron:   { cont: true, src: 'continuous flapping (doi:10.1242/jeb.204.19.3283, facts)' },
    swan:    { cont: true, src: 'continuous flapping (doi:10.1242/jeb.204.19.3283, facts)' },
    ibis:    { flap: [8, 0.35, 5, 12], glide: [2, 0.3, 1.5, 3], was: 'flap [13.6, 1.2, 3, 140], glide [3.2, 0.76, 1, 14] at 4 Hz (round 3, kinds: the same seconds, tighter, at the 2.5 Hz class)', src: 'flap bouts median 3.2-3.6 s (quartiles 1.6-8.3) at 3.9-4.1 Hz, glides 0.7-0.9 s (0.5-1.4): doi:10.1007/s10336-022-01978-1 (CC BY), in beats' },
    ibisV:   { flap: [95, 1.2, 20, 900], glide: [3.2, 0.76, 1, 14], src: 'in a V, 97% flapping (doi:10.1038/nature12939, facts); glides as doi:10.1007/s10336-022-01978-1' },
    /* FIX ROUND: the gull's and the stork's bouts FITTED to the CC0 tags' 3-s windows as the bio judge segmented them
       (pure flap / mixed / pure glide: gull 0.586 / 0.164 / 0.250, n 20,832; white stork 0.031 / 0.154 / 0.815, n 14,532),
       by the judge's renewal model on a finer grid (tools/boutfit2.py -> work/fix/boutfit2.txt); the stork's wing tucks
       removed (they were a steppe eagle's: doi:10.1098/rsif.2014.0645); the crow flaps on (doi:10.1242/jeb.204.19.3283 hooded crows);
       the swallow flaps on with the measured pauses (doi:10.1242/jeb.204.15.2741) (no bout data; the '18%' was not in the cited paper) */
    gull:    { flap: [30, 0.9, 3, 400], glide: [15, 0.9, 1, 200], src: 'bouts fitted to the CC0 lesser black-backed gull tags (doi:10.5281/zenodo.4963689): flap median 30 beats, glides 15 beat-lengths, lognormal sigma 0.9 -> windows 0.574 / 0.180 / 0.246 against 0.586 / 0.164 / 0.250; flapping share 0.67' },
    stork:   { flap: [6, 0.9, 2, 80], glide: [50, 0.9, 6, 600], src: 'bouts fitted to the CC0 white stork tags (doi:10.5441/001/1.78152p3q): flap median 6 beats, glides 50 beat-lengths, sigma 0.9 -> windows 0.040 / 0.152 / 0.808 against 0.031 / 0.154 / 0.815; flapping share 0.11' },
    crow:    { cont: true, src: 'continuous flapping (hooded crow, doi:10.1242/jeb.204.19.3283 Table 2: facts)' },
    swallow: { cont: true, pause: [0.5, 1.8, 6, 0.14, 0.06, 0.40], src: 'continuous flapping with upstroke pauses of 8-56 ms (about 20 at 10 m/s) in up to 61-69% of beats, runs of 1-3 (at most 6), wings held at mid-upstroke (doi:10.1242/jeb.204.15.2741, wind tunnel: facts); no measured flap-glide bouts' },
    finch:   { flap: [3, 0.3, 2, 5], glide: [2.4, 0.3, 1.5, 4], src: 'bounding (not a target kind: the last round\'s numbers)' }
  };
  /* the last round's glides (majestic/motion birdmotion.js KINDS: beats a burst, glide s): the 'calm' dial (MODEL.md 0, decision 2) */
  var CALM = { gull: [[2, 4], [3, 6.5]], goose: [[3, 6], [2.5, 5]], ibis: [[3, 6], [2.5, 6]], heron: [[3, 6], [2.5, 5.5]], crow: [[4, 8], [2, 4.5]], swallow: [[2, 4], [1.2, 3]], finch: [[2, 4], [0.28, 0.5]], stork: [[2, 3], [8, 16]] };
  var VAR = {
    PERIOD_CV: 0.03,   // beat to beat: gull 3% (5.8% raw less a 4.7% floor; CC0); all of it in the upstroke (doi:10.1371/journal.pbio.3000299)
    AMP_SD: 0.04,      // beat to beat amplitude: o.k +-5% (MODEL.md 3.11; heave p-p CV 10.7% an upper bound)
    BOUT_SD: 0.05,     // bout to bout, same bird: gull 7.5%, stork 4% (CC0)
    WANDER: 0.035,     // a continuous flapper's slow rate wander: sequence SD 2.4% (herring gull, doi:10.1242/jeb.204.19.3283), CV of 10-beat means 0.04-0.10 (doi:10.1098/rsif.2022.0168)
    SPREAD: 0.03       // bird to bird (FIX): gull 2.4% (between-bird SD of 16 birds' means, CC0, judge-bio), stork 2.4% (4 birds, CC0): a flight's birds spread evenly over +-3%, an SD of 2.0-2.2% for 5-7 birds, with each bout's own rate (BOUT_SD) about 2.4%
  };
  var RAMP = { A_IN: 0.4, A_OUT: 0.6, E_IN: 0.45, E_OUT: 0.75 };   // cycles: glide <-> flap (not measured: MODEL.md 3.9 keeps the last round's envelopes)
  var LOCK = { HOLD: [2, 1.03], FREE: [4.25, 1.03], GAIN: 0.6, MAXF: 0.15, PHASE: -0.18 };   // ibis V: in a wake 32% of the time, bouts median 2 s (IQR 1-4) (doi:10.1073/pnas.1413589112); spatial phase -0.18 (doi:10.1038/nature12939)
  var PRIMW = {   // MODEL.md 4.4.1: the pleats' shares of the curl and washout
    one: [1, 0.95, 0.9], slot: [1, 0.8, 0.6], deep: [1, 0.7, 0.45]
  };
  var PRIMK = { gull: 'one', swallow: 'one', goose: 'slot', heron: 'slot', ibis: 'slot', finch: 'slot', crow: 'deep', stork: 'deep' };
  /* FIX ROUND (the eye judge's M1: the hand never bent along its length, the primaries never bent, fanned or slotted, the
     glide froze). THE PRIMARIES AS FEATHERS: each of the three pleats is two segments, from the knuckle to a mid row and on
     to the tip, bent as a cantilever under a distributed load (deflection w(u) = theta_tip L u^2 (6 - 4u + u^2) / 4: the
     tapered shaft below: the inner chord flatter, the outer steeper, the tip's deflection the rig's own), so the hand
     arcs along its length; the tip's slope peaks at CURL_TIP 17 deg under the downstroke's load, -1/2.2 of it in the
     upstroke (the strain ratio of flying pigeons' primaries, doi:10.1242/jeb.201.22.3057), derived from that strain
     (judge-bio's beam check 7-25 deg): derived, with an assumed taper and depth; no in-flight measurement of these
     kinds exists. Where the kind's primaries are emarginated
     (Feather Atlas, ../structure 5.3: goose P10-P9 at 0.55-0.66, heron 0.66-0.68, ibis 0.71, crow 0.34-0.54, stork
     0.37-0.54) the mid row sits at the notch and each pleat's outer segment is its own finger: the fingers part into
     slots as their curl, washout and fan differ (doi:10.1242/jeb.180.1.285; doi:10.1098/rsif.2017.0099); gull and swallow (no notch)
     stay one surface. THE GLIDE carries the bird's weight, so its primaries hold the beat's mean load (tip_load a0 of
     the peak), and it TRIMS: the arm's dihedral and the bank wander as measured in a gull's level glide (stock
     footage "4K Free Stock Footage: Seagulls", https://archive.org/search?query=%224K+Free+Stock+Footage%3A+Seagulls%22, CC BY, study only: the research record's gull front-glide
     file, frames 50-120: bank SD 3.2 deg (range 12.7),
     the arms' front-view angle SD 5.6 deg (range 22, detrended), its power at 0.35-1.4 Hz of video time, left-right
     2.0 deg (the noise floor); the clip's time base 25 fps assumed real time), in beat time (x f_real / f). */
  /* [the mid row along the pleat (the notch), slotted, the open slot beyond the notch: the inner vane's notch depth plus
     the next feather's outer-vane narrowing, of the feather's width (Feather Atlas, digitised: ../structure 5.3: Canada
     goose 26 % + 21-27 %, great blue heron 21-24 % + none, white-faced ibis ~20 % + narrowed, raven 30-32 % + 18 %, wood
     stork 26-30 % + narrowed)] */
  var FLEXK = { gull: [0.5, 0, 0], swallow: [0.5, 0, 0], goose: [0.6, 1, 0.45], heron: [0.67, 1, 0.23], ibis: [0.7, 1, 0.4], finch: [0.5, 0, 0], crow: [0.45, 1, 0.45], stork: [0.45, 1, 0.5] };
  /* the feather as a TAPERED cantilever under an even load: the rachis' depth falling linearly to TAPER of its base's, its
     stiffness as the depth cubed (a hollow shaft), the moment (L - x)^2 / 2: curvature k(u) = k0 (1-u)^2 / (1-(1-TAPER)u)^3.
     The base strain measured in flying pigeons' primaries, peak -0.0033 at 2 cm from the calamus (doi:10.1242/jeb.201.22.3057,
     abstract), on an 18 cm primary of half-depth 1.5 mm there (../structure 6: 1-2 mm) gives the tip a slope of 17 deg
     (a uniform shaft 7.6, a taper to 0.5 12.4: tools/feather.py); the bend gathers toward the tip */
  var TAPER = 0.3, CURL_TIP = 17;
  var FW = (function () { var n = 2000, th = 0, w = [0], k, u, du = 1 / n; for (var i = 0; i < n; i++) { u = (i + 0.5) * du; k = (1 - u) * (1 - u) / Math.pow(1 - (1 - TAPER) * u, 3); var t1 = th + k * du; w.push(w[i] + 0.5 * (th + t1) * du); th = t1; } return { w: w, th: th, n: n }; })();
  var CURL_R = CURL_TIP * FW.w[FW.n] / FW.th;   // deg: the rigid pleat with the same tip deflection (the rig's tip dih at the peak load)
  var CH2 = [0, 0];
  function chords(e) { var i = Math.round(e * FW.n), we = FW.w[i], w1 = FW.w[FW.n]; CH2[0] = we / e / w1; CH2[1] = (w1 - we) / (1 - e) / w1; return CH2; }   // (one array, filled each call: read at once by the caller)   // (the inner and outer chords' slopes over the rigid pleat's)
  /* (round 3, kinds: the owner's word 2026-11-04) the beat-rate classes, Hz: one common slowing of the real rates, the
     real order kept (audit/KINDS.md 5.1); rate(kind, 'class') */
  var RATE_CLASS = { heron: 1.65, stork: 1.85, gull: 1.95, goose: 2.4, crow: 2.45, ibis: 2.5, swallow: 4.8 };
  var TRIM = { BANK: 3.2, SYM: 5.6, PER: [1.4, 2.9, 5.0] };   // deg SD; s (video time): 0.7, 0.35, 0.2 Hz
  function LABBIRD(FORM, FACETPOSE, WINGMODEL, MODEL) {
    var P = FACETPOSE(FORM), W = WINGMODEL(MODEL, P), KM = MODEL.kinds, WINGMODEL_CURL = W.consts.CURL;
    var PW0 = { curl: FORM.primw.curl.slice(), twist: FORM.primw.twist.slice() };
    function fr(x) { return x - Math.floor(x); }
    function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
    function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s + 0x9e3779b9) | 0; var z = s; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35); return ((z ^ (z >>> 16)) >>> 0) / 4294967296; }; }
    function gauss(r) { var u = 0; for (var i = 0; i < 6; i++) u += r(); return (u - 3) * Math.SQRT2; }   // (sd 1, bounded at +-4.2)
    function clip(x, a) { return x < -a ? -a : x > a ? a : x; }
    function logn(r, m) { var x = m[0] * Math.exp(m[1] * gauss(r)); return Math.min(m[3], Math.max(m[2], x)); }
    function rate(kind, mode) { var m = KM[kind]; return mode === 'real' ? m.real.f : mode === 'class' && RATE_CLASS[kind] ? RATE_CLASS[kind] : W.rate(kind, m.world_span_m || m.real.b); }

    /* ---- the skeleton (MODEL.md 3.1, 3.3): the bird's bones scaled to the form's arm ---- */
    var SK = {};
    function skel(kind) {
      if (SK[kind]) return SK[kind];
      var m = KM[kind], s = m.skeleton, L = m.linkage, F = P.kinds[kind], A = F.A;
      var Es = L.elbow_spread * DEG, d0 = Math.sqrt(s.humerus * s.humerus + s.ulna * s.ulna - 2 * s.humerus * s.ulna * Math.cos(Es));
      var k = (A - s.shoulder * 0.5) / (0.5 * d0);   // semi-span shares -> spans, the shoulder-wrist line made the form's arm
      return (SK[kind] = { sh: 0.5 * s.shoulder, h: 0.5 * s.humerus * k, u: 0.5 * s.ulna * k, d0: 0.5 * d0 * k, Es: Es, A: A });
    }
    /* the gull's own fold, measured: the wrist's reach against the wrist angle on gull wings (doi:10.6084/m9.figshare.c.5503989 markers
       on the doi:10.6084/m9.figshare.c.5275490 coupled path, data CC BY 4.0; model scripts/linkage.py GULL_FOLD), which the bones'
       triangle reproduces to 0.011 (MODEL.md 3.3) */
    var GF_W = [54.3, 60.5, 68.3, 74.9, 84.8, 93.3, 104.9, 113.3, 122.1, 131.5, 142.4, 151.4, 158.3, 165.9];
    var GF_R = [0.224, 0.233, 0.240, 0.251, 0.257, 0.265, 0.272, 0.279, 0.287, 0.293, 0.299, 0.302, 0.305, 0.304];
    function gullExt(Wdeg) {
      var i = 0; if (Wdeg <= GF_W[0]) return GF_R[0] / 0.304; if (Wdeg >= GF_W[13]) return 1;
      while (GF_W[i + 1] < Wdeg) i++;
      return (GF_R[i] + (GF_R[i + 1] - GF_R[i]) * (Wdeg - GF_W[i]) / (GF_W[i + 1] - GF_W[i])) / 0.304;
    }
    function elbowExt(kind, Edeg) {   // the shoulder-wrist distance over its spread value (model linkage.ext: d(E) / d(E_spread))
      var S = skel(kind), E = Edeg * DEG, d = Math.sqrt(S.h * S.h + S.u * S.u - 2 * S.h * S.u * Math.cos(E));
      return d / S.d0;
    }
    /* ---- the beat, one cycle (the model's: the solved rig, or the plain mapping for the small birds) ---- */
    var AN = new Float64Array(W.NA), OPT = { k: 1, D: 0 };
    function cycle(kind, ph, o, pose, body) {
      W.flap(kind, ph, o, pose, body);
      /* the elbow drives the arm's length (the skeleton): ext from the elbow channel through the bones (the solved
         rig's ext is the same quantity, model.json ext; tools/measure.js reports the difference) */
      if (!KM[kind].channels.fold_coord) {
        W.anatomy(kind, ph, o, AN);
        var ex = Math.min(1, kind === 'gull' ? gullExt(AN[W.IX.wrist]) : elbowExt(kind, AN[W.IX.elbow]));   // (the joints' swing scales with o.k, so does the fold)
        pose[3] = ex; pose[P.NP + 3] = ex;
      }
      var TGk = P.kinds[kind].tipg[0], ck = CURL_R / WINGMODEL_CURL;   // (FIX: the load's curl to CURL_TIP)
      pose[7] = TGk + ck * (pose[7] - TGk); pose[P.NP + 7] = TGk + ck * (pose[P.NP + 7] - TGk);
      return pose;
    }
    /* ---- a bird's day on the wing: integrated once at dt ---- */
    var G22 = P.pose(), F22 = P.pose(), M22 = P.pose(), B3 = new Float64Array(3);
    function bird(seed, kind, o) {
      o = o || {};
      var r = typeof seed === 'function' ? seed : rng(seed), m = KM[kind];
      var f0 = (o.f || rate(kind, o.rate)) * (1 + VAR.SPREAD * (o.spread === undefined ? 2 * r() - 1 : o.spread));
      var from = o.from === undefined ? -5 : o.from, to = o.to === undefined ? 120 : o.to, dt = o.dt || 1 / 240;
      var sc = o.sched === 'continuous' ? { cont: true } : o.sched === 'calm' ? { calm: CALM[kind] } : SCHED[o.V && kind === 'ibis' ? 'ibisV' : kind] || { cont: true };
      var b = { kind: kind, f: f0, D: m.D, from: from, dt: dt, n: Math.ceil((to - from) / dt) + 2, sched: o.sched || 'measured', lead: o.lead || null, lock: o.lock || null };
      var n = b.n, PH = new Float64Array(n), FL = new Uint8Array(n), BI = new Int32Array(n), AE = new Float32Array(n), EE = new Float32Array(n), PZ = new Uint8Array(n), LK = new Float32Array(n);
      /* per beat (by its absolute index from the bird's first beat): period share, amplitude, pause */
      var NB = Math.ceil((to - from) * f0 * 1.4) + 64, EPS = new Float32Array(NB), KK = new Float32Array(NB), PAU = new Float32Array(NB), pz = 0, pzrun = 0;
      for (var j = 0; j < NB; j++) {
        EPS[j] = clip(VAR.PERIOD_CV * gauss(r), 0.08); KK[j] = 1 + clip(VAR.AMP_SD * gauss(r), 0.12);
        if (sc.pause) {   // a Markov chain: the share of beats paused, the mean run, the longest run
          var pi = sc.pause[0], p11 = 1 - 1 / sc.pause[1], p01 = pi * (1 - p11) / (1 - pi);
          pz = pzrun >= sc.pause[2] ? 0 : (r() < (pz ? p11 : p01) ? 1 : 0); pzrun = pz ? pzrun + 1 : 0;
          PAU[j] = pz ? Math.min(sc.pause[5], Math.max(sc.pause[4], sc.pause[3] * Math.exp(0.45 * gauss(r)))) : 0;
        }
      }
      b.EPS = EPS; b.KK = KK; b.PAU = PAU;
      var tsc = m.real.f / f0; b.trim = [TAU * r(), TAU * r(), TAU * r(), TAU * r(), TAU * r(), TAU * r(), tsc * TRIM.PER[0] * (0.85 + 0.3 * r()), tsc * TRIM.PER[1] * (0.85 + 0.3 * r()), tsc * TRIM.PER[2] * (0.85 + 0.3 * r())];   // (FIX: the glide's trims, in beat time)
      /* the slow wander of a continuous flapper's rate: three slow sines, sd VAR.WANDER (over 8-30 beats) */
      var wq = [TAU * r(), TAU * r(), TAU * r(), 8 + 4 * r(), 15 + 6 * r(), 26 + 8 * r()];
      function wander(t) { return VAR.WANDER * Math.SQRT2 * (0.6 * Math.sin(TAU * t * f0 / wq[3] + wq[0]) + 0.6 * Math.sin(TAU * t * f0 / wq[4] + wq[1]) + 0.53 * Math.sin(TAU * t * f0 / wq[5] + wq[2])) / 1.0; }
      /* bouts: alternating flapping (n beats) and gliding (s); the first state drawn so the film starts mid-day */
      var flap = !!sc.cont || r() < 0.6, left = 0, boutF = f0, Psi = 0, inBout = false, s0 = 0, nb = 0, glideLeft = 0, hold = 0, beatPaused = -1;
      function newBout() {
        nb = sc.cont ? 1e9 : sc.calm ? sc.calm[0][0] + Math.floor((sc.calm[0][1] - sc.calm[0][0] + 1) * r()) : Math.max(2, Math.round(logn(r, sc.flap)));
        boutF = f0 * (sc.cont ? 1 : 1 + clip(VAR.BOUT_SD * gauss(r), 0.12)); s0 = Math.round(Psi); Psi = s0; inBout = true;
      }
      function newGlide() { glideLeft = sc.calm ? sc.calm[1][0] + (sc.calm[1][1] - sc.calm[1][0]) * r() : logn(r, sc.glide) / f0; }
      if (flap) { newBout(); var pre = sc.cont ? 0 : Math.floor(r() * Math.max(0, nb - 2));   /* (FIX: anywhere in the bout) */ nb = Math.max(nb, pre + 2); Psi = pre + r(); }   // (mid-bout at the start)
      else { newGlide(); glideLeft *= r(); Psi = r(); }
      /* tucks (storks, gliding): a Poisson stream */
      var tucks = [];
      if (sc.tucks) { var sz = Math.sqrt((m.world_span_m || m.real.b) / m.real.b), tt = from; while (tt < to) { tt += -Math.log(1 - r()) * 60 / sc.tucks[0]; tucks.push(tt, sc.tucks[1] * sz); } }
      b.tucks = tucks;
      /* the lock (an ibis behind another in a V): wake bouts and free bouts, lognormal */
      var lockOn = [], lt = from - r() * 4, lon = r() < 0.32;
      if (b.lead && b.lock) { while (lt < to) { var dur = Math.exp(Math.log(lon ? LOCK.HOLD[0] : LOCK.FREE[0]) + (lon ? LOCK.HOLD[1] : LOCK.FREE[1]) * gauss(r) * 0.7); if (lon) lockOn.push(lt, lt + dur); lt += dur; lon = !lon; } }
      b.lockOn = lockOn;
      var delta = b.lead && b.lock ? f0 * b.lock.d / b.lock.U + LOCK.PHASE : 0; b.delta = delta;
      var lockW = 0, abs0 = 0;   // abs0: the absolute clock (beats since the bird's first), Psi within it
      for (var i = 0; i < n; i++) {
        var t = from + i * dt;
        /* where in the beat: Psi runs in every state (a clock), the beat's period its own, its downstroke fixed */
        var bj = Math.floor(Psi), u = Psi - bj, jj = ((bj % NB) + NB) % NB, fb = boutF * (sc.cont ? 1 + wander(t) : 1);
        var fi = fb / (1 + EPS[jj]);
        /* the ibis lock: toward the bird ahead's phase, delayed by delta (in cycles), loosely (a soft loop) */
        var lk = 0;
        if (lockOn.length) { for (var q = 0; q < lockOn.length; q += 2) if (t >= lockOn[q] - 1 && t <= lockOn[q + 1] + 1) { lk = Math.max(lk, ss(t - lockOn[q] + 1) * (1 - ss(t - lockOn[q + 1]))); } }
        if (lk > 0 && b.lead && b.lead.PSI) {
          var li = Math.min(b.lead.n - 1, Math.max(0, Math.round((t - b.lead.from) / b.lead.dt)));
          if (b.lead.FL[li] && inBout) { var err = (b.lead.PSI[li] - delta) - Psi; err = err - Math.round(err); fi += clip(LOCK.GAIN * f0 * err, LOCK.MAXF * f0) * lk; }
        }
        LK[i] = lk;
        /* the swallow's pause: held at mid-upstroke */
        var D = b.D, mid = D + 0.5 * (1 - D);
        if (hold > 0) { hold -= dt; PZ[i] = 1; }
        else {
          var Psi1 = Psi + fi * dt;
          if (inBout && PAU[jj] > 0 && beatPaused !== bj && u < mid && Psi1 - bj >= mid) { Psi1 = bj + mid; hold = PAU[jj] / fi; beatPaused = bj; }
          Psi = Psi1;
        }
        /* the bout's state */
        var x = Psi - s0, a = 0, e = 0;
        if (inBout) {
          a = ss(x / RAMP.A_IN) * (1 - ss((x - nb) / RAMP.A_OUT));
          e = ss(x / RAMP.E_IN) * (1 - ss((x - nb - 0.1) / RAMP.E_OUT));
          if (!sc.cont && x >= nb + 0.1 + RAMP.E_OUT) { inBout = false; newGlide(); }
        } else {
          glideLeft -= dt;
          if (glideLeft <= 0 && fr(Psi) > 0.97) newBout();   // (a bout begins at the top of the stroke; a step is at most 0.03 cycle: 7.1 Hz at 1/240 s)
        }
        PH[i] = Psi; FL[i] = inBout ? 1 : 0; AE[i] = a; EE[i] = e; BI[i] = inBout ? Math.floor(x) : -1;
      }
      b.PSI = PH; b.FL = FL; b.AE = AE; b.EE = EE; b.BI = BI; b.PZ = PZ; b.LK = LK;
      return b;
    }
    var S0 = { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 };
    function state(b, t, S) {
      S = S || S0;
      var x = (t - b.from) / b.dt, i = Math.floor(x), w = x - i;
      if (i < 0) { i = 0; w = 0; } if (i >= b.n - 1) { i = b.n - 2; w = 1; }
      var psi = b.PSI[i] + (b.PSI[i + 1] - b.PSI[i]) * w, bj = Math.floor(psi), NB = b.EPS.length, j0 = ((bj % NB) + NB) % NB, j1 = (j0 + 1) % NB;
      S.psi = psi; S.ph = psi - bj; S.flap = b.FL[w < 0.5 ? i : i + 1];
      S.a = b.AE[i] + (b.AE[i + 1] - b.AE[i]) * w; S.e = b.EE[i] + (b.EE[i + 1] - b.EE[i]) * w;
      S.k = b.KK[j0] + (b.KK[j1] - b.KK[j0]) * ss(S.ph);   // (continuous through the top of the stroke)
      S.D = b.D / (1 + b.EPS[j0]);                          // (the downstroke's time fixed; the upstroke takes the change)
      S.beat = b.BI[i]; S.pause = b.PZ[i]; S.lock = b.LK[i];
      S.tuck = 0;
      for (var q = 0; q < b.tucks.length; q += 2) { var d = t - b.tucks[q]; if (d > 0 && d < b.tucks[q + 1]) { var s = Math.sin(Math.PI * d / b.tucks[q + 1]); S.tuck = s * s; break; } }
      return S;
    }
    var K = { k: 1, D: 0.5 };
    function pose(b, t, out, body, o) {
      var S = state(b, t), kind = b.kind, gk = o && o.k !== undefined ? o.k : 1, j;
      P.glide(kind, 1, G22);
      /* FIX: the glide's load (the beat's mean: the weight) curls and washes out the primaries; the glide's trims */
      var lam0 = KM[kind].channels.tip_load ? KM[kind].channels.tip_load.a0 : 0, gw = 1 - S.e, tr = b.trim, sq = Math.sqrt(2 / 3);
      for (var sd = 0; sd < 2; sd++) { G22[sd * P.NP + 7] += CURL_R * lam0; G22[sd * P.NP + 9] -= W.consts.TWT * lam0; }
      var sym = TRIM.SYM * sq * (Math.sin(TAU * t / tr[6] + tr[0]) + Math.sin(TAU * t / tr[7] + tr[1]) + Math.sin(TAU * t / tr[8] + tr[2]));
      var bank = TRIM.BANK * sq * (Math.sin(TAU * t / tr[6] + tr[3]) + Math.sin(TAU * t / tr[7] + tr[4]) + Math.sin(TAU * t / tr[8] + tr[5]));
      if (gw > 0) { G22[0] += sym; G22[P.NP] += sym; }
      S.bank = bank * gw; S.trim = sym;
      if (body) { body[0] = 0; body[1] = S.bank; body[2] = 0; }   // (body[1]: the bank, deg, + the left wing up)
      if (S.e > 0) {
        K.k = S.k * gk; K.D = S.D;
        cycle(kind, S.ph, K, F22, B3);
        W.mean(kind, M22); M22[3] = Math.min(1, M22[3]); M22[P.NP + 3] = M22[3];
        for (j = 0; j < 2 * P.NP; j++) out[j] = G22[j] + S.e * (M22[j] - G22[j]) + S.a * (F22[j] - M22[j]);
        if (body) { body[0] = S.a * B3[0]; body[2] = S.a * B3[2]; }   // (body[1] keeps the glide's bank, faded by the envelope)
      } else for (j = 0; j < 2 * P.NP; j++) out[j] = G22[j];
      return S;
    }
    /* ---- the geometry ---- */
    function setPrimw(kind, beat) {
      var w = beat === 'this' || beat === undefined ? PRIMW[PRIMK[kind] || 'slot'] : null, pw = FORM.primw;
      for (var i = 0; i < 3; i++) { pw.curl[i] = w ? w[i] : PW0.curl[i]; pw.twist[i] = w ? w[i] : PW0.twist[i]; }
    }
    /* ---- the flexing form (FIX): the original 30 vertices keep their places in the list (the tips now at the bent
       feathers' ends), then per side the four spokes' mid points (the notch) and two finger edges: 42 vertices; per side
       the arm, hand and cap as the form has them and each pleat as two facets (knuckle to notch, notch to tip) ---- */
    var FK = {};
    function flexKind(kind) { return FK[kind] || makeFlexKind(kind); }   // (cached apart from its builder: a call makes no closure)
    function makeFlexKind(kind) {
      var K = P.kinds[kind], sl = (FLEXK[kind] || [0.5, 0])[1], tri = [], tf = [], facets = [], i;
      for (i = 0; i < 18; i++) { tri.push(K.tri[3 * i], K.tri[3 * i + 1], K.tri[3 * i + 2]); tf.push(K.tf[i]); }
      for (i = 0; i < 9; i++) facets.push(K.facets[i]);
      function side(mp, fo, rev) {
        var m0 = 30 + fo, m1 = 31 + fo, m2 = 32 + fo, m3 = 33 + fo, s0 = 34 + fo, s1 = 35 + fo, n0 = 36 + fo, n1 = 37 + fo;
        var T = [[8, m0, m1, 0], [8, m1, 12, 0], [m0, 16, sl ? s0 : 14, 1], [m0, sl ? s0 : 14, sl ? n0 : m1, 1], [12, m1, m2, 2], [12, m2, 13, 2], [m1, 14, sl ? s1 : 15, 3], [m1, sl ? s1 : 15, sl ? n1 : m2, 3], [13, m2, m3, 4], [13, m3, 10, 4], [m2, 15, m3, 5]];
        T.forEach(function (q) { var a = q[0] < 30 ? mp(q[0]) : q[0], b2 = q[1] < 30 ? mp(q[1]) : q[1], c2 = q[2] < 30 ? mp(q[2]) : q[2]; if (rev) tri.push(a, c2, b2); else tri.push(a, b2, c2); tf.push(facets.length + q[3]); });
        ['pleat0_in', 'pleat0_out', 'pleat1_in', 'pleat1_out', 'pleat2_in', 'pleat2_out'].forEach(function (n) { facets.push({ name: n + (rev ? '_R' : '_L'), cls: 'pleat', side: rev ? 'R' : 'L', panel: n.slice(0, 6) }); });
      }
      side(function (v) { return v; }, 0, false);
      for (i = 23; i < 41; i++) { tri.push(K.tri[3 * i], K.tri[3 * i + 1], K.tri[3 * i + 2]); tf.push(K.tf[i] - 12 + 15); }
      for (i = 12; i < 21; i++) facets.push(K.facets[i]);
      side(function (v) { return v < 4 ? v : v + 13; }, 8, true);
      var b = []; for (i = 0; i < 46; i++) b.push(i < 30 ? K.b[i] : 0);
      return (FK[kind] = { tri: tri, tf: tf, facets: facets, b: b, chain: K.chain, slotted: !!sl, e: (FLEXK[kind] || [0.5])[0], open: (FLEXK[kind] || [0, 0, 0])[2], glide: K.glide, tipg: K.tipg, size: K.size });
    }
    var FV_BASE = [8, 12, 13, 10], FV_TIP = [16, 14, 15, 15], FV_BONE = [4, 5, 6, 6];   // (the pleats' base, tip and bone, per side)
    var PIn = new Float64Array(22), POut = new Float64Array(22), BI = new Float64Array(156), BO = new Float64Array(156), QB = [0, 0, 0], QT = [0, 0, 0], QM = [0, 0, 0], MP = new Float64Array(24);
    function apply(Bn, k, q, o, oi) { var j = 12 * k; o[oi] = Bn[j] * q[0] + Bn[j + 1] * q[1] + Bn[j + 2] * q[2] + Bn[j + 9]; o[oi + 1] = Bn[j + 3] * q[0] + Bn[j + 4] * q[1] + Bn[j + 5] * q[2] + Bn[j + 10]; o[oi + 2] = Bn[j + 6] * q[0] + Bn[j + 7] * q[1] + Bn[j + 8] * q[2] + Bn[j + 11]; }
    function rotv(Bn, k, q, o, oi) { var j = 12 * k; o[oi] += Bn[j] * q[0] + Bn[j + 1] * q[1] + Bn[j + 2] * q[2]; o[oi + 1] += Bn[j + 3] * q[0] + Bn[j + 4] * q[1] + Bn[j + 5] * q[2]; o[oi + 2] += Bn[j + 6] * q[0] + Bn[j + 7] * q[1] + Bn[j + 8] * q[2]; }
    function flexVerts(kind, pose22, out) {
      var K = P.kinds[kind], FKk = flexKind(kind), e = FKk.e, TG = K.tipg[0], v = K.v, i, sd;
      var ch2 = chords(e), cin = ch2[0], cout = ch2[1];   // (the tapered cantilever's two chords, the tip's deflection kept)
      for (i = 0; i < 22; i++) { PIn[i] = pose22[i]; POut[i] = pose22[i]; }
      for (sd = 0; sd < 2; sd++) { var o7 = sd * P.NP + 7, ld = pose22[o7] - TG; PIn[o7] = TG + cin * ld; POut[o7] = TG + cout * ld; }
      P.bones(kind, PIn, BI); P.bonesTips(kind, POut, BO);   // (POut is PIn but for the tips' curl)
      var vb = K.b, nb = vb.length;   // (the vertices on BI: P.verts's own sums, its bones made once)
      for (i = 0; i < nb; i++) { QB[0] = v[3 * i]; QB[1] = v[3 * i + 1]; QB[2] = v[3 * i + 2]; apply(BI, vb[i], QB, out, 3 * i); }
      var kx = K.dims.kx, yK = K.yK;
      for (sd = 0; sd < 2; sd++) {
        var sg = sd ? -1 : 1, off = sd ? 13 : 0, bo = sd ? 6 : 0, base = FV_BASE, tipv = FV_TIP, bone = FV_BONE, oN = 30 + 8 * sd, j, op = FKk.open;
        for (j = 0; j < 4; j++) {
          var bv = base[j] + off, tv = tipv[j] + off, bk = bone[j] + bo;
          QB[0] = v[3 * bv] + kx; QB[1] = v[3 * bv + 1] - sg * yK; QB[2] = v[3 * bv + 2];   // (the base in the pleat's frame: the hand's less the pivot)
          QT[0] = v[3 * tv]; QT[1] = v[3 * tv + 1]; QT[2] = v[3 * tv + 2];
          for (i = 0; i < 3; i++) QM[i] = QB[i] + e * (QT[i] - QB[i]);
          apply(BI, bk, QM, MP, 3 * j); out[3 * (oN + j)] = MP[3 * j]; out[3 * (oN + j) + 1] = MP[3 * j + 1]; out[3 * (oN + j) + 2] = MP[3 * j + 2];
          for (i = 0; i < 3; i++) QT[i] -= QM[i];
          MP[12 + 3 * j] = MP[3 * j]; MP[13 + 3 * j] = MP[3 * j + 1]; MP[14 + 3 * j] = MP[3 * j + 2];
          if (j < 3) { out[3 * tv] = MP[3 * j]; out[3 * tv + 1] = MP[3 * j + 1]; out[3 * tv + 2] = MP[3 * j + 2]; rotv(BO, bk, QT, out, 3 * tv); }
          if (j === 1 || j === 2) {   // the finger edge of the pleat ahead (j - 1): this spoke's outer segment turned with that pleat
            var fi = oN + 4 + (j - 1); out[3 * fi] = MP[3 * j]; out[3 * fi + 1] = MP[3 * j + 1]; out[3 * fi + 2] = MP[3 * j + 2]; rotv(BO, bone[j - 1] + bo, QT, out, 3 * fi);
          }
        }
        /* the fingers narrowed beyond the notch (the open slot, of the finger's width): the trailing edge's root and tip
           drawn toward the finger's leading edge */
        for (j = 0; j < 2; j++) {
          var mj = oN + j, mn = oN + j + 1, fj = oN + 4 + j, nj = oN + 6 + j, tl = tipv[j] + off;
          for (i = 0; i < 3; i++) { out[3 * nj + i] = out[3 * mj + i] + (1 - op) * (out[3 * mn + i] - out[3 * mj + i]); out[3 * fj + i] = out[3 * tl + i] + (1 - op) * (out[3 * fj + i] - out[3 * tl + i]); }
        }
      }
      return 46;
    }
    function geom(kind, pose22, body, out, beat, pitchDeg) {
      setPrimw(kind, beat);
      var nv;
      if ((beat === 'this' || beat === undefined) && out.length >= 138) nv = flexVerts(kind, pose22, out);
      else { P.verts(kind, pose22, out); nv = P.kinds[kind].b.length; }
      return bodyOn(nv, body, out, pitchDeg);
    }
    /* the flexing form alone (geom's first half, 'this' beat): its 46 vertices before the body's heave, surge and bank */
    function flexOf(kind, pose22, out) { setPrimw(kind, 'this'); return flexVerts(kind, pose22, out); }
    /* geom's second half: nv vertices of out with the body's bank (and pitch) and heave, surge (in place) */
    function bodyOn(nv, body, out, pitchDeg) {
      var c = 1, s = 0, bk = body && body[1] ? body[1] * DEG : 0, cr = Math.cos(bk), sr = Math.sin(bk);
      if (pitchDeg) { c = Math.cos(pitchDeg * DEG); s = Math.sin(pitchDeg * DEG); }
      for (var i = 0; i < nv; i++) {
        var x = out[3 * i], y = out[3 * i + 1], z = out[3 * i + 2];
        if (bk) { var y2 = cr * y - sr * z, z3 = sr * y + cr * z; y = y2; z = z3; }   // (FIX: the glide's bank about the body's axis, + the left wing up)
        if (pitchDeg) { var x2 = c * x - s * z, z2 = s * x + c * z; x = x2; z = z2; }   // (nose up: + about y; held 0)
        out[3 * i] = x + (body ? body[0] : 0); out[3 * i + 1] = y; out[3 * i + 2] = z + (body ? body[2] : 0);
      }
      return out;
    }
    var BNS = new Float64Array(156);
    function skeleton(kind, pose22, body, out, beat) {
      setPrimw(kind, beat);
      P.bones(kind, pose22, BNS);
      var F = P.kinds[kind], S = skel(kind), V = new Float64Array(3 * F.b.length);
      P.verts(kind, pose22, V);
      var ch = F.chain;   // [tipL, knuckleL, wristL, root, wristR, knuckleR, tipR]
      for (var sd = 0; sd < 2; sd++) {
        var o = 12 * (1 + 6 * sd), ext = pose22[sd * P.NP + 3], sg = sd ? -1 : 1;
        var Dw = ext * S.A - S.sh;   // the shoulder-wrist distance along the arm
        /* the elbow: the triangle shoulder-elbow-wrist (h, u, Dw), the elbow behind the line (arm frame: y out, x forward) */
        var ya = (S.h * S.h - S.u * S.u + Dw * Dw) / (2 * Dw), xb = -Math.sqrt(Math.max(0, S.h * S.h - ya * ya));
        var pts = [[0, S.sh, 0], [xb, S.sh + ya, 0]], q = 15 * sd, k;
        for (k = 0; k < 2; k++) { var lx = pts[k][0], ly = pts[k][1] * sg, lz = 0, R = BNS;   // (bone 1+6sd: the arm, mirrored for the right)
          out[q + 3 * k] = R[o] * lx + R[o + 1] * ly + R[o + 2] * lz + R[o + 9];
          out[q + 3 * k + 1] = R[o + 3] * lx + R[o + 4] * ly + R[o + 5] * lz + R[o + 10];
          out[q + 3 * k + 2] = R[o + 6] * lx + R[o + 7] * ly + R[o + 8] * lz + R[o + 11]; }
        var iw = sd ? ch[4] : ch[2], ik = sd ? ch[5] : ch[1], it = sd ? ch[6] : ch[0];
        [iw, ik, it].forEach(function (vi, m2) { out[q + 6 + 3 * m2] = V[3 * vi]; out[q + 7 + 3 * m2] = V[3 * vi + 1]; out[q + 8 + 3 * m2] = V[3 * vi + 2]; });
      }
      for (var p = 0; p < 10; p++) { out[3 * p] += body ? body[0] : 0; out[3 * p + 2] += body ? body[2] : 0; }
      return out;
    }
    var P2 = null;   // a facetpose over the flexing kinds, for their facets' normals and light (facetpose unchanged)
    function flexPose() { if (!P2) { var ks = {}; Object.keys(P.kinds).forEach(function (k) { ks[k] = flexKind(k); }); P2 = FACETPOSE({ kinds: ks, primw: FORM.primw }); } return P2; }
    return { P: P, W: W, flexKind: flexKind, flexPose: flexPose, FLEXK: FLEXK, CURL_TIP: CURL_TIP, TRIM: TRIM, bird: bird, state: state, pose: pose, cycle: cycle, geom: geom, flexOf: flexOf, bodyOn: bodyOn, skeleton: skeleton, elbowExt: elbowExt, gullExt: gullExt, skel: skel, rate: rate, setPrimw: setPrimw,
             SCHED: SCHED, CALM: CALM, VAR: VAR, RAMP: RAMP, LOCK: LOCK, PRIMW: PRIMW, PRIMK: PRIMK, rng: rng, kinds: Object.keys(P.kinds).filter(function (k) { return !!KM[k]; }) };
  }
  root.LABBIRD = LABBIRD;
  if (typeof module !== 'undefined' && module.exports) module.exports = LABBIRD;
})(typeof self !== 'undefined' ? self : this);
