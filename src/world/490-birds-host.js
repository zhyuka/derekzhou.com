  /* ---------------------------------------------------------------- the birds' host
     The ink birds are their own module (inkbirds.js, a classic deferred script loaded after world.js): it registers a
     factory with WORLD.birds(factory) before the engine boots, and the factory is handed HOST, which is all the birds
     ever see of the engine. The engine, for its part, calls the module's five hooks and nothing else:
       step(dt)      after every fixed step of the flight (1/60 s): the birds' clock and their planning, deterministic
       draw()        after the composite, onto the window: the birds as ink, over the finished frame
       visit(k)      a visit (a realm) begins about the camera: its coordinates are new, the sky is cleared
       reset()       the journey starts again (the harness's draw(t) going back in time)
       lost()        the context was lost: every GL object of the module is gone (made again on the next draw)
     See notes.md, "The birds' interface", for the contract. */
  var BIRDB = { ms: 1.5, spent: 0, at: 0, prep: 6 };   // (round 3: the birds' planning budget a frame, ms; their steps' time this frame)
  var BIRDS = null, LASTE = null, LASTU = 0, LASTBL = new Float32Array([0, 1, 1]), HW = { boxes: null, kind: 'light', text: '#fdfcf7' }, BIRDPL = [];
  var CAMP = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], roll: 0, pitch: 0, inCloud: 0, arrive: 0, cover: 0, pmode: 0, hold: -1, open: -1, expo: 1, yaw: 0 };
  var WIND_AIR = 6.5;   // (way-other) m/s: the wind at the birds' height, the dunes' grains' own speed (realm-dunes.js), the least the drawn sand says
  var HOST = {
    gl: null,   // (Fix 2: the context, from the boot's first frame; the module is made then, makeBirds)
    glsl: { HEAD: HEAD, FRAME_U: FRAME_U, LIB: LIB, AIR: LIB_AIR },
    /* programs: compiled with the engine's defines when asked (the module asks as it is made, before the engine boots);
       linked as the engine's own are: with parallel compiles once the driver says it is done, else in the boot's
       prelink (one a frame, while the still sky shows), never in flight. linked() never waits: true once linked, false
       while not yet (or broken: P.ok false with P.u set), 'lost' */
    /* (E1) a program is registered for the boot's stage C (compile all, link all, flush, status last): after the world
       shows that is an error (compile() fails it; development throws). linked() never asks the context: true once the
       boot has finished it (false while not yet, or broken: P.ok false), 'lost' with the context. Under forced colours
       and in the harness's stills there is no staged boot: their programs are made at once */
    program: function (vs, fs, name) { var P = LATEB.on ? lateProg(vs, fs, 'birds:' + name) : compile(vs, fs, 'birds:' + name); BIRDPL.push(P); if (!LATEB.on && (STILLMODE || FRUN)) { if (STILLMODE) progStep(true, 0); else fprog(P); } return P; },   // (fast500 4a: a module made late: its own list, birdsLate)
    linked: function (P) {
      if (gl.isContextLost()) return 'lost';
      if (P.st !== 3 && (STILLMODE || FRUN)) { if (STILLMODE) progStep(true, 0); else fprog(P); }   // (round 2: forced colours, the one program at once)
      return P.st === 3 ? P.ok && (FRUN && !STILLMODE || lateReady(P)) : false;   // (fast500 step 9: a late one's not yet; never 'broken' while P.ok; forced colours draw with it once linked)
    },
    /* (E1) an entry for the warm table (design-v5 8.2): the module's own draw, its real VAO and state */
    warm: function (e) { if (LATEB.on) LATEB.W.push(e); else WARMX.push(e); },   // (fast500 4a: a module made late warms its own, birdsLate)
    frameUniforms: function (P) { if (SIM.V) setFrameUniforms(P, SIM.V); },
    /* the window: the canvas in device px (out), its size in CSS px, and the scene's and the cloud's uv scales (the
       scene is drawn at the governor's rung, the clouds at half of it) */
    view: function (o) {
      var sc = RUNGS[RUNG], W = Math.max(1, Math.round((TG ? TG.W : OUT.w) * sc)), H = Math.max(1, Math.round((TG ? TG.H : OUT.h) * sc));
      if (!TG && o.sUx === undefined) { o.sUx = o.sUy = o.hUx = o.hUy = 1; }   // (fast500's deep sweep, 2026-11-05: forced colours from the load make no target (TG null): finite scales, never NaN, for the uniforms the forced draw uploads and never reads (uSc and uCl: behind uLand, 0 with no textures); with targets the line below sets them)
      o.outW = FULL.w || OUT.w; o.outH = FULL.h || OUT.h; o.cssW = OUT.cssW || OUT.w; o.cssH = OUT.cssH || OUT.h; o.dpr = o.outW / Math.max(o.cssW, 1);
      o.bdpr = OUT.w / Math.max(o.cssW, 1);   // (the words' boxes are the world's px: OUT)
      o.ddpr = window.devicePixelRatio || 1;   // (round 3: the device's own px a CSS px: the canvas is put up to it when FULL is capped under it)
      o.bUx = LASTBL[1]; o.bUy = LASTBL[2]; o.bloom = LASTBL[0];   // (the bloom's uv scale and gain, as the composite used them)
      o.tanX = FR.tanX; o.tanY = FR.tanY; o.near = NEAR; o.far = FAR;
      if (TG) { o.sUx = W / TG.W; o.sUy = H / TG.H; o.hUx = Math.max(1, Math.ceil(W / 2)) / TG.cloud.w; o.hUy = Math.max(1, Math.ceil(H / 2)) / TG.cloud.h; }
      return o;
    },
    /* the camera as drawn this frame (CAM), and as it is at the end of the last fixed step (for the birds' planning) */
    camera: function () { return CAM; },
    /* (way-other) the air the birds fly in: the realm's own wind (m/s, world x, y, z), the one the dunes lie across and the
       sand blows on (realm-dunes.js: V.wind, its grains 6.5 m/s, its veils 5.5 m/s); a realm with no wind of its own, still
       air. Read only: nothing drawn changes */
    wind: function (o) { var V = SIM.V, w = V && V.wind; o[0] = w ? w[0] * WIND_AIR : 0; o[1] = 0; o[2] = w ? w[1] * WIND_AIR : 0; return o; },
    cameraStep: function () { var V = SIM.V; if (!V) return null; camPose(V, SIM.u, 1, CAMP); return CAMP; },
    /* the flight: the view's yaw (the way the camera looks), its heading and speed, its climb rate, its clearance band */
    flight: function (o) {
      var V = SIM.V; o.ok = !!V; if (!V) return o;
      o.x = CS.x; o.y = CS.y; o.z = CS.z; o.psi = CS.psi; o.view = CS.yawV + CS.phi; o.speed = V.speed; o.camk = CAMK; o.vy = CS.vy;
      o.ground = groundAt(V, CS.x, CS.z, false); o.clear = V.clear; o.u = SIM.u; o.D = V.D; o.k = V.k; o.realm = V.id; o.alpha = SIM.alpha;
      return o;
    },
    time: function () { return SIM.t; },
    /* (life) the sky in force (its id: the one the cycle is in, the incoming past a change's middle), read when a flight
       is planned */
    sky: function () { return SKYI.k >= 0.5 && SKYI.next ? SKYI.next : (SKYI.sky || ''); },
    /* (pointer) the pointer for the birds' play: HOVER copied (CSS px), and the drag's state (a press steers); a touch
       held still (no drag) reads as a resting pointer above the fingertip once held HOLD_S s, gone before */
    pointer: function (o) {
      if (DRAG.id !== -1 && DRAG.type === 'touch' && !DRAG.on && !DRAG.multi) { o.x = DRAG.x0; o.y = DRAG.y0 - HOLD_UP; o.n = HOVER.n; o.gone = inert() || FCOL.on || SIM.t - DRAG.t0 < HOLD_S; o.down = false; o.steer = false; o.touch = true; return o; }
      o.touch = false; o.x = HOVER.x; o.y = HOVER.y; o.n = HOVER.n; o.gone = HOVER.gone || inert() || FCOL.on; o.down = HOVER.down || DRAG.id !== -1; o.steer = DRAG.on; return o; },
    clicks: function (o) { o.length = 0; if (!inert()) for (var i = 0; i < CLICKQ.length; i++) o.push(CLICKQ[i]); CLICKQ.length = 0; return o; },   // (perch lane)
    alpha: function () { return FRUN ? FALPHA : SIM.junction ? 1 : SIM.alpha; },
    /* (round 2) forced colours: { on, ink, paper } (sRGB 0-1: CanvasText and Canvas); while on, the world is not drawn
       and the camera is held: the birds fly in their own still view, drawn in the ink at full strength */
    forced: function () { return FCOL; },
    /* the grade the composite used this frame (exposure, saturation, lift, gain), and the light (sun, haze) */
    grade: function () { return LASTE; },
    light: function () { var V = SIM.V; return V ? (V.L || V.light) : null; },
    /* the words: their boxes (name, bio, credit, link, link: x0, y0, x1, y1 in canvas px) and their colours in effect */
    words: function () { HW.kind = INK;   /* (stage2: the words' ink, always light: the ink birds' light path) */ HW.text = WORDSETS[HW.kind].text; return HW; },
    /* the scene's depth and the clouds (premultiplied, half resolution), bound on the units the engine's programs use
       (uDepth 2, uCloud 4) */
    bindTextures: function () {
      if (!TG) return false;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, (CLT || TG.cloud).t);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TG.bu[0].t);   // (the bloom, as the composite added it)
      gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, TG.win.t);   // (the finished frame, the world's resolution: what lies under a stroke)
      gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, TG.hz);   // (birds3d: the half-resolution depth, the land's nearest and the clouds' opaque cores; attached only to TG.lind and TG.cloud, never to the canvas the birds draw on)
      gl.activeTexture(gl.TEXTURE0);
      return true;
    },
    target: function () { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, FULL.w || OUT.w, FULL.h || OUT.h); },
    /* (round 3) the time left for the birds' planning this frame, ms (the module reads no clock): BIRDB.ms a frame,
       less what its steps have taken so far; unbounded in the harness (data-still: the same whatever the machine) */
    budget: function () { if (STILLMODE) return Infinity; return BIRDB.ms - BIRDB.spent - (BIRDB.at ? clockNow() - BIRDB.at : 0); },
    /* (round 3) the canvas drawn straight (the world's px the canvas's own: no copy pass), what lies under the ink is
       copied into TG.win for its boxes only (CSS px, y down: x0, y0, x1, y1 each); a no-op when the frame is in TG.win */
    under: function (B, n) {
      if (!DIRECT || !TG) return;
      var k = OUT.w / Math.max(OUT.cssW || OUT.w, 1), i, x0, y0, x1, y1;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, TG.win.f);
      for (i = 0; i < n; i++) {
        x0 = clamp(Math.floor(B[4 * i] * k) - 2, 0, OUT.w); x1 = clamp(Math.ceil(B[4 * i + 2] * k) + 2, 0, OUT.w);
        y0 = clamp(OUT.h - Math.ceil(B[4 * i + 3] * k) - 2, 0, OUT.h); y1 = clamp(OUT.h - Math.floor(B[4 * i + 1] * k) + 2, 0, OUT.h);
        if (x1 > x0 && y1 > y0) gl.blitFramebuffer(x0, y0, x1, y1, x0, y0, x1, y1, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    /* how much cloud stands between a point a and each of three points a + P[0..2], a + P[3..5] (the middle one),
       a + P[6..8]: the length (m) of each segment inside the visible lobes of the clouds about the camera (each lobe a
       sphere). The bodies' bounds are tested once, against the middle segment padded by the others' reach from it (so
       every body either of them meets is kept), then each segment against those bodies' bounds and lobes only */
    cloudBetween3: function (ax, ay, az, P, out) {
      var V = SIM.V, L = V && V.cellList, i, k, q, h, n = 0;
      out[0] = out[1] = out[2] = 0;
      if (!L) return out;
      var pad = 0;
      for (q = 0; q < 9; q += 3) { var ex = P[q] - P[3], ey = P[q + 1] - P[4], ez = P[q + 2] - P[5]; pad = Math.max(pad, Math.sqrt(ex * ex + ey * ey + ez * ez)); }
      pad = pad * 1.001 + 0.01;   // (a margin for rounding: a body kept too many is harmless)
      cbSet(ax, ay, az, ax + P[3], ay + P[4], az + P[5]);
      for (i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 3 || !C.soft || !C.softB) continue;
        for (k = 0; k < C.softB.length; k++) {
          var B = C.softB[k]; if (!cbChord(B[0], B[1], B[2], B[3] + pad)) continue;
          if (n + 2 > CBH.length) { var G = new Int32Array(2 * CBH.length); G.set(CBH); CBH = G; }
          CBH[n++] = i; CBH[n++] = k;
        }
      }
      for (q = 0; q < 3; q++) {
        if (!n) break;
        cbSet(ax, ay, az, ax + P[3 * q], ay + P[3 * q + 1], az + P[3 * q + 2]);
        var tot = 0;
        for (h = 0; h < n; h += 2) {
          var C2 = L[CBH[h]], B2 = C2.softB[CBH[h + 1]]; if (!cbChord(B2[0], B2[1], B2[2], B2[3])) continue;
          for (var l = B2[4]; l < B2[5]; l += 4) tot += cbChord(C2.soft[l], C2.soft[l + 1], C2.soft[l + 2], C2.soft[l + 3]);
        }
        out[q] = tot;
      }
      return out;
    },
    /* the cover over the view: the cloud about the eye (a passage), a passage's dark or light */
    cover: function () { return Math.max(CAM.inCloud || 0, CAM.cover || 0); },
    ground: function (x, z) { var V = SIM.V; return V ? groundAt(V, x, z, false) : 0; },
    /* (one bird) the camera's ground grid's reach (m from its centre: groundAt is exact within it), and the cloud sea at
       any point from the raw maps: o.w its weight (0 sand, 1 the sea of cloud), o.lv its raw level (the drawn sea's top
       lies at or under it), so a bird can rise out of the sea or go down into it where no one can see it come or go */
    groundReach: function () { return GROUND.ok ? (GCN / 2 - 3) * GCCELL : 0; },
    seaAt: function (x, z, o) { if (!MAPS.w) { o.w = 0; o.lv = -1e9; return o; } var k = kitAt(x, z); o.w = k.wC; o.lv = SEA_LO + RISE * k.wC; return o; },
    /* the realm's places with birds (its cells' bird flocks, within r of the camera): centre, height, orbit, wheel */
    places: function (r, out) {
      out.length = 0; var V = SIM.V, L = V && V.cellList; if (!L) return out;
      for (var i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 2) continue;
        for (var k = 0; k < C.flocks.length; k++) {
          var f = C.flocks[k]; if (f.kind !== 'bird' || !f.at) continue;
          var dx = f.at[0] - CS.x, dz = f.at[2] - CS.z; if (dx * dx + dz * dz > r * r) continue;
          out.push({ x: f.at[0], y: f.at[1], z: f.at[2], orbit: f.orbit || 40, wheel: f.wheel || 0.2, n: f.n || 8, size: f.size || 1.5, key: (C.ix * 73856093 ^ C.iz * 19349663 ^ k * 83492791 ^ C.sc * 2654435761) >>> 0 });
        }
      }
      return out;
    },
    /* (birds3d) the night: 0 by day, 1 at night. The world has no night yet (the time of day's work will give it): the
       zenith sky's luminance after the exposure, 1 - smooth(0.04, 0.12, Y); 1 under the dev's SIMULATED night */
    night: function () {
      if (SIMNIGHT) return 1;
      var V = SIM.V, L = V && (V.L || V.light), E = LASTE; if (!L) return 0;
      var z = L.skyFlat || (L.sky && L.sky[0]), y = z && z.length >= 3 ? 0.2126 * z[0] + 0.7152 * z[1] + 0.0722 * z[2] : 1;
      y *= E ? E.exposure : 1;
      return 1 - smooth(0.04, 0.12, y);
    },
    /* (birds3d) the cells' places within r of the camera (towers, isles, islands, canyons and the rest), for the staging:
       { kind, x, y, z, pass, r (its body's radius, m), base, top (m) } */
    pois: function (r, out) {
      out.length = 0; var V = SIM.V; if (!V) return out;
      var L = apPois(V), i, p, dx, dz;
      for (i = 0; i < L.length; i++) {
        p = L[i]; dx = p.x - CS.x; dz = p.z - CS.z; if (dx * dx + dz * dz > r * r) continue;
        var o = { kind: p.kind, x: p.x, y: p.y, z: p.z, pass: p.pass || 0, r: 0, base: p.y, top: p.y, id: p.id };
        if (p.kind === 'tower' && p.cell) {
          var cl = p.cell.clouds, j, best = null; for (j = 0; cl && j < cl.length; j++) if (cl[j].kind === 'cumulus' && Math.abs(cl[j].x - p.x) < 1 && Math.abs(cl[j].z - p.z) < 1) best = cl[j];
          if (best) { o.r = best.w / 2; o.base = best.base !== undefined ? best.base : best.y; o.top = o.base + best.h; o.w = best.w; o.h = best.h; } else { o.r = Math.max(60, (o.pass - 80) / 1.1); o.base = 0; o.top = 2.8 * o.r; }
          /* (the body as it stands: its lobes, lifted whole over the flight band where they would cut it) */
          var C2 = p.cell, sb = C2.softB, sf = C2.soft, lo = 1e9, hi = -1e9, rr = 0, nb = 0, q2, k2;
          if (sb && sf) for (k2 = 0; k2 < sb.length; k2++) {
            if (Math.abs(sb[k2][0] - p.x) > 0.75 * (o.w || 2 * o.r) || Math.abs(sb[k2][2] - p.z) > 0.75 * (o.w || 2 * o.r)) continue;
            for (q2 = sb[k2][4]; q2 < sb[k2][5]; q2 += 4) { lo = Math.min(lo, sf[q2 + 1] - sf[q2 + 3]); hi = Math.max(hi, sf[q2 + 1] + sf[q2 + 3]); rr = Math.max(rr, Math.hypot(sf[q2] - p.x, sf[q2 + 2] - p.z) + sf[q2 + 3]); nb++; }
          }
          if (nb) { o.base = lo; o.top = hi; o.r = rr; o.lobes = nb; }
        } else if (p.kind === 'island') o.r = Math.max(20, o.pass - 70);
        else if (p.kind === 'isle') o.r = Math.max(60, o.pass - 190);
        else o.r = Math.max(20, o.pass * 0.5);
        out.push(o);
      }
      return out;
    },
    /* randomness: a stream from the visit's weather (the journey's seed and a salt): never any other */
    rng: function (salt) { return splitmix32(subseed(J.seed, salt)); },
    reduced: function () { return reduced() && !STILLMODE; },
    dev: DEVMODE,
    count: function (draws, inst) { ST.draws += draws; ST.inst += inst; ST.tris += 2 * inst; }
  };
  /* the length of the segment (CBS: its start, its direction, its length) within a sphere (no closure a call); CBH the
     bodies a bird's segments may meet (cell, body) */
  var CBS = new Float64Array(7), CBH = new Int32Array(256);
  function cbSet(ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    CBS[0] = ax; CBS[1] = ay; CBS[2] = az; CBS[3] = dx / len; CBS[4] = dy / len; CBS[5] = dz / len; CBS[6] = len;
  }
  function cbChord(cx, cy, cz, r) {
    var ox = cx - CBS[0], oy = cy - CBS[1], oz = cz - CBS[2], tc = ox * CBS[3] + oy * CBS[4] + oz * CBS[5], d2 = ox * ox + oy * oy + oz * oz - tc * tc;
    if (d2 >= r * r) return 0;
    var h = Math.sqrt(r * r - d2), t0 = Math.max(tc - h, 0), t1 = Math.min(tc + h, CBS[6]);
    return t1 > t0 ? t1 - t0 : 0;
  }
  var BIRDF = null;
  function registerBirds(factory) {
    if (REC) REC.regs.push(['inkbirds', +clockNow().toFixed(1)]);   // (E0: the ink birds' file, the last deferred script, ends here)
    HW.boxes = WORDS;
    if (BIRDS || BIRDF || typeof factory !== 'function') return;
    BIRDF = factory;
    if (gl && STILLMODE) makeBirds();   // (fast500 4a: otherwise made in the next frame, birdsLate: never GL calls in a script's task)
    bootSoon();   // (E0: the last deferred script has run: the boot, a frame on)
    if (booted && !FRUN && forced()) { DOMQ.fc = true; domNext(); }   // (round 2: forced colours, the boot already past their start: the ink birds' own loop asked for in the next frame, now there is a module to make: domFlush, fstart)
  }
  /* (Fix 2) the module made once the context is (boot stage A): its factory compiles its programs through HOST */
  function makeBirds() {
    if (BIRDS || BIRDL || !BIRDF || !gl || LATEB.dead) return;
    HOST.gl = gl;
    var late = BOOT.st === 'C' && !STILLMODE, M = null;   // (fast500 4a: from stage C on the boot's programs are in hand: the module's are made beside them)
    LATEB.on = late; LATEB.P.length = 0; LATEB.W.length = 0;
    try { M = BIRDF(HOST) || null; if (M && late && M.boot) M.boot(); } catch (e) { M = null; fail('birds: ' + (e && e.message)); }
    LATEB.on = false;
    if (!M) { LATEB.dead = true; INKWAIT = false; return; }
    if (late) { BIRDL = M; LATEB.gen = MEMN.restored; recMark('ink birds: made late (' + (shown ? 'after the show' : 'in the boot') + ')'); }
    else BIRDS = M;
  }
  /* (fast500 4a) the ink birds' file loads last, at low priority, and the boot no longer waits for it. Made before the
     boot's stage C, the module is the boot's as before (stage A or B: its program in stage C, its ring and warm entry in
     B). Made later (BIRDL, during C or after the world shows: the owner's "finish code after show: only programs for
     things not in view"), its programs are kept off the boot's list (PROGS: the boot's order and stages are unchanged)
     and worked here, once a frame: issued (the boot's progIssue, the same sources), each one's completion asked once a
     frame without waiting (KHR_parallel_shader_compile; without it, read LATE_WAIT frames after the link went out), its
     status and uniforms read once complete (finish), then, the next frame, drawn once into a 1x1 viewport of the warm
     table's RGBA8 target with the module's own VAO, mode and blend (its first draw, which D3D11 pays for, off the
     canvas: nothing drawn that is seen, no frame changed), and only the frame after that does the module fly (BIRDS:
     its clock, its planning, its draws). Its flights then come as the first ink flight always does, from the
     first frame of a world already shown: planned whole before a bird enters, from beyond an edge or out of the
     distance. Under reduced motion it waits (its still sky would gain birds); a context lost meanwhile makes it the
     boot's again (the restore's stages B and C). INKWAIT: the realms' bird flocks stand aside while the ink birds are
     there or still to come (until 'load' with none); one that stood aside never shows (inkAside), so none vanishes
     when the ink birds come and none pops in if they never do */
  var BIRDL = null, LATEB = { on: false, P: [], W: [], dead: false, gen: 0, fin: -1, wf: -1 }, INKWAIT = true, LATE_WAIT = 30;
  function inkAside(f) { if (BIRDS) return true; if (BIRDL || INKWAIT) { f.ia = 1; return true; } return f.ia === 1; }
  function lateProg(vs, fs, name) { var P = { p: null, name: name, u: null, ok: false, vs: vs, fs: fs, v: null, f: null, st: 0, late: true }; LATEB.P.push(P); return P; }
  function birdsLate() {
    if (!BIRDL) { makeBirds(); if (!BIRDL) return; }
    if (LOST || gl.isContextLost()) return;
    if (LATEB.gen !== MEMN.restored) { var M = BIRDL; BIRDL = null; BIRDS = M; BIRDPL.length = 0; if (M.lost) M.lost(); recMark('ink birds: the boot\'s after a restore'); return; }   // (its objects died with the old context: made again with the boot's own, stages B and C)
    var i, P, n = LATEB.P.length, done = 0;
    for (i = 0; i < n; i++) {
      P = LATEB.P[i];
      if (P.st === 0) { var c0 = PROGX.compiled, l0 = PROGX.linked; progIssue(P); PROGX.compiled = c0; PROGX.linked = l0; gl.flush(); continue; }
      if (P.st === 2) {
        if (EXT.par) { var tq = clockNow(), dn = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR); P.polls++; P.qms = +(P.qms + clockNow() - tq).toFixed(2); if (gl.isContextLost()) return; if (!dn) continue; }
        else if (FRAMEN - P.issF < LATE_WAIT) continue;
        var tf = clockNow(), r = finish(P);
        if (r === LOSTP) return;
        P.fms = +(clockNow() - tf).toFixed(2); P.doneAt = +clockNow().toFixed(1); P.doneF = FRAMEN; LATEB.fin = FRAMEN;
        if (!r) { LATEB.dead = true; BIRDL = null; INKWAIT = false; recMark('ink birds: ' + P.name + ' will not link here'); return; }
        continue;
      }
      if (P.st === 3) done++;
    }
    if (done < n) return;
    if (LATEB.wf < 0) { if (FRAMEN > LATEB.fin) { lateWarm(); LATEB.wf = FRAMEN; } return; }
    if (FRAMEN <= LATEB.wf || reduced()) return;
    BIRDS = BIRDL; BIRDL = null; recMark('ink birds: linked late, warmed, flying');
  }
  function lateWarm() {
    var T = WARM.tg && WARM.tg.rgba8, i, e, t0;
    if (!T) return;
    for (i = 0; i < LATEB.W.length; i++) {
      e = LATEB.W[i]; if (!e.p || e.p.st !== 3 || !e.p.ok) continue;
      t0 = clockNow();
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.viewport(0, 0, 1, 1); gl.colorMask(true, true, true, true);
      if (e.bl) { gl.enable(gl.BLEND); gl.blendFuncSeparate(e.bl[0], e.bl[1], e.bl[2], e.bl[3]); } else gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.useProgram(e.p.p); gl.bindVertexArray(e.vao);
      if (e.inst) gl.drawArraysInstanced(e.mode, 0, e.cnt, 1); else gl.drawArrays(e.mode, 0, e.cnt);
      if (!e.p.warmed) { e.p.warmed = true; e.p.firstMs = +(clockNow() - t0).toFixed(2); e.p.firstF = FRAMEN; e.p.firstAt = +clockNow().toFixed(1); }
    }
    warmReset();
  }
