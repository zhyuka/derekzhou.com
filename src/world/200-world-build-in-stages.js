  /* ---------------------------------------------------------------- the world's build, in stages */
  /* The plan (the maps and the director, the weights' grid about the landing, the light, the field), the programs, the
     ground at the origin (probed), the scatter's shapes and the sets; then the cells about the camera, through the
     streamer (cells.js). There is nothing after it: the world goes on as the camera flies (no visit follows). */
  function firstYaw() {   // the first frame's view yaw as arrive sets it (CS.yawV + CS.phi = CS.psi), read without drawing from any stream
    if (SIM.inited) return CS.yawV + CS.phi;
    if (DEVMODE && POSE) return POSE[2] * DEG;
    return RNG(subseed(J.seed, 77)).r(0, 2 * PI);
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
    V.light.sunDir = dirAzEl(V.light.sunAz, V.light.sunEl);
    V.lightRaw = Object.assign({}, V.light);
    var r3 = RNG(subseed(V.seed, 3)); V.ph = [r3.r(0, 6.28), r3.r(0, 6.28), r3.r(0, 6.28), r3.r(0, 6.28)];
    V.evRng = RNG(subseed(V.seed, 5));
    prepLight(V);
    worldLights(V);   // (the kits' lights, blended by the climate about the camera)
  }
  /* each stage is CPU work (the slice after the frame's flush: no GL call) or GPU work (the jobs at the start of the
     next drawn frame); `kind` says which a call may run ('cpu', 'gpu'; sync or no kind: any) */
  var VSTAGES = [vsPlanW, vsLink, vsKW, vsOrigin, vsOriginRead, vsScatter, vsScatterUp, vsSets, vsSetsUp];
  var VKIND = ['cpu', 'cpu', 'gpu', 'cpu', 'cpu', 'cpu', 'gpu', 'cpu', 'gpu'];
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
    var pt = typeof V.def.particles === 'function' ? V.def.particles(V, RNG(subseed(V.seed, 9))) : (V.def.particles || []);
    V.parts = pt.map(partPrep);
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
  /* the realm's instanced sets: each a mesh built once a visit (and a coarse one, the same draws at the far cells'
     detail), placed by the cells as many times as they like (C.place): one draw a set a cell */
  function vsSets(V) {   // (the sets' meshes built here, CPU; uploaded by vsSetsUp, GPU)
    var S = V.def.sets; V.setB = [];
    if (!S) return true;
    var names = Object.keys(S);
    for (var k = 0; k < names.length; k++) {
      var d = S[names[k]], seed = subseed(V.seed, 500 + k);
      var B = new Builder(1024); B.place(0, 0, 0, 0, false); d.mesh(B, RNG(seed), KITAPI);
      var B2 = null;
      if (d.coarse !== false) { B2 = new Builder(512); B2.lod = 1; B2.place(0, 0, 0, 0, false); d.mesh(B2, RNG(seed), KITAPI); if (!(B2.n && B2.n < B.n * 0.9)) B2 = null; }
      V.setB.push([names[k], d, B, B2]);
    }
    return true;
  }
  function vsSetsUp(V) {
    V.G.sets = {};
    var L = V.setB || [];
    for (var k = 0; k < L.length; k++) {
      var d = L[k][1], B = L[k][2], B2 = L[k][3];
      var full = uploadMesh(B, V.G); full.lo = B.lo.slice(); full.hi = B.hi.slice();
      var coarse = B2 ? uploadMesh(B2, V.G) : null;
      var r = 0; for (var a = 0; a < 3; a++) r = Math.max(r, Math.abs(full.lo[a]), Math.abs(full.hi[a]));
      V.G.sets[L[k][0]] = { full: full, coarse: coarse, far: d.far || 900, r: r, cy: (full.lo[1] + full.hi[1]) / 2 };
    }
    V.setB = null;
    return true;
  }
  /* the world's GL objects and its cells' freed (a reset or a lost context; the programs stay) */
  function freeVisit(V) {
    if (!V) return;
    if (V.cells) { V.cells.forEach(function (C) { freeCell(C); }); V.cells = null; V.cellList = null; }
    var G = V.G;
    if (G && !LOST) {
      G.bufs.forEach(function (b) { glFree('Buffer', b); });   // (deleted among the next frame's GPU jobs)
      G.vaos.forEach(function (v) { glFree('VertexArray', v); });
      G.texs.forEach(function (t) { glFree('Texture', t); });
    }
    V.G = null; V.st = 0; V.parts = null; V.ribbons = null; V.flocksEv = null; V.scB = null; V.setB = null;
    V.pois = null; V.oq = null; V.rng = null; V.rng2 = null; V.evRng = null; V.ready = false; V.field = null;
  }
  function forgetVisit(V) {   // (after a lost context the objects are gone already)
    if (V.cells) V.cells.forEach(function (C) { C.gone = true; }); V.cells = null; V.cellList = null;
    V.G = null; V.st = 0; V.parts = null; V.ribbons = null; V.ready = false; V.scB = null; V.setB = null;
  }
  /* a particle set as the realm gives it: { kind: 'grain' | 'mote' | 'mote2' (about the camera's height) | 'rain' |
     'drift' | 'drift2' (about the camera's height) (or hop[3]: 0-5), count, box (m), height (m), streak (s), width
     (px), wind [x, y, z] (m/s), color [r, g, b, opacity], hop [m, rate, lift m, kind] (grains), lift (m over the
     ground); rain: fall (m/s), splash (s), gusts (0-1); drifting: rise (m/s; < 0 sinks), life (s), wander (m/s),
     tumble (Hz), colors [[r, g, b, share], [r, g, b, share]] (a second and third colour), blink (the share of a cycle
     lit), flicker (0-1); areas: [names] (drawn in proportion to those areas' shares), rainScale (by the light's
     rain) } */
  var PKIND = { grain: 0, mote: 1, mote2: 2, rain: 3, drift: 4, drift2: 5 };
  function partPrep(o) {
    var q = {}, k;
    for (k in o) if (k !== 'colors' && k !== 'areas' && k !== 'kind') q[k] = o[k];
    var pa = particleSet(q, { hop: [0, 0, 0.2, 0] });
    if (o.kind !== undefined) pa.hop[3] = typeof o.kind === 'number' ? o.kind : PKIND[o.kind];
    if (o.lift !== undefined) pa.hop[2] = o.lift;
    var kd = pa.hop[3];
    pa.ud = new Float32Array(kd === 3 ? [o.fall || 8.5, o.splash || 0.25, o.gusts || 0, 0] : [o.rise || 0, o.life || 8, o.wander === undefined ? 0.3 : o.wander, o.tumble || 0]);
    pa.ue = new Float32Array(o.colors && o.colors[0] || [0, 0, 0, 0]); pa.uf = new Float32Array(o.colors && o.colors[1] || [0, 0, 0, 0]);
    pa.ug = new Float32Array([o.blink || 0, o.flicker || 0, 1, 0]);
    pa.areas = o.areas || null; pa.rainScale = !!o.rainScale;
    if (pa.streak === undefined) pa.streak = kd === 3 ? 0.06 : 0;
    if (pa.width === undefined) pa.width = 1.2;
    if (pa.height === undefined) pa.height = 20;
    if (!pa.wind) pa.wind = new Float32Array([0, 0, 0]);
    return pa;
  }
  function particleSet(o, def) {
    if (!o) return null;
    var r = {}, k;
    for (k in o) r[k] = (o[k] && o[k].length !== undefined && typeof o[k] !== 'string') ? new Float32Array(o[k]) : o[k];
    for (k in def) if (!r[k]) r[k] = new Float32Array(def[k]);
    return r;
  }
  function uploadMesh(B, G) {
    var M = { n: B.count(), vao: null, vb: null };
    if (!M.n) return M;
    M.vao = pTake('mesh'); if (G) G.vaos.push(M.vao);   // (from the pools)
    M.vb = pTake('buf'); if (G) G.bufs.push(M.vb);
    gl.bindVertexArray(M.vao); gl.bindBuffer(gl.ARRAY_BUFFER, M.vb); gl.bufferData(gl.ARRAY_BUFFER, B.bytes(), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, VSTRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VSTRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, VSTRIDE, 15);   // (its emission)
    gl.bindVertexArray(null);
    return M;
  }
  /* a mesh's attributes (0-4) on a VAO of its own, with an instance buffer's (from location `at`, `n` vec4s each,
     stride n x 16 bytes, from byte `off`) */
  function meshAttribs(M) {
    gl.bindBuffer(gl.ARRAY_BUFFER, M.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, VSTRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VSTRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, VSTRIDE, 15);
  }
  function instAttribs(buf, at, n, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (var i = 0; i < n; i++) { gl.enableVertexAttribArray(at + i); gl.vertexAttribPointer(at + i, 4, gl.FLOAT, false, n * 16, off + i * 16); gl.vertexAttribDivisor(at + i, 1); }
  }

