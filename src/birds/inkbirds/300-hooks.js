  /* ---------------- the hooks ---------------- */

  weather(); r2 = vstream(2); r2x = r2(); r2y = r2(); errInit(); roostPsi = TAU * vstream(7001)();
  makeProgram();   // (asked for now: the engine links it while its still sky shows)
  return {
    step: step,
    /* (round 3) reduced motion: the still sky planned a share a call while the engine's still sky shows; true once done */
    prepare: function () { forcedCheck(); if (!HOST.reduced()) return true; return stillStep(STILL_Q); },
    draw: function () {
      forcedCheck();
      if (!ready()) return;
      if (!FORCED && !HOST.bindTextures()) return;
      if (HOST.reduced()) stillSky();
      if (FORCED) { HOST.view(VW); forcedCam(); }
      drawPaper();
    },
    visit: function () { clearAll(); guestReset(); CVH.n = 0; CVH.i = 0; },
    reset: function () { roostPsi = TAU * vstream(7001)(); roostCls = ''; roostK = 0; LPEND = null; guestReset(); t = 0; flightNo = 0; crowdN = 0; HIDJOB = -1e9; weather(); r2 = vstream(2); r2k = 0; r2x = r2(); r2y = r2(); WK[20] = -1; dirty = true; clearAll(); errInit(); CH.n = 0; CH.i = 0; GVT = -1; calmOn = -1; STILL.on = false; CVH.n = 0; CVH.i = 0; stageReset(); },
    lost: function () { PROG = null; VAO = null; VBO = null; RING = null; BT = null; BROKEN = false; SAMPLERS = false; makeProgram(); },
    boot: function () { makeProgram(); bootRing(); },   // (E1: the boot's stage B: the instance ring and its warm entry)
    repose: function () { lastDraw = -1; },   // (development: the next draw poses every bird afresh)
    /* development: the model measured (a kind's box table), pins, the A/B switch and a frame's dump */
    dev: {
      measure: function (kind, fresh) { return measureNorm(kind, fresh); },
      /* (physics) the one tone two ways for random facets and lights: oneTone against facetpose's own light()'s ONE */
      oneCheck: function (n) { var r = LB.rng(99), d = 0, N = new Float64Array(3 * NFAC), FE = new Float64Array(3 * NFAC), A = new Float64Array(NFAC), e = [0, 0, 1];
        function u3(o, i) { var x = r() * 2 - 1, y = r() * 2 - 1, z = r() * 2 - 1, l = Math.sqrt(x * x + y * y + z * z) || 1; o[i] = x / l; o[i + 1] = y / l; o[i + 2] = z / l; }
        for (var q = 0; q < (n || 200); q++) { for (var f = 0; f < NFAC; f++) { u3(N, 3 * f); A[f] = r() * 10; } u3(e, 0); var L = { sunDir: [0, 0, 1], sunVis: r(), sunC: [r() * 2, r() * 2, r() * 2], ambU: [r(), r(), r()], ambD: [r(), r(), r()], clLit: [r(), r(), r()] }; u3(L.sunDir, 0);
          var a = FP2.light('gull', N, e, L, FE, A), b = oneTone(N, e, L, A); for (var k = 0; k < 3; k++) d = Math.max(d, Math.abs(a[k] - b[k])); }
        return d; },
      pins: function (list) { PINS = list || []; },
      trim: function (v) { if (v !== undefined) LEAN_TRIM = +v; return LEAN_TRIM; },
      dump: function (on) { DUMP = on ? [] : null; },
      frame: function () { return DUMP ? DUMP.slice() : null; },
      stage: function (o) { return stageDev(o); },
      cam: function () { return { v: Array.from(CAMV), a: Array.from(CAMA), n: CVH.n }; }
    },
    state: function (o) {
      if (o && o.fx) for (var k in o.fx) FX[k] = !!o.fx[k];
      if (o && o.trim !== undefined) LEAN_TRIM = +o.trim;
      if (o && o.set !== undefined) SET_ON = !!o.set;   // (fix round, dev: the tattoo's set off for the A film)
      if (o && o.wind !== undefined) WIND_ON = !!o.wind;   // (way-other, dev: the air still, as before, for the A runs)
      if (o && o.windAir !== undefined) WIND_K = Math.max(0, +o.windAir) / 6.5;   // (shape, dev: the world's wind as if it blew this many m/s at the birds' height)
      if (o && o.leanair !== undefined) LEAN_AIR = !!o.leanair;
      if (o && o.leanh !== undefined) LEAN_H = clamp(+o.leanh, 0, 1);   // (shape, dev: step 4d's share, for its trial)
      if (o && o.lean !== undefined) { var lo0 = o.lean; if (lo0.w !== undefined) LEAN_W = +lo0.w; if (lo0.mode !== undefined) LEAN_MODE = +lo0.mode; if (lo0.psi) LEAN_PSI = lo0.psi.slice(); if (lo0.pace !== undefined) LEAN_PACE = +lo0.pace; }   // (shape, dev: step 6's dials, for their trials)   // (shape, dev: the join off, the planner's lean in still air)
      if (o && o.sep !== undefined) SEP_ON = !!o.sep;   // (fix round, dev: the separation off)
      if (o && o.rate !== undefined) RATE_MODE = o.rate === 'real' || o.rate === 'scaled' ? o.rate : 'class';   // (physics, dev: the owner's decision 1, for the next flights)
      if (o && o.sched !== undefined) SCHED_MODE = o.sched === 'calm' || o.sched === 'continuous' ? o.sched : 'measured';   // (physics, dev: decision 2)
      if (o && o.dump !== undefined) DUMP = o.dump ? [] : null;
      if (o && o.guest !== undefined) { var go = o.guest; if (go.dev) GDEV = go.dev; if (go.force) GU.force = go.force; if (go.on !== undefined) GU.on = !!go.on; if (go.clicks !== undefined) GU.clickOn = !!go.clicks; if (go.next !== undefined) GU.nextWord = +go.next; if (go.log) return { log: GU.log.slice(), list: GU.list.map(function (g) { return { id: g.id, why: g.why, phase: g.phase, kind: g.kind, last: g.last || null, tO: g.tO, tT: g.tT, t0: g.t0 }; }), nWord: GU.nWord, nPtr: GU.nPtr, sp: GU.sp, restT: GU.restT }; return true; }
      if (o && o.roost) return { psi: roostPsi, cls: skyCls(), flights: flights.map(function (F) { return { id: F.id, cls: F.cls, roost: F.roost, kind: F.kind, sort: F.sort, n: F.n, eg: F.eg || null, egSet: F.egSet || 0 }; }) };
      if (o && o.pins !== undefined) PINS = o.pins || [];
      if (o && o.stage !== undefined) return stageDev(o.stage);
      if (o && o.next !== undefined) { NEXT_FORCE = o.next; if (o.now) { tNext = Math.min(tNext, t); firstNext = true; } return true; }
      if (o && o.frame) return DUMP ? DUMP.slice() : null;
      if (o && o.leanprobe) return leanProbe();   // (shape, dev: the join's test: leanAir's five points for every drawn travelling bird, now)
      if (o && o.pose) { forcedCheck(); NOGL = true; try { if (HOST.reduced()) stillSky(); drawPaper(); } finally { NOGL = false; } return DUMP ? DUMP.slice() : null; }   // (way-path, dev: a frame's poses and dump without its draw: a ticked survey)
      if (o && o.trials !== undefined) { var tl = TRIALLOG; TRIALLOG = o.trials ? [] : null; if (tl) return tl; }
      if (o && o.guardlog !== undefined) { var gl0 = GLOG; GLOG = o.guardlog ? [] : null; if (gl0) return gl0; }
      var C = camDrawn(), CS0 = camStep();
      var out = { t: t, flights: [], drawn: STATS.drawn, planned: STATS.planned, steps: STATS.steps, workMax: STATS.workMax, costs: STATS.costs, landed: Object.assign({}, STATS.landed), fails: Object.assign({}, STATS.fails), jobs: (o && o.jobs) ? STATS.jobs.slice() : undefined,
        guard: Object.assign({}, STATS.guard), away: STATS.away, err90: [1, 2, 4, 6, 8, 10, 12, 15, 20].map(function (h) { return +errAt(h).toFixed(2); }), calm: calmOn,
        job: job ? job.mode : null, tNext: tNext, fx: Object.assign({}, FX), fills: STATS.fill || 0, lv: { on: liveOn(), made: STATS.lvMade || 0, nospawn: STATS.lvNoSpawn || 0, drop: STATS.lvDrop || 0, gone: STATS.lvGone || 0, rescue: STATS.lvRescue || 0, avoid: STATS.lvAvoid || 0, words: STATS.landed.words || 0, why: STATS.lvWhy || null, last: STATS.lvSeenLast || null }, W: W, H: H, mpu: MPU, forced: FORCED, openSky: OPEN_SKY, fit: FIT_K, trim: LEAN_TRIM, set: SET_ON, sep: SEP_ON, stage: stageState(), rate: RATE_MODE, sched: SCHED_MODE,
        cam: { f: cam.f, pitch: Math.atan2(cam.s, cam.c), floorY: floorY },
        CB: CS0 ? { pos: Array.from(CS0.pos), f: Array.from(CS0.f), r: Array.from(CS0.r), u: Array.from(CS0.u) } : null,
        CD: C ? { pos: Array.from(C.pos), f: Array.from(C.f), r: Array.from(C.r), u: Array.from(C.u) } : null,
        VW: { tanX: VW.tanX, tanY: VW.tanY, dpr: VW.dpr, bdpr: VW.bdpr, cssW: VW.cssW, cssH: VW.cssH, outW: VW.outW, outH: VW.outH },
        FL: { view: FL.view, psi: FL.psi, speed: FL.speed, y: FL.y, ground: FL.ground } };
      FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
      flights.concat(PLACES).forEach(function (F) {
        var tau = t - F.t0, b = [];
        F.m.forEach(function (m) {
          where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
          var s = m.s, pl = null;
          if (!F.place) { spot(F, m, tau, tmp2); pl = [+tmp2.x.toFixed(2), +tmp2.y.toFixed(2)]; }   // (where the planner's still view sees it: against the world)
          b.push({ pl: pl, x: +tmp3.x.toFixed(2), y: +tmp3.y.toFixed(2), n: +tmp3.n.toFixed(3), z: +tmp3.z.toFixed(1), w: [+wb.x.toFixed(2), +wb.y.toFixed(2), +wb.z.toFixed(2)], on: !!(s && s.on), op2: s ? +(s.lastOp || 0).toFixed(4) : 0, app: s ? s.lastApp : 0, sb: s ? s.lastSB : 1,
            shown: s ? s.shownT : -1, vis: s ? s.vis : false, hw: m.d.hw, hh: m.d.hh, face: s ? s.face : 0, wf: s ? +s.wf.toFixed(2) : 0, ph: beat(m, tau), wg: wingDev(m, tau), span: +(m.d.span * MPU).toFixed(2), roll: s ? +s.roll.toFixed(2) : 0, spanPx: s ? +(s.spanPx || 0).toFixed(2) : 0, box: s && s.on ? [+s.bx0.toFixed(1), +s.by0.toFixed(1), +s.bx1.toFixed(1), +s.by1.toFixed(1)] : null });
        });
        out.flights.push({ id: F.place ? 'p' + F.key : F.id, kind: F.live ? F.pat : F.kind, beh: F.beh || null, sort: F.sort, n: F.n, dir: F.dir, role: F.role || null, ws: F.ws === undefined ? null : +F.ws.toFixed(3), wsKind: F.wsKind || null, dirRole: F.dirRole || 0, swept: !!F.swept, tau: +tau.toFixed(2), dur: +F.dur.toFixed(2), v: F.v, vPx: F.vPx, n0: F.n0, gone: F.gone || 0, place: !!F.place, stage: F.stage || null, gift: !!F.gift, near: !!F.near,
          yawW: F.place ? null : F.yaw, tat: F.tattoo === undefined ? null : +(+F.tattoo).toFixed(4), lean: !!F.lean, path: F.path && !F.place ? { h: F.path.h, k: F.path.k, s1: F.path.s1, s2: F.path.s2, g: F.path.g, x: F.path.x, y: F.path.y, z: F.path.z, sa: F.sa, len: F.len, s0: F.s0, q: F.q } : null, lastSeen: F.lastSeen, firstSeen: F.firstSeen, enterT: F.enterT, seenSpan: F.seenSpan, away: !!F.away, birds: b });
      });
      return out;
    }
  };
  });
})();
