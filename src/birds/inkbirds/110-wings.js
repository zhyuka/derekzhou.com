  /* ---------------- the wings ---------------- */

  /* (physics) A BIRD'S DAY ON THE WING IS THE LAB'S (birdwing.js on labbird.js): its bouts of beats and its glides
     drawn from the measured schedules (gull: bouts of about 30 beats and glides of about 15 beat-lengths, fitted to the
     CC0 lesser black-backed gull tags; stork 6 and 50, the CC0 white stork tags; ibis 13.6 and 3.2, in a V 97 %
     flapping; by the owner's word (2026-11-03) geese, herons, swans, crows and swallows glide between long bouts too,
     their numbers chosen (birdwing.js OWNER_GLIDES), the swallow's measured upstroke pauses kept within its bouts),
     its beat's period, its stroke and each bout's rate varying as measured, its rate spread within its flight. The
     bouts (in s of the flight's clock) are what the path reads: a flap-glider sinks a little through each glide and
     climbs back through the next bout, a bounding finch rises through its beats and falls through the bound, as
     before; the beat itself is posed from the wing's state (poseBird). BOUT_AHEAD: how far on a bout's end or the
     next one's start is looked for */
  var BSt = { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 }, BA = { k: -1, a: 0, b: 0, pe: 0, n: 0 }, BOUT_AHEAD = 240;
  /* where a bird is in its wing-beat at time t: its phase in [0, 1) (0 the top of the stroke) while in a bout, -1
     while it glides, -2 while a bounding bird falls with its wings shut */
  function beat(m, t) {
    var w = m.w;
    if (!w || !w.wing) return -1;
    var S = BW.state(w.wing, t, BSt);
    return S.flap ? S.ph : w.bound ? -2 : -1;
  }
  /* how far a bird is carried below its path by its wings (units of the air). A flap-glider sinks through each glide
     and climbs back through the next bout: its sink (in units of its reach, amp) eases toward 1 while it glides and
     toward 0 while it flaps, critically damped (SINK_W: 95 % of the way in 3 s, as the shape round's glide reached its
     depth in 3 s; its height and its rate of climb continuous at every change), worked out from its past bouts alone
     (the shape round's rule read the glide's whole length ahead, which a measured schedule only knows by integrating
     the bird's day up to 200 s on). A bounding finch rises through its beats and falls through the bound, as before
     (its bouts a beat or two: looked for at most 10 s on) */
  var SINK_W = 1.25;
  /* (life fix, L9) the glide's sink through the air: judge-bio1 found every glide flown level on a powered path. Now a
     bird sinks through each glide at GS_RATE m/s (6.1 deg at 13 m/s through the air) eased in over 1 / GS_K s, the
     rate falling off toward GS_MAX below its path (a long glide riding the evening's air: the sink 4.5-5.5 deg over a
     3-5 s glide, Pennycuick 2008, the gull and jackdaw fits in research-flight/NOTES.md), and climbs back through the
     next bout (critically damped, GS_W: 95 % in 10 s, about 1.5 deg of climb), its height and rate continuous; worked out
     from its past bouts alone, a pure function of the flight's time, as before */
  var GS_RATE = 1.4, GS_MAX = 12, GS_K = 1, GS_W = 0.3, GS_AMP = 0.3;   // (round 3, step 1: GS_K 3 -> 1, GS_W 0.45 -> 0.3: a glide's onset and its end bent a calm crossing's line on the window over TURN_MAX, and the planner refused every flight that would glide in view)
  function sinkSeg(w) {
    var g = w.wing, K = w.sk;
    if (!K) K = w.sk = { q: 0, half: 0, T: [g.from - g.dt], Y: [0], V: [0], G: [g.inB0 ? 0 : 1], gsr: w.gsr || 0 };
    return K;
  }
  function sinkEval(K, k, t, o) {   // (fix) segment k from its start at t: gliding, the sink; flapping, the climb back (units of the air below the path)
    var y0 = K.Y[k], v0 = K.V[k], tt = t - K.T[k];
    if (K.G[k] === 1) { var D = GS_MAX / MPU, A = (K.gsr > 0 ? K.gsr : GS_RATE) / GS_MAX, e1 = Math.exp(-A * tt), e2 = Math.exp(-GS_K * tt), c = v0 - A * (D - y0); o[0] = D - (D - y0) * e1 + c * (1 - e2) / GS_K; o[1] = A * (D - y0) * e1 + c * e2; return o; }
    var c2 = v0 + GS_W * y0, e = Math.exp(-GS_W * tt);
    o[0] = (y0 + c2 * tt) * e; o[1] = (v0 - GS_W * c2 * tt) * e; return o;
  }
  var SKO = [0, 0];
  function sinkAt(w, t) {
    var g = w.wing, B = BW.boutsTo(g, t), K = sinkSeg(w), n;
    for (;;) {   // the changes not yet taken in: each bout's start (to 0), then its end (to 1), once it has one
      var q = K.q; if (q >= B.length) break;
      var ts, gt;
      if (K.half === 0) { ts = B[q] < 0 ? g.from - g.dt : g.from + B[q] * g.dt; gt = 0; }
      else { if (B[q + 1] < 0) break; ts = g.from + B[q + 1] * g.dt; gt = 1; }
      n = K.T.length - 1;
      if (ts > K.T[n]) { sinkEval(K, n, ts, SKO); K.T.push(ts); K.Y.push(SKO[0]); K.V.push(SKO[1]); K.G.push(gt); }
      else { K.G[n] = gt; }   // (at the same instant: the later target)
      if (K.half === 0) K.half = 1; else { K.half = 0; K.q = q + 5; }
    }
    var lo = 0, hi = K.T.length - 1;
    if (t <= K.T[0]) return 0;
    while (lo < hi) { var mm = (lo + hi + 1) >> 1; if (K.T[mm] <= t) lo = mm; else hi = mm - 1; }
    return sinkEval(K, lo, t, SKO)[0];
  }
  /* (round 3, step 2) how far a gliding bird has fallen back behind its place (units of the air): toward LAG_SPANS spans
     at its deficit (w.gld, units a second) while it glides, eased in over 1 / LAG_K s; caught up through its next bout,
     critically damped (LAG_W); its distance and rate continuous at every change; from its past bouts alone */
  var LAG_K = 2.5, LAG_W = 0.35, LAG_SPANS = 2, LAG_SPANS_LONE = 6, LAG_GAIN = 1;   // (a lone bird may fall back further than a pair's or a flock's, whose neighbours keep their places; LAG_GAIN: the deficit as aimed, its approach to the cap fading it)
  var GLIDE_RHO = { gull: 0.88, goose: 0.85, heron: 0.85, ibis: 0.85, crow: 0.7, swallow: 0.65, stork: 0.6, finch: 1 };
  var GLIDE_LD = { gull: 17, goose: 15, heron: 16.5, ibis: 15.3, crow: 13.3, swallow: 12, stork: 14.7, finch: 10 };   // (best glide ratios: research-flight 1.2's polars; the jackdaw and swift measured)
  var LKO = [0, 0], GLIDE_SINK_K = 1.5;   // (the sink rate aimed so a glide's mean angle, its easing in counted, comes to about 1 / (L/D) of its airspeed: at 1 (and rho), glides of 1.5-4 s sank 0.8-2.8 deg against 3.4-4.8)
  function lagEval(w, K, k, t, o) {
    var y0 = K.Y[k], v0 = K.V[k], tt = t - K.T[k];
    if (K.G[k] === 1) { var D = w.lmax, A = w.gld / w.lmax, e1 = Math.exp(-A * tt), e2 = Math.exp(-LAG_K * tt), c = v0 - A * (D - y0); o[0] = D - (D - y0) * e1 + c * (1 - e2) / LAG_K; o[1] = A * (D - y0) * e1 + c * e2; return o; }
    var c2 = v0 + LAG_W * y0, e = Math.exp(-LAG_W * tt);
    o[0] = (y0 + c2 * tt) * e; o[1] = (v0 - LAG_W * c2 * tt) * e; return o;
  }
  function glideLag(m, t) {
    var w = m.w;
    if (!w || !w.wing || !(w.gld > 0) || w.bound) return 0;
    var g = w.wing, B = BW.boutsTo(g, t), K = w.lk, n;
    if (!K) K = w.lk = { q: 0, half: 0, T: [g.from - g.dt], Y: [0], V: [0], G: [g.inB0 ? 0 : 1] };
    for (;;) {   // (the changes not yet taken in, as the sink's: each bout's start (catching up), then its end (falling back))
      var q = K.q; if (q >= B.length) break;
      var ts, gt;
      if (K.half === 0) { ts = B[q] < 0 ? g.from - g.dt : g.from + B[q] * g.dt; gt = 0; }
      else { if (B[q + 1] < 0) break; ts = g.from + B[q + 1] * g.dt; gt = 1; }
      n = K.T.length - 1;
      if (ts > K.T[n]) { lagEval(w, K, n, ts, LKO); K.T.push(ts); K.Y.push(LKO[0]); K.V.push(LKO[1]); K.G.push(gt); }
      else { K.G[n] = gt; }
      if (K.half === 0) K.half = 1; else { K.half = 0; K.q = q + 5; }
    }
    if (t <= K.T[0]) return 0;
    var lo = 0, hi = K.T.length - 1;
    while (lo < hi) { var mm = (lo + hi + 1) >> 1; if (K.T[mm] <= t) lo = mm; else hi = mm - 1; }
    return lagEval(w, K, lo, t, LKO)[0];
  }
  function lift(m, t) {
    var w = m.w, a, b, n, h;
    if (!w || !w.wing || !(w.sinks || w.bound)) return 0;
    if (!w.bound) return sinkAt(w, t);   // (fix: units of the air, GS_*)
    BW.around(w.wing, t, 10, BA);
    if (BA.k < 0) return 0;
    a = BA.a; b = BA.b; n = BA.n;
    if (!(b < Infinity)) b = a + 4 / w.f;
    if (!(n < Infinity)) n = b + 1;
    h = t < b ? (1 - Math.cos(Math.PI * (t - a) / (b - a))) / 2 : (1 + Math.cos(Math.PI * Math.min(1, (t - b) / (n - b)))) / 2;
    return w.bAmp * (0.5 - h);
  }
  /* how far that can carry it, either way */
  function liftReach(m) { var w = m.w; return !w ? 0 : w.bound ? w.bAmp / 2 : w.sinks ? w.amp : 0; }

