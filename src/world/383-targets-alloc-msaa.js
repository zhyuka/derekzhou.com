  /* ---------------------------------------------------------------- targets: allocated, multisampled, resolved */
  /** @typedef {{ W: number, H: number, scene: any, lind: any, cloud: any, bd: any[], bu: any[], ms: any, sceneH: any, ch: any[], hz: WebGLTexture, sb: any, win: any }} Targets
      (the window's targets, TG: made by allocTargets, its later members set after its first line) */
  var TG = null, OUT = { w: 0, h: 0, dpr: 1, cssW: 0, cssH: 0 }, FULL = { w: 0, h: 0, dpr: 1 }, SS = 1, RUNG = 0, RUNGS = [1, 0.85, 0.72, 0.6, 0.5], CAMLIFT = 0;
  function allocTargets() {
    if (TG) { ['scene', 'lind', 'cloud', 'sb', 'win'].forEach(function (k) { if (TG[k]) freeTarget(TG[k]); }); TG.bd.forEach(freeTarget); TG.bu.forEach(freeTarget); if (TG.hz) gl.deleteTexture(TG.hz); freeMS(TG.ms); if (TG.ch) TG.ch.forEach(freeTarget); if (TG.sceneH) { gl.deleteFramebuffer(TG.sceneH.f); gl.deleteTexture(TG.sceneH.t); } }
    var W = OUT.w * SS, H = OUT.h * SS, w2 = Math.max(1, Math.ceil(W / 2)), h2 = Math.max(1, Math.ceil(H / 2));
    TG = /** @type {Targets} */ ({ W: W, H: H, scene: target(W, H, 'hdr', true), lind: target(w2, h2, 'r16'), cloud: target(w2, h2, 'hdr'), bd: [], bu: [], ms: null });
    // the scene's samples: AAS a pixel, its colour and depth resolved into TG.scene before the depth pass
    if (AAS > 1) { TG.ms = targetMS(W, H, AAS); if (!TG.ms) AAS = 0; }
    // where the scene has its samples, a second colour texture for it (the depth shared): the frames take them in
    // turn, so the composite reads the last frame's scene as well (its samples' depth codes too), for the
    // outlines in front of a cloud (FS_COMP)
    TG.sceneH = AAS > 1 || TWIN0 ? sceneTwin(TG.scene) : null; SHIST.ok = false;   // (without samples too where it fits, TWIN0)
    TG.ch = [target(w2, h2, 'hdr'), target(w2, h2, 'hdr')]; CACC.ok = false;   // (the clouds' accumulation, two in turn)
    // one depth buffer under both half-resolution targets: the land's depth (from the depth pass) and the opaque cores
    // of the clouds, so a cloud box behind either is never marched
    // a depth texture, not a renderbuffer (the same size and content): the paper birds read the cores' depth
    // through it (HOST.bindTextures, unit 14), so a bird behind a cloud's opaque core is hidden by it
    TG.hz = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, TG.hz);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w2, h2, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null); gl.bindTexture(gl.TEXTURE_2D, null);
    [TG.lind, TG.cloud].forEach(function (T) { gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, TG.hz, 0); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var bw = w2, bh = h2;
    for (var i = 0; i < 5; i++) { TG.bd.push(target(Math.max(1, bw), Math.max(1, bh), 'hdr')); if (i < 4) TG.bu.push(null); bw = Math.ceil(bw / 2); bh = Math.ceil(bh / 2); }
    for (i = 0; i < 4; i++) TG.bu[i] = target(TG.bd[i].w, TG.bd[i].h, 'hdr');
    TG.sb = target(1, 1, 'hdr');   // (the shafts' target, never drawn: the composite reads its 0 at amount 0)
    // (the finished frame at the world's resolution, put up to the canvas's; the birds' ink reads what lies under it)
    TG.win = target(OUT.w, OUT.h, 'rgba8');
  }
  /* a multisampled target: n samples a pixel of the scene's colour format and DEPTH_COMPONENT24 (the scene's depth
     texture's own format, so its resolve is a plain blit), as renderbuffers that are never sampled; null if the
     driver will not make it whole (the scene is then drawn at one sample) */
  function targetMS(w, h, n) {
    var T = { w: w, h: h, n: n, f: gl.createFramebuffer(), c: gl.createRenderbuffer(), d: gl.createRenderbuffer() };
    gl.bindRenderbuffer(gl.RENDERBUFFER, T.c); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, T.d); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.c);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.d);
    var ck = 'ms' + n, ok = FBOK[ck] ? true : gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; if (ok) FBOK[ck] = 1;   // (asked once, the first time)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { freeMS(T); MEMN.msFail++; if (!gl.isContextLost()) fail('the scene\'s ' + n + ' samples incomplete: one sample'); return null; }
    return T;
  }
  function sceneTwin(T) {
    var T2 = { w: T.w, h: T.h, f: gl.createFramebuffer(), t: tex2d(T.w, T.h, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.RGBA, HALF, gl.LINEAR), d: T.d, twin: true };
    gl.bindFramebuffer(gl.FRAMEBUFFER, T2.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T2.t, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, T2.d, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return T2;
  }
  function freeMS(T) { if (!T) return; gl.deleteFramebuffer(T.f); gl.deleteRenderbuffer(T.c); gl.deleteRenderbuffer(T.d); }
  /* the scene's samples resolved into its texture and depth (w x h of them, from the corner), then let go:
     invalidated, so a tile GPU never stores them */
  var MSINV = null;
  function resolveMS(MS, T, w, h) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MS.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.f);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    if (!MSINV) MSINV = [gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT];
    gl.invalidateFramebuffer(gl.READ_FRAMEBUFFER, MSINV);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
