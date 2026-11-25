  /* ---------------------------------------------------------------- the birds' host
     The ink birds are their own module (inkbirds.js, a classic deferred script loaded after world.js): it registers a
     factory with WORLD.birds(factory) before the engine boots, and the factory is handed HOST, which is all the birds
     ever see of the engine. The engine, for its part, calls the module's four hooks and nothing else:
       step(dt)      after every fixed step of the flight (1/60 s): the birds' clock and their planning, deterministic
       draw()        after the composite, onto the window: the birds as ink, over the finished frame
       visit(k)      a visit (a realm) begins about the camera: its coordinates are new, the sky is cleared
       lost()        the context was lost: every GL object of the module is gone (made again on the next draw)
     See notes.md, "The birds' interface", for the contract. */
  var BIRDB = { ms: 1.5, spent: 0, at: 0, prep: 6 };   // (round 3: the birds' planning budget a frame, ms; their steps' time this frame)
  var BIRDS = /** @type {BirdsModule} */ (null), LASTE = null, LASTU = 0, LASTBL = new Float32Array([0, 1, 1]), HW = { boxes: null, kind: 'light', text: '#fdfcf7' }, BIRDPL = [];
  var CAMP = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], roll: 0, pitch: 0, inCloud: 0, arrive: 0, cover: 0, pmode: 0, hold: -1, open: -1, expo: 1, yaw: 0 };
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
       sand blows on (215: windAt at y m over the ground, the bird's own height, else AIR_H.birds; the log law under 100 m, veering aloft); a realm with no wind of its own, still
       air. o is the output alone (the birds' reused WINDV); y, a bird's own height over the ground, is a second argument so
       a bird can ask at its own height without making an object (the birds' ask, 2026-11-15). Read only: nothing drawn changes */
    wind: function (o, y) { var a = windAt(CS.x, CS.z, y === undefined ? AIR_H.birds : y, SIM.t, SIM.V); o[0] = a.x; o[1] = 0; o[2] = a.z; return o; },
    /* (physics: air/gust-field) the air's one gust field (215: frozen, carried downwind at the visit's U10 at every
       height) at (x, z), y m over the ground (AIR_H.birds when y is left out), at the flight's t, carried on the surface's wind clock (airClock: the veils' uAir.x):
       gust, its excess along the wind, m/s, signed (0 in still air: the whole wind is HOST.wind's times 1 + gust / W);
       gustPhase, the surface's wind clock less (x . w) / U10, s, the same at every height (NaN in still air), so
       neighbours downwind meet each gust dx / U10 later on that clock (dx / (s U10) in flight time, s the sky's surface
       share) and a bird over a veil meets the veil's. Read only: nothing drawn changes */
    gust: function (x, z, y) { return gustAt(x, z, y === undefined ? AIR_H.birds : y, SIM.t, SIM.V); },
    gustPhase: function (x, z, y) { return gustPhase(x, z, y === undefined ? AIR_H.birds : y, SIM.t, SIM.V); },
    gustSigma: function (y) { return gustSigma(y === undefined ? AIR_H.birds : y, SIM.V); },   // (sigma at y, m/s: the +-1 sigma trims without a division a bird)
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
    alpha: function () { return FRUN ? FALPHA : HELD && shown ? HALPHA : SIM.junction ? 1 : SIM.alpha; },
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
