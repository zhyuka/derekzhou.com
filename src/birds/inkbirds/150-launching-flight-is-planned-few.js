  /* ---------------- launching: a flight is planned a few paths a frame ---------------- */

  var job = null, q = {};

  /* a new flight: mode 'first' (it enters soon after load), 'next' (the
     scheduler's), 'still' (the composed still sky) */
  /* (startJob: the module's, i5_plan.js) */
  /* (and again after the page moved: what was tried was tried on the old page) */
  function resetJob0() {
    var i, h = 0;
    for (i = 0; i < flights.length; i++) h = Math.max(h, flights[i].dur - (t - flights[i].t0));
    job.t = t + (job.mode === 'next' ? LEAD : 0);           // when the flight sets off
    job.c = 0; job.a = 0; job.best = -1; job.keep = null; job.it = null; job.bands = null;
    job.ahead = job.mode !== 'still' && flights.length ? { t1: job.t, until: t + h, rows: [], cost: 0 } : null;
  }

  /* a path in the air (or a thermal) for the job's flight; true if it is worth a trial */
  /* (propose: the module's, i5_plan.js) */
  /* a trial passed: keep the roomiest path */
  /* (judge: the module's, i5_plan.js) */

  /* work on the job, `quota` bird-steps' worth; the flight once it is in the
     sky, else null (and job null too when nothing found room) */
  /* (workJob: the module's, i5_plan.js) */

  /* (life, DESIGN 3.2) the event glides, found in the path when it is committed: a turn of 25 deg or more entered gliding
     (gull, crow, ibis, swallow 70 %; goose, heron 35 %), from 0.5-1 s before it through it; a descent of 2 deg or more
     glided (set wings), at most EG_DESC s of it. Each bird starts WAVE_DELAY after the bird ahead (nearest first), so a
     flight's glide ripples rather than switches. egW: the glide's weight now, eased in and out over 0.45 s */
  var EG_TURN = { gull: 0.3, crow: 0.3, ibis: 0.3, swallow: 0.5, goose: 0.5, heron: 0.5 }, EG_DESC = { gull: 3, crow: 2.5, ibis: 2, swallow: 2, goose: 2.5, heron: 2.5 }, EG_DESC_P = { gull: 0.35, crow: 0.3, ibis: 0.25, swallow: 0.3, goose: 0.45, heron: 0.45 }, EG_RAMP = 0.45;   // (round 3, kinds: the geese's and herons' only glides, so taken more often: turns 0.12 -> 0.5, descents 0.15 and 0.2 -> 0.45)
  var EGW = { x: 0, y: 0, z: 0 }, EGW2 = { x: 0, y: 0, z: 0 };
  function eventGlides(F) {
    F.eg = []; F.egSet = 0;
    if (F.place || F.soar || !F.m || F.cls === 'day' || F.still) return;
    var m0 = F.m[0], dtS = 0.25, T = F.dur, hs = [], sk = [], i, k = kindOf(F), r = vstream(7100 + (F.id | 0));
    for (var tau = 0; tau <= T; tau += dtS) { where(F, m0, tau, EGW); where(F, m0, tau + dtS, EGW2); var vx = EGW2.x - EGW.x, vy = EGW2.y - EGW.y, vz = EGW2.z - EGW.z; hs.push(Math.atan2(vx, vz)); sk.push(Math.atan2(vy, Math.sqrt(vx * vx + vz * vz))); }
    /* turns: runs where the heading turns faster than 3 deg/s, their whole turn */
    var run0 = -1, tot = 0;
    for (i = 1; i < hs.length; i++) {
      var dh = angDiff(hs[i], hs[i - 1]) / dtS / DEG, on = Math.abs(dh) > 3;
      if (on) { if (run0 < 0) { run0 = i; tot = 0; } tot += dh * dtS; }
      if ((!on || i === hs.length - 1) && run0 >= 0) { if (Math.abs(tot) >= 25 && r() < (EG_TURN[k] || 0.5)) F.eg.push([run0 * dtS - pick(r, [0.5, 0.8]), i * dtS, 'turn']); run0 = -1; }
    }
    /* descents: runs sinking 2 deg or more */
    run0 = -1;
    for (i = 0; i < sk.length; i++) {
      var dn = sk[i] < -2 * DEG;
      if (dn && run0 < 0) run0 = i;
      if ((!dn || i === sk.length - 1) && run0 >= 0) { var a = run0 * dtS, b = i * dtS; if (b - a >= 2 && r() < (EG_DESC_P[k] || 0.2)) { var len = Math.min(b - a, (EG_DESC[k] || 4) * pick(r, [0.7, 1.15])), st = a + (b - a - len) * r(); F.eg.push([st, st + len, 'set']); } run0 = -1; }
    }
    if (k === 'goose') F.egSet = pick(r, [6, 10]);
    /* the wave: each bird's own start, after the bird ahead */
    var order = F.m.map(function (m, j) { return [m.lag || 0, j]; }).sort(function (a, b) { return a[0] - b[0]; });
    for (i = 0; i < order.length; i++) F.m[order[i][1]].egD = i * pick(r, WAVE_DELAY) * (i ? 1 : 0);
  }
  function evGlide(F, m, tau) {
    var E = F.eg; if (!E || !E.length) return 0;
    var d = m.egD || 0, w = 0;
    for (var i = 0; i < E.length; i++) { var a = E[i][0] + d, b = E[i][1] + d; if (tau > a - EG_RAMP && tau < b + EG_RAMP) w = Math.max(w, ease(clamp((tau - a + EG_RAMP) / EG_RAMP, 0, 1)) * ease(clamp((b + EG_RAMP - tau) / EG_RAMP, 0, 1))); }
    return w;
  }
  function commit(F, t1) {
    eventGlides(F);
    var i, j;
    makeRoom(F.m.length);   // (round 3: the birds of a flight the view has turned from, if they are needed)
    F.t0 = t1 - F.from;
    for (i = 0, j = 0; i < slots.length && j < F.m.length; i++) {
      if (slots[i].busy) continue;
      slots[i].busy = true;
      F.m[j].s = slots[i];
      dress(slots[i], F.m[j].d, Math.max(F.m[j].nTry, F.n0) * 1.04);   // its paper: room for it at its nearest
      j++;
    }
    flights.push(F);
  }

  function land(F) {
    F.m.forEach(function (m) { if (m.s) { hide(m.s); m.s.busy = false; m.s = null; } });
    var k = flights.indexOf(F);
    if (k >= 0) flights.splice(k, 1);
  }
  function clearSky() { while (flights.length) land(flights[0]); }
  /* (fix round) any bird of a flight drawn (its ink over 0.02) on the last frame */
  function drawnNow(F) { for (var i = 0; i < F.m.length; i++) { var s = F.m[i].s; if (s && s.on && s.lastOp > 0.02) return true; } return false; }
  var LATE_T = 2;   // s: a flight still drawn at its end fades together over this long

