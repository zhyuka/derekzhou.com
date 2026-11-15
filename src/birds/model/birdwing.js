// birdwing.js, the ink birds' wing model (src/birds/model/, served as written). Written by hand. Its comments keep the
// tags and file names of the development record it came from (rounds, labs, judges), outside this repository.
/* birdwing.js (physics, the integration): the lab's measured wing (physics/lab: labbird.js 18c2f23c on wingmodel.js
   3c935e81, model.js 439929d4, facetform.js 6896d8a3, facetpose.js d463285f: every one of them byte for byte) made
   to fly in the world. No DOM, no clock, no entropy: the caller's stream in, pure functions of time out.

     var BW = BIRDWING(LB, MODEL)        LB = LABBIRD(FACETFORM, FACETPOSE, WINGMODEL, MODEL)
     BW.make(r, kind, o)                 a bird's wing: its rate (o.rate 'scaled' | 'real'; o.spread in [-1, 1], its
                                         place in its flight's +-3 %), its schedule (o.sched 'measured' | 'calm' |
                                         'continuous'), o.V (an ibis in a V), o.lead (the bird ahead: another wing) and
                                         o.lock { d (m), U (m/s) }, o.from (s); o.pre { to } for the lab's own draw order
     BW.state(b, t, S)                   S as LB.state: { flap, ph, psi, k, D, a, e, beat, pause, lock, tuck }
     BW.pose(b, t, pose22, body, o)      the rig's 22 floats and the body (surge, bank, heave) as LB.pose; returns S
     BW.poseS(b, S, t, pose22, body, o)  the same from a state already read (o.swing: the beat's swing held toward the
                                         glide for a speck; o.shut: a pose the glide is replaced by, a bounding finch)
     BW.bouts(b, t0, t1, out)            the flapping bouts [start, end ...] (s) that meet [t0, t1]: the path's sink
     BW.ensure(b, t)                     the bird's day integrated to t (lazily; never needed by a caller)
     BW.skip(b, d)                       the day moved on by d s unworked (reads after it as d s before: a paused beat)
     BW.trim(b, t)                       forgets what is before t (the knots, bouts, pauses and beats): later reads only

   WHY THIS FILE. The lab integrates a bird's whole day at once (LB.bird: 1/240 s from -5 to 120 s, seven arrays of
   that length), which is right for a lab and wrong for a page: a world flight lives 30-300 s and the planner makes its
   birds well before they fly. Here THE SAME LOOP, statement for statement (the lab's constants read from LB: SCHED,
   VAR, RAMP, LOCK, CALM, TRIM; the same 1/240 s step, the same order of its tests), runs LAZILY, only as far as it is
   asked, and keeps what it found compactly: the phase as knots of a polyline (within PSI_TOL of every step's value),
   the bouts and the pauses as their steps, the beat-to-beat variation per beat. Its envelopes (a, e), its flags and
   the lock's weight are worked out from these exactly as the loop would have stored them. Differences from the lab,
   all of storage or of draw order, none of the model: the per-beat draws (period, amplitude, pause) come from a stream
   of their own beat by beat, and the ibis lock's wake bouts from another, so a bird needs no end time; with o.pre the
   lab's own draw order is kept (every per-beat value first, the wake bouts to o.pre.to), and LB.bird with the same
   seed gives the same bird (tools/wingcheck.js). The pose is LB.pose's, statement for statement (the glide's load and
   trims, the flapping cycle through the skeleton rig, the envelopes), on the state read here. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var PSI_TOL = 5e-5;   // cycles: the phase's polyline is within this of every 1/240 s step the loop takes
  /* THE OWNER'S WORD (2026-11-03 ~16:45 UTC: "the birds should glide too sometimes"): every kind glides between its
     bouts, the measured beat kept. The lab's 'continuous' kinds (goose, heron, swan, crow: Bishop 2015, Pennycuick 2001;
     the swallow: Park 2001, its upstroke pauses kept within its bouts) get flap bouts and glides as the gull's and the
     stork's are written (beats; beat-lengths: median, lognormal sigma, min, max). THESE NUMBERS ARE CHOSEN, NOT
     MEASURED (no bout data for these kinds in the lab's sources): long bouts and short glides, flapping shares about
     0.87 goose, 0.92 swan, 0.80 heron, 0.76 crow, 0.71 swallow (the means of the lognormals). The gull, the stork and the
     ibis keep their measured schedules (CC0 tags; Wehner 2022), the ibis in a V its 97% (Portugal 2014). Written into
     LB.SCHED itself, so LB.bird (the lab) and this file's loop fly the same table (tools/wingcheck.js). */
  /* (life, DESIGN 3.2) every kind glides as its kind really glides: the between-bout share kept short for the
     continuous flappers (their real glides are the event glides the path asks: set to descend, rolling into a turn),
     the gull's glide median cut from 15 to 10 beat-lengths (beats: median, lognormal sigma, least, most) */
  var OWNER_GLIDES = {
    // goose: (round 3, kinds: the owner's word 2026-11-04) flaps on and on, gliding only on descents and turns (inkbirds.js eventGlides); was { flap: [42, 0.9, 6, 600], glide: [6.5, 0.7, 3, 16] }   // (round 3, step 2: 5.5 -> 6.5 beat-lengths: the afterglow's beats 2.22 a bird-second, bar 2.2; its share 10 % in 5-12)   // (fix: 11-12 % gliding, L9 5-12, L22)
    swan:    { flap: [60, 0.9, 8, 800], glide: [6, 0.7, 3, 30] },
    // heron: (round 3, kinds: the owner's word 2026-11-04) as the goose; was { flap: [40, 0.9, 4, 400], glide: [5, 0.7, 3, 12] }   // (round 3, step 2: glides 4 -> 5, 3.5 -> 4.5, 6 -> 7 beat-lengths: the shares into their bands)
    crow:    { flap: [31, 0.45, 19, 50], glide: [2.4, 0.4, 1.2, 3.6] },   // (round 3, kinds: bouts 8-20 s, coasts 0.5-1.5 s at 2.45 Hz)
    swallow: { flap: [3.4, 0.35, 2, 6], glide: [4.8, 0.4, 2.4, 9.6] }   // (round 3, kinds: flickers 0.4-1.2 s, glides 0.5-2 s at 4.8 Hz)
  };
  var GULL_GLIDE = [6.8, 0.45, 4, 16], GULL_FLAP = [19.5, 0.45, 10, 40];   // (round 3, kinds: bouts 5-20 s, glides 2-8 s at 1.95 Hz; was glides [10, 0.9, 1, 200] and the tags' bouts [30, 0.9, 3, 400])   // (round 3, step 2: 8 -> 10 beat-lengths, its share into 20-30 %)
  function ownerGlides(SC) {
    if (SC.gull && SC.gull.glide && SC.gull.glide[0] === 15) SC.gull = { flap: GULL_FLAP, glide: GULL_GLIDE, src: SC.gull.src + ' (life: the glide median 8)' };
    for (var k in OWNER_GLIDES) {
      var s = SC[k]; if (!s || !s.cont) continue;
      var n = { flap: OWNER_GLIDES[k].flap, glide: OWNER_GLIDES[k].glide, src: 'the owner\'s word (2026-11-03): glides between bouts, numbers chosen (birdwing.js OWNER_GLIDES); was: ' + s.src };
      if (s.pause) n.pause = s.pause;
      SC[k] = n;
    }
  }
  function BIRDWING(LB, MODEL) {
    ownerGlides(LB.SCHED);
    var P = LB.P, W = LB.W, KM = MODEL.kinds, SCHED = LB.SCHED, VAR = LB.VAR, RAMP = LB.RAMP, LOCK = LB.LOCK, CALM = LB.CALM, TRIM = LB.TRIM;
    /* the lab's own helpers (labbird.js), copied: the same numbers */
    function fr(x) { return x - Math.floor(x); }
    function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
    function gauss(r) { var u = 0; for (var i = 0; i < 6; i++) u += r(); return (u - 3) * Math.SQRT2; }
    function clip(x, a) { return x < -a ? -a : x > a ? a : x; }
    function logn(r, m) { var x = m[0] * Math.exp(m[1] * gauss(r)); return Math.min(m[3], Math.max(m[2], x)); }
    function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s + 0x9e3779b9) | 0; var z = s; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35); return ((z ^ (z >>> 16)) >>> 0) / 4294967296; }; }
    /* the glide's load curl: labbird's CURL_R (the tapered cantilever's rigid-equivalent tip slope), the same sum */
    var CURL_R = (function () { var TAPER = 0.3, n = 2000, th = 0, w = [0], k, u, du = 1 / n; for (var i = 0; i < n; i++) { u = (i + 0.5) * du; k = (1 - u) * (1 - u) / Math.pow(1 - (1 - TAPER) * u, 3); var t1 = th + k * du; w.push(w[i] + 0.5 * (th + t1) * du); th = t1; } return LB.CURL_TIP * w[n] / th; })();

    function grow(a, n, T) { if (a.length >= n) return a; var b = new T(Math.max(n, 2 * a.length)); b.set(a); return b; }
    /* ---- a bird ---- */
    function make(r, kind, o) {
      o = o || {};
      var m = KM[kind], f0 = (o.f || LB.rate(kind, o.rate)) * (1 + VAR.SPREAD * (o.spread === undefined ? 2 * r() - 1 : o.spread));
      var sc = o.sched === 'continuous' ? { cont: true } : o.sched === 'calm' ? { calm: CALM[kind] } : SCHED[o.V && kind === 'ibis' ? 'ibisV' : kind] || { cont: true };
      var from = o.from === undefined ? -5 : o.from, dt = 1 / 240;
      var b = { kind: kind, f: f0, D: m.D, from: from, dt: dt, sched: o.sched || 'measured', sc: sc, lead: o.lead || null, lock: o.lock || null, loff: 0,
        EPS: new Float32Array(64), KK: new Float32Array(64), PAU: new Float32Array(64), nbt: 0, pz: 0, pzrun: 0,
        KI: new Float64Array(64), KP: new Float64Array(64), nk: 0, cone: [0, 0, 0, 0, 0, 0],   // the phase's knots: step, psi; the open segment's cone
        BO: [], PA: [], i: -1, pre: !!o.pre, boff: 0 };   // boff: the first beat the per-beat draws still hold
      /* the per-beat draws: the lab's own order when asked (every beat first, from r), else beat by beat from a stream of
         their own (seeded here, first); the wake bouts likewise */
      var NB0 = 0;
      if (o.pre) { NB0 = Math.ceil((o.pre.to - from) * f0 * 1.4) + 64; b.rb = r; drawBeats(b, NB0); b.NBW = NB0; }
      else { b.rb = rng(Math.floor(r() * 4294967296)); b.rl = rng(Math.floor(r() * 4294967296)); b.NBW = 0; }
      var tsc = m.real.f / f0;
      b.trim = [TAU * r(), TAU * r(), TAU * r(), TAU * r(), TAU * r(), TAU * r(), tsc * TRIM.PER[0] * (0.85 + 0.3 * r()), tsc * TRIM.PER[1] * (0.85 + 0.3 * r()), tsc * TRIM.PER[2] * (0.85 + 0.3 * r())];
      b.wq = [TAU * r(), TAU * r(), TAU * r(), 8 + 4 * r(), 15 + 6 * r(), 26 + 8 * r()];
      b.r = r;
      /* the loop's state */
      var L = b.L = { flap: !!sc.cont || r() < 0.6, boutF: f0, Psi: 0, inBout: false, s0: 0, nb: 0, glideLeft: 0, hold: 0, beatPaused: -1 };
      if (L.flap) { newBout(b); var pre = sc.cont ? 0 : Math.floor(r() * Math.max(0, L.nb - 2)); L.nb = Math.max(L.nb, pre + 2); L.Psi = pre + r(); }
      else { newGlide(b); L.glideLeft *= r(); L.Psi = r(); }
      /* the lock (an ibis behind another in a V): wake bouts and free bouts */
      var lt = from - r() * 4, lon = r() < 0.32;
      b.lockOn = []; b.lt = lt; b.lon = lon; b.lockR = o.pre ? r : b.rl;
      if (o.pre && b.lead && b.lock) extendLock(b, o.pre.to);
      b.delta = b.lead && b.lock ? f0 * b.lock.d / b.lock.U + LOCK.PHASE : 0;
      /* the first step's state is the loop's entry: the open bout (if any) begins at step 0 with a = e = 0, as LB.bird's
         first sample (its x is its own) */
      if (L.inBout) b.BO.push(-1, -1, L.s0, L.nb, 0);   // (begun before the first step: its flag and its envelopes from step 0, as LB.bird's)
      b.inB0 = L.inBout;
      return b;
    }
    function drawBeats(b, n) {
      var sc = b.sc, r = b.rb;
      if (b.EPS.length < n) { b.EPS = grow(b.EPS, n, Float32Array); b.KK = grow(b.KK, n, Float32Array); b.PAU = grow(b.PAU, n, Float32Array); }
      for (var j = b.nbt; j < n; j++) {
        b.EPS[j] = clip(VAR.PERIOD_CV * gauss(r), 0.08); b.KK[j] = 1 + clip(VAR.AMP_SD * gauss(r), 0.12);
        if (sc.pause) {
          var pi = sc.pause[0], p11 = 1 - 1 / sc.pause[1], p01 = pi * (1 - p11) / (1 - pi);
          b.pz = b.pzrun >= sc.pause[2] ? 0 : (r() < (b.pz ? p11 : p01) ? 1 : 0); b.pzrun = b.pz ? b.pzrun + 1 : 0;
          b.PAU[j] = b.pz ? Math.min(sc.pause[5], Math.max(sc.pause[4], sc.pause[3] * Math.exp(0.45 * gauss(r)))) : 0;
        } else b.PAU[j] = 0;
      }
      if (n > b.nbt) b.nbt = n;
    }
    /* a beat's index into the per-beat draws: the lab's (wrapped by its count) under o.pre, else the beat itself */
    function bix(b, bj) { if (b.NBW) { var NB = b.NBW; return ((bj % NB) + NB) % NB; } if (bj < 0) bj = 0; var j = bj - b.boff; if (j < 0) j = 0; if (j + 2 > b.nbt) drawBeats(b, j + 66); return j; }
    function newBout(b) {
      var L = b.L, sc = b.sc, r = b.r;
      L.nb = sc.cont ? 1e9 : sc.calm ? sc.calm[0][0] + Math.floor((sc.calm[0][1] - sc.calm[0][0] + 1) * r()) : Math.max(2, Math.round(logn(r, sc.flap)));
      L.boutF = b.f * (sc.cont ? 1 : 1 + clip(VAR.BOUT_SD * gauss(r), 0.12)); L.s0 = Math.round(L.Psi); L.Psi = L.s0; L.inBout = true;
    }
    function newGlide(b) { var L = b.L, sc = b.sc; L.glideLeft = sc.calm ? sc.calm[1][0] + (sc.calm[1][1] - sc.calm[1][0]) * b.r() : logn(b.r, sc.glide) / b.f; }
    function extendLock(b, to) {
      var r = b.lockR;
      while (b.lt < to) { var dur = Math.exp(Math.log(b.lon ? LOCK.HOLD[0] : LOCK.FREE[0]) + (b.lon ? LOCK.HOLD[1] : LOCK.FREE[1]) * gauss(r) * 0.7); if (b.lon) b.lockOn.push(b.lt, b.lt + dur); b.lt += dur; b.lon = !b.lon; }
    }
    function wander(b, t) { var wq = b.wq, f0 = b.f; return VAR.WANDER * Math.SQRT2 * (0.6 * Math.sin(TAU * t * f0 / wq[3] + wq[0]) + 0.6 * Math.sin(TAU * t * f0 / wq[4] + wq[1]) + 0.53 * Math.sin(TAU * t * f0 / wq[5] + wq[2])) / 1.0; }
    /* (physics: birds/phase) the bird ahead changed (a flock made, joined, split, re-led): the lock's target only, never
       a phase (the nudge, clipped to LOCK.MAXF, carries it there): lead null frees it. d the distance to the bird ahead (m), U
       the speed, off the lead's clock ahead of this one's (its age less this bird's), phase the cycle's offset (LOCK.PHASE
       behind a side position, 0.46 directly behind) */
    function relock(b, lead, d, U, off, phase) {
      if (!lead || lead === b) { b.lead = null; return; }
      b.lead = lead; if (!b.lock) b.lock = { d: 0, U: 1 }; b.lock.d = d; b.lock.U = U; b.loff = off || 0;
      b.delta = b.f * d / U + (phase === undefined ? LOCK.PHASE : phase);
    }
    function lockW(b, t) {
      var lk = 0, q, L = b.lockOn;
      if (!(b.lead && b.lock)) return 0;
      if (!b.pre && b.lt < t + 2) extendLock(b, t + 4);   // (under o.pre the lab's wake bouts, drawn to its end, and no more)
      for (q = 0; q < L.length; q += 2) { if (L[q] > t + 1) break; if (t >= L[q] - 1 && t <= L[q + 1] + 1) lk = Math.max(lk, ss(t - L[q] + 1) * (1 - ss(t - L[q + 1]))); }
      return lk;
    }
    /* the phase's polyline: a knot at every step the line from the last knot could no longer stay within PSI_TOL of */
    function knot(b, i, p) { var n = b.nk; if (n + 1 > b.KI.length) { b.KI = grow(b.KI, n + 1, Float64Array); b.KP = grow(b.KP, n + 1, Float64Array); } b.KI[n] = i; b.KP[n] = p; b.nk = n + 1; }
    function feed(b, i, p) {
      var c = b.cone;   // [i0, p0, smin, smax, the last step fed, its psi]
      if (b.nk === 0) { knot(b, i, p); c[0] = i; c[1] = p; c[2] = -Infinity; c[3] = Infinity; c[4] = i; c[5] = p; return; }
      var d = i - c[0], lo = (p - PSI_TOL - c[1]) / d, hi = (p + PSI_TOL - c[1]) / d;
      var nlo = Math.max(c[2], lo), nhi = Math.min(c[3], hi);
      if (nlo > nhi) {   // the cone closed: a knot at the last step, on the line (within PSI_TOL of its value)
        var dl = c[4] - c[0], s = Math.max(c[2], Math.min(c[3], (c[5] - c[1]) / dl)), kp = c[1] + s * dl;
        knot(b, c[4], kp); c[0] = c[4]; c[1] = kp; d = i - c[0];
        nlo = (p - PSI_TOL - c[1]) / d; nhi = (p + PSI_TOL - c[1]) / d;
      }
      c[2] = nlo; c[3] = nhi; c[4] = i; c[5] = p;
    }
    /* psi at step index x (fractional): the knots, and the open segment's line through the cone */
    function psiAtI(b, x) {
      var c = b.cone, n = b.nk;
      if (x >= c[0]) { if (x >= c[4] || c[4] <= c[0]) return x >= c[4] ? c[5] : c[1]; var s = Math.max(c[2], Math.min(c[3], (c[5] - c[1]) / (c[4] - c[0]))); return c[1] + s * (x - c[0]); }
      if (x <= b.KI[0]) return b.KP[0];
      var lo = 0, hi = n - 1, mm;   // (KI[n - 1] = c[0] > x)
      while (hi - lo > 1) { mm = (lo + hi) >> 1; if (b.KI[mm] <= x) lo = mm; else hi = mm; }
      return b.KP[lo] + (b.KP[hi] - b.KP[lo]) * (x - b.KI[lo]) / (b.KI[hi] - b.KI[lo]);
    }
    /* the loop, LB.bird's, one step at a time from b.i + 1 to step n */
    function run(b, n) {
      var L = b.L, sc = b.sc, dt = b.dt, f0 = b.f, D = b.D, mid = D + 0.5 * (1 - D);
      for (var i = b.i + 1; i <= n; i++) {
        var t = b.from + i * dt;
        var bj = Math.floor(L.Psi), u = L.Psi - bj, jj = bix(b, bj), fb = L.boutF * (sc.cont ? 1 + wander(b, t) : 1);
        var fi = fb / (1 + b.EPS[jj]);
        var lk = b.lead && b.lock ? lockW(b, t) : 0;
        if (lk > 0 && b.lead) {
          var ld = b.lead, li = Math.max(0, Math.round((t + (b.loff || 0) - ld.from) / ld.dt));   // (the lead's own clock: its age, loff ahead of this bird's)
          ensure(ld, ld.from + (li + 1) * ld.dt);
          if (flAtStep(ld, li) && L.inBout) { var err = (psiAtI(ld, li) - b.delta) - L.Psi; err = err - Math.round(err); fi += clip(LOCK.GAIN * f0 * err, LOCK.MAXF * f0) * lk; }
        }
        var paused = 0;
        if (L.hold > 0) { L.hold -= dt; paused = 1; }
        else {
          var Psi1 = L.Psi + fi * dt;
          if (L.inBout && b.PAU[jj] > 0 && L.beatPaused !== bj && u < mid && Psi1 - bj >= mid) { Psi1 = bj + mid; L.hold = b.PAU[jj] / fi; L.beatPaused = bj; }
          L.Psi = Psi1;
        }
        /* the pauses: [first step held, last step held] */
        var PA = b.PA;
        if (paused) { if (PA.length && PA[PA.length - 1] === i - 1) PA[PA.length - 1] = i; else PA.push(i, i); }
        var x = L.Psi - L.s0;
        if (L.inBout) {
          if (!sc.cont && x >= L.nb + 0.1 + RAMP.E_OUT) { L.inBout = false; b.BO[b.BO.length - 4] = i; newGlide(b); }   // (this step's a, e still the bout's: AE[i], EE[i] as the lab stores them)
        } else {
          L.glideLeft -= dt;
          if (L.glideLeft <= 0 && fr(L.Psi) > 0.97) { newBout(b); b.BO.push(i, -1, L.s0, L.nb, 0); }   // (this step's a, e 0, its flag 1: as the lab's)
        }
        feed(b, i, L.Psi);
        b.i = i;
      }
    }
    function ensure(b, t) { var n = Math.ceil((t - b.from) / b.dt) + 1; if (n > b.i) run(b, n); }
    /* the history before t dropped, so a bird's wing holds a few seconds, not its whole life (reads at t or later unchanged) */
    function shift(A, k, n) { for (var q = 0; q + k < n; q++) A[q] = A[q + k]; }
    function trim(b, t) {
      var cut = Math.floor((t - b.from) / b.dt) - 2, k, m;
      if (cut <= 0 || cut > b.i || b.nk < 2) return;
      for (k = 0; k + 1 < b.nk && b.KI[k + 1] <= cut; k++);
      if (!b.NBW) { var s = Math.floor(psiAtI(b, cut)) - 1 - b.boff; if (s > 0 && s < b.nbt) { shift(b.EPS, s, b.nbt); shift(b.KK, s, b.nbt); shift(b.PAU, s, b.nbt); b.nbt -= s; b.boff += s; } }
      if (k > 0) { shift(b.KI, k, b.nk); shift(b.KP, k, b.nk); b.nk -= k; }
      for (m = 0; 5 * m < b.BO.length && b.BO[5 * m + 1] >= 0 && b.BO[5 * m + 1] < cut; m++);
      if (m) { shift(b.BO, 5 * m, b.BO.length); b.BO.length -= 5 * m; }
      for (m = 0; 2 * m < b.PA.length && b.PA[2 * m + 1] < cut; m++);
      if (m) { shift(b.PA, 2 * m, b.PA.length); b.PA.length -= 2 * m; }
    }
    /* the bout holding step i for the flag (FL[i] = 1 for start <= i < end), and for the envelopes (start < i <= end) */
    function boutAt(b, i, env) {
      var B = b.BO;
      for (var k = B.length - 5; k >= 0; k -= 5) {
        var s = B[k]; if (s > i) continue;   // (bouts in order, never overlapping: the latest begun at or before i is the only one that may hold it)
        var e = B[k + 1] < 0 ? Infinity : B[k + 1];
        return (env ? i > s && i <= e : i < e) ? k : -1;
      }
      return -1;
    }
    function flAtStep(b, i) { return boutAt(b, i, false) >= 0 ? 1 : 0; }
    function envAt(b, i, which) { return envOf(b, boutAt(b, i, true), psiAtI(b, i), which); }   // a (0) or e (1) at step i as the loop stores them
    function envOf(b, k, psi, which) {   // ... with the bout k holding it and psi there
      if (k < 0) return 0;
      var x = psi - b.BO[k + 2], nb = b.BO[k + 3];
      return which ? ss(x / RAMP.E_IN) * (1 - ss((x - nb - 0.1) / RAMP.E_OUT)) : ss(x / RAMP.A_IN) * (1 - ss((x - nb) / RAMP.A_OUT));
    }
    function pausedAt(b, i) { var A = b.PA; for (var k = A.length - 2; k >= 0; k -= 2) { if (i >= A[k] && i <= A[k + 1]) return 1; if (A[k + 1] < i) return 0; } return 0; }
    /* ---- LB.state, on this storage ---- */
    var S0 = { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 };
    function state(b, t, S) {
      S = S || S0;
      var x = (t - b.from) / b.dt, i = Math.floor(x), w = x - i;
      if (i < 0) { i = 0; w = 0; }
      ensure(b, b.from + (i + 2) * b.dt);
      var p0 = psiAtI(b, i), p1 = psiAtI(b, i + 1);   // (each read once: the same sums as reading them where they are used)
      var psi = p0 + (p1 - p0) * w, bj = Math.floor(psi), j0 = bix(b, bj), j1 = b.NBW ? (j0 + 1) % b.NBW : bix(b, bj + 1);
      S.psi = psi; S.ph = psi - bj; S.flap = flAtStep(b, w < 0.5 ? i : i + 1);
      var k0 = boutAt(b, i, true), k1 = boutAt(b, i + 1, true);
      var a0 = envOf(b, k0, p0, 0), a1 = envOf(b, k1, p1, 0), e0 = envOf(b, k0, p0, 1), e1 = envOf(b, k1, p1, 1);
      S.a = a0 + (a1 - a0) * w; S.e = e0 + (e1 - e0) * w;
      S.k = b.KK[j0] + (b.KK[j1] - b.KK[j0]) * ss(S.ph);
      S.D = b.D / (1 + b.EPS[j0]);
      var kb = boutAt(b, i, false); S.beat = kb >= 0 ? Math.floor(p0 - b.BO[kb + 2]) : -1;
      S.pause = pausedAt(b, i); S.lock = b.lead && b.lock ? lockW(b, b.from + i * b.dt) : 0;
      S.tuck = 0;
      return S;
    }
    /* ---- LB.pose, on that state ---- */
    var G22 = P.pose(), F22 = P.pose(), M22 = P.pose(), B3 = new Float64Array(3), K = { k: 1, D: 0.5 };
    /* (round 3, step 2) the glide, softened and alive (deg SD; HFOL the hand's share following the arm the other way;
       ROLL deg of the arms' difference at 10 deg/s of roll) and the gusts in wind (a gust every GUST_T s; a lift GUST_UP
       deg, settling over 0.35 s; a tuck GUST_TUCK deg for 0.35 s) */
    var GLIDE_KIND = {   // (round 3, kinds) arm dih, hand dih, arm swp, hand swp, tip dih (deg, added per side): kinds/tools/fit_glide.js
      goose: [-3.29, 7.73, -3.83, -7.83, -2.29], ibis: [-3.45, 6.73, -6.03, -6.85, -3.16], gull: [4.47, -3.64, 5.54, -39.16, -2.8],
      heron: [-8, -13.22, 2.03, -0.18, -9.33], crow: [-0.45, 4.76, -6.79, -1.32, 8.44], swallow: [-0.9, 4.96, 8.01, -30.82, -1.09],
      stork: [-1.5, 2.64, -6.27, -0.35, 6.95] };
    var FLAP_ROCK = 0.5, GLIDE_SOFT = [0.7, 0.65], GLIDE_TRIM = { BANK: 5, SYM: 7, HAND: 4, HFOL: 0.4, ROLL: 3, CURL: 3, SPREAD: 4 }, GUST_T = 25, GUST_UP = 7, GUST_TUCK = 9;
    function gustAt(b, t) {
      var tr = b.trim, ph = fr(tr[5] / TAU) * GUST_T, k0 = Math.floor((t - ph) / GUST_T), v = 0, k, h, te, dt;
      for (k = k0 - 1; k <= k0; k++) {
        h = fr(Math.sin(k * 12.9898 + tr[4] * 7.233) * 43758.5453); te = ph + k * GUST_T + 0.8 * GUST_T * h; dt = t - te;
        if (dt < 0 || dt > 2.5) continue;
        if (fr(h * 91.7) < 0.5) v += GUST_UP * (dt < 0.08 ? dt / 0.08 : Math.exp(-(dt - 0.08) / 0.35));   // (the wings lift at once, and settle)
        else if (dt < 0.35) v -= GUST_TUCK * Math.sin(Math.PI * dt / 0.35);   // (a tuck: both wings dropped a moment)
      }
      return v;
    }
    function poseS(b, S, t, out, body, o) {
      var kind = b.kind, gk = o && o.k !== undefined ? o.k : 1, sw = o && o.swing !== undefined ? o.swing : 1, j;
      var gso = GLIDE_SOFT;
      P.glide(kind, gso[0], G22);
      var lam0 = KM[kind].channels.tip_load ? KM[kind].channels.tip_load.a0 : 0, gw = 1 - S.e, tr = b.trim, sq = Math.sqrt(2 / 3);
      var GK = GLIDE_KIND[kind];   // (round 3, kinds: the kind's own M)
      for (var sd = 0; sd < 2; sd++) { G22[sd * P.NP + 4] *= gso[1]; G22[sd * P.NP + 7] += CURL_R * lam0; G22[sd * P.NP + 9] -= W.consts.TWT * lam0;
        if (GK) { G22[sd * P.NP] += GK[0]; G22[sd * P.NP + 4] += GK[1]; G22[sd * P.NP + 1] += GK[2]; G22[sd * P.NP + 5] += GK[3]; G22[sd * P.NP + 7] += GK[4]; } }
      /* (round 3, step 2) the glide's corrections, at the footage's size (GLIDE_TRIM): rocking, the arms' trims, the
         hands flexing against them, the arms unequal with the roll, the primaries' curl and splay, and gusts in wind */
      var GT = GLIDE_TRIM, b1 = TAU * t / tr[6] + tr[3], b2 = TAU * t / tr[7] + tr[4], b3 = TAU * t / tr[8] + tr[5];
      var sym = GT.SYM * sq * (Math.sin(TAU * t / tr[6] + tr[0]) + Math.sin(TAU * t / tr[7] + tr[1]) + Math.sin(TAU * t / tr[8] + tr[2]));
      var bank = GT.BANK * sq * (Math.sin(b1) + Math.sin(b2) + Math.sin(b3));
      var bRate = GT.BANK * sq * TAU * (Math.cos(b1) / tr[6] + Math.cos(b2) / tr[7] + Math.cos(b3) / tr[8]);   // (deg/s: + rolling right, the right wing going down)
      var hand = GT.HAND * sq * (Math.sin(TAU * t / tr[7] + tr[2] + 1.3) + Math.sin(TAU * t / tr[8] + tr[0] + 2.1) + Math.sin(TAU * t / tr[6] + tr[4] + 0.7)) - GT.HFOL * sym;
      var asy = Math.max(-2 * GT.ROLL, Math.min(2 * GT.ROLL, GT.ROLL * bRate / 10));
      var curl = GT.CURL * sq * (Math.sin(TAU * t / tr[8] + tr[3] + 0.9) + Math.sin(TAU * t / tr[6] + tr[1] + 2.4) + Math.sin(TAU * t / tr[7] + tr[5] + 1.7));
      var spr = GT.SPREAD * sq * (Math.sin(TAU * t / tr[7] + tr[0] + 0.4) + Math.sin(TAU * t / tr[8] + tr[2] + 2.9) + Math.sin(TAU * t / tr[6] + tr[5] + 1.1));
      var gust = o && o.rough ? o.rough * gustAt(b, t) : 0;
      if (gw > 0) {
        G22[0] += sym + asy + gust; G22[P.NP] += sym - asy + gust;
        G22[4] += hand - 0.5 * gust; G22[P.NP + 4] += hand - 0.5 * gust;
        G22[7] += curl; G22[P.NP + 7] += curl; G22[10] += spr; G22[P.NP + 10] += spr;
      }
      S.bank = bank * (gw + FLAP_ROCK * (1 - gw)); S.trim = sym;   // (round 3, alive: rocking while it beats too, at half the glide's)
      if (o && o.shut) for (j = 0; j < 2 * P.NP; j++) G22[j] = o.shut[j];   // (a bounding finch: its wings shut between bursts, no trims)
      if (body) { body[0] = 0; body[1] = o && o.shut ? 0 : S.bank; body[2] = 0; }
      var e = S.e * sw, a = S.a * sw;
      if (e > 0) {
        K.k = S.k * gk; K.D = S.D;
        LB.cycle(kind, S.ph, K, F22, B3);
        W.mean(kind, M22); M22[3] = Math.min(1, M22[3]); M22[P.NP + 3] = M22[3];
        for (j = 0; j < 2 * P.NP; j++) out[j] = G22[j] + e * (M22[j] - G22[j]) + a * (F22[j] - M22[j]);
        if (body) { body[0] = a * B3[0]; body[2] = a * B3[2]; }
      } else for (j = 0; j < 2 * P.NP; j++) out[j] = G22[j];
      return S;
    }
    function pose(b, t, out, body, o) { var S = state(b, t); return poseS(b, S, t, out, body, o); }
    /* the flapping bouts meeting [t0, t1], in seconds: [start, end ...] (an open bout's end Infinity) */
    function bouts(b, t0, t1, out) {
      ensure(b, t1);
      out.length = 0;
      var B = b.BO, k;
      for (k = 0; k < B.length; k += 5) {
        var s = b.from + B[k] * b.dt, e = B[k + 1] < 0 ? Infinity : b.from + B[k + 1] * b.dt;
        if (e < t0 || s > t1) continue;
        out.push(s, e);
      }
      return out;
    }
    /* the bout at or before t for the path's sink: its start a and end b (Infinity while it runs past t + cap), the end of
       the one before pe (-1e9 none), the next one's start n (Infinity none within cap), its index k (-1 none yet) */
    function around(b, t, cap, o) {
      ensure(b, t);
      var B = b.BO, k = -1, q, dt = b.dt, from = b.from, lim = t + cap;
      for (q = B.length - 5; q >= 0; q -= 5) if (from + B[q] * dt <= t) { k = q; break; }
      o.k = k; if (k < 0) return o;
      while (B[k + 1] < 0 && from + b.i * dt < lim) run(b, b.i + 240);
      while (B.length <= k + 5 && from + b.i * dt < lim) run(b, b.i + 240);
      o.a = from + B[k] * dt; o.b = B[k + 1] < 0 ? Infinity : from + B[k + 1] * dt;
      o.pe = k >= 5 ? from + B[k - 4] * dt : -1e9; o.n = B.length > k + 5 ? from + B[k + 5] * dt : Infinity;
      return o;
    }
    /* the bouts as stored (5 a bout: its first step (-1: begun before the first step), its end step (-1 while it runs), its
       phase origin, its length in beats, 0), integrated to t: for a path's sink worked out from the past alone */
    function boutsTo(b, t) { ensure(b, t); return b.BO; }
    /* the bird's day moved on by d s (a whole number of its steps) without working it out: every read after reads the
       wing as it was d s before (a bird out of sight paused its beat, and goes on from there) */
    function skip(b, d) { b.from += d; }
    return { make: make, relock: relock, skip: skip, state: state, pose: pose, poseS: poseS, bouts: bouts, around: around, boutsTo: boutsTo, ensure: ensure, trim: trim, psiAt: function (b, t) { ensure(b, t + b.dt); return psiAtI(b, (t - b.from) / b.dt); },
             knots: function (b) { return b.nk; }, CURL_R: CURL_R, PSI_TOL: PSI_TOL, LB: LB };
  }
  root.BIRDWING = BIRDWING;
  if (typeof module !== 'undefined' && module.exports) module.exports = BIRDWING;
})(typeof self !== 'undefined' ? self : this);
