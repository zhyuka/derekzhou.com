  /* ---------------------------------------------------------------- the world's build, in stages */
  /* The plan (the maps and the director, the weights' grid about the landing, the light, the field), the programs, the
     ground at the origin (probed), the scatter's shapes; then the cells about the camera, through the
     streamer (cells.js). There is nothing after it: the world goes on as the camera flies (no visit follows). */
  function firstYaw() {   // the first frame's view yaw as arrive sets it (CS.yawV + CS.phi = CS.psi), read without drawing from any stream
    if (SIM.inited) return CS.yawV + CS.phi;
    if (DEVMODE && POSE) return POSE[2] * DEG;
    return airHeading0();
  }
  function planVisit(V) {
    if (V.light) return;
    var def = V.def;
    /* the maps and the director, the boot's commit about the landing, and the weights' grid about the camera (the first
       frame's texels first): the worker's first answer if it is in (KW as its kwFirst left it, the far field whole),
       else planFirst here, the one entry point */
    if (!MAPS.w) { if (planAdopt()) { if (KW.part) kfFollow(CS.x, CS.z, true); else kwFollow(CS.x, CS.z, true); } else planFirst(J.seed, CS.x, CS.z, firstYaw(), Math.atan(FRT.tanX) + KW_MARGIN); }
    else if (!KW.ok && !KW.part) kwFirst(CS.x, CS.z, firstYaw(), Math.atan(FRT.tanX) + KW_MARGIN); else kwFollow(CS.x, CS.z, true);
    V.rng = RNG(subseed(V.seed, 1)); V.rng2 = RNG(subseed(V.seed, 2));
    V.salt = subseed(V.seed, 7) >>> 0;
    V.speed = (def.speed || 12) * CAMK; V.clear = (def.clear || [6, 12, 120]).slice(); V.margin = def.margin || 14;
    V.field = def.field ? def.field(V.rng, V) : { params: [] };
    V.light = def.light(V.rng2, V);
    airKeySet(V.light);   // (215: the key, once)
    V.lightRaw = Object.assign({}, V.light);
    var r3 = RNG(subseed(V.seed, 3)); V.ph = [r3.r(0, 6.28), r3.r(0, 6.28), r3.r(0, 6.28), r3.r(0, 6.28)];
    prepLight(V);
    worldLights(V);   // (the kits' lights, blended by the climate about the camera)
  }
  /* each stage is CPU work (the slice after the frame's flush: no GL call) or GPU work (the jobs at the start of the
     next drawn frame); `kind` says which a call may run ('cpu', 'gpu'; sync or no kind: any) */
  var VSTAGES = [vsPlanW, vsLink, vsKW, vsOrigin, vsOriginRead, vsScatter, vsScatterUp];
  var VKIND = ['cpu', 'cpu', 'gpu', 'cpu', 'cpu', 'cpu', 'gpu'];
  function visitStep(V, sync, kind) {   // one stage's step (sync: all of them); true once the visit's own parts are built
    if (V.st >= VSTAGES.length) return true;
    if (V.failed || LOST || gl.isContextLost()) return false;
    if (!V.G) V.G = { bufs: [], vaos: [], texs: [] };
    while (V.st < VSTAGES.length) {
      if (!sync && kind && VKIND[V.st] !== kind) return false;
      var r = VSTAGES[V.st](V, sync);
      if (r === LOSTP) return false;
      if (r === 'fail') { V.failed = true; freeVisit(V); setAside(V); return false; }
      if (r) V.st++;
      if (!sync) break;
      if (!r) return false;
    }
    return V.st >= VSTAGES.length;
  }
  function vsPlanW(V, sync) { return !sync && PW.st === 1 && clockNow() - PW.t0 < PW_WAIT ? false : vsPlan(V); }   // (while the worker works, the boot goes on)
  function vsPlan(V) { planVisit(V); if (!BOOT.planM) { BOOT.planM = true; bootMark('plan: done'); } return true; }   // (the mark)
  function vsKW() { kwUpload(); return true; }   // (the weights' grid onto the GPU before anything is probed)
  function vsLink(V) {   // (never a link in flight: the boot has made every realm's programs; this only reads their status)
    if (linkStep(V.def)) return true;
    return realmProgs(V.def).st === -1 ? 'fail' : false;
  }
  // the ground under the origin and about it (the camera's height when it arrives; a ring for the arrival's clearance)
  function vsOrigin(V, sync) {
    var pts = new Float32Array(2 * 17);
    for (var i = 0; i < 16; i++) { var a = i / 16 * 2 * PI, r = i < 8 ? 40 : 160; pts[i * 2] = Math.cos(a) * r; pts[i * 2 + 1] = Math.sin(a) * r; }
    V.oq = probeJob(V, pts, 17, 1, sync);
    return true;
  }
  function vsOriginRead(V) {
    if (!V.oq.done) return false;
    var h = V.oq.h, m = h[16], mx = h[16];
    for (var i = 0; i < 16; i++) mx = Math.max(mx, h[i]);
    V.g0 = m; V.g0max = mx; V.oq = null;
    return true;
  }
  function vsScatter(V) {   // (the shapes built here, CPU; uploaded by vsScatterUp, GPU)
    var sc = V.def.scatter || [];
    V.scB = [];
    for (var i = 0; i < sc.length; i++) {
      var mb = new Builder(512); mb.place(0, 0, 0, 0, false); sc[i].mesh(mb, RNG(subseed(V.seed, 300 + i)), KITAPI);
      V.scB.push(mb);
    }
    var rb = typeof V.def.ribbons === 'function' ? V.def.ribbons(V) : V.def.ribbons;
    V.ribbons = rb ? particleSet(rb, { wobble: [2, 0.5, 0, 0] }) : null;
    return true;
  }
  function vsScatterUp(V) {
    var sc = V.def.scatter || [];
    V.G.scatter = [];
    for (var i = 0; i < sc.length; i++) {
      var m = uploadMesh(V.scB[i], V.G); m.cell = sc[i].cell; m.grid = sc[i].grid; m.density = sc[i].density; m.size = sc[i].size; m.sink = sc[i].sink || 0; m.tilt = sc[i].tilt || 0; m.stretch = sc[i].stretch || 1; m.salt = sc[i].salt || i + 1;
      V.G.scatter.push(m);
    }
    V.scB = null;
    return true;
  }
