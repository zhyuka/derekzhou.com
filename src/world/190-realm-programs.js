  /* ---------------------------------------------------------------- a realm's programs (kept for the page's life) */
  /* each realm's programs are compiled once, when it is first needed, and kept: a realm met again links nothing */
  /* the realm's GLSL hooks, found by name: its own sky (vec3 skyHook(vec3 rd, vec3 c)), its emission's flicker
     (float emitMod(vec3 p, vec4 col, float e, float phase)), water (it calls waterShade: the composite then reflects
     the nearby forms into it) */
  function realmHooks(def) {
    var g = def.glsl || '', h = '';
    if (/\bskyHook\s*\(/.test(g)) h += '#define SKY_HOOK\n';
    if (/\bemitMod\s*\(/.test(g)) h += '#define EMIT_HOOK\n';
    def.water = /\bwaterShade\s*\(/.test(g);
    return h;
  }
  function realmProgs(def) {
    if (def.P) return def.P;
    var hk = realmHooks(def);
    var pre = HEAD + hk + FRAME_U + LIB + (def.glsl || '') + '\n', preG = HEAD + hk + FRAME_U + LIB + GROUND_LIB + (def.glsl || '') + '\n', i;
    var surfs = def.surfaces, P = { list: [], k: 0, st: 1, surf: [] };
    function C(vs, fs, name) { var p = compile(vs, fs, def.id + '.' + name); P.list.push(p); return p; }
    var HPS = surfs[0] && surfs[0].split ? HP_SITES_FN(def.glsl || '') : null;   // (fast500 lane G: the sites' part of the realm's own D_Hd)
    if (surfs[0] && surfs[0].split && !HPS) fail('split height: D_Hd is not of the split shape (the programs as today)');
    var HSH = !!(HPS && surfs[0].height === 'Hd' && surfs[0].levels === 10 && GN === 96), HSP = HSH && EXT.hp;   // (HSH: the sources carry both bodies, on every device; HSP: this device runs the split, HPSPLIT in its DEFS)
    for (i = 0; i < surfs.length; i++) P.surf.push({ P: C(pre + (HSH && HP_LAND && i === 0 ? '\n#ifdef HPSPLIT\n' + VS_TERRAIN_SPLIT(surfs[i].gap) + '\n#else\n' + VS_TERRAIN(surfs[i].height, surfs[i].gap) + '\n#endif\n' : VS_TERRAIN(surfs[i].height, surfs[i].gap)), pre + FS_TERRAIN(surfs[i].height, surfs[i].shade), 'surface' + i), g0: surfs[i].g0 || 0.5, levels: surfs[i].levels || 10, split: HSP && HP_LAND && i === 0, yb: surfs[i].yb || null });
    P.hp = HSP ? HP_PROGS.map(function (n) { return C(VS_FULL, pre + (n === 'sites' || n === 'sitesX' ? HPS : '') + HP_GRIDW + HP_MAIN[n], 'hp.' + n); }) : null;
    var LMSC = !!(def.scatter && def.scatter.length) && (def.scatterShade || def.landmarkShade || 'shadeStone') === (def.landmarkShade || 'shadeStone');   // (world-perf lane: one program where they shade alike)
    P.lm = C(LMSC ? preG + VS_LMSC : pre + VS_LANDMARK, pre + FS_LANDMARK(def.landmarkShade || 'shadeStone'), 'landmark');
    P.pr = C(VS_FULL, pre + (HSH ? '\n#ifdef HPSPLIT\n' + FS_PROBE_SPLIT + '\n#else\n' + FS_PROBE(surfs[0].height, def.camGround || null, def.probeHgt || null) + '\n#endif\n' : FS_PROBE(surfs[0].height, def.camGround || null, def.probeHgt || null)), 'probe');   // (one source on every device: the body chosen by DEFS)
    P.sc = LMSC ? P.lm : def.scatter && def.scatter.length ? C(preG + VS_SCATTER, pre + FS_LANDMARK(def.scatterShade || def.landmarkShade || 'shadeStone'), 'scatter') : null;
    P.pt = def.particles ? C(HEAD + hk + FRAME_U + LIB + GROUND_LIB + VS_PARTICLE, HEAD + hk + FRAME_U + LIB + FS_PARTICLE, 'particle') : null;   // (fast500 step 8: without the realm's GLSL, which the particles never call)
    P.rb = def.ribbons ? C(preG + VS_RIBBON, preG + FS_RIBBON, 'ribbon') : null;
    P.sky = /SKY_HOOK/.test(hk) ? C(VS_FAR, pre + SKY_BODY, 'sky') : null;
    P.lmi = def.sets ? C(pre + VS_LANDMARK_INST, pre + FS_LANDMARK(def.landmarkShade || 'shadeStone'), 'landmarkInst') : null;
    def.P = P;
    return P;
  }
  /* (E1) a realm's programs are registered at the boot's stage C with every other program, and made with them (compile
     all, link all, flush, status last: progStep); here only their status is read: 2 once every one is linked, -1 if
     one is broken (the realm is then set aside, its visits planned again), 1 while the boot is still making them */
  function linkStep(def) {
    var P = realmProgs(def);
    if (P.st === 2 || P.st === -1) return P.st === 2;
    for (var i = 0; i < P.list.length; i++) { var Q = P.list[i]; if (Q.late && Q.st !== 3) continue; if (Q.st !== 3) return false; if (!Q.ok) { P.st = -1; return false; } }
    P.st = 2;
    return true;
  }
  /* (world6) the world's programs will not build here (a driver's quirk): the world gives up, the still sky stays */
  function setAside(V) {
    V.def.bad = true; freeVisit(V);
    DEAD = true; stop(); shown = false; canvas.classList.remove('on'); clearWords();
  }

  /* (fast500 F, PLAN500 step 11; the owner's OK: "Background worker") THE FIRST PLAN IN A WORKER. The plan (mapsInit:
     the maps, the director and its first tick; the weights' grids about the landing, KW/KG/KF, whole) is pure CPU and
     the boot's longest task (0.43-0.72 s desktop, 1.5-2.5 s at 4x). One same-origin worker (plan.js, made by
     tools/plan.mjs from this file's own code spans, verbatim) makes it while the page evaluates the other scripts, makes
     its context and issues its programs, and hands it back: the director's state, the four gradient maxima and the
     grids' arrays (transferred). planVisit adopts it only if it is this world's (the worker's stamp is PW_V, the
     spans' md5), this seed's, the camera at the landing and no grid made yet; the World and Director are then made
     from it (no search, landing or calibration again) and kwFollow finds every texel made. The plan is the same
     doubles either way. Anything else (no Worker, an error, an answer for another seed or world, PW_WAIT ms gone, a
     sync build): the page makes the plan itself, as before, and a late answer is dropped */
  var PW_V = 'cd84f7ee1d19';
  /* (world-perf lane) IN TWO ANSWERS. The worker answers first with what the first frame reads (planFirst: mapsInit,
     the first tick whole, kwFirst's texels about the landing for the widest view any window has), the page adopting
     it as kwFirst would have left its own grid (KW.part, KWR: the guards derive any texel read before the rest); then
     it bakes the rest of the window and answers again, and the page takes each texel of that it has not made itself
     (the same doubles: a texel is a pure function of its place). While the rest is due the page bakes none of it in
     flight (planRestDue): the main thread stays free. No second answer (an error, PW_WAIT twice over): the page's own
     in-flight rest, as before */
  var PW = { w: null, st: 0, seed: 0, t0: 0, msg: null, ms: -1, rest: 0, restMs: -1, restN: 0 }, PW_WAIT = 8000;   // (st: 0 none, 1 working, 2 first answer in, 3 done with it; rest: 0 none, 1 due, 2 taken)
  function planWorker() {
    if (PW.st || typeof Worker !== 'function') return;
    try {
      PW.seed = J.seed >>> 0; PW.t0 = clockNow(); PW.st = 1;
      var hw = HS ? HS.w : null; if (HS) HS.w = null;   // (hour.js's worker, its maps begun on this seed: taken; one begun on another (a dev seed) stopped)
      if (hw && HS.seed !== PW.seed) { hw.terminate(); hw = null; }
      PW.w = hw || new Worker('/plan.js');
      PW.w.addEventListener('message', function (e) {
        var m = e.data;
        if (!m || m.v !== PW_V || m.seed !== PW.seed) { planWorkerOff(); return; }
        if (m.part === 2) { if (PW.rest === 1) planRestAdopt(m); PW.w = null; return; }   // (the worker closes itself)
        if (PW.st !== 1) return;   // (a first answer the page no longer waits for: the rest still comes)
        PW.msg = m; PW.st = 2; PW.ms = clockNow() - PW.t0; PW.rest = 1;
      });
      PW.w.addEventListener('error', function () { planWorkerOff(); });
      PW.w.postMessage({ v: PW_V, seed: PW.seed, yaw: firstYaw(), half: Math.atan(Math.tan(FOV_LONG * DEG / 2)) + KW_MARGIN });   // (the widest view any window has: setFrustum's tanX is never over tl)
    } catch (e) { planWorkerOff(); }
  }
  function planWorkerOff() { if (PW.w) { try { PW.w.terminate(); } catch (e) { /* gone */ } } PW.w = null; PW.msg = null; PW.st = 3; PW.rest = 0; }
  /* the first answer no longer waited for (the first-paint hold makes the plan itself), the worker kept for the rest */
  function planWaitOff() { if (PW.st === 1) { PW.st = 3; PW.rest = PW.w ? 1 : 0; } }
  function planAdopt() {
    var m = PW.st === 2 ? PW.msg : null; PW.msg = null; if (PW.st === 2) PW.st = 3;   // (the worker kept: its rest is due)
    if (!m) return false;
    if (m.seed !== (J.seed >>> 0) || CS.x !== 0 || CS.z !== 0 || KW.ok || KW.part || KF.ok) { planWorkerOff(); return false; }
    mapsInit(J.seed, m.inj);
    KW.data = m.kw.data; KW.ix = m.kw.ix; KW.dx = m.kw.dx; KW.baked = m.kw.baked; KW.derived = m.kw.derived; KW.dirty = m.kw.dirty;
    KG.v = m.kg.v; KG.ix = m.kg.ix;
    KF.data = m.kf.data; KF.ix = m.kf.ix; KF.dx = m.kf.dx; KF.baked = m.kf.baked; KF.derived = m.kf.derived; KF.dirty = m.kf.dirty;
    kwAdoptFirst(m.first, m.kwr); if (!KW.part) PW.rest = 0;   // (the grid as the worker's kwFirst left it: its queues, the rest's order, KW.part)
    BOOT.planW = +PW.ms.toFixed(1);
    return true;
  }
  function planRestAdopt(m) { PW.rest = 2; PW.restMs = clockNow() - PW.t0; PW.restN = kwAdoptRest(m); }
  KWDUE = function () { return PW.rest === 1 && !!PW.w && clockNow() - PW.t0 < 2 * PW_WAIT; };   // (the page's: kwFollow bakes no rest in flight while the worker's is due)
